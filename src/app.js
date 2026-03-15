// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Ana Uygulama (Entry Point)
// Modülleri birleştiren orchestrator
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from './data/battle-data.js';
import { ENTITY_TYPES } from './data/entity-types.js';
import { getTerrainAtPoint, clampToAllowedTerrain } from './data/terrain-zones.js';
import { isUnitDestroyed } from './data/canonical-positions.js';
import { normalizeDateText } from './engine/date-utils.js';
import { hydrateTimelineData, getUnitEntryPhaseIndex } from './engine/phase-engine.js';
import { resolveCampaignPhase, getPhaseTransition } from './engine/campaign-state-machine.js';
import { expandUnitTrails, getNarrativeNavalPosition, isDestroyedPhaseData, enforceCorridorSeparation } from './engine/position-engine.js';
import { renderMap, updateMapSceneState } from './render/map-renderer.js';
import { renderTokens, applyTokenSlideWithTrail, renderUnits, renderAnimationUnits, factionSVG } from './render/token-renderer.js';
import { renderBattleEffects } from './render/effects-renderer.js';
import { renderFrontlines, renderLandCombatFX } from './render/frontline-renderer.js';
import { animateCamera } from './render/camera.js';
import { orchestrateAnimations } from './render/animation-orchestrator.js';
import { renderTimeline, updateTimelineActiveState, focusActiveTimelineMarker } from './render/timeline-renderer.js';
import { updateMapDateIndicator, updateNarrationPanel, renderAtmosphere, renderTransition } from './ui/narration-panel.js';
import { hideUnitPanel, attachUnitClicks } from './ui/unit-panel.js';
import { startAutoPlay, stopAutoPlay, toggleAutoPlay, refreshAutoPlayButton } from './ui/autoplay-controller.js';
import { initOnboarding } from './ui/onboarding.js';
import { toggleStatsPanel } from './ui/stats-panel.js';
import { renderAudioControls, initAudioOnInteraction, triggerPhaseSfx } from './ui/audio-manager.js';

// ── Uygulama State ──
let currentPhaseIndex = 0;
const currentPositions = {};

function getCurrentPhaseIndex() { return currentPhaseIndex; }
async function waitForAnimationEvents() {
    try {
        await Promise.resolve(window.ANIMATION_EVENTS_READY);
    } catch (err) {
        console.warn('Animasyon verileri hazır olamadı:', err);
    }
}

// ── Başlangıç Konumları ──
function initPositions() {
    const firstPhase = BATTLE_DATA.phases[currentPhaseIndex]?.id;
    if (!firstPhase) return;
    BATTLE_DATA.units.forEach((u) => {
        const d = u.phases[firstPhase];
        if (d) currentPositions[u.id] = { x: d.x, y: d.y };
    });
}

// ── TopBar ──
function renderTopBar() {
    const p = BATTLE_DATA.phases[currentPhaseIndex];
    document.querySelector('.topbar').innerHTML = `
    <div class="topbar-title">Çanakkale Savaşı <span>1914-1916</span></div>
    <div class="phase-indicator" id="phaseIndicator">${p.title} – ${p.date}</div>
    <div class="legend">
      <button class="stats-btn" id="statsBtn" type="button"><img src="assets/icons/medal.png" width="14" height="14" alt=""> Kayıplar</button>
      ${Object.values(BATTLE_DATA.factions).map(f => `
      <div class="legend-item"><div class="legend-icon">${factionSVG(f, 12)}</div><span>${f.name}</span></div>`).join('')}
    </div>`;
}

// ── Önceki campaign fazını takip et ──
let prevCampaignPhaseId = null;

// ── Phase Geçişi ──
function setActivePhase(i) {
    const len = BATTLE_DATA.phases.length;
    if (i >= len) {
        // Son faza ulaşıldı — başa sarma, autoplay'i durdur
        stopAutoPlay();
        return;
    }
    const nextIndex = Math.max(0, i);
    const fromPhaseIndex = currentPhaseIndex;
    currentPhaseIndex = nextIndex;
    const p = BATTLE_DATA.phases[nextIndex];
    const ind = document.getElementById('phaseIndicator');
    if (ind) {
        ind.textContent = `${p.title} – ${p.date}`;
    }
    updateTimelineActiveState(nextIndex);
    focusActiveTimelineMarker();
    updateMapDateIndicator(p.date);

    // ── Campaign phase resolution ──
    const currentIso = String(p.isoStart || normalizeDateText(p.date, nextIndex));
    const campaignPhase = resolveCampaignPhase(currentIso);
    const isTransition = prevCampaignPhaseId && prevCampaignPhaseId !== campaignPhase.id;

    // ── Graceful fade-out: faz değişiminde çıkan entity'ler ──
    if (isTransition) {
        const transition = getPhaseTransition(prevCampaignPhaseId, campaignPhase.id);
        if (transition.exiting.length) {
            const tg = document.getElementById('unitTokens');
            if (tg) {
                BATTLE_DATA.units.forEach((u) => {
                    if (transition.exiting.includes(u.entityType)) {
                        const el = tg.querySelector(`.unit-token[data-unit-id="${u.id}"]`);
                        if (el) el.style.opacity = '0';
                    }
                });
            }
        }
    }

    const UNIT_ENTRY = getUnitEntryPhaseIndex();
    const prevPositions = { ...currentPositions };
    const nextPositions = {};

    BATTLE_DATA.units.forEach((u) => {
        const entryIndex = UNIT_ENTRY[u.id] ?? 0;
        if (nextIndex < entryIndex) return;

        // ── DESTROYED GATE: Batmış/çekilmiş birim render edilmez ──
        if (isUnitDestroyed(u.id, currentIso)) return;

        // ── PHASE GATE: Entity tipi bu campaign fazında izinli mi? ──
        const typeDef = ENTITY_TYPES[u.entityType];
        if (typeDef && !typeDef.allowedPhases.includes(campaignPhase.id)) return;

        const phaseData = u.phases[p.id];
        const pd = phaseData || (!isDestroyedPhaseData(phaseData) ? getNarrativeNavalPosition(u, nextIndex) : null);
        if (!pd) return;

        // ── TERRAIN GATE: Pozisyon entity tipine uygun terrain'de mi? ──
        if (typeDef) {
            const terrain = getTerrainAtPoint(pd.x, pd.y);
            if (!typeDef.allowedTerrain.includes(terrain)) {
                const clamped = clampToAllowedTerrain(pd.x, pd.y, typeDef.allowedTerrain);
                nextPositions[u.id] = { x: clamped.x, y: clamped.y };
                return;
            }
        }

        // ── CORRIDOR SEPARATION: karşı taraflarla örtüşmeyi engelle ──
        const separated = enforceCorridorSeparation(pd.x, pd.y, u, campaignPhase.id);
        nextPositions[u.id] = { x: separated.x, y: separated.y };
    });

    const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso];

    const tg = document.getElementById('unitTokens');
    if (tg) {
        const nextMarkup = renderTokens(p.id, prevPositions, nextPositions, nextIndex, fromPhaseIndex, currentIso, animData);
        tg.innerHTML = nextMarkup;
        const tokenNodes = [...tg.querySelectorAll('.unit-token')];
        requestAnimationFrame(() => applyTokenSlideWithTrail(tokenNodes));
    }
    renderBattleEffects(nextIndex);

    // ── Frontline & Land Combat FX ──
    renderFrontlines(campaignPhase, currentIso);
    renderLandCombatFX(campaignPhase, animData);

    // ── Animation Orchestrator: eventType'a göre savaş animasyonları ──
    const { routes: animRoutes, fx: animFx } = orchestrateAnimations(animData, nextPositions);
    const routesLayer = document.getElementById('layer-routes');
    if (routesLayer) routesLayer.innerHTML = animRoutes;
    const combatLayer = document.getElementById('layer-combat-fx');
    if (combatLayer) combatLayer.innerHTML += animFx;

    // ── Camera focus on campaign phase transition ──
    if (isTransition) {
        const svg = document.getElementById('battleMap');
        if (svg) animateCamera(svg, campaignPhase.camera);
    }

    if (animData) {
        if (animData.units?.length) {
            renderAnimationUnits(animData);
        }
        renderAtmosphere(animData.animationState);
        renderTransition(animData.sceneTransition);
        // ── Ses efektleri: olay tipine göre tetikle ──
        triggerPhaseSfx(animData, campaignPhase.id);
    } else {
        renderUnits(undefined);
        renderAtmosphere(null);
        renderTransition('');
    }
    updateMapSceneState(p, animData);

    // ── Info card: sahne stabilize olduktan sonra güncelle ──
    setTimeout(() => updateNarrationPanel(p), 360);

    // ── Update global state ──
    prevCampaignPhaseId = campaignPhase.id;
    for (const key in currentPositions) delete currentPositions[key];
    Object.assign(currentPositions, nextPositions);
}

// ── Toggle wrapper ──
function handleToggleAutoPlay() {
    toggleAutoPlay(setActivePhase, getCurrentPhaseIndex);
}

// ── Keyboard Navigation ──
function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                stopAutoPlay();
                setActivePhase(currentPhaseIndex - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                stopAutoPlay();
                setActivePhase(currentPhaseIndex + 1);
                break;
            case ' ':
                e.preventDefault();
                handleToggleAutoPlay();
                break;
            case 'Escape':
                hideUnitPanel();
                break;
        }
    });
}

// ── Pinch-to-Zoom (mobile) ──
function initPinchZoom() {
    const ctr = document.querySelector('.map-container');
    const svg = document.getElementById('battleMap');
    if (!ctr || !svg) return;

    let scale = 1;
    let lastDist = 0;
    let translateX = 0, translateY = 0;
    let lastTouchX = 0, lastTouchY = 0;

    function getTouchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    }

    function applyTransform() {
        svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        svg.style.transformOrigin = 'center center';
    }

    ctr.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            lastDist = getTouchDist(e.touches);
            lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        }
    }, { passive: false });

    ctr.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = getTouchDist(e.touches);
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            if (lastDist > 0) {
                const delta = dist / lastDist;
                scale = Math.min(3, Math.max(1, scale * delta));
                if (scale > 1) {
                    translateX += midX - lastTouchX;
                    translateY += midY - lastTouchY;
                } else {
                    translateX = 0;
                    translateY = 0;
                }
                applyTransform();
            }
            lastDist = dist;
            lastTouchX = midX;
            lastTouchY = midY;
        }
    }, { passive: false });

    ctr.addEventListener('touchend', () => {
        lastDist = 0;
        if (scale <= 1.05) {
            scale = 1;
            translateX = 0;
            translateY = 0;
            applyTransform();
        }
    });
}

// ── Ana Başlatma ──
async function init() {
    hydrateTimelineData();
    expandUnitTrails();
    initPositions();
    await waitForAnimationEvents();
    renderTopBar();
    renderMap(currentPhaseIndex, currentPositions);
    renderTimeline(setActivePhase, handleToggleAutoPlay);
    const closePanelBtn = document.getElementById('closeUnitPanelBtn');
    if (closePanelBtn) closePanelBtn.addEventListener('click', hideUnitPanel);
    attachUnitClicks(getCurrentPhaseIndex);
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) statsBtn.addEventListener('click', toggleStatsPanel);
    initKeyboardNav();
    initPinchZoom();
    setActivePhase(0);
    refreshAutoPlayButton();
    startAutoPlay(setActivePhase, getCurrentPhaseIndex);

    // Ses kontrolleri ve müzik
    renderAudioControls();
    initAudioOnInteraction();

    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
    }

    // Onboarding tutorial (ilk ziyarette)
    initOnboarding();
}

document.addEventListener('DOMContentLoaded', init);

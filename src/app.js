// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Ana Uygulama (Entry Point)
// Modülleri birleştiren orchestrator
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from './data/battle-data.js';
import { ENTITY_TYPES } from './data/entity-types.js';
import { getTerrainAtPoint, clampToAllowedTerrain } from './data/terrain-zones.js';
import { isUnitDestroyed } from './data/canonical-positions.js';
import { normalizeDateText, normalizeValue } from './engine/date-utils.js';
import { hydrateTimelineData, getUnitEntryPhaseIndex } from './engine/phase-engine.js';
import { resolveCampaignPhase, getPhaseTransition } from './engine/campaign-state-machine.js';
import { expandUnitTrails, getNarrativeNavalPosition, isDestroyedPhaseData, enforceCorridorSeparation, getClusterOffset } from './engine/position-engine.js';
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
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

// ── Mobile DOM Patching: innerHTML yerine mevcut token'ları güncelle ──
function patchTokens(tg, pid, prevPositions, nextPositions, phaseIndex, prevPhaseIndex, isoDate, animData) {
    const UNIT_ENTRY = getUnitEntryPhaseIndex();
    const existingNodes = new Map();
    tg.querySelectorAll('.unit-token').forEach(el => {
        existingNodes.set(el.dataset.unitId, el);
    });

    const activeUnitIds = new Set();

    BATTLE_DATA.units.forEach((u) => {
        const entryIndex = UNIT_ENTRY[u.id] ?? 0;
        if (phaseIndex < entryIndex) return;

        const targetBase = nextPositions[u.id];
        if (!targetBase) return;

        const phaseData = u.phases[pid];
        const visible = phaseData ? 1 : 0.55;
        const offset = getClusterOffset({}, targetBase.x, targetBase.y, u, phaseIndex);
        const tx = normalizeValue(Math.round(targetBase.x + offset.x), 45, 680);
        const ty = normalizeValue(Math.round(targetBase.y + offset.y), 18, 548);

        activeUnitIds.add(u.id);

        const existing = existingNodes.get(u.id);
        if (existing) {
            // Sadece pozisyon ve opacity güncelle — DOM silmeden
            existing.style.transform = `translate(${tx}px, ${ty}px)`;
            existing.style.opacity = String(visible);
            existing.dataset.targetX = tx;
            existing.dataset.targetY = ty;
        } else {
            // Yeni token: sadece ilk kez girenlerde innerHTML ekle
            const nextMarkup = renderTokens(pid, prevPositions, { [u.id]: nextPositions[u.id] }, phaseIndex, prevPhaseIndex, isoDate, animData);
            if (nextMarkup.trim()) {
                const temp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                temp.innerHTML = nextMarkup;
                while (temp.firstChild) tg.appendChild(temp.firstChild);
            }
        }
    });

    // Artık ekranda olmaması gereken token'ları gizle (silmeden)
    existingNodes.forEach((el, id) => {
        if (!activeUnitIds.has(id)) {
            el.style.opacity = '0';
        }
    });
}

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

// ── Sessiz dönem tespiti (autoplay-controller ile senkron) ──
const QUIET_PERIODS = [
    { start: '1914-11-10', end: '1915-02-18' },
    { start: '1915-08-25', end: '1915-12-06' },
];
function isQuietPeriod(iso) {
    return iso && QUIET_PERIODS.some(p => iso >= p.start && iso <= p.end);
}
let narrationTimer = null;

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
    const currentIso = String(p.isoStart || normalizeDateText(p.date, nextIndex));
    const quiet = isMobile && isQuietPeriod(currentIso);

    // ── MOBİL SESSIZ DÖNEM: Sadece tarih chip güncelle, geri kalanı atla ──
    if (quiet) {
        const ind = document.getElementById('phaseIndicator');
        if (ind) ind.textContent = `${p.title} – ${p.date}`;
        updateMapDateIndicator(p.date);
        // Narration'ı throttle — her 5 fazda bir güncelle (fotoğraf glitch önleme)
        if (nextIndex % 5 === 0) {
            const campaignPhase = resolveCampaignPhase(currentIso);
            const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso];
            prevCampaignPhaseId = campaignPhase.id;
            if (narrationTimer) clearTimeout(narrationTimer);
            narrationTimer = setTimeout(() => updateNarrationPanel(p, nextIndex, campaignPhase.id, animData), 200);
        }
        return;
    }

    const ind = document.getElementById('phaseIndicator');
    if (ind) {
        ind.textContent = `${p.title} – ${p.date}`;
    }
    updateTimelineActiveState(nextIndex);
    focusActiveTimelineMarker();
    updateMapDateIndicator(p.date);

    // ── Campaign phase resolution ──
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
        if (isMobile) {
            patchTokens(tg, p.id, prevPositions, nextPositions, nextIndex, fromPhaseIndex, currentIso, animData);
        } else {
            const nextMarkup = renderTokens(p.id, prevPositions, nextPositions, nextIndex, fromPhaseIndex, currentIso, animData);
            tg.innerHTML = nextMarkup;
            const tokenNodes = [...tg.querySelectorAll('.unit-token')];
            requestAnimationFrame(() => applyTokenSlideWithTrail(tokenNodes));
        }
    }
    if (isMobile) {
        if (isTransition) {
            const svg = document.getElementById('battleMap');
            if (svg) animateCamera(svg, campaignPhase.camera);
        }
        if (animData) triggerPhaseSfx(animData, campaignPhase.id);
        updateMapSceneState(p, animData);
    } else {
        renderBattleEffects(nextIndex);
        renderFrontlines(campaignPhase, currentIso);
        renderLandCombatFX(campaignPhase, animData);

        const { routes: animRoutes, fx: animFx } = orchestrateAnimations(animData, nextPositions);
        const routesLayer = document.getElementById('layer-routes');
        if (routesLayer) routesLayer.innerHTML = animRoutes;
        const combatLayer = document.getElementById('layer-combat-fx');
        if (combatLayer) combatLayer.innerHTML += animFx;

        if (isTransition) {
            const svg = document.getElementById('battleMap');
            if (svg) animateCamera(svg, campaignPhase.camera);
        }

        if (animData) {
            if (animData.units?.length) renderAnimationUnits(animData);
            renderAtmosphere(animData.animationState);
            renderTransition(animData.sceneTransition);
            triggerPhaseSfx(animData, campaignPhase.id);
        } else {
            renderUnits(undefined);
            renderAtmosphere(null);
            renderTransition('');
        }
        updateMapSceneState(p, animData);
    }

    // ── Info card ──
    if (narrationTimer) clearTimeout(narrationTimer);
    narrationTimer = setTimeout(() => updateNarrationPanel(p, nextIndex, campaignPhase.id, animData), isMobile ? 800 : 360);

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

// ── Pinch-to-Zoom + Pan (mobile) ──
function initPinchZoom() {
    const ctr = document.querySelector('.map-container');
    const svg = document.getElementById('battleMap');
    if (!ctr || !svg) return;

    let scale = 1;
    let lastDist = 0;
    let translateX = 0, translateY = 0;
    let lastTouchX = 0, lastTouchY = 0;
    let isPanning = false;
    let panStartX = 0, panStartY = 0;

    function getTouchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    }

    svg.style.willChange = 'transform';
    let rafPending = false;
    function applyTransform() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            svg.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
            svg.style.transformOrigin = 'center center';
            rafPending = false;
        });
    }

    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
        updateResetBtn();
    }

    // Reset butonu
    function updateResetBtn() {
        let btn = document.getElementById('mapResetBtn');
        if (scale > 1.05) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'mapResetBtn';
                btn.className = 'map-reset-btn';
                btn.type = 'button';
                btn.textContent = '⟲';
                btn.title = 'Haritayı sıfırla';
                btn.addEventListener('click', resetZoom);
                ctr.appendChild(btn);
            }
            btn.style.display = 'flex';
        } else if (btn) {
            btn.style.display = 'none';
        }
    }

    ctr.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            isPanning = false;
            lastDist = getTouchDist(e.touches);
            lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        } else if (e.touches.length === 1 && scale > 1.05) {
            // Tek parmak pan (sadece zoom'dayken)
            isPanning = true;
            panStartX = e.touches[0].clientX - translateX;
            panStartY = e.touches[0].clientY - translateY;
        }
    }, { passive: false });

    ctr.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            isPanning = false;
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
        } else if (e.touches.length === 1 && isPanning && scale > 1.05) {
            // Tek parmak pan
            e.preventDefault();
            translateX = e.touches[0].clientX - panStartX;
            translateY = e.touches[0].clientY - panStartY;
            applyTransform();
        }
    }, { passive: false });

    ctr.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            lastDist = 0;
            isPanning = false;
            if (scale <= 1.05) {
                resetZoom();
            }
            updateResetBtn();
        }
    });

    // Çift dokunma ile zoom sıfırla
    let lastTap = 0;
    ctr.addEventListener('touchend', (e) => {
        if (e.touches.length > 0) return;
        const now = Date.now();
        if (now - lastTap < 300 && scale > 1.05) {
            resetZoom();
        }
        lastTap = now;
    });
}

// ── Ana Başlatma ──
async function init() {
    await hydrateTimelineData();
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

    // Ses kontrolleri ve müzik
    renderAudioControls();
    initAudioOnInteraction();

    // Sinematik giriş — CSS animasyonla 5.5s sonra otomatik kaybolur
    const loader = document.getElementById('loadingOverlay');
    const startPlay = () => startAutoPlay(setActivePhase, getCurrentPhaseIndex);

    if (loader) {
        // CSS introAutoHide animasyonu bitince DOM'dan kaldır
        loader.addEventListener('animationend', () => {
            loader.remove();
            // Onboarding tutorial — intro bittikten SONRA göster
            const tutorialShown = initOnboarding({ onFinish: startPlay });
            if (!tutorialShown) startPlay();
        });
    } else {
        const tutorialShown = initOnboarding({ onFinish: startPlay });
        if (!tutorialShown) startPlay();
    }
}

document.addEventListener('DOMContentLoaded', init);

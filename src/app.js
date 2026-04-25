// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Ana Uygulama (Entry Point)
// Modülleri birleştiren orchestrator
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from './data/battle-data.js?v=20260407-manual-r1';
import { ENTITY_TYPES } from './data/entity-types.js';
import { waitForTerrainSampler } from './data/terrain-zones.js';
import { VP_MIN_X, VP_MAX_X, VP_MIN_Y, VP_MAX_Y } from './data/coordinate-map.js';
import { isUnitDestroyed } from './data/canonical-positions.js';
import { normalizeDateText, normalizeValue } from './engine/date-utils.js';
import { hydrateTimelineData, getUnitEntryPhaseIndex, getPhaseIndexByIso } from './engine/phase-engine.js?v=20260407-manual-r1';
import { resolveCampaignPhase, getPhaseTransition } from './engine/campaign-state-machine.js';
import { expandUnitTrails, getNarrativeNavalPosition, isDestroyedPhaseData, enforceCorridorSeparation, getClusterOffset, getTerrainSafePointForUnit } from './engine/position-engine.js?v=20260407-manual-r1';
import { renderMap, updateMapSceneState } from './render/map-renderer.js?v=20260407-manual-r1';
import { renderTokens, applyTokenSlideWithTrail, renderUnits, renderAnimationUnits, factionSVG } from './render/token-renderer.js';
import { renderBattleEffects } from './render/effects-renderer.js';
import { renderFrontlines, renderLandCombatFX } from './render/frontline-renderer.js';
import { animateCamera } from './render/camera.js';
import { initTouchZoom } from "./engine/touch-zoom.js?v=20260407-manual-r1";

import { orchestrateAnimations } from './render/animation-orchestrator.js';
import { renderTimeline, updateTimelineActiveState, focusActiveTimelineMarker } from './render/timeline-renderer.js';
import { updateMapDateIndicator, updateNarrationPanel, renderAtmosphere, renderTransition, getMobileViewMode, setMobileViewMode } from './ui/narration-panel.js';
import { hideUnitPanel, attachUnitClicks } from './ui/unit-panel.js';
import { stopAutoPlay, toggleAutoPlay, refreshAutoPlayButton } from './ui/autoplay-controller.js';
import { initOnboarding } from './ui/onboarding.js';
import { toggleStatsPanel } from './ui/stats-panel.js';
import { renderAudioControls, initAudioOnInteraction, triggerPhaseSfx } from './ui/audio-manager.js';

// ── Uygulama State ──
let currentPhaseIndex = 0;
const currentPositions = {};
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
let richTimelineHydrationStarted = false;
let terrainRefreshVersion = 0;

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
        const targetPoint = getTerrainSafePointForUnit(targetBase.x + offset.x, targetBase.y + offset.y, u);
        const tx = normalizeValue(Math.round(targetPoint.x), VP_MIN_X, VP_MAX_X);
        const ty = normalizeValue(Math.round(targetPoint.y), VP_MIN_Y, VP_MAX_Y);

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

function scheduleIdleTask(callback) {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 2200 });
        return;
    }
    setTimeout(callback, 800);
}

function loadAnimationEventsInBackground() {
    const loader = typeof window.loadAnimationEvents === 'function'
        ? window.loadAnimationEvents
        : () => Promise.resolve(window.ANIMATION_EVENTS_READY);

    Promise.resolve()
        .then(() => loader())
        .then(() => setActivePhase(currentPhaseIndex))
        .catch((err) => console.warn('Animasyon verileri hazır olamadı:', err));
}

async function hydrateRichTimelineInBackground() {
    if (richTimelineHydrationStarted) return;
    richTimelineHydrationStarted = true;

    const activePhase = BATTLE_DATA.phases[currentPhaseIndex];
    const activeIso = activePhase?.isoStart || normalizeDateText(activePhase?.date, currentPhaseIndex);
    const previousMobileMode = getMobileViewMode();

    try {
        await hydrateTimelineData({ loadBook: true, expandDaily: true });
        currentPhaseIndex = getPhaseIndexByIso(activeIso);
        for (const key in currentPositions) delete currentPositions[key];
        expandUnitTrails();
        initPositions();

        renderTopBar();
        renderMap(currentPhaseIndex, currentPositions, getStoryHandlers());
        renderTimeline(setActivePhase, handleToggleAutoPlay);

        const closePanelBtn = document.getElementById('closeUnitPanelBtn');
        if (closePanelBtn) closePanelBtn.addEventListener('click', hideUnitPanel);
        attachUnitClicks(getCurrentPhaseIndex);
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) statsBtn.addEventListener('click', toggleStatsPanel);
        renderAudioControls();
        initPinchZoom();
        await initMapEditorIfRequested();

        if (isMobile && previousMobileMode !== 'desktop') {
            setMobileViewMode(previousMobileMode, { silent: true });
        }

        setActivePhase(currentPhaseIndex);
        refreshAutoPlayButton();
        await refreshTerrainSafeTrails();
    } catch (err) {
        console.warn('Zengin zaman çizelgesi arka planda yüklenemedi:', err);
    }
}

async function refreshTerrainSafeTrails() {
    const version = ++terrainRefreshVersion;
    const terrainReady = await waitForTerrainSampler();
    if (!terrainReady || version !== terrainRefreshVersion) return;

    expandUnitTrails();
    setActivePhase(currentPhaseIndex);
    await refreshMapDoctorIfRequested();
}

function cleanPhaseTitle(title) {
    return String(title || '')
        .replace(/\s*\(EPUB[^)]*\)/gi, '')
        .replace(/(?:EPUB|Resmi Günlük Kayıt|Günlük Akış|Haftalık Bağlam|Haftalık Bağ|Kayd[ıi])\s*:?/gi, '')
        .replace(/\s*[·–-]\s*(?=[·–-]|$)/g, '')
        .replace(/^[\s·–-]+|[\s·–-]+$/g, '')
        .replace(/\s*·\s*/g, ' · ')
        .replace(/\s{2,}/g, ' ')
        .trim() || 'Cephe Günü';
}

function formatPhaseIndicator(phase) {
    if (!phase) return '';
    return `${cleanPhaseTitle(phase.title)} – ${phase.date}`;
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
    <div class="phase-indicator" id="phaseIndicator">${formatPhaseIndicator(p)}</div>
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
    { start: '1914-11-04', end: '1915-02-18' },
    { start: '1915-08-25', end: '1915-12-06' },
];
function isQuietPeriod(iso) {
    return iso && QUIET_PERIODS.some(p => iso >= p.start && iso <= p.end);
}
let narrationTimer = null;

function focusStoryMapForPhase(phase) {
    if (!isMobile || !phase?.mapFocus || !window.GELIBOLU_VIEWPORT) return;
    const focus = phase.mapFocus;
    window.GELIBOLU_VIEWPORT.focusOnPoint(
        focus.x + focus.w / 2,
        focus.y + focus.h / 2,
        focus.w
    );
}

function getStoryHandlers() {
    const getAdjacentStoryIndex = (direction) => {
        if (!isMobile) return currentPhaseIndex + direction;
        const currentIso = String(BATTLE_DATA.phases[currentPhaseIndex]?.isoStart || '');
        let nextIndex = currentPhaseIndex + direction;
        while (
            nextIndex > 0 &&
            nextIndex < BATTLE_DATA.phases.length - 1 &&
            String(BATTLE_DATA.phases[nextIndex]?.isoStart || '') === currentIso
        ) {
            nextIndex += direction;
        }
        return nextIndex;
    };

    return {
        onPrev: () => {
            stopAutoPlay();
            setActivePhase(getAdjacentStoryIndex(-1));
        },
        onNext: () => {
            stopAutoPlay();
            setActivePhase(getAdjacentStoryIndex(1));
        },
        onTogglePlay: () => handleToggleAutoPlay(),
        onJumpToChapter: (startIso) => {
            stopAutoPlay();
            setActivePhase(getPhaseIndexByIso(startIso));
        },
        onModeChange: (mode) => {
            if (mode !== 'story') focusStoryMapForPhase(BATTLE_DATA.phases[currentPhaseIndex]);
        }
    };
}

async function initMapEditorIfRequested() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('editor') !== '1') {
        document.body.dataset.mapEditor = 'disabled';
        return;
    }

    const { initMapEditor } = await import('./ui/map-editor.js?v=20260407-manual-r1');
    initMapEditor();
}

async function initMapDoctorIfRequested() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('doctor') !== '1') return;
    const { initMapDoctorPanel } = await import('./ui/map-doctor-panel.js?v=20260407-manual-r1');
    initMapDoctorPanel();
}

async function refreshMapDoctorIfRequested() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('doctor') !== '1') return;
    if (window.GELIBOLU_MAP_DOCTOR?.rerun) {
        await window.GELIBOLU_MAP_DOCTOR.rerun();
        return;
    }
    await initMapDoctorIfRequested();
}

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

    // ── MOBİL SESSIZ DÖNEM: Tarih chip + narration güncelle (fotoğraf değiştiğinde) ──
    if (quiet) {
        const ind = document.getElementById('phaseIndicator');
        if (ind) ind.textContent = formatPhaseIndicator(p);
        updateMapDateIndicator(p.date);
        if (getMobileViewMode() !== 'story') focusStoryMapForPhase(p);
        // Her 3 fazda narration güncelle — fotoğraflar da değişebilsin
        if (nextIndex % 3 === 0) {
            const campaignPhase = resolveCampaignPhase(currentIso);
            const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso];
            prevCampaignPhaseId = campaignPhase.id;
            if (narrationTimer) clearTimeout(narrationTimer);
            narrationTimer = setTimeout(() => updateNarrationPanel(p, nextIndex, campaignPhase.id, animData), 150);
        }
        return;
    }

    const ind = document.getElementById('phaseIndicator');
    if (ind) {
        ind.textContent = formatPhaseIndicator(p);
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

        // Terrain clamping zaten expandUnitTrails()'de uygulanıyor — burada tekrar yapma

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
        if (getMobileViewMode() !== 'story') focusStoryMapForPhase(p);
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
    narrationTimer = setTimeout(() => updateNarrationPanel(p, nextIndex, campaignPhase.id, animData), isMobile ? 180 : 360);

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
    initTouchZoom('battleMap');
}

// ── Ana Başlatma ──
async function init() {
    await hydrateTimelineData({ loadBook: false, expandDaily: false });
    expandUnitTrails();
    initPositions();
    renderTopBar();
    renderMap(currentPhaseIndex, currentPositions, getStoryHandlers());
    renderTimeline(setActivePhase, handleToggleAutoPlay);
    const closePanelBtn = document.getElementById('closeUnitPanelBtn');
    if (closePanelBtn) closePanelBtn.addEventListener('click', hideUnitPanel);
    attachUnitClicks(getCurrentPhaseIndex);
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) statsBtn.addEventListener('click', toggleStatsPanel);
    initKeyboardNav();
    initPinchZoom();
    initMapEditorIfRequested();
    initMapDoctorIfRequested();
    setActivePhase(0);
    refreshAutoPlayButton();
    refreshTerrainSafeTrails();
    loadAnimationEventsInBackground();
    scheduleIdleTask(() => {
        hydrateRichTimelineInBackground();
    });

    // Ses kontrolleri ve müzik
    renderAudioControls();
    initAudioOnInteraction();

    // Sinematik giriş — CSS animasyonla 5.5s sonra otomatik kaybolur
    const loader = document.getElementById('loadingOverlay');

    if (loader) {
        // CSS introAutoHide animasyonu bitince DOM'dan kaldır
        // NOT: Child elementlerin animationend'i bubble eder — sadece kendi animasyonunu dinle
        loader.addEventListener('animationend', (e) => {
            if (e.target !== loader) return; // Child animasyonlarını yoksay
            loader.remove();
            // Onboarding tutorial — kullanıcı başlatmadan autoplay başlamaz
            initOnboarding();
        });
        // Fallback: 6 saniye sonra hâlâ kalkmadıysa zorla kaldır (Safari edge case)
        setTimeout(() => {
            if (document.getElementById('loadingOverlay')) {
                loader.remove();
                initOnboarding();
            }
        }, 6500);
    } else {
        initOnboarding();
    }
}

document.addEventListener('DOMContentLoaded', init);

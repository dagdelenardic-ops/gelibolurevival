// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Ana Uygulama (Entry Point)
// Modülleri birleştiren orchestrator
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA, getMapLocationById } from './data/battle-data.js?v=20260618-3d-spectacle-r4';
import { ENTITY_TYPES } from './data/entity-types.js?v=20260618-3d-spectacle-r4';
import { waitForTerrainSampler } from './data/terrain-zones.js?v=20260618-3d-spectacle-r4';
import { MAP_WIDTH, MAP_CROP_TOP, MAP_VIEW_HEIGHT } from './data/coordinate-map.js?v=20260618-3d-spectacle-r4';
import { isUnitOffMap, getUnitEndState } from './data/canonical-positions.js?v=20260618-3d-spectacle-r4';
import { normalizeDateText } from './engine/date-utils.js?v=20260618-3d-spectacle-r4';
import { hydrateTimelineData, getUnitEntryPhaseIndex, getPhaseIndexByIso } from './engine/phase-engine.js?v=20260618-3d-spectacle-r4';
import { resolveCampaignPhase, getPhaseTransition } from './engine/campaign-state-machine.js?v=20260618-3d-spectacle-r4';
import { expandUnitTrails, getNarrativeNavalPosition, enforceCorridorSeparation, getUnitEntryOrigin } from './engine/position-engine.js?v=20260618-3d-spectacle-r4';
import { renderMap, updateMapSceneState } from './render/map-renderer.js?v=20260618-3d-spectacle-r4';
import { renderTokens, renderUnits, renderAnimationUnits, factionSVG } from './render/token-renderer.js?v=20260618-3d-spectacle-r4';
import { reconcileTokens, quakeMap } from './render/token-animator.js?v=20260618-3d-spectacle-r4';
import { renderBattleEffects } from './render/effects-renderer.js?v=20260618-3d-spectacle-r4';
import { renderFrontlines, renderLandCombatFX } from './render/frontline-renderer.js?v=20260618-3d-spectacle-r4';
import { animateCamera } from './render/camera.js?v=20260618-3d-spectacle-r4';
import { frameActiveSectors, resolveActiveSectors, renderDirectorOverlay } from './render/director.js?v=20260618-3d-spectacle-r4';
import { initTouchZoom } from "./engine/touch-zoom.js?v=20260618-3d-spectacle-r4";

import { orchestrateAnimations, renderUnitMovementTrails } from './render/animation-orchestrator.js?v=20260618-3d-spectacle-r4';
import { renderTimeline, updateTimelineActiveState, focusActiveTimelineMarker } from './render/timeline-renderer.js?v=20260618-3d-spectacle-r4';
import { updateMapDateIndicator, updateNarrationPanel, renderAtmosphere, renderTransition, getMobileViewMode, setMobileViewMode } from './ui/narration-panel.js?v=20260618-3d-spectacle-r4';
import { hideUnitPanel, attachUnitClicks, showUnitPanel } from './ui/unit-panel.js?v=20260618-3d-spectacle-r4';
import { GEO_LOCATIONS } from './data/geo-calibration.js?v=20260618-3d-spectacle-r4';
import { stopAutoPlay, toggleAutoPlay, refreshAutoPlayButton, syncAutoPlay, getIsAutoPlaying, getAutoPlayIntervalForPhase } from './ui/autoplay-controller.js?v=20260618-3d-spectacle-r4';
import { showUnitRoster, hideUnitRoster, refreshUnitRoster } from './ui/unit-roster.js?v=20260618-3d-spectacle-r4';
import { initMovementLedger, updateMovementLedger } from './ui/movement-ledger.js?v=20260618-3d-spectacle-r4';
import { initOnboarding } from './ui/onboarding.js?v=20260618-3d-spectacle-r4';
import { toggleStatsPanel, hideStatsPanel } from './ui/stats-panel.js?v=20260618-3d-spectacle-r4';
import { renderAudioControls, initAudioOnInteraction, triggerPhaseSfx } from './ui/audio-manager.js?v=20260618-3d-spectacle-r4';

// ── Uygulama State ──
let currentPhaseIndex = 0;
const currentPositions = {};
// innerWidth=0 tuzağı: bazı yükleme anlarında innerWidth 0 gelir; bunu "mobil" sayarsak
// masaüstü yanlışlıkla 2B'ye düşer. Sadece 0<width<=768 gerçekten mobil sayılır.
const isMobile = typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth <= 768;
let richTimelineHydrationStarted = false;
let terrainRefreshVersion = 0;
let keyboardNavBound = false;
const CAMPAIGN_START_ISO = '1914-11-03';

// ── 3B rölyef harita katmanı (three.js) — dinamik yüklenir, hata izole edilir ──
let scene3d = null;
let scene3dPref = (() => {
    // URL zorlaması: ?view=3d / ?view=2d (ya da ?3d / ?2d) localStorage'ı ezer ve kaydeder.
    // 3B artık HER cihazda (mobil dahil) varsayılan — kullanıcı 2B'yi açıkça seçmediyse 3B gelir.
    try {
        const params = new URLSearchParams(window.location.search);
        const forced = params.get('view') || (params.has('3d') ? '3d' : params.has('2d') ? '2d' : '');
        if (forced === '3d' || forced === '2d') {
            try { localStorage.setItem('gelibolu-view', forced); } catch {}
            return forced;
        }
        return localStorage.getItem('gelibolu-view') || '3d';
    } catch { return '3d'; }
})();

function getCurrentPhaseIndex() { return currentPhaseIndex; }

function update3DPhase() {
    if (!scene3d || !scene3d.is3DReady()) return;
    const p = BATTLE_DATA.phases[currentPhaseIndex];
    if (!p) return;
    const iso = String(p.isoStart || normalizeDateText(p.date, currentPhaseIndex));
    const animData = window.ANIMATION_EVENTS_BY_DATE?.[iso] || null;
    scene3d.setPhase3D(p, currentPositions, animData, { autoplay: getIsAutoPlaying() });
}

function setView3D(on, persist = true) {
    if (!scene3d) return;
    scene3dPref = on ? '3d' : '2d';
    if (persist) { try { localStorage.setItem('gelibolu-view', scene3dPref); } catch {} }
    scene3d.show3D(on);
    document.getElementById('scene3d')?.setAttribute('aria-hidden', on ? 'false' : 'true');
    const btn = document.getElementById('view3dToggle');
    if (btn) {
        btn.dataset.mode = on ? '3d' : '2d';
        btn.querySelector('.v3d-label').textContent = on ? '3B Rölyef' : '2B Harita';
    }
    if (on) update3DPhase();
}

function buildView3DToggle() {
    if (document.getElementById('view3dToggle')) return;
    const btn = document.createElement('button');
    btn.id = 'view3dToggle';
    btn.className = 'view3d-toggle';
    btn.type = 'button';
    btn.dataset.mode = scene3dPref;
    btn.innerHTML = `<span class="v3d-dot"></span><span class="v3d-label">${scene3dPref === '3d' ? '3B Rölyef' : '2B Harita'}</span>`;
    btn.setAttribute('aria-label', '2B harita ile 3B rölyef arasında geçiş yap');
    btn.addEventListener('click', () => setView3D(scene3dPref !== '3d'));
    document.body.appendChild(btn);
    if (scene3dPref === '3d') {
        const hint = document.createElement('div');
        hint.className = 'scene3d-hint';
        hint.textContent = 'Sürükle: döndür · Tekerlek: yakınlaş · Birime tıkla: detay';
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 6500);
    }
}

async function initThreeLayer() {
    const host = document.getElementById('scene3d');
    if (!host) return;
    try {
        const mod = await import('./render/scene3d.js?v=20260618-3d-spectacle-r4');
        await mod.initScene3D(host, {
            units: BATTLE_DATA.units,
            locations: GEO_LOCATIONS,
            onUnitClick: (unit, phase, animData) => {
                const pd = unit.phases?.[phase.id] || { status: 'Bilinmiyor', objective: 'Bilinmiyor', outcome: 'Bilinmiyor' };
                showUnitPanel(unit, pd, phase, animData);
            },
        });
        scene3d = mod;
        buildView3DToggle();
        setView3D(scene3dPref === '3d', false);
        update3DPhase();
    } catch (err) {
        console.warn('3B katmanı yüklenemedi (2B harita aktif):', err);
    }
}

function getRequestedStartIso() {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('date') || params.get('day') || params.get('iso') || '';
}

function applyRequestedStartPhase() {
    const requestedIso = getRequestedStartIso();
    if (!requestedIso) return;
    currentPhaseIndex = getPhaseIndexByIso(requestedIso);
}

function scheduleIdleTask(callback) {
    // Tek-seferlik tetik: requestIdleCallback ile setTimeout yarışır, ilki kazanır.
    // GİZLİ SEKME TUZAĞI: tarayıcılar arka plan sekmesinde requestIdleCallback'i
    // TAMAMEN askıya alır (timeout dahil) — eski kod yalnızca RIC'e güvendiği için
    // arka planda açılan sekmede zengin hidrasyon (433 günlük timeline) HİÇ
    // yüklenmiyor, kullanıcı 6-fazlık bootstrap'ta kalıyordu. setTimeout gizli
    // sekmede de (throttled olsa da) çalışır → güvenlik ağı.
    let fired = false;
    const run = () => { if (fired) return; fired = true; callback(); };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 2200 });
        setTimeout(run, 2500);
        return;
    }
    setTimeout(run, 800);
}

function loadAnimationEventsInBackground() {
    const loader = typeof window.loadAnimationEvents === 'function'
        ? window.loadAnimationEvents
        : () => Promise.resolve(window.ANIMATION_EVENTS_READY);

    Promise.resolve()
        .then(() => loader())
        .then(() => {
            setActivePhase(currentPhaseIndex);
            syncAutoPlay(setActivePhase, getCurrentPhaseIndex);
        })
        .catch((err) => console.warn('Animasyon verileri hazır olamadı:', err));
}

async function hydrateRichTimelineInBackground() {
    if (richTimelineHydrationStarted) return;
    richTimelineHydrationStarted = true;

    const activePhase = BATTLE_DATA.phases[currentPhaseIndex];
    const requestedIso = getRequestedStartIso();
    const isBootstrapDefault = !requestedIso
        && currentPhaseIndex === 0
        && BATTLE_DATA.phases.length <= 6
        && activePhase?.isoStart === '1915-03-18';
    const activeIso = requestedIso
        || (isBootstrapDefault ? CAMPAIGN_START_ISO : activePhase?.isoStart)
        || normalizeDateText(activePhase?.date, currentPhaseIndex);
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
        syncAutoPlay(setActivePhase, getCurrentPhaseIndex);
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

// İso tarihe +1 gün (batış-günü tespiti için: yarın 'sunk' mı?)
function nextIsoDay(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

// ── Başlangıç Konumları ──
function initPositions() {
    const startPhase = BATTLE_DATA.phases[currentPhaseIndex];
    if (!startPhase?.id) return;
    const iso = String(startPhase.isoStart || '');
    BATTLE_DATA.units.forEach((u) => {
        if (isUnitOffMap(u.id, iso)) return;
        const d = u.phases[startPhase.id];
        // off-map (reserve/karargah) birimleri ilk render'da da gösterme
        if (d && !d.offMap) {
            const entry = { x: d.x, y: d.y };
            const endNext = getUnitEndState(u.id, nextIsoDay(iso));
            if (endNext === 'sunk') entry.sinking = true;
            else if (endNext === 'withdrawn' || endNext === 'evacuated') entry.evacuating = true;
            currentPositions[u.id] = entry;
        }
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
let lastCameraKey = '';
let lastCameraTarget = null;

// Kamera "ölü bant" (deadband): belgesel kararlılığı için kamera ancak hedef
// ANLAMLI ölçüde değişince yeniden çerçeveler. Gün-gün küçük sürüklenmeler
// (birim hareketi, locationIds blend'i) kamerayı zıplatmaz.
function shouldMoveCamera(prev, next) {
    if (!prev || !next) return true;
    const prevCx = prev.x + prev.w / 2;
    const prevCy = prev.y + prev.h / 2;
    const nextCx = next.x + next.w / 2;
    const nextCy = next.y + next.h / 2;
    const centerShift = Math.hypot(nextCx - prevCx, nextCy - prevCy);
    const zoomRatio = next.w > 0 && prev.w > 0 ? next.w / prev.w : 1;
    // Merkez 180 harita-biriminden fazla kaydıysa VEYA zoom %20'den fazla
    // değiştiyse yeni sahneye geç; aksi halde mevcut çerçeveyi koru.
    return centerShift > 180 || zoomRatio > 1.2 || zoomRatio < 0.83;
}

const EVACUATION_CAMERA_TARGETS = {
    north: { x: 720, y: 1320, w: 980, h: 860, locationIds: ['suvla', 'ariburnu', 'anafartalar', 'conkbayiri', 'kirectepe'] },
    south: { x: 740, y: 2030, w: 980, h: 860, locationIds: ['seddulbahir', 'kirte', 'alcitepe', 'morto-koyu'] }
};

function clampCameraTarget(target) {
    const w = Math.max(620, Math.min(MAP_WIDTH, Math.round(target.w || MAP_WIDTH)));
    const h = Math.max(560, Math.min(MAP_VIEW_HEIGHT, Math.round(target.h || MAP_VIEW_HEIGHT)));
    const x = Math.max(0, Math.min(MAP_WIDTH - w, Math.round(target.x || 0)));
    const y = Math.max(MAP_CROP_TOP, Math.min(MAP_CROP_TOP + MAP_VIEW_HEIGHT - h, Math.round(target.y || MAP_CROP_TOP)));
    return { ...target, x, y, w, h };
}

function targetFromPoints(points, options = {}) {
    const valid = points.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
    if (!valid.length) return null;

    const minX = Math.min(...valid.map((point) => point.x));
    const maxX = Math.max(...valid.map((point) => point.x));
    const minY = Math.min(...valid.map((point) => point.y));
    const maxY = Math.max(...valid.map((point) => point.y));
    const padding = options.padding ?? 210;
    const minW = options.minW ?? 760;
    const minH = options.minH ?? 640;
    const maxW = options.maxW ?? 1500;
    const maxH = options.maxH ?? 1200;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const w = Math.min(maxW, Math.max(minW, (maxX - minX) + padding * 2));
    const h = Math.min(maxH, Math.max(minH, (maxY - minY) + padding * 2));

    return clampCameraTarget({
        x: centerX - w / 2,
        y: centerY - h / 2,
        w,
        h,
        locationIds: options.locationIds || []
    });
}

function buildPhaseCameraTarget(phase, campaignPhase, nextPositions, animData) {
    const iso = String(phase?.isoStart || '');

    if (iso >= '1915-12-07' && iso <= '1915-12-20') {
        return { ...EVACUATION_CAMERA_TARGETS.north, reason: 'evacuation-north' };
    }
    if (iso > '1915-12-20') {
        return { ...EVACUATION_CAMERA_TARGETS.south, reason: 'evacuation-south' };
    }

    // ── YÖNETMEN: o gün savaş NEREDE(ler)se oraya çerçevele. ──
    // Tek cephe → yakın, sinematik kutu. İki+ cephe AYNI ANDA aktifse →
    // ikisini de kapsayan GENİŞ AÇI birleşik çerçeve. Anlamlı aksiyon günü
    // (intensity≥3 ya da çok-cepheli) küratörlü mapFocus'u ezer; sessiz
    // günlerde belgesel kararlılığı için mapFocus korunur.
    const sectors = resolveActiveSectors(animData, phase, nextPositions);
    const intensity = Number(animData?.intensity || 0);
    if (sectors.length >= 2 || (sectors.length === 1 && intensity >= 3)) {
        const framed = frameActiveSectors(animData, phase, nextPositions);
        if (framed) return framed;
    }

    // Belgesel kararlılığı: küratörlü sahne odağı (sessiz / geçiş günleri).
    if (phase?.mapFocus) return { ...phase.mapFocus, reason: 'guided-campaign' };

    // Tek aktif cephe ama düşük yoğunluk: yine de o cepheye çerçevele.
    if (sectors.length >= 1) {
        const framed = frameActiveSectors(animData, phase, nextPositions);
        if (framed) return framed;
    }

    if (Array.isArray(phase?.locationIds) && phase.locationIds.length) {
        const locationPoints = phase.locationIds
            .map((id) => getMapLocationById(id))
            .filter(Boolean);
        const target = targetFromPoints(locationPoints, {
            padding: 260,
            minW: 900,
            minH: 720,
            maxW: 1600,
            maxH: 1220,
            locationIds: phase.locationIds
        });
        if (target) return { ...target, reason: 'phase-locations' };
    }

    return campaignPhase.camera || { x: 0, y: MAP_CROP_TOP, w: MAP_WIDTH, h: MAP_VIEW_HEIGHT, reason: 'campaign' };
}

function applyPhaseCamera(phase, campaignPhase, nextPositions, animData) {
    const svg = document.getElementById('battleMap');
    if (!svg) return null;
    const target = clampCameraTarget(buildPhaseCameraTarget(phase, campaignPhase, nextPositions, animData));
    // Karşılaştırma GERÇEK viewBox'a karşı yapılır (cache'lenmiş anahtara değil):
    // hem gün-gün küçük sürüklenmeyi deadband ile yutar hem de renderMap SVG'yi
    // varsayılana sıfırladığında doğru çerçeveyi yeniden uygular (desync düzeltmesi).
    const vb = svg.viewBox.baseVal;
    const current = (Number.isFinite(vb.width) && vb.width > 0)
        ? { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
        : null;
    if (shouldMoveCamera(current, target)) {
        animateCamera(svg, target, 720);
        lastCameraKey = `${target.x}:${target.y}:${target.w}:${target.h}`;
        lastCameraTarget = target;
    }
    return target;
}

function focusStoryMapForPhase(phase, focusOverride = null) {
    if (!isMobile || !window.GELIBOLU_VIEWPORT) return;
    const focus = focusOverride || phase?.mapFocus;
    if (!focus) return;
    window.GELIBOLU_VIEWPORT.focusOnPoint(
        focus.x + focus.w / 2,
        focus.y + focus.h / 2,
        focus.w
    );
}

function updatePhaseLiveRegion(phase) {
    const live = document.getElementById('phaseLiveRegion');
    if (!live || !phase) return;
    live.textContent = `${phase.date}: ${cleanPhaseTitle(phase.title)}. ${phase.guidedChapterTitle || phase.mobileChapterTitle || ''}`;
}

function applyGuidedFocus(phase) {
    if (!phase) return;
    const focusIds = new Set((phase.mapFocus?.locationIds || phase.locationIds || []).filter(Boolean));
    const guidedUnitIds = new Set((phase.guidedUnitIds || phase.mobileVisibleUnitIds || []).filter(Boolean));
    const hasGuidedUnits = guidedUnitIds.size > 0;

    document.querySelectorAll('.location-group').forEach((el) => {
        const active = focusIds.has(el.dataset.locationId);
        el.classList.toggle('is-highlighted', active);
        el.classList.toggle('is-current-location', active);
    });

    document.querySelectorAll('.unit-token').forEach((el) => {
        const active = guidedUnitIds.has(el.dataset.unitId);
        el.classList.toggle('is-referenced', active);
        el.classList.toggle('is-story-passive', hasGuidedUnits && !active);
        if (hasGuidedUnits) {
            if (active) {
                el.classList.add('is-active');
                el.classList.remove('is-muted');
            } else {
                el.classList.remove('is-active', 'is-muted');
            }
        }
        if (isMobile && hasGuidedUnits && !active) {
            el.setAttribute('aria-hidden', 'true');
            el.setAttribute('tabindex', '-1');
        } else {
            el.removeAttribute('aria-hidden');
            el.setAttribute('tabindex', '0');
        }
    });
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

    const { initMapEditor } = await import('./ui/map-editor.js?v=20260618-3d-spectacle-r4');
    initMapEditor();
}

async function initMapDoctorIfRequested() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('doctor') !== '1') return;
    const { initMapDoctorPanel } = await import('./ui/map-doctor-panel.js?v=20260618-3d-spectacle-r4');
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
    updatePhaseLiveRegion(p);

    // ── MOBİL SESSIZ DÖNEM: Tarih chip + narration güncelle (fotoğraf değiştiğinde) ──
    if (quiet) {
        const campaignPhase = resolveCampaignPhase(currentIso);
        const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso];
        const cameraTarget = applyPhaseCamera(p, campaignPhase, currentPositions, animData);
        const ind = document.getElementById('phaseIndicator');
        if (ind) ind.textContent = formatPhaseIndicator(p);
        updateMapDateIndicator(p.date);
        updateMapSceneState(p, animData, cameraTarget);
        renderDirectorOverlay(resolveActiveSectors(animData, p, currentPositions), document.querySelector('.map-container'));
        applyGuidedFocus(p);
        updateMovementLedger(p, currentPositions, animData);
        refreshUnitRoster(nextIndex);
        if (getMobileViewMode() !== 'story') focusStoryMapForPhase(p, cameraTarget);
        // Her 3 fazda narration güncelle — fotoğraflar da değişebilsin
        if (nextIndex % 3 === 0) {
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

        // ── OFF-MAP GATE: battı/çekildi/tahliye birim render edilmez ──
        // (canonical tek otorite; batış GÜNÜ gemi hâlâ erenköy'de görünür,
        //  ertesi gün 'sunk' olur — batış sahnesi siluetle birlikte oynar)
        if (isUnitOffMap(u.id, currentIso)) return;

        // ── PHASE GATE: Entity tipi bu campaign fazında izinli mi? ──
        const typeDef = ENTITY_TYPES[u.entityType];
        if (typeDef && !typeDef.allowedPhases.includes(campaignPhase.id)) return;

        const phaseData = u.phases[p.id];
        const pd = phaseData || getNarrativeNavalPosition(u, nextIndex);
        if (!pd) return;

        // ── RESERVE GATE: ihtiyat/karargah birimleri haritada gösterme.
        // (expandUnitTrails offMap=true flag'i yerleştirdi; roster panel
        //  bunları "İhtiyatta / Karargâhta" rozetiyle gösterecek.)
        if (pd.offMap) return;

        // Terrain clamping zaten expandUnitTrails()'de uygulanıyor — burada tekrar yapma

        // ── CORRIDOR SEPARATION: karşı taraflarla örtüşmeyi engelle ──
        const separated = enforceCorridorSeparation(pd.x, pd.y, u, campaignPhase.id);
        const entry = { x: separated.x, y: separated.y };
        // Final dramı: bugün görünür ama YARIN kanonik son-durumu değişiyorsa, bugün oyna.
        const endNext = getUnitEndState(u.id, nextIsoDay(currentIso));
        if (endNext === 'sunk') entry.sinking = true;
        else if (endNext === 'withdrawn' || endNext === 'evacuated') entry.evacuating = true;
        // Amfibi çıkarma: İtilaf piyadesi ilk göründüğü gün denizden kıyıya süzülür (3B).
        if (!(u.id in prevPositions) && u.entityType === 'infantry_unit'
            && (u.faction === 'anzac' || u.faction === 'british' || u.faction === 'french')) {
            entry.enterFrom = getUnitEntryOrigin(u, { x: separated.x, y: separated.y });
        }
        nextPositions[u.id] = entry;
    });

    const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso];
    const cameraTarget = applyPhaseCamera(p, campaignPhase, nextPositions, animData);

    // ── 3B rölyef katmanını bu günün konumlarıyla güncelle ──
    if (scene3d && scene3d.is3DReady()) scene3d.setPhase3D(p, nextPositions, animData, { autoplay: getIsAutoPlaying() });

    // ── Yönetmen şeridi: hangi cephe(ler)de ne oluyor — net, daima okunur ──
    renderDirectorOverlay(resolveActiveSectors(animData, p, nextPositions), document.querySelector('.map-container'));

    // Günlük hareket defteri: o gün hangi deniz/kara birliği nereden→nereye.
    updateMovementLedger(p, nextPositions, animData);

    const tg = document.getElementById('unitTokens');
    if (tg) {
        const nextMarkup = renderTokens(p.id, prevPositions, nextPositions, nextIndex, fromPhaseIndex, currentIso, animData);
        // Keyed reconcile: token DOM'u kalıcı, hareket rAF tween ile yürür.
        // Timeline'da 2+ faz sıçrandıysa yürütmek anlamsız — anında konuşlan.
        const isScrubJump = Math.abs(nextIndex - fromPhaseIndex) > 2;
        const budgetMs = getIsAutoPlaying()
            ? Math.round(getAutoPlayIntervalForPhase(nextIndex) * 0.58)
            : 1900;
        reconcileTokens(tg, nextMarkup, { budgetMs, instant: isScrubJump });
    }
    if (isMobile) {
        if (animData) triggerPhaseSfx(animData, campaignPhase.id);
        updateMapSceneState(p, animData, cameraTarget);
        applyGuidedFocus(p);
        if (getMobileViewMode() !== 'story') focusStoryMapForPhase(p, cameraTarget);
    } else {
        renderBattleEffects(nextIndex);
        renderFrontlines(campaignPhase, currentIso);

        const { routes: animRoutes, fx: animFx } = orchestrateAnimations(animData, nextPositions);
        // Birim hareket izleri: o gün gerçekten yürüyen birimlerin yön okları
        // (campaign-movement.js march legleri görünür olur).
        const moveTrails = renderUnitMovementTrails(prevPositions, nextPositions, BATTLE_DATA.units, currentIso);
        const routesLayer = document.getElementById('layer-routes');
        if (routesLayer) routesLayer.innerHTML = animRoutes + moveTrails;
        const combatLayer = document.getElementById('layer-combat-fx');
        // Reset (eskiden += idi → orkestratör FX'i her faz birikip bellek
        // sızdırıyor + her tikte tüm birikmiş SMIL'i resetliyordu). Kara savaşı
        // FX'i bu reset'in ÜSTÜNE eklenmeli; o yüzden renderLandCombatFX artık
        // combatLayer sıfırlandıktan SONRA çağrılır (kendi .land-combat-fx'ini
        // ekler, orkestratör FX'ini silmez).
        if (combatLayer) combatLayer.innerHTML = animFx;
        renderLandCombatFX(campaignPhase, animData);

        if (animData) {
            if (animData.units?.length) renderAnimationUnits(animData);
            renderAtmosphere(animData.animationState);
            renderTransition(animData.sceneTransition);
            triggerPhaseSfx(animData, campaignPhase.id);
            // Game feel: büyük bombardıman/muharebe günlerinde kısa harita sarsıntısı
            const fxIntensity = Number(animData.intensity || 0);
            if (fxIntensity >= 8) quakeMap('heavy');
            else if (fxIntensity >= 7 && animData.eventType === 'BOMBARDMENT') quakeMap('light');
        } else {
            renderUnits(undefined);
            renderAtmosphere(null);
            renderTransition('');
        }
        updateMapSceneState(p, animData, cameraTarget);
        applyGuidedFocus(p);
    }

    // ── Info card ──
    if (narrationTimer) clearTimeout(narrationTimer);
    narrationTimer = setTimeout(() => updateNarrationPanel(p, nextIndex, campaignPhase.id, animData), isMobile ? 180 : 360);

    // ── Update global state ──
    prevCampaignPhaseId = campaignPhase.id;
    for (const key in currentPositions) delete currentPositions[key];
    Object.assign(currentPositions, nextPositions);
    refreshUnitRoster(nextIndex);
}

// ── Toggle wrapper ──
function handleToggleAutoPlay() {
    const wasPlaying = getIsAutoPlaying();
    toggleAutoPlay(setActivePhase, getCurrentPhaseIndex);
    if (wasPlaying) showUnitRoster(currentPhaseIndex);
    else hideUnitRoster();
}

// ── Keyboard Navigation ──
function initKeyboardNav() {
    if (keyboardNavBound) return;
    keyboardNavBound = true;
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
                hideUnitRoster();
                hideStatsPanel();
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
    applyRequestedStartPhase();
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
    initMovementLedger();
    initMapEditorIfRequested();
    initMapDoctorIfRequested();
    // ?date=… deep-link'i koru — sıfıra fl yapma (applyRequestedStartPhase
    // currentPhaseIndex'i zaten ayarladı; deep-link yoksa 0)
    setActivePhase(currentPhaseIndex);
    refreshAutoPlayButton();
    refreshTerrainSafeTrails();
    loadAnimationEventsInBackground();
    scheduleIdleTask(() => {
        hydrateRichTimelineInBackground();
    });

    // 3B rölyef harita katmanını arka planda kur (three.js, dinamik import)
    initThreeLayer();

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

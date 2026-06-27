// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Harita Renderer (v2 — Askeri Kartografi)
// Historically grounded military cartography with modern UI clarity
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260622-hp-polish-r1';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CROP_TOP, MAP_VIEW_HEIGHT } from '../data/coordinate-map.js?v=20260622-hp-polish-r1';
import { MAP_FORTS, MAP_SCENE_LABELS, MAP_SCENE_GUIDES, MAP_ORNAMENTS } from '../data/geo-calibration.js?v=20260622-hp-polish-r1';
import { HISTORICAL_ROUTES } from '../data/historical-map-data.js?v=20260622-hp-polish-r1';
import { renderTokens } from './token-renderer.js?v=20260622-hp-polish-r1';
import { renderBattleEffects } from './effects-renderer.js?v=20260622-hp-polish-r1';
import { updateMapDateIndicator, updateNarrationPanel, attachNarrationElements } from '../ui/narration-panel.js?v=20260622-hp-polish-r1';
import { isMobile as _isMobileCheck } from '../engine/responsive.js?v=20260622-hp-polish-r1';

function getActiveSceneGroups(phase, animData) {
    const iso = String(phase && phase.isoStart || '');
    const fronts = Array.isArray(animData && animData.fronts) ? animData.fronts : [];
    if (iso <= '1915-03-19' || (fronts.length === 1 && fronts[0] === 'Deniz')) return ['naval'];
    if (iso === '1915-04-25') return ['anzac', 'helles'];

    const activeGroups = new Set();
    if (fronts.includes('Deniz')) activeGroups.add('naval');
    if (fronts.includes('Arıburnu')) activeGroups.add('anzac');
    if (fronts.includes('Seddülbahir')) activeGroups.add('helles');
    if (fronts.includes('Anafartalar')) activeGroups.add('august');

    return activeGroups.size ? [...activeGroups] : ['general'];
}

function getSceneKey(phase, animData) {
    const activeGroups = getActiveSceneGroups(phase, animData);
    if (activeGroups.length !== 1) return 'general';
    return activeGroups[0];
}

// ── Cached DOM references (her fazda querySelectorAll yapmamak için) ──
let cachedLocationGroups = null;
let cachedAnnotationGroups = null;
let cachedMinefields = null;
let cachedForts = null;
let cachedFortifications = null;
let lastSceneKey = null;
let lastFocusKey = null;

export function updateMapSceneState(phase, animData, cameraTarget = null) {
    const svg = document.getElementById('battleMap');
    const ctr = document.querySelector('.map-container');
    if (!svg || !ctr) return;

    const sceneKey = getSceneKey(phase, animData);
    const activeSceneGroups = new Set(getActiveSceneGroups(phase, animData).filter((group) => group !== 'general'));
    const preferredFocusIds = Array.isArray(cameraTarget?.locationIds) && cameraTarget.locationIds.length
        ? cameraTarget.locationIds
        : (Array.isArray(phase?.mapFocus?.locationIds) ? phase.mapFocus.locationIds.slice(0, 5) : []);
    const focusLocationIds = new Set(preferredFocusIds.filter(Boolean));
    const focusKey = `${sceneKey}:${cameraTarget?.x || 0}:${cameraTarget?.y || 0}:${cameraTarget?.w || 0}:${[...focusLocationIds].join('|')}`;

    // Sahne ve odak değişmediyse DOM işlemi yapma
    if (sceneKey === lastSceneKey && focusKey === lastFocusKey) return;
    lastSceneKey = sceneKey;
    lastFocusKey = focusKey;

    svg.dataset.scene = sceneKey;
    ctr.dataset.scene = sceneKey;
    ctr.dataset.cameraZoom = cameraTarget && cameraTarget.w <= 1200 ? 'close' : 'wide';
    if (cameraTarget?.reason) ctr.dataset.cameraReason = cameraTarget.reason;

    const visibleByScene = {
        naval: new Set(['bogaz', 'canakkale', 'kilitbahir', 'kumkale', 'seddulbahir', 'gelibolu']),
        anzac: new Set(['ariburnu', 'kabatepe', 'conkbayiri', 'bigali', 'kirectepe', 'anafartalar', 'kilitbahir']),
        helles: new Set(['seddulbahir', 'kirte', 'alcitepe', 'morto-koyu', 'kumkale', 'kilitbahir']),
        august: new Set(['suvla', 'tuzgolu', 'scimitar-hill', 'hill-60', 'kirectepe', 'anafartalar', 'conkbayiri', 'ariburnu', 'bigali']),
        general: null
    };
    const visible = visibleByScene[sceneKey] || null;

    // Cache DOM queries — sadece ilk seferde yap
    if (!cachedLocationGroups) cachedLocationGroups = [...svg.querySelectorAll('.location-group')];
    if (!cachedAnnotationGroups) cachedAnnotationGroups = [...svg.querySelectorAll('.scene-annotation-group')];
    if (!cachedMinefields) cachedMinefields = document.getElementById('minefields');
    if (!cachedForts) cachedForts = document.getElementById('forts');
    if (!cachedFortifications) cachedFortifications = document.getElementById('layer-fortifications');

    cachedLocationGroups.forEach((el) => {
        const locationId = el.dataset.locationId;
        const inScene = !visible || visible.has(locationId);
        const inFocus = focusLocationIds.has(locationId);
        el.classList.toggle('is-scene-hidden', !inScene && !inFocus);
        el.classList.toggle('is-focus-location', inFocus);
        el.classList.toggle('is-label-suppressed', focusLocationIds.size > 0 && !inFocus);
    });

    cachedAnnotationGroups.forEach((el) => {
        const isActive = activeSceneGroups.size === 0
            ? el.dataset.sceneGroup === sceneKey
            : activeSceneGroups.has(el.dataset.sceneGroup);
        el.classList.toggle('is-scene-hidden', !isActive);
    });

    if (cachedMinefields) cachedMinefields.classList.toggle('is-scene-dimmed', sceneKey !== 'naval');
    if (cachedForts) cachedForts.classList.toggle('is-scene-dimmed', sceneKey === 'anzac');
    if (cachedFortifications) cachedFortifications.classList.toggle('is-scene-dimmed', sceneKey === 'naval');
}

/** Mayın hattı SVG helper */
function mineLine(x1, y1, x2, y2, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        s += `<circle cx="${mx}" cy="${my}" r="1.8" fill="none" stroke="#6a5535" stroke-width=".6" opacity=".6"/>
              <circle cx="${mx}" cy="${my}" r=".6" fill="#6a5535" opacity=".5"/>`;
    }
    return s;
}

/** Kıyı bataryası SVG helper */
function fort(x, y, name) {
    return `<g>
  <rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="none" stroke="#7a6040" stroke-width=".8" opacity=".7" transform="rotate(45,${x},${y})"/>
  <circle cx="${x}" cy="${y}" r="1.5" fill="#7a6040" opacity=".6"/>
  <text x="${x + 6}" y="${y + 2}" fill="#8a7555" font-family="var(--mono)" font-size="4.5" opacity=".7" font-weight="600"
    paint-order="stroke" stroke="rgba(30,28,24,.7)" stroke-width="1.2">${name}</text></g>`;
}

const RASTER_MAP_URL = 'assets/gallipoli-map.png';

function escapeSvgText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resetMapSceneCache() {
    cachedLocationGroups = null;
    cachedAnnotationGroups = null;
    cachedMinefields = null;
    cachedForts = null;
    cachedFortifications = null;
    lastSceneKey = null;
    lastFocusKey = null;
}

function renderEditableLocation(location) {
    const primary = ['canakkale', 'eceabat', 'conkbayiri', 'anafartalar'].includes(location.id);
    const secondary = ['ariburnu', 'seddulbahir', 'kabatepe', 'kirte', 'kirectepe', 'kumkale', 'bigali', 'suvla', 'kilitbahir'].includes(location.id);
    const fontSize = primary ? 24 : secondary ? 18 : 15;
    const fontWeight = primary ? 800 : secondary ? 700 : 600;
    const dotR = primary ? 9 : secondary ? 7 : 5;
    const opacity = primary ? .92 : secondary ? .78 : .64;
    const fillColor = primary ? '#efe3bc' : secondary ? '#d8c49a' : '#bca77f';
    const strokeW = primary ? 5.4 : secondary ? 4.2 : 3.2;

    return `<g class="location-group map-overlay-item" data-location-id="${escapeSvgText(location.id)}" data-label-priority="${primary ? 'primary' : secondary ? 'secondary' : 'minor'}" data-overlay-key="location:${escapeSvgText(location.id)}">
      <circle cx="${location.x}" cy="${location.y}" r="${dotR}" class="location-dot" fill="#d8c49a" stroke="#2b261e" stroke-width="2" opacity="${opacity}"/>
      <text x="${location.x + dotR + 8}" y="${location.y + dotR}" class="location-label" fill="${fillColor}" font-size="${fontSize}" font-weight="${fontWeight}" opacity="${opacity}"
        paint-order="stroke" stroke="rgba(18,15,12,.86)" stroke-width="${strokeW}" font-family="var(--mono)">${escapeSvgText(location.name)}</text>
    </g>`;
}

function renderEditableFort(item) {
    const id = escapeSvgText(item.id);
    const name = escapeSvgText(item.name);
    const x = item.x;
    const y = item.y;

    return `<g class="fort-group map-overlay-item" data-fort-id="${id}" data-overlay-key="fort:${id}">
      <rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="rgba(36, 25, 18, .72)" stroke="#f0c8a8" stroke-width="2.2" opacity=".88" transform="rotate(45,${x},${y})"/>
      <circle cx="${x}" cy="${y}" r="4.2" fill="#f0c8a8" opacity=".9"/>
      <text x="${x + 18}" y="${y + 7}" fill="#f3d6bb" font-family="var(--mono)" font-size="14" opacity=".88" font-weight="700"
        paint-order="stroke" stroke="rgba(22,16,12,.86)" stroke-width="4">${name}</text>
    </g>`;
}

function renderSceneAnnotations() {
    const routePath = (points = []) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const renderGuidePath = (points, className) => {
        if (!Array.isArray(points) || points.length < 2) return '';
        return `<path class="${className}" d="${routePath(points)}"/>`;
    };
    const renderGuidePoint = (point) => {
        const labelDx = point.style === 'flagship' ? 18 : 14;
        const labelDy = point.style === 'loss' ? -12 : -10;
        return `<g class="scene-guide-point scene-guide-point-${point.style || 'default'}" data-guide-id="${escapeSvgText(point.id)}">
            <circle cx="${point.x}" cy="${point.y}" r="${point.style === 'flagship' ? 8 : 6}" class="scene-guide-ring"/>
            <circle cx="${point.x}" cy="${point.y}" r="${point.style === 'loss' ? 2.8 : 2.2}" class="scene-guide-core"/>
            <text x="${point.x + labelDx}" y="${point.y + labelDy}" class="scene-guide-caption">${escapeSvgText(point.label)}</text>
        </g>`;
    };

    return ['naval', 'anzac', 'helles', 'august'].map((sceneGroup) => {
        const labels = MAP_SCENE_LABELS
            .filter((label) => label.sceneGroup === sceneGroup)
            .map((label) => `<text x="${label.x}" y="${label.y}" class="scene-label${label.subLabel ? ' scene-label-sub' : ''} map-overlay-item"
              data-scene-label-id="${escapeSvgText(label.id)}" data-overlay-key="scene-label:${escapeSvgText(label.id)}"
              fill="${label.fill || '#d8c49a'}" font-size="${label.fontSize || 18}" opacity="${label.opacity ?? .55}"
              paint-order="stroke" stroke="rgba(18,15,12,.78)" stroke-width="${label.strokeWidth || 2}"
              font-family="var(--mono)" font-weight="${label.subLabel ? 600 : 800}">${escapeSvgText(label.text)}</text>`)
            .join('');
        const guides = MAP_SCENE_GUIDES[sceneGroup] || {};
        const extras = sceneGroup === 'naval'
            ? [
                renderGuidePath(guides.mineLine, 'scene-guide-route scene-guide-route-mine'),
                renderGuidePath(guides.strikeChain, 'scene-guide-route scene-guide-route-strike'),
                ...(guides.strikePoints || []).map(renderGuidePoint)
            ].join('')
            : sceneGroup === 'helles'
                ? [
                    renderGuidePath(guides.xToVAxis, 'scene-guide-route scene-guide-route-landing'),
                    renderGuidePath(guides.wToVAxis, 'scene-guide-route scene-guide-route-landing'),
                    renderGuidePath(guides.inlandAxis, 'scene-guide-route scene-guide-route-inland'),
                    guides.riverClyde
                        ? `<g class="scene-guide-point scene-guide-point-river-clyde" data-guide-id="river-clyde">
                            <rect x="${guides.riverClyde.x - 7}" y="${guides.riverClyde.y - 7}" width="14" height="14" rx="2.5" class="scene-guide-core-box" transform="rotate(45,${guides.riverClyde.x},${guides.riverClyde.y})"/>
                            <text x="${guides.riverClyde.x + 18}" y="${guides.riverClyde.y - 8}" class="scene-guide-caption">R. Clyde</text>
                        </g>`
                        : ''
                ].join('')
                : sceneGroup === 'august'
                    ? [
                        renderGuidePath(guides.suvlaAxis, 'scene-guide-route scene-guide-route-landing'),
                        renderGuidePath(guides.conkbayiriAxis, 'scene-guide-route scene-guide-route-inland'),
                        renderGuidePath(guides.finalAssaultAxis, 'scene-guide-route scene-guide-route-strike'),
                        ...(guides.keyPoints || []).map(renderGuidePoint)
                    ].join('')
                : '';

        return `<g class="scene-annotation-group" data-scene-group="${sceneGroup}">${labels}${extras}</g>`;
    }).join('');
}

function getOrnament(id) {
    return MAP_ORNAMENTS.find((item) => item.id === id) || { id, name: id, x: 0, y: MAP_CROP_TOP, kind: 'text' };
}

function renderCompass() {
    const item = getOrnament('compass');
    const x = item.x;
    const y = item.y;

    return `<g class="map-overlay-item map-ornament map-ornament-compass" data-ornament-id="${item.id}" data-overlay-key="ornament:${item.id}" opacity=".72">
      <circle cx="${x}" cy="${y}" r="56" fill="rgba(18,15,12,.5)" stroke="#d8c49a" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="38" fill="none" stroke="#d8c49a" stroke-width="1"/>
      <line x1="${x}" y1="${y - 48}" x2="${x}" y2="${y + 48}" stroke="#d8c49a" stroke-width="1"/>
      <line x1="${x - 48}" y1="${y}" x2="${x + 48}" y2="${y}" stroke="#d8c49a" stroke-width="1"/>
      <polygon points="${x},${y - 48} ${x - 8},${y - 14} ${x + 8},${y - 14}" fill="#d8735d"/>
      <polygon points="${x},${y + 48} ${x - 8},${y + 14} ${x + 8},${y + 14}" fill="#d8c49a" opacity=".45"/>
      <circle cx="${x}" cy="${y}" r="4" fill="#f0dfb2"/>
      <text x="${x}" y="${y - 64}" text-anchor="middle" fill="#f0dfb2" font-family="var(--mono)" font-size="18" font-weight="800">N</text>
      <text x="${x + 64}" y="${y + 6}" text-anchor="middle" fill="#d8c49a" font-family="var(--mono)" font-size="13">E</text>
      <text x="${x}" y="${y + 76}" text-anchor="middle" fill="#d8c49a" font-family="var(--mono)" font-size="13">S</text>
      <text x="${x - 64}" y="${y + 6}" text-anchor="middle" fill="#d8c49a" font-family="var(--mono)" font-size="13">W</text>
    </g>`;
}

function renderScale() {
    const item = getOrnament('scale');
    const x = item.x;
    const y = item.y;

    return `<g class="map-overlay-item map-ornament map-ornament-scale" data-ornament-id="${item.id}" data-overlay-key="ornament:${item.id}" opacity=".64">
      <line x1="${x}" y1="${y}" x2="${x + 110}" y2="${y}" stroke="#f0dfb2" stroke-width="4"/>
      <line x1="${x + 110}" y1="${y}" x2="${x + 220}" y2="${y}" stroke="#d8c49a" stroke-width="4"/>
      <line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y + 10}" stroke="#f0dfb2" stroke-width="3"/>
      <line x1="${x + 110}" y1="${y - 10}" x2="${x + 110}" y2="${y + 10}" stroke="#d8c49a" stroke-width="3"/>
      <line x1="${x + 220}" y1="${y - 10}" x2="${x + 220}" y2="${y + 10}" stroke="#d8c49a" stroke-width="3"/>
      <text x="${x + 55}" y="${y - 18}" text-anchor="middle" fill="#f0dfb2" font-family="var(--mono)" font-size="15">5 km</text>
      <text x="${x + 165}" y="${y - 18}" text-anchor="middle" fill="#d8c49a" font-family="var(--mono)" font-size="15">10 km</text>
    </g>`;
}

function renderFooterOrnaments() {
    const title = getOrnament('footer-title');
    const credit = getOrnament('footer-credit');

    return `<text class="map-overlay-item map-ornament" data-ornament-id="${title.id}" data-overlay-key="ornament:${title.id}"
        x="${title.x}" y="${title.y}" fill="#d8c49a" font-family="var(--mono)" font-size="18" opacity=".55"
        paint-order="stroke" stroke="rgba(18,15,12,.55)" stroke-width="3">Canakkale 1915</text>
      <text class="map-overlay-item map-ornament" data-ornament-id="${credit.id}" data-overlay-key="ornament:${credit.id}"
        x="${credit.x}" y="${credit.y}" text-anchor="end" fill="#d8c49a" font-family="var(--mono)" font-size="12" opacity=".45">Icons by Icons8</text>`;
}

export function renderTacticalRoutes(isoDate) {
    if (!isoDate) return '';
    const activeRoutes = HISTORICAL_ROUTES.filter((route) => {
        return isoDate >= route.start && isoDate <= route.end;
    });

    return activeRoutes.map((route) => {
        const pathD = route.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        // Determine color based on faction of unit
        const isOttoman = route.unitIds.some((id) => {
            const unit = BATTLE_DATA.units.find((u) => u.id === id);
            return unit && (unit.side === 'ottoman' || unit.faction === 'ottoman');
        });
        const color = isOttoman ? '#c4645a' : '#7a9ab0';
        const marker = isOttoman ? 'url(#arrow-ottoman)' : 'url(#arrow-allied)';

        // Find unit names for labeling the route
        const names = route.unitIds.map((id) => {
            const u = BATTLE_DATA.units.find((unit) => unit.id === id);
            return u ? u.name : id;
        }).join(' & ');

        // Midpoint of the route to place the label
        const midIdx = Math.floor(route.points.length / 2);
        const midPoint = route.points[midIdx] || { x: 0, y: 0 };

        return `<g class="tactical-route-group" data-route-id="${escapeSvgText(route.id)}">
            <!-- Glow background line -->
            <path d="${pathD}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" opacity="0.12" />
            <!-- Main thick animated tactical arrow -->
            <path class="tactical-arrow" d="${pathD}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" marker-end="${marker}" />
            <!-- Text label placed at midpoint -->
            <text x="${midPoint.x}" y="${midPoint.y - 12}" class="tactical-route-label" fill="${color}" font-size="15" font-weight="700" font-family="var(--mono)" text-anchor="middle"
              paint-order="stroke" stroke="rgba(18,15,12,.88)" stroke-width="3.5" opacity="0.82">
                ${escapeSvgText(names)}
            </text>
        </g>`;
    }).join('');
}

function isMobileMap() { return _isMobileCheck(); }

/** Ana SVG harita oluştur ve DOM'a ekle */
export function renderMap(currentPhaseIndex, currentPositions, narrationHandlers = {}) {
    const ctr = document.querySelector('.map-container');
    const phase = BATTLE_DATA.phases[currentPhaseIndex];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    {
    const locations = BATTLE_DATA.locations.filter((location) => !location.hiddenOnMap);

    resetMapSceneCache();
    svg.setAttribute('viewBox', `0 ${MAP_CROP_TOP} ${MAP_WIDTH} ${MAP_VIEW_HEIGHT}`);
    svg.setAttribute('id', 'battleMap');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Gelibolu Revival yerleştirme haritası');
    svg.innerHTML = `
  <defs>
    <clipPath id="mapClip"><rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}"/></clipPath>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
    <linearGradient id="flagShadeG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#000" stop-opacity=".05"/>
      <stop offset="100%" stop-color="#1a0e08" stop-opacity=".32"/>
    </linearGradient>
    <linearGradient id="editorVignetteG" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity=".24"/>
      <stop offset="18%" stop-color="#000" stop-opacity="0"/>
      <stop offset="82%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>
    <radialGradient id="editorVignetteR" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".18"/>
    </radialGradient>
    <marker id="arrow-allied" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#7a9ab0"/>
    </marker>
    <marker id="arrow-ottoman" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c4645a"/>
    </marker>
  </defs>

  <g id="layer-terrain" clip-path="url(#mapClip)">
    <image href="${RASTER_MAP_URL}" x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" preserveAspectRatio="none"/>
    <rect x="0" y="${MAP_CROP_TOP}" width="${MAP_WIDTH}" height="${MAP_VIEW_HEIGHT}" fill="url(#editorVignetteG)" pointer-events="none"/>
    <rect x="0" y="${MAP_CROP_TOP}" width="${MAP_WIDTH}" height="${MAP_VIEW_HEIGHT}" fill="url(#editorVignetteR)" pointer-events="none"/>
  </g>

  <g id="layer-fortifications"></g>

  <g id="layer-sea">
    <g id="minefields" opacity=".7"></g>
    <g id="forts" opacity=".92">
      ${MAP_FORTS.map(renderEditableFort).join('')}
    </g>
  </g>

  <g id="layer-zones"></g>
  <g id="layer-routes">${renderTacticalRoutes(phase.isoStart || '')}</g>

  <g id="layer-labels">
    <g id="locations">
      ${locations.map(renderEditableLocation).join('')}
    </g>
    ${renderSceneAnnotations()}
  </g>

  <g id="unitTokens" class="units-layer">${renderTokens(phase.id, currentPositions, currentPositions, currentPhaseIndex, currentPhaseIndex, phase.isoStart || '')}</g>

  <g id="layer-combat-fx">
    <g id="battleEffects" class="battle-effects"></g>
  </g>

  <g id="layer-ornaments">
    ${renderCompass()}
    ${renderScale()}
    ${renderFooterOrnaments()}
  </g>
  `;

    ctr.innerHTML = '';
    ctr.appendChild(svg);

    const dateChip = document.createElement('div');
    dateChip.className = 'map-date-chip';
    dateChip.id = 'mapDateChip';
    dateChip.innerHTML = `<span class="map-date-day" id="mapDateDay">—</span><span class="map-date-month" id="mapDateMonth">Tarih</span><span class="map-date-year" id="mapDateYear"></span>`;
    ctr.appendChild(dateChip);

    attachNarrationElements(ctr, phase, narrationHandlers);
    updateMapDateIndicator(phase.date);
    renderBattleEffects(currentPhaseIndex);
    return;
    }

    svg.setAttribute('viewBox', '0 0 720 560');
    svg.setAttribute('id', 'battleMap');
    svg.innerHTML = `
  <defs>
    <!-- ═══ GRADIENTS — desatüre, askeri kartografi ═══ -->
    <linearGradient id="seaG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a3540"/>
      <stop offset="40%" stop-color="#303d48"/>
      <stop offset="70%" stop-color="#28353e"/>
      <stop offset="100%" stop-color="#222d36"/>
    </linearGradient>

    <radialGradient id="seaDepthG" cx="55%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#354550" stop-opacity=".3"/>
      <stop offset="100%" stop-color="#1a2228" stop-opacity=".2"/>
    </radialGradient>

    <linearGradient id="landG" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#6a6852"/>
      <stop offset="25%" stop-color="#5e5c48"/>
      <stop offset="50%" stop-color="#555340"/>
      <stop offset="75%" stop-color="#4a4838"/>
      <stop offset="100%" stop-color="#3e3c30"/>
    </linearGradient>

    <linearGradient id="landG2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#585648"/>
      <stop offset="100%" stop-color="#3a3830"/>
    </linearGradient>

    <linearGradient id="ridgeHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7a7862" stop-opacity=".15"/>
      <stop offset="100%" stop-color="#4a4838" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="hillShade" cx="35%" cy="30%">
      <stop offset="0%" stop-color="#8a886e" stop-opacity=".12"/>
      <stop offset="100%" stop-color="#4a4838" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="vignetteG" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity=".2"/>
      <stop offset="8%" stop-color="#000" stop-opacity="0"/>
      <stop offset="92%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>

    <radialGradient id="vignetteR" cx="50%" cy="50%" r="62%">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".2"/>
    </radialGradient>

    <!-- ═══ FILTERS — mobilde hafif, masaüstünde tam ═══ -->
    ${isMobileMap() ? `
    <!-- Mobilde: ağır filter'ları no-op yap (GPU tasarrufu) -->
    <filter id="terrainRelief"><feFlood flood-opacity="0" result="noop"/><feMerge><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="paperTex"><feFlood flood-opacity="0" result="noop"/><feMerge><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="coastSoft"><feFlood flood-opacity="0" result="noop"/><feMerge><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-opacity="0" result="noop"/><feMerge><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ` : `
    <filter id="terrainRelief" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="5" seed="12" result="noise"/>
      <feDiffuseLighting in="noise" lighting-color="#f0ead0" surfaceScale="1.2" diffuseConstant=".6" result="light">
        <feDistantLight azimuth="315" elevation="40"/>
      </feDiffuseLighting>
      <feComposite in="light" in2="SourceGraphic" operator="in" result="litTerrain"/>
      <feBlend in="SourceGraphic" in2="litTerrain" mode="soft-light"/>
    </filter>

    <filter id="paperTex" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="4" seed="3" result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="soft-light" result="textured"/>
      <feComposite in="textured" in2="SourceGraphic" operator="in"/>
    </filter>

    <filter id="coastSoft">
      <feGaussianBlur stdDeviation=".8"/>
    </filter>

    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
    `}

    <!-- ═══ PATTERNS — doğal harita dokusu ═══ -->
    <pattern id="wave" width="60" height="16" patternUnits="userSpaceOnUse">
      <path d="M0 8 Q15 4 30 8 Q45 12 60 8" fill="none" stroke="#3a4a54" stroke-width=".35" opacity=".4"/>
    </pattern>

    <pattern id="hachure" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#5a5840" stroke-width=".5" opacity=".2"/>
    </pattern>

    <pattern id="contourFill" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
      <line x1="0" y1="0" x2="0" y2="12" stroke="#6a6850" stroke-width=".5" opacity=".25"/>
    </pattern>

    <clipPath id="mapClip"><rect width="720" height="560" rx="4"/></clipPath>
  </defs>

  <!-- ═══ LAYER: TERRAIN ═══ -->
  <g id="layer-terrain" clip-path="url(#mapClip)">

    <!-- DENİZ — desatüre gri-mavi, sessiz -->
    <rect width="720" height="560" fill="url(#seaG)"/>
    <rect width="720" height="560" fill="url(#seaDepthG)"/>
    <rect width="720" height="560" fill="url(#wave)" opacity=".35"/>

    <!-- Hafif kağıt dokusu (tüm harita üstü) -->
    <rect width="720" height="560" fill="url(#contourFill)" opacity=".15"/>

    <!-- Deniz derinlik konturu — Boğaz kanalı -->
    <g class="depth-contours" opacity=".15">
      <path d="M466 310 C470 335 472 360 470 385 C468 405 464 425 460 445"
        fill="none" stroke="#1a2830" stroke-width="1" stroke-dasharray="8,6"/>
      <path d="M40 360 C90 370 150 380 220 395 C280 410 320 430 360 460"
        fill="none" stroke="#1a2830" stroke-width=".7" stroke-dasharray="12,8"/>
    </g>

    <!-- ═══ TRAKYA ═══ -->
    <path d="M 0 0 L 530 0 L 525 18 C 490 22,440 18,400 15 C 350 12,310 14,280 20
      C 245 28,210 30,175 40 C 130 55,80 65,35 72 L 0 82 Z"
      fill="url(#landG2)" stroke="#4a4838" stroke-width=".8" opacity=".75" filter="url(#terrainRelief)"/>

    <!-- TRAKYA etiketi — primary tier -->
    <text x="30" y="32" class="label-primary" fill="#a09880" font-size="13" letter-spacing="5"
      paint-order="stroke" stroke="rgba(30,28,24,.5)" stroke-width="1.5">TRAKYA</text>

    <!-- ═══ GÖKÇEADA ═══ -->
    <path d="M 50 285 C 60 272,85 268,105 272 C 125 276,135 285,132 296 C 128 306,108 312,88 310 C 65 306,45 298,50 285 Z"
      fill="url(#landG2)" stroke="#4a4838" stroke-width=".7" opacity=".6" filter="url(#terrainRelief)"/>
    <text x="70" y="295" class="label-secondary" fill="#8a8068">Gökçeada</text>

    <!-- ═══ GELİBOLU YARIMADASI — doğal kontur ═══ -->
    <!-- Kıyı gölgesi (soft edge — deniz/kara geçişi) -->
    <path d="${PENINSULA_PATH}" fill="#283038" stroke="none" opacity=".25" filter="url(#coastSoft)" transform="translate(2,2)"/>

    <!-- Ana yarımada -->
    <path d="${PENINSULA_PATH}" fill="url(#landG)" stroke="#5a5848" stroke-width="1" opacity=".92" filter="url(#terrainRelief)"/>

    <!-- Hachure dokusu (yarımada üstü) -->
    <path d="${PENINSULA_PATH}" fill="url(#hachure)" opacity=".15" pointer-events="none"/>

    <!-- ═══ SUVLA KOYU ═══ -->
    <path d="M 246 110 C 250 116, 252 124, 248 132
      C 244 140, 238 142, 234 138 C 230 132, 233 124, 238 116
      C 242 110, 246 108, 246 110 Z"
      fill="url(#seaG)" stroke="#3a4550" stroke-width=".5" opacity=".8"/>

    <!-- ═══ ANZAC KOYU ═══ -->
    <path d="M 218 240 C 222 246, 226 252, 224 258
      C 222 264, 218 266, 214 262 C 210 256, 210 248, 214 242
      C 216 238, 218 238, 218 240 Z"
      fill="url(#seaG)" stroke="#3a4550" stroke-width=".4" opacity=".8"/>

    <!-- ═══ TOPOGRAFİK KATMAN — hillshade ve sırt hatları ═══ -->

    <!-- Ana sırt hattı (Kocaçimen → Conkbayırı → Alçıtepe) — belirgin -->
    <path d="M 470 45 C 450 72 440 105 435 135 C 430 165 425 195 420 225
      C 418 248 415 270 410 295 C 404 320 395 345 385 370
      C 372 400 355 425 340 450 C 325 470 315 485 305 498"
      fill="none" stroke="#7a7860" stroke-width="1" opacity=".3" stroke-dasharray="6,3"/>

    <!-- İkincil sırtlar — silik -->
    <path d="M 445 80 C 438 115 432 148 428 180 C 424 210 420 240 415 268"
      fill="none" stroke="#5a5842" stroke-width=".5" opacity=".15" stroke-dasharray="3,4"/>
    <path d="M 250 120 C 246 155 240 190 236 225 C 232 260 236 295 245 330 C 255 365 268 400 278 435"
      fill="none" stroke="#5a5842" stroke-width=".5" opacity=".15" stroke-dasharray="3,4"/>

    <!-- Sarıbayır sırt bandı (yükseklik ısı) -->
    <path d="M310 220 C330 205 355 180 375 162 C395 145 415 125 430 105"
      fill="none" stroke="#8a886e" stroke-width="3" opacity=".06"/>

    <!-- ═══ TEPE NOKTALARI — yükseklik hiyerarşisi ═══ -->

    <!-- Conkbayırı (261m) — önemli, belirgin -->
    <g class="summit-marker">
      <circle cx="320" cy="223" r="2.5" fill="none" stroke="#8a886e" stroke-width=".8" opacity=".5"/>
      <line x1="320" y1="220" x2="320" y2="226" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <line x1="317" y1="223" x2="323" y2="223" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <text x="326" y="226" fill="#a09880" font-family="var(--mono)" font-size="5.5" font-weight="600" opacity=".7"
        paint-order="stroke" stroke="rgba(30,28,24,.6)" stroke-width="1.2">Conkbayırı 261m</text>
    </g>

    <!-- Kocaçimen (305m) — en yüksek, belirgin -->
    <g class="summit-marker">
      <circle cx="431" cy="100" r="2.5" fill="none" stroke="#8a886e" stroke-width=".8" opacity=".5"/>
      <line x1="431" y1="97" x2="431" y2="103" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <line x1="428" y1="100" x2="434" y2="100" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <text x="437" y="103" fill="#a09880" font-family="var(--mono)" font-size="5.5" font-weight="600" opacity=".7"
        paint-order="stroke" stroke="rgba(30,28,24,.6)" stroke-width="1.2">Kocaçimen 305m</text>
    </g>

    <!-- Alçıtepe / Achi Baba (218m) — önemli -->
    <g class="summit-marker">
      <circle cx="305" cy="406" r="2.5" fill="none" stroke="#8a886e" stroke-width=".8" opacity=".5"/>
      <line x1="305" y1="403" x2="305" y2="409" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <line x1="302" y1="406" x2="308" y2="406" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <text x="311" y="409" fill="#a09880" font-family="var(--mono)" font-size="5" font-weight="600" opacity=".65"
        paint-order="stroke" stroke="rgba(30,28,24,.6)" stroke-width="1.2">Alçıtepe 218m</text>
    </g>

    <!-- Battleship Hill (220m) — mikro tier -->
    <g class="summit-marker" opacity=".45">
      <circle cx="295" cy="210" r="1.5" fill="none" stroke="#7a7860" stroke-width=".5"/>
      <text x="300" y="213" fill="#8a8068" font-family="var(--mono)" font-size="3.5">220m</text>
    </g>

    <!-- Baby 700 — mikro -->
    <g class="summit-marker" opacity=".35">
      <circle cx="268" cy="242" r="1.2" fill="none" stroke="#7a7860" stroke-width=".4"/>
      <text x="273" y="245" fill="#7a7060" font-family="var(--mono)" font-size="3">210m</text>
    </g>

    <!-- Hill 60 — mikro -->
    <g class="summit-marker" opacity=".35">
      <circle cx="258" cy="158" r="1.2" fill="none" stroke="#7a7860" stroke-width=".4"/>
      <text x="263" y="161" fill="#7a7060" font-family="var(--mono)" font-size="3">60m</text>
    </g>

    <!-- Chocolate Hill — mikro -->
    <g class="summit-marker" opacity=".35">
      <circle cx="272" cy="148" r="1.2" fill="none" stroke="#7a7860" stroke-width=".4"/>
      <text x="277" y="151" fill="#7a7060" font-family="var(--mono)" font-size="3">48m</text>
    </g>

    <!-- Kilitbahir Platosu -->
    <ellipse cx="380" cy="345" rx="32" ry="25" fill="url(#hillShade)" stroke="#5a5840"
      stroke-width=".5" opacity=".25" stroke-dasharray="3,2"/>
    <text x="358" y="349" fill="#7a7060" font-family="var(--mono)" font-size="4" opacity=".45" font-style="italic">Kilitbahir Plt.</text>

    <!-- Dere/vadi göstergeleri -->
    <g class="ravines" opacity=".15">
      <path d="M232 228 C238 232 244 238 252 246" fill="none" stroke="#3a3828" stroke-width=".4" stroke-dasharray="1.5,2"/>
      <text x="234" y="226" fill="#5a5842" font-family="var(--mono)" font-size="2.8" font-style="italic" opacity=".6">Shrapnel D.</text>
      <path d="M242 238 C248 244 254 250 262 258" fill="none" stroke="#3a3828" stroke-width=".4" stroke-dasharray="1.5,2"/>
      <text x="250" y="236" fill="#5a5842" font-family="var(--mono)" font-size="2.8" font-style="italic" opacity=".5">Monash V.</text>
    </g>

    <!-- Falezler (batı kıyısı) -->
    <g class="cliff-marks" opacity=".12">
      <line x1="220" y1="310" x2="215" y2="308" stroke="#4a4838" stroke-width=".5"/>
      <line x1="222" y1="330" x2="217" y2="327" stroke="#4a4838" stroke-width=".5"/>
      <line x1="226" y1="350" x2="221" y2="347" stroke="#4a4838" stroke-width=".5"/>
      <line x1="230" y1="370" x2="225" y2="367" stroke="#4a4838" stroke-width=".5"/>
      <line x1="234" y1="390" x2="229" y2="387" stroke="#4a4838" stroke-width=".5"/>
      <line x1="240" y1="410" x2="235" y2="407" stroke="#4a4838" stroke-width=".5"/>
      <line x1="248" y1="430" x2="243" y2="427" stroke="#4a4838" stroke-width=".5"/>
      <line x1="256" y1="450" x2="251" y2="447" stroke="#4a4838" stroke-width=".5"/>
    </g>

    <!-- Tuz Gölü -->
    <ellipse cx="252" cy="118" rx="10" ry="6" fill="#303d48" stroke="#3a4550" stroke-width=".4" opacity=".4"/>
    <text x="246" y="122" fill="#4a5560" font-family="var(--mono)" font-size="3" opacity=".4" font-style="italic">Tuz Gölü</text>

    <!-- Suvla Ovası -->
    <g class="suvla-detail" opacity=".2">
      <ellipse cx="255" cy="125" rx="16" ry="9" fill="#3a3828" stroke="#4a4838" stroke-width=".3" stroke-dasharray="2,2"/>
      <text x="243" y="132" fill="#5a5842" font-family="var(--mono)" font-size="2.8" font-style="italic">Suvla Ovası</text>
    </g>

    <!-- ═══ ASYA YAKASI ═══ -->
    <path d="${ASIA_PATH}" fill="#283038" stroke="none" opacity=".2" filter="url(#coastSoft)" transform="translate(-2,2)"/>
    <path d="${ASIA_PATH}" fill="url(#landG2)" stroke="#4a4838" stroke-width=".8" opacity=".7" filter="url(#terrainRelief)"/>

    <!-- ═══ SU ETİKETLERİ — primary tier, desatüre ═══ -->
    <text x="460" y="270" fill="#506878" font-family="var(--mono)" font-size="8" font-weight="600"
      opacity=".4" transform="rotate(-72,460,270)" letter-spacing="3"
      paint-order="stroke" stroke="rgba(25,30,35,.4)" stroke-width="1">CANAKKALE BOGAZI</text>

    <text x="60" y="420" fill="#3a5060" font-family="var(--mono)" font-size="10" font-weight="600"
      opacity=".3" letter-spacing="5"
      paint-order="stroke" stroke="rgba(25,30,35,.3)" stroke-width="1">EGE DENiZi</text>

    <text x="530" y="100" fill="#3a5060" font-family="var(--mono)" font-size="8" font-weight="600"
      opacity=".25" letter-spacing="3"
      paint-order="stroke" stroke="rgba(25,30,35,.3)" stroke-width="1">MARMARA DENiZi</text>

    <text x="155" y="115" fill="#3a5060" font-family="var(--mono)" font-size="7" font-weight="600"
      opacity=".3" letter-spacing="2" transform="rotate(-12,155,115)"
      paint-order="stroke" stroke="rgba(25,30,35,.3)" stroke-width="1">SAROS KORFEZi</text>

    <!-- ═══ COĞRAFİ İSİMLER — hiyerarşik ═══ -->

    <!-- Mikro tier: burunlar, koylar, küçük detaylar -->
    <g class="coastal-names" opacity=".45">
      <text x="198" y="260" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Arı Burnu</text>
      <text x="270" y="500" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Tekke Burnu</text>
      <text x="345" y="490" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Helles Br.</text>
      <text x="240" y="140" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Nibrunesi Pt.</text>
      <text x="350" y="470" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Morto Koyu</text>
      <text x="500" y="240" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Kepez Br.</text>
      <text x="450" y="428" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Erenköy</text>
      <text x="208" y="320" fill="#6a6852" font-family="var(--mono)" font-size="3.5" font-style="italic">Gaba Tepe</text>
      <text x="228" y="96" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Suvla Pt.</text>
    </g>

    <!-- Orta tier: Asya yakası yerleşimler -->
    <g class="asia-detail" opacity=".45">
      <text x="520" y="440" fill="#7a7060" font-family="var(--mono)" font-size="4.5" font-style="italic"
        paint-order="stroke" stroke="rgba(30,28,24,.5)" stroke-width="1">Canakkale</text>
      <text x="480" y="510" fill="#6a6052" font-family="var(--mono)" font-size="3.5" font-style="italic">Yeniköy</text>
      <text x="450" y="478" fill="#6a6052" font-family="var(--mono)" font-size="3" font-style="italic">Intepe</text>
    </g>

  </g><!-- /layer-terrain -->

  <!-- ═══ LAYER: FORTIFICATIONS ═══ -->
  <g id="layer-fortifications"></g><!-- static trench decoration retired; dynamic frontlines carry combat readability -->

  <!-- ═══ LAYER: SEA ═══ -->
  <g id="layer-sea">
    <g id="minefields" opacity=".7">
      ${mineLine(460, 340, 492, 358, 7)}
      ${mineLine(455, 355, 488, 372, 6)}
      ${mineLine(450, 370, 484, 386, 8)}
      ${mineLine(458, 383, 490, 398, 5)}
      ${mineLine(453, 395, 486, 410, 6)}
    </g>

    <!-- Kıyı Bataryaları — askeri sembol (kare+nokta) -->
    <g id="forts" opacity=".85">
      ${fort(405, 340, 'Kilitbahir')} ${fort(400, 365, 'Mecidiye')} ${fort(395, 385, 'Hamidiye')}
      ${fort(415, 310, 'Namazgah')} ${fort(498, 345, 'Cimenlik')} ${fort(495, 365, 'Mesudiye')}
      ${fort(345, 468, 'Ertugrul')} ${fort(502, 385, 'Dardanos')}
      ${fort(388, 398, 'R.Mecidiye')} ${fort(508, 405, 'A.Hamidiye')}
    </g>
  </g><!-- /layer-sea -->

  <!-- ═══ LAYER: ZONES ═══ -->
  <g id="layer-zones"></g>

  <!-- ═══ LAYER: ROUTES ═══ -->
  <g id="layer-routes"></g>

  <!-- ═══ LAYER: LABELS — hiyerarşik ═══ -->
  <g id="layer-labels">

    <!-- Lokasyonlar (battle-data'dan) -->
    <g id="locations">
      ${BATTLE_DATA.locations.map(l => {
        // Hiyerarşi belirle
        const primary = ['gelibolu', 'canakkale', 'eceabat', 'conkbayiri', 'anafartalar'].includes(l.id);
        const secondary = ['ariburnu', 'seddulbahir', 'kabatepe', 'kirte', 'kirectepe', 'kumkale', 'bigali', 'suvla'].includes(l.id);
        const fontSize = primary ? '8' : secondary ? '6' : '5';
        const fontWeight = primary ? '700' : secondary ? '600' : '400';
        const dotR = primary ? '2.5' : secondary ? '2' : '1.5';
        const opacity = primary ? '.85' : secondary ? '.65' : '.5';
        const fillColor = primary ? '#c0b898' : secondary ? '#a09880' : '#8a8068';
        const strokeW = primary ? '2' : '1.5';
        return `<g class="location-group" data-location-id="${l.id}">
          <circle cx="${l.x}" cy="${l.y}" r="${dotR}" class="location-dot" fill="#a09880" stroke="#6a6852" stroke-width=".6" opacity="${opacity}"/>
          <text x="${l.x + 5}" y="${l.y + 3}" class="location-label" fill="${fillColor}" font-size="${fontSize}" font-weight="${fontWeight}" opacity="${opacity}"
            paint-order="stroke" stroke="rgba(30,28,24,.7)" stroke-width="${strokeW}">${l.name}</text></g>`;
      }).join('')}
    </g>

    <!-- Naval sahne anotasyonları -->
    <g class="scene-annotation-group" data-scene-group="naval">
      <path class="scene-focus-line" d="M470 335 L500 300 L530 250" />
      <text x="505" y="286" class="scene-label">ÇANAKKALE BOĞAZI</text>
      <text x="500" y="402" class="scene-label scene-label-sub">MAYIN HATTI</text>
    </g>

    <!-- ANZAC sahne anotasyonları -->
    <g class="scene-annotation-group" data-scene-group="anzac">
      <path class="scene-ridge" d="M248 112 C270 150 285 188 300 220 C315 250 330 282 345 320" />
      <path class="scene-ridge" d="M275 92 C298 132 314 172 328 212" />
      <text x="188" y="232" class="scene-label">ARIBURNU KOYU</text>
      <text x="334" y="176" class="scene-label">SARI BAYIR</text>
      <text x="386" y="326" class="scene-label scene-label-sub">KİLİTBAHİR SIRTLARI</text>

      <!-- Taktik mevziler -->
      <g class="tactical-posts" opacity=".6">
        <g transform="translate(252,232)"><rect x="-1.5" y="-1.5" width="3" height="3" fill="none" stroke="#8a8068" stroke-width=".5" transform="rotate(45)"/>
          <text x="4" y="2" fill="#8a8068" font-family="var(--mono)" font-size="3" opacity=".7">Cesarettepe</text></g>
        <g transform="translate(242,258)"><rect x="-1.5" y="-1.5" width="3" height="3" fill="none" stroke="#8a8068" stroke-width=".5" transform="rotate(45)"/>
          <text x="4" y="2" fill="#8a8068" font-family="var(--mono)" font-size="3" opacity=".7">Kanlısırt</text></g>
        <g transform="translate(248,244)"><rect x="-1.5" y="-1.5" width="3" height="3" fill="none" stroke="#8a8068" stroke-width=".5" transform="rotate(45)"/>
          <text x="4" y="2" fill="#8a8068" font-family="var(--mono)" font-size="3" opacity=".6">Bombasırtı</text></g>
      </g>
    </g>

    <!-- Helles sahne anotasyonları -->
    <g class="scene-annotation-group" data-scene-group="helles">
      <text x="338" y="506" class="scene-label">V PLAJI</text>
      <text x="298" y="520" class="scene-label">W PLAJI</text>
      <text x="250" y="486" class="scene-label scene-label-sub">X PLAJI</text>
      <text x="218" y="458" class="scene-label scene-label-sub">Y PLAJI</text>
      <text x="364" y="450" class="scene-label scene-label-sub">S PLAJI</text>
      <path class="scene-focus-line" d="M320 490 L302 448 L290 426" />
      <text x="246" y="418" class="scene-label scene-label-sub">KİRTE</text>
      <text x="278" y="392" class="scene-label scene-label-sub">ALÇITEPE</text>

      <!-- Çıkarma sahili göstergeleri — yarı saydam iniş şeridi -->
      <g class="beach-indicators" opacity=".3">
        <path d="M330 502 Q338 498 346 502" fill="none" stroke="#a09880" stroke-width="1" stroke-linecap="round"/>
        <path d="M290 512 Q298 508 306 512" fill="none" stroke="#a09880" stroke-width="1" stroke-linecap="round"/>
        <path d="M242 480 Q248 476 254 480" fill="none" stroke="#a09880" stroke-width=".8" stroke-linecap="round"/>
        <path d="M212 452 Q218 448 224 452" fill="none" stroke="#a09880" stroke-width=".8" stroke-linecap="round"/>
        <path d="M356 460 Q362 456 368 460" fill="none" stroke="#a09880" stroke-width=".8" stroke-linecap="round"/>
      </g>
    </g>
  </g><!-- /layer-labels -->

  <!-- ═══ LAYER: UNITS ═══ -->
  <g id="unitTokens" class="units-layer">${renderTokens(phase.id, currentPositions, currentPositions, currentPhaseIndex, currentPhaseIndex, phase.isoStart || '')}</g>

  <!-- ═══ LAYER: COMBAT FX ═══ -->
  <g id="layer-combat-fx">
    <g id="battleEffects" class="battle-effects"></g>
  </g>

  <!-- ═══ PUSULA — zarif, minimal ═══ -->
  <g transform="translate(672,50)" opacity=".35">
    <circle r="16" fill="rgba(30,28,24,.4)" stroke="#6a6040" stroke-width=".5"/>
    <circle r="11" fill="none" stroke="#6a6040" stroke-width=".25"/>
    <line x1="0" y1="-14" x2="0" y2="14" stroke="#6a6040" stroke-width=".3"/>
    <line x1="-14" y1="0" x2="14" y2="0" stroke="#6a6040" stroke-width=".3"/>
    <polygon points="0,-13 -2,-5 2,-5" fill="#8b3a3a" opacity=".8"/>
    <polygon points="0,13 -2,5 2,5" fill="#6a6040" opacity=".4"/>
    <circle r="1.5" fill="#8a7555"/>
    <text x="0" y="-17" text-anchor="middle" fill="#8a7555" font-family="var(--mono)" font-size="4.5" font-weight="600">N</text>
    <text x="18" y="1.5" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">E</text>
    <text x="0" y="21" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">S</text>
    <text x="-18" y="1.5" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">W</text>
  </g>

  <!-- ═══ ÖLÇEK — minimal ═══ -->
  <g transform="translate(575,538)" opacity=".3">
    <line x1="0" y1="0" x2="30" y2="0" stroke="#8a7555" stroke-width=".8"/>
    <line x1="30" y1="0" x2="60" y2="0" stroke="#6a6040" stroke-width=".8"/>
    <line x1="0" y1="-2" x2="0" y2="2" stroke="#8a7555" stroke-width=".6"/>
    <line x1="30" y1="-2" x2="30" y2="2" stroke="#6a6040" stroke-width=".5"/>
    <line x1="60" y1="-2" x2="60" y2="2" stroke="#6a6040" stroke-width=".6"/>
    <text x="15" y="-4" text-anchor="middle" fill="#8a7555" font-family="var(--mono)" font-size="3">5 km</text>
    <text x="45" y="-4" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">10 km</text>
  </g>

  <!-- ═══ VIGNETTE — hafif ═══ -->
  <rect width="720" height="560" fill="url(#vignetteG)" pointer-events="none"/>
  <rect width="720" height="560" fill="url(#vignetteR)" pointer-events="none"/>

  <text x="15" y="548" fill="#6a6040" font-family="var(--mono)" font-size="5" opacity=".35"
    paint-order="stroke" stroke="rgba(25,22,18,.3)" stroke-width=".8">Canakkale 1915</text>
  <text x="705" y="555" text-anchor="end" fill="rgba(120,110,90,.25)" font-family="var(--mono)" font-size="3">Icons by Icons8</text>
  `;

    ctr.innerHTML = '';
    ctr.appendChild(svg);

    const dateChip = document.createElement('div');
    dateChip.className = 'map-date-chip';
    dateChip.id = 'mapDateChip';
    dateChip.innerHTML = `<span class="map-date-day" id="mapDateDay">—</span><span class="map-date-month" id="mapDateMonth">Tarih</span><span class="map-date-year" id="mapDateYear"></span>`;
    ctr.appendChild(dateChip);

    attachNarrationElements(ctr, phase, narrationHandlers);
    updateMapDateIndicator(phase.date);
    renderBattleEffects(currentPhaseIndex);
}

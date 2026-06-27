// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Harita Overlay Editörü
// Base raster hariç tüm görünür harita katmanlarını yerleştirme aracı
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260622-hp-polish-r1';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CROP_TOP } from '../data/coordinate-map.js?v=20260622-hp-polish-r1';
import { MAP_FORTS, MAP_SCENE_LABELS, MAP_ORNAMENTS } from '../data/geo-calibration.js?v=20260622-hp-polish-r1';
import { hideUnitPanel } from './unit-panel.js?v=20260622-hp-polish-r1';

const STORAGE_KEY = 'gelibolu-overlay-editor-v4-logic-r2';
const EXPORT_FILENAME = 'gelibolu-overlay-placements.json';

const TYPE_LABELS = {
    unit: 'Birim',
    location: 'Yer',
    fort: 'Tabya',
    'scene-label': 'Sahne',
    ornament: 'Süs'
};

const TYPE_BADGE_CLASS = {
    unit: 'is-unit',
    location: 'is-location',
    fort: 'is-fort',
    'scene-label': 'is-scene',
    ornament: 'is-ornament'
};

const EDITABLE_ITEMS = buildEditableCatalog();
const ITEM_BY_KEY = EDITABLE_ITEMS.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
}, {});
const DEFAULT_PLACEMENTS = EDITABLE_ITEMS.reduce((acc, item) => {
    acc[item.key] = { x: item.defaultX, y: item.defaultY };
    return acc;
}, {});

let editorRoot = null;
let editorPanel = null;
let editorToggle = null;
let editorList = null;
let editorSearch = null;
let editorSummary = null;
let editorStats = null;
let editorFilters = null;
let editorSelection = null;
let editorJson = null;
let editorHint = null;
let markerLayer = null;

const state = {
    open: false,
    selectedKey: '',
    search: '',
    typeFilter: 'all',
    nudgeStep: 10,
    placements: {},
    dragKey: '',
    dragMoved: false,
    suppressNextSvgClick: false
};

function buildEditableCatalog() {
    const items = [];

    BATTLE_DATA.units.forEach((unit) => {
        const seedPhase = BATTLE_DATA.phases.find((phase) => unit.phases[phase.id]);
        const seedPoint = seedPhase ? unit.phases[seedPhase.id] : null;
        if (!seedPoint) return;

        items.push({
            key: `unit:${unit.id}`,
            type: 'unit',
            id: unit.id,
            name: unit.name,
            faction: unit.faction,
            commander: unit.commander || '',
            anchorRegion: unit.anchorRegion || '',
            phaseId: seedPhase.id,
            defaultX: Math.round(seedPoint.x),
            defaultY: Math.round(seedPoint.y),
            accent: BATTLE_DATA.factions[unit.faction]?.colorLight || '#d8c9ac'
        });
    });

    BATTLE_DATA.locations
        .filter((location) => !location.hiddenOnMap)
        .forEach((location) => {
            items.push({
                key: `location:${location.id}`,
                type: 'location',
                id: location.id,
                name: location.name,
                lat: location.lat,
                lon: location.lon,
                defaultX: Math.round(location.x),
                defaultY: Math.round(location.y),
                accent: '#b48b63'
            });
        });

    MAP_FORTS.forEach((fort) => {
        items.push({
            key: `fort:${fort.id}`,
            type: 'fort',
            id: fort.id,
            name: fort.name,
            lat: fort.lat,
            lon: fort.lon,
            defaultX: Math.round(fort.x),
            defaultY: Math.round(fort.y),
            accent: '#c4645a'
        });
    });

    MAP_SCENE_LABELS.forEach((label) => {
        items.push({
            key: `scene-label:${label.id}`,
            type: 'scene-label',
            id: label.id,
            name: label.text,
            sceneGroup: label.sceneGroup,
            defaultX: Math.round(label.x),
            defaultY: Math.round(label.y),
            accent: '#7a9ab0'
        });
    });

    MAP_ORNAMENTS.forEach((ornament) => {
        items.push({
            key: `ornament:${ornament.id}`,
            type: 'ornament',
            id: ornament.id,
            name: ornament.name,
            kind: ornament.kind,
            defaultX: Math.round(ornament.x),
            defaultY: Math.round(ornament.y),
            accent: '#d7c08a'
        });
    });

    return items;
}

function cloneDefaultPlacements() {
    return Object.fromEntries(
        Object.entries(DEFAULT_PLACEMENTS).map(([key, point]) => [key, { ...point }])
    );
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizePoint(x, y) {
    return {
        x: Math.max(0, Math.min(MAP_WIDTH, Math.round(x))),
        y: Math.max(MAP_CROP_TOP, Math.min(MAP_HEIGHT, Math.round(y)))
    };
}

function getItem(key) {
    return key ? ITEM_BY_KEY[key] || null : null;
}

function getPlacement(key) {
    return state.placements[key] || DEFAULT_PLACEMENTS[key] || null;
}

function setPlacement(key, x, y) {
    if (!key || !ITEM_BY_KEY[key]) return;
    state.placements[key] = normalizePoint(x, y);
}

function restorePlacement(key) {
    if (!key || !DEFAULT_PLACEMENTS[key]) return;
    state.placements[key] = { ...DEFAULT_PLACEMENTS[key] };
}

function loadPlacements() {
    const next = cloneDefaultPlacements();

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return next;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return next;

        Object.entries(parsed).forEach(([key, point]) => {
            if (!ITEM_BY_KEY[key] || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
            next[key] = normalizePoint(point.x, point.y);
        });
    } catch {
        return next;
    }

    return next;
}

function savePlacements() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.placements));
}

function getTypeCounts() {
    return EDITABLE_ITEMS.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        acc.all += 1;
        return acc;
    }, { all: 0 });
}

function getVisibleItems() {
    const query = state.search.trim().toLowerCase();
    return EDITABLE_ITEMS.filter((item) => {
        if (state.typeFilter !== 'all' && item.type !== state.typeFilter) return false;
        if (!query) return true;
        const haystack = [
            item.name,
            item.id,
            item.commander,
            item.faction ? BATTLE_DATA.factions[item.faction]?.name : '',
            item.sceneGroup,
            TYPE_LABELS[item.type]
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
    });
}

function getVisibleUnitItems() {
    return EDITABLE_ITEMS.filter((item) => item.type === 'unit');
}

function commitPlacement(key, x, y, hintMessage = '') {
    setPlacement(key, x, y);
    savePlacements();
    renderEditor();
    if (hintMessage) setHint(hintMessage);
}

function getNearestLocation(x, y) {
    let best = null;
    let bestDistance = Infinity;

    EDITABLE_ITEMS
        .filter((item) => item.type === 'location')
        .forEach((item) => {
            const point = getPlacement(item.key);
            if (!point) return;
            const distance = Math.hypot(x - point.x, y - point.y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = { item, point };
            }
        });

    if (!best) return null;

    return {
        id: best.item.id,
        name: best.item.name,
        x: best.point.x,
        y: best.point.y,
        distance: Math.round(bestDistance)
    };
}

function buildExportPayload() {
    const items = EDITABLE_ITEMS.map((item) => {
        const point = getPlacement(item.key);
        const base = {
            key: item.key,
            type: item.type,
            id: item.id,
            name: item.name,
            x: point?.x ?? null,
            y: point?.y ?? null,
            cropY: point ? point.y - MAP_CROP_TOP : null,
            defaultX: item.defaultX,
            defaultY: item.defaultY,
            deltaX: point ? point.x - item.defaultX : null,
            deltaY: point ? point.y - item.defaultY : null
        };

        if (item.type === 'unit') {
            const nearest = point ? getNearestLocation(point.x, point.y) : null;
            return {
                ...base,
                faction: item.faction,
                commander: item.commander,
                anchorRegion: item.anchorRegion,
                phaseId: item.phaseId,
                nearestLocationId: nearest?.id || null,
                nearestLocationName: nearest?.name || null,
                nearestDistance: nearest?.distance || null
            };
        }

        if (item.type === 'location' || item.type === 'fort') {
            return {
                ...base,
                lat: item.lat ?? null,
                lon: item.lon ?? null
            };
        }

        if (item.type === 'ornament') {
            return {
                ...base,
                kind: item.kind || null
            };
        }

        return {
            ...base,
            sceneGroup: item.sceneGroup || null
        };
    });

    const counts = items.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {});

    return {
        version: 2,
        updatedAt: new Date().toISOString(),
        counts,
        items
    };
}

function updateJsonOutput() {
    if (!editorJson) return;
    editorJson.value = JSON.stringify(buildExportPayload(), null, 2);
}

function setHint(message) {
    if (!editorHint) return;
    editorHint.textContent = message;
}

function getViewportController() {
    return window.GELIBOLU_VIEWPORT || null;
}

function getCurrentPlacementForItem(item) {
    if (!item) return null;
    return getPlacement(item.key) || { x: item.defaultX, y: item.defaultY };
}

function getItemGlyph(item) {
    if (item.type === 'location') return 'YR';
    if (item.type === 'fort') return 'TB';
    if (item.type === 'scene-label') return 'SN';
    if (item.type === 'ornament') return 'SR';

    const words = String(item.name || '').split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return String(item.name || item.id || '?').slice(0, 2).toUpperCase();
}

function getItemMetaLine(item) {
    if (item.type === 'unit') {
        return `${BATTLE_DATA.factions[item.faction]?.name || item.faction} · ${item.commander || '-'}`;
    }
    if (item.type === 'location') return 'Yer adı / konum ankırı';
    if (item.type === 'fort') return 'Tabya / kıyı bataryası';
    if (item.type === 'ornament') return `${item.kind || 'dekor'} harita süslemesi`;
    return `${item.sceneGroup || 'scene'} sahne etiketi`;
}

function selectItem(key) {
    state.selectedKey = key || '';
    const item = getItem(state.selectedKey);

    if (!item) {
        setHint('Listeden bir katman seç, sonra haritaya tıkla ya da sürükle.');
        renderEditor();
        return;
    }

    if (item.type === 'unit') {
        setHint(`${item.name} seçili. Markerı sürükleyebilir veya boş haritaya tıklayarak taşıyabilirsin.`);
    } else {
        setHint(`${item.name} seçili. Kendi etiketini sürükleyebilir veya haritada yeni noktaya tıklayabilirsin.`);
    }

    renderEditor();
}

function selectNextVisible() {
    const items = getVisibleItems();
    if (!items.length) return;
    const currentIndex = items.findIndex((item) => item.key === state.selectedKey);
    const nextItem = items[(currentIndex + 1 + items.length) % items.length];
    selectItem(nextItem.key);
}

function setFilter(type) {
    state.typeFilter = type;
    renderEditor();
}

function setNudgeStep(step) {
    state.nudgeStep = step;
    renderEditor();
}

function nudgeSelected(dx, dy) {
    const item = getItem(state.selectedKey);
    if (!item) return;
    const point = getCurrentPlacementForItem(item);
    commitPlacement(item.key, point.x + dx, point.y + dy, `${item.name} ${dx || dy ? 'kaydırıldı' : 'güncellendi'}.`);
}

function updateSelectedCoordinate(field, value) {
    const item = getItem(state.selectedKey);
    if (!item || !Number.isFinite(value)) return;
    const point = getCurrentPlacementForItem(item);
    const x = field === 'x' ? value : point.x;
    const y = field === 'y' ? value : point.y;
    commitPlacement(item.key, x, y, `${item.name} koordinatı güncellendi.`);
}

function centerOnSelected() {
    const item = getItem(state.selectedKey);
    const viewport = getViewportController();
    if (!item || !viewport) return;
    const point = getCurrentPlacementForItem(item);
    viewport.focusOnPoint(point.x, point.y);
    setHint(`${item.name} haritanın merkezine alındı.`);
}

function setOpen(nextOpen) {
    state.open = !!nextOpen;
    if (state.open) hideUnitPanel();
    document.body.dataset.mapEditor = state.open ? 'open' : 'closed';
    if (editorRoot) editorRoot.classList.toggle('is-open', state.open);
    if (editorPanel) {
        editorPanel.classList.toggle('is-open', state.open);
        editorPanel.toggleAttribute('inert', !state.open);
        editorPanel.setAttribute('aria-hidden', state.open ? 'false' : 'true');
    }
    if (editorToggle) {
        editorToggle.classList.toggle('is-active', state.open);
        editorToggle.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    }
    renderEditor();
}

function getOverlayElement(item) {
    return document.querySelector(`[data-overlay-key="${item.key}"]`);
}

function ensureMarkerLayer() {
    const svg = document.getElementById('battleMap');
    if (!svg) return null;

    let layer = svg.querySelector('#editorPlacementLayer');
    if (!layer) {
        layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('id', 'editorPlacementLayer');
        layer.setAttribute('class', 'editor-placement-layer');
        svg.appendChild(layer);
    }

    markerLayer = layer;
    return layer;
}

function renderUnitMarkers() {
    const layer = ensureMarkerLayer();
    if (!layer) return;

    const selectedItem = getItem(state.selectedKey);
    const markers = getVisibleUnitItems()
        .map((item) => {
            const point = getPlacement(item.key);
            if (!point) return '';
            const isSelected = item.key === state.selectedKey;
            const glyph = escapeHtml(getItemGlyph(item));
            const label = escapeHtml(item.name);

            return `<g class="map-editor-marker${isSelected ? ' is-selected' : ''}" data-editor-key="${item.key}" transform="translate(${point.x} ${point.y})" style="--marker-color:${item.accent}">
              <circle class="map-editor-marker-ring" r="${isSelected ? 16 : 11}"></circle>
              <circle class="map-editor-marker-core" r="${isSelected ? 11 : 8}"></circle>
              <text class="map-editor-marker-glyph" text-anchor="middle" y="4">${glyph}</text>
              <g class="map-editor-marker-label-wrap">
                <rect class="map-editor-marker-label-bg" x="-6" y="-33" width="${Math.max(56, label.length * 7)}" height="18" rx="9"></rect>
                <text class="map-editor-marker-label" x="2" y="-20">${label}</text>
              </g>
            </g>`;
        })
        .join('');

    layer.innerHTML = markers;
    layer.classList.toggle('is-hidden', !state.open);

    layer.querySelectorAll('.map-editor-marker').forEach((marker) => {
        marker.addEventListener('click', (event) => {
            event.stopPropagation();
            selectItem(marker.dataset.editorKey || '');
        });
        marker.addEventListener('pointerdown', (event) => {
            if (!state.open) return;
            state.dragKey = marker.dataset.editorKey || '';
            state.dragMoved = false;
            state.suppressNextSvgClick = false;
            selectItem(state.dragKey);
            event.preventDefault();
            event.stopPropagation();
        });
    });

    if (selectedItem?.type !== 'unit') return;
}

function applySvgOverlayPlacements() {
    EDITABLE_ITEMS.forEach((item) => {
        if (item.type === 'unit') return;
        const el = getOverlayElement(item);
        if (!el) return;

        const point = getPlacement(item.key);
        const dx = (point?.x ?? item.defaultX) - item.defaultX;
        const dy = (point?.y ?? item.defaultY) - item.defaultY;

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            el.removeAttribute('transform');
        } else {
            el.setAttribute('transform', `translate(${dx} ${dy})`);
        }

        el.classList.toggle('is-editor-selected', state.open && item.key === state.selectedKey);
        el.classList.toggle('is-editor-editable', state.open);
    });
}

function bindEditableSvgItems() {
    document.querySelectorAll('[data-overlay-key]').forEach((el) => {
        if (el.dataset.editorBound === '1') return;
        el.dataset.editorBound = '1';

        el.addEventListener('click', (event) => {
            event.stopPropagation();
            selectItem(el.dataset.overlayKey || '');
        });

        el.addEventListener('pointerdown', (event) => {
            if (!state.open) return;
            state.dragKey = el.dataset.overlayKey || '';
            state.dragMoved = false;
            state.suppressNextSvgClick = false;
            selectItem(state.dragKey);
            event.preventDefault();
            event.stopPropagation();
        });
    });
}

function renderSummary() {
    if (!editorSummary) return;

    const unitCount = EDITABLE_ITEMS.filter((item) => item.type === 'unit').length;
    const locationCount = EDITABLE_ITEMS.filter((item) => item.type === 'location').length;
    const fortCount = EDITABLE_ITEMS.filter((item) => item.type === 'fort').length;
    const sceneCount = EDITABLE_ITEMS.filter((item) => item.type === 'scene-label').length;
    const ornamentCount = EDITABLE_ITEMS.filter((item) => item.type === 'ornament').length;

    editorSummary.textContent = `${unitCount} birim · ${locationCount} yer · ${fortCount} tabya · ${sceneCount} sahne etiketi · ${ornamentCount} süs katmanı düzenlenebilir`;
}

function renderStats() {
    if (!editorStats) return;
    const counts = getTypeCounts();
    const visibleCount = getVisibleItems().length;

    editorStats.innerHTML = `
      <div class="map-editor-stat-card">
        <strong>${counts.all}</strong>
        <span>Toplam Katman</span>
      </div>
      <div class="map-editor-stat-card">
        <strong>${visibleCount}</strong>
        <span>Filtre Sonucu</span>
      </div>
      <div class="map-editor-stat-card">
        <strong>${state.nudgeStep}px</strong>
        <span>Nudge Adımı</span>
      </div>
    `;
}

function renderFilters() {
    if (!editorFilters) return;
    const counts = getTypeCounts();
    const filters = [
        ['all', `Tümü (${counts.all})`],
        ['unit', `Birim (${counts.unit || 0})`],
        ['location', `Yer (${counts.location || 0})`],
        ['fort', `Tabya (${counts.fort || 0})`],
        ['scene-label', `Sahne (${counts['scene-label'] || 0})`],
        ['ornament', `Süs (${counts.ornament || 0})`]
    ];

    editorFilters.innerHTML = filters.map(([type, label]) => `
      <button type="button" class="map-editor-filter${state.typeFilter === type ? ' is-active' : ''}" data-filter-type="${type}">
        ${label}
      </button>
    `).join('');
}

function renderSelectionInfo() {
    if (!editorSelection) return;

    const item = getItem(state.selectedKey);
    if (!item) {
        editorSelection.innerHTML = `
            <div class="map-editor-selection-empty">
              Listeden bir katman seç. Birimler marker ile, yer adları ve tabyalar kendi üstlerinden sürüklenir.
            </div>`;
        return;
    }

    const point = getPlacement(item.key);
    const currentPoint = point || { x: item.defaultX, y: item.defaultY };
    const badgeLabel = TYPE_LABELS[item.type] || item.type;
    const nearest = item.type === 'unit' ? getNearestLocation(currentPoint.x, currentPoint.y) : null;

    const extraLine = item.type === 'unit'
        ? `Komutan: ${escapeHtml(item.commander || '-')} · Faz: ${escapeHtml(item.phaseId || '-')}`
        : item.type === 'scene-label'
            ? `Sahne: ${escapeHtml(item.sceneGroup || '-')}`
            : item.type === 'ornament'
                ? `Tür: ${escapeHtml(item.kind || '-')}`
            : `Koordinat referansı: ${Number.isFinite(item.lat) ? item.lat.toFixed(4) : '-'}, ${Number.isFinite(item.lon) ? item.lon.toFixed(4) : '-'}`;

    editorSelection.innerHTML = `
        <div class="map-editor-selection-card" style="--accent:${item.accent}">
          <div class="map-editor-selection-top">
            <div>
              <div class="map-editor-selection-eyebrow">${badgeLabel}</div>
              <strong>${escapeHtml(item.name)}</strong>
            </div>
            <span class="map-editor-selection-badge">${escapeHtml(item.id)}</span>
          </div>
          <div class="map-editor-selection-meta">
            <span>${extraLine}</span>
          </div>
          <div class="map-editor-selection-coords">
            <span>X: ${currentPoint.x}</span>
            <span>Y: ${currentPoint.y}</span>
            <span>Kırpılmış Y: ${currentPoint.y - MAP_CROP_TOP}</span>
          </div>
          <div class="map-editor-selection-nearest">
            ${item.type === 'unit'
                ? (nearest ? `En yakın yer: ${escapeHtml(nearest.name)} (${nearest.distance}px)` : 'En yakın yer hesaplanamadı')
                : `Varsayılan: ${item.defaultX}, ${item.defaultY} · Delta: ${currentPoint.x - item.defaultX}, ${currentPoint.y - item.defaultY}`}
          </div>
          <div class="map-editor-inspector">
            <div class="map-editor-field-grid">
              <label class="map-editor-field">
                <span>X</span>
                <input class="map-editor-input" data-editor-field="x" type="number" value="${currentPoint.x}">
              </label>
              <label class="map-editor-field">
                <span>Y</span>
                <input class="map-editor-input" data-editor-field="y" type="number" value="${currentPoint.y}">
              </label>
            </div>
            <div class="map-editor-stepper">
              <span class="map-editor-step-label">Nudge</span>
              <div class="map-editor-step-buttons">
                ${[1, 5, 10, 25].map((step) => `<button type="button" class="map-editor-step-btn${state.nudgeStep === step ? ' is-active' : ''}" data-editor-step="${step}">${step}px</button>`).join('')}
              </div>
            </div>
            <div class="map-editor-nudge-grid">
              <button type="button" class="map-editor-arrow" data-editor-action="nudge-up">Yukarı</button>
              <button type="button" class="map-editor-arrow" data-editor-action="nudge-left">Sol</button>
              <button type="button" class="map-editor-arrow" data-editor-action="nudge-right">Sağ</button>
              <button type="button" class="map-editor-arrow" data-editor-action="nudge-down">Aşağı</button>
            </div>
            <div class="map-editor-selection-actions">
              <button type="button" class="map-editor-btn" data-editor-action="center">Seçileni Ortala</button>
              <button type="button" class="map-editor-btn" data-editor-action="restore-selected">Varsayılana Dön</button>
            </div>
          </div>
        </div>`;
}

function renderItemList() {
    if (!editorList) return;

    const html = getVisibleItems().map((item) => {
        const point = getPlacement(item.key);
        const isSelected = item.key === state.selectedKey;
        return `<button type="button" class="map-editor-unit${isSelected ? ' is-selected' : ''}" data-item-key="${item.key}" style="--unit-accent:${item.accent}">
          <span class="map-editor-unit-main">
            <span class="map-editor-unit-name">${escapeHtml(item.name)}</span>
            <span class="map-editor-unit-meta">${escapeHtml(getItemMetaLine(item))}</span>
            <span class="map-editor-unit-badges">
              <span class="map-editor-unit-badge ${TYPE_BADGE_CLASS[item.type] || ''}">${TYPE_LABELS[item.type] || item.type}</span>
            </span>
          </span>
          <span class="map-editor-unit-state">${point ? `${point.x}, ${point.y}` : '-'}</span>
        </button>`;
    }).join('');

    editorList.innerHTML = html || '<div class="map-editor-empty">Aramaya uygun katman bulunamadı.</div>';
    editorList.querySelectorAll('.map-editor-unit').forEach((button) => {
        button.addEventListener('click', () => selectItem(button.dataset.itemKey || ''));
    });
}

function renderEditor() {
    renderSummary();
    renderStats();
    renderFilters();
    renderSelectionInfo();
    renderItemList();
    renderUnitMarkers();
    applySvgOverlayPlacements();
    bindEditableSvgItems();
    updateJsonOutput();
}

function refreshLivePlacement() {
    renderSelectionInfo();
    renderUnitMarkers();
    applySvgOverlayPlacements();
    updateJsonOutput();
}

function getSvgPoint(svg, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return {
        x: vb.x + ((clientX - rect.left) / rect.width) * vb.width,
        y: vb.y + ((clientY - rect.top) / rect.height) * vb.height
    };
}

function onSvgClick(event) {
    if (!state.open || !state.selectedKey) return;
    if (state.suppressNextSvgClick) {
        state.suppressNextSvgClick = false;
        return;
    }
    if (event.target.closest('.map-editor-marker, [data-overlay-key]')) return;

    const svg = document.getElementById('battleMap');
    if (!svg) return;

    const point = getSvgPoint(svg, event.clientX, event.clientY);
    setPlacement(state.selectedKey, point.x, point.y);
    savePlacements();
    renderEditor();

    const item = getItem(state.selectedKey);
    setHint(`${item?.name || 'Katman'} yeni noktaya yerleştirildi.`);
}

function onPointerMove(event) {
    if (!state.dragKey) return;

    const svg = document.getElementById('battleMap');
    if (!svg) return;

    state.dragMoved = true;
    const point = getSvgPoint(svg, event.clientX, event.clientY);
    setPlacement(state.dragKey, point.x, point.y);
    refreshLivePlacement();
}

function onPointerUp() {
    if (!state.dragKey) return;

    const item = getItem(state.dragKey);
    savePlacements();

    if (state.dragMoved && item) {
        setHint(`${item.name} sürüklenerek güncellendi.`);
    }

    state.suppressNextSvgClick = state.dragMoved;
    state.dragKey = '';
    state.dragMoved = false;
    renderEditor();
}

function copyJson() {
    const text = editorJson?.value || '';
    navigator.clipboard?.writeText(text)
        .then(() => setHint('Overlay JSON panoya kopyalandı.'))
        .catch(() => setHint('Kopyalama başarısız oldu; JSON’u panelden alabilirsin.'));
}

function downloadJson() {
    const blob = new Blob([editorJson?.value || ''], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = EXPORT_FILENAME;
    anchor.click();
    URL.revokeObjectURL(href);
    setHint('Overlay JSON dosyası indirildi.');
}

function zoomIn() {
    getViewportController()?.zoomIn();
    setHint('Harita yakınlaştırıldı. Fare tekerleğiyle de zoom yapabilirsin.');
}

function zoomOut() {
    getViewportController()?.zoomOut();
    setHint('Harita uzaklaştırıldı.');
}

function resetViewport() {
    getViewportController()?.reset();
    setHint('Harita görünümü başlangıç kadrajına döndü.');
}

function bindActions() {
    editorSearch?.addEventListener('input', (event) => {
        state.search = event.target.value || '';
        renderEditor();
    });

    editorRoot?.addEventListener('change', (event) => {
        const field = event.target?.dataset?.editorField;
        if (!field) return;
        const value = Number(event.target.value);
        updateSelectedCoordinate(field, value);
    });

    editorRoot?.addEventListener('keydown', (event) => {
        const field = event.target?.dataset?.editorField;
        if (!field || event.key !== 'Enter') return;
        event.preventDefault();
        const value = Number(event.target.value);
        updateSelectedCoordinate(field, value);
    });

    editorRoot?.addEventListener('click', (event) => {
        const filterType = event.target.closest('[data-filter-type]')?.dataset.filterType;
        if (filterType) {
            setFilter(filterType);
            return;
        }

        const step = event.target.closest('[data-editor-step]')?.dataset.editorStep;
        if (step) {
            setNudgeStep(Number(step));
            return;
        }

        const action = event.target.closest('[data-editor-action]')?.dataset.editorAction;
        if (!action) return;

        switch (action) {
            case 'toggle':
                setOpen(!state.open);
                break;
            case 'next':
                selectNextVisible();
                break;
            case 'restore-selected':
                restorePlacement(state.selectedKey);
                savePlacements();
                renderEditor();
                setHint('Seçili katman varsayılan konumuna döndü.');
                break;
            case 'reset':
                if (window.confirm('Tüm overlay katmanlarını varsayılan konumlarına döndürmek istiyor musun?')) {
                    state.placements = cloneDefaultPlacements();
                    savePlacements();
                    renderEditor();
                    setHint('Tüm overlay katmanları varsayılan konumlarına döndü.');
                }
                break;
            case 'center':
                centerOnSelected();
                break;
            case 'nudge-up':
                nudgeSelected(0, -state.nudgeStep);
                break;
            case 'nudge-left':
                nudgeSelected(-state.nudgeStep, 0);
                break;
            case 'nudge-right':
                nudgeSelected(state.nudgeStep, 0);
                break;
            case 'nudge-down':
                nudgeSelected(0, state.nudgeStep);
                break;
            case 'copy':
                copyJson();
                break;
            case 'download':
                downloadJson();
                break;
            case 'zoom-in':
                zoomIn();
                break;
            case 'zoom-out':
                zoomOut();
                break;
            case 'zoom-reset':
                resetViewport();
                break;
        }
    });

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
}

function buildEditorDom() {
    const container = document.querySelector('.map-container');
    if (!container || document.getElementById('mapEditorRoot')) return;

    const root = document.createElement('div');
    root.id = 'mapEditorRoot';
    root.className = 'map-editor-root';
    root.innerHTML = `
      <button type="button" id="mapEditorToggle" class="map-editor-toggle" data-editor-action="toggle" aria-label="Harita overlay editörünü aç">
        Yerleştirici
      </button>
      <aside id="mapEditorPanel" class="map-editor-panel" aria-label="Harita overlay yerleştirme editörü" aria-hidden="true" inert>
        <div class="map-editor-header">
          <div>
            <div class="map-editor-eyebrow">Harita Editörü</div>
            <h3>Overlay Yerleştirici</h3>
          </div>
          <button type="button" class="map-editor-close" data-editor-action="toggle" aria-label="Editörü kapat">×</button>
        </div>
        <p class="map-editor-help">Base harita sabit kalır. Birimler marker ile, yer adları-tabya-sahne yazıları ise doğrudan kendi üstlerinden sürüklenir.</p>
        <div id="mapEditorStats" class="map-editor-stats"></div>
        <div class="map-editor-toolbar map-editor-toolbar-viewport">
          <button type="button" class="map-editor-btn" data-editor-action="zoom-in">Yakınlaş</button>
          <button type="button" class="map-editor-btn" data-editor-action="zoom-out">Uzaklaş</button>
          <button type="button" class="map-editor-btn" data-editor-action="zoom-reset">Kadrajı Sıfırla</button>
        </div>
        <div id="mapEditorSummary" class="map-editor-summary"></div>
        <div class="map-editor-section">
          <div class="map-editor-section-title">Filtreler</div>
          <div id="mapEditorFilters" class="map-editor-filters"></div>
        </div>
        <div class="map-editor-toolbar">
          <input id="mapEditorSearch" class="map-editor-search" type="search" placeholder="Birim, yer, tabya, etiket ara..." aria-label="Overlay ara">
          <button type="button" class="map-editor-btn" data-editor-action="next">Sonraki</button>
        </div>
        <div class="map-editor-section">
          <div class="map-editor-section-title">Seçili Katman</div>
        <div id="mapEditorSelection" class="map-editor-selection"></div>
        </div>
        <div class="map-editor-toolbar map-editor-toolbar-secondary">
          <button type="button" class="map-editor-btn" data-editor-action="restore-selected">Seçileni Geri Al</button>
          <button type="button" class="map-editor-btn is-danger" data-editor-action="reset">Tümünü Sıfırla</button>
        </div>
        <div id="mapEditorHint" class="map-editor-hint">Boş zemini sürükleyerek haritayı gez. Birimleri markerla, yer adlarını-tabyaları ise doğrudan kendi üstlerinden sürükle.</div>
        <div class="map-editor-section">
          <div class="map-editor-section-title">Katman Listesi</div>
        <div id="mapEditorUnitList" class="map-editor-unit-list"></div>
        </div>
        <div class="map-editor-section">
          <div class="map-editor-section-title">Dışa Aktarım</div>
        <div class="map-editor-export">
          <div class="map-editor-toolbar map-editor-toolbar-secondary">
            <button type="button" class="map-editor-btn" data-editor-action="copy">JSON Kopyala</button>
            <button type="button" class="map-editor-btn" data-editor-action="download">JSON İndir</button>
          </div>
          <textarea id="mapEditorJson" class="map-editor-json" readonly spellcheck="false"></textarea>
        </div>
        </div>
      </aside>
    `;

    container.appendChild(root);

    editorRoot = root;
    editorPanel = root.querySelector('#mapEditorPanel');
    editorToggle = root.querySelector('#mapEditorToggle');
    editorList = root.querySelector('#mapEditorUnitList');
    editorSearch = root.querySelector('#mapEditorSearch');
    editorSummary = root.querySelector('#mapEditorSummary');
    editorStats = root.querySelector('#mapEditorStats');
    editorFilters = root.querySelector('#mapEditorFilters');
    editorSelection = root.querySelector('#mapEditorSelection');
    editorJson = root.querySelector('#mapEditorJson');
    editorHint = root.querySelector('#mapEditorHint');

    bindActions();
}

function bindSvg() {
    const svg = document.getElementById('battleMap');
    if (!svg || svg.dataset.editorBound === '1') return;
    svg.dataset.editorBound = '1';
    svg.addEventListener('click', onSvgClick);
}

export function initMapEditor() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('editor') !== '1') {
        document.body.dataset.mapEditor = 'disabled';
        return;
    }

    state.placements = loadPlacements();
    buildEditorDom();
    bindSvg();
    selectItem(EDITABLE_ITEMS[0]?.key || '');
    setOpen(true);
    renderEditor();

    window.GELIBOLU_MAP_EDITOR = {
        getPayload: buildExportPayload,
        getPlacements: () => ({ ...state.placements }),
        getItems: () => EDITABLE_ITEMS.map((item) => ({ ...item })),
        selectItem,
        selectUnit: (unitId) => selectItem(`unit:${unitId}`),
        restorePlacement,
        open: () => setOpen(true),
        close: () => setOpen(false)
    };
}

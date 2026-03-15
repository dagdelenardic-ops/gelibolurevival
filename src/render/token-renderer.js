// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Token Renderer
// Birlik token SVG oluşturma, animasyon, highlight
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { normalizeValue } from '../engine/date-utils.js';
import {
    unitSeed, getNarrativeNavalPosition,
    getClusterOffset, getUnitEntryOrigin, isDestroyedPhaseData
} from '../engine/position-engine.js';
import { getUnitEntryPhaseIndex } from '../engine/phase-engine.js';
import { getUnitStrength, formatStrength } from '../data/casualty-model.js';
import { getUnitIcon } from '../data/icon-registry.js';

let tokenTrailTimer = null;

/** Faction SVG ikonu (legend için) */
export function factionSVG(f, s) {
    const c = f.color;
    switch (f.shape) {
        case 'star': return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 3 Q6 10 3 13 Q6 18 12 21 Q18 18 21 13 Q18 10 12 3Z" fill="${c}" opacity=".85"/><circle cx="13" cy="12" r="2.5" fill="none" stroke="#fff" stroke-width="1"/><polygon points="8,12 9,11 9.5,12 9,13" fill="#fff" opacity=".9"/></svg>`;
        case 'diamond': return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${c}" opacity=".85"/><path d="M12 18 L12 6 M8 14 Q12 19 16 14" fill="none" stroke="#fff" stroke-width="1.2"/><line x1="8" y1="8" x2="16" y2="8" stroke="#fff" stroke-width=".8"/></svg>`;
        case 'circle': return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${c}" opacity=".85"/><path d="M12 14 L6 8 M12 14 L18 8 M12 14 L9 6 M12 14 L15 6 M12 14 L12 5 M12 14 L3 10 M12 14 L21 10" stroke="#fff" stroke-width=".7" opacity=".9"/><path d="M5 14 Q12 18 19 14" fill="none" stroke="#fff" stroke-width="1"/></svg>`;
        case 'triangle': return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${c}" opacity=".85"/><path d="M8 16 C8 10 10 7 12 5 C14 7 16 10 16 16 M10 15 C10 11 11 8 12 6.5 C13 8 14 11 14 15" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/></svg>`;
    }
}

function navalTokenShape(unit, f, cx, cy, phaseData) {
    const c = f.color;
    const cl = f.colorLight;
    const isFlagship = unit.id === 'hms-queen-elizabeth' || unit.id === 'nusret';
    const isSunk = isDestroyedPhaseData(phaseData);
    return `<path d="M${cx - 13} ${cy + 5} L${cx - 8} ${cy - 3} L${cx + 8} ${cy - 3} L${cx + 13} ${cy + 5} Z" fill="${c}" stroke="${cl}" stroke-width=".8" opacity="${isSunk ? '.5' : '.92'}" filter="url(#subtleGlow)"/>` +
        `<rect x="${cx - 6}" y="${cy - 8}" width="12" height="5" rx="1.4" fill="${cl}" opacity="${isSunk ? '.35' : '.82'}"/>` +
        `<rect x="${cx - 1.2}" y="${cy - 13}" width="2.4" height="7" fill="${cl}" opacity="${isSunk ? '.35' : '.9'}"/>` +
        `<line x1="${cx}" y1="${cy - 13}" x2="${cx + 6}" y2="${cy - 9}" stroke="${cl}" stroke-width=".7" opacity=".8"/>` +
        `<circle cx="${cx - 7}" cy="${cy + 1}" r="1.1" fill="${cl}" opacity=".8"/>` +
        `<circle cx="${cx}" cy="${cy + 1}" r="1.1" fill="${cl}" opacity=".8"/>` +
        `<circle cx="${cx + 7}" cy="${cy + 1}" r="1.1" fill="${cl}" opacity=".8"/>` +
        (isFlagship ? `<polygon points="${cx + 1},${cy - 13} ${cx + 7},${cy - 11} ${cx + 1},${cy - 9}" fill="#f6e5a7" opacity=".9"/>` : '') +
        (isSunk ? `<path d="M${cx - 10} ${cy - 10} L${cx + 10} ${cy + 10} M${cx + 10} ${cy - 10} L${cx - 10} ${cy + 10}" stroke="#f6e5a7" stroke-width="1.1" opacity=".85"/>` : '') +
        (() => { const ic = getUnitIcon(unit.id); return `<image href="assets/icons/${ic.icon}.png" x="${cx - ic.size / 2}" y="${cy - ic.size / 2 - 2}" width="${ic.size}" height="${ic.size}" opacity="${isSunk ? '.3' : '.82'}" pointer-events="none"/>`; })();
}

/** unitClass bazlı token radius */
function getTokenRadius(unitClass) {
    const radii = { army_hq: 13, corps: 11, division: 10, brigade: 8, regiment: 7, battery: 9 };
    return radii[unitClass] || 10;
}

/** unitClass bazlı NATO-style boyut işareti */
function unitClassMarker(cx, cy, unitClass, cl) {
    const y = cy - getTokenRadius(unitClass) - 3;
    switch (unitClass) {
        case 'army_hq':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="5" font-weight="bold" font-family="var(--mono)">★★★</text>`;
        case 'corps':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="4.5" font-weight="bold" font-family="var(--mono)">XX</text>`;
        case 'division':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="4" font-family="var(--mono)">××</text>`;
        case 'brigade':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="4" font-family="var(--mono)">×</text>`;
        case 'regiment':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="3.5" font-family="var(--mono)">III</text>`;
        case 'battery':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="4" font-family="var(--mono)">⌇</text>`;
        default:
            return '';
    }
}

/** Token şekli (harita üstü birlik sembolü) */
function tokenShape(unit, phaseData, f, cx, cy) {
    const c = f.color, cl = f.colorLight;
    if (unit.type === 'deniz') return navalTokenShape(unit, f, cx, cy, phaseData);
    const r = getTokenRadius(unit.unitClass);
    const marker = unitClassMarker(cx, cy, unit.unitClass, cl);
    const ic = getUnitIcon(unit.id);
    const iconOverlay = `<image href="assets/icons/${ic.icon}.png" x="${cx - ic.size / 2}" y="${cy - ic.size / 2}" width="${ic.size}" height="${ic.size}" opacity=".82" pointer-events="none"/>`;
    switch (f.shape) {
        case 'star': {
            const sw = r >= 11 ? '1.2' : '.8';
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${cl}" stroke-width="${sw}" opacity=".92" filter="url(#subtleGlow)"/>` +
                `<path d="M${cx + 5} ${cy - 1} A6 6 0 1 0 ${cx + 5} ${cy + 1} A4.5 4.5 0 1 1 ${cx + 5} ${cy - 1}Z" fill="${cl}" opacity=".85" transform="rotate(-30,${cx},${cy})"/>` +
                `<polygon points="${cx - 4},${cy - 2} ${cx - 3.2},${cy - 0.2} ${cx - 5.2},${cy + 0.8} ${cx - 3.4},${cy + 0.8} ${cx - 3},${cy + 2.8} ${cx - 2},${cy + 1} ${cx - 0.5},${cy + 2.6} ${cx - 0.8},${cy + 0.5} ${cx + 1},${cy + 1.2} ${cx - 0.2},${cy - 0.6}" fill="${cl}" opacity=".85" transform="rotate(-30,${cx},${cy})"/>` + iconOverlay + marker;
        }
        case 'diamond': {
            const sw = r >= 11 ? '1.2' : '.8';
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${cl}" stroke-width="${sw}" opacity=".92" filter="url(#subtleGlow)"/>` +
                `<line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy + 5}" stroke="${cl}" stroke-width="1.2" opacity=".85"/>` +
                `<line x1="${cx - 3}" y1="${cy - 6}" x2="${cx + 3}" y2="${cy - 6}" stroke="${cl}" stroke-width="1" opacity=".85"/>` +
                `<path d="M${cx - 5} ${cy + 2} Q${cx - 4} ${cy + 6} ${cx} ${cy + 5} Q${cx + 4} ${cy + 6} ${cx + 5} ${cy + 2}" fill="none" stroke="${cl}" stroke-width="1.1" opacity=".85"/>` +
                `<circle cx="${cx}" cy="${cy - 7.5}" r="1.3" fill="none" stroke="${cl}" stroke-width=".8" opacity=".7"/>` + iconOverlay + marker;
        }
        case 'circle': {
            const sw = r >= 11 ? '1.2' : '.8';
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${cl}" stroke-width="${sw}" opacity=".92" filter="url(#subtleGlow)"/>` +
                `<path d="M${cx - 7} ${cy + 2} Q${cx} ${cy + 5} ${cx + 7} ${cy + 2}" fill="none" stroke="${cl}" stroke-width=".8" opacity=".7"/>` +
                Array.from({ length: 9 }, (_, i) => {
                    const a = -Math.PI + ((i + 1) * Math.PI / 10);
                    const x1 = cx + Math.cos(a) * 2.5;
                    const y1 = cy + 2 + Math.sin(a) * 2.5;
                    const x2 = cx + Math.cos(a) * 7;
                    const y2 = cy + 2 + Math.sin(a) * 7;
                    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cl}" stroke-width=".6" opacity=".8"/>`;
                }).join('') +
                `<circle cx="${cx}" cy="${cy + 2}" r="2.5" fill="${cl}" opacity=".7"/>` + iconOverlay + marker;
        }
        case 'triangle': {
            const sw = r >= 11 ? '1.2' : '.8';
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${cl}" stroke-width="${sw}" opacity=".92" filter="url(#subtleGlow)"/>` +
                `<path d="M${cx} ${cy - 7} C${cx + 1.5} ${cy - 4} ${cx + 4} ${cy - 2} ${cx + 4} ${cy + 1} C${cx + 4} ${cy + 3} ${cx + 2} ${cy + 3} ${cx + 1} ${cy + 1} L${cx + 1} ${cy + 5} L${cx - 1} ${cy + 5} L${cx - 1} ${cy + 1} C${cx - 2} ${cy + 3} ${cx - 4} ${cy + 3} ${cx - 4} ${cy + 1} C${cx - 4} ${cy - 2} ${cx - 1.5} ${cy - 4} ${cx} ${cy - 7}Z" fill="${cl}" opacity=".8"/>` +
                `<line x1="${cx - 3}" y1="${cy + 5}" x2="${cx + 3}" y2="${cy + 5}" stroke="${cl}" stroke-width=".8" opacity=".7"/>` + iconOverlay + marker;
        }
    }
}

/** Kuvvet badge'i SVG — token altında sayı gösterir */
function strengthBadge(cx, cy, unit, isoDate, animData) {
    if (!unit.strength || unit.type === 'deniz') return '';

    // Animasyon verisinden bu birimin state'ini bul
    let unitState = 'idle';
    let intensity = 0;
    if (animData) {
        intensity = animData.intensity || 0;
        const animUnit = animData.units?.find(u => {
            const n1 = (u.name || '').toLowerCase();
            const n2 = unit.name.toLowerCase();
            return n1 === n2 || n1.includes(n2) || n2.includes(n1);
        });
        if (animUnit) unitState = animUnit.state || 'idle';
    }

    const str = getUnitStrength(unit.id, isoDate, intensity, unitState, unit.strength);
    const txt = formatStrength(str.current);
    const ratio = str.ratio;

    // Renk: yeşil → sarı → kırmızı
    let barColor;
    if (ratio > 0.7) barColor = 'rgba(100,180,80,.8)';
    else if (ratio > 0.4) barColor = 'rgba(220,180,50,.8)';
    else barColor = 'rgba(200,70,50,.85)';

    const r = getTokenRadius(unit.unitClass);
    const by = cy + r + 10; // isim altı
    const barW = 16;
    const barH = 2;
    const fillW = barW * ratio;

    return `<g class="strength-badge" opacity=".85">
      <text x="${cx}" y="${by + 8}" text-anchor="middle" fill="#d5c8a1" font-family="var(--mono)" font-size="4" opacity=".9">${txt}</text>
      <rect x="${cx - barW / 2}" y="${by + 10}" width="${barW}" height="${barH}" rx="1" fill="rgba(40,35,25,.6)"/>
      <rect x="${cx - barW / 2}" y="${by + 10}" width="${fillW}" height="${barH}" rx="1" fill="${barColor}"/>
    </g>`;
}

/** Tüm birlik tokenlerinin SVG markup'ını üret */
export function renderTokens(pid, prevPositions = {}, nextPositions = {}, phaseIndex = 0, prevPhaseIndex = 0, isoDate = '', animData = null) {
    const spreadNext = {};
    const spreadPrev = {};
    const UNIT_ENTRY = getUnitEntryPhaseIndex();
    return BATTLE_DATA.units.map((u) => {
        const entryIndex = UNIT_ENTRY[u.id] ?? 0;
        if (phaseIndex < entryIndex) return '';

        const targetBase = nextPositions[u.id];
        if (!targetBase) return ''; // Yok olan veya henüz girmeyen birlik

        const phaseData = u.phases[pid];
        const f = BATTLE_DATA.factions[u.faction];
        const hasPrev = !!prevPositions[u.id];
        const isEntryFrame = phaseIndex === entryIndex && !hasPrev;

        const prev = isEntryFrame ? getUnitEntryOrigin(u, targetBase) : (prevPositions[u.id] || targetBase);
        const visible = phaseData ? 1 : 0.55;
        const prevOffset = getClusterOffset(spreadPrev, prev.x, prev.y, u, prevPhaseIndex);
        const targetOffset = getClusterOffset(spreadNext, targetBase.x, targetBase.y, u, phaseIndex);
        const sx = normalizeValue(Math.round(prev.x + prevOffset.x), 45, 680);
        const sy = normalizeValue(Math.round(prev.y + prevOffset.y), 18, 548);
        const tx = normalizeValue(Math.round(targetBase.x + targetOffset.x), 45, 680);
        const ty = normalizeValue(Math.round(targetBase.y + targetOffset.y), 18, 548);
        const statusText = phaseData ? (phaseData.status || 'Bilinmiyor') : 'Hazır durum';
        const ariaLabel = `${u.name} – ${f.name} – ${statusText}`;
        return `<g class="unit-token" role="button" tabindex="0" aria-label="${ariaLabel}"
      data-unit-id="${u.id}"
      data-unit-name="${u.name}"
      data-unit-commander="${u.commander}"
      data-unit-strength="${u.strength}"
      data-phase-status="${statusText}"
      data-phase-objective="${phaseData ? (phaseData.objective || 'Bilinmiyor') : 'Bilinmiyor'}"
      data-phase-outcome="${phaseData ? (phaseData.outcome || 'Bilinmiyor') : 'Bilinmiyor'}"
      data-target-x="${tx}" data-target-y="${ty}"
      style="transform:translate(${sx}px, ${sy}px);opacity:${visible}">
      ${tokenShape(u, phaseData, f, 0, 0)}
      <text x="0" y="18" text-anchor="middle" fill="${f.colorLight}" font-family="var(--mono)" font-size="5.5" class="unit-label">
        ${u.name.length > 20 ? u.name.slice(0, 18) + '…' : u.name}
      </text>
      ${strengthBadge(0, 0, u, isoDate, animData)}
    </g>`;
    }).join('');
}

// ── Token Animasyonları ──

function getTokenTranslate(el) {
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || '');
    if (m) return { x: +m[1], y: +m[2] };
    return { x: +el.dataset.targetX || 0, y: +el.dataset.targetY || 0 };
}

/** Token kayma animasyonu (trail efekti ile) */
export function applyTokenSlideWithTrail(tokenNodes) {
    tokenNodes.forEach((el) => {
        const from = getTokenTranslate(el);
        const tx = +el.dataset.targetX;
        const ty = +el.dataset.targetY;
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
        const dx = tx - from.x;
        const dy = ty - from.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
            const nx = -dx / dist;
            const ny = -dy / dist;
            const s1 = Math.min(8, Math.max(3, dist * 0.18));
            const s2 = Math.min(16, Math.max(6, dist * 0.34));
            el.style.setProperty('--trail-x1', `${(nx * s1).toFixed(1)}px`);
            el.style.setProperty('--trail-y1', `${(ny * s1).toFixed(1)}px`);
            el.style.setProperty('--trail-x2', `${(nx * s2).toFixed(1)}px`);
            el.style.setProperty('--trail-y2', `${(ny * s2).toFixed(1)}px`);
            el.classList.add('is-moving');
        }
        el.style.transform = `translate(${tx}px, ${ty}px)`;
    });

    if (tokenTrailTimer) clearTimeout(tokenTrailTimer);
    tokenTrailTimer = setTimeout(() => {
        tokenNodes.forEach((el) => el.classList.remove('is-moving'));
        tokenTrailTimer = null;
    }, 360);
}

// ── Unit Highlight (animasyon verisinden) ──

function normalizeAnimName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

/** Animasyon verisine göre birimleri highlight/mute et */
export function renderUnits(animationUnits) {
    const tg = document.getElementById('unitTokens');
    if (!tg) return;
    const nodes = [...tg.querySelectorAll('.unit-token')];
    if (!nodes.length) return;

    const unitById = BATTLE_DATA.units.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const baseOpacity = (el) => {
        const cached = Number(el.dataset.baseOpacity);
        if (Number.isFinite(cached)) return cached;
        const current = Number(el.style.opacity);
        const base = Number.isFinite(current) ? current : 1;
        el.dataset.baseOpacity = String(base);
        return base;
    };
    const reset = () => {
        nodes.forEach((el) => {
            const base = baseOpacity(el);
            el.style.opacity = String(base);
            el.classList.remove('is-muted', 'is-active');
        });
    };

    if (!Array.isArray(animationUnits)) { reset(); return; }
    if (!animationUnits.length) {
        nodes.forEach((el) => {
            const base = baseOpacity(el);
            el.style.opacity = String(Math.max(0.12, base * 0.26));
            el.classList.add('is-muted');
            el.classList.remove('is-active');
        });
        return;
    }

    const targetNames = new Set(animationUnits.map((u) => normalizeAnimName(u && u.name)).filter(Boolean));
    const wantedSides = new Set(animationUnits.map((u) => String(u && u.side || '').toLowerCase()).filter(Boolean));
    const tokenNames = nodes.map((el) => normalizeAnimName(el.dataset.unitName || ''));
    const hasNameOverlap = [...targetNames].some((target) => tokenNames.some((name) => name && (name === target || name.includes(target) || target.includes(name))));

    nodes.forEach((el) => {
        const base = baseOpacity(el);
        const name = normalizeAnimName(el.dataset.unitName || '');
        const model = unitById[el.dataset.unitId];
        const side = model && model.faction === 'ottoman' ? 'ottoman' : 'allied';
        const nameMatch = [...targetNames].some((target) => name && (name === target || name.includes(target) || target.includes(name)));
        const sideMatch = wantedSides.size ? wantedSides.has(side) : true;
        const active = hasNameOverlap ? nameMatch : sideMatch;

        if (active) {
            el.style.opacity = String(Math.min(1, Math.max(base, 0.85)));
            el.classList.add('is-active');
            el.classList.remove('is-muted');
        } else {
            el.style.opacity = String(Math.max(0.12, base * 0.3));
            el.classList.add('is-muted');
            el.classList.remove('is-active');
        }
    });
}

export function renderAnimationUnits(animData) {
    if (!animData || !Array.isArray(animData.units) || !animData.units.length) return;
    renderUnits(animData.units);
}

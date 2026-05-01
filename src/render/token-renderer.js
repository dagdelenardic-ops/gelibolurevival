// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Token Renderer
// Birlik token SVG oluşturma, animasyon, highlight
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260407-manual-r1';
import { VP_MIN_X, VP_MAX_X, VP_MIN_Y, VP_MAX_Y } from '../data/coordinate-map.js?v=20260407-manual-r1';
import { normalizeValue } from '../engine/date-utils.js';
import {
    unitSeed, getNarrativeNavalPosition,
    getClusterOffset, getUnitEntryOrigin, getTerrainSafePointForUnit, isDestroyedPhaseData
} from '../engine/position-engine.js?v=20260407-manual-r1';
import { getUnitEntryPhaseIndex } from '../engine/phase-engine.js?v=20260501-scene-r2';
import { deriveUnitIntent } from '../engine/unit-intelligence.js?v=20260501-guided-r2';
import { getUnitVitals, formatStrength } from '../data/casualty-model.js';
import { getUnitIcon } from '../data/icon-registry.js';

let tokenTrailTimer = null;
const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;

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
    const s = 2.8; // scale factor for 2451x3467 viewport
    return `<path d="M${cx - 13*s} ${cy + 5*s} L${cx - 8*s} ${cy - 3*s} L${cx + 8*s} ${cy - 3*s} L${cx + 13*s} ${cy + 5*s} Z" fill="${c}" stroke="${cl}" stroke-width="${.8*s}" opacity="${isSunk ? '.5' : '.92'}" filter="url(#subtleGlow)"/>` +
        `<rect x="${cx - 6*s}" y="${cy - 8*s}" width="${12*s}" height="${5*s}" rx="${1.4*s}" fill="${cl}" opacity="${isSunk ? '.35' : '.82'}"/>` +
        `<rect x="${cx - 1.2*s}" y="${cy - 13*s}" width="${2.4*s}" height="${7*s}" fill="${cl}" opacity="${isSunk ? '.35' : '.9'}"/>` +
        `<line x1="${cx}" y1="${cy - 13*s}" x2="${cx + 6*s}" y2="${cy - 9*s}" stroke="${cl}" stroke-width="${.7*s}" opacity=".8"/>` +
        `<circle cx="${cx - 7*s}" cy="${cy + 1*s}" r="${1.1*s}" fill="${cl}" opacity=".8"/>` +
        `<circle cx="${cx}" cy="${cy + 1*s}" r="${1.1*s}" fill="${cl}" opacity=".8"/>` +
        `<circle cx="${cx + 7*s}" cy="${cy + 1*s}" r="${1.1*s}" fill="${cl}" opacity=".8"/>` +
        (isFlagship ? `<polygon points="${cx + 1*s},${cy - 13*s} ${cx + 7*s},${cy - 11*s} ${cx + 1*s},${cy - 9*s}" fill="#f6e5a7" opacity=".9"/>` : '') +
        (isSunk ? `<path d="M${cx - 10*s} ${cy - 10*s} L${cx + 10*s} ${cy + 10*s} M${cx + 10*s} ${cy - 10*s} L${cx - 10*s} ${cy + 10*s}" stroke="#f6e5a7" stroke-width="${1.1*s}" opacity=".85"/>` : '') +
        (() => { const ic = getUnitIcon(unit.id); const sz = ic.size * s; return `<image href="assets/icons/${ic.icon}.png" x="${cx - sz / 2}" y="${cy - sz / 2 - 2*s}" width="${sz}" height="${sz}" opacity="${isSunk ? '.3' : '.82'}" pointer-events="none"/>`; })();
}

/** unitClass bazlı token radius (2451×3467 viewport için ölçekli) */
function getTokenRadius(unitClass) {
    const radii = { army_hq: 35, corps: 30, division: 27, brigade: 22, regiment: 19, battery: 24, mine_layer: 24, ship: 24 };
    return radii[unitClass] || 27;
}

/** unitClass bazlı NATO-style boyut işareti */
function unitClassMarker(cx, cy, unitClass, cl) {
    const y = cy - getTokenRadius(unitClass) - 8;
    switch (unitClass) {
        case 'army_hq':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="14" font-weight="bold" font-family="var(--mono)">★★★</text>`;
        case 'corps':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="13" font-weight="bold" font-family="var(--mono)">XX</text>`;
        case 'division':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="11" font-family="var(--mono)">××</text>`;
        case 'brigade':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="11" font-family="var(--mono)">×</text>`;
        case 'regiment':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="10" font-family="var(--mono)">III</text>`;
        case 'battery':
            return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${cl}" font-size="11" font-family="var(--mono)">⌇</text>`;
        default:
            return '';
    }
}

/** Token şekli (harita üstü birlik sembolü) */
function tokenShape(unit, phaseData, f, cx, cy) {
    const c = f.color, cl = f.colorLight;
    if (unit.type === 'deniz' || unit.entityType === 'landing_boat') return navalTokenShape(unit, f, cx, cy, phaseData);
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

function escapeAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getActionDashArray(actionKey) {
    switch (actionKey) {
        case 'defending': return '';
        case 'reserve': return '1.5 2.5';
        case 'bombarding': return '4 2';
        case 'engaged': return '2.4 1.6';
        case 'landing': return '5 2.4';
        case 'advancing': return '6 2.8';
        case 'retreating': return '2 3.5';
        default: return '3 3';
    }
}

function normalizeAnimUnitName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

function getAnimatedUnitState(unit, animData) {
    let unitState = 'idle';
    let intensity = 0;
    if (!animData) return { unitState, intensity };

    intensity = Number(animData.intensity || 0);
    const unitName = normalizeAnimUnitName(unit.name);
    const animUnit = animData.units?.find((entry) => {
        const animName = normalizeAnimUnitName(entry.name);
        return animName === unitName || animName.includes(unitName) || unitName.includes(animName);
    });

    if (animUnit) unitState = animUnit.state || unitState;
    return { unitState, intensity };
}

function getTokenVitals(unit, isoDate, animData) {
    const { unitState, intensity } = getAnimatedUnitState(unit, animData);
    return getUnitVitals(unit.id, isoDate, intensity, unitState, unit.strength || 0);
}

function getVitalClass(vitals) {
    if (!vitals || !vitals.base) return '';
    if (vitals.ratio <= 0.38 || vitals.stamina <= 0.24) return ' is-depleted';
    if (vitals.ratio <= 0.62 || vitals.stamina <= 0.42) return ' is-fatigued';
    if (vitals.lossRatio >= 0.2) return ' is-worn';
    return '';
}

function actionAdornment(unit, intent) {
    const color = intent && intent.actionColor ? intent.actionColor : '#a6a08f';
    const dashArray = getActionDashArray(intent && intent.actionKey);

    if (unit.type === 'deniz') {
        return `<g class="unit-action-adornment" aria-hidden="true">
          <ellipse class="unit-action-ring" data-action-key="${intent.actionKey}" cx="0" cy="0" rx="18" ry="12.5" fill="none" stroke="${color}" stroke-width="1.1" opacity=".8"${dashArray ? ` stroke-dasharray="${dashArray}"` : ''}/>
          <circle class="unit-action-pip" cx="12.5" cy="-9" r="2.4" fill="${color}" stroke="rgba(20, 18, 16, .92)" stroke-width=".85"/>
        </g>`;
    }

    const r = getTokenRadius(unit.unitClass) + 3;
    return `<g class="unit-action-adornment" aria-hidden="true">
      <circle class="unit-action-ring" data-action-key="${intent.actionKey}" cx="0" cy="0" r="${r}" fill="none" stroke="${color}" stroke-width="1.1" opacity=".8"${dashArray ? ` stroke-dasharray="${dashArray}"` : ''}/>
      <circle class="unit-action-pip" cx="${r - 1}" cy="${-r + 1}" r="2.2" fill="${color}" stroke="rgba(20, 18, 16, .92)" stroke-width=".8"/>
    </g>`;
}

function vitalAdornment(unit, vitals, intent) {
    if (!vitals?.base || unit.type === 'deniz') return '';

    const stressed = vitals.stamina <= 0.58 || vitals.lossRatio >= 0.18 || (vitals.todayLoss || 0) >= 180;
    if (!stressed) return '';

    const r = getTokenRadius(unit.unitClass) + 6;
    const critical = vitals.stamina <= 0.24 || vitals.lossRatio >= 0.4;
    const fatigued = vitals.stamina <= 0.42 || vitals.lossRatio >= 0.24;
    const actionKey = intent?.actionKey || '';
    const combatActive = ['engaged', 'bombarding', 'advancing', 'landing', 'retreating', 'defending'].includes(actionKey);
    const auraColor = critical
        ? 'rgba(196, 86, 72, .22)'
        : fatigued
            ? 'rgba(210, 158, 82, .18)'
            : 'rgba(126, 174, 200, .16)';
    const tickColor = critical ? 'rgba(232, 132, 115, .82)' : 'rgba(226, 191, 110, .76)';
    const smokeColor = critical ? 'rgba(170, 74, 68, .24)' : 'rgba(154, 126, 92, .18)';
    const tickCount = Math.min(4, Math.max(1, Math.round(vitals.lossRatio * 8)));
    const wispCount = critical ? 3 : fatigued ? 2 : 1;
    const pulseDur = combatActive ? (critical ? '1.1s' : '1.6s') : (critical ? '1.8s' : '2.4s');

    const ticks = Array.from({ length: tickCount }, (_, index) => {
        const angle = (-46 + index * 17) * Math.PI / 180;
        const inner = r - 2;
        const outer = inner + (critical ? 8 : 6);
        const x1 = Math.cos(angle) * inner;
        const y1 = Math.sin(angle) * inner;
        const x2 = Math.cos(angle) * outer;
        const y2 = Math.sin(angle) * outer;
        return `<line class="unit-vitals-notch" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
            stroke="${tickColor}" stroke-width="${critical ? 1.6 : 1.2}" opacity="${critical ? '.88' : '.72'}"/>`;
    }).join('');

    const wisps = Array.from({ length: wispCount }, (_, index) => {
        const dx = (index - ((wispCount - 1) / 2)) * 8;
        const startY = -r + 4 - (index * 2);
        const peakY = startY - (critical ? 14 : 10);
        const drift = critical ? 7 : 5;
        const delay = `${(index * 0.24).toFixed(2)}s`;
        const dur = critical ? '1.15s' : '1.65s';
        return `<path class="unit-vitals-wisp" d="M${dx} ${startY} Q${(dx + drift / 2).toFixed(1)} ${(startY + peakY) / 2} ${dx + drift} ${peakY}"
            fill="none" stroke="${smokeColor}" stroke-width="${critical ? 1.8 : 1.3}" stroke-linecap="round" opacity=".22">
            <animate attributeName="opacity" values=".08;.26;.06" dur="${dur}" begin="${delay}" repeatCount="indefinite"/>
        </path>`;
    }).join('');

    return `<g class="unit-vitals-adornment" aria-hidden="true">
      <circle class="unit-vitals-aura" cx="0" cy="0" r="${r}" fill="${auraColor}" opacity="${critical ? '.2' : '.15'}">
        <animate attributeName="r" values="${(r - 2).toFixed(1)};${(r + (critical ? 5 : 3)).toFixed(1)};${(r - 2).toFixed(1)}" dur="${pulseDur}" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="${critical ? '.18;.28;.18' : '.1;.2;.1'}" dur="${pulseDur}" repeatCount="indefinite"/>
      </circle>
      ${ticks}
      ${wisps}
    </g>`;
}

/** Kuvvet badge'i SVG — token altında sayı gösterir */
function strengthBadge(cx, cy, unit, vitals) {
    if (!unit.strength || unit.type === 'deniz' || !vitals) return '';

    const txt = formatStrength(vitals.current);
    const lossTxt = vitals.loss > 0 ? `-${formatStrength(vitals.loss)}` : '';
    const ratio = vitals.ratio;
    const stamina = vitals.stamina;

    // Renk: yeşil → sarı → kırmızı
    let barColor;
    if (ratio > 0.7) barColor = 'rgba(100,180,80,.8)';
    else if (ratio > 0.4) barColor = 'rgba(220,180,50,.8)';
    else barColor = 'rgba(200,70,50,.85)';

    let staminaColor;
    if (stamina > 0.7) staminaColor = 'rgba(126, 174, 200, .86)';
    else if (stamina > 0.42) staminaColor = 'rgba(218, 170, 80, .86)';
    else staminaColor = 'rgba(205, 85, 72, .9)';

    const r = getTokenRadius(unit.unitClass);
    const by = cy + r + 28; // isim altı (ölçekli)
    const barW = 45;
    const barH = 5;
    const fillW = barW * ratio;
    const staminaW = barW * stamina;

    return `<g class="strength-badge" opacity=".85">
      <title>Kalan kuvvet: ${txt}${lossTxt ? ` · Kayıp: ${lossTxt}` : ''} · Stamina: ${vitals.staminaPercent}% (${vitals.staminaLabel})</title>
      <text x="${cx}" y="${by + 20}" text-anchor="middle" fill="#d5c8a1" font-family="var(--mono)" font-size="12" opacity=".9">${txt}${lossTxt ? ` ${lossTxt}` : ''}</text>
      <rect x="${cx - barW / 2}" y="${by + 26}" width="${barW}" height="${barH}" rx="3" fill="rgba(40,35,25,.6)"/>
      <rect x="${cx - barW / 2}" y="${by + 26}" width="${fillW}" height="${barH}" rx="3" fill="${barColor}"/>
      <rect x="${cx - barW / 2}" y="${by + 34}" width="${barW}" height="${barH}" rx="3" fill="rgba(40,35,25,.52)"/>
      <rect x="${cx - barW / 2}" y="${by + 34}" width="${staminaW}" height="${barH}" rx="3" fill="${staminaColor}"/>
      <text x="${cx}" y="${by + 50}" text-anchor="middle" fill="#9fb9c5" font-family="var(--mono)" font-size="9" opacity=".82">STA ${vitals.staminaPercent}%</text>
    </g>`;
}

/** Tüm birlik tokenlerinin SVG markup'ını üret */
export function renderTokens(pid, prevPositions = {}, nextPositions = {}, phaseIndex = 0, prevPhaseIndex = 0, isoDate = '', animData = null) {
    const spreadNext = {};
    const spreadPrev = {};
    const UNIT_ENTRY = getUnitEntryPhaseIndex();
    const phase = BATTLE_DATA.phases[phaseIndex] || BATTLE_DATA.phases.find((item) => item.id === pid) || null;
    return BATTLE_DATA.units.map((u) => {
        const entryIndex = UNIT_ENTRY[u.id] ?? 0;
        if (phaseIndex < entryIndex) return '';

        const targetBase = nextPositions[u.id];
        if (!targetBase) return ''; // Yok olan veya henüz girmeyen birlik

        const phaseData = u.phases[pid];
        const intent = deriveUnitIntent(u, phase, phaseData || null, animData);
        const vitals = getTokenVitals(u, isoDate, animData);
        const vitalClass = getVitalClass(vitals);
        const f = BATTLE_DATA.factions[u.faction];
        const hasPrev = !!prevPositions[u.id];
        const isEntryFrame = phaseIndex === entryIndex && !hasPrev;

        const prev = isEntryFrame ? getUnitEntryOrigin(u, targetBase) : (prevPositions[u.id] || targetBase);
        const visible = phaseData ? 1 : 0.55;
        const prevOffset = getClusterOffset(spreadPrev, prev.x, prev.y, u, prevPhaseIndex);
        const targetOffset = getClusterOffset(spreadNext, targetBase.x, targetBase.y, u, phaseIndex);
        const sx = normalizeValue(Math.round(prev.x + prevOffset.x), VP_MIN_X, VP_MAX_X);
        const sy = normalizeValue(Math.round(prev.y + prevOffset.y), VP_MIN_Y, VP_MAX_Y);
        const targetPoint = getTerrainSafePointForUnit(targetBase.x + targetOffset.x, targetBase.y + targetOffset.y, u);
        const tx = normalizeValue(Math.round(targetPoint.x), VP_MIN_X, VP_MAX_X);
        const ty = normalizeValue(Math.round(targetPoint.y), VP_MIN_Y, VP_MAX_Y);
        const statusText = intent.statusText;
        const staminaLabel = vitals.base ? ` – stamina ${vitals.staminaPercent}% – kayıp ${formatStrength(vitals.loss)}` : '';
        const ariaLabel = `${u.name} – ${f.name} – ${intent.actionLabel} – ${intent.currentLocationName}${staminaLabel}`;
        const titleText = `${u.name} — ${intent.actionLabel} — ${intent.currentLocationName}${intent.targetLocationName && intent.targetLocationName !== intent.currentLocationName ? ` → ${intent.targetLocationName}` : ''}${staminaLabel}`;
        const pulseDur = vitals.stamina <= 0.35 ? 2.7 : vitals.lossRatio >= 0.35 ? 2.25 : 1.7;
        return `<g class="unit-token${vitalClass}" role="button" tabindex="0" aria-label="${ariaLabel}"
      data-unit-id="${u.id}"
      data-unit-name="${u.name}"
      data-unit-commander="${u.commander}"
      data-unit-strength="${u.strength}"
      data-current-strength="${vitals.current || ''}"
      data-unit-loss="${vitals.loss || 0}"
      data-loss-ratio="${vitals.lossRatio?.toFixed ? vitals.lossRatio.toFixed(3) : '0'}"
      data-stamina="${vitals.stamina?.toFixed ? vitals.stamina.toFixed(3) : '1'}"
      data-phase-status="${escapeAttr(statusText)}"
      data-phase-objective="${escapeAttr(intent.objectiveText)}"
      data-phase-outcome="${escapeAttr(intent.outcomeText)}"
      data-action-key="${intent.actionKey}"
      data-action-label="${escapeAttr(intent.actionLabel)}"
      data-current-location="${escapeAttr(intent.currentLocationId || '')}"
      data-current-location-name="${escapeAttr(intent.currentLocationName)}"
      data-target-location="${escapeAttr(intent.targetLocationId || '')}"
      data-target-location-name="${escapeAttr(intent.targetLocationName)}"
      data-front="${escapeAttr(intent.frontLabel || '')}"
      data-contact-summary="${escapeAttr(intent.contactLabel || '')}"
      data-target-x="${tx}" data-target-y="${ty}"
      style="transform:translate(${sx}px, ${sy}px);opacity:${visible};--stamina:${vitals.stamina || 1};--loss-ratio:${vitals.lossRatio || 0};--pulse-dur:${pulseDur}s">
      <title>${escapeAttr(titleText)}</title>
      ${vitalAdornment(u, vitals, intent)}
      ${actionAdornment(u, intent)}
      ${tokenShape(u, phaseData, f, 0, 0)}
      <text x="0" y="50" text-anchor="middle" fill="${f.colorLight}" font-family="var(--mono)" font-size="15" class="unit-label">
        ${u.name.length > 20 ? u.name.slice(0, 18) + '…' : u.name}
      </text>
      ${strengthBadge(0, 0, u, vitals)}
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
        const tx = +el.dataset.targetX;
        const ty = +el.dataset.targetY;
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;

        // Mobilde trail efektini atla — sadece pozisyon güncelle
        if (isMobileDevice) {
            el.style.transform = `translate(${tx}px, ${ty}px)`;
            return;
        }

        const from = getTokenTranslate(el);
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

    if (isMobileDevice) return; // Mobilde trail timer gereksiz

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

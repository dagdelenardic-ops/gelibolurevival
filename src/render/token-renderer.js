// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Token Renderer
// Birlik token SVG oluşturma, animasyon, highlight
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260618-3d-spectacle-r2';
import { VP_MIN_X, VP_MAX_X, VP_MIN_Y, VP_MAX_Y } from '../data/coordinate-map.js?v=20260618-3d-spectacle-r2';
import { normalizeValue } from '../engine/date-utils.js?v=20260618-3d-spectacle-r2';
import {
    unitSeed,
    getClusterOffset, getUnitEntryOrigin, getTerrainSafePointForUnit, getNavalDisplayOffset, isDestroyedPhaseData,
    isLockedPhaseData
} from '../engine/position-engine.js?v=20260618-3d-spectacle-r2';
import { getUnitEntryPhaseIndex } from '../engine/phase-engine.js?v=20260618-3d-spectacle-r2';
import { snapToSeaWater } from '../data/terrain-zones.js?v=20260618-3d-spectacle-r2';
import { deriveUnitIntent } from '../engine/unit-intelligence.js?v=20260618-3d-spectacle-r2';
import { getUnitVitals, formatStrength } from '../data/casualty-model.js?v=20260618-3d-spectacle-r2';
import { getUnitVisualProfile, getSpriteSetId, hasRuntimeSpriteAtlas } from '../data/unit-visual-profiles.js?v=20260618-3d-spectacle-r2';

// ══════════════════════════════════════════════════════════════
// SANCAK SİSTEMİ — dönem bayrakları (1915)
// Kara birimleri direk + dalgalanan sancakla temsil edilir:
//   Osmanlı → al sancak (hilal-yıldız), İngiliz → Union Jack,
//   ANZAC → mavi ensign (UJ kanton + Güney Haçı), Fransız → trikolor.
// Gemiler kıçlarında küçük ensign taşır (İngiliz → White Ensign).
// ══════════════════════════════════════════════════════════════

const FLAG_CREAM = '#f1e7cd';
const FLAG_RED = '#a83a31';
const FLAG_UJ_NAVY = '#2b4470';

/** unitClass → sancak ölçüleri (2451×3467 harita için) */
const FLAG_DIMS = {
    army_hq: { W: 58, H: 36, pole: 86 },
    corps: { W: 52, H: 32, pole: 78 },
    division: { W: 47, H: 29, pole: 70 },
    brigade: { W: 41, H: 26, pole: 62 },
    regiment: { W: 37, H: 23, pole: 56 },
    battery: { W: 37, H: 23, pole: 56 }
};

function getFlagDims(unitClass) {
    return FLAG_DIMS[unitClass] || FLAG_DIMS.brigade;
}

/** N köşeli yıldız path'i (rotDeg=0 → bir ucu sağa bakar) */
function starPath(cx, cy, rOut, points = 5, rotDeg = -90) {
    const rIn = rOut * (points >= 7 ? .52 : .42);
    let d = '';
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? rOut : rIn;
        const a = (Math.PI / points) * i + rotDeg * Math.PI / 180;
        d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
    }
    return d + 'Z';
}

/** Dalgalı kumaş konturu: gönder kenarı (x=0) düz, uçkur ucu hafif S dalgalı */
function flagClothPath(W, H, amp) {
    const a = Number.isFinite(amp) ? amp : Math.max(1.5, H * .085);
    return `M0 0 C${(W * .3).toFixed(1)} ${(-a).toFixed(1)} ${(W * .62).toFixed(1)} ${(a * .85).toFixed(1)} ${W} ${(-a * .62).toFixed(1)} ` +
        `L${W} ${(H - a * .62).toFixed(1)} C${(W * .62).toFixed(1)} ${(H + a).toFixed(1)} ${(W * .3).toFixed(1)} ${(H - a * .85).toFixed(1)} 0 ${H} Z`;
}

/**
 * Bayrak zemini + deseni (lokal 0..W, 0..H — clip'lenecek şekilde taşmalı çizer).
 * variant: faction id veya 'white-ensign' (Royal Navy savaş sancağı).
 */
function renderFlagFace(variant, W, H) {
    const over = `x="${-W * .12}" y="${-H * .35}" width="${W * 1.26}" height="${H * 1.7}"`;
    switch (variant) {
        case 'ottoman': {
            const field = '#a32e27';
            const cy = H / 2;
            const r = H * .31;
            const cx = W * .40;
            return `<rect ${over} fill="${field}"/>
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="${FLAG_CREAM}"/>
                <circle cx="${(cx + r * .38).toFixed(1)}" cy="${cy}" r="${(r * .82).toFixed(1)}" fill="${field}"/>
                <path d="${starPath(cx + r * 1.5, cy, H * .145, 5, 0)}" fill="${FLAG_CREAM}"/>`;
        }
        case 'british': {
            const diag = `M0 0 L${W} ${H} M${W} 0 L0 ${H}`;
            const cross = `M${W / 2} 0 L${W / 2} ${H} M0 ${H / 2} L${W} ${H / 2}`;
            return `<rect ${over} fill="${FLAG_UJ_NAVY}"/>
                <path d="${diag}" stroke="${FLAG_CREAM}" stroke-width="${(H * .26).toFixed(1)}"/>
                <path d="${diag}" stroke="${FLAG_RED}" stroke-width="${(H * .09).toFixed(1)}"/>
                <path d="${cross}" stroke="${FLAG_CREAM}" stroke-width="${(H * .34).toFixed(1)}"/>
                <path d="${cross}" stroke="${FLAG_RED}" stroke-width="${(H * .18).toFixed(1)}"/>`;
        }
        case 'anzac': {
            const cw = W * .5, ch = H * .52;
            const canton = `<rect x="0" y="0" width="${cw}" height="${ch}" fill="${FLAG_UJ_NAVY}"/>
                <path d="M0 0 L${cw} ${ch} M${cw} 0 L0 ${ch}" stroke="${FLAG_CREAM}" stroke-width="${(H * .07).toFixed(1)}"/>
                <path d="M${cw / 2} 0 L${cw / 2} ${ch} M0 ${ch / 2} L${cw} ${ch / 2}" stroke="${FLAG_CREAM}" stroke-width="${(H * .11).toFixed(1)}"/>
                <path d="M${cw / 2} 0 L${cw / 2} ${ch} M0 ${ch / 2} L${cw} ${ch / 2}" stroke="${FLAG_RED}" stroke-width="${(H * .055).toFixed(1)}"/>`;
            // Güney Haçı (uçkur yarısı) + Commonwealth yıldızı (kanton altı)
            const stars = [
                { x: W * .74, y: H * .15, r: H * .085 },
                { x: W * .62, y: H * .44, r: H * .08 },
                { x: W * .74, y: H * .82, r: H * .085 },
                { x: W * .875, y: H * .42, r: H * .075 },
                { x: W * .79, y: H * .55, r: H * .05 }
            ].map((s) => `<path d="${starPath(s.x, s.y, s.r, 5)}" fill="${FLAG_CREAM}"/>`).join('');
            return `<rect ${over} fill="#22365c"/>${canton}${stars}
                <path d="${starPath(W * .25, H * .78, H * .15, 7)}" fill="${FLAG_CREAM}"/>`;
        }
        case 'french':
            return `<rect ${over} fill="#33518f"/>
                <rect x="${(W / 3).toFixed(1)}" y="${-H * .35}" width="${(W / 3).toFixed(1)}" height="${H * 1.7}" fill="${FLAG_CREAM}"/>
                <rect x="${(W * 2 / 3).toFixed(1)}" y="${-H * .35}" width="${(W / 3 + W * .14).toFixed(1)}" height="${H * 1.7}" fill="#ab3a30"/>`;
        case 'white-ensign': {
            const cw = W * .44, ch = H * .5;
            return `<rect ${over} fill="${FLAG_CREAM}"/>
                <path d="M${W / 2} 0 L${W / 2} ${H} M0 ${H / 2} L${W} ${H / 2}" stroke="${FLAG_RED}" stroke-width="${(H * .16).toFixed(1)}"/>
                <rect x="0" y="0" width="${cw}" height="${ch}" fill="${FLAG_UJ_NAVY}"/>
                <path d="M0 0 L${cw} ${ch} M${cw} 0 L0 ${ch}" stroke="${FLAG_CREAM}" stroke-width="${(H * .055).toFixed(1)}"/>
                <path d="M${cw / 2} 0 L${cw / 2} ${ch} M0 ${ch / 2} L${cw} ${ch / 2}" stroke="${FLAG_CREAM}" stroke-width="${(H * .09).toFixed(1)}"/>
                <path d="M${cw / 2} 0 L${cw / 2} ${ch} M0 ${ch / 2} L${cw} ${ch / 2}" stroke="${FLAG_RED}" stroke-width="${(H * .045).toFixed(1)}"/>`;
        }
        default:
            return `<rect ${over} fill="#6b675a"/>`;
    }
}

/**
 * Komple kumaş: clip + desen + uçkur gölgesi + kontur (+ SMIL dalgalanma).
 * Lokal koordinat: gönder üst köşesi (0,0), kumaş 0..W × 0..H.
 */
function renderFlagCloth(variant, W, H, clipId, opts = {}) {
    const cloth = flagClothPath(W, H, opts.waveAmp);
    const flutter = opts.flutterDur
        ? `<animateTransform attributeName="transform" type="skewY" values="0;-2.4;0;2.6;0" dur="${opts.flutterDur}s" repeatCount="indefinite"/>`
        : '';
    const shade = opts.shade === false
        ? ''
        : `<path d="${cloth}" fill="url(#flagShadeG)" opacity=".9"/>`;
    return `<g class="unit-flag-cloth">
        ${flutter}
        <clipPath id="${clipId}"><path d="${cloth}"/></clipPath>
        <g clip-path="url(#${clipId})">${renderFlagFace(variant, W, H)}</g>
        ${shade}
        <path d="${cloth}" fill="none" stroke="rgba(24,16,11,.85)" stroke-width="${opts.outline ?? 1.4}" stroke-linejoin="round"/>
    </g>`;
}

/** Faction SVG ikonu (legend için) — harita sancaklarıyla aynı dil */
export function factionSVG(f, s) {
    const W = 21, H = 13;
    return `<svg width="${Math.round(s * 2.2)}" height="${Math.round(s * 1.5)}" viewBox="0 0 30 20">
        <line x1="3.5" y1="18.5" x2="3.5" y2="1.5" stroke="#4a3b26" stroke-width="1.6"/>
        <circle cx="3.5" cy="1.6" r="1.3" fill="#c9a85c"/>
        <g transform="translate(4.6 2.6)">${renderFlagCloth(f.id, W, H, `lgf-${f.id}`, { shade: false, outline: .9, waveAmp: 1.1 })}</g>
    </svg>`;
}

const NAVAL_VISUAL_PROFILES = {
    battleship: {
        role: 'battleship',
        length: 92,
        beam: 22,
        scale: .84,
        deckInset: 10,
        bridge: { x: 2, y: -8, w: 22, h: 13 },
        funnels: [{ x: -11, y: 0 }, { x: -22, y: 0 }],
        turrets: [{ x: 31, y: -5 }, { x: 31, y: 5 }, { x: -32, y: -5 }, { x: -32, y: 5 }],
        mast: true,
        wake: 48
    },
    flagship: {
        role: 'flagship',
        length: 108,
        beam: 25,
        scale: .78,
        deckInset: 12,
        bridge: { x: 5, y: -9, w: 26, h: 15 },
        funnels: [{ x: -12, y: 0 }, { x: -25, y: 0 }],
        turrets: [{ x: 38, y: -6 }, { x: 38, y: 6 }, { x: -39, y: -6 }, { x: -39, y: 6 }],
        mast: true,
        wake: 58
    },
    frenchBattleship: {
        role: 'battleship',
        length: 88,
        beam: 21,
        scale: .84,
        deckInset: 10,
        bridge: { x: 0, y: -8, w: 21, h: 12 },
        funnels: [{ x: -10, y: 0 }, { x: -21, y: 0 }, { x: -30, y: 0 }],
        turrets: [{ x: 29, y: -5 }, { x: -30, y: 5 }],
        mast: true,
        wake: 46
    },
    minelayer: {
        role: 'minelayer',
        length: 66,
        beam: 17,
        scale: .74,
        deckInset: 8,
        bridge: { x: 7, y: -6, w: 16, h: 10 },
        funnels: [{ x: -12, y: 0 }],
        turrets: [{ x: 24, y: 0 }],
        mast: true,
        wake: 34
    },
    trawlerFlotilla: {
        role: 'minesweeper',
        length: 48,
        beam: 13,
        scale: .8,
        deckInset: 6,
        bridge: { x: 2, y: -5, w: 13, h: 8 },
        funnels: [{ x: -10, y: 0 }],
        turrets: [],
        mast: false,
        wake: 26
    },
    landingShip: {
        role: 'landing-ship',
        length: 82,
        beam: 24,
        scale: .86,
        deckInset: 7,
        bridge: { x: -8, y: -8, w: 24, h: 13 },
        funnels: [{ x: -25, y: 0 }],
        turrets: [],
        mast: false,
        wake: 20
    }
};

const NAVAL_DEFAULT_HEADINGS = {
    'hms-queen-elizabeth': -35,
    'hms-irresistible': -28,
    'hms-ocean': -32,
    'bouvet': -30,
    'suffren': -34,
    'allied-minesweepers': -42,
    'nusret': 128,
    'ss-river-clyde': -18
};

function isNavalUnit(unit) {
    return unit.type === 'deniz' || unit.entityType === 'landing_boat';
}

function renderTokenHitTarget(unit) {
    if (isNavalUnit(unit)) {
        const profile = getNavalVisualProfile(unit);
        const width = Math.max(58, Math.round(profile.length + 24));
        const height = Math.max(42, Math.round(profile.beam + 30));
        return `<rect class="unit-hit-target" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" rx="14" aria-hidden="true"/>`;
    }

    const dims = getFlagDims(unit.unitClass);
    return `<rect class="unit-hit-target" x="-18" y="${-(dims.pole + 20)}" width="${dims.W + 32}" height="${dims.pole + 44}" rx="12" aria-hidden="true"/>`;
}

function getNavalVisualProfile(unit) {
    if (unit.id === 'hms-queen-elizabeth') return NAVAL_VISUAL_PROFILES.flagship;
    if (unit.id === 'nusret') return NAVAL_VISUAL_PROFILES.minelayer;
    if (unit.id === 'allied-minesweepers') return NAVAL_VISUAL_PROFILES.trawlerFlotilla;
    if (unit.id === 'ss-river-clyde' || unit.entityType === 'landing_boat') return NAVAL_VISUAL_PROFILES.landingShip;
    if (unit.faction === 'french') return NAVAL_VISUAL_PROFILES.frenchBattleship;
    return NAVAL_VISUAL_PROFILES.battleship;
}

function isDamagedPhaseData(phaseData) {
    if (!phaseData || typeof phaseData !== 'object') return false;
    const status = String(phaseData.status || '').toLowerCase();
    const outcome = String(phaseData.outcome || '').toLowerCase();
    return status.includes('hasar') || outcome.includes('hasar') || status.includes('yaralı') || outcome.includes('yaralı');
}

function getNavalLabelY(unit) {
    const profile = getNavalVisualProfile(unit);
    return Math.max(54, Math.round(profile.beam * 1.8 + 24));
}

function renderWake(profile, isSunk) {
    if (isSunk) return '';
    const w = profile.wake;
    const beam = profile.beam;
    const stern = -profile.length / 2 + 3;
    return `<g class="naval-wake-group" aria-hidden="true">
        <path class="naval-wake naval-wake-main" d="M${stern} ${-beam * .45} C${stern - w * .24} ${-beam * .95} ${stern - w * .72} ${-beam * 1.14} ${stern - w} ${-beam * .78}"/>
        <path class="naval-wake naval-wake-main" d="M${stern} ${beam * .45} C${stern - w * .24} ${beam * .95} ${stern - w * .72} ${beam * 1.14} ${stern - w} ${beam * .78}"/>
        <path class="naval-wake naval-wake-soft" d="M${stern - 4} 0 C${stern - w * .34} ${-beam * .12} ${stern - w * .76} ${beam * .1} ${stern - w * 1.18} 0"/>
    </g>`;
}

function renderGunTurret(x, y, color, light, index, activeGuns = false) {
    const delay = `${(index * .16).toFixed(2)}s`;
    let rotationAnimation = '';
    if (activeGuns) {
        const dur = `${2.2 + index * 0.4}s`;
        const fromAngle = -15 - (index % 3) * 10;
        const toAngle = 15 + (index % 2) * 12;
        rotationAnimation = `<animateTransform attributeName="transform" type="rotate"
            values="0; ${fromAngle}; ${toAngle}; 0"
            dur="${dur}" repeatCount="indefinite"/>`;
    }
    return `<g class="naval-turret" transform="translate(${x} ${y})" style="--gun-delay:${delay}">
        <g>
            ${rotationAnimation}
            <rect x="-5.2" y="-3.2" width="10.4" height="6.4" rx="2.2" fill="${light}" opacity=".88" stroke="rgba(20,16,12,.62)" stroke-width=".8"/>
            <line x1="2" y1="0" x2="18" y2="0" stroke="#1e2429" stroke-width="2.2" stroke-linecap="round"/>
            <circle class="naval-gun-flash" cx="20" cy="0" r="4.2" fill="rgba(242,196,92,.72)"/>
        </g>
    </g>`;
}

function renderSmoke(profile, color, isSunk, isDamaged) {
    const stacks = profile.funnels.length ? profile.funnels : [{ x: -12, y: 0 }];
    const smokeOpacity = isSunk ? '.34' : isDamaged ? '.23' : '.13';
    return stacks.map((funnel, index) => {
        const delay = `${(index * .38).toFixed(2)}s`;
        const height = isSunk ? 32 : isDamaged ? 24 : 17;
        return `<g class="naval-funnel" transform="translate(${funnel.x} ${funnel.y})">
            <rect x="-3.4" y="-7.2" width="6.8" height="11.5" rx="1.8" fill="#2b2a26" stroke="${color}" stroke-width=".85" opacity=".82"/>
            <path class="naval-smoke" style="--smoke-delay:${delay}" d="M-1.4 -8 C-7 -18 5 -22 -2 -${height}" fill="none" stroke="rgba(90,84,74,${smokeOpacity})" stroke-width="${isSunk ? 5.2 : isDamaged ? 3.8 : 2.6}" stroke-linecap="round"/>
        </g>`;
    }).join('');
}

/**
 * Kıç ensign'i — top-down silüette kıçtan geriye doğru uzanan küçük sancak.
 * rotate(180) kumaşı kıç yönüne çevirir (desen 13px'te simetrik, sorun değil).
 */
function renderSternEnsign(unit, profile, isSunk) {
    if (isSunk) return '';
    const variant = unit.faction === 'british'
        ? 'white-ensign'
        : unit.faction === 'anzac' ? 'british' : unit.faction;
    const W = 15, H = 9.5;
    const stern = -profile.length / 2;
    return `<g class="naval-ensign" transform="translate(${(stern - 1.5).toFixed(1)} 0) rotate(180)" opacity=".94" aria-hidden="true">
        <line x1="-4" y1="0" x2="1.5" y2="0" stroke="#3a2d1d" stroke-width="1.3"/>
        <g transform="translate(1.5 ${-H / 2})">${renderFlagCloth(variant, W, H, `ens-${unit.id}`, { shade: false, outline: .8, waveAmp: 1, flutterDur: '2.1' })}</g>
    </g>`;
}

function renderBattleshipSilhouette(unit, f, profile, phaseData, intent) {
    const c = f.color;
    const cl = f.colorLight;
    const isFlagship = unit.id === 'hms-queen-elizabeth' || unit.id === 'nusret';
    const isSunk = isDestroyedPhaseData(phaseData);
    const isDamaged = isDamagedPhaseData(phaseData);
    const l = profile.length;
    const b = profile.beam;
    const deckInset = profile.deckInset;
    const hullD = `M${(-l / 2).toFixed(1)} ${(-b * .58).toFixed(1)}
        C${(-l * .36).toFixed(1)} ${(-b * .96).toFixed(1)} ${(l * .16).toFixed(1)} ${(-b * .93).toFixed(1)} ${(l / 2).toFixed(1)} 0
        C${(l * .16).toFixed(1)} ${(b * .93).toFixed(1)} ${(-l * .36).toFixed(1)} ${(b * .96).toFixed(1)} ${(-l / 2).toFixed(1)} ${(b * .58).toFixed(1)} Z`;
    const deckD = `M${(-l / 2 + deckInset).toFixed(1)} ${(-b * .34).toFixed(1)}
        C${(-l * .2).toFixed(1)} ${(-b * .55).toFixed(1)} ${(l * .18).toFixed(1)} ${(-b * .45).toFixed(1)} ${(l / 2 - deckInset * .55).toFixed(1)} 0
        C${(l * .18).toFixed(1)} ${(b * .45).toFixed(1)} ${(-l * .2).toFixed(1)} ${(b * .55).toFixed(1)} ${(-l / 2 + deckInset).toFixed(1)} ${(b * .34).toFixed(1)} Z`;
    const bridge = profile.bridge;
    const activeGuns = ['bombarding', 'engaged'].includes(intent?.actionKey);
    const activeMinelaying = intent?.actionKey === 'minelaying';

    return `<g class="naval-ship-core${isSunk ? ' is-sunk-core' : ''}${isDamaged ? ' is-damaged-core' : ''}${activeGuns ? ' is-firing-core' : ''}">
        ${renderWake(profile, isSunk)}
        <ellipse class="naval-ship-shadow" cx="${(-l * .08).toFixed(1)}" cy="${(b * .42).toFixed(1)}" rx="${(l * .52).toFixed(1)}" ry="${(b * .72).toFixed(1)}"/>
        <path class="naval-hull" d="${hullD}" fill="${c}" stroke="${cl}" stroke-width="2.4" opacity="${isSunk ? '.5' : '.96'}"/>
        <path class="naval-keel-line" d="M${(-l / 2 + 8).toFixed(1)} 0 L${(l / 2 - 7).toFixed(1)} 0"/>
        <path class="naval-deck" d="${deckD}" fill="${cl}" opacity="${isSunk ? '.32' : '.82'}"/>
        <rect class="naval-bridge" x="${bridge.x - bridge.w / 2}" y="${bridge.y}" width="${bridge.w}" height="${bridge.h}" rx="3.2" fill="#ded0a4" stroke="rgba(24,20,16,.68)" stroke-width="1" opacity="${isSunk ? '.42' : '.88'}"/>
        <path class="naval-bow-cut" d="M${(l / 2 - 17).toFixed(1)} 0 L${(l / 2 - 4).toFixed(1)} 0" stroke="#f0dfb2" stroke-width="1.6" opacity=".66"/>
        ${profile.turrets.map((turret, index) => renderGunTurret(turret.x, turret.y, c, cl, index, activeGuns)).join('')}
        ${renderSmoke(profile, cl, isSunk, isDamaged)}
        ${profile.mast ? `<g class="naval-mast">
            <line x1="${bridge.x}" y1="${bridge.y - 4}" x2="${bridge.x}" y2="${bridge.y - 28}" stroke="${cl}" stroke-width="1.25" opacity=".82"/>
            <line x1="${bridge.x}" y1="${bridge.y - 24}" x2="${bridge.x + 17}" y2="${bridge.y - 18}" stroke="${cl}" stroke-width=".9" opacity=".64"/>
            ${isFlagship ? `<polygon points="${bridge.x + 1},${bridge.y - 28} ${bridge.x + 17},${bridge.y - 24} ${bridge.x + 1},${bridge.y - 19}" fill="#f6e5a7" opacity=".9"/>` : ''}
        </g>` : ''}
        ${unit.id === 'nusret' ? renderMinelayerRails(profile, cl, isSunk, activeMinelaying) : ''}
        ${renderSternEnsign(unit, profile, isSunk)}
        ${isDamaged || isSunk ? renderNavalDamage(profile, isSunk) : ''}
    </g>`;
}

function renderMinelayerRails(profile, light, isSunk, activeMinelaying = false) {
    const stern = -profile.length / 2 + 9;
    const mines = Array.from({ length: 4 }, (_, index) => {
        const x = stern + index * 7;
        let anim = '';
        if (activeMinelaying) {
            const delay = `${index * 0.6}s`;
            anim = `<animate attributeName="cx" values="${x};${stern - 15}" dur="2.4s" repeatCount="indefinite" begin="${delay}"/>
                    <animate attributeName="opacity" values="1;1;0" dur="2.4s" repeatCount="indefinite" begin="${delay}"/>`;
        }
        return `<circle class="naval-deck-mine" cx="${x}" cy="${profile.beam * .4}" r="2.8" fill="#1c1b18" stroke="${light}" stroke-width=".8" opacity="${isSunk ? '.3' : '.84'}">
            ${anim}
        </circle>`;
    }).join('');
    return `<g class="naval-minelayer-gear">
        <line x1="${stern - 4}" y1="${profile.beam * .48}" x2="${stern + 28}" y2="${profile.beam * .48}" stroke="${light}" stroke-width="1.4" opacity=".62"/>
        ${mines}
    </g>`;
}

function renderNavalDamage(profile, isSunk) {
    const l = profile.length;
    const b = profile.beam;
    const plumeCount = isSunk ? 3 : 2;
    const plumes = Array.from({ length: plumeCount }, (_, index) => {
        const x = -l * .12 + index * 16;
        const y = -b * .72 - index * 2;
        return `<path class="naval-damage-smoke" style="--damage-delay:${(index * .22).toFixed(2)}s" d="M${x} ${y} C${x - 12} ${y - 16} ${x + 10} ${y - 21} ${x - 3} ${y - 34}" fill="none"/>`;
    }).join('');
    return `<g class="naval-damage" aria-hidden="true">
        <circle class="naval-hit-glow" cx="${(l * .08).toFixed(1)}" cy="${(-b * .18).toFixed(1)}" r="${isSunk ? 13 : 8}"/>
        ${plumes}
        ${isSunk ? `<path class="naval-sunk-cross" d="M${(-l * .26).toFixed(1)} ${(-b * .9).toFixed(1)} L${(l * .24).toFixed(1)} ${(b * .9).toFixed(1)} M${(l * .24).toFixed(1)} ${(-b * .9).toFixed(1)} L${(-l * .26).toFixed(1)} ${(b * .9).toFixed(1)}"/>` : ''}
    </g>`;
}

function renderMiniTrawler(x, y, f, index, isSunk = false, isDamaged = false) {
    const c = f.color;
    const cl = f.colorLight;
    const op = isSunk ? '.4' : isDamaged ? '.75' : '.94';
    return `<g class="naval-trawler-boat" transform="translate(${x} ${y})" style="--boat-delay:${(index * .18).toFixed(2)}s">
        <path d="M-18 -5 C-10 -9 8 -8 20 0 C9 8 -10 8 -18 5 Z" fill="${c}" stroke="${cl}" stroke-width="1.7" opacity="${op}"/>
        <rect x="-4" y="-8" width="12" height="8" rx="2.2" fill="${cl}" opacity="${isSunk ? '.3' : '.78'}"/>
        <line x1="-13" y1="0" x2="-24" y2="0" stroke="${cl}" stroke-width="1" opacity="${isSunk ? '.2' : '.6'}"/>
        ${!isSunk ? `<path class="naval-wake naval-wake-soft" d="M-18 -4 C-32 -12 -42 -8 -52 -2 M-18 4 C-32 12 -42 8 -52 2"/>` : ''}
    </g>`;
}

function renderTrawlerFlotilla(unit, f, profile, phaseData) {
    const isSunk = isDestroyedPhaseData(phaseData);
    const isDamaged = isDamagedPhaseData(phaseData);
    return `<g class="naval-ship-core naval-flotilla-core${isSunk ? ' is-sunk-core' : ''}${isDamaged ? ' is-damaged-core' : ''}">
        <path class="naval-sweep-cable" d="M-52 -21 C-20 -38 18 -36 48 -18 M-52 21 C-20 38 18 36 48 18" opacity="${isSunk ? '.3' : '.7'}"/>
        ${renderMiniTrawler(-10, -16, f, 0, isSunk, isDamaged)}
        ${renderMiniTrawler(8, 0, f, 1, isSunk, isDamaged)}
        ${renderMiniTrawler(-12, 17, f, 2, isSunk, isDamaged)}
        <g class="naval-sweep-mines" opacity="${isSunk ? '.2' : '1'}">
            <circle cx="48" cy="-18" r="3.4"/>
            <circle cx="54" cy="18" r="3.4"/>
        </g>
        ${isDamaged || isSunk ? renderNavalDamage(profile, isSunk) : ''}
    </g>`;
}

function renderLandingShip(unit, f, profile, phaseData) {
    const c = f.color;
    const cl = f.colorLight;
    const l = profile.length;
    const b = profile.beam;
    const isSunk = isDestroyedPhaseData(phaseData);
    const isDamaged = isDamagedPhaseData(phaseData);
    return `<g class="naval-ship-core naval-landing-core${isSunk ? ' is-sunk-core' : ''}${isDamaged ? ' is-damaged-core' : ''}">
        ${renderWake(profile, isSunk)}
        <ellipse class="naval-ship-shadow" cx="-8" cy="${b * .5}" rx="${l * .5}" ry="${b * .72}"/>
        <path class="naval-hull" d="M${-l / 2} ${-b * .55} L${l * .32} ${-b * .55} L${l / 2} 0 L${l * .32} ${b * .55} L${-l / 2} ${b * .55} Z" fill="${c}" stroke="${cl}" stroke-width="2.2" opacity="${isSunk ? '.5' : '.94'}"/>
        <rect x="${-l * .34}" y="${-b * .32}" width="${l * .5}" height="${b * .64}" rx="2.8" fill="${cl}" opacity="${isSunk ? '.32' : '.68'}"/>
        <path class="naval-ramp" d="M${l * .38} ${-b * .28} L${l * .72} ${-b * .44} M${l * .38} ${b * .28} L${l * .72} ${b * .44}" stroke="#e7d8ad" stroke-width="2.2" stroke-linecap="round" opacity="${isSunk ? '.28' : '.78'}"/>
        <path class="naval-beach-dust" d="M${l * .44} ${b * .48} C${l * .66} ${b * .62} ${l * .82} ${b * .48} ${l} ${b * .58}" fill="none"/>
        ${isDamaged || isSunk ? renderNavalDamage(profile, isSunk) : ''}
    </g>`;
}

function navalTokenShape(unit, f, cx, cy, phaseData, heading = 0, intent = null) {
    const profile = getNavalVisualProfile(unit);
    const isSunk = isDestroyedPhaseData(phaseData);
    const isDamaged = isDamagedPhaseData(phaseData);
    const listing = isSunk ? (unitSeed(unit.id) % 2 ? 12 : -13) : isDamaged ? (unitSeed(unit.id) % 2 ? 4 : -4) : 0;
    const roleClass = ` naval-role-${profile.role}`;
    const stateClass = `${isSunk ? ' is-ship-sunk' : ''}${isDamaged ? ' is-ship-damaged' : ''}`;
    let body = '';
    if (profile.role === 'minesweeper') body = renderTrawlerFlotilla(unit, f, profile, phaseData);
    else if (profile.role === 'landing-ship') body = renderLandingShip(unit, f, profile, phaseData);
    else body = renderBattleshipSilhouette(unit, f, profile, phaseData, intent);

    const scale = Number.isFinite(profile.scale) ? profile.scale : .84;
    return `<g class="naval-visual${roleClass}${stateClass}" transform="translate(${cx} ${cy}) rotate(${heading.toFixed(1)}) rotate(${listing}) scale(${scale})" data-heading="${heading.toFixed(1)}" data-listing="${listing}" data-scale="${scale}">
        ${body}
    </g>`;
}

/** unitClass bazlı token radius (2451×3467 viewport için ölçekli) */
function getTokenRadius(unitClass) {
    const radii = { army_hq: 35, corps: 30, division: 27, brigade: 22, regiment: 19, battery: 24, mine_layer: 24, ship: 24 };
    return radii[unitClass] || 27;
}

/** unitClass bazlı kademe işareti — sancağın üstünde parşömen yazı */
function unitClassMarker(unitClass, W, pole) {
    const labels = {
        army_hq: '★★★', corps: 'XX', division: '××',
        brigade: '×', regiment: 'III', battery: '⌇⌇'
    };
    const label = labels[unitClass];
    if (!label) return '';
    const size = unitClass === 'army_hq' ? 15 : unitClass === 'corps' ? 14 : 12;
    return `<text class="unit-echelon-marker" x="${(1.2 + W * .52).toFixed(1)}" y="${-(pole + 10)}" text-anchor="middle"
        fill="#ead9ab" stroke="rgba(22,15,10,.85)" stroke-width="2.6" paint-order="stroke"
        font-size="${size}" font-weight="bold" font-family="var(--mono)">${label}</text>`;
}

/**
 * Kara birimi sancak token'ı — taban pimi birimin harita konumudur,
 * direk yukarı uzanır, dönem bayrağı dalgalanır.
 */
function flagTokenShape(unit, f, phaseData, intent) {
    const { W, H, pole } = getFlagDims(unit.unitClass);
    const destroyed = isDestroyedPhaseData(phaseData);
    const seed = unitSeed(unit.id);
    const combatActive = ['engaged', 'bombarding', 'landing', 'advancing'].includes(intent?.actionKey);
    const flutterDur = destroyed
        ? 0
        : combatActive
            ? (1.25 + (seed % 3) * .12).toFixed(2)
            : (3 + (seed % 5) * .24).toFixed(2);
    const cloth = renderFlagCloth(unit.faction, W, H, `fcl-${unit.id}`, { flutterDur });
    const firing = ['engaged', 'bombarding'].includes(intent?.actionKey);
    const flashes = firing && !destroyed ? `<g class="unit-flag-combat" aria-hidden="true">
        <circle class="flag-muzzle" cx="-12" cy="-7" r="2.7" style="--mz-delay:0s"/>
        <circle class="flag-muzzle" cx="13" cy="-4" r="2.3" style="--mz-delay:.46s"/>
        <circle class="flag-muzzle" cx="4" cy="-14" r="2.5" style="--mz-delay:.92s"/>
    </g>` : '';
    return `<g class="unit-flag-standard${destroyed ? ' is-flag-fallen' : ''}">
        <ellipse class="flag-ground-shadow" cx="2.5" cy="3.8" rx="${Math.max(11, W * .26).toFixed(1)}" ry="4.2" fill="rgba(8,6,4,.34)"/>
        <g${destroyed ? ' transform="rotate(-38)"' : ''}>
            <line x1="0" y1="3" x2="0" y2="${-pole}" stroke="#3a2d1d" stroke-width="3"/>
            <line x1="-.8" y1="3" x2="-.8" y2="${-pole}" stroke="rgba(216,188,138,.38)" stroke-width=".9"/>
            <circle cx="0" cy="${-pole - 3}" r="3.1" fill="#c9a85c" stroke="rgba(38,26,15,.85)" stroke-width=".9"/>
            <g transform="translate(1.2 ${-pole})">${cloth}</g>
        </g>
        <circle class="flag-base-pin" cx="0" cy="0" r="6.6" fill="${f.color}" stroke="#ead9ab" stroke-width="1.7"/>
        <circle cx="0" cy="0" r="2.1" fill="#ead9ab" opacity=".85"/>
        ${flashes}
        ${destroyed ? '' : unitClassMarker(unit.unitClass, W, pole)}
    </g>`;
}

/** Token şekli (harita üstü birlik sembolü) */
function tokenShape(unit, phaseData, f, cx, cy, heading = 0, intent = null) {
    if (isNavalUnit(unit)) return navalTokenShape(unit, f, cx, cy, phaseData, heading, intent);
    return flagTokenShape(unit, f, phaseData, intent);
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
    return {
        vitals: getUnitVitals(unit.id, isoDate, intensity, unitState, unit.strength || 0),
        unitState,
        intensity
    };
}

/**
 * Görsel imza: token'ın İÇ markup'ını etkileyen ayrık durumların özeti.
 * token-animator bu imza değişmedikçe iç DOM'a dokunmaz — duman, dalga,
 * SMIL animasyonları kesintisiz akar. Günlük değişen sayılar (kuvvet
 * badge'i, title) imza dışıdır; animatör onları yerinde yamar.
 * Gemi rotası (heading) bilinçli olarak imza dışı: animatör tween'ler.
 */
function computeVisualSig(unit, phaseData, intent, vitals, hasSprite) {
    const sunk = isDestroyedPhaseData(phaseData) ? 'sunk' : '';
    const damaged = isDamagedPhaseData(phaseData) ? 'dmg' : '';
    const stressed = !!vitals?.base && !isNavalUnit(unit)
        && (vitals.stamina <= 0.58 || vitals.lossRatio >= 0.18 || (vitals.todayLoss || 0) >= 180);
    const vitalTier = !stressed
        ? ''
        : (vitals.stamina <= 0.24 || vitals.lossRatio >= 0.4)
            ? 'crit'
            : (vitals.stamina <= 0.42 || vitals.lossRatio >= 0.24)
                ? 'fat'
                : 'mild';
    const tickBucket = stressed ? Math.min(4, Math.max(1, Math.round(vitals.lossRatio * 8))) : 0;
    return [
        intent?.actionKey || '',
        intent?.actionColor || '',
        sunk, damaged, vitalTier, tickBucket,
        hasSprite ? 'spr' : 'sym'
    ].join('|');
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

    if (isNavalUnit(unit)) {
        const profile = getNavalVisualProfile(unit);
        const rx = Math.max(34, Math.round(profile.length * .58));
        const ry = Math.max(20, Math.round(profile.beam * 1.1));
        return `<g class="unit-action-adornment" aria-hidden="true">
          <ellipse class="unit-action-ring naval-action-ring" data-action-key="${intent.actionKey}" cx="0" cy="0" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="1.1" opacity=".8"${dashArray ? ` stroke-dasharray="${dashArray}"` : ''}/>
          <circle class="unit-action-pip" cx="${rx - 7}" cy="${-ry + 5}" r="2.8" fill="${color}" stroke="rgba(20, 18, 16, .92)" stroke-width=".85"/>
        </g>`;
    }

    const r = getTokenRadius(unit.unitClass) + 3;
    // Sancak token'ı: süsler taban pimini değil BAYRAK BAŞINI çevreler.
    const fd = getFlagDims(unit.unitClass);
    const fcx = (1.2 + fd.W / 2).toFixed(1);
    const fcy = (-fd.pole + fd.H / 2).toFixed(1);
    return `<g class="unit-action-adornment" aria-hidden="true" transform="translate(${fcx} ${fcy})">
      <circle class="unit-action-ring" data-action-key="${intent.actionKey}" cx="0" cy="0" r="${r}" fill="none" stroke="${color}" stroke-width="1.1" opacity=".8"${dashArray ? ` stroke-dasharray="${dashArray}"` : ''}/>
      <circle class="unit-action-pip" cx="${r - 1}" cy="${-r + 1}" r="2.2" fill="${color}" stroke="rgba(20, 18, 16, .92)" stroke-width=".8"/>
    </g>`;
}

function vitalAdornment(unit, vitals, intent) {
    if (!vitals?.base || isNavalUnit(unit)) return '';

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

    // Sancak token'ı: direnç halkası/çentikleri taban pimini değil bayrak başını çevreler.
    const fd = getFlagDims(unit.unitClass);
    const fcx = (1.2 + fd.W / 2).toFixed(1);
    const fcy = (-fd.pole + fd.H / 2).toFixed(1);
    return `<g class="unit-vitals-adornment" aria-hidden="true" transform="translate(${fcx} ${fcy})">
      <circle class="unit-vitals-aura" cx="0" cy="0" r="${r}" fill="${auraColor}" opacity="${critical ? '.2' : '.15'}">
        <animate attributeName="r" values="${(r - 2).toFixed(1)};${(r + (critical ? 5 : 3)).toFixed(1)};${(r - 2).toFixed(1)}" dur="${pulseDur}" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="${critical ? '.18;.28;.18' : '.1;.2;.1'}" dur="${pulseDur}" repeatCount="indefinite"/>
      </circle>
      ${ticks}
      ${wisps}
    </g>`;
}

function getSquadCount(unit) {
    if (unit.unitClass === 'army_hq' || unit.unitClass === 'corps') return 5;
    if (unit.unitClass === 'division') return 4;
    if (unit.unitClass === 'brigade') return 3;
    if (unit.unitClass === 'regiment') return 3;
    return 2;
}

function renderHeadgear(faction, lean, light) {
    if (faction === 'ottoman') {
        return `<g class="unit-headgear unit-headgear-ottoman">
            <path d="M${lean - 4.5} -14.2 L${lean + 4.5} -14.2 L${lean + 3.2} -9.6 L${lean - 3.2} -9.6 Z" fill="#7b2826" stroke="${light}" stroke-width=".7"/>
            <path d="M${lean + 1.2} -13.6 Q${lean + 5.2} -12.4 ${lean + 4.4} -8.7" fill="none" stroke="#2b1b18" stroke-width=".75" stroke-linecap="round"/>
            <path d="M${lean - .8} -12.4 A2.6 2.6 0 1 0 ${lean + 2.6} -12.1 A1.8 1.8 0 1 1 ${lean - .8} -12.4Z" fill="#ead69b" opacity=".82"/>
        </g>`;
    }
    if (faction === 'anzac') {
        return `<g class="unit-headgear unit-headgear-anzac">
            <path d="M${lean - 8.5} -10.8 Q${lean} -16.3 ${lean + 9.2} -10.6 Q${lean + 2.5} -8.8 ${lean - 8.5} -10.8Z" fill="#66724d" stroke="${light}" stroke-width=".75"/>
            <path d="M${lean + 2.6} -14.4 Q${lean + 7.4} -13 ${lean + 7.8} -9.6" fill="none" stroke="#d6c18a" stroke-width=".85" stroke-linecap="round"/>
            <circle cx="${lean + 4.4}" cy="-11.4" r="1.1" fill="#d8bd72"/>
        </g>`;
    }
    if (faction === 'french') {
        return `<g class="unit-headgear unit-headgear-french">
            <path d="M${lean - 5.2} -13.2 Q${lean} -15.4 ${lean + 5.5} -13.2 L${lean + 4.2} -10.1 L${lean - 4.1} -10.1 Z" fill="#4f5d7c" stroke="${light}" stroke-width=".7"/>
            <rect x="${lean - 4.4}" y="-11.6" width="8.8" height="1.5" rx=".7" fill="#8e5a64" opacity=".9"/>
        </g>`;
    }
    return `<g class="unit-headgear unit-headgear-british">
        <ellipse cx="${lean}" cy="-11.8" rx="6.2" ry="3.1" fill="#59635b" stroke="${light}" stroke-width=".7"/>
        <path d="M${lean - 7.2} -10.7 Q${lean} -8.9 ${lean + 7.4} -10.7" fill="none" stroke="${light}" stroke-width=".7" opacity=".78"/>
    </g>`;
}

function renderRifleman(dx, dy, color, light, index, actionKey, faction = 'ottoman') {
    const stance = actionKey === 'retreating' ? -1 : 1;
    const lean = ['advancing', 'landing', 'engaged'].includes(actionKey) ? stance * 2 : 0;
    const rifleY = actionKey === 'engaged' || actionKey === 'bombarding' ? dy + 1 : dy + 4;
    // Poz (dizilim) dış grupta, animasyon iç grupta: CSS transform animasyonu
    // SVG transform attribute'unu ezer — translate ayrı katmanda kalmalı.
    return `<g class="unit-sprite-pose" transform="translate(${dx} ${dy})"><g class="unit-sprite-figure" style="--figure-delay:${(index * .13).toFixed(2)}s">
        <circle cx="${lean}" cy="-10" r="4.2" fill="${light}" stroke="rgba(18,14,10,.72)" stroke-width=".9"/>
        ${renderHeadgear(faction, lean, light)}
        <path d="M${lean - 2} -6 L${lean + 2} -6 L${lean + 4} 8 L${lean - 4} 8 Z" fill="${color}" stroke="${light}" stroke-width=".8"/>
        <path d="M${lean - 5} 8 L${lean - 8} 16 M${lean + 5} 8 L${lean + 8} 16" stroke="${light}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M${lean - 6} -1 L${lean + 14 * stance} ${rifleY}" stroke="#2b241c" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M${lean - 2} 0 L${lean + 8 * stance} 4" stroke="${light}" stroke-width="1.15" stroke-linecap="round"/>
    </g></g>`;
}

function renderGunCrew(color, light, actionKey, faction = 'ottoman') {
    const firing = actionKey === 'bombarding' || actionKey === 'engaged';
    return `<g class="unit-sprite-fallback unit-sprite-gun" aria-hidden="true">
        <path d="M-19 8 L7 0" stroke="${light}" stroke-width="3.2" stroke-linecap="round"/>
        <circle cx="-15" cy="12" r="5" fill="${color}" stroke="${light}" stroke-width="1.2"/>
        <circle cx="5" cy="7" r="5" fill="${color}" stroke="${light}" stroke-width="1.2"/>
        <path d="M9 -1 L25 -7" stroke="#2b241c" stroke-width="4" stroke-linecap="round"/>
        ${firing ? '<circle class="unit-sprite-muzzle" cx="29" cy="-9" r="4" fill="rgba(231,190,102,.72)"/>' : ''}
        ${renderRifleman(-6, -5, color, light, 0, 'idle', faction)}
        ${renderRifleman(17, 1, color, light, 1, 'idle', faction)}
    </g>`;
}

function renderInlineSquadSprite(unit, f, profile, intent) {
    if (!profile || profile.lodMode === 'symbol' || unit.type === 'deniz') return '';

    const actionKey = intent?.actionKey || 'idle';
    const color = f.color;
    const light = f.colorLight;
    const spriteClass = hasRuntimeSpriteAtlas(profile) ? 'unit-sprite unit-sprite-atlas' : 'unit-sprite unit-sprite-inline';
    const state = actionKey === 'retreating'
        ? 'retreat'
        : ['advancing', 'landing'].includes(actionKey)
            ? 'move'
            : ['engaged', 'bombarding'].includes(actionKey)
                ? 'fire'
                : 'idle';

    if (profile.fallbackFigure === 'gun-crew') {
        return `<g class="${spriteClass}" data-sprite-state="${state}" data-sprite-profile="${profile.id}" data-sprite-faction="${unit.faction}" transform="translate(${profile.anchorOffset.x} ${profile.anchorOffset.y})">
            ${renderGunCrew(color, light, actionKey, unit.faction)}
        </g>`;
    }

    const count = getSquadCount(unit);
    const offsets = [
        { x: -18, y: 6 },
        { x: 0, y: 0 },
        { x: 18, y: 7 },
        { x: -6, y: 18 },
        { x: 11, y: 20 }
    ].slice(0, count);
    return `<g class="${spriteClass}" data-sprite-state="${state}" data-sprite-profile="${profile.id}" data-sprite-faction="${unit.faction}" transform="translate(${profile.anchorOffset.x} ${profile.anchorOffset.y})">
        <ellipse cx="0" cy="20" rx="${18 + count * 4}" ry="10" fill="rgba(12,10,8,.24)"/>
        ${offsets.map((point, index) => renderRifleman(point.x, point.y, color, light, index, actionKey, unit.faction)).join('')}
    </g>`;
}

/** Kuvvet badge'i SVG — token altında sayı gösterir */
function strengthBadge(cx, cy, unit, vitals) {
    if (!unit.strength || isNavalUnit(unit) || !vitals) return '';

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
      <title>Kalan kuvvet: ${txt}${lossTxt ? ` · Kayıp: ${lossTxt}` : ''} · Direnç: ${vitals.staminaPercent}% (${vitals.staminaLabel})</title>
      <text class="strength-badge-text" x="${cx}" y="${by + 20}" text-anchor="middle" fill="#d5c8a1" font-family="var(--mono)" font-size="12">${txt}${lossTxt ? ` ${lossTxt}` : ''}</text>
      <rect x="${cx - barW / 2}" y="${by + 26}" width="${barW}" height="${barH}" rx="3" fill="rgba(40,35,25,.6)"/>
      <rect x="${cx - barW / 2}" y="${by + 26}" width="${fillW}" height="${barH}" rx="3" fill="${barColor}"/>
      <rect x="${cx - barW / 2}" y="${by + 34}" width="${barW}" height="${barH}" rx="3" fill="rgba(40,35,25,.52)"/>
      <rect x="${cx - barW / 2}" y="${by + 34}" width="${staminaW}" height="${barH}" rx="3" fill="${staminaColor}"/>
      <text class="strength-badge-meta" x="${cx}" y="${by + 50}" text-anchor="middle" fill="#9fb9c5" font-family="var(--mono)" font-size="9">DİR ${vitals.staminaPercent}%</text>
    </g>`;
}

function getRenderOffsetForUnit(unit, phaseIndex) {
    if (!isNavalUnit(unit)) return { x: 0, y: 0 };
    return getNavalDisplayOffset(unit, phaseIndex);
}

function resolveRenderedPoint(base, clusterOffset, displayOffset, unit) {
    const safe = getTerrainSafePointForUnit(
        base.x + clusterOffset.x + displayOffset.x,
        base.y + clusterOffset.y + displayOffset.y,
        unit
    );
    // Deniz birimleri: okunabilirlik/cluster ofseti taban suyunu karaya
    // taşımış olabilir — final noktayı gerçek deniz pikseline kilitle.
    if (isNavalUnit(unit)) return snapToSeaWater(safe.x, safe.y);
    return safe;
}

function getNavalHeading(unit, fromPoint, toPoint, phaseIndex) {
    if (!isNavalUnit(unit)) return 0;
    const dx = (toPoint?.x || 0) - (fromPoint?.x || 0);
    const dy = (toPoint?.y || 0) - (fromPoint?.y || 0);
    if (Math.hypot(dx, dy) > 8) {
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }
    const fallback = NAVAL_DEFAULT_HEADINGS[unit.id];
    if (Number.isFinite(fallback)) {
        const drift = Math.sin((phaseIndex + unitSeed(unit.id)) * .19) * 3.5;
        return fallback + drift;
    }
    return -32;
}

function getTokenStateClasses(unit, phaseData, visualClass, intent = null) {
    const actionClass = intent?.actionKey ? ` is-action-${intent.actionKey}` : '';
    const factionClass = unit?.faction ? ` is-faction-${unit.faction}` : '';
    if (!isNavalUnit(unit)) return `${visualClass}${actionClass}${factionClass}`;
    const role = getNavalVisualProfile(unit).role;
    const sunk = isDestroyedPhaseData(phaseData) ? ' is-ship-sunk' : '';
    const damaged = isDamagedPhaseData(phaseData) ? ' is-ship-damaged' : '';
    return `${visualClass} is-naval is-naval-${role}${sunk}${damaged}${actionClass}${factionClass}`;
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
        // Batış GÜNÜ gemi hâlâ görünür (isSunk siluet + efekt = batış sahnesi);
        // off-map (battı/çekildi/tahliye sonrası) zaten app.js gate'inde nextPositions
        // dışında kaldığı için buraya hiç gelmez.
        const intent = deriveUnitIntent(u, phase, phaseData || null, animData);
        const { vitals, unitState, intensity } = getTokenVitals(u, isoDate, animData);
        const vitalClass = getVitalClass(vitals);
        const underFire = !isNavalUnit(u) && unitState === 'fighting' && intensity >= 6;
        const f = BATTLE_DATA.factions[u.faction];
        const visualProfile = getUnitVisualProfile(u);
        const spriteMarkup = renderInlineSquadSprite(u, f, visualProfile, intent);
        const visualClass = getTokenStateClasses(u, phaseData, spriteMarkup ? ' has-hybrid-visual' : ' is-symbol-only', intent);
        const hasPrev = !!prevPositions[u.id];
        const isEntryFrame = phaseIndex === entryIndex && !hasPrev;

        const prev = isEntryFrame ? getUnitEntryOrigin(u, targetBase) : (prevPositions[u.id] || targetBase);
        const visible = phaseData ? 1 : 0.78;
        // Tarihsel anchor noktası varsa kaynak pozisyonu korunur; cluster sadece
        // üst üste gelen sembolleri küçük bir okunabilirlik ofsetiyle ayırır.
        const locked = isLockedPhaseData(phaseData);
        const prevPhaseData = BATTLE_DATA.phases[prevPhaseIndex] ? u.phases[BATTLE_DATA.phases[prevPhaseIndex].id] : null;
        const prevLocked = isLockedPhaseData(prevPhaseData);
        const prevOffset = getClusterOffset(spreadPrev, prev.x, prev.y, u, prevPhaseIndex, prevLocked);
        const targetOffset = getClusterOffset(spreadNext, targetBase.x, targetBase.y, u, phaseIndex, locked);
        const prevDisplayOffset = getRenderOffsetForUnit(u, prevPhaseIndex);
        const targetDisplayOffset = getRenderOffsetForUnit(u, phaseIndex);
        const sourcePoint = resolveRenderedPoint(prev, prevOffset, prevDisplayOffset, u);
        const targetPoint = resolveRenderedPoint(targetBase, targetOffset, targetDisplayOffset, u);
        const sx = normalizeValue(Math.round(sourcePoint.x), VP_MIN_X, VP_MAX_X);
        const sy = normalizeValue(Math.round(sourcePoint.y), VP_MIN_Y, VP_MAX_Y);
        const tx = normalizeValue(Math.round(targetPoint.x), VP_MIN_X, VP_MAX_X);
        const ty = normalizeValue(Math.round(targetPoint.y), VP_MIN_Y, VP_MAX_Y);
        const heading = getNavalHeading(u, sourcePoint, targetPoint, phaseIndex);
        const statusText = intent.statusText;
        const staminaLabel = vitals.base ? ` – direnç ${vitals.staminaPercent}% – kayıp ${formatStrength(vitals.loss)}` : '';
        const ariaLabel = `${u.name} – ${f.name} – ${intent.actionLabel} – ${intent.currentLocationName}${staminaLabel}`;
        const titleText = `${u.name} — ${intent.actionLabel} — ${intent.currentLocationName}${intent.targetLocationName && intent.targetLocationName !== intent.currentLocationName ? ` → ${intent.targetLocationName}` : ''}${staminaLabel}`;
        const pulseDur = vitals.stamina <= 0.35 ? 2.7 : vitals.lossRatio >= 0.35 ? 2.25 : 1.7;
        const labelY = isNavalUnit(u) ? getNavalLabelY(u) : 50;
        const visualSig = computeVisualSig(u, phaseData, intent, vitals, !!spriteMarkup);
        return `<g class="unit-token${vitalClass}${visualClass}${underFire ? ' is-under-fire' : ''}" role="button" tabindex="0" aria-label="${ariaLabel}"
      data-visual-sig="${escapeAttr(visualSig)}"
      data-unit-id="${u.id}"
      data-unit-name="${u.name}"
      data-unit-commander="${u.commander}"
      data-unit-strength="${u.strength}"
      data-visual-profile="${escapeAttr(visualProfile.id)}"
      data-sprite-set="${escapeAttr(getSpriteSetId(u))}"
      data-symbol-mode="${escapeAttr(u.symbolMode || visualProfile.lodMode || 'symbol')}"
      data-evidence="${escapeAttr(phaseData?.historicalEvidence || '')}"
      data-confidence="${escapeAttr(phaseData?.historicalConfidence || '')}"
      data-source-ids="${escapeAttr((phaseData?.historicalSourceIds || []).join(','))}"
      data-reference-id="${escapeAttr(phaseData?.historicalReferenceId || '')}"
      data-current-strength="${vitals.current || ''}"
      data-unit-loss="${vitals.loss || 0}"
      data-loss-ratio="${vitals.lossRatio?.toFixed ? vitals.lossRatio.toFixed(3) : '0'}"
      data-stamina="${vitals.stamina?.toFixed ? vitals.stamina.toFixed(3) : '1'}"
      data-phase-status="${escapeAttr(statusText)}"
      data-phase-objective="${escapeAttr(intent.objectiveText)}"
      data-phase-outcome="${escapeAttr(intent.outcomeText)}"
      data-action-key="${intent.actionKey}"
      data-action-label="${escapeAttr(intent.actionLabel)}"
      data-side="${escapeAttr(u.side || '')}"
      data-heading="${heading.toFixed(1)}"
      data-current-location="${escapeAttr(intent.currentLocationId || '')}"
      data-current-location-name="${escapeAttr(intent.currentLocationName)}"
      data-target-location="${escapeAttr(intent.targetLocationId || '')}"
      data-target-location-name="${escapeAttr(intent.targetLocationName)}"
      data-front="${escapeAttr(intent.frontLabel || '')}"
      data-contact-summary="${escapeAttr(intent.contactLabel || '')}"
      data-target-x="${tx}" data-target-y="${ty}"
      style="transform:translate(${sx}px, ${sy}px);opacity:${visible};--stamina:${vitals.stamina || 1};--loss-ratio:${vitals.lossRatio || 0};--pulse-dur:${pulseDur}s">
      <title>${escapeAttr(titleText)}</title>
      ${renderTokenHitTarget(u)}
      ${vitalAdornment(u, vitals, intent)}
      ${actionAdornment(u, intent)}
      <g class="unit-symbol">${tokenShape(u, phaseData, f, 0, 0, heading, intent)}</g>
      ${spriteMarkup}
      <text x="0" y="${labelY}" text-anchor="middle" fill="${f.colorLight}" font-family="var(--mono)" font-size="${isNavalUnit(u) ? 11 : 15}" class="unit-label">
        ${u.name.length > 20 ? u.name.slice(0, 18) + '…' : u.name}
      </text>
      ${strengthBadge(0, 0, u, vitals)}
    </g>`;
    }).join('');
}

// ── Unit Highlight (animasyon verisinden) ──
// (Token kayma animasyonu artık token-animator.js'in keyed tween motorunda)

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
            el.style.opacity = String(Math.max(0.58, base * 0.72));
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
            el.style.opacity = String(Math.max(0.58, base * 0.72));
            el.classList.add('is-muted');
            el.classList.remove('is-active');
        }
    });
}

export function renderAnimationUnits(animData) {
    if (!animData || !Array.isArray(animData.units) || !animData.units.length) return;
    renderUnits(animData.units);
}

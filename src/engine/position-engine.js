// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Pozisyon Motoru
// Birim konumlandırma, trail hesaplama, cluster yönetimi
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA, BASE_PHASE_ID, PHASE_TOKEN_SPREAD, getMapLocationById } from '../data/battle-data.js?v=20260508-sprint-r1';
import { VP_MIN_X, VP_MAX_X, VP_MIN_Y, VP_MAX_Y } from '../data/coordinate-map.js?v=20260407-manual-r1';
import { ENTITY_TYPES } from '../data/entity-types.js';
import { FRONTLINES } from '../data/frontlines.js?v=20260508-sprint-r1';
import { MAP_FORTS, MAP_NAVAL_ANCHORS } from '../data/geo-calibration.js?v=20260508-sprint-r1';
import { getTerrainAtPoint, clampToAllowedTerrain, snapToSeaWater } from '../data/terrain-zones.js';
import { getHistoricalPlacementForUnit } from '../data/historical-map-data.js?v=20260407-manual-r1';
import { normalizeValue } from './date-utils.js';
import {
    getUnitEntryPhaseIndex, isMajorPhase,
    isNavalEraPhaseIndex, getNavalEraProgress,
    getMinimumStartIsoForUnit, getFirstPhaseIndexForIso
} from './phase-engine.js?v=20260508-sprint-r1';

const BASE_PHASE_DESTRUCTION_ISO = '1915-03-18';
const COLLISION_SAFE_DISTANCE = 92;
const COLLISION_RELAX_PASSES = 6;
const EVIDENCE_FIRST_DAILY_MOVEMENT = true;

// ── Utility ──

/** Birim ID'sinden deterministik seed üret */
export function unitSeed(id) {
    let s = 0;
    for (let i = 0; i < id.length; i++) s = (s * 37 + id.charCodeAt(i)) % 9973;
    return s;
}

/** Birim hareket yön vektörü (faction + tip bazlı) */
export function phaseDirectionByUnit(unit) {
    const f = BATTLE_DATA.factions[unit.faction];
    if (unit.type === 'deniz') return f.id === 'british' ? { x: -0.4, y: -0.15 } : { x: 0.45, y: -0.35 };
    if (f.id === 'ottoman') return { x: -0.15, y: 0.10 };
    if (f.id === 'british') return { x: 0.3, y: 0.12 };
    if (f.id === 'anzac') return { x: 0.35, y: 0.10 };
    return { x: 0.2, y: 0.12 };
}

/** Location ID → koordinat çözümle (jitter ile) */
export function resolveLocationPoint(candidate, unit, phaseIndex) {
    const ids = Array.isArray(candidate) ? candidate : [candidate];
    const seed = unitSeed(unit.id);
    const unique = ids.filter(Boolean).map((id) => String(id).trim().toLowerCase());

    const validLocs = unique.map(id => getMapLocationById(id)).filter(Boolean);
    if (validLocs.length > 0) {
        // Birim ID'sine (seed) göre farklı hedeflere dağıt
        const locIndex = unitSeed(unit.id) % validLocs.length;
        const loc = validLocs[locIndex];
        const jitter = {
            x: Math.round(Math.sin(seed + locIndex) * 10),
            y: Math.round(Math.cos(seed * 1.2 + locIndex) * 10)
        };
        return {
            x: normalizeValue(Math.round(loc.x + jitter.x), VP_MIN_X, VP_MAX_X),
            y: normalizeValue(Math.round(loc.y + jitter.y), VP_MIN_Y, VP_MAX_Y),
            source: unique[locIndex]
        };
    }
    return null;
}

/** Phase bazlı birim konumu çözümle (unit > faction > locationIds sıralamasıyla) */
export function resolvePhaseLocation(phase, unit, phaseIndex) {
    if (!phase) return null;
    const byUnit = phase.locationByUnit && phase.locationByUnit[unit.id];
    if (byUnit) return resolveLocationPoint(byUnit, unit, phaseIndex + 1);
    const byFaction = phase.locationByFaction && phase.locationByFaction[unit.faction];
    if (byFaction) return resolveLocationPoint(byFaction, unit, phaseIndex + 1);
    if (Array.isArray(phase.locationIds) && phase.locationIds.length) return resolveLocationPoint(phase.locationIds, unit, phaseIndex + 1);
    return null;
}

export function getTerrainSafePointForUnit(x, y, unit) {
    const typeDef = ENTITY_TYPES[unit.entityType];
    const base = {
        x: normalizeValue(Math.round(x), VP_MIN_X, VP_MAX_X),
        y: normalizeValue(Math.round(y), VP_MIN_Y, VP_MAX_Y)
    };

    if (!typeDef) return base;

    const terrain = getTerrainAtPoint(base.x, base.y);
    if (typeDef.allowedTerrain.includes(terrain)) return base;

    const clamped = clampToAllowedTerrain(base.x, base.y, typeDef.allowedTerrain);
    return {
        x: normalizeValue(Math.round(clamped.x), VP_MIN_X, VP_MAX_X),
        y: normalizeValue(Math.round(clamped.y), VP_MIN_Y, VP_MAX_Y)
    };
}

function hasCanonicalPhaseHint(phase, unit) {
    return !!(phase && phase.locationByUnit && phase.locationByUnit[unit.id]);
}

function hasUsablePoint(point) {
    return point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function getHistoricalPlacementForPhase(unit, phaseIndex) {
    const iso = String(BATTLE_DATA.phases[phaseIndex]?.isoStart || '');
    const placement = getHistoricalPlacementForUnit(unit, iso);
    if (!placement || !hasUsablePoint(placement.point)) return null;
    return placement;
}

function pointFromHistoricalPlacement(placement) {
    return placement && hasUsablePoint(placement.point)
        ? { x: placement.point.x, y: placement.point.y }
        : null;
}

function withHistoricalMeta(phaseData, placement) {
    if (!placement) return phaseData;
    return {
        ...phaseData,
        historicalEvidence: placement.kind,
        historicalConfidence: placement.confidence,
        historicalSourceIds: placement.sourceIds,
        historicalReferenceId: placement.routeId || placement.anchorId || placement.id,
        historicalNote: placement.note
    };
}

function separateUnitTrails(phaseIds) {
    for (let phaseIndex = 0; phaseIndex < phaseIds.length; phaseIndex++) {
        const pid = phaseIds[phaseIndex];
        const entries = BATTLE_DATA.units
            .filter((unit) => unit.type !== 'deniz')
            .map((unit) => ({ unit, point: unit.phases && unit.phases[pid] }))
            .filter((entry) => hasUsablePoint(entry.point));

        for (let pass = 0; pass < COLLISION_RELAX_PASSES; pass++) {
            let moved = false;

            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    const a = entries[i];
                    const b = entries[j];
                    const dx = b.point.x - a.point.x;
                    const dy = b.point.y - a.point.y;
                    const distance = Math.hypot(dx, dy);
                    if (distance >= COLLISION_SAFE_DISTANCE) continue;

                    const fallbackAngle = ((unitSeed(a.unit.id) * 31 + unitSeed(b.unit.id) * 17 + phaseIndex * 19) % 360) * Math.PI / 180;
                    const ux = distance > 0.1 ? dx / distance : Math.cos(fallbackAngle);
                    const uy = distance > 0.1 ? dy / distance : Math.sin(fallbackAngle);
                    const push = ((COLLISION_SAFE_DISTANCE - Math.max(distance, 0)) / 2) + 8;

                    const nextA = getTerrainSafePointForUnit(a.point.x - ux * push, a.point.y - uy * push, a.unit);
                    const nextB = getTerrainSafePointForUnit(b.point.x + ux * push, b.point.y + uy * push, b.unit);

                    a.point.x = nextA.x;
                    a.point.y = nextA.y;
                    b.point.x = nextB.x;
                    b.point.y = nextB.y;
                    moved = true;
                }
            }

            if (!moved) break;
        }

        // Collision çözümü kıyı çizgisinde çok küçük sapmalar üretebilir;
        // son sözü terrain gate söylesin.
        entries.forEach((entry) => {
            const safe = getTerrainSafePointForUnit(entry.point.x, entry.point.y, entry.unit);
            entry.point.x = safe.x;
            entry.point.y = safe.y;
        });
    }
}

/** Phase meta bilgisi al (status, objective, outcome) */
export function resolvePhaseMetaText(phase, unit, key) {
    // Deniz birimleri faction-level kara hedefini miras almaz; kendi
    // el-yazımı naval-assault meta'sını korur. Aksi halde gemiler
    // ("25 Nisan ortak çıkarmaya odaklan." gibi) kara objektifleri alır.
    if (unit.type === 'deniz') {
        const base = unit.phases && unit.phases[BASE_PHASE_ID];
        const value = base && base[key];
        return (typeof value === 'string' && value.trim()) ? value.trim() : null;
    }
    const byFaction = phase && phase[`${key}ByFaction`];
    if (byFaction && byFaction[unit.faction]) return byFaction[unit.faction];
    return null;
}

/** Birim bu fazda saf dışı mı? */
export function isDestroyedPhaseData(phaseData) {
    if (!phaseData || typeof phaseData !== 'object') return false;
    const status = String(phaseData.status || '').toLowerCase();
    const outcome = String(phaseData.outcome || '').toLowerCase();
    return status.includes('battı') || outcome.includes('battı');
}

function isoDay(iso) {
    const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 0;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000;
}

function hasIsoDate(phase) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(phase?.isoStart || ''));
}

function dateProgress(iso, startIso, endIso) {
    const start = isoDay(startIso);
    const end = isoDay(endIso);
    const value = isoDay(iso);
    if (!start || !end || end <= start) return 0;
    return normalizeValue((value - start) / (end - start), 0, 1);
}

function mix(a, b, t) {
    return a + (b - a) * normalizeValue(t, 0, 1);
}

function interpolateWaypoints(points, t) {
    if (!points.length) return { x: 0, y: 0 };
    if (points.length === 1) return points[0];
    const scaled = normalizeValue(t, 0, 1) * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(scaled));
    const localT = scaled - index;
    return {
        x: mix(points[index].x, points[index + 1].x, localT),
        y: mix(points[index].y, points[index + 1].y, localT)
    };
}

// ── Deniz rotaları/şeritleri: kalibre su ankrajlarından türetilir ──
// (geo-calibration.js MAP_NAVAL_ANCHORS — güncel haritada doğrulanmış
//  Erenköy boğaz suyu). Eski elle-yazılmış kalibrasyon-öncesi pikseller
//  kaldırıldı; tüm naval konum bu ankraj sistemine bağlı.
const NA = MAP_NAVAL_ANCHORS;

const NAVAL_APPROACH_ROUTE = [
    { x: 1010, y: 2600 },
    { x: NA.aegeanApproach.x, y: NA.aegeanApproach.y },
    { x: 1145, y: 2495 },
    { x: NA.erenkoyBay.x, y: NA.erenkoyBay.y },
    { x: NA.battleLine.x, y: NA.battleLine.y }
];

const NAVAL_WITHDRAW_ROUTE = [
    { x: NA.battleLine.x, y: NA.battleLine.y },
    { x: NA.erenkoyBay.x, y: NA.erenkoyBay.y },
    { x: NA.withdrawSW.x, y: NA.withdrawSW.y },
    { x: 1015, y: 2585 }
];

const NUSRET_PATROL_ROUTE = [
    { x: NA.erenkoyMineLine.x, y: NA.erenkoyMineLine.y },
    { x: NA.erenkoyMineLine.x + 22, y: NA.erenkoyMineLine.y - 12 },
    { x: NA.erenkoyMineLine.x + 8, y: NA.erenkoyMineLine.y + 12 },
    { x: NA.erenkoyMineLine.x, y: NA.erenkoyMineLine.y }
];

const NUSRET_MINE_LINE_ROUTE = [
    { x: 1248, y: 2426 },
    { x: 1276, y: 2416 },
    { x: NA.erenkoyMineLine.x, y: NA.erenkoyMineLine.y },
    { x: 1338, y: 2400 }
];

const ALLIED_NAVAL_LANES = {
    'hms-queen-elizabeth': {
        offset: { x: 14, y: -20 },
        startT: 0.52,
        attackT: 0.98,
        hitPoint: { x: 1330, y: 2360 },
        retreatPoint: { x: NA.withdrawSW.x, y: NA.withdrawSW.y },
        role: 'birinci hat amiral gemisi'
    },
    suffren: {
        offset: { x: 20, y: -10 },
        startT: 0.44,
        attackT: 0.82,
        hitPoint: { x: NA.narrowsBombard.x, y: NA.narrowsBombard.y },
        retreatPoint: { x: 1095, y: 2485 },
        role: 'Fransız ikinci hattı'
    },
    bouvet: {
        offset: { x: -18, y: 10 },
        startT: 0.38,
        attackT: 0.78,
        hitPoint: { x: NA.battleLine.x, y: NA.battleLine.y },
        retreatPoint: { x: NA.battleLine.x, y: NA.battleLine.y },
        role: 'Erenköy dönüş hattında battı'
    },
    'hms-irresistible': {
        offset: { x: -10, y: 18 },
        startT: 0.31,
        attackT: 0.72,
        hitPoint: { x: 1290, y: 2402 },
        retreatPoint: { x: 1290, y: 2402 },
        role: 'Erenköy mayın hattında battı'
    },
    'hms-ocean': {
        offset: { x: 16, y: 14 },
        startT: 0.25,
        attackT: 0.68,
        hitPoint: { x: 1268, y: 2440 },
        retreatPoint: { x: 1268, y: 2440 },
        role: 'Irresistible yardımı sırasında battı'
    },
    'allied-minesweepers': {
        offset: { x: -22, y: 6 },
        startT: 0.42,
        attackT: 0.62,
        hitPoint: { x: NA.erenkoyBay.x, y: NA.erenkoyBay.y },
        retreatPoint: { x: NA.withdrawSW.x, y: NA.withdrawSW.y },
        role: 'mayın tarama trawlerları'
    }
};

const SUNK_ON_MARCH_18 = new Set(['bouvet', 'hms-irresistible', 'hms-ocean']);

// Okunabilirlik vitrin ofsetleri — küçük tutuldu; final pozisyon ayrıca
// snapToSeaWater ile suya kilitlendiği için karaya taşamaz.
const NAVAL_DISPLAY_OFFSETS = {
    'hms-queen-elizabeth': { x: -12, y: 20 },
    suffren: { x: 22, y: 8 },
    bouvet: { x: 18, y: -18 },
    'hms-irresistible': { x: -14, y: -16 },
    'hms-ocean': { x: 14, y: 18 },
    'allied-minesweepers': { x: -24, y: -12 },
    nusret: { x: -22, y: 16 },
    'ss-river-clyde': { x: -12, y: 10 }
};

/**
 * Deniz birimleri tarihsel anchorlarını korur, ama render sırasında okunurluk
 * için Boğaz koridorunda küçük, deterministik vitrin ofsetleri alır.
 */
export function getNavalDisplayOffset(unit, phaseIndex = 0) {
    if (!unit || (unit.type !== 'deniz' && unit.entityType !== 'landing_boat')) return { x: 0, y: 0 };
    const base = NAVAL_DISPLAY_OFFSETS[unit.id] || { x: 0, y: 0 };
    const iso = getPhaseIso(phaseIndex);
    const activeNavalWindow = iso <= '1915-04-28';
    const scale = activeNavalWindow ? 1 : .45;
    const seed = unitSeed(unit.id);
    const drift = activeNavalWindow ? 1 : .35;
    return {
        x: Math.round(base.x * scale + Math.sin((phaseIndex + seed) * .13) * 4 * drift),
        y: Math.round(base.y * scale + Math.cos((phaseIndex + seed) * .16) * 3 * drift)
    };
}

function getPhaseIso(phaseIndex) {
    return String(BATTLE_DATA.phases[phaseIndex]?.isoStart || '');
}

function applyBreathing(point, unit, phaseIndex, scale = 1) {
    const seed = unitSeed(unit.id);
    return {
        x: point.x + Math.sin((phaseIndex + seed) * 0.17) * 5 * scale,
        y: point.y + Math.cos((phaseIndex + seed) * 0.19) * 4 * scale
    };
}

function getAlliedNavalPosition(unit, phaseIndex) {
    const iso = getPhaseIso(phaseIndex);
    const lane = ALLIED_NAVAL_LANES[unit.id] || ALLIED_NAVAL_LANES['hms-ocean'];

    if (iso < '1915-02-19') {
        const t = dateProgress(iso, '1914-11-03', '1915-02-18');
        const base = interpolateWaypoints(NAVAL_APPROACH_ROUTE.slice(0, 3), t);
        return applyBreathing({ x: base.x + lane.offset.x * 1.35, y: base.y + lane.offset.y * 1.15 }, unit, phaseIndex, 0.8);
    }

    if (iso < '1915-03-07') {
        const t = dateProgress(iso, '1915-02-19', '1915-03-06');
        const routePoint = interpolateWaypoints(NAVAL_APPROACH_ROUTE, mix(0.12, Math.max(0.18, lane.startT - 0.08), t));
        return applyBreathing({ x: routePoint.x + lane.offset.x * 1.15, y: routePoint.y + lane.offset.y * 1.05 }, unit, phaseIndex, 0.7);
    }

    if (iso < '1915-03-18') {
        const t = dateProgress(iso, '1915-03-07', '1915-03-17');
        const routePoint = interpolateWaypoints(NAVAL_APPROACH_ROUTE, mix(lane.startT, lane.attackT, t));
        return applyBreathing({ x: routePoint.x + lane.offset.x * 0.75, y: routePoint.y + lane.offset.y * 0.75 }, unit, phaseIndex, 0.45);
    }

    if (iso === '1915-03-18') {
        return applyBreathing(lane.hitPoint, unit, phaseIndex, SUNK_ON_MARCH_18.has(unit.id) ? 0.08 : 0.25);
    }

    const t = dateProgress(iso, '1915-03-19', '1915-04-24');
    const base = interpolateWaypoints(NAVAL_WITHDRAW_ROUTE, t);
    return applyBreathing({ x: base.x + lane.offset.x * 0.9, y: base.y + lane.offset.y * 0.9 }, unit, phaseIndex, 0.45);
}

function getNusretPosition(unit, phaseIndex) {
    const iso = getPhaseIso(phaseIndex);
    if (iso >= '1915-03-07' && iso <= '1915-03-08') {
        const t = dateProgress(iso, '1915-03-07', '1915-03-08');
        return applyBreathing(interpolateWaypoints(NUSRET_MINE_LINE_ROUTE, t), unit, phaseIndex, 0.25);
    }
    if (iso > '1915-03-08' && iso <= '1915-03-18') {
        // Kritik hattı döşedikten sonra Nusret'i Erenköy dönüş hattının tam üstünde
        // değil, mayın hattının kuzeydoğu/nöbet ucunda gösteriyoruz. Böylece hem
        // tarihsel rol görünür kalıyor hem de İtilaf gemileriyle token yığılması oluşmuyor.
        const base = { x: 1179, y: 2386 };
        return applyBreathing(base, unit, phaseIndex, 0.35);
    }
    if (iso > '1915-03-18') {
        return applyBreathing({ x: 1314, y: 2375 }, unit, phaseIndex, 0.45);
    }
    const t = dateProgress(iso, '1914-11-03', '1915-03-06');
    return applyBreathing(interpolateWaypoints(NUSRET_PATROL_ROUTE, t), unit, phaseIndex, 0.5);
}

/** Deniz birimlerinin narrative pozisyon hesaplaması */
export function getNarrativeNavalPosition(unit, phaseIndex) {
    if (unit.type === 'deniz') {
        const historical = getHistoricalPlacementForPhase(unit, phaseIndex);
        const historicalPoint = pointFromHistoricalPlacement(historical);
        if (historicalPoint) {
            const p = getTerrainSafePointForUnit(historicalPoint.x, historicalPoint.y, unit);
            return snapToSeaWater(p.x, p.y);
        }
    }

    if (!isNavalEraPhaseIndex(phaseIndex)) return null;

    if (unit.id === 'nusret') {
        const np = getNusretPosition(unit, phaseIndex);
        const p = getTerrainSafePointForUnit(np.x, np.y, unit);
        return snapToSeaWater(p.x, p.y);
    }

    if (unit.type === 'deniz' && unit.faction !== 'ottoman') {
        const point = getAlliedNavalPosition(unit, phaseIndex);
        const p = getTerrainSafePointForUnit(point.x, point.y, unit);
        return snapToSeaWater(p.x, p.y);
    }

    // Osmanlı kara/topçu birlikleri: deniz fazında kendi başlangıç pozisyonlarında kalır.
    // Batarya birimleri kıyı tabyalarında, piyade birlikleri ise karargâh konumlarında.
    if (unit.faction === 'ottoman' && unit.type !== 'deniz') {
        const seed = unitSeed(unit.id);
        // Birim zaten naval-assault fazında elle tanımlanmış konuma sahip — onu kullan
        const basePos = unit.phases && unit.phases[BASE_PHASE_ID];
        if (basePos) {
            return {
                x: normalizeValue(Math.round(basePos.x + Math.sin((phaseIndex + seed) * 0.25) * 8), VP_MIN_X, VP_MAX_X),
                y: normalizeValue(Math.round(basePos.y + Math.cos((phaseIndex + seed) * 0.2) * 8), VP_MIN_Y, VP_MAX_Y)
            };
        }
        // Fallback: kıyı batarya hattı (Avrupa + Asya yakası tabyaları — geo-calibration'dan dinamik)
        const batteryLine = MAP_FORTS.map(f => ({ x: f.x, y: f.y }));
        const slot = seed % batteryLine.length;
        const anchor = batteryLine[slot];
        return {
            x: normalizeValue(Math.round(anchor.x + ((seed % 5) - 2) * 10 + Math.sin((phaseIndex + slot) * 0.21) * 7), VP_MIN_X, VP_MAX_X),
            y: normalizeValue(Math.round(anchor.y + ((Math.floor(seed / 7) % 5) - 2) * 7 + Math.cos((phaseIndex + slot) * 0.19) * 7), VP_MIN_Y, VP_MAX_Y)
        };
    }

    return null;
}

/** Üst üste binen birimleri radyal olarak dağıt */
export function getClusterOffset(spreadState, x, y, unit, phaseIndex) {
    const isNaval = unit.type === 'deniz' || unit.entityType === 'landing_boat';
    const bucketSize = isNaval ? 96 : 78;
    const key = `${Math.round(x / bucketSize)}|${Math.round(y / bucketSize)}`;
    const bucket = spreadState[key] || [];
    const idx = bucket.length;
    bucket.push(unit.id);
    spreadState[key] = bucket;
    const slots = isNaval ? 8 : 7;
    const ring = Math.floor(idx / slots);
    const slot = idx % slots;
    const radius = isNaval ? 42 + ring * 24 : PHASE_TOKEN_SPREAD + ring * 14;
    const angleStep = isNaval ? 43 : 51;
    const sideBias = unit.side === 'ottoman' ? -16 : unit.side === 'allied' ? 16 : 0;
    const angle = ((idx * angleStep + unitSeed(unit.id) + sideBias) % 360) * Math.PI / 180;
    return {
        x: Math.round(Math.cos(angle) * (slot === 0 ? 1 : radius)),
        y: Math.round(Math.sin(angle) * (slot === 0 ? 1 : radius))
    };
}

/** Birim ilk göründüğü konum (ekran dışından giriş efekti) */
export function getUnitEntryOrigin(unit, targetBase) {
    const seed = unitSeed(unit.id);
    let x = targetBase.x;
    let y = targetBase.y;

    if (unit.type === 'deniz' && unit.faction !== 'ottoman') {
        // Müttefik gemileri Batı'dan (Ege'den) gelir
        x -= 650 + (seed % 120);
        y += ((seed % 9) - 4) * 30;
    } else if (unit.faction === 'anzac') {
        // ANZAC kuvvetleri denizden (Batı Ege) Arıburnu/Kabatepe sahiline çıkar
        x -= 750 + (seed % 150);
        y += 35 + ((seed % 11) - 5) * 27;
    } else if (unit.faction === 'british' || unit.faction === 'french') {
        // İngiliz/Fransız birlikleri Güneybatıdan (Ege/Limni) gelir
        x -= 510 + (seed % 140);
        y += 410 + ((seed % 9) - 4) * 27;
    } else {
        // Osmanlı birlikleri Karadan (Kuzey/Doğu/Kuzeydoğu) gelir
        x += (seed % 2 ? -1 : 1) * (290 + (seed % 140));
        y -= 340 + (seed % 100);
    }

    return {
        x: normalizeValue(Math.round(x), VP_MIN_X, VP_MAX_X),
        y: normalizeValue(Math.round(y), VP_MIN_Y, VP_MAX_Y)
    };
}

/**
 * Engagement corridor separation — karşı taraf birimleri aynı noktada olamaz.
 * Frontline varsa birimler kendi taraflarına itilir.
 */
export function enforceCorridorSeparation(x, y, unit, campaignPhaseId) {
    if (!unit.side) return { x, y };

    const active = FRONTLINES.filter((fl) => fl.phase.includes(campaignPhaseId));
    if (!active.length) return { x, y };

    for (const fl of active) {
        // Frontline'ın ortalamasını bul
        const avgX = fl.points.reduce((s, p) => s + p.x, 0) / fl.points.length;
        const avgY = fl.points.reduce((s, p) => s + p.y, 0) / fl.points.length;
        const hw = (fl.corridorWidth || 60) / 2;

        // Birim frontline'a yakın mı? (120 SVG unit mesafe içinde)
        const dist = Math.hypot(x - avgX, y - avgY);
        if (dist > 120) continue;

        // side1 = allied (genellikle batı/güney), side2 = ottoman (doğu/kuzey)
        // Yarımadada batı = düşük x, doğu = yüksek x
        const isAllied = unit.side === 'allied' || (unit.side !== 'ottoman' && ['british', 'anzac', 'french'].includes(unit.faction));

        if (fl.side1 === 'allied' && isAllied) {
            // Allied birimleri frontline'ın batısına (düşük x)
            if (x > avgX - hw) {
                x = Math.round(avgX - hw - (unitSeed(unit.id) % 10));
            }
        } else if (fl.side2 === 'ottoman' && !isAllied) {
            // Ottoman birimleri frontline'ın doğusuna (yüksek x)
            if (x < avgX + hw) {
                x = Math.round(avgX + hw + (unitSeed(unit.id) % 10));
            }
        }
    }

    return { x: normalizeValue(x, VP_MIN_X, VP_MAX_X), y: normalizeValue(y, VP_MIN_Y, VP_MAX_Y) };
}

/** Birim phase durumunu türet (fallback için) */
function deriveUnitPhaseState(unit, i, phaseTitle) {
    const period = i % 3;
    const roleTag = unit.type === 'deniz' ? 'sualtı harekâtı' : 'taarruz';
    if (period === 0) return `hazır`;
    if (period === 1) return roleTag;
    return `harekette`;
}

/** Tüm birimler için tüm phase'lere pozisyon hesapla ve ata */
export function expandUnitTrails() {
    const phaseIds = BATTLE_DATA.phases.map((p) => p.id);
    if (!phaseIds.length) return;
    const UNIT_ENTRY = getUnitEntryPhaseIndex();

    BATTLE_DATA.units.forEach((unit) => {
        const startIndexRaw = UNIT_ENTRY[unit.id];
        const startIndex = Number.isInteger(startIndexRaw)
            ? Math.max(0, Math.min(phaseIds.length - 1, startIndexRaw))
            : 0;
        const basePhaseData = unit.phases[BASE_PHASE_ID];
        const destroyedAnchorIndex = isDestroyedPhaseData(basePhaseData)
            ? getFirstPhaseIndexForIso(BASE_PHASE_DESTRUCTION_ISO)
            : -1;
        const startPhase = BATTLE_DATA.phases[startIndex];
        if (!startPhase) return;

        const hintedStart = resolvePhaseLocation(startPhase, unit, startIndex);
        const historicalStartPlacement = getHistoricalPlacementForPhase(unit, startIndex);
        const historicalStart = pointFromHistoricalPlacement(historicalStartPlacement);
        const navalStart = !historicalStart && unit.type === 'deniz' ? getNarrativeNavalPosition(unit, startIndex) : null;
        const baseData = historicalStart || navalStart || ((hasCanonicalPhaseHint(startPhase, unit) && hintedStart)
            ? hintedStart
            : (unit.phases[startPhase.id] || hintedStart || unit.phases[BASE_PHASE_ID]));
        if (!baseData) return;

        const safeBase = getTerrainSafePointForUnit(baseData.x, baseData.y, unit);
        let x = safeBase.x;
        let y = safeBase.y;
        const seed = unitSeed(unit.id);
        const startStatus = resolvePhaseMetaText(startPhase, unit, 'status') || (unit.phases[startPhase.id] && unit.phases[startPhase.id].status) || 'hazır';
        const startObjective = resolvePhaseMetaText(startPhase, unit, 'objective') || (unit.phases[startPhase.id] && unit.phases[startPhase.id].objective) || 'Temel görev başlangıcı';
        const startOutcome = resolvePhaseMetaText(startPhase, unit, 'outcome') || (unit.phases[startPhase.id] && unit.phases[startPhase.id].outcome) || 'Saha dağılımı tamamlandı';
        unit.phases[startPhase.id] = withHistoricalMeta({ x: Math.round(x), y: Math.round(y), status: startStatus, objective: startObjective, outcome: startOutcome }, historicalStartPlacement);

        for (let i = startIndex + 1; i < phaseIds.length; i++) {
            const pid = phaseIds[i];
            const prevPid = phaseIds[i - 1];
            const phase = BATTLE_DATA.phases[i];

            if (destroyedAnchorIndex !== -1 && i >= destroyedAnchorIndex) {
                const destroyedPlacement = getHistoricalPlacementForPhase(unit, Math.min(i, destroyedAnchorIndex));
                const historicalDestroyedPoint = pointFromHistoricalPlacement(destroyedPlacement);
                const destroyedPoint = unit.type === 'deniz'
                    ? (historicalDestroyedPoint || getNarrativeNavalPosition(unit, Math.min(i, destroyedAnchorIndex)) || basePhaseData)
                    : basePhaseData;
                const safeDestroyedPoint = getTerrainSafePointForUnit(destroyedPoint.x, destroyedPoint.y, unit);
                unit.phases[pid] = withHistoricalMeta({
                    x: Math.round(safeDestroyedPoint.x),
                    y: Math.round(safeDestroyedPoint.y),
                    status: basePhaseData.status,
                    objective: basePhaseData.objective,
                    outcome: basePhaseData.outcome
                }, destroyedPlacement);
                x = unit.phases[pid].x;
                y = unit.phases[pid].y;
                continue;
            }

            const pPhase = unit.phases[prevPid];
            if (isDestroyedPhaseData(pPhase)) {
                unit.phases[pid] = {
                    x: Math.round(pPhase.x ?? x),
                    y: Math.round(pPhase.y ?? y),
                    status: pPhase.status,
                    objective: pPhase.objective,
                    outcome: pPhase.outcome
                };
                x = unit.phases[pid].x;
                y = unit.phases[pid].y;
                continue;
            }

            if (!unit.phases[pid]) {
                const historicalPlacement = getHistoricalPlacementForPhase(unit, i);
                const historicalPoint = pointFromHistoricalPlacement(historicalPlacement);

                if (historicalPoint) {
                    x = historicalPoint.x;
                    y = historicalPoint.y;
                } else {
                    // ── DENİZ BİRİMLERİ: getNarrativeNavalPosition ile hat formasyonu ──
                    // Gemiler "bogaz" lokasyonuna yığılmasın — narrative pozisyon hesabı kullan
                    const navalPos = getNarrativeNavalPosition(unit, i);
                    if (navalPos) {
                        x = navalPos.x;
                        y = navalPos.y;
                    } else if (unit.type === 'deniz' && unit.faction !== 'ottoman') {
                        // Post-naval era: Ege'ye çekilir
                        x = normalizeValue(200 + (seed % 4) * 70, VP_MIN_X, VP_MAX_X);
                        y = normalizeValue(1800 + (seed % 3) * 70, VP_MIN_Y, VP_MAX_Y);
                    } else {
                        const hinted = EVIDENCE_FIRST_DAILY_MOVEMENT && hasIsoDate(phase)
                            ? null
                            : resolvePhaseLocation(phase, unit, i);
                        if (hinted) {
                            x = hinted.x;
                            y = hinted.y;
                        } else {
                            // Kaynaksız mikro-hareket üretme: yeni tarihsel katman veri
                            // sağlamıyorsa birim son güvenilir konumunda bekler.
                            x = normalizeValue(x, VP_MIN_X, VP_MAX_X);
                            y = normalizeValue(y, VP_MIN_Y, VP_MAX_Y);
                        }
                    }
                }

                // ── TERRAIN GATE: entity tipine uygun terrain'e clamp ──
                const safePoint = getTerrainSafePointForUnit(x, y, unit);
                x = safePoint.x;
                y = safePoint.y;

                const status = resolvePhaseMetaText(phase, unit, 'status') || deriveUnitPhaseState(unit, i, phase && phase.title);
                const objective = resolvePhaseMetaText(phase, unit, 'objective') || `${phase ? phase.title : 'Sıradaki'} kapsamında konum al`;
                const outcome = resolvePhaseMetaText(phase, unit, 'outcome') || `${phase ? phase.title : 'Sıradaki'} hedefi için pozisyon alındı`;
                unit.phases[pid] = withHistoricalMeta({
                    x: Math.round(x),
                    y: Math.round(y),
                    status,
                    objective,
                    outcome
                }, historicalPlacement);
            } else {
                const existing = unit.phases[pid];
                const historicalPlacement = getHistoricalPlacementForPhase(unit, i);
                const historicalPoint = pointFromHistoricalPlacement(historicalPlacement);
                const sourcePoint = historicalPoint || { x: existing.x ?? x, y: existing.y ?? y };
                const safeExisting = getTerrainSafePointForUnit(sourcePoint.x, sourcePoint.y, unit);
                x = safeExisting.x;
                y = safeExisting.y;
                unit.phases[pid] = withHistoricalMeta({
                    ...existing,
                    x: Math.round(x),
                    y: Math.round(y)
                }, historicalPlacement);
            }
        }
    });

    separateUnitTrails(phaseIds);
}

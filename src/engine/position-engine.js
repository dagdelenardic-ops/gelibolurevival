// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Pozisyon Motoru
// Birim konumlandırma, trail hesaplama, cluster yönetimi
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA, LOCATION_BY_ID, BASE_PHASE_ID, PHASE_TOKEN_SPREAD } from '../data/battle-data.js';
import { ENTITY_TYPES } from '../data/entity-types.js';
import { FRONTLINES } from '../data/frontlines.js';
import { getTerrainAtPoint, clampToAllowedTerrain } from '../data/terrain-zones.js';
import { normalizeValue } from './date-utils.js';
import {
    getUnitEntryPhaseIndex, isMajorPhase,
    isNavalEraPhaseIndex, getNavalEraProgress,
    getMinimumStartIsoForUnit, getFirstPhaseIndexForIso
} from './phase-engine.js';

const BASE_PHASE_DESTRUCTION_ISO = '1915-03-18';

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
    if (f.id === 'ottoman') return { x: -0.35, y: -0.22 };
    if (f.id === 'british') return { x: 0.7, y: 0.25 };
    if (f.id === 'anzac') return { x: 0.9, y: 0.18 };
    return { x: 0.3, y: 0.22 };
}

/** Location ID → koordinat çözümle (jitter ile) */
export function resolveLocationPoint(candidate, unit, phaseIndex) {
    const ids = Array.isArray(candidate) ? candidate : [candidate];
    const seed = unitSeed(unit.id) + phaseIndex;
    const unique = ids.filter(Boolean).map((id) => String(id).trim().toLowerCase());

    const validLocs = unique.map(id => LOCATION_BY_ID[id]).filter(Boolean);
    if (validLocs.length > 0) {
        // Birim ID'sine (seed) göre farklı hedeflere dağıt
        const locIndex = unitSeed(unit.id) % validLocs.length;
        const loc = validLocs[locIndex];
        const jitter = {
            x: Math.round(Math.sin(seed + locIndex) * 3),
            y: Math.round(Math.cos(seed * 1.2 + locIndex) * 3)
        };
        return {
            x: normalizeValue(Math.round(loc.x + jitter.x), 45, 680),
            y: normalizeValue(Math.round(loc.y + jitter.y), 18, 548),
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

/** Phase meta bilgisi al (status, objective, outcome) */
export function resolvePhaseMetaText(phase, unit, key) {
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

/** Deniz birimlerinin narrative pozisyon hesaplaması */
export function getNarrativeNavalPosition(unit, phaseIndex) {
    if (!isNavalEraPhaseIndex(phaseIndex)) return null;
    const t = getNavalEraProgress(phaseIndex);
    const seed = unitSeed(unit.id);

    // Müttefik deniz unsurları: açık denizden (Batı/Güneybatı Ege) boğaza yaklaşma
    if (unit.type === 'deniz' && unit.faction !== 'ottoman') {
        const laneById = {
            'hms-queen-elizabeth': 0,
            'hms-irresistible': 1,
            'hms-ocean': 2,
            bouvet: 3,
            suffren: 4
        };
        const lane = laneById[unit.id] ?? (seed % 5);
        // Ege Denizi'nden başla (Sol alt)
        const startX = 60 + lane * 18;
        const startY = 460 + lane * 22;
        const baseBase = unit.phases['naval-assault'];
        const endX = baseBase ? baseBase.x : 505 + lane * 8;
        const endY = baseBase ? baseBase.y : 333 + lane * 16;
        return {
            x: normalizeValue(Math.round(startX + (endX - startX) * t), 45, 680),
            y: normalizeValue(Math.round(startY + (endY - startY) * t + Math.sin((phaseIndex + seed) * 0.22) * 3), 18, 548)
        };
    }

    // Nusret: mayın hattı çevresinde kontrollü hareket
    if (unit.id === 'nusret') {
        return {
            x: normalizeValue(Math.round(454 + Math.sin((phaseIndex + seed) * 0.35) * 7), 45, 680),
            y: normalizeValue(Math.round(382 + Math.cos((phaseIndex + seed) * 0.28) * 5), 18, 548)
        };
    }

    // Osmanlı kara/topçu birlikleri: kıyı bataryalarına yayılım
    if (unit.faction === 'ottoman' && unit.type !== 'deniz') {
        const batteryLine = [
            { x: 405, y: 340 }, { x: 400, y: 365 }, { x: 395, y: 385 },
            { x: 415, y: 310 }, { x: 498, y: 345 }, { x: 495, y: 365 }
        ];
        const slot = seed % batteryLine.length;
        const anchor = batteryLine[slot];
        return {
            x: normalizeValue(Math.round(anchor.x + ((seed % 5) - 2) * 3 + Math.sin((phaseIndex + slot) * 0.21) * 2), 45, 680),
            y: normalizeValue(Math.round(anchor.y + ((Math.floor(seed / 7) % 5) - 2) * 2 + Math.cos((phaseIndex + slot) * 0.19) * 2), 18, 548)
        };
    }

    return null;
}

/** Üst üste binen birimleri radyal olarak dağıt */
export function getClusterOffset(spreadState, x, y, unit, phaseIndex) {
    const key = `${Math.round(x)}|${Math.round(y)}`;
    const bucket = spreadState[key] || [];
    const idx = bucket.length;
    bucket.push(unit.id);
    spreadState[key] = bucket;
    const ring = Math.floor(idx / 6);
    const slot = idx % 6;
    const radius = PHASE_TOKEN_SPREAD + ring * 3.5;
    const angle = ((idx * 58 + unitSeed(unit.id) + phaseIndex * 9) % 360) * Math.PI / 180;
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
        x -= 190 + (seed % 35);
        y += ((seed % 9) - 4) * 9;
    } else if (unit.faction === 'anzac') {
        // ANZAC kuvvetleri denizden (Batı Ege) Arıburnu/Kabatepe sahiline (Doğuya doğru) çıkar
        x -= 220 + (seed % 45); // Daha batıdan başlat
        y += 10 + ((seed % 11) - 5) * 8;
    } else if (unit.faction === 'british' || unit.faction === 'french') {
        // İngiliz/Fransız birlikleri Güneybatıdan (Ege/Limni) Seddülbahir/Kumkale'ye gelir
        x -= 150 + (seed % 40); // Batı/Güneybatı'dan başlat
        y += 120 + ((seed % 9) - 4) * 8; // Daha güneyden başlat
    } else {
        // Osmanlı birlikleri Karadan (Kuzey/Doğu/Kuzeydoğu) gelir
        x += (seed % 2 ? -1 : 1) * (85 + (seed % 40));
        y -= 100 + (seed % 30);
    }

    return {
        x: normalizeValue(Math.round(x), 45, 680),
        y: normalizeValue(Math.round(y), 18, 548)
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
        const hw = (fl.corridorWidth || 18) / 2;

        // Birim frontline'a yakın mı? (60 SVG unit mesafe içinde)
        const dist = Math.hypot(x - avgX, y - avgY);
        if (dist > 60) continue;

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

    return { x: normalizeValue(x, 45, 680), y: normalizeValue(y, 18, 548) };
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
        const baseData = unit.phases[startPhase.id] || unit.phases[BASE_PHASE_ID] || hintedStart;
        if (!baseData) return;

        let x = baseData.x;
        let y = baseData.y;
        const drift = phaseDirectionByUnit(unit);
        const seed = unitSeed(unit.id);
        const startStatus = resolvePhaseMetaText(startPhase, unit, 'status') || (unit.phases[startPhase.id] && unit.phases[startPhase.id].status) || 'hazır';
        const startObjective = resolvePhaseMetaText(startPhase, unit, 'objective') || (unit.phases[startPhase.id] && unit.phases[startPhase.id].objective) || 'Temel görev başlangıcı';
        const startOutcome = resolvePhaseMetaText(startPhase, unit, 'outcome') || (unit.phases[startPhase.id] && unit.phases[startPhase.id].outcome) || 'Saha dağılımı tamamlandı';
        unit.phases[startPhase.id] = { x: Math.round(x), y: Math.round(y), status: startStatus, objective: startObjective, outcome: startOutcome };

        for (let i = startIndex + 1; i < phaseIds.length; i++) {
            const pid = phaseIds[i];
            const prevPid = phaseIds[i - 1];
            const phase = BATTLE_DATA.phases[i];

            if (destroyedAnchorIndex !== -1 && i >= destroyedAnchorIndex) {
                unit.phases[pid] = {
                    x: Math.round(basePhaseData.x),
                    y: Math.round(basePhaseData.y),
                    status: basePhaseData.status,
                    objective: basePhaseData.objective,
                    outcome: basePhaseData.outcome
                };
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
                const hinted = resolvePhaseLocation(phase, unit, i);
                if (hinted) {
                    x = hinted.x;
                    y = hinted.y;
                } else if (unit.type === 'deniz' && unit.faction !== 'ottoman') {
                    // Hayatta kalan müttefik gemileri Boğazdan çekilip Ege (açık deniz) yönüne sabitlenir
                    x = normalizeValue(60 + (seed % 4) * 20, 45, 680);
                    y = normalizeValue(450 + (seed % 3) * 20, 18, 548);
                } else {
                    const fx = Math.sin((i + seed) * 0.42) * 3;
                    const fy = Math.cos((i + seed) * 0.53) * 3;
                    // Anchor region kısıtı: birim anchorRegion'dan maxDrift'ten fazla uzaklaşamaz
                    const anchor = unit.anchorRegion && LOCATION_BY_ID[unit.anchorRegion];
                    if (anchor) {
                        const maxDrift = 35;
                        x = normalizeValue(x + drift.x * 4 + fx, Math.max(45, anchor.x - maxDrift), Math.min(680, anchor.x + maxDrift));
                        y = normalizeValue(y + drift.y * 4 + fy, Math.max(18, anchor.y - maxDrift), Math.min(548, anchor.y + maxDrift));
                    } else {
                        x = normalizeValue(x + drift.x * 7 + fx, 45, 680);
                        y = normalizeValue(y + drift.y * 7 + fy, 18, 548);
                    }
                }

                // ── TERRAIN GATE: entity tipine uygun terrain'e clamp ──
                const typeDef = ENTITY_TYPES[unit.entityType];
                if (typeDef) {
                    const terrain = getTerrainAtPoint(x, y);
                    if (!typeDef.allowedTerrain.includes(terrain)) {
                        const clamped = clampToAllowedTerrain(x, y, typeDef.allowedTerrain);
                        x = clamped.x;
                        y = clamped.y;
                    }
                }

                const status = resolvePhaseMetaText(phase, unit, 'status') || deriveUnitPhaseState(unit, i, phase && phase.title);
                const objective = resolvePhaseMetaText(phase, unit, 'objective') || `${phase ? phase.title : 'Sıradaki'} kapsamında konum al`;
                const outcome = resolvePhaseMetaText(phase, unit, 'outcome') || `${phase ? phase.title : 'Sıradaki'} hedefi için pozisyon alındı`;
                unit.phases[pid] = {
                    x: Math.round(x),
                    y: Math.round(y),
                    status,
                    objective,
                    outcome
                };
            } else {
                const existing = unit.phases[pid];
                x = existing.x ?? x;
                y = existing.y ?? y;
            }
        }
    });
}

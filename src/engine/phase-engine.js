// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Faz Motoru
// Günlük faz üretimi, faz yönetimi, timeline veri hazırlığı
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { HISTORICAL_ANCHORS } from '../data/historical-anchors.js';
import {
    isoToUTCDate, utcDateToISO, addUTCDateDays,
    formatISOToTR, dayDiffISO, normalizeValue, normalizeDateText
} from './date-utils.js';
import { unitSeed } from './position-engine.js';
// Dynamic import — 1.1MB dosyayı ana modül parse'ını bloklamadan yükle
let BOOK_PHASE_EVENTS = [];
let BOOK_WEEKLY_GUIDE = [];
let _bookDataLoaded = false;

export async function loadBookData() {
    if (_bookDataLoaded) return;
    try {
        const mod = await import('../../book/gallipoli-events.js');
        BOOK_PHASE_EVENTS = mod.BOOK_PHASE_EVENTS || [];
        BOOK_WEEKLY_GUIDE = mod.BOOK_WEEKLY_GUIDE || [];
        _bookDataLoaded = true;
    } catch (err) {
        console.warn('Kitap verisi yüklenemedi:', err);
    }
}
import { CANONICAL_POSITIONS, getCanonicalPosition } from '../data/canonical-positions.js';

// ── Modül State ──
let UNIT_ENTRY_PHASE_INDEX = {};
let PHASE_MAJOR_ORDER = [];
let NAVAL_ERA_END_INDEX = 0;
let WEEKLY_GUIDE = [];

export function getUnitEntryPhaseIndex() { return UNIT_ENTRY_PHASE_INDEX; }
export function getPhaseMajorOrder() { return PHASE_MAJOR_ORDER; }
export function getNavalEraEndIndex() { return NAVAL_ERA_END_INDEX; }
export function getWeeklyGuide() { return WEEKLY_GUIDE; }

// ── Phase Blend Utilities ──

function chooseBlendedValue(prev, next, ratio, seed) {
    if (!prev && !next) return undefined;
    if (!prev) return next;
    if (!next) return prev;
    if (prev === next) return prev;
    const threshold = ((seed % 100) / 100);
    return ratio >= threshold ? next : prev;
}

function blendObjectMaps(prevMap, nextMap, ratio, salt = 0, coherent = false) {
    const prev = prevMap && typeof prevMap === 'object' ? prevMap : {};
    const next = nextMap && typeof nextMap === 'object' ? nextMap : {};
    const out = {};
    if (coherent) {
        // Tüm key'ler aynı anda geçiş yapar — birimler arası sahte yer değiştirme olmaz
        const useNext = ratio >= 0.5;
        [...new Set([...Object.keys(prev), ...Object.keys(next)])].forEach((key) => {
            const val = useNext ? (next[key] || prev[key]) : (prev[key] || next[key]);
            if (val) out[key] = val;
        });
    } else {
        [...new Set([...Object.keys(prev), ...Object.keys(next)])].forEach((key) => {
            const val = chooseBlendedValue(prev[key], next[key], ratio, unitSeed(`${key}:${salt}`));
            if (val) out[key] = val;
        });
    }
    return Object.keys(out).length ? out : null;
}

function mergeLocationIdArrays(a, b) {
    const merged = [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];
    return merged.length ? merged : ['gelibolu'];
}

// ── Phase Builders ──

export function isMajorPhase(phase) {
    return !phase || phase.importance !== 'minor';
}

/** Template phase'lerden tüm kampanya boyunca günlük phase'ler üret */
function buildDailyHistoricalPhases(templatePhases = []) {
    const start = isoToUTCDate('1914-11-03');
    const end = isoToUTCDate('1916-01-09');
    const totalDays = dayDiffISO(utcDateToISO(start), utcDateToISO(end)) + 1;
    const anchorsByIso = HISTORICAL_ANCHORS.reduce((acc, a) => { acc[a.iso] = a; return acc; }, {});

    const parsed = (Array.isArray(templatePhases) ? templatePhases : [])
        .map((p, idx) => ({ ...p, isoStart: p.isoStart || normalizeDateText(p.date, idx) }))
        .sort((a, b) => (a.isoStart < b.isoStart ? -1 : a.isoStart > b.isoStart ? 1 : 0));

    const parsedByIso = {};
    parsed.forEach((p) => {
        const prev = parsedByIso[p.isoStart];
        if (!prev || (p.importance === 'major' && prev.importance !== 'major')) parsedByIso[p.isoStart] = p;
    });

    const daily = [];
    let pointer = 0;
    for (let i = 0; i < totalDays; i++) {
        const d = addUTCDateDays(start, i);
        const iso = utcDateToISO(d);
        while (pointer + 1 < parsed.length && parsed[pointer + 1].isoStart <= iso) pointer += 1;
        const active = parsed[pointer] || parsed[0] || {};
        const next = parsed[pointer + 1] || active;
        const span = Math.max(1, dayDiffISO(active.isoStart || iso, next.isoStart || iso));
        const ratio = normalizeValue(dayDiffISO(active.isoStart || iso, iso) / span, 0, 1);
        const exactParsed = parsedByIso[iso] || null;
        const anchor = anchorsByIso[iso] || null;
        const base = exactParsed || active;

        daily.push({
            id: `gun-${String(i + 1).padStart(4, '0')}`,
            isoStart: iso,
            date: formatISOToTR(iso),
            title: anchor ? anchor.title : (exactParsed ? exactParsed.title : (base.title || 'Cephe Günü')),
            narration: anchor ? anchor.narration : (exactParsed ? exactParsed.narration : (base.narration || `${formatISOToTR(iso)} tarihinde cephede hareketlilik sürdü.`)),
            importance: anchor ? 'major' : (exactParsed ? exactParsed.importance : 'minor'),
            locationIds: anchor && Array.isArray(anchor.locationIds) ? anchor.locationIds : mergeLocationIdArrays(active.locationIds, next.locationIds),
            locationByFaction: anchor && anchor.locationByFaction ? anchor.locationByFaction : blendObjectMaps(active.locationByFaction, next.locationByFaction, ratio, i + 11, true),
            locationByUnit: blendObjectMaps(active.locationByUnit, next.locationByUnit, ratio, i + 23, true),
            statusByFaction: blendObjectMaps(active.statusByFaction, next.statusByFaction, ratio, i + 37),
            objectiveByFaction: blendObjectMaps(active.objectiveByFaction, next.objectiveByFaction, ratio, i + 49),
            outcomeByFaction: blendObjectMaps(active.outcomeByFaction, next.outcomeByFaction, ratio, i + 67)
        });
    }

    return daily;
}

/** Kitap verisinden phase listesi al */
function getParsedPhasesFromBook() {
    const parsed = BOOK_PHASE_EVENTS;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed
        .map((p, i) => ({
            id: String(p.id || `epub-faz-${String(i + 1).padStart(2, '0')}`),
            date: p.date || '1915',
            isoStart: p.isoStart || p.isoDate || null,
            title: (p.title && p.title.trim()) || `Faz ${i + 1}`,
            narration: p.narration || `Kaynak metin: ${p.titleEn || p.title || 'Bilinmiyor'}.`,
            importance: p.importance === 'major' ? 'major' : 'minor',
            locationIds: Array.isArray(p.locationIds) ? p.locationIds : [],
            locationByFaction: p.locationByFaction && typeof p.locationByFaction === 'object' ? p.locationByFaction : null,
            locationByUnit: p.locationByUnit && typeof p.locationByUnit === 'object' ? p.locationByUnit : null,
            statusByFaction: p.statusByFaction && typeof p.statusByFaction === 'object' ? p.statusByFaction : null,
            objectiveByFaction: p.objectiveByFaction && typeof p.objectiveByFaction === 'object' ? p.objectiveByFaction : null,
            outcomeByFaction: p.outcomeByFaction && typeof p.outcomeByFaction === 'object' ? p.outcomeByFaction : null
        }))
        .filter(Boolean);
}

/**
 * Kanonik pozisyon override — BOOK_PHASE_EVENTS'teki gürültülü/hatalı
 * pozisyonları tarihsel kaynaklara dayalı ground-truth ile değiştirir.
 * Ayrıca:
 * - Mart 13 öncesi boş pozisyonları doldurur
 * - Batmış gemileri destroyed olarak işaretler
 */
function applyCanonicalPositions(phases) {
    for (const phase of phases) {
        const iso = phase.isoStart;
        if (!iso) continue;

        if (!phase.locationByUnit || typeof phase.locationByUnit !== 'object') {
            phase.locationByUnit = {};
        }

        for (const unitId of Object.keys(CANONICAL_POSITIONS)) {
            const canon = getCanonicalPosition(unitId, iso);
            if (!canon) continue;

            if (canon.location === 'destroyed') {
                // Batmış/çekilmiş birim — locationByUnit'ten kaldır
                delete phase.locationByUnit[unitId];
            } else {
                // Kanonik pozisyonu uygula (mevcut gürültülü veriyi override et)
                phase.locationByUnit[unitId] = canon.location;
            }
        }
    }
}

/** Phase genişletmeyi tetikle — kitap verisi varsa onu kullan, yoksa günlük phase üret */
function ensureExpandedPhases() {
    const parsedPhases = getParsedPhasesFromBook();
    WEEKLY_GUIDE = Array.isArray(BOOK_WEEKLY_GUIDE) ? BOOK_WEEKLY_GUIDE : [];
    if (parsedPhases && parsedPhases.length > 0) {
        BATTLE_DATA.phases = parsedPhases
            .map((p, idx) => ({ ...p, isoStart: p.isoStart || normalizeDateText(p.date, idx) }))
            .sort((a, b) => (a.isoStart < b.isoStart ? -1 : a.isoStart > b.isoStart ? 1 : 0));
        // Tarihsel kaynaklara dayalı pozisyon override
        applyCanonicalPositions(BATTLE_DATA.phases);
        return;
    }
    BATTLE_DATA.phases = buildDailyHistoricalPhases(BATTLE_DATA.phases);
}

/** Birim giriş indekslerini hesapla */
function computeUnitEntryPhaseIndexes() {
    const map = {};

    BATTLE_DATA.units.forEach((unit) => {
        const minIso = getMinimumStartIsoForUnit(unit);
        const minIsoIndex = getFirstPhaseIndexForIso(minIso);
        if (unit.type === 'deniz') {
            map[unit.id] = minIsoIndex;
            return;
        }
        let entryIndex = BATTLE_DATA.phases.findIndex((phase, idx) => {
            if (idx < minIsoIndex) return false;
            if (!isMajorPhase(phase)) return false;
            if (phase.locationByUnit && phase.locationByUnit[unit.id]) return true;
            if (phase.locationByFaction && phase.locationByFaction[unit.faction]) return true;
            if (!Array.isArray(phase.locationIds) || !phase.locationIds.length) return false;
            if (unit.type === 'deniz') {
                return phase.locationIds.some((id) => id === 'bogaz' || id === 'canakkale' || id === 'kumkale' || id === 'seddulbahir');
            }
            return true;
        });

        if (entryIndex === -1) entryIndex = minIsoIndex;
        map[unit.id] = entryIndex;
    });

    UNIT_ENTRY_PHASE_INDEX = map;
}

/** Major phase sıralamasını hesapla */
function computePhaseMajorOrder() {
    let majorCount = 0;
    PHASE_MAJOR_ORDER = BATTLE_DATA.phases.map((phase) => {
        if (isMajorPhase(phase)) majorCount += 1;
        return majorCount || 1;
    });
    const firstLandings = BATTLE_DATA.phases.findIndex((phase) => String(phase.isoStart || '') >= '1915-04-25');
    NAVAL_ERA_END_INDEX = firstLandings === -1 ? Math.max(0, BATTLE_DATA.phases.length - 1) : Math.max(0, firstLandings - 1);
}

/** ISO tarihine karşılık gelen ilk phase indeksini bul */
export function getFirstPhaseIndexForIso(isoDate) {
    const idx = BATTLE_DATA.phases.findIndex((phase) => String(phase.isoStart || '') >= isoDate);
    return idx === -1 ? 0 : idx;
}

/** Birim için minimum başlangıç ISO tarihini belirle */
export function getMinimumStartIsoForUnit(unit) {
    if (unit.type === 'deniz' && unit.faction !== 'ottoman') return '1914-11-03';
    if (unit.faction !== 'ottoman') return '1915-04-25';
    return '1914-11-03';
}

/** ISO tarihine karşılık gelen phase indeksi */
export function getPhaseIndexByIso(iso) {
    if (!iso) return 0;
    const idx = BATTLE_DATA.phases.findIndex((p) => String(p.isoStart || '') >= iso);
    return idx === -1 ? Math.max(0, BATTLE_DATA.phases.length - 1) : idx;
}

/** Aktif hafta indeksini bul */
export function getActiveWeekIndex(currentPhaseIndex) {
    if (!WEEKLY_GUIDE.length) return currentPhaseIndex;
    const iso = String(BATTLE_DATA.phases[currentPhaseIndex]?.isoStart || '');
    const idx = WEEKLY_GUIDE.findIndex((w) => w.startIso <= iso && iso <= w.endIso);
    if (idx !== -1) return idx;
    if (iso < WEEKLY_GUIDE[0].startIso) return 0;
    return WEEKLY_GUIDE.length - 1;
}

/** Deniz dönemi indeksi mi? */
export function isNavalEraPhaseIndex(phaseIndex) {
    return phaseIndex >= 0 && phaseIndex <= NAVAL_ERA_END_INDEX;
}

/** Deniz dönemi ilerleme oranı (0-1) */
export function getNavalEraProgress(phaseIndex) {
    if (!isNavalEraPhaseIndex(phaseIndex)) return 1;
    if (NAVAL_ERA_END_INDEX <= 0) return 1;
    return normalizeValue(phaseIndex / NAVAL_ERA_END_INDEX, 0, 1);
}

/** Tüm veri hazırlama orchestrator — init() tarafından çağrılır */
export async function hydrateTimelineData() {
    await loadBookData();
    ensureExpandedPhases();
    computePhaseMajorOrder();
    computeUnitEntryPhaseIndexes();
}

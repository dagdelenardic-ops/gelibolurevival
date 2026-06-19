// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Faz Motoru
// Günlük faz üretimi, faz yönetimi, timeline veri hazırlığı
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA, getMapLocationById, getMapLocationId } from '../data/battle-data.js?v=20260618-3d-spectacle-r2';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CROP_TOP, MAP_VIEW_HEIGHT } from '../data/coordinate-map.js?v=20260618-3d-spectacle-r2';
import { HISTORICAL_ANCHORS } from '../data/historical-anchors.js?v=20260618-3d-spectacle-r2';
import { GUIDED_CAMPAIGN_CHAPTERS, getGuidedCampaignChapter } from '../data/guided-campaign.js?v=20260618-3d-spectacle-r2';
import {
    isoToUTCDate, utcDateToISO, addUTCDateDays,
    formatISOToTR, dayDiffISO, normalizeValue, normalizeDateText
} from './date-utils.js?v=20260618-3d-spectacle-r2';
import { unitSeed } from './position-engine.js?v=20260618-3d-spectacle-r2';
// Dynamic import — 1.1MB dosyayı ana modül parse'ını bloklamadan yükle
let BOOK_PHASE_EVENTS = [];
let BOOK_WEEKLY_GUIDE = [];
let _bookDataLoaded = false;

export async function loadBookData() {
    if (_bookDataLoaded) return;
    try {
        const mod = await import('../../book/gallipoli-events.js?v=20260618-3d-spectacle-r2');
        BOOK_PHASE_EVENTS = mod.BOOK_PHASE_EVENTS || [];
        BOOK_WEEKLY_GUIDE = mod.BOOK_WEEKLY_GUIDE || [];
        _bookDataLoaded = true;
    } catch (err) {
        console.warn('Kitap verisi yüklenemedi:', err);
    }
}
import { CANONICAL_POSITIONS, getCanonicalPosition, OFF_MAP_LOCATIONS } from '../data/canonical-positions.js?v=20260618-3d-spectacle-r2';

const BASE_PHASE_TEMPLATES = JSON.parse(JSON.stringify(BATTLE_DATA.phases));

// ── Modül State ──
let UNIT_ENTRY_PHASE_INDEX = {};
let PHASE_MAJOR_ORDER = [];
let NAVAL_ERA_END_INDEX = 0;
let WEEKLY_GUIDE = [];

const MOBILE_STORY_CHAPTERS = GUIDED_CAMPAIGN_CHAPTERS;

const UNIT_CLASS_PRIORITY = {
    mine_layer: 6,
    battery: 5,
    regiment: 4,
    brigade: 3,
    division: 2,
    corps: 1,
    army_hq: 0,
    ship: 4
};

const UNIT_AVAILABILITY_WINDOWS = {
    '5-ordu': { startIso: '1915-03-24', endIso: '1916-01-09' },
    'allied-minesweepers': { startIso: '1915-02-19', endIso: '1915-03-18' },
    'hms-queen-elizabeth': { startIso: '1915-02-19', endIso: '1915-03-22' },
    'hms-irresistible': { startIso: '1915-02-19', endIso: '1915-03-18' },
    'hms-ocean': { startIso: '1915-02-19', endIso: '1915-03-18' },
    'bouvet': { startIso: '1915-02-19', endIso: '1915-03-18' },
    'suffren': { startIso: '1915-02-19', endIso: '1915-03-22' },
    '29-div': { startIso: '1915-04-25', endIso: '1916-01-09' },
    'ix-corps': { startIso: '1915-08-06', endIso: '1915-12-20' },
    'ss-river-clyde': { startIso: '1915-04-25', endIso: '1915-05-01' },
    'anzac-1div': { startIso: '1915-04-25', endIso: '1915-12-20' },
    'nz-inf': { startIso: '1915-04-25', endIso: '1915-12-20' },
    'fr-corps': { startIso: '1915-04-25', endIso: '1916-01-09' }
};

export function getUnitEntryPhaseIndex() { return UNIT_ENTRY_PHASE_INDEX; }
export function getPhaseMajorOrder() { return PHASE_MAJOR_ORDER; }
export function getNavalEraEndIndex() { return NAVAL_ERA_END_INDEX; }
export function getWeeklyGuide() { return WEEKLY_GUIDE; }
export function getMobileStoryChapters() { return MOBILE_STORY_CHAPTERS; }

export function getMobileStoryChapter(isoDate) {
    return getGuidedCampaignChapter(isoDate);
}

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

function flattenLocationValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value) return [value];
    return [];
}

function removeRepeatedNarrationSentences(text) {
    const sentences = String(text || '')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    if (sentences.length < 2) return String(text || '').trim();

    const seen = new Set();
    const unique = [];
    for (const sentence of sentences) {
        const key = sentence.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(sentence);
    }
    return unique.join(' ');
}

function cleanNarrationText(rawNarration) {
    if (!rawNarration) return '';
    const cleaned = String(rawNarration)
        .split(/\s*\|\s*/)
        .map((part) => part
            .replace(/^Açık Olay:\s*/i, '')
            .replace(/^Operasyon Durumu:\s*/i, '')
            .replace(/^Haftalık Bağlam:\s*/i, '')
            .trim())
        .filter(Boolean)
        .join(' ')
        .replace(/^[^.?!]*\bEPUB\b[^.?!]*[.?!]\s*/i, '')
        .replace(/\bEPUB\s*kayd[ıi]\b/gi, '')
        .replace(/(?:Resmi Günlük Kayıt|Günlük Akış|Haftalık Bağlam|Haftalık Bağ|Kayd[ıi])\s*:?/gi, '')
        .replace(/\s*[·–-]\s*(?=[·–-]|\.|,|;|:|$)/g, '')
        .replace(/^[\s·–-]+|[\s·–-]+$/g, '')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    return removeRepeatedNarrationSentences(cleaned);
}

function cleanPhaseTitle(rawTitle) {
    return String(rawTitle || '')
        .replace(/\s*\(EPUB[^)]*\)/gi, '')
        .replace(/(?:EPUB|Resmi Günlük Kayıt|Günlük Akış|Haftalık Bağlam|Haftalık Bağ|Kayd[ıi])\s*:?/gi, '')
        .replace(/\s*·\s*/g, ' · ')
        .replace(/\s*[·–-]\s*(?=[·–-]|$)/g, '')
        .replace(/^[\s·–-]+|[\s·–-]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || 'Cephe Günü';
}

function normalizeFifthArmyText(value) {
    return String(value || '')
        .replace(/23 Mart'ta 5\. Ordu kuruldu; Liman von Sanders komutayı devraldı\.?/g, "24 Mart'ta 5. Ordu kuruldu; Liman von Sanders komutayı devraldı.")
        .replace(/23 Mart'ta 5\. Ordu kuruldu/g, "24 Mart'ta 5. Ordu kuruldu")
        .replace(/5\. Ordu kuruldu; Alman Mareşal Liman von Sanders komutayı devraldı\.?/g, '5. Ordu kuruluş hazırlıkları ve yarımada savunma düzeni öne çıkıyor.');
}

function normalizeBookPhaseConsistency(phase) {
    const normalized = {
        ...phase,
        narration: normalizeFifthArmyText(phase.narration)
    };

    if (normalized.isoStart === '1915-03-23' && /^5\. Ordu'nun Kuruluşu\b/.test(normalized.title)) {
        return {
            ...normalized,
            title: '5. Ordu Hazırlığı',
            narration: 'Kara harekâtı için 5. Ordu hazırlıkları sürüyor; komuta düzeni 24 Mart günü netleşecek.'
        };
    }

    if (
        normalized.isoStart > '1915-03-24' &&
        normalized.isoStart <= '1915-03-29' &&
        /^5\. Ordu'nun Kuruluşu\b/.test(normalized.title)
    ) {
        return {
            ...normalized,
            title: 'Kara Harekâtı Hazırlığı'
        };
    }

    return normalized;
}

function normalizeWeeklyGuideConsistency(guide) {
    const normalized = {
        ...guide,
        title: cleanPhaseTitle(guide?.title || ''),
        narration: normalizeFifthArmyText(cleanNarrationText(guide?.narration || ''))
    };

    if (normalized.startIso === '1915-03-23' && normalized.endIso === '1915-03-29') {
        return {
            ...normalized,
            title: '5. Ordu ve Çıkarma Hazırlıkları',
            narration: "24 Mart'ta 5. Ordu kuruldu; Liman von Sanders komutayı devraldı. Deniz harekâtının ardından kara çıkarması hazırlıkları hızlandı."
        };
    }

    return normalized;
}

function buildMobileSummary(text) {
    const cleaned = cleanNarrationText(text);
    if (!cleaned) return '';

    const sentences = cleaned
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    const summary = sentences.slice(0, 2).join(' ').trim() || cleaned;
    if (summary.length <= 220) return summary;

    const shortened = summary.slice(0, 217);
    const lastSpace = shortened.lastIndexOf(' ');
    return `${(lastSpace > 120 ? shortened.slice(0, lastSpace) : shortened).trim()}...`;
}

function collectPhaseLocationIds(phase, chapter) {
    const ids = new Set();
    flattenLocationValue(phase.locationIds).forEach((id) => ids.add(id));
    Object.values(phase.locationByFaction || {}).forEach((value) => {
        flattenLocationValue(value).forEach((id) => ids.add(id));
    });
    Object.values(phase.locationByUnit || {}).forEach((value) => {
        flattenLocationValue(value).forEach((id) => ids.add(id));
    });
    (chapter?.defaultLocations || []).forEach((id) => ids.add(id));
    return [...ids].filter((id) => BATTLE_DATA.locations.some((location) => location.id === id));
}

function buildMapFocus(locationIds) {
    const coords = locationIds
        .map((id) => getMapLocationById(id))
        .filter(Boolean);

    if (!coords.length) {
        return {
            x: 0,
            y: MAP_CROP_TOP,
            w: MAP_WIDTH,
            h: MAP_VIEW_HEIGHT,
            locationIds: [],
            key: 'full-map'
        };
    }

    const xs = coords.map((location) => location.x);
    const ys = coords.map((location) => location.y);
    const paddingX = coords.length === 1 ? 370 : 290;
    const paddingY = coords.length === 1 ? 300 : 240;
    const minW = coords.length === 1 ? 850 : 1100;
    const minH = coords.length === 1 ? 700 : 800;
    const maxW = 1800;
    const maxH = 1400;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = Math.min(maxW, Math.max(minW, (maxX - minX) + paddingX * 2));
    const h = Math.min(maxH, Math.max(minH, (maxY - minY) + paddingY * 2));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = Math.max(0, Math.min(MAP_WIDTH - w, centerX - w / 2));
    const y = Math.max(MAP_CROP_TOP, Math.min(MAP_HEIGHT - h, centerY - h / 2));

    return {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
        locationIds,
        key: locationIds.join('|')
    };
}

function getUnitDisplayScore(unit, phase, focusIds) {
    const focusSet = focusIds instanceof Set ? focusIds : new Set(focusIds);
    let score = 0;

    if (focusSet.has(getMapLocationId(unit.anchorRegion))) score += 4;

    const unitLocation = phase.locationByUnit && phase.locationByUnit[unit.id];
    flattenLocationValue(unitLocation).forEach((id) => {
        if (focusSet.has(getMapLocationId(id))) score += 6;
    });

    const factionLocation = phase.locationByFaction && phase.locationByFaction[unit.faction];
    flattenLocationValue(factionLocation).forEach((id) => {
        if (focusSet.has(getMapLocationId(id))) score += 2;
    });

    if (unit.type === 'deniz' && focusSet.has('bogaz')) score += 3;
    score += UNIT_CLASS_PRIORITY[unit.unitClass] || 0;

    return score;
}

function isUnitAvailableForPhase(unit, phase) {
    const iso = String(phase?.isoStart || '');
    const window = UNIT_AVAILABILITY_WINDOWS[unit.id];
    if (!window || !iso) return true;
    if (window.startIso && iso < window.startIso) return false;
    if (window.endIso && iso > window.endIso) return false;
    return true;
}

function deriveVisibleUnitIds(phase, locationIds, chapter) {
    if (Array.isArray(phase?.guidedUnitIdsOverride) && phase.guidedUnitIdsOverride.length) {
        return phase.guidedUnitIdsOverride.filter((id) => {
            const unit = BATTLE_DATA.units.find((item) => item.id === id);
            return unit && isUnitAvailableForPhase(unit, phase);
        });
    }

    const focusSet = new Set(locationIds.map((id) => getMapLocationId(id)));
    const scored = BATTLE_DATA.units
        .filter((unit) => isUnitAvailableForPhase(unit, phase))
        .map((unit) => ({ unit, score: getUnitDisplayScore(unit, phase, focusSet) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.unit.name.localeCompare(b.unit.name, 'tr'));

    const maxVisibleUnits = Number(chapter?.maxVisibleUnits) > 0 ? Number(chapter.maxVisibleUnits) : 8;
    const scoreFloor = Number(chapter?.scoreFloor) > 0 ? Number(chapter.scoreFloor) : 4;
    const factionCaps = chapter?.factionUnitCaps && typeof chapter.factionUnitCaps === 'object'
        ? chapter.factionUnitCaps
        : {};
    const visibleIds = [...(chapter?.primaryUnitIds || [])]
        .filter((id) => {
            const unit = BATTLE_DATA.units.find((item) => item.id === id);
            return unit && isUnitAvailableForPhase(unit, phase);
        });
    const factionCounts = new Map();
    visibleIds.forEach((id) => {
        const unit = BATTLE_DATA.units.find((item) => item.id === id);
        if (unit) factionCounts.set(unit.faction, (factionCounts.get(unit.faction) || 0) + 1);
    });

    for (const entry of scored) {
        if (visibleIds.includes(entry.unit.id)) continue;
        if (entry.score < scoreFloor) continue;
        const count = factionCounts.get(entry.unit.faction) || 0;
        const cap = Number.isFinite(factionCaps[entry.unit.faction]) ? factionCaps[entry.unit.faction] : null;
        if (cap !== null && count >= cap) continue;
        if (count >= 3 && visibleIds.length >= 6) continue;
        visibleIds.push(entry.unit.id);
        factionCounts.set(entry.unit.faction, count + 1);
        if (visibleIds.length >= maxVisibleUnits) break;
    }

    return visibleIds.slice(0, maxVisibleUnits);
}

function getAutoplayHoldMs(phase, chapter) {
    const iso = String(phase.isoStart || '');
    if (iso < '1915-02-19' && phase.importance !== 'major') return 900;
    if (chapter.id === 'nusret') return phase.importance === 'major' ? 5600 : 2200;
    if (chapter.id === 'march18') return 5200;
    if (chapter.id === 'landings' && phase.importance === 'major') return 6200;
    if (chapter.id === 'august' && phase.importance === 'major') return 6800;
    if (phase.importance === 'major') return 4600;
    if (chapter.id === 'opening') return 1200;
    if (chapter.id === 'evacuation') return 1600;
    return 1400;
}

function decoratePhasesForMobile() {
    // Belgesel kamerası: kamera "sahne"yi (en son major anchor'ın mapFocusOverride'ı)
    // izler ve aradaki anchor'sız günlerde bu çerçeveyi KORUR — her gün yeniden
    // hesaplayıp zıplamaz. Yeni anchor gelince yumuşakça yeni sahneye kayar.
    let sceneFocus = null;
    BATTLE_DATA.phases = BATTLE_DATA.phases.map((phase) => {
        const chapter = getMobileStoryChapter(phase.isoStart);
        const locationIds = collectPhaseLocationIds(phase, chapter);
        let mapFocus;
        // Sahne-belirleyici = küratörlü override VEYA major beat (anchor/şablon).
        // Major günler kendi sektörüne çerçeveler ve "sahne"yi günceller; aradaki
        // minor günler bu çerçeveyi KORUR (kamera her gün zıplamaz, sahne tutulur).
        const isSceneSetter = !!phase.mapFocusOverride || phase.importance === 'major';
        if (isSceneSetter) {
            mapFocus = phase.mapFocusOverride ? { ...phase.mapFocusOverride } : buildMapFocus(locationIds);
            sceneFocus = mapFocus;
        } else if (sceneFocus) {
            mapFocus = { ...sceneFocus };
        } else {
            mapFocus = buildMapFocus(locationIds); // henüz sahne kurulmadan (erken günler)
        }
        return {
            ...phase,
            mobilePriority: phase.importance === 'major' ? 'feature' : 'supporting',
            mobileSummary: buildMobileSummary(phase.narration),
            autoplayHoldMs: getAutoplayHoldMs(phase, chapter),
            mapFocus,
            guidedChapterId: chapter.id,
            guidedChapterTitle: chapter.title,
            guidedChapterShortTitle: chapter.shortTitle,
            guidedChapterPromise: chapter.promise,
            guidedChapterOutcome: chapter.outcome,
            guidedChapterMetric: chapter.metricLabel,
            guidedChapterCasualty: chapter.casualtyLabel,
            guidedUnitIds: deriveVisibleUnitIds(phase, mapFocus.locationIds, chapter),
            mobileChapterId: chapter.id,
            mobileChapterTitle: chapter.title,
            mobileChapterShortTitle: chapter.shortTitle,
            mobileVisibleUnitIds: deriveVisibleUnitIds(phase, mapFocus.locationIds, chapter)
        };
    });
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
        // İlk template fazından önceki günler (3 Kas 1914 – 17 Mar 1915) naval-assault'ı
        // miras almaz; nötr "hazırlık" günü olur (yoksa "4 Kasım = 18 Mart Deniz Harekâtı")
        const beforeFirst = parsed.length > 0 && iso < (parsed[0].isoStart || iso);
        const active = beforeFirst ? {} : (parsed[pointer] || parsed[0] || {});
        const next = beforeFirst ? {} : (parsed[pointer + 1] || active);
        const span = Math.max(1, dayDiffISO(active.isoStart || iso, next.isoStart || iso));
        const ratio = normalizeValue(dayDiffISO(active.isoStart || iso, iso) / span, 0, 1);
        const exactParsed = parsedByIso[iso] || null;
        const anchor = anchorsByIso[iso] || null;
        const base = beforeFirst ? {} : (exactParsed || active);

        daily.push({
            id: `gun-${String(i + 1).padStart(4, '0')}`,
            isoStart: iso,
            date: formatISOToTR(iso),
            title: cleanPhaseTitle(anchor ? anchor.title : (exactParsed ? exactParsed.title : (base.title || 'Cephe Günü'))),
            narration: cleanNarrationText(anchor ? anchor.narration : (exactParsed ? exactParsed.narration : (base.narration || `${formatISOToTR(iso)} tarihinde cephede hareketlilik sürdü.`))),
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
            title: cleanPhaseTitle((p.title && p.title.trim()) || `Faz ${i + 1}`),
            narration: cleanNarrationText(p.narration || `Kaynak metin: ${p.titleEn || p.title || 'Bilinmiyor'}.`),
            importance: p.importance === 'major' ? 'major' : 'minor',
            locationIds: Array.isArray(p.locationIds) ? p.locationIds : [],
            locationByFaction: p.locationByFaction && typeof p.locationByFaction === 'object' ? p.locationByFaction : null,
            locationByUnit: p.locationByUnit && typeof p.locationByUnit === 'object' ? p.locationByUnit : null,
            statusByFaction: p.statusByFaction && typeof p.statusByFaction === 'object' ? p.statusByFaction : null,
            objectiveByFaction: p.objectiveByFaction && typeof p.objectiveByFaction === 'object' ? p.objectiveByFaction : null,
            outcomeByFaction: p.outcomeByFaction && typeof p.outcomeByFaction === 'object' ? p.outcomeByFaction : null
        }))
        .map(normalizeBookPhaseConsistency)
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

            if (OFF_MAP_LOCATIONS.has(canon.location)) {
                // Batmış/çekilmiş/tahliye edilmiş birim — locationByUnit'ten kaldır
                delete phase.locationByUnit[unitId];
            } else {
                // Kanonik pozisyonu uygula (mevcut gürültülü veriyi override et)
                phase.locationByUnit[unitId] = canon.location;
            }
        }
    }
}

function applyHistoricalAnchors(phases) {
    const anchorsByIso = HISTORICAL_ANCHORS.reduce((acc, anchor) => {
        acc[anchor.iso] = anchor;
        return acc;
    }, {});

    for (const phase of phases) {
        const anchor = anchorsByIso[phase.isoStart];
        if (!anchor) continue;
        phase.title = cleanPhaseTitle(anchor.title);
        phase.narration = cleanNarrationText(anchor.narration);
        phase.importance = 'major';
        if (Array.isArray(anchor.locationIds)) phase.locationIds = anchor.locationIds;
        if (anchor.locationByFaction) phase.locationByFaction = anchor.locationByFaction;
        if (anchor.mapFocusOverride) phase.mapFocusOverride = anchor.mapFocusOverride;
        if (Array.isArray(anchor.guidedUnitIds)) phase.guidedUnitIdsOverride = anchor.guidedUnitIds;
    }
}

/** Phase genişletmeyi tetikle — kitap verisi varsa onu kullan, yoksa günlük phase üret */
function cloneBasePhases() {
    return JSON.parse(JSON.stringify(BASE_PHASE_TEMPLATES));
}

function ensureExpandedPhases(options = {}) {
    const { expandDaily = true } = options;
    BATTLE_DATA.phases = cloneBasePhases();

    const parsedPhases = getParsedPhasesFromBook();
    WEEKLY_GUIDE = Array.isArray(BOOK_WEEKLY_GUIDE)
        ? BOOK_WEEKLY_GUIDE.map(normalizeWeeklyGuideConsistency)
        : [];
    if (parsedPhases && parsedPhases.length > 0) {
        BATTLE_DATA.phases = parsedPhases
            .map((p, idx) => ({ ...p, isoStart: p.isoStart || normalizeDateText(p.date, idx) }))
            .sort((a, b) => (a.isoStart < b.isoStart ? -1 : a.isoStart > b.isoStart ? 1 : 0));
        applyHistoricalAnchors(BATTLE_DATA.phases);
        // Tarihsel kaynaklara dayalı pozisyon override
        applyCanonicalPositions(BATTLE_DATA.phases);
        return;
    }

    if (!expandDaily) {
        BATTLE_DATA.phases = BATTLE_DATA.phases
            .map((p, idx) => ({ ...p, isoStart: p.isoStart || normalizeDateText(p.date, idx), title: cleanPhaseTitle(p.title), narration: cleanNarrationText(p.narration) }))
            .sort((a, b) => (a.isoStart < b.isoStart ? -1 : a.isoStart > b.isoStart ? 1 : 0));
        applyHistoricalAnchors(BATTLE_DATA.phases);
        return;
    }

    BATTLE_DATA.phases = buildDailyHistoricalPhases(BATTLE_DATA.phases);
    applyHistoricalAnchors(BATTLE_DATA.phases);
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
    // Küratörlü availability penceresi varsa onu kullan (İtilaf filosu
    // 3 Kasım 1914'te değil, 19 Şubat 1915 Boğaz harekâtında sahneye girer)
    const window = UNIT_AVAILABILITY_WINDOWS[unit.id];
    if (window && window.startIso) return window.startIso;
    if (unit.id === 'allied-minesweepers') return '1915-02-19';
    if (unit.id === 'ix-corps') return '1915-08-06';
    // Pencere tablosunda olmayan İtilaf deniz birimi için güvenlik ağı:
    // ilk ciddi Boğaz harekâtı 19 Şubat 1915'te başladı (Hart, 2011)
    if (unit.type === 'deniz' && unit.faction !== 'ottoman') return '1915-02-19';
    if (unit.faction !== 'ottoman') return '1915-04-25';
    return '1914-11-03';
}

/** ISO tarihine karşılık gelen phase indeksi */
export function getPhaseIndexByIso(iso) {
    if (!iso) return 0;
    let idx = -1;
    for (let i = 0; i < BATTLE_DATA.phases.length; i++) {
        const phaseIso = String(BATTLE_DATA.phases[i].isoStart || '');
        if (phaseIso && phaseIso <= iso) idx = i;
        if (phaseIso && phaseIso > iso) break;
    }
    return idx === -1 ? 0 : idx;
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
export async function hydrateTimelineData(options = {}) {
    const { loadBook = true, expandDaily = true } = options;
    if (loadBook) {
        await loadBookData();
    } else {
        BOOK_PHASE_EVENTS = [];
        BOOK_WEEKLY_GUIDE = [];
    }
    ensureExpandedPhases({ expandDaily });
    decoratePhasesForMobile();
    computePhaseMajorOrder();
    computeUnitEntryPhaseIndexes();
}

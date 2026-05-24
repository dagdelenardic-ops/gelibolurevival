// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birim Sektör/Reserve Sınıflandırması
// ══════════════════════════════════════════════════════════════
// Mevcut HISTORICAL_ANCHORS verisinden saf türetim:
//   - 'frontline' / 'route' / 'exact'  → on-map + kaynak kilitli (lock)
//     (position-engine bu birimleri kaynaklı noktada bırakır; collision relax ve
//      cluster radial offset uygulanmaz — el yapımı tarihsel yerleşim korunur)
//   - 'inferred' + arka alan lokasyonu (gelibolu/bigali HQ) → off-map reserve
//     (haritada token gösterilmez, roster panele "İhtiyatta / Karargâhta"
//      rozetiyle düşer)
//
// Naval birlikler için kullanılmaz — onlar zaten position-engine'in
// getNarrativeNavalPosition + ALLIED_NAVAL_LANES sistemiyle yönetilir.
// ══════════════════════════════════════════════════════════════

import { HISTORICAL_ANCHORS, HISTORICAL_ROUTES } from './historical-map-data.js?v=20260523-markers-r2';
import { getCanonicalPosition } from './canonical-positions.js?v=20260523-markers-r2';

/**
 * Reserve/karargâh sayılan arka alan noktaları.
 * Bir anchor bunlardan birine yakınsa (radius içinde) off-map olarak işlenir.
 * Yeni arka alan eklemek için listeye nokta ekleyin.
 */
const RESERVE_LOCATION_POINTS = [
    { x: 1473, y: 1888, radius: 80, label: 'Bigalı / Gelibolu arka alan' }
    // Eceabat (1404, 1958) BURADA DEĞİL — Eceabat'ta savunma rezervinde olan
    // birimler (5. Tümen, 27. Alay erken dönem) cephe gerisi olsa da
    // coğrafi olarak haritada görünür — yarımada ortasında savunma noktası.
];

/**
 * Bir HISTORICAL_ANCHOR kaydının reserve (off-map) olup olmadığını belirler.
 *
 * Karar zinciri:
 *   1. kind 'frontline' / 'route' / 'exact' ASLA reserve değil — kaynaklı pozisyon.
 *   2. anchor.reserve === true → açıkça reserve (manuel override).
 *   3. kind 'inferred' VE nokta RESERVE_LOCATION_POINTS yakınında → reserve.
 *   4. Aksi halde değil. ("rezerv" kelimesi notta geçse de — 5. Tümen Eceabat
 *      gibi haritadaki gerçek konumlarda savunma rezervinde olan birimleri
 *      yanlışlıkla off-map yapmamak için kelime-bazlı tetikleme kaldırıldı.)
 */
export function isReserveAnchor(anchor) {
    if (!anchor) return false;
    const kind = String(anchor.kind || '').toLowerCase();
    if (kind === 'frontline' || kind === 'route' || kind === 'exact') return false;
    if (anchor.reserve === true) return true;
    if (kind !== 'inferred') return false;

    const point = anchor.point;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;

    return RESERVE_LOCATION_POINTS.some(
        (rp) => Math.hypot(point.x - rp.x, point.y - rp.y) < rp.radius
    );
}

/** ISO tarih, anchor'ın aktif aralığında mı? */
function inRange(anchor, isoDate) {
    if (!anchor || !isoDate) return false;
    if (anchor.exactDate) return anchor.exactDate === isoDate;
    return isoDate >= anchor.start && isoDate <= anchor.end;
}

/**
 * Bir birim/tarih için aktif HISTORICAL_ANCHOR (öncelik: exactDate > range).
 * Birden fazla anchor varsa kind > confidence sırasına göre seçer.
 */
function findActiveAnchor(unitId, isoDate) {
    if (!unitId || !isoDate) return null;
    const exact = HISTORICAL_ANCHORS.find((anchor) => anchor.unitId === unitId && anchor.exactDate === isoDate);
    if (exact) return exact;

    const candidates = HISTORICAL_ANCHORS.filter((anchor) => anchor.unitId === unitId && !anchor.exactDate && inRange(anchor, isoDate));
    if (!candidates.length) return null;

    const kindRank = { frontline: 0, route: 1, exact: 2, inferred: 3 };
    candidates.sort((a, b) => (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9));
    return candidates[0];
}

/** Birim/tarih için aktif route da varsa onu bul (engine zaten preferences kullanıyor). */
function findActiveRoute(unitId, isoDate) {
    if (!unitId || !isoDate) return null;
    return HISTORICAL_ROUTES.find((route) => route.unitIds.includes(unitId) && inRange(route, isoDate)) || null;
}

/**
 * Canonical pozisyon harita-dışı (hiddenOnMap) bir lokasyona mı işaret ediyor?
 * Anchor olmayan dönemler için fallback reserve tespiti.
 */
const HIDDEN_ON_MAP_LOCATIONS = new Set(['gelibolu']);

function classifyByCanonicalFallback(unitId, isoDate) {
    const canon = getCanonicalPosition(unitId, isoDate);
    if (!canon) return null;
    if (!HIDDEN_ON_MAP_LOCATIONS.has(canon.location)) return null;
    return {
        kind: 'reserve',
        anchor: null,
        anchorId: `canonical:${unitId}:${canon.location}`,
        sourceIds: [],
        note: canon.note || '',
        point: { x: 1473, y: 1888 }, // bigali proxy (gelibolu harita dışı)
        locationLabel: canon.location === 'gelibolu' ? '5. Ordu karargâhı (Gelibolu)' : 'Harita dışı'
    };
}

/**
 * Birim sektör çözümleyici — pozisyon motoru / app.js / roster için tek API.
 *
 * Sonuç ne döner:
 *   { kind: 'locked',  source: 'anchor'|'route', anchor, note, point, confidence }
 *       → on-map; pozisyon position-engine'in zaten kullandığı historicalPlacement
 *         ile aynı, ama "kilitli" rozeti collision/cluster bypass için kullanılır.
 *   { kind: 'reserve', anchor, note, locationLabel }
 *       → off-map; haritada gösterme, roster panele "İhtiyatta / Karargâhta" yaz.
 *   null
 *       → anchor yok; engine fallback'a düşsün.
 */
export function classifyUnitSector(unitId, isoDate) {
    const route = findActiveRoute(unitId, isoDate);
    if (route) {
        return {
            kind: 'locked',
            source: 'route',
            sourceIds: route.sourceIds || [],
            note: route.note || '',
            confidence: route.confidence || 'medium',
            anchorId: route.id
        };
    }

    const anchor = findActiveAnchor(unitId, isoDate);
    if (!anchor) {
        // Anchor yoksa canonical-positions üzerinden harita-dışı (gelibolu) kontrolü
        return classifyByCanonicalFallback(unitId, isoDate);
    }

    if (isReserveAnchor(anchor)) {
        return {
            kind: 'reserve',
            anchor,
            anchorId: anchor.id,
            sourceIds: anchor.sourceIds || [],
            note: anchor.note || '',
            point: anchor.point,
            locationLabel: guessLocationLabel(anchor)
        };
    }

    return {
        kind: 'locked',
        source: 'anchor',
        anchor,
        anchorId: anchor.id,
        sourceIds: anchor.sourceIds || [],
        note: anchor.note || '',
        point: anchor.point,
        confidence: anchor.confidence || 'medium'
    };
}

function guessLocationLabel(anchor) {
    const note = String(anchor?.note || '');
    if (/bigal[ıi]/i.test(note)) return 'Bigalı ihtiyatı';
    if (/gelibolu/i.test(note)) return '5. Ordu karargâhı (Gelibolu)';
    if (/eceabat|maydos/i.test(note)) return 'Eceabat/Maydos savunması';
    if (/karargah|karargâh/i.test(note)) return 'Karargâh bölgesi';
    if (/tahliye/i.test(note)) return 'Tahliye sonrası geri hat';
    return 'İhtiyat bölgesi';
}

/**
 * Verilen ISO tarih için reserve (off-map) birim listesini döndürür.
 * Roster panel "İhtiyatta / Karargâhta" bölümünü beslemek için.
 *
 * @param {Array} units - BATTLE_DATA.units veya alt küme
 * @param {string} isoDate
 * @returns {Array<{ unitId, anchorId, locationLabel, note, sourceIds }>}
 */
export function listReserveUnitsForIso(units, isoDate) {
    if (!Array.isArray(units) || !isoDate) return [];
    const out = [];
    for (const unit of units) {
        if (!unit || !unit.id) continue;
        // Naval birimler için reserve mantığı uygulanmaz
        if (unit.type === 'deniz') continue;
        const sector = classifyUnitSector(unit.id, isoDate);
        if (sector?.kind === 'reserve') {
            out.push({
                unitId: unit.id,
                unitName: unit.name,
                faction: unit.faction,
                unitClass: unit.unitClass,
                anchorId: sector.anchorId,
                locationLabel: sector.locationLabel,
                note: sector.note,
                sourceIds: sector.sourceIds
            });
        }
    }
    return out;
}

/**
 * Birim mevcut tarihte reserve (off-map) mi?
 * app.js setActivePhase gate'i bunu çağırıp render'ı atlar.
 */
export function isUnitReserveOnMap(unitId, isoDate) {
    const sector = classifyUnitSector(unitId, isoDate);
    return sector?.kind === 'reserve';
}

/**
 * Birim mevcut tarihte historical-locked mi?
 * position-engine collision relax ve cluster offset'i bu birimlere uygulamaz.
 */
export function isUnitHistoricallyLocked(unitId, isoDate) {
    const sector = classifyUnitSector(unitId, isoDate);
    return sector?.kind === 'locked';
}

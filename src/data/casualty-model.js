// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Kayıp Modeli
// Tarihsel verilere dayalı birim kuvvet azalma sistemi
// Toplam kayıp: Osmanlı ~250.000, İtilaf ~250.000 (Peter Hart, 2011)
// ══════════════════════════════════════════════════════════════

import { CANONICAL_POSITIONS, OFF_MAP_LOCATIONS } from './canonical-positions.js?v=20260618-3d-spectacle-r2';

/**
 * Tarihsel kayıp profilleri — birim başına kampanya boyunca kümülatif kayıp oranı.
 * `peakLossDate`: en yoğun kayıp günü
 * `totalLossRatio`: kampanya sonunda başlangıç kuvvetinin yüzde kaçı kayıp
 * `phases`: dönemsel günlük kayıp oranları (intensity çarpanı uygulanmadan)
 */
const CASUALTY_PROFILES = {
    // ── OSMANLI ──
    '5-ordu': {
        // Karargâh — doğrudan savaşmaz, düşük kayıp
        totalLossRatio: 0.05,
        baseDailyRate: 0.0001,
    },
    '3-kolordu': {
        totalLossRatio: 0.35,
        baseDailyRate: 0.0008,
    },
    '19-tumen': {
        // Arıburnu'nun en ağır yükünü taşıdı
        totalLossRatio: 0.65,
        baseDailyRate: 0.0015,
        peakDates: ['1915-04-25', '1915-05-19', '1915-08-06'],
    },
    '57-alay': {
        // "Ölmeyi emrediyorum" — kampanyanın en ağır kayıp birimi
        totalLossRatio: 0.85,
        baseDailyRate: 0.002,
        peakDates: ['1915-04-25', '1915-05-19'],
    },
    '27-alay': {
        totalLossRatio: 0.55,
        baseDailyRate: 0.0012,
        peakDates: ['1915-04-25', '1915-08-06'],
    },
    'mustahkem-mevki': {
        totalLossRatio: 0.15,
        baseDailyRate: 0.0003,
    },
    '7-tumen': {
        totalLossRatio: 0.45,
        baseDailyRate: 0.001,
    },
    '9-tumen': {
        totalLossRatio: 0.50,
        baseDailyRate: 0.0012,
        peakDates: ['1915-04-25', '1915-06-04', '1915-06-28'],
    },
    '5-tumen': {
        totalLossRatio: 0.45,
        baseDailyRate: 0.001,
        peakDates: ['1915-04-25', '1915-06-04', '1915-06-28'],
    },
    'nusret': {
        totalLossRatio: 0.0,
        baseDailyRate: 0,
    },

    // ── İTİLAF DENİZ ──
    'hms-queen-elizabeth': { totalLossRatio: 0.02, baseDailyRate: 0 },
    'hms-irresistible': { totalLossRatio: 0.20, baseDailyRate: 0 },
    'hms-ocean': { totalLossRatio: 0.05, baseDailyRate: 0 },
    'bouvet': { totalLossRatio: 640 / 721, baseDailyRate: 0 },
    'suffren': { totalLossRatio: 0.10, baseDailyRate: 0.0001 },

    // ── İTİLAF KARA ──
    '29-div': {
        // V Beach çıkarması — çok ağır kayıp
        totalLossRatio: 0.60,
        baseDailyRate: 0.0014,
        peakDates: ['1915-04-25', '1915-06-04', '1915-06-28'],
    },
    'ix-corps': {
        // Suvla çıkarması ve Ağustos taarruzları
        totalLossRatio: 0.38,
        baseDailyRate: 0.001,
        peakDates: ['1915-08-06', '1915-08-21'],
    },
    'anzac-1div': {
        totalLossRatio: 0.55,
        baseDailyRate: 0.0013,
        peakDates: ['1915-04-25', '1915-05-19', '1915-08-06'],
    },
    'nz-inf': {
        // Conkbayırı taarruzu — ağır kayıp
        totalLossRatio: 0.50,
        baseDailyRate: 0.0012,
        peakDates: ['1915-04-25', '1915-08-07', '1915-08-08'],
    },
    'fr-corps': {
        totalLossRatio: 0.40,
        baseDailyRate: 0.001,
        peakDates: ['1915-04-25', '1915-06-04'],
    },
};

// ── Kampanya tarih aralığı ──
const CAMPAIGN_START = '1914-11-03';

// Gemi batışı ile mürettebat kaybı aynı şey değildir. İngiliz zırhlılarında
// personelin büyük bölümü kurtarıldığı için kayıp oranı gemi kaderinden ayrı tutulur.
const NAVAL_LOSS_EVENTS = {
    'bouvet': { iso: '1915-03-18', lossRatio: 640 / 721 },
    'hms-irresistible': { iso: '1915-03-18', lossRatio: 0.20 },
    'hms-ocean': { iso: '1915-03-18', lossRatio: 0.05 },
};

/** ISO tarihler arası gün farkı */
function daysBetween(isoA, isoB) {
    const a = new Date(isoA + 'T00:00:00Z');
    const b = new Date(isoB + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
}

/**
 * Birimin sahaya konuşlandığı tarih — kümülatif kayıp bu tarihten
 * itibaren hesaplanır. Küratörlü canonical-positions'ın ilk segmenti
 * ground-truth deployment tarihidir (örn. 29. Tümen 1915-04-25, IX
 * Kolordusu 1915-08-06). Böylece birlik sahaya çıkmadan kayıp yemez.
 */
function getDeploymentIso(unitId) {
    const segments = CANONICAL_POSITIONS[unitId];
    const firstActive = Array.isArray(segments)
        ? segments.find((seg) => seg && !OFF_MAP_LOCATIONS.has(seg.location))
        : null;
    const firstStart = firstActive && firstActive.start;
    return firstStart && firstStart > CAMPAIGN_START ? firstStart : CAMPAIGN_START;
}

/**
 * Günlük kayıp çarpanı hesapla.
 * - `fighting` state: ×3
 * - `bombardment` state: ×1.5
 * - intensity > 7: ek ×1.5
 * - peakDate eşleşmesi: ek ×4
 */
function getDailyMultiplier(unitId, isoDate, intensity, unitState) {
    const profile = CASUALTY_PROFILES[unitId];
    if (!profile) return 0;

    let mult = 1;

    // Unit state çarpanı
    if (unitState === 'fighting') mult *= 3;
    else if (unitState === 'bombardment') mult *= 1.5;
    else if (unitState === 'marching') mult *= 0.3;
    else if (unitState === 'idle' || unitState === 'patrolling') mult *= 0.15;
    else mult *= 0.5; // default

    // Intensity çarpanı
    if (intensity >= 8) mult *= 2;
    else if (intensity >= 7) mult *= 1.5;
    else if (intensity >= 5) mult *= 1;
    else if (intensity >= 3) mult *= 0.5;
    else mult *= 0.2;

    // Peak date bonus
    if (profile.peakDates && profile.peakDates.includes(isoDate)) {
        mult *= 4;
    }

    return mult;
}

// ── Kuvvet Cache (faz bazlı hesaplama önbelleği) ──
let strengthCache = {};

/** Cache'i temizle (yeni kampanya başlatıldığında) */
export function resetStrengthCache() {
    strengthCache = {};
}

/**
 * Belirli bir tarihte birimin güncel kuvvetini hesapla.
 * Kampanya başından itibaren kümülatif kayıp uygular.
 *
 * @param {string} unitId
 * @param {string} isoDate
 * @param {number} intensity - o günün çatışma yoğunluğu (0-10)
 * @param {string} unitState - 'fighting' | 'bombardment' | 'idle' | ...
 * @param {number} baseStrength - birimin başlangıç kuvveti
 * @returns {{ current: number, loss: number, ratio: number }}
 */
export function getUnitStrength(unitId, isoDate, intensity, unitState, baseStrength) {
    const profile = CASUALTY_PROFILES[unitId];
    if (!profile || !baseStrength) {
        return { current: baseStrength || 0, loss: 0, ratio: 1 };
    }

    // Deniz kaybı — gemi batabilir, ama panelde gösterilen kuvvet personeldir.
    const navalLoss = NAVAL_LOSS_EVENTS[unitId];
    if (navalLoss && isoDate >= navalLoss.iso) {
        const loss = Math.min(baseStrength, Math.round(baseStrength * navalLoss.lossRatio));
        const current = Math.max(0, baseStrength - loss);
        return {
            current,
            loss,
            ratio: current / baseStrength,
            todayLoss: isoDate === navalLoss.iso ? loss : 0,
        };
    }

    // Cache kontrolü — intensity/unitState/baseStrength anahtara dahil;
    // animasyon verisi sonradan yüklenince bayat düşük-yoğunluk sonucu dönmesin
    const cacheKey = `${unitId}:${isoDate}:${intensity}:${unitState}:${baseStrength}`;
    if (strengthCache[cacheKey]) return strengthCache[cacheKey];

    // Kümülatif kayıp birimin sahaya konuşlandığı tarihten itibaren —
    // kampanya başından değil (29. Tümen çıkarmadan kayıp yemesin)
    const dayNum = daysBetween(getDeploymentIso(unitId), isoDate);
    if (dayNum <= 0) {
        const result = { current: baseStrength, loss: 0, ratio: 1 };
        strengthCache[cacheKey] = result;
        return result;
    }

    // Kümülatif kayıp hesabı — baseDailyRate × multiplier → günlük kayıp
    // Multiplier'ı tam bilmiyoruz geçmiş günler için, ortalama yaklaşım kullan
    const baseLoss = profile.baseDailyRate * dayNum * baseStrength;

    // Mevcut gün çarpanı
    const todayMult = getDailyMultiplier(unitId, isoDate, intensity, unitState);
    const todayLoss = profile.baseDailyRate * todayMult * baseStrength;

    // Kümülatif kayıp = base + peak ayarlaması
    let cumulativeLoss = baseLoss;

    // Peak tarihleri ek kayıp ekle
    if (profile.peakDates) {
        for (const peak of profile.peakDates) {
            if (isoDate >= peak) {
                cumulativeLoss += baseStrength * profile.baseDailyRate * 15; // peak günü = 15 normal gün eşdeğeri
            }
        }
    }

    // Toplam kayıp oranını kampanya sonuyla oranla
    const maxLoss = baseStrength * profile.totalLossRatio;
    const totalLoss = Math.min(cumulativeLoss, maxLoss);

    const current = Math.max(0, Math.round(baseStrength - totalLoss));
    const result = {
        current,
        loss: Math.round(totalLoss),
        ratio: current / baseStrength,
        todayLoss: Math.round(todayLoss),
    };

    strengthCache[cacheKey] = result;
    return result;
}

function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function getStateFatigue(unitState) {
    switch (unitState) {
        case 'fighting': return 0.34;
        case 'bombardment': return 0.22;
        case 'marching': return 0.18;
        case 'landing': return 0.2;
        case 'patrolling': return 0.12;
        case 'idle': return 0.04;
        default: return 0.08;
    }
}

function getStaminaLabel(stamina) {
    if (stamina >= 0.72) return 'Dinç';
    if (stamina >= 0.48) return 'Yıpranıyor';
    if (stamina >= 0.26) return 'Tükenmiş';
    return 'Kritik';
}

/**
 * Harita tokenleri ve panel için tek bakışlık savaş kondisyonu.
 * Stamina kesin tarihsel veri değil; kayıp oranı + günün yoğunluğu + birim
 * eyleminden türetilen görsel okuma yardımcısıdır.
 */
export function getUnitVitals(unitId, isoDate, intensity = 0, unitState = 'idle', baseStrength = 0) {
    const strength = getUnitStrength(unitId, isoDate, intensity, unitState, baseStrength);
    const lossRatio = baseStrength ? clamp01(strength.loss / baseStrength) : 0;
    const intensityFatigue = clamp01(intensity / 10) * 0.26;
    const stateFatigue = getStateFatigue(unitState);
    const freshReserveBonus = unitState === 'reserve' || unitState === 'idle' ? 0.08 : 0;
    const stamina = clamp01(1 - (lossRatio * 0.58) - intensityFatigue - stateFatigue + freshReserveBonus);

    return {
        ...strength,
        base: baseStrength || 0,
        lossRatio,
        stamina,
        staminaPercent: Math.round(stamina * 100),
        staminaLabel: getStaminaLabel(stamina),
        intensity: Number(intensity) || 0,
        unitState: unitState || 'idle'
    };
}

/**
 * Kuvvet sayısını kısa formata çevir (1200 → "1.2K", 84000 → "84K")
 */
export function formatStrength(n) {
    if (n >= 10000) return (n / 1000).toFixed(0) + 'K';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

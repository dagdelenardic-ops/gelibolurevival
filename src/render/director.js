// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Yönetmen (Director)
// Tek otorite: "Bu tarihte hangi cephe(ler)de savaş var, kamera nasıl
// çerçevelemeli, harita üstünde ne yazmalı."
//
// Amaç (kullanıcı hedefi): Space ile baştan sona oynatıldığında, son
// kullanıcı KARIŞMADAN anlasın — kamera bir yönetmen gibi o gün savaşın
// olduğu sektör(ler)e gider; iki cephe AYNI ANDA aktifse ikisini de
// kapsayan GENİŞ AÇIYA açılır; her aktif cephede çatışma animasyonu oynar;
// harita üstünde "ANAFARTALAR — Taarruz · DENİZ — Bombardıman" gibi net
// bir yönetmen şeridi gösterilir.
// ══════════════════════════════════════════════════════════════

import { MAP_WIDTH, MAP_CROP_TOP, MAP_VIEW_HEIGHT } from '../data/coordinate-map.js?v=20260618-3d-spectacle-r2';
import { BATTLE_DATA } from '../data/battle-data.js?v=20260618-3d-spectacle-r2';

// ── Sektör Tablosu ────────────────────────────────────────────
// Her cephe için: kamera çerçeve kutusu (box), çatışma merkezi (center —
// yönetmen nabzının ve etiket çapasının konacağı yer), insan-okunur etiket
// ve sahne grubu/odak lokasyonları. Kutular 2451×3467 harita uzayında.
export const SECTORS = {
    'Deniz': {
        key: 'naval',
        box: { x: 1080, y: 1660, w: 1060, h: 920 },
        center: { x: 1300, y: 2280 },
        label: 'DENİZ CEPHESİ',
        short: 'Deniz',
        locationIds: ['bogaz', 'canakkale', 'kilitbahir', 'erenkoyu'],
    },
    'Arıburnu': {
        key: 'anzac',
        box: { x: 740, y: 1430, w: 860, h: 740 },
        center: { x: 1242, y: 1780 },
        label: 'ARIBURNU CEPHESİ',
        short: 'Arıburnu',
        locationIds: ['ariburnu', 'conkbayiri', 'bigali'],
    },
    'Seddülbahir': {
        key: 'helles',
        box: { x: 720, y: 2020, w: 940, h: 820 },
        center: { x: 1040, y: 2360 },
        label: 'SEDDÜLBAHİR CEPHESİ',
        short: 'Seddülbahir',
        locationIds: ['seddulbahir', 'kirte', 'alcitepe', 'morto-koyu'],
    },
    'Anafartalar': {
        key: 'august',
        box: { x: 760, y: 1300, w: 900, h: 780 },
        center: { x: 1260, y: 1706 },
        label: 'ANAFARTALAR CEPHESİ',
        short: 'Anafartalar',
        locationIds: ['suvla', 'anafartalar', 'kirectepe', 'conkbayiri'],
    },
};

// Birden fazla cephe aktifken hangileri öncelikli (kalabalığı önlemek için
// en fazla 3 cephe çerçevelenir/animasyon alır).
const FRONT_PRIORITY = ['Deniz', 'Anafartalar', 'Arıburnu', 'Seddülbahir'];

// Kaynak veri (animation-events.json) bazı KANONİK çok-cepheli günleri eksik
// temsil ediyor — ör. 25 Nisan'da hem Arıburnu (ANZAC) hem Seddülbahir (Helles
// V/W Beach) çıkarması AYNI ANDA oldu, ama veride yalnızca Arıburnu var. Bu
// tablo bu günlerde doğru cepheleri ZORLAR (varlık yine harita üzerinden
// doğrulanır — küratörlü cephe için kutusunda gerçekten birlik aranır).
// Tarih pencereleri çok-mercekli web araştırması + adversarial doğrulamayla
// sabitlendi (yüksek/orta güven). Veri (animation-events.json) bu eşzamanlı
// günleri tek cepheye serileştiriyor; bu tablo doğru cepheleri zorlar.
const CURATED_FRONTS = [
    // ── Çıkarmalar + 1. Kirte (25 Nis–6 May) ──
    // ANZAC (Arıburnu) ve Helles (Seddülbahir) AYNI ANDA yoğun muharebedeydi:
    // çıkarmalar (25 Nis), Osmanlı Arıburnu karşı taarruzları (27 Nis–3 May),
    // 1. Kirte (28 Nis), 2. Kirte hazırlığı. Veri öne çıkan cepheyi gün-gün
    // alternatif yapıyordu → kamera kuzey↔güney ~630 birim ZIPLIYORDU. Kararlı
    // geniş açı bunu kapatır + iki cepheyi gösterir; günün muharebesi banner
    // fiili + odak nabzı + çatışma FX ile vurgulanır.
    { start: '1915-04-25', end: '1915-04-27', fronts: { 'Arıburnu': 'Çıkarma', 'Seddülbahir': 'Çıkarma' } },
    { start: '1915-04-28', end: '1915-05-06', fronts: { 'Arıburnu': '', 'Seddülbahir': '' } },
    // ── Ağustos Taarruzu — üçlü cephe zirvesi (6-10 Ağu) ──
    // Kampanyanın en yoğun eşzamanlılığı: Lone Pine/The Nek/Sari Bair-Conkbayırı
    // (Arıburnu) + Suvla çıkarması (Anafartalar) + Kirte Bağı şaşırtması
    // (Seddülbahir) AYNI GÜNLERDE. Üç sektör birliği = tam-yarımada geniş açısı.
    { start: '1915-08-06', end: '1915-08-10', fronts: { 'Arıburnu': '', 'Seddülbahir': '', 'Anafartalar': '' } },
    // ── Kirte Bağı kuyruğu + Suvla (11-13 Ağu): Arıburnu durulmuş ──
    { start: '1915-08-11', end: '1915-08-13', fronts: { 'Seddülbahir': '', 'Anafartalar': '' } },
    // ── Scimitar Hill + Tepe 60 (21 Ağu): planlı eşzamanlı taarruzlar ──
    { start: '1915-08-21', end: '1915-08-21', fronts: { 'Arıburnu': '', 'Anafartalar': '' } },
];

function getCuratedFronts(iso) {
    const hit = CURATED_FRONTS.find((r) => iso >= r.start && iso <= r.end);
    return hit ? hit.fronts : null;
}

// ── Aktif Cephe Tespiti ───────────────────────────────────────

function lc(value) {
    return String(value || '').toLowerCase();
}

/** Bir cephedeki birim durumlarından insan-okunur eylem fiili üret. */
function deriveActivity(animData, frontName) {
    const eventType = String(animData?.eventType || '').toUpperCase();
    const units = Array.isArray(animData?.units)
        ? animData.units.filter((u) => !frontName || u.front === frontName)
        : [];
    const states = new Set(units.map((u) => lc(u.state)));
    const vector = animData?.movementVector || null;

    if (eventType === 'NAVAL_PATROL') return 'Devriye';
    if (eventType === 'BOMBARDMENT') return 'Bombardıman';
    if (eventType === 'LOGISTICS') return 'İkmal';

    // Çıkarma günü (Arıburnu/Seddülbahir 25 Nisan)
    if (states.has('landing')) return 'Çıkarma';

    if (eventType === 'COMBAT') {
        const ottomanAttacks = vector && lc(vector.side) === 'ottoman';
        const alliedAttacks = vector && lc(vector.side) === 'allied';
        if (ottomanAttacks) return 'Osmanlı Taarruzu';
        if (alliedAttacks) return 'İtilaf Taarruzu';
        if (states.has('fighting')) return 'Muharebe';
        if (states.has('bombardment')) return 'Bombardıman';
        return 'Çatışma';
    }

    if (states.has('marching')) return 'İlerleme';
    if (states.has('bombardment')) return 'Bombardıman';
    if (states.has('fighting')) return 'Muharebe';
    return '';
}

function normalizeUnitName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

function findModelUnitId(animUnitName) {
    const wanted = normalizeUnitName(animUnitName);
    if (!wanted) return null;
    const match = BATTLE_DATA.units.find((u) => {
        const actual = normalizeUnitName(u.name);
        return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
    });
    return match ? match.id : null;
}

/**
 * Bir cephenin GERÇEK harita varlığı: o cephe için animData.units'te adı geçen
 * muharip, currentPositions içinde (yani haritada) mevcut mu?  Kutuda öylesine
 * duran ilgisiz token'lar (ör. sabit Çanakkale kıyı bataryası) sayılmaz —
 * yalnızca verinin o cepheye atadığı birlikler.
 * @returns {boolean|null} null = pozisyon verisi yok (karar verme)
 */
function frontHasPresence(animData, front, positions) {
    if (!positions) return null;
    const units = Array.isArray(animData?.units)
        ? animData.units.filter((u) => u.front === front)
        : [];
    if (!units.length) return false;
    return units.some((u) => {
        const id = findModelUnitId(u.name);
        return id && positions[id];
    });
}

/** Sektör kutusunda (tampon dahil) en az bir birim var mı? (küratörlü cephe gatesi) */
function sectorBoxHasUnit(box, positions) {
    const m = 90;
    for (const id in positions) {
        const p = positions[id];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        if (p.x >= box.x - m && p.x <= box.x + box.w + m &&
            p.y >= box.y - m && p.y <= box.y + box.h + m) return true;
    }
    return false;
}

/**
 * O günkü AKTİF sektörleri döndürür (öncelik sırasında, en fazla 3).
 * "Aktif" = animData.fronts içinde geçen + sektör tablosunda tanımlı + (pozisyon
 * verisi varsa) o sektörde GERÇEKTEN birim bulunan cephe. Böylece sadece nominal
 * listelenen (ör. Ağustos'ta haritada gemisi olmayan "Deniz") cephe geniş açıyı
 * gereksiz açıp asıl muharebeyi küçültmez.
 * Her sektör: { front, key, box, center, label, short, activity, intensity }.
 */
export function resolveActiveSectors(animData, phase, positions = null) {
    const iso = String((phase && phase.isoStart) || (animData && animData.date) || '');
    const curated = getCuratedFronts(iso); // { front: activity } | null

    const fronts = Array.isArray(animData?.fronts) ? [...animData.fronts] : [];
    if (curated) for (const f in curated) if (!fronts.includes(f)) fronts.push(f);

    let valid = FRONT_PRIORITY.filter((f) => fronts.includes(f) && SECTORS[f]);
    if (!valid.length) return [];

    if (positions) {
        // Küratörlü cephe (aktivite '' boş olsa bile — bu "fiili türet" demek,
        // falsy olduğu için `curated[f]` ile değil `f in curated` ile tespit
        // edilmeli): kutusunda gerçekten birlik varsa kabul (kaba gate).
        // Veri-kaynaklı cephe: yalnızca o cepheye atanmış adlı muharip haritadaysa
        // (nominal — ör. Ağustos'ta gemisiz "Deniz" — geniş açıyı zorlamaz).
        valid = valid.filter((f) => (curated && f in curated)
            ? sectorBoxHasUnit(SECTORS[f].box, positions)
            : frontHasPresence(animData, f, positions));
    }
    if (!valid.length) return [];

    const intensity = Number(animData?.intensity || 0);
    return valid.slice(0, 3).map((front) => {
        const s = SECTORS[front];
        return {
            front,
            key: s.key,
            box: s.box,
            center: s.center,
            label: s.label,
            short: s.short,
            locationIds: s.locationIds,
            activity: (curated && curated[front]) || deriveActivity(animData, front) || '',
            intensity,
        };
    });
}

/** Yalnızca aktif cephe adları (animation-orchestrator çok-cephe için). */
export function getActiveFrontNames(animData, positions = null) {
    return resolveActiveSectors(animData, null, positions).map((s) => s.front);
}

// ── Kamera Çerçeveleme ─────────────────────────────────────────

function clampTarget(t) {
    const w = Math.max(620, Math.min(MAP_WIDTH, Math.round(t.w)));
    const h = Math.max(560, Math.min(MAP_VIEW_HEIGHT, Math.round(t.h)));
    const x = Math.max(0, Math.min(MAP_WIDTH - w, Math.round(t.x)));
    const y = Math.max(MAP_CROP_TOP, Math.min(MAP_CROP_TOP + MAP_VIEW_HEIGHT - h, Math.round(t.y)));
    return { x, y, w, h };
}

/**
 * Aktif sektörlerden kamera hedefi üretir:
 *   1 sektör → o sektörün kutusu (yakın, sinematik)
 *   2+ sektör → kutuların BİRLEŞİMİ + tampon (geniş açı — ikisi de görünür)
 * Aktif sektör yoksa null (çağıran küratörlü mapFocus'a düşer).
 *
 * @returns {{x,y,w,h,reason,locationIds}|null}
 */
export function frameActiveSectors(animData, phase, positions = null) {
    const sectors = resolveActiveSectors(animData, phase, positions);
    if (!sectors.length) return null;

    if (sectors.length === 1) {
        const s = sectors[0];
        return {
            ...clampTarget(s.box),
            reason: `director:${s.short}`,
            locationIds: s.locationIds,
        };
    }

    // ── Geniş açı: tüm aktif sektör kutularını kapsayan birleşim ──
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const locationIds = [];
    for (const s of sectors) {
        minX = Math.min(minX, s.box.x);
        minY = Math.min(minY, s.box.y);
        maxX = Math.max(maxX, s.box.x + s.box.w);
        maxY = Math.max(maxY, s.box.y + s.box.h);
        locationIds.push(...(s.locationIds || []));
    }
    const pad = 130;
    const target = clampTarget({
        x: minX - pad,
        y: minY - pad,
        w: (maxX - minX) + pad * 2,
        h: (maxY - minY) + pad * 2,
    });
    return {
        ...target,
        reason: `director:wide:${sectors.map((s) => s.short).join('+')}`,
        locationIds,
    };
}

// ── Harita Üstü Yönetmen Şeridi + Nabız ────────────────────────

const ACTIVITY_TONE = {
    'Bombardıman': 'fire',
    'Osmanlı Taarruzu': 'ottoman',
    'İtilaf Taarruzu': 'allied',
    'Çıkarma': 'allied',
    'Muharebe': 'clash',
    'Çatışma': 'clash',
    'İlerleme': 'march',
    'Devriye': 'calm',
    'İkmal': 'calm',
};

// Eylem-fiili olan cephe sıcak tonda (gözü çeker); curated ama o gün veride
// muharip listelenmeyen (sessiz) cephe sönük 'calm' tonda nabız atar.
function toneFor(activity) {
    return ACTIVITY_TONE[activity] || (activity ? 'clash' : 'calm');
}

/**
 * Harita üstüne (HTML overlay) "yönetmen şeridi" çizer: hangi cephe(ler)de
 * ne olduğunu net, daima okunur biçimde gösterir. SVG zoom'undan bağımsız.
 * Ayrıca SVG director katmanına her aktif sektör merkezine bir odak nabzı
 * koyar — kullanıcının gözünü doğru yere çeker.
 *
 * @param {Array} sectors - resolveActiveSectors çıktısı
 * @param {HTMLElement} container - .map-container
 */
export function renderDirectorOverlay(sectors, container) {
    if (!container) return;

    // ── HTML şerit ──
    let banner = container.querySelector('.director-banner');
    if (!sectors.length) {
        if (banner) banner.classList.remove('is-visible');
    } else {
        if (!banner) {
            banner = document.createElement('div');
            banner.className = 'director-banner';
            banner.setAttribute('aria-hidden', 'true');
            container.appendChild(banner);
        }
        const chips = sectors.map((s) => {
            const tone = toneFor(s.activity);
            const act = s.activity ? `<span class="director-act">${s.activity}</span>` : '';
            return `<span class="director-chip" data-tone="${tone}"><span class="director-sector">${s.short}</span>${act}</span>`;
        }).join('<span class="director-plus">+</span>');
        const next = `<span class="director-eye">●</span>${chips}`;
        if (banner.dataset.sig !== next) {
            banner.innerHTML = next;
            banner.dataset.sig = next;
        }
        banner.classList.add('is-visible');
        banner.classList.toggle('is-multi', sectors.length > 1);
    }

    // ── SVG odak nabzı ──
    const svg = container.querySelector('#battleMap');
    if (!svg) return;
    let layer = svg.querySelector('#layer-director');
    if (!layer) {
        layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('id', 'layer-director');
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('pointer-events', 'none');
        const ornaments = svg.querySelector('#layer-ornaments');
        if (ornaments) svg.insertBefore(layer, ornaments);
        else svg.appendChild(layer);
    }
    const sig = sectors.map((s) => `${s.key}:${s.activity}`).join('|');
    if (layer.dataset.sig === sig) return;
    layer.dataset.sig = sig;
    layer.innerHTML = sectors.map((s) => {
        const tone = toneFor(s.activity);
        const r = s.intensity >= 7 ? 70 : s.intensity >= 5 ? 56 : 46;
        return `<g class="director-focus" data-tone="${tone}">
            <circle class="director-focus-ring" cx="${s.center.x}" cy="${s.center.y}" r="${r}"/>
            <circle class="director-focus-core" cx="${s.center.x}" cy="${s.center.y}" r="${(r * 0.5).toFixed(0)}"/>
        </g>`;
    }).join('');
}

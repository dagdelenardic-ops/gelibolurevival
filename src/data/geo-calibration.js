// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Gerçek Koordinat Kalibrasyonu
// ══════════════════════════════════════════════════════════════
// Yaklaşım: 4 "ground-truth anchor" elle doğrulanır (Kilitbahir,
// Seddülbahir, Suvla, Kumkale). Diğer tüm lokasyonlar sadece
// (lat, lon) üzerinden, anchorlardan türetilen AFFINE TRANSFORM
// ile otomatik olarak (x, y) piksele projekte edilir.
//
// Bu sayede "bir noktayı düzeltince diğerleri matematiksel olarak
// hizalanır". Kalibrasyonu iyileştirmek için sadece anchor'ların
// cropX/cropY değerini değiştirmek yeter.
// ══════════════════════════════════════════════════════════════

import { MAP_CROP_TOP } from './coordinate-map.js?v=20260407-manual-r1';

// ── 3×3 lineer sistem çözücü (Cramer's rule) ──
function det3(m) {
    return (
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
}

function solve3x3(M, v) {
    const D = det3(M);
    if (Math.abs(D) < 1e-12) {
        throw new Error('[geo-calibration] Singular matrix — anchor points are collinear');
    }
    const replace = (col) => M.map((row, i) => row.map((val, j) => (j === col ? v[i] : val)));
    return [det3(replace(0)) / D, det3(replace(1)) / D, det3(replace(2)) / D];
}

// ── Affine projeksiyon çözücü ──
// Model: x = a·lon + b·lat + c,  y = d·lon + e·lat + f
// N≥3 anchor için least-squares (normal equations ile).
function solveAffine(anchors) {
    if (!Array.isArray(anchors) || anchors.length < 3) {
        throw new Error('[geo-calibration] At least 3 anchor points required');
    }
    let sLon2 = 0, sLat2 = 0, sLonLat = 0, sLon = 0, sLat = 0;
    let sXLon = 0, sXLat = 0, sX = 0;
    let sYLon = 0, sYLat = 0, sY = 0;
    const n = anchors.length;
    for (const a of anchors) {
        const lon = a.lon;
        const lat = a.lat;
        const X = a.cropX;
        const Y = a.cropY + MAP_CROP_TOP;
        sLon2 += lon * lon;
        sLat2 += lat * lat;
        sLonLat += lon * lat;
        sLon += lon;
        sLat += lat;
        sXLon += X * lon;
        sXLat += X * lat;
        sX += X;
        sYLon += Y * lon;
        sYLat += Y * lat;
        sY += Y;
    }
    const M = [
        [sLon2, sLonLat, sLon],
        [sLonLat, sLat2, sLat],
        [sLon, sLat, n]
    ];
    const [a, b, c] = solve3x3(M, [sXLon, sXLat, sX]);
    const [d, e, f] = solve3x3(M, [sYLon, sYLat, sY]);
    return { a, b, c, d, e, f };
}

// ══════════════════════════════════════════════════════════════
// GROUND TRUTH ANCHORS
// ══════════════════════════════════════════════════════════════
// Bu dört nokta elle, haritaya bakarak doğrulanmıştır.
// Kuzey, güney, batı, doğu uçlarını yayan — üçgen değil dörtgen
// oluşturan nokta seçimi regresyonu sağlamlaştırır.
//
// Değerlerden birini değiştirirseniz, TÜM diğer lokasyonlar
// matematiksel olarak yeniden hizalanır. Bu dosyayı yeniden
// hesaplamak için `assets/calibrate.html` kullanın.
// ══════════════════════════════════════════════════════════════
export const GROUND_TRUTH_ANCHORS = [
    { id: 'kilitbahir',  lat: 40.1467789, lon: 26.3779734, cropX: 1427, cropY: 1306 },
    { id: 'seddulbahir', lat: 40.0446676, lon: 26.1889171, cropX: 1019, cropY: 1585 },
    { id: 'suvla',       lat: 40.2755,    lon: 26.2785,    cropX: 845,  cropY: 835  },
    { id: 'kumkale',     lat: 39.9815943, lon: 26.2370257, cropX: 1320, cropY: 1746 }
];

export const AFFINE_TRANSFORM = solveAffine(GROUND_TRUTH_ANCHORS);

/** (lat, lon) → (x, y) piksel koordinatı (tam harita) */
export function projectLatLon(lat, lon) {
    const { a, b, c, d, e, f } = AFFINE_TRANSFORM;
    return {
        x: a * lon + b * lat + c,
        y: d * lon + e * lat + f
    };
}

/** (x, y) piksel → (lat, lon) ters projeksiyon */
export function unprojectXY(x, y) {
    const { a, b, c, d, e, f } = AFFINE_TRANSFORM;
    // [a b] [lon]   [x - c]
    // [d e] [lat] = [y - f]
    const D = a * e - b * d;
    if (Math.abs(D) < 1e-12) return { lat: 0, lon: 0 };
    const lon = (e * (x - c) - b * (y - f)) / D;
    const lat = (a * (y - f) - d * (x - c)) / D;
    return { lat, lon };
}

// ── Lokasyon kaydını projeksiyonla tamamla ──
// - isAnchor:true → manuel cropX/cropY kullanılır (ground truth)
// - diğerleri    → (lat, lon) affine ile otomatik projekte edilir
// - legacy cropX/cropY sağlanmışsa ve isAnchor yoksa referans olarak
//   saklanır ama gerçek (x,y) yine projeksiyondan gelir (tutarlılık).
function materialize(loc) {
    const out = { ...loc };
    if (loc.isAnchor && typeof loc.cropX === 'number' && typeof loc.cropY === 'number') {
        out.x = loc.cropX;
        out.y = loc.cropY + MAP_CROP_TOP;
        out.source = 'anchor';
    } else if (typeof loc.lat === 'number' && typeof loc.lon === 'number') {
        const p = projectLatLon(loc.lat, loc.lon);
        out.x = Math.round(p.x);
        out.y = Math.round(p.y);
        out.cropX = Math.round(p.x);
        out.cropY = Math.round(p.y - MAP_CROP_TOP);
        out.source = 'projected';
    } else if (typeof loc.x === 'number' && typeof loc.y === 'number') {
        out.source = 'manual-xy';
    }
    return out;
}

// ══════════════════════════════════════════════════════════════
// ANA LOKASYONLAR
// ══════════════════════════════════════════════════════════════
// Anchor olarak işaretli olanların manuel (cropX/cropY)'si korunur.
// Diğerleri (lat, lon) üzerinden otomatik projekte edilir.
// ══════════════════════════════════════════════════════════════
const RAW_LOCATIONS = [
    // Özel — harita dışı proxy
    { id: 'gelibolu', name: 'Gelibolu', lat: 40.4100, lon: 26.6700, hiddenOnMap: true, mapProxyId: 'bigali' },

    // ── Kuzey ─────────────────────────────────────────
    { id: 'suvla',        name: 'Suvla Koyu',         lat: 40.2755,    lon: 26.2785,    isAnchor: true, cropX: 1138, cropY: 858  },
    { id: 'tuzgolu',      name: 'Tuz Gölü',           lat: 40.2962721, lon: 26.2592921, isAnchor: true, cropX: 1172, cropY: 795  },
    { id: 'kirectepe',    name: 'Kireçtepe',          lat: 40.3452146, lon: 26.2838787, isAnchor: true, cropX: 1285, cropY: 669  },
    { id: 'anafartalar',  name: 'Anafartalar',        lat: 40.2816240, lon: 26.3292410, isAnchor: true, cropX: 1264, cropY: 842  },

    // ── ANZAC Bölgesi ────────────────────────────────
    { id: 'bigali',       name: 'Bigalı',             lat: 40.2357180, lon: 26.3597320, isAnchor: true, cropX: 1314, cropY: 982  },
    { id: 'conkbayiri',   name: 'Conkbayırı',         lat: 40.2525008, lon: 26.3081938, isAnchor: true, cropX: 1192, cropY: 948  },
    { id: 'ariburnu',     name: 'Arıburnu (ANZAC Koyu)', lat: 40.2349804, lon: 26.2773514, isAnchor: true, cropX: 1064, cropY: 998  },
    { id: 'kabatepe',     name: 'Kabatepe',           lat: 40.2128557, lon: 26.2779571, isAnchor: true, cropX: 1199, cropY: 1139 },

    // ── Boğaz / Narrows ──────────────────────────────
    { id: 'eceabat',      name: 'Eceabat (Maidos)',   lat: 40.1852143, lon: 26.3590969, isAnchor: true, cropX: 1348, cropY: 1158 },
    { id: 'kilitbahir',   name: 'Kilitbahir',         lat: 40.1467789, lon: 26.3779734, isAnchor: true, cropX: 1427, cropY: 1306 },
    { id: 'bogaz',        name: 'Boğaz (Narrows)',    lat: 40.1465,    lon: 26.3904,    isAnchor: true, cropX: 1455, cropY: 1294 },
    { id: 'canakkale',    name: 'Çanakkale',          lat: 40.1462710, lon: 26.4028892, isAnchor: true, cropX: 1538, cropY: 1306 },
    { id: 'erenkoyu',     name: 'Erenköy Koyu',       lat: 40.0830,    lon: 26.3550,    isAnchor: true, cropX: 1408, cropY: 1518 },

    // ── Güney / Helles ───────────────────────────────
    { id: 'alcitepe',     name: 'Alçıtepe (Achi Baba)', lat: 40.0949140, lon: 26.2272995, isAnchor: true, cropX: 1158, cropY: 1418 },
    { id: 'kirte',        name: 'Kirte (Krithia)',    lat: 40.0805,    lon: 26.2140,    isAnchor: true, cropX: 1112, cropY: 1466 },
    { id: 'seddulbahir',  name: 'Seddülbahir',        lat: 40.0446676, lon: 26.1889171, isAnchor: true, cropX: 1019, cropY: 1585 },
    { id: 'morto-koyu',   name: 'Morto Koyu',         lat: 40.0458,    lon: 26.2325,    isAnchor: true, cropX: 1195, cropY: 1570 },

    // ── Asya Yakası ──────────────────────────────────
    { id: 'kumkale',      name: 'Kumkale',            lat: 39.9815943, lon: 26.2370257, isAnchor: true, cropX: 1320, cropY: 1746 }
];

export const GEO_LOCATIONS = RAW_LOCATIONS.map(materialize);

export const GEO_LOCATION_BY_ID = GEO_LOCATIONS.reduce((acc, point) => {
    acc[point.id] = point;
    return acc;
}, {});

// ══════════════════════════════════════════════════════════════
// KIYI TABYALARI (MAP_FORTS)
// ══════════════════════════════════════════════════════════════
// Tümü (lat, lon)'dan projekte edilir. Tabya konumları tarihsel
// olarak çok hassas bilindiği için anchor'a gerek yok.
// ══════════════════════════════════════════════════════════════
const RAW_FORTS = [
    { id: 'fort-kilitbahir',       name: 'Kilitbahir',  lat: 40.147744,  lon: 26.379760 },
    { id: 'fort-rumeli-mecidiye',  name: 'R.Mecidiye',  lat: 40.1413687, lon: 26.3743242 },
    { id: 'fort-namazgah',         name: 'Namazgah',    lat: 40.1451436, lon: 26.3800511 },
    { id: 'fort-seddulbahir',      name: 'Seddülbahir', lat: 40.042039,  lon: 26.187887  },
    { id: 'fort-anadolu-mecidiye', name: 'A.Mecidiye',  lat: 40.1632957, lon: 26.4047623 },
    { id: 'fort-cimenlik',         name: 'Cimenlik',    lat: 40.1462808, lon: 26.3990363 },
    { id: 'fort-hamidiye',         name: 'Hamidiye',    lat: 40.1374979, lon: 26.4027811 },
    { id: 'fort-kephez',           name: 'Kephez',      lat: 40.0955068, lon: 26.3931331 },
    { id: 'fort-dardanos',         name: 'Dardanos',    lat: 40.0841806, lon: 26.3665974 },
    { id: 'fort-erenkeui',         name: 'Erenkeui',    lat: 40.0660,    lon: 26.3470    },
    { id: 'fort-orhaniye',         name: 'Orhaniye',    lat: 39.9926267, lon: 26.1862048 },
    { id: 'fort-kumkale',          name: 'Kumkale',     lat: 39.9815943, lon: 26.2370257 }
];

export const MAP_FORTS = RAW_FORTS.map(materialize);

// ══════════════════════════════════════════════════════════════
// SAHNE ETİKETLERİ — harita üstü metin yerleştirmeleri
// Bunlar coğrafi nokta değil, tasarımsal label. El yerleşimi korundu.
// ══════════════════════════════════════════════════════════════
export const MAP_SCENE_LABELS = [
    { id: 'naval-dardanelles-narrows', text: 'ÇANAKKALE BOĞAZI', sceneGroup: 'naval', x: 1580, y: 1450, fill: '#4a5a6a', fontSize: 20, opacity: 0.5, strokeWidth: 3, subLabel: false },
    { id: 'naval-minefield', text: 'MAYIN HATTI', sceneGroup: 'naval', x: 1550, y: 1750, fill: '#8b3a3a', fontSize: 16, opacity: 0.6, strokeWidth: 2, subLabel: true },
    { id: 'anzac-cove', text: 'ARIBURNU KOYU', sceneGroup: 'anzac', x: 1220, y: 1480, fill: '#4a5a6a', fontSize: 18, opacity: 0.5, strokeWidth: 3, subLabel: false },
    { id: 'anzac-sari-bair', text: 'SARI BAYIR', sceneGroup: 'anzac', x: 1380, y: 1360, fill: '#4a5a6a', fontSize: 16, opacity: 0.4, strokeWidth: 2, subLabel: false },
    { id: 'helles-v-beach', text: 'V PLAJI', sceneGroup: 'helles', x: 1110, y: 2875, fill: '#4a5a6a', fontSize: 16, opacity: 0.5, strokeWidth: 2, subLabel: false },
    { id: 'helles-w-beach', text: 'W PLAJI', sceneGroup: 'helles', x: 1025, y: 2850, fill: '#4a5a6a', fontSize: 16, opacity: 0.5, strokeWidth: 2, subLabel: false },
    { id: 'helles-achi-baba', text: 'ALÇITEPE', sceneGroup: 'helles', x: 1265, y: 2265, fill: '#4a5a6a', fontSize: 14, opacity: 0.4, strokeWidth: 2, subLabel: true }
];

export const MAP_ORNAMENTS = [
    { id: 'compass', name: 'Pusula', x: 2350, y: 920, kind: 'compass' },
    { id: 'scale', name: 'Ölçek', x: 1900, y: 3380, kind: 'scale' },
    { id: 'footer-title', name: 'Alt Başlık', x: 50, y: 3420, kind: 'text' },
    { id: 'footer-credit', name: 'Alt Kredi', x: 2400, y: 3450, kind: 'text' }
];

// ══════════════════════════════════════════════════════════════
// FRONTLINES — muharebe hatları (coğrafi nokta değil, taktik çizgi)
// ══════════════════════════════════════════════════════════════
function fromCropPoint({ cropX, cropY, ...rest }) {
    return {
        ...rest,
        x: cropX,
        y: cropY + MAP_CROP_TOP,
        cropX,
        cropY
    };
}

export const MAP_FRONTLINES = [
    {
        id: 'ariburnu-front',
        phase: ['inland_combat', 'stalemate'],
        dateRange: { start: '1915-04-27', end: '1915-12-19' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            fromCropPoint({ cropX: 900, cropY: 970 }),
            fromCropPoint({ cropX: 910, cropY: 1010 }),
            fromCropPoint({ cropX: 920, cropY: 1055 }),
            fromCropPoint({ cropX: 935, cropY: 1100 }),
            fromCropPoint({ cropX: 950, cropY: 1145 })
        ].map(({ x, y }) => ({ x, y })),
        corridorWidth: 68,
        intensity: 'medium',
        label: 'Arıburnu Cephesi'
    },
    {
        id: 'seddulbahir-front',
        phase: ['inland_combat', 'stalemate'],
        dateRange: { start: '1915-04-28', end: '1916-01-08' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            fromCropPoint({ cropX: 980, cropY: 1765 }),
            fromCropPoint({ cropX: 1015, cropY: 1755 }),
            fromCropPoint({ cropX: 1055, cropY: 1745 }),
            fromCropPoint({ cropX: 1095, cropY: 1740 }),
            fromCropPoint({ cropX: 1130, cropY: 1742 })
        ].map(({ x, y }) => ({ x, y })),
        corridorWidth: 60,
        intensity: 'medium',
        label: 'Seddülbahir Cephesi'
    },
    {
        id: 'suvla-front',
        phase: ['stalemate'],
        dateRange: { start: '1915-08-07', end: '1915-12-19' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            fromCropPoint({ cropX: 880, cropY: 860 }),
            fromCropPoint({ cropX: 920, cropY: 875 }),
            fromCropPoint({ cropX: 960, cropY: 900 }),
            fromCropPoint({ cropX: 995, cropY: 930 })
        ].map(({ x, y }) => ({ x, y })),
        corridorWidth: 54,
        intensity: 'low',
        label: 'Suvla Cephesi'
    },
    {
        id: 'conkbayiri-front',
        phase: ['inland_combat', 'stalemate'],
        dateRange: { start: '1915-08-06', end: '1915-08-10' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            fromCropPoint({ cropX: 915, cropY: 940 }),
            fromCropPoint({ cropX: 950, cropY: 955 }),
            fromCropPoint({ cropX: 985, cropY: 980 }),
            fromCropPoint({ cropX: 1025, cropY: 1010 })
        ].map(({ x, y }) => ({ x, y })),
        corridorWidth: 50,
        intensity: 'high',
        label: 'Conkbayırı Cephesi'
    }
];

// ══════════════════════════════════════════════════════════════
// DEBUG: Kalibrasyon kalitesi raporu
// ══════════════════════════════════════════════════════════════
// calibrate.html bu fonksiyonu kullanarak her anchor için rezidüel
// hatayı (RMS) gösterir. Anchor sayısı arttıkça bu değer sıfıra
// düşmez (least-squares), ama 15-25 px altında olmalı.
export function calibrationReport() {
    const rows = GROUND_TRUTH_ANCHORS.map((a) => {
        const p = projectLatLon(a.lat, a.lon);
        const actualY = a.cropY + MAP_CROP_TOP;
        const dx = p.x - a.cropX;
        const dy = p.y - actualY;
        return {
            id: a.id,
            expected: { x: a.cropX, y: actualY },
            projected: { x: Math.round(p.x), y: Math.round(p.y) },
            residual: { dx: Math.round(dx), dy: Math.round(dy), dist: Math.round(Math.hypot(dx, dy)) }
        };
    });
    const rms = Math.sqrt(
        rows.reduce((s, r) => s + r.residual.dist * r.residual.dist, 0) / rows.length
    );
    return { rows, rms: Math.round(rms * 10) / 10, transform: AFFINE_TRANSFORM };
}

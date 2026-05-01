// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Terrain Zone System
// Raster harita (2451×3467) için polygon verileri + point-in-polygon
// Harita viewport: 2451×3467
// ══════════════════════════════════════════════════════════════

import { COAST_BUFFER, MAP_WIDTH, MAP_HEIGHT } from './coordinate-map.js?v=20260407-manual-r1';

/**
 * Gelibolu Yarımadası land polygon.
 * Affine transform ile 720×560 → 2451×3467 dönüştürüldü.
 */
export const PENINSULA_POLYGON = [
    { x: 2343, y: 30 }, { x: 2134, y: 87 }, { x: 1946, y: 206 }, { x: 1820, y: 392 },
    { x: 1782, y: 465 }, { x: 1741, y: 561 }, { x: 1691, y: 659 },
    { x: 1641, y: 757 }, { x: 1599, y: 831 }, { x: 1566, y: 903 },
    { x: 1529, y: 999 }, { x: 1501, y: 1093 }, { x: 1487, y: 1186 },
    { x: 1463, y: 1279 }, { x: 1431, y: 1374 }, { x: 1375, y: 1464 },
    { x: 1321, y: 1548 }, { x: 1258, y: 1635 }, { x: 1202, y: 1724 },
    { x: 1147, y: 1814 }, { x: 1079, y: 1914 }, { x: 1002, y: 2016 },
    { x: 925, y: 2118 }, { x: 845, y: 2207 }, { x: 776, y: 2285 },
    { x: 735, y: 2345 }, { x: 674, y: 2400 }, { x: 607, y: 2437 },
    { x: 547, y: 2464 }, { x: 512, y: 2443 }, { x: 493, y: 2401 },
    { x: 484, y: 2330 }, { x: 484, y: 2232 }, { x: 484, y: 2133 },
    { x: 484, y: 2034 }, { x: 490, y: 1943 }, { x: 495, y: 1852 },
    { x: 501, y: 1761 }, { x: 513, y: 1678 }, { x: 524, y: 1596 },
    { x: 535, y: 1513 }, { x: 552, y: 1438 }, { x: 569, y: 1364 },
    { x: 586, y: 1289 }, { x: 614, y: 1222 }, { x: 655, y: 1162 },
    { x: 689, y: 1112 }, { x: 714, y: 1063 }, { x: 721, y: 1017 },
    { x: 729, y: 970 }, { x: 745, y: 923 }, { x: 779, y: 873 },
    { x: 813, y: 823 }, { x: 847, y: 772 }, { x: 880, y: 722 },
    { x: 914, y: 672 }, { x: 948, y: 622 }, { x: 973, y: 573 },
    { x: 1005, y: 505 }, { x: 1046, y: 445 }, { x: 1107, y: 390 },
    { x: 1196, y: 313 }, { x: 1304, y: 243 }, { x: 1456, y: 165 },
    { x: 1653, y: 81 }, { x: 1881, y: 30 }, { x: 2150, y: 30 },
    { x: 2343, y: 30 },
];

/** Trakya (kuzey kara kütlesi) polygon */
export const THRACE_POLYGON = [
    { x: 0, y: 0 }, { x: 2451, y: 0 }, { x: 2343, y: 30 },
    { x: 1794, y: 36 }, { x: 1254, y: 142 }, { x: 756, y: 310 },
    { x: 295, y: 494 }, { x: 84, y: 558 }, { x: 0, y: 630 }, { x: 0, y: 0 },
];

/** Asya Yakası polygon */
export const ASIA_POLYGON = [
    { x: 2087, y: 778 }, { x: 1947, y: 1092 }, { x: 1875, y: 1215 },
    { x: 1703, y: 1512 }, { x: 1649, y: 1632 }, { x: 1532, y: 1889 },
    { x: 1484, y: 1995 }, { x: 1289, y: 2259 }, { x: 1182, y: 2424 },
    { x: 1429, y: 2462 }, { x: 2451, y: 2308 }, { x: 2451, y: 2403 },
    { x: 1090, y: 2596 }, { x: 1110, y: 2413 }, { x: 1267, y: 2200 },
    { x: 1419, y: 1938 }, { x: 1482, y: 1816 }, { x: 1626, y: 1515 },
    { x: 1681, y: 1380 }, { x: 1857, y: 1083 }, { x: 1942, y: 957 },
    { x: 2087, y: 778 },
];

/** Gökçeada — harita dışında, boş polygon */
export const GOKCEADA_POLYGON = [];

const RASTER_MAP_URL = 'assets/gallipoli-map.png';
const RASTER_COAST_RADIUS = 18;
const CLAMP_SEARCH_RADIUS = 260;
const CLAMP_SEARCH_STEP = 6;
const TERRAIN_RECT_OVERRIDES = [
    // Manuel kalibrasyonda X Beach / İkiz Koyu / Seddülbahir kıyı şeridi
    // raster renklendirmesinde yer yer deniz gibi okunuyor. Çıkarma token'ları
    // bu sahilde kalmalı; aksi halde clamp onları Helles içine fazla iter.
    { x1: 985, y1: 2315, x2: 1100, y2: 2420, terrain: 'coast' },
];

let rasterReady = false;
let rasterData = null;
let rasterWidth = MAP_WIDTH;
let rasterHeight = MAP_HEIGHT;
let rasterReadyPromise = Promise.resolve(false);

function primeTerrainSampler() {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return Promise.resolve(false);
    if (rasterReady) return Promise.resolve(true);
    if (primeTerrainSampler._started) return rasterReadyPromise;

    primeTerrainSampler._started = true;
    rasterReadyPromise = new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || MAP_WIDTH;
                canvas.height = img.naturalHeight || MAP_HEIGHT;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) throw new Error('2D context yok');
                ctx.drawImage(img, 0, 0);
                rasterWidth = canvas.width;
                rasterHeight = canvas.height;
                rasterData = ctx.getImageData(0, 0, rasterWidth, rasterHeight).data;
                rasterReady = true;
                resolve(true);
            } catch (err) {
                console.warn('Terrain sampler yüklenemedi, polygon fallback kullanılacak:', err);
                resolve(false);
            }
        };
        img.onerror = () => {
            console.warn('Terrain sampler görseli yüklenemedi, polygon fallback kullanılacak.');
            resolve(false);
        };
        img.src = RASTER_MAP_URL;
    });

    return rasterReadyPromise;
}

primeTerrainSampler();

export function waitForTerrainSampler() {
    return rasterReadyPromise;
}

// ── Ray Casting Point-in-Polygon ──

/** Point-in-polygon (ray casting) */
function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// Tüm kara polygon'ları
const LAND_POLYGONS = [PENINSULA_POLYGON, THRACE_POLYGON, ASIA_POLYGON, GOKCEADA_POLYGON];

// Kıyı şeridi genişliği (SVG units) — coordinate-map.js'den import edildi
// const COAST_BUFFER artık import ediliyor

function clampPointToRaster(x, y) {
    return {
        x: Math.max(0, Math.min(rasterWidth - 1, Math.round(x))),
        y: Math.max(0, Math.min(rasterHeight - 1, Math.round(y))),
    };
}

function readRasterPixel(x, y) {
    if (!rasterReady || !rasterData) return null;
    const pt = clampPointToRaster(x, y);
    const idx = (pt.y * rasterWidth + pt.x) * 4;
    return {
        r: rasterData[idx],
        g: rasterData[idx + 1],
        b: rasterData[idx + 2],
        a: rasterData[idx + 3],
    };
}

function isSeaPixel(pixel) {
    if (!pixel) return false;
    return pixel.r < 205 && pixel.g > 185 && pixel.b > 185;
}

function getRasterBaseTerrain(x, y) {
    const pixel = readRasterPixel(x, y);
    if (!pixel) return null;
    return isSeaPixel(pixel) ? 'sea' : 'land';
}

function isRasterCoast(x, y, baseTerrain = null) {
    if (!rasterReady || !rasterData) return false;
    const center = baseTerrain || getRasterBaseTerrain(x, y);
    if (!center) return false;

    for (let r = CLAMP_SEARCH_STEP; r <= RASTER_COAST_RADIUS; r += CLAMP_SEARCH_STEP) {
        const steps = Math.max(12, Math.round((Math.PI * 2 * r) / 8));
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const neighbor = getRasterBaseTerrain(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
            if (neighbor && neighbor !== center) return true;
        }
    }

    return false;
}

function getOverrideTerrain(x, y) {
    for (const zone of TERRAIN_RECT_OVERRIDES) {
        if (x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2) {
            return zone.terrain;
        }
    }
    return null;
}

/**
 * Verilen noktanın terrain tipini belirle.
 * @returns {'sea' | 'coast' | 'land'}
 */
export function getTerrainAtPoint(x, y) {
    const overrideTerrain = getOverrideTerrain(x, y);
    if (overrideTerrain) return overrideTerrain;

    const rasterTerrain = getRasterBaseTerrain(x, y);
    if (rasterTerrain) {
        return isRasterCoast(x, y, rasterTerrain) ? 'coast' : rasterTerrain;
    }

    // Herhangi bir kara polygon'unda mı?
    let inLand = false;
    for (const poly of LAND_POLYGONS) {
        if (pointInPolygon(x, y, poly)) {
            inLand = true;
            break;
        }
    }

    if (inLand) {
        // Kıyı şeridinde mi? — Polygon sınırına yakınlık kontrolü
        const distToEdge = minDistToPolygonEdge(x, y, PENINSULA_POLYGON);
        if (distToEdge <= COAST_BUFFER) return 'coast';
        // Asya yakası kıyısı
        const distToAsia = minDistToPolygonEdge(x, y, ASIA_POLYGON);
        if (distToAsia <= COAST_BUFFER) return 'coast';
        return 'land';
    }

    // Denizde ama kıyıya yakın mı?
    for (const poly of [PENINSULA_POLYGON, ASIA_POLYGON]) {
        const dist = minDistToPolygonEdge(x, y, poly);
        if (dist <= COAST_BUFFER) return 'coast';
    }

    return 'sea';
}

/** Noktanın polygon kenarlarına minimum mesafesi */
function minDistToPolygonEdge(x, y, polygon) {
    let minDist = Infinity;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const d = pointToSegmentDist(x, y, polygon[j].x, polygon[j].y, polygon[i].x, polygon[i].y);
        if (d < minDist) minDist = d;
    }
    return minDist;
}

/** Nokta-segment mesafesi */
function pointToSegmentDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Verilen pozisyonu izinli terrain'e clamp et.
 * Entity'nin bulunduğu terrain izinli değilse en yakın izinli noktaya taşır.
 * @param {number} x
 * @param {number} y
 * @param {string[]} allowedTerrains - ['sea'], ['land', 'coast'], vs.
 * @returns {{x: number, y: number}}
 */
export function clampToAllowedTerrain(x, y, allowedTerrains) {
    if (rasterReady) {
        const currentTerrain = getTerrainAtPoint(x, y);
        if (allowedTerrains.includes(currentTerrain)) return { x, y };

        const normalized = allowedTerrains.includes('land') && allowedTerrains.includes('coast')
            ? new Set(['land', 'coast'])
            : new Set(allowedTerrains);

        for (let r = 0; r <= CLAMP_SEARCH_RADIUS; r += CLAMP_SEARCH_STEP) {
            const steps = r === 0 ? 1 : Math.max(16, Math.round((Math.PI * 2 * r) / 10));
            for (let i = 0; i < steps; i++) {
                const angle = steps === 1 ? 0 : (i / steps) * Math.PI * 2;
                const nx = x + Math.cos(angle) * r;
                const ny = y + Math.sin(angle) * r;
                const terrain = getTerrainAtPoint(nx, ny);
                if (normalized.has(terrain)) {
                    const candidate = clampPointToRaster(nx, ny);
                    if (normalized.has(getTerrainAtPoint(candidate.x, candidate.y))) {
                        return candidate;
                    }
                }
            }
        }

        return clampPointToRaster(x, y);
    }

    const current = getTerrainAtPoint(x, y);
    if (allowedTerrains.includes(current)) return { x, y };

    // Denize clamp: en yakın polygon kenarına git ve dışarı it
    if (allowedTerrains.includes('sea') && !allowedTerrains.includes('land')) {
        return pushToSea(x, y);
    }

    // Karaya clamp: en yakın polygon kenarına git ve içeri it
    if (allowedTerrains.includes('land') && !allowedTerrains.includes('sea')) {
        return pushToLand(x, y);
    }

    return { x, y };
}

/** Noktayı denize it (kara'daysa en yakın kıyı kenarına taşı + dışarı offset) */
function pushToSea(x, y) {
    let bestDist = Infinity;
    let bestPt = { x, y };
    for (const poly of [PENINSULA_POLYGON, ASIA_POLYGON]) {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const pt = nearestPointOnSegment(x, y, poly[j].x, poly[j].y, poly[i].x, poly[i].y);
            const d = Math.hypot(pt.x - x, pt.y - y);
            if (d < bestDist) {
                bestDist = d;
                // Push 35px outside the polygon edge — gemiler kıyıdan net uzakta görünsün
                const nx = pt.x - x;
                const ny = pt.y - y;
                const len = Math.hypot(nx, ny) || 1;
                bestPt = { x: Math.round(pt.x + (nx / len) * 35), y: Math.round(pt.y + (ny / len) * 35) };
            }
        }
    }
    return bestPt;
}

/** Noktayı karaya it (denizdeyse en yakın kıyıya taşı + içeri offset) */
function pushToLand(x, y) {
    let bestDist = Infinity;
    let bestPt = { x, y };
    for (const poly of [PENINSULA_POLYGON, ASIA_POLYGON]) {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const pt = nearestPointOnSegment(x, y, poly[j].x, poly[j].y, poly[i].x, poly[i].y);
            const d = Math.hypot(pt.x - x, pt.y - y);
            if (d < bestDist) {
                bestDist = d;
                // Push 5px inside the polygon
                const nx = x - pt.x;
                const ny = y - pt.y;
                const len = Math.hypot(nx, ny) || 1;
                bestPt = { x: Math.round(pt.x - (nx / len) * 5), y: Math.round(pt.y - (ny / len) * 5) };
            }
        }
    }
    return bestPt;
}

/** Segment üzerindeki en yakın nokta */
function nearestPointOnSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: ax, y: ay };
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: ax + t * dx, y: ay + t * dy };
}

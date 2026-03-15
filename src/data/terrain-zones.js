// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Terrain Zone System
// SVG path'lerden türetilmiş polygon verileri + point-in-polygon
// Harita viewport: 720×560
// ══════════════════════════════════════════════════════════════

/**
 * Gelibolu Yarımadası land polygon.
 * map-renderer.js satır 111-122'deki SVG path'ten türetildi.
 * Cubic bezier'ler yaklaşık kontrol noktalarına basitleştirildi.
 */
export const PENINSULA_POLYGON = [
    { x: 525, y: 18 },
    { x: 485, y: 38 }, { x: 450, y: 58 }, { x: 435, y: 95 },
    { x: 432, y: 110 }, { x: 430, y: 130 }, { x: 426, y: 150 },
    { x: 422, y: 170 }, { x: 418, y: 185 }, { x: 416, y: 200 },
    { x: 415, y: 220 }, { x: 416, y: 240 }, { x: 420, y: 260 },
    { x: 422, y: 280 }, { x: 422, y: 300 }, { x: 416, y: 318 },
    { x: 410, y: 335 }, { x: 402, y: 352 }, { x: 396, y: 370 },
    { x: 390, y: 388 }, { x: 382, y: 408 }, { x: 372, y: 428 },
    { x: 362, y: 448 }, { x: 350, y: 465 }, { x: 340, y: 480 },
    { x: 335, y: 492 }, { x: 325, y: 502 }, { x: 312, y: 508 },
    { x: 300, y: 512 }, { x: 290, y: 506 }, { x: 282, y: 496 },
    { x: 274, y: 480 }, { x: 266, y: 458 }, { x: 258, y: 436 },
    { x: 250, y: 414 }, { x: 244, y: 394 }, { x: 238, y: 374 },
    { x: 232, y: 354 }, { x: 228, y: 336 }, { x: 224, y: 318 },
    { x: 220, y: 300 }, { x: 218, y: 284 }, { x: 216, y: 268 },
    { x: 214, y: 252 }, { x: 215, y: 238 }, { x: 220, y: 226 },
    { x: 224, y: 216 }, { x: 226, y: 206 }, { x: 224, y: 196 },
    { x: 222, y: 186 }, { x: 222, y: 176 }, { x: 226, y: 166 },
    { x: 230, y: 156 }, { x: 234, y: 146 }, { x: 238, y: 136 },
    { x: 242, y: 126 }, { x: 246, y: 116 }, { x: 248, y: 106 },
    { x: 250, y: 92 }, { x: 255, y: 80 }, { x: 265, y: 70 },
    { x: 280, y: 56 }, { x: 300, y: 44 }, { x: 330, y: 32 },
    { x: 370, y: 20 }, { x: 420, y: 16 }, { x: 480, y: 14 },
    { x: 525, y: 18 },
];

/**
 * Trakya (kuzey kara kütlesi) polygon.
 * map-renderer.js satır 100-102.
 */
export const THRACE_POLYGON = [
    { x: 0, y: 0 }, { x: 530, y: 0 }, { x: 525, y: 18 },
    { x: 400, y: 15 }, { x: 280, y: 20 }, { x: 175, y: 40 },
    { x: 80, y: 65 }, { x: 35, y: 72 }, { x: 0, y: 82 }, { x: 0, y: 0 },
];

/**
 * Asya Yakası polygon.
 * map-renderer.js satır 211-223.
 */
export const ASIA_POLYGON = [
    { x: 530, y: 190 }, { x: 522, y: 255 }, { x: 515, y: 280 },
    { x: 498, y: 340 }, { x: 495, y: 365 }, { x: 488, y: 418 },
    { x: 485, y: 440 }, { x: 460, y: 492 }, { x: 448, y: 525 },
    { x: 510, y: 542 }, { x: 720, y: 540 }, { x: 720, y: 560 },
    { x: 440, y: 560 }, { x: 430, y: 520 }, { x: 450, y: 478 },
    { x: 465, y: 425 }, { x: 470, y: 400 }, { x: 480, y: 338 },
    { x: 482, y: 310 }, { x: 500, y: 250 }, { x: 510, y: 225 },
    { x: 530, y: 190 },
];

/** Gökçeada polygon (basit elips yaklaşımı) */
export const GOKCEADA_POLYGON = [
    { x: 50, y: 285 }, { x: 75, y: 270 }, { x: 105, y: 272 },
    { x: 132, y: 285 }, { x: 132, y: 296 }, { x: 108, y: 312 },
    { x: 88, y: 310 }, { x: 50, y: 298 }, { x: 50, y: 285 },
];

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

// Kıyı şeridi genişliği (SVG units)
const COAST_BUFFER = 18;

/**
 * Verilen noktanın terrain tipini belirle.
 * @returns {'sea' | 'coast' | 'land'}
 */
export function getTerrainAtPoint(x, y) {
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
                // Push 5px outside the polygon edge
                const nx = pt.x - x;
                const ny = pt.y - y;
                const len = Math.hypot(nx, ny) || 1;
                bestPt = { x: Math.round(pt.x + (nx / len) * 5), y: Math.round(pt.y + (ny / len) * 5) };
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

// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Frontline Data
// Cephe hattı polyline verileri (SVG 720×560 viewport)
// ══════════════════════════════════════════════════════════════

/**
 * Cephe hatları.
 * side1 = batı/güney (kıyı tarafı, genellikle allied)
 * side2 = doğu/kuzey (iç taraf, genellikle ottoman)
 * corridorWidth = iki taraf arasındaki minimum mesafe (SVG units)
 */
export const FRONTLINES = [
    {
        id: 'ariburnu-front',
        phase: ['inland_combat', 'stalemate'],
        dateRange: { start: '1915-04-27', end: '1915-12-19' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            { x: 228, y: 225 },
            { x: 235, y: 238 },
            { x: 240, y: 250 },
            { x: 248, y: 262 },
            { x: 255, y: 275 },
        ],
        corridorWidth: 20,
        intensity: 'medium',
        label: 'Arıburnu Cephesi',
    },
    {
        id: 'seddulbahir-front',
        phase: ['inland_combat', 'stalemate'],
        dateRange: { start: '1915-04-28', end: '1916-01-08' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            { x: 265, y: 445 },
            { x: 278, y: 435 },
            { x: 295, y: 425 },
            { x: 310, y: 420 },
            { x: 328, y: 430 },
        ],
        corridorWidth: 18,
        intensity: 'medium',
        label: 'Seddülbahir Cephesi',
    },
    {
        id: 'suvla-front',
        phase: ['stalemate'],
        dateRange: { start: '1915-08-07', end: '1915-12-19' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            { x: 248, y: 135 },
            { x: 265, y: 148 },
            { x: 285, y: 160 },
            { x: 305, y: 172 },
        ],
        corridorWidth: 16,
        intensity: 'low',
        label: 'Suvla Cephesi',
    },
    {
        id: 'conkbayiri-front',
        phase: ['inland_combat', 'stalemate'],
        dateRange: { start: '1915-08-06', end: '1915-08-10' },
        side1: 'allied',
        side2: 'ottoman',
        points: [
            { x: 290, y: 220 },
            { x: 305, y: 225 },
            { x: 318, y: 228 },
            { x: 330, y: 232 },
        ],
        corridorWidth: 15,
        intensity: 'high',
        label: 'Conkbayırı Cephesi',
    },
];

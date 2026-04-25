// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Koordinat Haritalama Sabitleri
// Yeni raster harita (2451×3467) için viewport ve ölçek sabitleri
// ══════════════════════════════════════════════════════════════

/** SVG ViewBox boyutları */
export const MAP_WIDTH = 2451;
export const MAP_HEIGHT = 3467;
export const MAP_CROP_TOP = 780;
export const MAP_VIEW_HEIGHT = MAP_HEIGHT - MAP_CROP_TOP;

/** Viewport clamp sınırları (harita kenarından margin) */
export const VP_MIN_X = 30;
export const VP_MAX_X = 2420;
export const VP_MIN_Y = 30;
export const VP_MAX_Y = 3440;

/** Eski 720×560 sisteminden ölçek çarpanı (yaklaşık) */
export const COORD_SCALE = 3.4;

/** Kıyı tamponu (terrain zone detection) */
export const COAST_BUFFER = 60;

/**
 * Sahne bazlı viewBox tanımları.
 * Her sahne için harita otomatik olarak ilgili bölgeye zoom yapar.
 */
export const SCENE_VIEWBOXES = {
    naval:   { x: 850,  y: 1050, w: 1550, h: 1250 },  // Boğaz bölgesi — tabyalar + gemi formasyonu
    anzac:   { x: 400,  y: 980,  w: 1200, h: 1000 },   // Arıburnu / Conkbayırı
    helles:  { x: 400,  y: 1600, w: 1300, h: 1100 },   // Seddülbahir / Helles — biraz genişletildi
    general: { x: 0,    y: MAP_CROP_TOP, w: MAP_WIDTH, h: MAP_VIEW_HEIGHT }, // Kırpılmış ana harita
    suvla:   { x: 980,  y: 1180, w: 950,  h: 900 },    // Suvla / Anafartalar
};

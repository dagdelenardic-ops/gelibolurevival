// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Gerçek Görüntü Klipleri
// Tarih aralığı + olay tipine göre video eşleştirmesi
// Kaynak: Çanakkale Savaşı Gerçek Görüntüler (renklendirilmiş)
// ══════════════════════════════════════════════════════════════

const VIDEO_CLIPS = {
    // ── Deniz görüntüleri ──
    'bombardiman':      { file: 'assets/video/bombardiman.mp4',      category: 'deniz', desc: 'Sahil bombardımanı' },
    'cikarma-teknesi':  { file: 'assets/video/cikarma-teknesi.mp4',  category: 'deniz', desc: 'Çıkarma tekneleri' },
    'cikarma-2':        { file: 'assets/video/cikarma-2.mp4',        category: 'deniz', desc: 'İkinci çıkarma dalgası' },

    // ── Kara görüntüleri ──
    'asker-gecit':      { file: 'assets/video/asker-gecit.mp4',      category: 'kara', desc: 'Asker geçit töreni' },
    'kara-lojistik':    { file: 'assets/video/kara-lojistik.mp4',    category: 'kara', desc: 'Askeri ikmal yürüyüşü' },
    'sahil-savasi':     { file: 'assets/video/sahil-savasi.mp4',     category: 'kara', desc: 'Sahil savaşı' },
    'sahil-catisma':    { file: 'assets/video/sahil-catisma.mp4',    category: 'kara', desc: 'Şarapnel altında çatışma' },
    'siper-mevzii':     { file: 'assets/video/siper-mevzii.mp4',    category: 'kara', desc: 'Siper mevzii' },
    'siper-asker':      { file: 'assets/video/siper-asker.mp4',     category: 'kara', desc: 'Siperde askerler' },
    'taarruz':          { file: 'assets/video/taarruz.mp4',          category: 'kara', desc: 'Taarruz anı' },
    'komutan-gozlem':   { file: 'assets/video/komutan-gozlem.mp4',   category: 'kara', desc: 'Komutan gözlemi' },
    'topcu-atesi':      { file: 'assets/video/topcu-atesi.mp4',      category: 'kara', desc: 'Topçu ateşi' },
    'yarali-tasinma':   { file: 'assets/video/yarali-tasinma.mp4',   category: 'kara', desc: 'Yaralı taşınması' },
    'siperde-yemek':    { file: 'assets/video/siperde-yemek.mp4',    category: 'kara', desc: 'Siperde yemek' },
    'savas-alani':      { file: 'assets/video/savas-alani.mp4',      category: 'kara', desc: 'Savaş alanı manzarası' },
};

/**
 * Kampanya fazına göre uygun klip havuzları.
 * Her faz için hem genel hem de eventType-spesifik klip listeleri.
 */
const PHASE_CLIPS = {
    // Deniz Harekâtı (Kasım 1914 – Nisan 1915)
    naval: {
        BOMBARDMENT: ['bombardiman', 'cikarma-teknesi'],
        COMBAT:      ['bombardiman'],
        NAVAL_PATROL:['cikarma-teknesi', 'asker-gecit'],
        IDLE:        ['asker-gecit', 'kara-lojistik'],
        _default:    ['bombardiman', 'cikarma-teknesi', 'asker-gecit'],
    },
    // Kara Çıkarması (Nisan – Mayıs 1915)
    landing: {
        LANDING:     ['cikarma-teknesi', 'cikarma-2', 'sahil-savasi'],
        COMBAT:      ['sahil-savasi', 'sahil-catisma'],
        BOMBARDMENT: ['bombardiman', 'sahil-catisma'],
        _default:    ['cikarma-teknesi', 'sahil-savasi', 'cikarma-2'],
    },
    // Kara Muharebesi (Mayıs – Ağustos 1915)
    inland_combat: {
        COMBAT:      ['taarruz', 'siper-mevzii', 'topcu-atesi'],
        ASSAULT:     ['taarruz', 'sahil-catisma'],
        BOMBARDMENT: ['topcu-atesi', 'bombardiman'],
        IDLE:        ['siper-asker', 'komutan-gozlem'],
        _default:    ['taarruz', 'siper-mevzii', 'topcu-atesi'],
    },
    // Siper Savaşı (Ağustos – Aralık 1915)
    stalemate: {
        COMBAT:      ['siper-mevzii', 'siper-asker', 'taarruz'],
        ASSAULT:     ['taarruz', 'topcu-atesi'],
        BOMBARDMENT: ['topcu-atesi'],
        IDLE:        ['siperde-yemek', 'komutan-gozlem', 'yarali-tasinma'],
        _default:    ['siper-asker', 'siperde-yemek', 'komutan-gozlem'],
    },
    // Tahliye (Aralık 1915 – Ocak 1916)
    evacuation: {
        LOGISTICS:   ['kara-lojistik', 'savas-alani'],
        COMBAT:      ['siper-mevzii'],
        IDLE:        ['savas-alani', 'kara-lojistik'],
        _default:    ['kara-lojistik', 'savas-alani'],
    },
};

let lastClipId = null;

/**
 * Kampanya fazı ve olay tipine göre uygun video klibini seç.
 * @param {string} campaignPhaseId - 'naval' | 'landing' | 'inland_combat' | 'stalemate' | 'evacuation'
 * @param {string} eventType - 'BOMBARDMENT' | 'COMBAT' | 'LANDING' | etc.
 * @param {number} intensity - 0-10
 * @returns {{ file: string, desc: string } | null}
 */
export function getEventVideo(campaignPhaseId, eventType, intensity) {
    // Düşük yoğunluklu olaylarda video gösterme
    if (intensity < 5) return null;

    const phaseClips = PHASE_CLIPS[campaignPhaseId];
    if (!phaseClips) return null;

    const pool = phaseClips[eventType] || phaseClips._default;
    if (!pool || !pool.length) return null;

    // Son gösterilen klibi tekrarlama
    let candidates = pool.filter(id => id !== lastClipId);
    if (!candidates.length) candidates = pool;

    const clipId = candidates[Math.floor(Math.random() * candidates.length)];
    lastClipId = clipId;

    const clip = VIDEO_CLIPS[clipId];
    return clip ? { file: clip.file, desc: clip.desc } : null;
}

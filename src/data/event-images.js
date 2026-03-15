// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Tarihsel Olay Görselleri
// Wikimedia Commons'tan kamu malı (public domain) fotoğraflar
// Yerel kopyalar: assets/photos/
// ══════════════════════════════════════════════════════════════

const P = 'assets/photos';

/**
 * Tarihsel olaylara eşleşen görseller.
 * Her kayıt: { url, caption, source }
 * Tarih aralığı eşleşmesi: startIso – endIso (dahil)
 */
export const EVENT_IMAGES = [
    // ── 1. İlk Bombardıman ──
    {
        startIso: '1914-11-03',
        endIso:   '1914-11-09',
        url:      `${P}/dardanelles-fleet.jpg`,
        caption:  'İtilaf donanması Boğaz önünde — Kasım 1914',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 2. Osmanlı Savaş İlanı / Cihat ──
    {
        startIso: '1914-11-10',
        endIso:   '1914-11-16',
        url:      `${P}/sultan-mehmed-v.jpg`,
        caption:  'Sultan V. Mehmed — Cihat ilanı, 14 Kasım 1914',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 3. Deniz Harekâtı Başlangıcı / Bombardıman Dönemi ──
    {
        startIso: '1915-02-19',
        endIso:   '1915-03-06',
        url:      `${P}/ottoman-heavy-gun.jpg`,
        caption:  'Osmanlı ağır topu, Çanakkale Boğazı savunması',
        source:   'Bundesarchiv, CC BY-SA 3.0',
    },
    // ── 4. Nusret Mayın Seferi ──
    {
        startIso: '1915-03-07',
        endIso:   '1915-03-10',
        url:      `${P}/nusret-1912.png`,
        caption:  'Nusret Mayın Gemisi — 1912 deniz denemesi',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 5. Mayın Temizleme / 18 Mart Öncesi ──
    {
        startIso: '1915-03-11',
        endIso:   '1915-03-17',
        url:      `${P}/ottoman-battery.jpg`,
        caption:  'Osmanlı topçu bataryası — Boğaz savunması',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 6. 18 Mart Deniz Zaferi — Bouvet Batışı ──
    {
        startIso: '1915-03-18',
        endIso:   '1915-03-22',
        url:      `${P}/bouvet-sinking.jpg`,
        caption:  'Bouvet zırhlısının batışı — 18 Mart 1915',
        source:   'TSK Arşivi, Wikimedia Commons',
    },
    // ── 7. 5. Ordu Kuruluşu — Savunma Hazırlığı ──
    {
        startIso: '1915-03-23',
        endIso:   '1915-04-24',
        url:      `${P}/ottoman-battery.jpg`,
        caption:  'Osmanlı topçu bataryası, Gelibolu savunma hazırlığı',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 8. Büyük Kara Çıkarması — 25 Nisan ──
    {
        startIso: '1915-04-25',
        endIso:   '1915-04-25',
        url:      `${P}/anzac-landing-painting.jpg`,
        caption:  '«Anzac, the Landing» — 25 Nisan çıkarma tablosu',
        source:   'Charles Dixon, Australian War Memorial, Public Domain',
    },
    // ── 9. ANZAC Çıkarması Sonrası ──
    {
        startIso: '1915-04-26',
        endIso:   '1915-04-27',
        url:      `${P}/anzac-landing.jpg`,
        caption:  'ANZAC çıkarması — 25 Nisan 1915, Arıburnu',
        source:   'Australian War Memorial, Public Domain',
    },
    // ── 10. V Beach / Seddülbahir ──
    {
        startIso: '1915-04-28',
        endIso:   '1915-05-05',
        url:      `${P}/v-beach-river-clyde.jpg`,
        caption:  'V Beach ve Seddülbahir kalesi — SS River Clyde\'dan görünüm',
        source:   'Royal Museums Greenwich, Public Domain',
    },
    // ── 11. W Beach / Helles ──
    {
        startIso: '1915-05-06',
        endIso:   '1915-05-14',
        url:      `${P}/w-beach-helles.jpg`,
        caption:  'W Beach, Helles — Lancashire Fusiliers çıkarması',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 12. Osmanlı Taarruzu / 19 Mayıs ──
    {
        startIso: '1915-05-15',
        endIso:   '1915-05-24',
        url:      `${P}/ottoman-assault.jpg`,
        caption:  'Osmanlı askerleri taarruzda — Çanakkale 1915',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 13. Siper Savaşı Dönemi — Osmanlı Siperleri ──
    {
        startIso: '1915-05-25',
        endIso:   '1915-06-15',
        url:      `${P}/ottoman-trench.jpg`,
        caption:  'Osmanlı siperleri — Çanakkale Cephesi',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 14. Siper Savaşı — MG Mevzisi ──
    {
        startIso: '1915-06-16',
        endIso:   '1915-08-02',
        url:      `${P}/ottoman-mg.jpg`,
        caption:  'Osmanlı makineli tüfek mevzisi — Çanakkale',
        source:   'Bundesarchiv, CC BY-SA 3.0',
    },
    // ── 15. Conkbayırı / Anafartalar — Mustafa Kemal ──
    {
        startIso: '1915-08-03',
        endIso:   '1915-08-21',
        url:      `${P}/mustafa-kemal-gallipoli.jpg`,
        caption:  'Yarbay Mustafa Kemal — Anafartalar Grup Komutanı, 1915',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 16. Mustafa Kemal ve silah arkadaşları ──
    {
        startIso: '1915-08-22',
        endIso:   '1915-10-14',
        url:      `${P}/ataturk-anafartalar.jpg`,
        caption:  'Mustafa Kemal Bey ve silah arkadaşları — Anafartalar, 1915',
        source:   'Wikimedia Commons, Public Domain',
    },
    // ── 17. Siper Savaşı Son Dönemi ──
    {
        startIso: '1915-10-15',
        endIso:   '1915-12-06',
        url:      `${P}/anzac-trench.jpg`,
        caption:  'ANZAC siperleri — Arıburnu',
        source:   'Australian War Memorial, Public Domain',
    },
    // ── 18. Tahliye Dönemi ──
    {
        startIso: '1915-12-07',
        endIso:   '1916-01-09',
        url:      `${P}/periscope-rifle.jpg`,
        caption:  'Periskoplu tüfek — Tahliye öncesi ANZAC buluşu',
        source:   'Australian War Memorial, Public Domain',
    },
];

/**
 * Verilen ISO tarihe uyan görseli döndür.
 * Birden fazla eşleşme varsa en dar aralıklı olanı seç.
 */
export function getEventImage(isoDate) {
    if (!isoDate) return null;
    const iso = String(isoDate);
    let best = null;
    let bestSpan = Infinity;
    for (const img of EVENT_IMAGES) {
        if (iso >= img.startIso && iso <= img.endIso) {
            const span = new Date(img.endIso).getTime() - new Date(img.startIso).getTime();
            if (span < bestSpan) {
                bestSpan = span;
                best = img;
            }
        }
    }
    return best;
}

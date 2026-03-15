// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Komutan Portreleri
// Wikimedia Commons public domain fotoğrafları
// ══════════════════════════════════════════════════════════════

/**
 * Birim ID → komutan portre URL eşleşmesi.
 * Tüm fotoğraflar Wikimedia Commons'tan, public domain / PD-old-70+.
 * Thumb boyutu 200px genişlik kullanılıyor (bant genişliği dostu).
 */
export const COMMANDER_PORTRAITS = {
    // ── OSMANLI ──
    '5-ordu': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bundesarchiv_Bild_183-22437-0003%2C_Otto_Liman_von_Sanders.jpg/200px-Bundesarchiv_Bild_183-22437-0003%2C_Otto_Liman_von_Sanders.jpg',
        caption: 'Mareşal Liman von Sanders',
        credit: 'Bundesarchiv / Wikimedia Commons'
    },
    '3-kolordu': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Esat_Pasha.jpg/200px-Esat_Pasha.jpg',
        caption: 'Tümg. Esat Paşa (Bülkat)',
        credit: 'Wikimedia Commons'
    },
    '19-tumen': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Mustafa_Kemal_Atat%C3%BCrk_portrait_%28young%29.jpg/200px-Mustafa_Kemal_Atat%C3%BCrk_portrait_%28young%29.jpg',
        caption: 'Yrb. Mustafa Kemal',
        credit: 'Wikimedia Commons'
    },
    '57-alay': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Mustafa_Kemal_Ataturk_in_the_Dardanelles.png/200px-Mustafa_Kemal_Ataturk_in_the_Dardanelles.png',
        caption: 'Yrb. Hüseyin Avni Bey (57. Alay)',
        credit: 'Wikimedia Commons'
    },
    'mustahkem-mevki': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Cevat_%C3%87obanl%C4%B1.jpg/200px-Cevat_%C3%87obanl%C4%B1.jpg',
        caption: 'Tümg. Cevat Paşa (Çobanlı)',
        credit: 'Wikimedia Commons'
    },
    'nusret': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Nusret_mine_layer.jpg/200px-Nusret_mine_layer.jpg',
        caption: 'Nusret Mayın Gemisi — Kolağası Nazmi Bey (Yeniköylü İbrahim oğlu Hafız Nazmi Efendi)',
        credit: 'Wikimedia Commons / Nazmi Bey Günlüğü'
    },

    // ── İNGİLİZ ──
    'hms-queen-elizabeth': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/John_de_Robeck.jpg/200px-John_de_Robeck.jpg',
        caption: 'Amiral Sir John de Robeck',
        credit: 'Wikimedia Commons'
    },
    '29-div': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Hunter-Weston_and_staff_June_1915.jpg/200px-Hunter-Weston_and_staff_June_1915.jpg',
        caption: 'Tümg. Aylmer Hunter-Weston',
        credit: 'IWM / Wikimedia Commons'
    },

    // ── ANZAC ──
    'anzac-1div': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/William_Throsby_Bridges_portrait_photograph.jpg/200px-William_Throsby_Bridges_portrait_photograph.jpg',
        caption: 'Tümg. William Bridges',
        credit: 'AWM / Wikimedia Commons'
    },
    'nz-inf': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Colonel_Francis_Earl_Johnston.jpg/200px-Colonel_Francis_Earl_Johnston.jpg',
        caption: 'Alb. Francis Johnston',
        credit: 'AWM / Wikimedia Commons'
    },

    // ── FRANSIZ ──
    'fr-corps': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Albert_d%27Amade.jpg/200px-Albert_d%27Amade.jpg',
        caption: 'General Albert d\'Amade',
        credit: 'Wikimedia Commons'
    },
    'bouvet': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/French_battleship_Bouvet.jpg/200px-French_battleship_Bouvet.jpg',
        caption: 'Bouvet Zırhlısı — Kpt. Rageot de la Touche',
        credit: 'Wikimedia Commons'
    },
    'suffren': {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/%C3%89mile_Paul_Am%C3%A9d%C3%A9e_Gu%C3%A9pratte.jpg/200px-%C3%89mile_Paul_Am%C3%A9d%C3%A9e_Gu%C3%A9pratte.jpg',
        caption: 'Kaptan Guépratte',
        credit: 'Wikimedia Commons'
    }
};

/**
 * Birim ID'ye göre portre bilgisini getir.
 * @param {string} unitId
 * @returns {{ url: string, caption: string, credit: string } | null}
 */
export function getCommanderPortrait(unitId) {
    return COMMANDER_PORTRAITS[unitId] || null;
}

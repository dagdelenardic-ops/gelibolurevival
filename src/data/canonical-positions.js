// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Kanonik Birim Pozisyonları
// Tarihsel kaynaklara dayalı ground-truth birim konumları
// Kaynak: Peter Hart "Gallipoli" (2011), TDV İslam Ansiklopedisi,
//         Genelkurmay ATASE arşivleri, AWM Gallipoli Timeline
// ══════════════════════════════════════════════════════════════

/**
 * Her birim için tarih aralıklı kanonik pozisyonlar.
 * Format: { unitId: [ { start, end, location, note? } ] }
 *
 * Kurallar:
 * - `destroyed` location = birim yok edildi, artık render edilmemeli
 * - Son segment'in `end`'i yoksa kampanya sonuna kadar geçerli
 * - Segment'ler kronolojik sırada ve boşluksuz olmalı
 */
export const CANONICAL_POSITIONS = {
    // ═══════════════════════════════════════════════
    // OSMANLI — KARA KUVVETLERİ
    // ═══════════════════════════════════════════════

    '5-ordu': [
        // Liman von Sanders 24 Mart'ta komutayı devralır, karargâh Gelibolu'da
        { start: '1914-11-03', end: '1915-03-23', location: 'gelibolu', note: 'Henüz 5. Ordu kurulmadı, bölge müstahkem mevki komutanlığında' },
        { start: '1915-03-24', end: '1915-04-24', location: 'gelibolu', note: '5. Ordu kuruldu, Liman von Sanders komutayı devraldı' },
        { start: '1915-04-25', end: '1915-08-05', location: 'gelibolu', note: 'Ordu karargâhı Gelibolu kasabasında' },
        { start: '1915-08-06', end: '1916-01-09', location: 'gelibolu', note: 'Anafartalar dahil tüm cepheyi yönetiyor' },
    ],

    '3-kolordu': [
        // Esat Paşa komutasında, Arıburnu-Conkbayırı cephesi
        { start: '1914-11-03', end: '1915-04-24', location: 'bigali', note: 'İhtiyat konuşlanması' },
        { start: '1915-04-25', end: '1915-08-05', location: 'conkbayiri', note: 'Arıburnu cephesi komutanlığı' },
        { start: '1915-08-06', end: '1915-12-19', location: 'conkbayiri', note: 'Arıburnu-Anafartalar cephesi' },
        { start: '1915-12-20', end: '1916-01-09', location: 'gelibolu', note: 'Arıburnu tahliyesi sonrası' },
    ],

    '19-tumen': [
        // Mustafa Kemal komutasında
        { start: '1914-11-03', end: '1915-02-24', location: 'eceabat', note: 'Maydos bölgesinde eğitim' },
        { start: '1915-02-25', end: '1915-04-24', location: 'bigali', note: 'Bigalı köyünde ihtiyat' },
        { start: '1915-04-25', end: '1915-05-18', location: 'ariburnu', note: '25 Nisan karşı taarruzu, Conkbayırı-Kocaçimen' },
        { start: '1915-05-19', end: '1915-08-05', location: 'ariburnu', note: '19 Mayıs taarruzu, Arıburnu siperleri' },
        { start: '1915-08-06', end: '1915-08-10', location: 'conkbayiri', note: 'Anafartalar Grup Komutanlığı (M. Kemal terfi)' },
        { start: '1915-08-11', end: '1915-12-19', location: 'anafartalar', note: 'Anafartalar cephesi' },
        { start: '1915-12-20', end: '1916-01-09', location: 'gelibolu', note: 'Tahliye sonrası' },
    ],

    '57-alay': [
        // 19. Tümen'e bağlı, "Ben size taarruzu emretmiyorum, ölmeyi emrediyorum!"
        { start: '1914-11-03', end: '1915-04-24', location: 'bigali', note: '19. Tümen ile birlikte' },
        { start: '1915-04-25', end: '1915-05-18', location: 'ariburnu', note: 'Conkbayırı karşı taarruzu — ağır kayıp' },
        { start: '1915-05-19', end: '1915-12-19', location: 'ariburnu', note: 'Arıburnu siperleri, yeniden teşkil' },
        { start: '1915-12-20', end: '1916-01-09', location: 'gelibolu', note: 'Tahliye sonrası' },
    ],

    '27-alay': [
        // 9. Tümen'e bağlı
        { start: '1914-11-03', end: '1915-04-24', location: 'eceabat', note: 'Yarımada savunması' },
        { start: '1915-04-25', end: '1915-05-18', location: 'ariburnu', note: 'Arıburnu savunmasına katıldı' },
        { start: '1915-05-19', end: '1915-08-05', location: 'conkbayiri', note: 'Conkbayırı siperleri' },
        { start: '1915-08-06', end: '1915-12-19', location: 'conkbayiri', note: 'Ağustos muharebeleri, siper savunması' },
        { start: '1915-12-20', end: '1916-01-09', location: 'gelibolu', note: 'Tahliye sonrası' },
    ],

    '9-tumen': [
        // Halil Sami Bey komutasında, Seddülbahir cephesi
        { start: '1914-11-03', end: '1915-04-24', location: 'kilitbahir', note: 'Boğaz savunması' },
        { start: '1915-04-25', end: '1915-06-30', location: 'seddulbahir', note: 'Seddülbahir savunması' },
        { start: '1915-07-01', end: '1916-01-09', location: 'seddulbahir', note: 'Seddülbahir-Kirte cephesi' },
    ],

    '5-tumen': [
        // Hasan Askeri Bey komutasında, Seddülbahir cephesi güney kanat
        { start: '1914-11-03', end: '1915-04-24', location: 'eceabat', note: 'Yarımada güney savunması' },
        { start: '1915-04-25', end: '1915-06-30', location: 'seddulbahir', note: 'Seddülbahir savunması, Kirte muharebeleri' },
        { start: '1915-07-01', end: '1916-01-09', location: 'kirte', note: 'Kirte cephesi, siper savunması' },
    ],

    // ═══════════════════════════════════════════════
    // OSMANLI — DENİZ / TAHKİMAT
    // ═══════════════════════════════════════════════

    'mustahkem-mevki': [
        // Cevat Paşa komutasında kıyı bataryaları
        { start: '1914-11-03', end: '1916-01-09', location: 'kilitbahir', note: 'Çanakkale Müstahkem Mevki Komutanlığı' },
    ],

    'nusret': [
        // Kolağası Nazmi Bey komutasında mayın gemisi
        { start: '1914-11-03', end: '1915-03-07', location: 'bogaz', note: 'Mayın döşeme operasyonları' },
        { start: '1915-03-08', end: '1915-03-18', location: 'bogaz', note: '7-8 Mart gecesi Erenköy koyu hattına 26 mayın' },
        { start: '1915-03-19', end: '1916-01-09', location: 'bogaz', note: 'Boğaz savunmasına devam' },
    ],

    // ═══════════════════════════════════════════════
    // İTİLAF — DENİZ KUVVETLERİ
    // ═══════════════════════════════════════════════

    'hms-queen-elizabeth': [
        // Amiral de Robeck'in bayrak gemisi
        { start: '1914-11-03', end: '1915-03-17', location: 'bogaz', note: 'Boğaz bombardımanları' },
        { start: '1915-03-18', end: '1915-05-12', location: 'bogaz', note: '18 Mart muharebesi, hasar almadı' },
        { start: '1915-05-13', end: '1916-01-09', location: 'destroyed', note: 'Denizaltı tehdidi nedeniyle Akdenize çekildi (Mayıs 1915)' },
    ],

    'hms-irresistible': [
        // Captain Douglas Dent (Albay) komutasında
        { start: '1914-11-03', end: '1915-03-17', location: 'bogaz', note: 'Boğaz operasyonları' },
        { start: '1915-03-18', end: '1915-03-18', location: 'bogaz', note: '18 Mart — mayına çarptı' },
        { start: '1915-03-19', end: '1916-01-09', location: 'destroyed', note: '18 Mart 1915\'te battı' },
    ],

    'hms-ocean': [
        // Captain (Albay) Hayes-Sadler komutasında
        { start: '1914-11-03', end: '1915-03-17', location: 'bogaz', note: 'Boğaz operasyonları' },
        { start: '1915-03-18', end: '1915-03-18', location: 'bogaz', note: '18 Mart — Irresistible\'ı kurtarmaya çalışırken mayına çarptı' },
        { start: '1915-03-19', end: '1916-01-09', location: 'destroyed', note: '18 Mart 1915\'te battı' },
    ],

    'bouvet': [
        // Fransız donanması
        { start: '1914-11-03', end: '1915-03-17', location: 'bogaz', note: 'Boğaz operasyonları' },
        { start: '1915-03-18', end: '1915-03-18', location: 'bogaz', note: '18 Mart — Nusret mayınına çarptı, 2 dakikada battı' },
        { start: '1915-03-19', end: '1916-01-09', location: 'destroyed', note: '18 Mart 1915\'te battı, ~640 şehit' },
    ],

    'suffren': [
        // Fransız donanması
        { start: '1914-11-03', end: '1915-03-17', location: 'bogaz', note: 'Boğaz operasyonları' },
        { start: '1915-03-18', end: '1915-04-24', location: 'bogaz', note: '18 Mart\'ta ağır hasar, tamir edildi' },
        { start: '1915-04-25', end: '1916-01-09', location: 'destroyed', note: 'Çanakkale\'den çekildi' },
    ],

    // ═══════════════════════════════════════════════
    // İTİLAF — KARA KUVVETLERİ
    // ═══════════════════════════════════════════════

    '29-div': [
        // İngiliz 29. Tümeni — V Beach / Seddülbahir çıkarması
        { start: '1915-04-25', end: '1915-06-30', location: 'seddulbahir', note: 'V Beach çıkarması, Seddülbahir köprübaşı' },
        { start: '1915-07-01', end: '1915-12-31', location: 'seddulbahir', note: 'Helles cephesi' },
        { start: '1916-01-01', end: '1916-01-09', location: 'seddulbahir', note: 'Son tahliye' },
    ],

    'anzac-1div': [
        // Avustralya-Yeni Zelanda 1. Tümeni
        { start: '1915-04-25', end: '1915-08-05', location: 'ariburnu', note: 'ANZAC Koyu çıkarması, Arıburnu siperleri' },
        { start: '1915-08-06', end: '1915-12-19', location: 'ariburnu', note: 'Ağustos taarruzu, Arıburnu siperleri' },
        { start: '1915-12-20', end: '1916-01-09', location: 'destroyed', note: 'Arıburnu tahliyesi tamamlandı' },
    ],

    'nz-inf': [
        // Yeni Zelanda Piyade Tugayı
        { start: '1915-04-25', end: '1915-08-05', location: 'ariburnu', note: 'ANZAC Koyu, Arıburnu' },
        { start: '1915-08-06', end: '1915-08-10', location: 'conkbayiri', note: 'Conkbayırı taarruzu — zirveye ulaştı' },
        { start: '1915-08-11', end: '1915-12-19', location: 'ariburnu', note: 'Geri çekilme, siper savunması' },
        { start: '1915-12-20', end: '1916-01-09', location: 'destroyed', note: 'Arıburnu tahliyesi' },
    ],

    'fr-corps': [
        // Fransız Doğu Seferi Kolordusu
        { start: '1915-04-25', end: '1915-04-27', location: 'kumkale', note: 'Kumkale çıkarması (taktik manevra)' },
        { start: '1915-04-28', end: '1915-12-31', location: 'seddulbahir', note: 'Seddülbahir\'e geçiş, Helles cephesi sağ kanat' },
        { start: '1916-01-01', end: '1916-01-09', location: 'seddulbahir', note: 'Son tahliye' },
    ],
};

/**
 * Verilen tarihte birimin kanonik konumunu döndür.
 * @returns {{ location: string, note: string } | null}
 */
export function getCanonicalPosition(unitId, isoDate) {
    const segments = CANONICAL_POSITIONS[unitId];
    if (!segments) return null;

    for (const seg of segments) {
        if (isoDate >= seg.start && isoDate <= seg.end) {
            return { location: seg.location, note: seg.note || '' };
        }
    }
    return null;
}

/**
 * Birim belirtilen tarihte yok edilmiş mi?
 */
export function isUnitDestroyed(unitId, isoDate) {
    const pos = getCanonicalPosition(unitId, isoDate);
    return pos ? pos.location === 'destroyed' : false;
}

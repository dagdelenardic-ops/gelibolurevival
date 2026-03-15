// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Savaş Verileri
// Faksiyonlar, askeri birimler, savaş fazları, konum bilgileri
// ══════════════════════════════════════════════════════════════

export const BATTLE_DATA = {
    factions: {
        ottoman: { id: "ottoman", name: "Osmanlı", color: "#8b3a3a", colorLight: "#c4645a", shape: "star" },
        british: { id: "british", name: "İngiliz", color: "#4a6a82", colorLight: "#7a9ab0", shape: "diamond" },
        anzac: { id: "anzac", name: "ANZAC", color: "#5a7a52", colorLight: "#8aaa78", shape: "circle" },
        french: { id: "french", name: "Fransız", color: "#6a5a7a", colorLight: "#9a8aaa", shape: "triangle" }
    },

    // Komuta zinciri: 5. Ordu (von Sanders) > 3. Kolordu (Esat Paşa)
    //   > 19. Tümen (M. Kemal) > 57. Alay (H. Avni Bey), 27. Alay (Şefik Aker)
    //   > 9. Tümen (Halil Sami), 7. Tümen (Remzi Bey)
    //   Müstahkem Mevki: Cevat Paşa (kıyı bataryaları)
    units: [
        // ── OSMANLI ──
        {
            id: "5-ordu", name: "5. Ordu Karargâhı", faction: "ottoman", type: "ordu",
            entityType: "infantry_unit", unitClass: "army_hq", side: "ottoman", anchorRegion: "gelibolu",
            commander: "Mareşal Liman von Sanders", strength: 84000,
            description: "Çanakkale savunmasının genel komutanlığı. Alman Mareşal von Sanders Mart 1915'te komutayı devraldı.",
            phases: { "naval-assault": { x: 475, y: 55, status: "savunma", objective: "Tüm yarımada savunmasını yönet", outcome: "Deniz harekâtını başarıyla püskürttü" } }
        },
        {
            id: "3-kolordu", name: "3. Kolordu", faction: "ottoman", type: "kolordu",
            entityType: "infantry_unit", unitClass: "corps", side: "ottoman", anchorRegion: "conkbayiri",
            commander: "Tümg. Esat Paşa", strength: 25000,
            description: "Gelibolu savunmasının ana kuvveti. Yarımadanın kuzey ve orta kesimlerini savundu.",
            phases: { "naval-assault": { x: 390, y: 155, status: "savunma", objective: "Yarımada genelini savun", outcome: "Deniz saldırısını püskürttü" } }
        },
        {
            id: "19-tumen", name: "19. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "ariburnu",
            commander: "Yrb. Mustafa Kemal", strength: 9000,
            description: "Ariburnu bölgesinin savunma tümeni. Mustafa Kemal'in komutasında Çanakkale'nin kaderini değiştirdi.",
            phases: { "naval-assault": { x: 380, y: 190, status: "hazır", objective: "Bigalı'da yedek kuvvet olarak bekle", outcome: "Karaya çıkışa karşı hazır bekledi" } }
        },
        {
            id: "57-alay", name: "57. Alay", faction: "ottoman", type: "piyade",
            entityType: "infantry_unit", unitClass: "regiment", side: "ottoman", anchorRegion: "ariburnu",
            commander: "Yrb. Hüseyin Avni Bey", strength: 3000,
            description: "\"Ben size taarruzu emretmiyorum, ölmeyi emrediyorum!\" 19. Tümen'e bağlı efsanevi alay.",
            phases: { "naval-assault": { x: 360, y: 215, status: "hazır", objective: "Bigalı'da emir bekle", outcome: "25 Nisan taarruzu için hazır" } }
        },
        {
            id: "27-alay", name: "27. Alay", faction: "ottoman", type: "piyade",
            entityType: "infantry_unit", unitClass: "regiment", side: "ottoman", anchorRegion: "ariburnu",
            commander: "Yrb. Şefik Aker", strength: 3000,
            description: "19. Tümen'e bağlı, Ariburnu'nda ilk karşılamayı yapan alay.",
            phases: { "naval-assault": { x: 285, y: 250, status: "hazır", objective: "Ariburnu kıyı savunması", outcome: "Çıkarmaya karşı hazır konumda" } }
        },
        {
            id: "mustahkem-mevki", name: "Çanakkale Müstahkem Mevki Komutanlığı", faction: "ottoman", type: "kolordu",
            entityType: "artillery_battery", unitClass: "battery", side: "ottoman", anchorRegion: "kilitbahir",
            commander: "Tümg. Cevat Paşa (Çobanlı)", strength: 20000,
            description: "Çanakkale Boğazı'nın kıyı savunmasından sorumlu komutanlık. Cevat Paşa, 18 Mart deniz savaşında kıyı bataryalarını yöneterek İtilaf donanmasını püskürten asıl komutandır. 17 Aralık 1914'te Usedom ve Merten Paşalarla birlikte Nusret'in ilk mayın döşeme operasyonuna bizzat katıldı. Emrindeki topçu bataryaları: Hamidiye, Mecidiye, Namazgâh, Rumeli ve Anadolu tabyaları.",
            phases: { "naval-assault": { x: 430, y: 310, status: "savunma", objective: "Boğaz kıyı savunmasını yönet", outcome: "230+ topla donanmayı durdurdu" } }
        },
        {
            id: "7-tumen", name: "7. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "seddulbahir",
            commander: "Alb. Remzi Bey", strength: 10000,
            description: "Seddülbahir bölgesinin savunmasında kritik rol oynayan tümen. 9. Tümen ile birlikte güney cephesinin ana savunma kuvvetiydi.",
            phases: { "naval-assault": { x: 350, y: 380, status: "savunma", objective: "Güney sahillerini savun", outcome: "Kıyı savunma hattını korudu" } }
        },
        {
            id: "9-tumen", name: "9. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "seddulbahir",
            commander: "Alb. Halil Sami", strength: 10000,
            description: "Seddülbahir ve güney bölgesini savunan ana kuvvet.",
            phases: { "naval-assault": { x: 330, y: 415, status: "savunma", objective: "Güney sahillerini savun", outcome: "Kıyı tahkimatlarını korudu" } }
        },
        {
            id: "5-tumen", name: "5. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "seddulbahir",
            commander: "Alb. Hasan Askeri Bey", strength: 10000,
            description: "Seddülbahir bölgesinde 7. ve 9. Tümenlerle birlikte güney cephesinin savunmasında kritik rol oynayan tümen. Kirte muharebelerinde ağır kayıplar verdi.",
            phases: { "naval-assault": { x: 310, y: 395, status: "savunma", objective: "Güney kıyı savunması", outcome: "Kıyı savunma hattını destekledi" } }
        },
        {
            id: "nusret", name: "Nusret Mayın Gemisi", faction: "ottoman", type: "deniz",
            entityType: "ship", unitClass: "mine_layer", side: "ottoman", anchorRegion: "bogaz",
            commander: "Kolağası Nazmi Bey (Korvet Kaptanı Yeniköylü İbrahim oğlu Hafız Nazmi Efendi)", strength: 76,
            description: "Nusret, Kasım 1914'ten itibaren Boğaz'da çok sayıda mayın döşeme seferi gerçekleştirdi. Kritik operasyonu 7/8 Mart 1915 gecesi saat 05:30'da Erenköy Koyu'na paralel 26 karbonik mayın döşemesiydi — 100-150 m aralıklarla, 4,5 m derinliğe. İtilaf keşif uçuşlarının göremediği bu hat, 18 Mart'ta Bouvet, Irresistible ve Ocean'ı batırdı. 6 Nisan 1915 itibariyle Boğaz'da toplam 422 mayın bulunuyordu (53 Alman, 362 karbonik, 7 Rus). İtilaf'ın 45 mayın tarama girişimi başarısızlıkla sonuçlandı. Komutanı Nazmi Bey, 19 Temmuz 1915'te Binbaşılığa terfi etti.",
            phases: { "naval-assault": { x: 455, y: 370, status: "savunma", objective: "Boğaz'a mayın döşe — düşmanı geçirmemek", outcome: "Döşediği mayınlar 3 gemiyi batırdı, 3'ünü savaş dışı bıraktı" } }
        },
        // ── İNGİLİZ ──
        {
            id: "hms-queen-elizabeth", name: "HMS Queen Elizabeth", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Amiral de Robeck (Donanma Komutanı)", strength: 950,
            description: "İtilaf donanmasının amiral gemisi, 15 inçlik toplarıyla en güçlü savaş gemisi. Amiral de Robeck donanma komutanıdır; geminin kaptanı ayrıdır.",
            phases: { "naval-assault": { x: 560, y: 360, status: "taarruz", objective: "Boğaz savunmalarını yok et", outcome: "Tabyaları bombaladı ama geçemedi" } }
        },
        {
            id: "hms-irresistible", name: "HMS Irresistible", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Albay Douglas Dent", strength: 780,
            description: "18 Mart 1915'te saat 16:14 civarında Nusret'in Erenköy mayın hattına çarparak ağır hasar alan İngiliz zırhlısı. Kıyı bataryalarının yoğun ateşi altında yardım da gönderilemedi. Mürettebatın büyük kısmı kurtarıldı, gemi akşam saatlerinde battı.",
            phases: { "naval-assault": { x: 500, y: 390, status: "taarruz", objective: "Boğaz'ı geç", outcome: "Nusret'in döşediği mayına çarparak battı" } }
        },
        {
            id: "hms-ocean", name: "HMS Ocean", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Albay Hayes-Sadler", strength: 750,
            description: "18 Mart 1915'te Irresistible'ı kurtarmaya giderken kendisi de Erenköy mayın hattına çarpan İngiliz zırhlısı. Saat 18:05'te terk edildi ve gece boyunca battı. Nazmi Bey: 'Akşam karanlığında Ocean da yan yattı.'",
            phases: { "naval-assault": { x: 520, y: 415, status: "taarruz", objective: "Boğaz'ı geç", outcome: "Mayına çarparak battı" } }
        },
        {
            id: "29-div", name: "29. Tümen", faction: "british", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "allied", anchorRegion: "seddulbahir",
            commander: "Tümg. Hunter-Weston", strength: 17000,
            description: "Seddülbahir çıkarmasının ana İngiliz kuvveti. V ve W sahillerine çıktı.",
            phases: { "naval-assault": { x: 640, y: 320, status: "hazır", objective: "Seddülbahir çıkarması planlaması", outcome: "Nisan çıkarması için hazırlandı" } }
        },
        // ── ANZAC ──
        {
            id: "anzac-1div", name: "1. Avustralya Tümeni", faction: "anzac", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "allied", anchorRegion: "ariburnu",
            commander: "Tümg. Bridges", strength: 12000,
            description: "Ariburnu çıkarmasının ana kuvveti. ANZAC efsanesinin başlangıcı.",
            phases: { "naval-assault": { x: 110, y: 260, status: "hazır", objective: "Mısır'da çıkarma için eğitim", outcome: "Nisan çıkarması için hazırlandı" } }
        },
        {
            id: "nz-inf", name: "Yeni Zelanda Tugayı", faction: "anzac", type: "tugay",
            entityType: "infantry_unit", unitClass: "brigade", side: "allied", anchorRegion: "conkbayiri",
            commander: "Alb. Johnston", strength: 4000,
            description: "Conkbayırı savaşlarında kritik rol oynayan Yeni Zelanda birliği.",
            phases: { "naval-assault": { x: 110, y: 300, status: "hazır", objective: "Mısır'da eğitim", outcome: "Çıkarma planlaması devam etti" } }
        },
        // ── FRANSIZ ──
        {
            id: "bouvet", name: "Bouvet", faction: "french", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Kaptan Rageot de la Touche", strength: 721,
            description: "18 Mart 1915 saat 13:58'de Nusret'in Erenköy hattındaki mayına çarparak yaklaşık 2 dakikada batan Fransız zırhlısı. 721 mürettebattan sadece 66'sı kurtuldu (Nazmi Bey günlüğü). Bouvet'in batışı, o günkü İtilaf kayıplarının en ağırıydı.",
            phases: { "naval-assault": { x: 490, y: 435, status: "taarruz", objective: "Osmanlı tabyalarını sustur", outcome: "Mayına çarparak battı – 655 kayıp" } }
        },
        {
            id: "suffren", name: "Suffren", faction: "french", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Kaptan Guépratte", strength: 700,
            description: "Ağır hasar almasına rağmen çatışmaya devam eden Fransız zırhlısı.",
            phases: { "naval-assault": { x: 470, y: 460, status: "taarruz", objective: "Kıyı bataryalarını bombalama", outcome: "Ağır hasar aldı ama sağ kaldı" } }
        },
        {
            id: "fr-corps", name: "Fransız Sefer Kuvveti", faction: "french", type: "kolordu",
            entityType: "infantry_unit", unitClass: "corps", side: "allied", anchorRegion: "kumkale",
            commander: "General d'Amade", strength: 18000,
            description: "Kumkale çıkarmasını gerçekleştiren ve Seddülbahir'de savaşan Fransız kara kuvveti.",
            phases: { "naval-assault": { x: 620, y: 470, status: "hazır", objective: "Kumkale hedefi için hazırlık", outcome: "Deniz harekâtını destekledi" } }
        }
    ],

    phases: [
        {
            id: "naval-assault", date: "18 Mart 1915", title: "Deniz Harekâtı",
            narration: "18 savaş gemisinden oluşan İtilaf donanması Çanakkale Boğazı'nı geçmeye çalıştı. Saat 11:10'da başlayan taarruz, Osmanlı kıyı bataryaları ve Nusret'in 7/8 Mart gecesi Erenköy Koyu'na döşediği 26 mayınlık gizli hat sayesinde felaketle sonuçlandı. Bouvet, Irresistible ve Ocean batırıldı; Inflexible, Suffren ve Gaulois ağır hasar aldı. İtilaf'ın 45 mayın tarama girişimi de boşa gitmişti. Boğaz geçilemezdi.",
            locationByFaction: { ottoman: ["kilitbahir", "canakkale", "seddulbahir", "kumkale"], british: "bogaz", french: "kumkale" }
        },
        {
            id: "april-landings", date: "25 Nisan 1915", title: "Kara Çıkarması",
            narration: "İtilaf kuvvetleri Seddülbahir ve Ariburnu'nda eşzamanlı çıkarma yaptı. Kumkale'de dikkat dağıtma harekâtı uygulandı.",
            locationByFaction: { anzac: "ariburnu", british: "seddulbahir", french: "kumkale", ottoman: ["ariburnu", "alcitepe", "seddulbahir"] }
        },
        {
            id: "ariburnu-battles", date: "Nisan–Mayıs 1915", title: "Arıburnu Muharebeleri",
            narration: "Mustafa Kemal'in 57. Alayı ANZAC kuvvetlerine karşı taarruza geçti. Siperlerde kanlı bir denge kuruldu.",
            locationByFaction: { anzac: "ariburnu", ottoman: "conkbayiri", british: "kirte", french: "morto-koyu" }
        },
        {
            id: "seddulbahir-battles", date: "Nisan–Haziran 1915", title: "Seddülbahir Muharebeleri",
            narration: "Yarımadanın güneyinde İngiliz ve Fransız kuvvetleri siper savaşında büyük kayıplar verdi. Kirte muharebeleri ağır geçti.",
            locationByFaction: { british: "kirte", french: "seddulbahir", ottoman: "alcitepe", anzac: "ariburnu" }
        },
        {
            id: "august-offensive", date: "6–21 Ağustos 1915", title: "Ağustos Taarruzu",
            narration: "Suvla Koyu çıkarması ve Conkbayırı taarruzu İtilaf'ın son büyük hamlesi oldu. Başarısızlıkla sonuçlandı.",
            locationByFaction: { british: "suvla", anzac: "conkbayiri", ottoman: ["anafartalar", "conkbayiri"], french: "seddulbahir" }
        },
        {
            id: "evacuation", date: "Aralık 1915 – Ocak 1916", title: "Tahliye",
            narration: "İtilaf kuvvetleri yarımadadan çekildi. Şaşırtıcı biçimde çekilme sırasında çok az kayıp verildi.",
            locationByFaction: { anzac: "ariburnu", british: "seddulbahir", french: "seddulbahir", ottoman: "suvla" }
        }
    ],

    locations: [
        { id: "gelibolu", name: "Gelibolu", x: 478, y: 48 },
        { id: "suvla", name: "Suvla Koyu", x: 238, y: 128 },
        { id: "tuzgolu", name: "Tuz Gölü", x: 268, y: 120 },
        { id: "kirectepe", name: "Kireçtepe", x: 265, y: 88 },
        { id: "anafartalar", name: "Anafartalar", x: 345, y: 148 },
        { id: "bigali", name: "Bigalı", x: 395, y: 185 },
        { id: "conkbayiri", name: "Conkbayırı", x: 320, y: 225 },
        { id: "ariburnu", name: "Arıburnu (ANZAC Koyu)", x: 222, y: 248 },
        { id: "kabatepe", name: "Kabatepe", x: 215, y: 305 },
        { id: "eceabat", name: "Eceabat", x: 418, y: 285 },
        { id: "kilitbahir", name: "Kilitbahir", x: 408, y: 348 },
        { id: "bogaz", name: "Boğaz (Narrows)", x: 445, y: 338 },
        { id: "canakkale", name: "Çanakkale", x: 495, y: 348 },
        { id: "alcitepe", name: "Alçıtepe (Achi Baba)", x: 305, y: 408 },
        { id: "kirte", name: "Kirte (Krithia)", x: 280, y: 428 },
        { id: "seddulbahir", name: "Seddülbahir", x: 320, y: 488 },
        { id: "morto-koyu", name: "Morto Koyu", x: 365, y: 468 },
        { id: "kumkale", name: "Kumkale", x: 440, y: 510 }
    ]
};

/** Location ID → konum objesi look-up tablosu */
export const LOCATION_BY_ID = BATTLE_DATA.locations.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

/** Temel faz ID'si (birim başlangıç konumları bu fazdan okunur) */
export const BASE_PHASE_ID = "naval-assault";

/** Token'lar arasındaki minimum mesafe (cluster spread) */
export const PHASE_TOKEN_SPREAD = 18;

// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Unit Dossiers
// Obsidian-style unit notes: summary, media, sources and timeline hints.
// ══════════════════════════════════════════════════════════════

const P = 'assets/photos';

export const UNIT_DOSSIERS = {
    '5-ordu': {
        unitId: '5-ordu',
        summary: 'Yarımada savunmasının üst komuta omurgası. Kritik kararları cepheye doğrudan yürüyen tümenlerden çok ihtiyatların nerede tutulacağı belirledi.',
        media: [{ type: 'image', url: `${P}/ottoman-soldiers-trench.jpg`, caption: 'Osmanlı savunma hazırlıkları', credit: 'Wikimedia Commons' }],
        sourceRefs: ['national-archives-map-series', 'anzac-portal-gallipoli-maps'],
        timelineNotes: ['24 Mart 1915 sonrası 5. Ordu komuta düzeni belirginleşir.', 'Ağustos 1915 sonrasında Anafartalar dahil tüm kuzey cephe yeniden ağırlık kazanır.']
    },
    '3-kolordu': {
        unitId: '3-kolordu',
        summary: 'Arıburnu ve Conkbayırı savunmasının komuta katmanı. 25 Nisan sabahı yerel inisiyatif ve ihtiyat kullanımı cephenin kaderini belirledi.',
        media: [{ type: 'image', url: `${P}/ottoman-trench.jpg`, caption: 'Arıburnu siper hattı bağlamı', credit: 'Wikimedia Commons' }],
        sourceRefs: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'],
        timelineNotes: ['Bigalı ihtiyatından Arıburnu-Conkbayırı savunmasına geçiş izlenir.', 'Ağustos sonrası kuzey cephede baskı artar.']
    },
    '19-tumen': {
        unitId: '19-tumen',
        summary: 'Mustafa Kemal komutasındaki 19. Tümen, Bigalı ihtiyatından Arıburnu ve Conkbayırı hattına çıkan ana karar birimidir.',
        media: [{ type: 'image', url: `${P}/mustafa-kemal-gallipoli.jpg`, caption: 'Mustafa Kemal, Gelibolu dönemi', credit: 'Wikimedia Commons' }],
        sourceRefs: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps', 'awm-anzac-suvla-1915'],
        timelineNotes: ['25 Nisan karşı hareketi Conkbayırı çevresini tutar.', '10 Ağustos karşı taarruzu Conkbayırı zirvesini geri alır.']
    },
    '57-alay': {
        unitId: '57-alay',
        summary: '19. Tümen öncü alayı. Arıburnu çıkarmasına karşı ilk gün en ağır bedeli ödeyen sembol birliklerden biridir.',
        media: [{ type: 'image', url: `${P}/ottoman-assault.jpg`, caption: 'Osmanlı karşı taarruz temsili', credit: 'Wikimedia Commons' }],
        sourceRefs: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'],
        timelineNotes: ['25 Nisan Bigalı-Conkbayırı-Arıburnu hareketi ana rota kabul edilir.', 'Mayıs sonrası Arıburnu siper hattında yıpranma artar.']
    },
    '27-alay': {
        unitId: '27-alay',
        summary: 'Arıburnu ilk temas savunmasını taşıyan Osmanlı alayı. Eceabat/Maydos hattından kıyıya ve sırtlara hızlı reaksiyon gösterir.',
        media: [{ type: 'image', url: `${P}/ottoman-mg.jpg`, caption: 'Savunma ateşi ve makineli tüfek mevzisi', credit: 'Bundesarchiv / Wikimedia Commons' }],
        sourceRefs: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'],
        timelineNotes: ['25 Nisan ilk temas hareketi ayrı rota olarak izlenir.', 'Ağustos döneminde Conkbayırı savunmasıyla ilişkilidir.']
    },
    'mustahkem-mevki': {
        unitId: 'mustahkem-mevki',
        summary: 'Cevat Paşa komutasındaki Boğaz savunma sistemi. Kıyı bataryaları, mayın hatları ve projektör düzeniyle deniz harekatını kırar.',
        media: [{ type: 'image', url: `${P}/cevat-pasha.jpg`, caption: 'Cevat Paşa (Çobanlı)', credit: 'Wikimedia Commons' }],
        sourceRefs: ['dardanelles-defences-1915', 'national-archives-map-series'],
        timelineNotes: ['18 Mart sahnesinde ana kara/topçu komuta düğümüdür.', 'Mayın tarama başarısızlığı bu savunma şemsiyesiyle bağlanır.']
    },
    '7-tumen': {
        unitId: '7-tumen',
        summary: 'Seddülbahir güney savunmasının ana Osmanlı tümenlerinden biri. V/W Beach ve Alçıtepe hattında görünür olmalıdır.',
        media: [{ type: 'image', url: `${P}/v-beach-river-clyde.jpg`, caption: 'V Beach ve River Clyde bağlamı', credit: 'Royal Museums Greenwich' }],
        sourceRefs: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        timelineNotes: ['25 Nisan V/W Beach savunması yüksek güvenli anchor ile izlenir.', 'Temmuz sonrası Alçıtepe hattına çekilir.']
    },
    '9-tumen': {
        unitId: '9-tumen',
        summary: 'Boğaz tahkimatı ve Helles savunması arasında duran Osmanlı tümeni. Kilitbahir-Seddülbahir ekseninde izlenir.',
        media: [{ type: 'image', url: `${P}/ottoman-heavy-gun.jpg`, caption: 'Boğaz savunma topçusu', credit: 'Bundesarchiv / Wikimedia Commons' }],
        sourceRefs: ['national-archives-map-series', 'dardanelles-defences-1915', 'anzac-portal-gallipoli-maps'],
        timelineNotes: ['Deniz döneminde Kilitbahir hattı.', 'Kara döneminde Helles/Seddülbahir savunması.']
    },
    '5-tumen': {
        unitId: '5-tumen',
        summary: 'Eceabat-Maydos rezervinden Helles/Kirte siper hattına kayan güney cephe destek tümeni.',
        media: [{ type: 'image', url: `${P}/w-beach-helles.jpg`, caption: 'Helles cephesi', credit: 'Wikimedia Commons' }],
        sourceRefs: ['national-archives-map-series', 'anzac-portal-gallipoli-maps'],
        timelineNotes: ['25 Nisan sonrası Seddülbahir/Kirte hattı ana bağlamdır.', 'Temmuz sonrası Kirte mevzisi belirginleşir.']
    },
    'nusret': {
        unitId: 'nusret',
        summary: '7/8 Mart 1915 gecesi Erenköy Koyu hattına döşenen 26 mayın, 18 Mart deniz savaşının kırılma noktasıdır.',
        media: [{ type: 'image', url: `${P}/nusret-1912.png`, caption: 'Nusret Mayın Gemisi', credit: 'Wikimedia Commons' }],
        sourceRefs: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        timelineNotes: ['7/8 Mart rota kaydı yüksek güvenle gösterilir.', '18 Mart sonrası mayın hattı kanıt notu korunur.']
    },
    'allied-minesweepers': {
        unitId: 'allied-minesweepers',
        summary: 'Sivil trawler ekiplerinin mayın tarama denemeleri başarısız kaldı; Nusret hattının görünmez kalması bu düğüme bağlıdır.',
        media: [{ type: 'image', url: `${P}/ottoman-battery.jpg`, caption: 'Mayın taramayı baskılayan kıyı ateşi', credit: 'Wikimedia Commons' }],
        sourceRefs: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        timelineNotes: ['19 Şubat-17 Mart arası gece tarama rotası izlenir.', '18 Martta açılmamış hat anlatısı korunur.']
    },
    'hms-queen-elizabeth': {
        unitId: 'hms-queen-elizabeth',
        summary: 'İtilaf donanmasının amiral gemisi. De Robeck filo komutanıdır; gemi kaptanı ile komuta rolü ayrı tutulmalıdır.',
        media: [{ type: 'image', url: `${P}/dardanelles-fleet.jpg`, caption: 'İtilaf donanması Boğaz önünde', credit: 'Wikimedia Commons' }],
        sourceRefs: ['gdi-naval-campaign', 'britannica-naval-operations'],
        timelineNotes: ['18 Mart Line A bombardıman hattında gösterilir.', 'Mayıs ayında denizaltı tehdidiyle tiyatrodan ayrılır.']
    },
    'hms-irresistible': {
        unitId: 'hms-irresistible',
        summary: '18 Martta Erenköy mayın hattında devre dışı kalan İngiliz zırhlısı. Kurtarma ve tahliye sahnesi Ocean ile bağlanır.',
        media: [{ type: 'image', url: `${P}/bouvet-sinking.jpg`, caption: '18 Mart kayıp sahnesi bağlamı', credit: 'Wikimedia Commons' }],
        sourceRefs: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        timelineNotes: ['18 Mart exact anchor yüksek güvenlidir.', '19 Mart sonrası destroyed gate ile gizlenir.']
    },
    'hms-ocean': {
        unitId: 'hms-ocean',
        summary: 'Irresistible yardım girişimi sırasında aynı mayın sahasında kaybedilen İngiliz zırhlısı.',
        media: [{ type: 'image', url: `${P}/bouvet-sinking.jpg`, caption: '18 Mart deniz kayıpları', credit: 'Wikimedia Commons' }],
        sourceRefs: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        timelineNotes: ['18 Mart exact anchor yüksek güvenlidir.', 'Sonraki günlerde destroyed gate ile çıkarılır.']
    },
    '29-div': {
        unitId: '29-div',
        summary: 'Cape Helles çıkarmasının ana İngiliz tümeni. X/V/W Beach ve Kirte hattı ayrı ayrı okunmalıdır.',
        media: [{ type: 'image', url: `${P}/v-beach-river-clyde.jpg`, caption: 'V Beach ve SS River Clyde', credit: 'Royal Museums Greenwich' }],
        sourceRefs: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        timelineNotes: ['25-28 Nisan X/V/W Beach rota kaydı.', '29 Nisan sonrası Helles/Kirte köprübaşı.']
    },
    'ix-corps': {
        unitId: 'ix-corps',
        summary: 'Suvla çıkarmasını taşıyan İngiliz IX Kolordusu. Yavaş ilerleme Anafartalar savunmasına zaman kazandırdı.',
        media: [{ type: 'image', url: `${P}/ataturk-anafartalar.jpg`, caption: 'Anafartalar sonrası cephe bağlamı', credit: 'Wikimedia Commons' }],
        sourceRefs: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'],
        timelineNotes: ['6 Ağustos sonrası Suvla-Anafartalar hattında görünür.', '20 Aralık sonrası tahliye nedeniyle gizlenir.']
    },
    'ss-river-clyde': {
        unitId: 'ss-river-clyde',
        summary: 'V Beach önüne oturtulan çıkarma platformu. Bir gemiden çok kanlı çıkış sahnesinin sabit taktik nesnesidir.',
        media: [{ type: 'image', url: `${P}/v-beach-river-clyde.jpg`, caption: 'SS River Clyde, V Beach', credit: 'Royal Museums Greenwich' }],
        sourceRefs: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        timelineNotes: ['25-27 Nisan exact V Beach anchor ile gösterilir.', 'Sonrasında ana birlik katmanından çıkarılır.']
    },
    'anzac-1div': {
        unitId: 'anzac-1div',
        summary: 'ANZAC Koyu çıkarmasının ana Avustralya birliği. Dar köprübaşından siper savaşına geçen akışın ana göstergesidir.',
        media: [{ type: 'image', url: `${P}/anzac-landing.jpg`, caption: 'ANZAC çıkarması', credit: 'Australian War Memorial' }],
        sourceRefs: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'],
        timelineNotes: ['25 Nisan Arıburnu çıkış rotası.', 'Ağustos sonrası Anzac-Suvla bağlantı cephesi.']
    },
    'nz-inf': {
        unitId: 'nz-inf',
        summary: 'Yeni Zelanda Tugayı, Ağustos taarruzunda Conkbayırı zirvesine ulaşan ve 10 Ağustos karşı taarruzuyla geri itilen birliktir.',
        media: [{ type: 'image', url: `${P}/mustafa-kemal-gallipoli.jpg`, caption: 'Conkbayırı-Anafartalar bağlamı', credit: 'Wikimedia Commons' }],
        sourceRefs: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps', 'nz-history-anzac-suvla'],
        timelineNotes: ['6-10 Ağustos Sarı Bayır/Conkbayırı rotası yüksek güvenle izlenir.', '11 Ağustos sonrası Anzac hattına dönüş.']
    },
    'bouvet': {
        unitId: 'bouvet',
        summary: '18 Martta Erenköy dönüşünde mayına çarpıp dakikalar içinde batan Fransız zırhlısı.',
        media: [{ type: 'image', url: `${P}/bouvet-sinking.jpg`, caption: 'Bouvet batışı', credit: 'Wikimedia Commons' }],
        sourceRefs: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        timelineNotes: ['18 Mart exact sink anchor yüksek güvenlidir.', '19 Mart sonrası destroyed gate ile çıkarılır.']
    },
    'suffren': {
        unitId: 'suffren',
        summary: 'Fransız hattında ağır hasar alan fakat batmayan zırhlı. Deniz sahnesinde damage state ile okunmalıdır.',
        media: [{ type: 'image', url: `${P}/dardanelles-fleet.jpg`, caption: 'Fransız-İngiliz deniz hattı', credit: 'Wikimedia Commons' }],
        sourceRefs: ['gdi-naval-campaign', 'dardanelles-defences-1915'],
        timelineNotes: ['18 Mart damage anchor orta güvenlidir.', '19 Mart sonrası onarım/çekilme rotası izlenir.']
    },
    'fr-corps': {
        unitId: 'fr-corps',
        summary: 'Kumkale aldatma çıkarmasından Helles sağ kanadına geçen Fransız Sefer Kuvveti.',
        media: [{ type: 'image', url: `${P}/w-beach-helles.jpg`, caption: 'Helles cephesi', credit: 'Wikimedia Commons' }],
        sourceRefs: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        timelineNotes: ['25-27 Nisan Kumkale.', '28 Nisan sonrası Seddülbahir/Helles sağ kanadı.']
    }
};

export function getUnitDossier(unitId) {
    return UNIT_DOSSIERS[unitId] || {
        unitId,
        summary: 'Bu birim için ayrıntılı dosya hazırlanıyor; mevcut panel tarihsel konum, durum ve kaynak izlerini göstermeye devam eder.',
        media: [],
        sourceRefs: [],
        timelineNotes: []
    };
}

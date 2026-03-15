const fs = require('fs');
const { execSync } = require('child_process');

const epubPath = process.argv[2] || 'book/Peter Hart - Gallipoli (2011, Profile Books Ltd) - libgen.li.epub';
const outPath = process.argv[3] || 'book/gallipoli-events.js';
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_TR_TO_NUM = {
  ocak: 1,
  subat: 2,
  şubat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  mayıs: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  ağustos: 8,
  eylul: 9,
  eylül: 9,
  ekim: 10,
  kasim: 11,
  kasım: 11,
  aralik: 12,
  aralık: 12
};
const MONTH_NUM_TO_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTH_EN_TO_NUM = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};
const TR_MONTH_PATTERN = 'Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik';
const CAMPAIGN_START_ISO = '1914-11-03';
const CAMPAIGN_END_ISO = '1916-01-09';
const DAILY_TYPES = new Set(['explicit', 'anchored']);
const DAILY_SOURCES = new Set(['epub', 'weekly-guide', 'internet']);
const OFFICIAL_SOURCE_REGISTRY = {
  EPUB_PARSE: {
    title: 'EPUB Parse (Peter Hart, Gallipoli)',
    url: 'book/Peter Hart - Gallipoli (2011, Profile Books Ltd) - libgen.li.epub',
    trust: 'local'
  },
  WEEKLY_PLAN_USER: {
    title: 'Kullanıcı Haftalık Kronoloji Planı',
    url: 'local://weekly-plan',
    trust: 'provided'
  },
  DVA_GALLIPOLI_TIMELINE: {
    title: 'Department of Veterans’ Affairs (AU) - Gallipoli campaign timeline',
    url: 'https://www.anzacportal.dva.gov.au/wars-and-missions/gallipoli-campaign-1915/timeline',
    trust: 'official'
  },
  AWM_GALLIPOLI_1915: {
    title: 'Australian War Memorial - Gallipoli 1915',
    url: 'https://www.awm.gov.au/articles/first-world-war/gallipoli-1915',
    trust: 'official'
  },
  UKNA_WAR_DIARIES: {
    title: 'The National Archives (UK) - British Army war diaries 1914-1922',
    url: 'https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/british-army-war-diaries-1914-1922/',
    trust: 'official'
  }
};

const OFFICIAL_OPERATION_WINDOWS = [
  {
    startIso: '1914-11-03',
    endIso: '1915-02-18',
    detail: 'Boğaz girişine yönelik deniz baskısı ile Osmanlı savunma-tahkimat döngüsü sürdü.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'AWM_GALLIPOLI_1915']
  },
  {
    startIso: '1915-02-19',
    endIso: '1915-03-18',
    detail: 'Müttefik deniz taarruzu yoğunlaştı; mayın hatları ve kıyı bataryaları geçişi durdurdu.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'AWM_GALLIPOLI_1915']
  },
  {
    startIso: '1915-03-19',
    endIso: '1915-04-24',
    detail: 'Denizden zorlamadan kara harekâtı hazırlığına geçildi; çıkarma kuvvetleri toplandı.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'UKNA_WAR_DIARIES']
  },
  {
    startIso: '1915-04-25',
    endIso: '1915-06-30',
    detail: 'Arıburnu ve Helles ekseninde köprübaşı mücadelesi ve yıpratma taarruzları yaşandı.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'AWM_GALLIPOLI_1915']
  },
  {
    startIso: '1915-07-01',
    endIso: '1915-08-05',
    detail: 'Siper hattı korunurken taraflar yeni taarruz dalgası için ikmal ve birlik kaydırdı.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'UKNA_WAR_DIARIES']
  },
  {
    startIso: '1915-08-06',
    endIso: '1915-08-31',
    detail: 'Ağustos taarruzları, Suvla çıkarması ve kritik sırt muharebeleriyle cephe yeniden şekillendi.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'AWM_GALLIPOLI_1915']
  },
  {
    startIso: '1915-09-01',
    endIso: '1915-11-04',
    detail: 'Cephe büyük ölçüde siper dengesinde kaldı; sınırlı temas ve yıpratma sürdü.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'UKNA_WAR_DIARIES']
  },
  {
    startIso: '1915-11-05',
    endIso: '1915-12-06',
    detail: 'Tahliye karar süreci netleşti; lojistik hazırlık ve gizlilik önlemleri öne çıktı.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'UKNA_WAR_DIARIES']
  },
  {
    startIso: '1915-12-07',
    endIso: '1916-01-09',
    detail: 'Arıburnu, Anafartalar ve Helles hatlarında tahliye safhası kademeli olarak tamamlandı.',
    sourceCodes: ['DVA_GALLIPOLI_TIMELINE', 'AWM_GALLIPOLI_1915']
  }
];

const OFFICIAL_DAILY_EVENTS = {
  '1914-11-03': "İtilaf gemileri Seddülbahir ve Kumkale dış tabyalarını bombaladı.",
  '1914-11-14': "Sultan, cihat çağrısı ilan etti.",
  '1914-12-13': "B-11 denizaltısı Mesudiye'yi boğaz içinde batırdı.",
  '1915-01-13': "İngiliz Savaş Konseyi boğazın denizden zorlanması planını onayladı.",
  '1915-01-29': 'Müttefik filo taarruz hazırlığı için toplandı.',
  '1915-02-19': 'İngiliz-Fransız donanması dış tabyaları yoğun ateş altına aldı.',
  '1915-02-23': 'Limni (Mudros) müttefik deniz üssü olarak kullanıma açıldı.',
  '1915-02-25': 'Dış tabyalara yeni bombardıman dalgası uygulandı.',
  '1915-02-26': 'Müttefik çıkarma timleri bazı tabya toplarını imha etti.',
  '1915-03-01': 'Dört zırhlı boğaza girerek ara savunma hatlarını bombaladı.',
  '1915-03-04': 'Seddülbahir çevresine deniz timleri çıkarıldı.',
  '1915-03-10': '29. Tümen’in doğuya sevki kararlaştırıldı.',
  '1915-03-11': 'General Ian Hamilton harekât komutanlığına atandı.',
  '1915-03-13': "Hamilton, Kitchener'dan son talimatlarını aldı.",
  '1915-03-17': 'Hamilton Tenedos bölgesine ulaştı.',
  '1915-03-18': 'Büyük deniz taarruzu başarısız oldu; zırhlı kayıpları verildi.',
  '1915-03-22': 'Karma deniz-kara harekâtına geçiş kararı alındı.',
  '1915-04-10': 'ANZAC taşıma gemileri Mudros yönüne hareket etti.',
  '1915-04-13': 'Queen Elizabeth ve Queen keşif için kıyı hattını taradı.',
  '1915-04-25': 'Kumkale, Anzak ve Helles çıkarmaları başladı.',
  '1915-04-26': "Anzak hattındaki Türk karşı taarruzları geri püskürtüldü.",
  '1915-04-28': "Birinci Kirte Muharebesi'nde müttefik saldırısı sonuçsuz kaldı.",
  '1915-04-30': 'AE2 denizaltısı Marmara’da batırıldı.',
  '1915-05-01': 'Helles hattında gece Türk hücumu ağır kayıplarla durduruldu.',
  '1915-05-06': "İkinci Kirte Muharebesi sonuç getirmedi.",
  '1915-05-12': 'Anzak cephesine atlı birliklerin yaya unsurları ulaştı.',
  '1915-05-13': 'HMS Goliath torpido saldırısıyla battı.',
  '1915-05-19': 'Anzakta geniş Türk taarruzu püskürtüldü.',
  '1915-05-24': 'Ölülerin gömülmesi için ateşkes uygulandı.',
  '1915-05-25': 'HMS Triumph U-21 tarafından torpillendi.',
  '1915-05-27': 'HMS Majestic, Cape Helles açıklarında batırıldı.',
  '1915-05-29': "Quinn's Post çevresinde şiddetli mevzi çatışmaları yaşandı.",
  '1915-06-04': "Üçüncü Kirte Muharebesi yüksek kayıpla sonuçlandı.",
  '1915-06-21': 'Fransız birlikleri Haricot Redoubt mevkiini ele geçirdi.',
  '1915-06-28': 'Gully Ravine saldırısı başladı.',
  '1915-06-29': 'Anzakta son büyük Türk taarruz denemesi başarısız kaldı.',
  '1915-07-02': 'Helles hattındaki Türk hücumu geri atıldı.',
  '1915-07-10': 'Helles’te ateşkes talebi müttefik komuta tarafından reddedildi.',
  '1915-07-12': "Helles’te yeni müttefik hücumları ağır kayıpla durduruldu.",
  '1915-08-03': '13. Tümen Anzak bölgesine ulaştı.',
  '1915-08-06': 'Ağustos taarruzu; Lone Pine, Nek ve Sari Bair saldırıları başladı.',
  '1915-08-07': 'IX Kolordu Suvla’ya çıktı; kritik tepeler alınamayınca ilerleme durdu.',
  '1915-08-08': 'Wellington Taburu Chunuk Bair zirvesine ulaştı.',
  '1915-08-09': 'Gurkha birlikleri Hill Q-Chunuk Bair hattına temas etti.',
  '1915-08-10': "Türk karşı taarruzu Chunuk Bair'da mevzileri geri aldı.",
  '1915-08-12': "Suvla'da 5. Norfolk Taburu kayıp vakası yaşandı.",
  '1915-08-15': 'Kiretch Tepe yönündeki İngiliz saldırısı sonuçsuz kaldı.',
  '1915-08-21': "Scimitar Hill ve Hill 60 muharebeleriyle son büyük taarruz denendi.",
  '1915-08-27': 'Hill 60 için muharebe yeniden alevlendi.',
  '1915-08-28': 'Yeni Zelandalılar Hill 60 hattında tutunmayı sürdürdü.',
  '1915-09-02': 'Southland nakliye gemisi torpillendi.',
  '1915-10-08': 'Sonbahar fırtınası Suvla ve Anzak liman tesislerine zarar verdi.',
  '1915-10-11': 'Kitchener, tahliye maliyetini komutadan talep etti.',
  '1915-10-16': 'Hamilton görevden alındı; Monro komutayı devraldı.',
  '1915-10-30': 'Monro yarımadayı yerinde inceledi.',
  '1915-11-13': 'Lord Kitchener Anzak sahasına geldi.',
  '1915-11-24': 'Sahada 72 saatlik sessizlik uygulaması başlatıldı.',
  '1915-11-27': 'Büyük tipi ve don olayları kuvvetleri sarstı.',
  '1915-12-07': 'İngiliz hükümeti tahliye emrini verdi.',
  '1915-12-08': 'Monro, Anzak ve Suvla tahliyesi için Birdwood’u görevlendirdi.',
  '1915-12-15': 'Tahliye için ayrıntılı emirler yayımlandı.',
  '1915-12-19': 'Anzak ve Suvla tahliyesinin son gecesi icra edildi.',
  '1915-12-20': 'Anzak ve Suvla tahliyesi kayıpsız tamamlandı.',
  '1916-01-09': 'Helles tahliyesi tamamlanarak Gelibolu seferi sona erdi.'
};

const CHAPTER_DATE_OVERRIDES = {
  1: '1914-11-03',
  2: '1915-02-19',
  3: '1915-03-05',
  4: '1915-03-12',
  5: '1915-04-25',
  6: '1915-04-25',
  7: '1915-04-25',
  8: '1915-04-25',
  9: '1915-05-01',
  10: '1915-05-07',
  11: '1915-05-19',
  12: '1915-06-04',
  13: '1915-08-06',
  14: '1915-08-13',
  15: '1915-08-06',
  16: '1915-08-21',
  17: '1915-10-15',
  18: '1915-11-03',
  19: '1915-12-07',
  20: '1916-01-09'
};

const CANONICAL_WEEKLY_GUIDE = [
  { startIso: '1914-11-03', title: 'Savaşın Resmi Başlangıcı', narration: "3 Kasım'da İtilaf donanması Seddülbahir, Ertuğrul, Kumkale ve Orhaniye tabyalarını bombaladı.", importance: 'major' },
  { startIso: '1914-11-10', title: 'Osmanlı Savaş İlanı', narration: "11 Kasım'da Osmanlı savaşa girdi, 14 Kasım'da Cihad-ı Ekber ilan edildi.", importance: 'major' },
  { startIso: '1914-11-17', title: 'Tahkimat Haftası', narration: "Gelibolu Yarımadası'nda savunma planları ve tahkimat çalışmaları hızlandı.", importance: 'minor' },
  { startIso: '1914-11-24', title: 'Asker Sevkiyatı', narration: 'Sessiz geçen haftada Osmanlı ordusu bölgeye asker ve mühimmat sevkini sürdürdü.', importance: 'minor' },
  { startIso: '1914-12-01', title: 'Keşif ve Bekleme', narration: 'Cephede keşif faaliyeti ve sınırlı temaslar devam etti.', importance: 'minor' },
  { startIso: '1914-12-08', title: 'Mesudiye Olayı', narration: "13 Aralık civarında B-11 denizaltısı Mesudiye'yi batırdı; deniz güvenliği baskı altına girdi.", importance: 'major' },
  { startIso: '1914-12-15', title: 'Aralık Sonu Savunması', narration: 'Boğaz savunması ve mevzi güçlendirme çalışmaları sürdü.', importance: 'minor' },
  { startIso: '1914-12-22', title: 'Yıl Sonu Durgunluğu', narration: 'Yıl sonuna doğru cephede düşük yoğunluklu temas ve hazırlık döngüsü devam etti.', importance: 'minor' },
  { startIso: '1914-12-29', title: 'Ocak Öncesi Hazırlık', narration: "İtilaf'ın saldırı planları olgunlaşırken Osmanlı savunma düzeni sıklaştırıldı.", importance: 'minor' },
  { startIso: '1915-01-05', title: 'Hazırlık Dönemi', narration: "İtilaf Devletleri Çanakkale saldırısını planladı; Osmanlı tarafı savunma hatlarını güçlendirdi.", importance: 'major' },
  { startIso: '1915-01-12', title: 'Savaş Konseyi Kararı', narration: "İngiliz Savaş Konseyi Gelibolu harekâtını onayladı; keşif ve istihbarat faaliyetleri arttı.", importance: 'major' },
  { startIso: '1915-01-19', title: 'İstihbarat Haftası', narration: 'Sessiz geçen dönemde karşılıklı istihbarat ve hazırlık çalışmaları öne çıktı.', importance: 'minor' },
  { startIso: '1915-01-26', title: '5. Ordu Hazırlığı', narration: "Osmanlı 5. Ordu'sunun kurulmasına dönük hazırlıklar başladı; İngiliz keşfi sürdü.", importance: 'major' },
  { startIso: '1915-02-02', title: 'Bombardıman Öncesi', narration: 'İtilaf donanması boğaz girişindeki hedefleri için ateş planlarını netleştirdi.', importance: 'major' },
  { startIso: '1915-02-09', title: 'Keşif Saldırıları', narration: 'Küçük çaplı keşif saldırıları ve topçu denemeleri sürdü.', importance: 'minor' },
  { startIso: '1915-02-16', title: '19 Şubat Saldırısı', narration: "19 Şubat'ta İtilaf donanması resmen saldırıya geçti; Seddülbahir ve Kumkale yoğun ateş aldı.", importance: 'major' },
  { startIso: '1915-02-23', title: '26 Şubat Sonrası', narration: "25-26 Şubat hattında tabyalar ağır hasar aldı; Osmanlı topçusu karşı ateşle geçişi engelledi.", importance: 'major' },
  { startIso: '1915-03-02', title: 'Mayın Tarama Dönemi', narration: 'İtilaf donanması mayın tarama ve boğaz geçiş hazırlıklarını sürdürdü.', importance: 'minor' },
  { startIso: '1915-03-09', title: '18 Mart Deniz Muharebesi', narration: "18 Mart'ta büyük deniz saldırısı Nusret mayınları ve sahil topçusuyla durduruldu.", importance: 'major' },
  { startIso: '1915-03-16', title: 'Deniz Harekâtı Çöküşü', narration: "18 Mart yenilgisi sonrası İtilaf denizden zorlama planını geri çekti.", importance: 'major' },
  { startIso: '1915-03-23', title: "5. Ordu'nun Kuruluşu", narration: "23 Mart'ta 5. Ordu kuruldu; Liman von Sanders komutayı devraldı.", importance: 'major' },
  { startIso: '1915-03-30', title: 'Bigalı Konuşlanması', narration: "Mart sonu - Nisan başında savunma güçlendirildi; Mustafa Kemal'in 19. Tümeni Bigalı'ya yerleşti.", importance: 'major' },
  { startIso: '1915-04-06', title: 'Çıkarma Öncesi Son Hazırlık', narration: 'İtilaf kuvvetleri çıkarma öncesi lojistik ve mevzi keşiflerini yoğunlaştırdı.', importance: 'minor' },
  { startIso: '1915-04-13', title: 'İhtiyat Düzeni', narration: "15 Nisan civarında Osmanlı ihtiyat birlikleri kritik karşı taarruz noktalarına kaydırıldı.", importance: 'major' },
  { startIso: '1915-04-20', title: 'Büyük Kara Çıkarması', narration: "22-25 Nisan sürecinde Arıburnu ve Seddülbahir çıkarmaları başladı; karşı taarruzlarla ilerleme durduruldu.", importance: 'major' },
  { startIso: '1915-04-27', title: 'Köprübaşı Mücadelesi', narration: "Nisan sonu - Mayıs başında kıyı köprübaşları için yoğun ve kayıplı çarpışmalar yaşandı.", importance: 'major' },
  { startIso: '1915-05-04', title: 'Mayıs Başlangıcı', narration: 'Sürekli temas ve mevzi baskısı altında cephe çizgileri dar alanda sabitlendi.', importance: 'minor' },
  { startIso: '1915-05-11', title: 'Yıpratma Çatışmaları', narration: 'Karşılıklı baskınlar ve topçu ateşiyle siper savaşı sertleşti.', importance: 'minor' },
  { startIso: '1915-05-18', title: '19 Mayıs Taarruzu', narration: "19 Mayıs'ta Osmanlı genel taarruzu ağır kayıplarla sonuçlandı; cephe kırılmadı.", importance: 'major' },
  { startIso: '1915-05-25', title: 'Siper Konsolidasyonu', narration: 'Mayıs sonunda cephe hattı konsolide edildi; yerel çatışmalar sürdü.', importance: 'minor' },
  { startIso: '1915-06-01', title: 'Haziran Taarruzu', narration: "1 Haziran'da başlayan Osmanlı baskısı cephe boyunca karşılıklı kayıpları artırdı.", importance: 'major' },
  { startIso: '1915-06-08', title: 'Sürekli Çatışma', narration: 'Haziran ortasında siper hatlarında aralıksız muharebe düzeni devam etti.', importance: 'minor' },
  { startIso: '1915-06-15', title: 'Güney Grup Hücumları', narration: '21-22 Haziran hattında İngiliz-Fransız taarruzu kritik sırtlara yöneldi.', importance: 'major' },
  { startIso: '1915-06-22', title: 'Zığındere Muharebeleri', narration: 'Haziran sonu başlayan Zığındere çarpışmaları kampanyanın en kanlı evrelerinden biri oldu.', importance: 'major' },
  { startIso: '1915-06-29', title: 'Zığındere Devamı', narration: "28 Haziran - 5 Temmuz arasında çok yüksek kayıpla sonuçlanan muharebeler sürdü.", importance: 'major' },
  { startIso: '1915-07-06', title: 'Temmuz Başlangıcı', narration: 'Zığındere sonrası hatlar korunurken düşük tempolu temas devam etti.', importance: 'minor' },
  { startIso: '1915-07-13', title: '13 Temmuz Taarruzu', narration: "13 Temmuz'da Güney Grup'ta İngiliz saldırısı Osmanlı topçusuyla yavaşlatıldı.", importance: 'major' },
  { startIso: '1915-07-20', title: 'Siper Savaşı', narration: 'Temmuz sonuna doğru cephede yıpratma savaşı belirginleşti.', importance: 'minor' },
  { startIso: '1915-07-27', title: 'Ağustos Öncesi Hazırlık', narration: 'Her iki taraf da yeni harekât dalgası için birlik ve ikmal hazırlıklarını artırdı.', importance: 'minor' },
  { startIso: '1915-08-03', title: 'Anafartalar Çıkarması', narration: "6-7 Ağustos'ta Anafartalar çıkarması gerçekleşti; Osmanlı savunması ilerlemeyi frenledi.", importance: 'major' },
  { startIso: '1915-08-10', title: 'Ağustos Çarpışmaları', narration: 'Ağustos ortasında kesintisiz temas ve karşı taarruz döngüsü sürdü.', importance: 'major' },
  { startIso: '1915-08-17', title: 'Conkbayırı Muharebesi', narration: "21 Ağustos'ta Conkbayırı hattı kritik bir muharebeye sahne oldu.", importance: 'major' },
  { startIso: '1915-08-24', title: 'Son Taarruzlar', narration: 'Ağustos sonundaki son taarruz denemeleri kalıcı ilerleme sağlayamadı.', importance: 'minor' },
  { startIso: '1915-08-31', title: 'Eylül Eşiği', narration: 'Ağustos sonu - Eylül başında cepheler yeniden durağan siper düzenine döndü.', importance: 'minor' },
  { startIso: '1915-09-07', title: 'Duraklama Dönemi I', narration: 'Eylül haftalarında yıpranmış taraflar sınırlı temasla siperlerde kaldı.', importance: 'minor' },
  { startIso: '1915-09-14', title: 'Duraklama Dönemi II', narration: 'Cephede küçük baskınlar dışında belirleyici hareket yaşanmadı.', importance: 'minor' },
  { startIso: '1915-09-21', title: 'Duraklama Dönemi III', narration: 'Siper savaşı düşük yoğunlukta devam etti.', importance: 'minor' },
  { startIso: '1915-09-28', title: 'Duraklama Dönemi IV', narration: 'Eylül sonuna doğru ikmal ve savunma düzeni ön plana çıktı.', importance: 'minor' },
  { startIso: '1915-10-05', title: 'Ekim Başlangıcı', narration: 'Ekim başında cephenin genel karakteri durağan siper harbine dönüştü.', importance: 'minor' },
  { startIso: '1915-10-12', title: 'Tahliye Tartışmaları', narration: "Ekim ortasında İtilaf komutası tahliye seçeneklerini ciddi biçimde masaya aldı.", importance: 'major' },
  { startIso: '1915-10-19', title: 'Hava ve Yıpranma', narration: 'Kötüleşen hava şartları cephede lojistik baskıyı artırdı.', importance: 'minor' },
  { startIso: '1915-10-26', title: 'Kasım Öncesi Bekleyiş', narration: 'Ekim sonunda stratejik belirsizlik altında savunma düzenleri korundu.', importance: 'minor' },
  { startIso: '1915-11-02', title: 'Tahliye Önerisi', narration: "3 Kasım'da İngiliz Konseyi tahliye önerisini gündeme aldı.", importance: 'major' },
  { startIso: '1915-11-09', title: 'Kitchener İncelemesi', narration: "Kasım başında Lord Kitchener bölgeyi yerinde inceledi.", importance: 'major' },
  { startIso: '1915-11-16', title: 'Tahliye Onayı', narration: "15 Kasım kararının etkisiyle cephelerin tahliyesi fiilen onaylanmış sürece girdi.", importance: 'major' },
  { startIso: '1915-11-23', title: 'Tahliye Hazırlıkları', narration: 'Kasım sonunda tahliye lojistiği ve geri çekilme adımları planlandı.', importance: 'minor' },
  { startIso: '1915-11-30', title: 'Aralık Öncesi Sessizlik', narration: 'Tahliye planını gizlemek için cephede sınırlı hareketlilik korundu.', importance: 'minor' },
  { startIso: '1915-12-07', title: 'Tahliye Kararı', narration: "7 Aralık'ta Arıburnu ve Anafartalar için tahliye kararı açık uygulama aşamasına geçti.", importance: 'major' },
  { startIso: '1915-12-14', title: 'Tahliye Başlangıcı', narration: "13-19 Aralık döneminde tahliye başlatıldı; Osmanlı tarafı başlangıçta bu süreci fark etmedi.", importance: 'major' },
  { startIso: '1915-12-21', title: 'Arıburnu Tahliyesi', narration: "19-20 Aralıkta Arıburnu tahliyesi tamamlandı; Seddülbahir son aşamaya kaldı.", importance: 'major' },
  { startIso: '1915-12-28', title: 'Seddülbahir Son Hazırlık', narration: 'Aralık sonu - Ocak başında son geri çekilme adımları planlandı.', importance: 'minor' },
  { startIso: '1916-01-04', title: 'Son Tahliye ve Kapanış', narration: "8-9 Ocak 1916'da son tahliye tamamlandı; Gelibolu seferi kapandı.", importance: 'major' }
];

const titleMap = {
  '1 Dodging the Issue': 'Savaş Öncesi Hazırlıklar',
  '2 Navy in Action': 'Donanmanın Girişi',
  '3 Gathering of the Forces': 'Kuvvetlerin Toplanması',
  '4 Plans: Countdown to Disaster': 'Planlar: Felaketin Eşiği',
  '5 25 April: Landings at Anzac': '25 Nisan: ANZAC Çıkarması',
  '6 25 April: Landings at Helles': '25 Nisan: Helles Çıkarması',
  '7 25 April: Drama at V Beach': '25 Nisan: V Kumsalı Gerginliği',
  '8 25 April: Kum Kale and Diversions': '25 Nisan: Kumkale ve Yönlendirme',
  '9 Anzac: The Holding Pen': 'ANZAC: Mevziyi Sabitleme',
  '10 Helles: The Real Fight for Gallipoli': 'Helles: Sahadaki Çatışma',
  '11 Helles: Writing on the Wall': 'Helles: Cephe Gerçekleşmeleri',
  '12 New Beginnings: Hamilton’s Plans': 'Yeni Adımlar: Hamilton Planları',
  '13 August: Helles Sacrifice': 'Ağustos: Helles Fedakârlığı',
  '14 August: Anzac, Diversions and Breakout': 'Ağustos: ANZAC Saldırısı ve Kırılma',
  '15 August: Suvla Bay Landings': 'Ağustos: Suvla Körfezi Çıkarması',
  '16 21 August 1915: A Useless Gesture': '21 Ağustos: Etkisiz Bir Hamle',
  '17 Should They Stay or Should They Go?': 'Kalsın mı, Gitsin mi?',
  '18 The Beginning of the End': 'Sonun Başlangıcı',
  '19 Last Rites at Helles': 'Helles’te Son Veda',
  '20 Myths and Legends': 'Efsaneler ve Gerçekler'
};

function parseDate(title) {
  const trimmed = title.replace(/^\d+\s*/, '');
  const explicit = trimmed.match(/(\d{1,2})\s+(April|August)/i);
  if (explicit) {
    const day = explicit[1];
    const month = explicit[2].toLowerCase() === 'april' ? 'Nisan' : 'Ağustos';
    return `${day} ${month} 1915`;
  }
  if (/\bApril\b/i.test(trimmed)) return 'Nisan 1915';
  if (/\bAugust\b/i.test(trimmed)) return 'Ağustos 1915';
  return '1915';
}

function normalizeMonthKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function parseTurkishDateToISO(dateStr, order) {
  const input = String(dateStr || '').trim();
  if (!input) return `1915-01-${String(Math.min(28, order + 1)).padStart(2, '0')}`;

  const normalized = input.replace(/[–—]/g, '-').replace(/\s+/g, ' ');

  // 6-15 Ağustos 1915 -> 1915-08-06
  const rangedDay = normalized.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (rangedDay) {
    const month = MONTH_TR_TO_NUM[normalizeMonthKey(rangedDay[3])] || 1;
    const day = Math.max(1, Math.min(31, Number(rangedDay[1])));
    return `${rangedDay[4]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 25 Nisan 1915
  const full = normalized.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (full) {
    const month = MONTH_TR_TO_NUM[normalizeMonthKey(full[2])] || 1;
    const day = Math.max(1, Math.min(31, Number(full[1])));
    return `${full[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Şubat-Nisan 1915 -> 1915-02-01
  const rangedMonth = normalized.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*-\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (rangedMonth) {
    const month = MONTH_TR_TO_NUM[normalizeMonthKey(rangedMonth[1])] || 1;
    return `${rangedMonth[3]}-${String(month).padStart(2, '0')}-01`;
  }

  // Nisan 1915 -> 1915-04-15
  const monthYear = normalized.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (monthYear) {
    const month = MONTH_TR_TO_NUM[normalizeMonthKey(monthYear[1])] || 1;
    return `${monthYear[2]}-${String(month).padStart(2, '0')}-15`;
  }

  // 1915 -> spread to keep stable order
  const yearOnly = normalized.match(/\b(19\d{2})\b/);
  if (yearOnly) {
    const month = Math.max(1, Math.min(12, 1 + (order % 12)));
    return `${yearOnly[1]}-${String(month).padStart(2, '0')}-01`;
  }

  return `1915-${String(Math.max(1, Math.min(12, 1 + (order % 12)))).padStart(2, '0')}-01`;
}

function toDate(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map((n) => Number(n));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatDateTR(dateObj) {
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = MONTH_NUM_TO_TR[dateObj.getUTCMonth()] || 'Ocak';
  const year = dateObj.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function formatISO(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

function formatDateFromISO(isoDate) {
  return formatDateTR(toDate(isoDate));
}

function dayDiffISO(aIso, bIso) {
  return Math.round((toDate(bIso).getTime() - toDate(aIso).getTime()) / DAY_MS);
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function hashSeed(str) {
  let h = 0;
  for (const ch of String(str || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function pickBlendedValue(prev, next, ratio, seed) {
  if (!prev && !next) return undefined;
  if (!prev) return next;
  if (!next) return prev;
  if (prev === next) return prev;
  const threshold = ((seed % 100) / 100);
  return ratio >= threshold ? next : prev;
}

function blendMaps(prevMap, nextMap, ratio, salt = 0) {
  const prev = prevMap && typeof prevMap === 'object' ? prevMap : {};
  const next = nextMap && typeof nextMap === 'object' ? nextMap : {};
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  const out = {};
  keys.forEach((key) => {
    const val = pickBlendedValue(prev[key], next[key], ratio, hashSeed(`${key}:${salt}`));
    if (val) out[key] = String(val);
  });
  return Object.keys(out).length ? out : undefined;
}

function mergeLocationIds(prevIds, nextIds) {
  const merged = [...new Set([...(prevIds || []), ...(nextIds || [])])];
  return merged.length ? merged : undefined;
}

function buildBridgeEvent(prev, next, dateObj, ratio, seq) {
  const trDate = formatDateTR(dateObj);
  const title = `${prev.title} • Cephe Günü`;
  return {
    id: `event-day-${String(seq).padStart(4, '0')}`,
    src: prev.src,
    title,
    titleEn: `${prev.titleEn || prev.title} Daily Continuation`,
    date: trDate,
    isoDate: formatISO(dateObj),
    importance: 'minor',
    narration: `${trDate} tarihinde cephe boyunca temas sürdü; birlikler ${prev.title} ile ${next.title} arasındaki geçiş düzenine göre yeniden konumlandı.`,
    locationIds: mergeLocationIds(prev.locationIds, next.locationIds),
    locationByFaction: blendMaps(prev.locationByFaction, next.locationByFaction, ratio, seq + 11),
    locationByUnit: blendMaps(prev.locationByUnit, next.locationByUnit, ratio, seq + 29),
    statusByFaction: blendMaps(prev.statusByFaction, next.statusByFaction, ratio, seq + 43),
    objectiveByFaction: blendMaps(prev.objectiveByFaction, next.objectiveByFaction, ratio, seq + 61),
    outcomeByFaction: blendMaps(prev.outcomeByFaction, next.outcomeByFaction, ratio, seq + 79)
  };
}

function expandToDailyEvents(events) {
  if (!Array.isArray(events) || !events.length) return [];
  const sorted = [...events]
    .map((ev, idx) => ({ ...ev, _idx: idx }))
    .sort((a, b) => (a.isoDate < b.isoDate ? -1 : a.isoDate > b.isoDate ? 1 : a._idx - b._idx));

  const out = [];
  let seq = 1;
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    out.push({ ...current, id: `event-${String(seq++).padStart(4, '0')}` });
    const next = sorted[i + 1];
    if (!next) continue;
    const d1 = toDate(current.isoDate);
    const d2 = toDate(next.isoDate);
    const gap = daysBetween(d1, d2);
    if (gap <= 1) continue;
    for (let day = 1; day < gap; day++) {
      const dateObj = new Date(d1.getTime() + day * DAY_MS);
      const ratio = day / gap;
      out.push(buildBridgeEvent(current, next, dateObj, ratio, seq++));
    }
  }

  return out
    .sort((a, b) => (a.isoDate < b.isoDate ? -1 : a.isoDate > b.isoDate ? 1 : a.id.localeCompare(b.id)))
    .map((ev, idx) => {
      const normalized = { ...ev, id: `event-${String(idx + 1).padStart(4, '0')}` };
      delete normalized._idx;
      return normalized;
    });
}

function formatISOShortRange(startDate, endDate) {
  const startDay = String(startDate.getUTCDate()).padStart(2, '0');
  const endDay = String(endDate.getUTCDate()).padStart(2, '0');
  const startMonth = MONTH_NUM_TO_TR[startDate.getUTCMonth()];
  const endMonth = MONTH_NUM_TO_TR[endDate.getUTCMonth()];
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay}-${endDay} ${startMonth} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

function isIsoInCampaign(iso) {
  return CAMPAIGN_START_ISO <= iso && iso <= CAMPAIGN_END_ISO;
}

function buildWeeklyGuide() {
  const start = toDate(CAMPAIGN_START_ISO);
  const end = toDate(CAMPAIGN_END_ISO);
  const expectedStarts = [];
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 7 * DAY_MS)) {
    expectedStarts.push(formatISO(cursor));
  }

  if (CANONICAL_WEEKLY_GUIDE.length !== expectedStarts.length) {
    throw new Error(`Kanonik haftalık akış sayısı hatalı: ${CANONICAL_WEEKLY_GUIDE.length} (beklenen ${expectedStarts.length})`);
  }

  const canonicalByStart = CANONICAL_WEEKLY_GUIDE.reduce((acc, item) => {
    acc[item.startIso] = item;
    return acc;
  }, {});
  const expectedSet = new Set(expectedStarts);
  const missing = expectedStarts.filter((iso) => !canonicalByStart[iso]);
  const extra = CANONICAL_WEEKLY_GUIDE.map((item) => item.startIso).filter((iso) => !expectedSet.has(iso));
  if (missing.length || extra.length) {
    throw new Error(`Kanonik haftalık tarihler tutarsız. Eksik: ${missing.join(', ') || '-'} | Fazla: ${extra.join(', ') || '-'}`);
  }

  return expectedStarts.map((startIso, idx) => {
    const weekNo = idx + 1;
    const weekStart = toDate(startIso);
    const weekEnd = new Date(Math.min(end.getTime(), weekStart.getTime() + 6 * DAY_MS));
    const canonical = canonicalByStart[startIso];
    return {
      id: `hafta-${String(weekNo).padStart(3, '0')}`,
      weekNo,
      startIso,
      endIso: formatISO(weekEnd),
      label: formatISOShortRange(weekStart, weekEnd),
      title: canonical.title,
      narration: canonical.narration,
      importance: canonical.importance === 'major' ? 'major' : 'minor'
    };
  });
}

function findWeekForIso(weeklyGuide, iso) {
  return weeklyGuide.find((w) => w.startIso <= iso && iso <= w.endIso) || weeklyGuide[weeklyGuide.length - 1];
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function trimTrailingPunctuation(value) {
  return normalizeText(value).replace(/[.;,:]+$/g, '');
}

function extractSentenceAt(text, index) {
  const input = String(text || '');
  if (!input.trim()) return '';
  const punct = ['.', ';', '!', '?'];
  let start = -1;
  punct.forEach((mark) => {
    const pos = input.lastIndexOf(mark, index);
    if (pos > start) start = pos;
  });
  start = start === -1 ? 0 : start + 1;

  let end = input.length;
  punct.forEach((mark) => {
    const pos = input.indexOf(mark, index);
    if (pos !== -1 && pos < end) end = pos;
  });

  return normalizeText(input.slice(start, end));
}

function resolveWeekAnchorIso(day, monthName, explicitYear, week) {
  const month = MONTH_TR_TO_NUM[normalizeMonthKey(monthName)] || 0;
  if (!month) return null;

  const dayNum = Math.max(1, Math.min(31, Number(day)));
  const weekStart = toDate(week.startIso);
  const weekEnd = toDate(week.endIso);
  const years = explicitYear
    ? [Number(explicitYear)]
    : [...new Set([weekStart.getUTCFullYear(), weekEnd.getUTCFullYear()])];

  for (const year of years) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (week.startIso <= iso && iso <= week.endIso && isIsoInCampaign(iso)) return iso;
  }

  return null;
}

function pushWeeklyAnchor(index, iso, kind, snippet, raw, week) {
  if (!iso) return;
  if (!index[iso]) {
    index[iso] = {
      snippets: [],
      titleSnippets: [],
      rawMentions: [],
      weekStartIso: week.startIso,
      weekTitle: week.title
    };
  }
  const bucket = kind === 'title' ? index[iso].titleSnippets : index[iso].snippets;
  const cleanSnippet = trimTrailingPunctuation(snippet);
  const cleanRaw = normalizeText(raw);
  if (cleanSnippet && !bucket.includes(cleanSnippet)) bucket.push(cleanSnippet);
  if (cleanRaw && !index[iso].rawMentions.includes(cleanRaw)) index[iso].rawMentions.push(cleanRaw);
}

function collectAnchorsFromText(text, week, kind, index) {
  const input = String(text || '');
  if (!input.trim()) return;

  const consumed = [];
  const rangeRe = new RegExp(`(\\d{1,2})\\s*-\\s*(\\d{1,2})\\s+(${TR_MONTH_PATTERN})(?:['’]?[A-Za-zÇĞİÖŞÜçğıöşü]+)?(?:\\s+(19\\d{2}))?`, 'gi');
  for (const match of input.matchAll(rangeRe)) {
    const startIdx = match.index || 0;
    consumed.push([startIdx, startIdx + match[0].length]);
    const dayStart = Math.max(1, Math.min(31, Number(match[1])));
    const dayEnd = Math.max(dayStart, Math.min(31, Number(match[2])));
    const snippet = extractSentenceAt(input, startIdx) || input;
    for (let day = dayStart; day <= dayEnd; day += 1) {
      const iso = resolveWeekAnchorIso(day, match[3], match[4], week);
      pushWeeklyAnchor(index, iso, kind, snippet, match[0], week);
    }
  }

  const singleRe = new RegExp(`(\\d{1,2})\\s+(${TR_MONTH_PATTERN})(?:['’]?[A-Za-zÇĞİÖŞÜçğıöşü]+)?(?:\\s+(19\\d{2}))?`, 'gi');
  for (const match of input.matchAll(singleRe)) {
    const startIdx = match.index || 0;
    if (consumed.some(([from, to]) => from <= startIdx && startIdx < to)) continue;
    const iso = resolveWeekAnchorIso(match[1], match[2], match[3], week);
    const snippet = extractSentenceAt(input, startIdx) || input;
    pushWeeklyAnchor(index, iso, kind, snippet, match[0], week);
  }
}

function buildWeeklyAnchorIndex(weeklyGuide) {
  const index = {};
  weeklyGuide.forEach((week) => {
    collectAnchorsFromText(week.narration, week, 'narration', index);
    collectAnchorsFromText(week.title, week, 'title', index);
  });
  return index;
}

function mergeMajorEventsOfDay(events) {
  if (!events.length) return null;
  const first = events[0];
  const merged = { ...first };
  merged.title = events.length === 1 ? first.title : `${first.title} +${events.length - 1} olay`;
  merged.narration = events.map((e) => e.narration).filter(Boolean).join(' ');
  const locationIds = [...new Set(events.flatMap((e) => e.locationIds || []))];
  merged.locationIds = locationIds.length ? locationIds : undefined;
  return merged;
}

function extractEpubDateMentions(rawText) {
  const text = String(rawText || '').replace(/\s+/g, ' ');
  const out = [];
  const seen = new Set();
  const monthPattern = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const reDayMonth = new RegExp(`\\b([0-3]?\\d)\\s+(${monthPattern})\\s+(191[4-6])\\b`, 'gi');
  const reMonthDay = new RegExp(`\\b(${monthPattern})\\s+([0-3]?\\d),?\\s+(191[4-6])\\b`, 'gi');

  for (const m of text.matchAll(reDayMonth)) {
    const day = String(Math.max(1, Math.min(31, Number(m[1])))).padStart(2, '0');
    const month = String(MONTH_EN_TO_NUM[String(m[2] || '').toLowerCase()] || 1).padStart(2, '0');
    const iso = `${m[3]}-${month}-${day}`;
    if (!isIsoInCampaign(iso)) continue;
    const key = `${iso}|${m[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ iso, raw: m[0] });
  }

  for (const m of text.matchAll(reMonthDay)) {
    const day = String(Math.max(1, Math.min(31, Number(m[2])))).padStart(2, '0');
    const month = String(MONTH_EN_TO_NUM[String(m[1] || '').toLowerCase()] || 1).padStart(2, '0');
    const iso = `${m[3]}-${month}-${day}`;
    if (!isIsoInCampaign(iso)) continue;
    const key = `${iso}|${m[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ iso, raw: m[0] });
  }

  return out;
}

function buildEpubDateIndex(chapterEntries) {
  const byIso = {};
  chapterEntries.forEach((chapter) => {
    const html = execSync(`unzip -p "${epubPath}" "${chapter.src}"`).toString('utf8');
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;|&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const mentions = extractEpubDateMentions(text);
    mentions.forEach((hit) => {
      if (!byIso[hit.iso]) byIso[hit.iso] = [];
      byIso[hit.iso].push({
        chapterTitle: chapter.title,
        chapterTitleEn: chapter.titleEn,
        rawDate: hit.raw,
        src: chapter.src
      });
    });
  });
  return byIso;
}

function buildEpubNarration(iso, epubEvents, week) {
  const dateTR = formatDateFromISO(iso);
  const titles = [...new Set(epubEvents.map((e) => e.chapterTitle).filter(Boolean))];
  if (!titles.length) {
    return `${dateTR} günü EPUB kaydında ${week.title} haftasını destekleyen açık tarihli bir not bulundu.`;
  }
  if (titles.length === 1) {
    return `${dateTR} günü EPUB kaydı ${titles[0]} safhasına ait açık tarihli bir kayıt içeriyor.`;
  }
  return `${dateTR} günü EPUB kaydında ${titles.slice(0, 3).join(', ')} safhalarına bağlanan ${epubEvents.length} açık tarihli kayıt bulundu.`;
}

function buildAnchoredNarration(iso, week, anchor) {
  const dateTR = formatDateFromISO(iso);
  const detail = trimTrailingPunctuation((anchor && anchor.snippets && anchor.snippets[0]) || (anchor && anchor.titleSnippets && anchor.titleSnippets[0]) || week.narration || week.title);
  return `${dateTR} günü haftalık kronoloji bu tarihe açıkça bağlanır: ${detail}.`;
}

function buildWeeklyContextDetail(week, anchor) {
  return trimTrailingPunctuation((anchor && anchor.snippets && anchor.snippets[0]) || (anchor && anchor.titleSnippets && anchor.titleSnippets[0]) || week.narration || week.title);
}

function buildOfficialExplicitNarration(text) {
  return trimTrailingPunctuation(text);
}

function findOperationWindowByIso(iso) {
  return OFFICIAL_OPERATION_WINDOWS.find((w) => w.startIso <= iso && iso <= w.endIso) || null;
}

function buildEvidenceLinks(evidenceCodes) {
  return [...new Set((evidenceCodes || [])
    .map((code) => OFFICIAL_SOURCE_REGISTRY[code] && OFFICIAL_SOURCE_REGISTRY[code].url)
    .filter(Boolean))];
}

function buildDailyGuidedEvents(majorPhases, weeklyGuide, epubDateIndex, weeklyAnchorIndex) {
  const start = toDate(CAMPAIGN_START_ISO);
  const end = toDate(CAMPAIGN_END_ISO);
  const sortedMajors = [...majorPhases]
    .sort((a, b) => (a.isoDate < b.isoDate ? -1 : a.isoDate > b.isoDate ? 1 : a.id.localeCompare(b.id)));
  const majorByIso = {};
  sortedMajors.forEach((m) => {
    if (!majorByIso[m.isoDate]) majorByIso[m.isoDate] = [];
    majorByIso[m.isoDate].push(m);
  });

  const mergedMajors = Object.keys(majorByIso)
    .sort()
    .map((iso) => ({ isoDate: iso, event: mergeMajorEventsOfDay(majorByIso[iso]) }))
    .filter((x) => x.event);

  const daily = [];
  let majorPtr = 0;
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const iso = formatISO(cursor);
    const dayMajor = majorByIso[iso] ? mergeMajorEventsOfDay(majorByIso[iso]) : null;
    const dayEpub = Array.isArray(epubDateIndex[iso]) ? epubDateIndex[iso] : [];
    const dayAnchor = weeklyAnchorIndex[iso];
    const week = findWeekForIso(weeklyGuide, iso);

    while (majorPtr + 1 < mergedMajors.length && mergedMajors[majorPtr + 1].isoDate <= iso) majorPtr += 1;
    const prev = mergedMajors[majorPtr] ? mergedMajors[majorPtr].event : dayMajor || sortedMajors[0];
    const next = mergedMajors[majorPtr + 1] ? mergedMajors[majorPtr + 1].event : prev;
    const span = Math.max(1, dayDiffISO(prev.isoDate || iso, next.isoDate || iso));
    const ratio = Math.max(0, Math.min(1, dayDiffISO(prev.isoDate || iso, iso) / span));

    const structure = dayMajor || {
      src: prev && prev.src,
      titleEn: prev && prev.titleEn,
      locationIds: mergeLocationIds(prev && prev.locationIds, next && next.locationIds),
      locationByFaction: blendMaps(prev && prev.locationByFaction, next && next.locationByFaction, ratio, cursor.getUTCDate() + 11),
      locationByUnit: blendMaps(prev && prev.locationByUnit, next && next.locationByUnit, ratio, cursor.getUTCDate() + 29),
      statusByFaction: blendMaps(prev && prev.statusByFaction, next && next.statusByFaction, ratio, cursor.getUTCDate() + 43),
      objectiveByFaction: blendMaps(prev && prev.objectiveByFaction, next && next.objectiveByFaction, ratio, cursor.getUTCDate() + 61),
      outcomeByFaction: blendMaps(prev && prev.outcomeByFaction, next && next.outcomeByFaction, ratio, cursor.getUTCDate() + 79)
    };

    const dayOfficial = OFFICIAL_DAILY_EVENTS[iso];
    const opWindow = findOperationWindowByIso(iso);
    let type = 'anchored';
    let source = dayOfficial ? 'internet' : 'weekly-guide';
    let title = dayOfficial ? `${week.title} · Resmi Günlük Kayıt` : `${week.title} · Haftalık Bağ`;
    let importance = (week.importance === 'major' || dayOfficial) ? 'major' : 'minor';
    let explicitDetail = dayOfficial
      ? buildOfficialExplicitNarration(dayOfficial)
      : (opWindow ? opWindow.detail : week.narration);
    const stateDetail = opWindow ? opWindow.detail : week.narration;
    let weeklyDetail = buildWeeklyContextDetail(week, dayAnchor || { snippets: [week.narration], titleSnippets: [week.title] });
    let narration = `Açık Olay: ${explicitDetail} | Operasyon Durumu: ${stateDetail} | Haftalık Bağlam: ${weeklyDetail}`;
    const evidenceCodes = new Set(['WEEKLY_PLAN_USER']);
    if (opWindow && Array.isArray(opWindow.sourceCodes)) opWindow.sourceCodes.forEach((c) => evidenceCodes.add(c));

    if (dayEpub.length) {
      type = 'explicit';
      source = 'epub';
      title = `${week.title} · EPUB Kaydı`;
      const epubExplicit = buildEpubNarration(iso, dayEpub, week);
      explicitDetail = epubExplicit;
      narration = `Açık Olay: ${explicitDetail} | Operasyon Durumu: ${stateDetail} | Haftalık Bağlam: ${weeklyDetail}`;
      evidenceCodes.add('EPUB_PARSE');
      importance = 'major';
    } else if (dayOfficial) {
      type = 'explicit';
      source = 'internet';
      title = `${week.title} · Resmi Günlük Kayıt`;
      importance = 'major';
      evidenceCodes.add('DVA_GALLIPOLI_TIMELINE');
    } else if (dayAnchor) {
      source = 'weekly-guide';
      title = `${week.title} · Haftalık Bağ`;
      weeklyDetail = buildWeeklyContextDetail(week, dayAnchor);
      narration = `Açık Olay: ${explicitDetail} | Operasyon Durumu: ${stateDetail} | Haftalık Bağlam: ${weeklyDetail}`;
      importance = week.importance === 'major' ? 'major' : 'minor';
    }

    const evidenceCodeList = [...evidenceCodes];
    const evidenceLinks = buildEvidenceLinks(evidenceCodeList);

    daily.push({
      id: `event-${String(daily.length + 1).padStart(4, '0')}`,
      src: (dayEpub[0] && dayEpub[0].src) || structure.src,
      title,
      titleEn: (dayEpub[0] && dayEpub[0].chapterTitleEn) || structure.titleEn,
      narration,
      date: formatDateFromISO(iso),
      type,
      dayType: type,
      source,
      importance,
      detailParts: {
        explicit: explicitDetail,
        state: stateDetail,
        weekly: weeklyDetail
      },
      evidenceCodes: evidenceCodeList,
      evidenceLinks,
      locationIds: structure.locationIds,
      locationByFaction: structure.locationByFaction,
      locationByUnit: structure.locationByUnit,
      statusByFaction: structure.statusByFaction,
      objectiveByFaction: structure.objectiveByFaction,
      outcomeByFaction: structure.outcomeByFaction,
      isoStart: iso
    });
  }
  return daily;
}

const PHASE_METADATA = {
  1: {
    date: '1915',
    locationIds: ['gelibolu'],
    statusByFaction: { ottoman: 'hazır', british: 'hazır', anzac: 'hazır', french: 'hazır' },
    objectiveByFaction: {
      ottoman: 'Çanakkale savunması için başlangıç sevkini tamamla.',
      british: 'Boğaz geçişi için deniz gücü hazırlığı yap.',
      anzac: 'Sefer hazırlıklarını hızlandır.',
      french: 'Ortak harekât planlarına destek ver.'
    },
    outcomeByFaction: {
      ottoman: 'Kıyı hattında ilk savunma düzeni oluştu.',
      british: 'Mühimmat ve personel birikimi tamamlandı.',
      anzac: 'Sefer hazırlıkları hızlandı.',
      french: 'Planlar dağıtıldı.'
    }
  },
  2: {
    date: '18 Mart 1915',
    locationIds: ['bogaz', 'canakkale'],
    locationByFaction: { ottoman: 'bogaz', british: 'bogaz', french: 'bogaz', anzac: 'bogaz' },
    statusByFaction: { ottoman: 'savunma', british: 'taarruz', french: 'taarruz', anzac: 'hazır' },
    objectiveByFaction: {
      ottoman: 'Boğazı kapat ve mayın hattını koru.',
      british: 'Boğazı zorla geçmeyi dene.',
      french: 'Müttefik deniz unsurlarını destekle.',
      anzac: 'Hazır bekleme rolüne geç.'
    },
    outcomeByFaction: {
      ottoman: '18 Mart deniz harekâtı durduruldu.',
      british: 'Boğazın kapalı olduğu teyit edildi.',
      french: 'Takviye hattı yeniden düzenlendi.',
      anzac: 'Hazır bekleme rolü korundu.'
    },
    narration: '18 Mart deniz taarruzu başarısız oldu; boğaz geçişi Osmanlı mayınları ve sahil bataryalarıyla engellendi.'
  },
  3: {
    date: 'Mart 1915',
    locationIds: ['canakkale', 'gelibolu'],
    statusByFaction: { ottoman: 'savunma', british: 'hazır', french: 'hazır', anzac: 'hazır' },
    objectiveByFaction: {
      ottoman: 'Bölge kuvvetlerini toparla ve yedek planını hazırla.',
      british: 'Ertesi aşama için kara çıkarmaya odaklan.',
      french: 'Lojistik hazırlığı güçlendir.',
      anzac: 'Taarruz için birlikleri yakınlaştır.'
    },
    outcomeByFaction: {
      ottoman: 'Savunma planı netleşti.',
      british: 'Çıkarma için personel dağılımı hazırlandı.',
      french: 'Sefer kuvvetleri yerleşmeye başladı.',
      anzac: 'Ön hat için komuta hattı kuruldu.'
    }
  },
  4: {
    date: 'Şubat–Nisan 1915',
    locationIds: ['canakkale', 'bogaz'],
    statusByFaction: { ottoman: 'savunma', british: 'taarruz', french: 'taarruz', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'Çıkarma bölgeleri için savunma ağını tamamla.',
      british: '25 Nisan ortak çıkarmaya odaklan.',
      french: 'Kumkale yan darbe planına destek ver.',
      anzac: 'ANZAC geçişini hızlandır.'
    },
    outcomeByFaction: {
      ottoman: 'Kritik geçiş noktalarına tahkimat tamamlandı.',
      british: 'Harekât emirleri paylaşıldı.',
      french: 'Maliyetli takviye hattı düzenlendi.',
      anzac: 'Sefer planları netleşti.'
    }
  },
  5: {
    date: '25 Nisan 1915',
    locationIds: ['ariburnu'],
    locationByFaction: { ottoman: 'bigali', british: 'seddulbahir', french: 'seddulbahir', anzac: 'ariburnu' },
    locationByUnit: {
      '5-ordu': 'bigali',
      '3-kolordu': 'bigali',
      '19-tumen': 'bigali',
      '57-alay': 'ariburnu',
      '27-alay': 'ariburnu',
      'anzac-1div': 'ariburnu',
      'nz-inf': 'ariburnu',
      '29-div': 'seddulbahir',
      'hms-queen-elizabeth': 'bogaz',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'bogaz',
      'fr-corps': 'seddulbahir',
      'bouvet': 'bogaz',
      'suffren': 'bogaz',
      '9-tumen': 'kilitbahir'
    },
    statusByFaction: { ottoman: 'hazır', british: 'taarruz', french: 'taarruz', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'ANZAC çıkarma hattını kuzeyden karşıla.',
      british: 'Seddülbahir çıkarmasını sürdürülebilir halde tut.',
      french: 'Dış destek hattını hazırla.',
      anzac: 'Arıburnu’nda inişi tamamla.'
    },
    outcomeByFaction: {
      ottoman: 'Karşı taarruz hazırlıkları hızlandı.',
      british: 'İlk deneme planların kaybı yükseldi.',
      french: 'Sahada birlik düzeni kuruldu.',
      anzac: 'Çıkış sonrası yayılma başladı.'
    }
  },
  6: {
    date: '25 Nisan 1915',
    locationIds: ['seddulbahir', 'kirte'],
    locationByFaction: { ottoman: 'kilitbahir', british: 'seddulbahir', french: 'seddulbahir', anzac: 'ariburnu' },
    locationByUnit: {
      '5-ordu': 'bigali',
      '3-kolordu': 'bigali',
      '19-tumen': 'kilitbahir',
      '57-alay': 'ariburnu',
      '27-alay': 'ariburnu',
      '29-div': 'seddulbahir',
      'fr-corps': 'seddulbahir',
      'hms-queen-elizabeth': 'canakkale',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'bogaz',
      'anzac-1div': 'ariburnu',
      'nz-inf': 'ariburnu',
      '9-tumen': 'seddulbahir',
      'nusret': 'bogaz'
    },
    statusByFaction: { ottoman: 'savunma', british: 'taarruz', french: 'taarruz', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'Helles hattını kalabalık tut.',
      british: 'Seddülbahir’de karaya çıkış hattını genişlet.',
      french: 'Topçu desteğiyle İngiliz çıkarmasını destekle.',
      anzac: 'Arıburnu hattını tutup derinleş.'
    },
    outcomeByFaction: {
      ottoman: 'Kıyı siperleri etkin biçimde tutunduruldu.',
      british: 'Seddülbahir çıkarması beklenenden zorlu ilerledi.',
      french: 'Destek hattı düzenlendi.',
      anzac: 'Cephe hattı stabil hale getirildi.'
    }
  },
  7: {
    date: '25 Nisan 1915',
    locationIds: ['ariburnu', 'bigali'],
    locationByFaction: { ottoman: 'bigali', british: 'seddulbahir', french: 'seddulbahir', anzac: 'ariburnu' },
    locationByUnit: {
      '5-ordu': 'bigali',
      '3-kolordu': 'bigali',
      '19-tumen': 'bigali',
      '57-alay': 'ariburnu',
      '27-alay': 'ariburnu',
      'anzac-1div': 'ariburnu',
      'nz-inf': 'ariburnu',
      '29-div': 'seddulbahir',
      'fr-corps': 'seddulbahir',
      'hms-queen-elizabeth': 'seddulbahir',
      'hms-irresistible': 'seddulbahir',
      'hms-ocean': 'seddulbahir'
    },
    statusByFaction: { ottoman: 'savaşta', british: 'taarruz', french: 'taarruz', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'V Kumsalı baskısını yumuşatıp karşıla.',
      british: 'ANZAC hattını yanal yayılımla genişlet.',
      french: 'Deniz destek atışını koordine et.',
      anzac: 'Çıkış sonrası sarsıntıyı azaltarak ilerle.'
    },
    outcomeByFaction: {
      ottoman: 'Süregelen kayıplar yönetildi.',
      british: 'Maliyetli ilerleme sürdü.',
      french: 'Destek ateşi planlı ama yetersiz kaldı.',
      anzac: 'Çıkarmadan sonraki sarsıntı hafifletildi.'
    }
  },
  8: {
    date: '25 Nisan 1915',
    locationIds: ['kumkale', 'seddulbahir'],
    locationByFaction: { ottoman: 'kilitbahir', british: 'seddulbahir', french: 'kumkale', anzac: 'ariburnu' },
    locationByUnit: {
      '5-ordu': 'kilitbahir',
      '3-kolordu': 'kilitbahir',
      '19-tumen': 'kilitbahir',
      '57-alay': 'ariburnu',
      '27-alay': 'ariburnu',
      '29-div': 'seddulbahir',
      'fr-corps': 'kumkale',
      'hms-queen-elizabeth': 'seddulbahir',
      'hms-irresistible': 'seddulbahir',
      'hms-ocean': 'seddulbahir',
      'anzac-1div': 'ariburnu',
      'nz-inf': 'ariburnu',
      '9-tumen': 'conkbayiri',
      'nusret': 'suvla'
    },
    statusByFaction: { ottoman: 'savunma', british: 'yanılma', french: 'yanılma', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'Kumkale dikkat dağıtma hareketine karşı ana hattı koru.',
      british: 'Ana taarruzu gizleyecek yan çıkarmayı sürdür.',
      french: 'Kumkale’de dikkat dağıtma görevini tamamla.',
      anzac: 'Daha geniş bir yayılma için zaman kazanmaya çalış.'
    },
    outcomeByFaction: {
      ottoman: 'Dikkat dağıtma hamlesi ana savunmaya sınırlı etkide kaldı.',
      british: 'Çıkarma hattı hedeflenen biçimde meşgul oldu.',
      french: 'Kumkale cephesi beklenenden fazla direnç gördü.',
      anzac: 'Ana mücadele hattı ile koordinasyon korundu.'
    }
  },
  9: {
    date: 'Nisan 1915',
    locationIds: ['conkbayiri', 'kabatepe'],
    locationByFaction: { ottoman: 'conkbayiri', british: 'kabatepe', french: 'kabatepe', anzac: 'conkbayiri' },
    locationByUnit: {
      '5-ordu': 'conkbayiri',
      '3-kolordu': 'conkbayiri',
      '19-tumen': 'conkbayiri',
      '57-alay': 'kabatepe',
      '27-alay': 'conkbayiri',
      'anzac-1div': 'conkbayiri',
      'nz-inf': 'conkbayiri',
      '29-div': 'kabatepe',
      'fr-corps': 'kabatepe',
      '9-tumen': 'conkbayiri',
      'hms-queen-elizabeth': 'suvla',
      'hms-irresistible': 'suvla',
      'hms-ocean': 'suvla',
      'bouvet': 'canakkale',
      'suffren': 'canakkale'
    },
    statusByFaction: { ottoman: 'savaşta', british: 'savaşta', french: 'savaşta', anzac: 'savaşta' },
    objectiveByFaction: {
      ottoman: 'Conkbayırı mevzisini tut.',
      british: 'Lojistik hattını koruyarak baskıyı artır.',
      french: 'Siper derinliğini stabilize et.',
      anzac: 'Conkbayırı boyunca karşı taarruzu sürdür.'
    },
    outcomeByFaction: {
      ottoman: 'Kritik tepelerde tutunma başarıyla devam etti.',
      british: 'İlerleme hızı ciddi biçimde yavaşladı.',
      french: 'Kısa süreli karşı ateş avantajı yakalandı.',
      anzac: 'Savunma hattı genişlemeye başladı.'
    }
  },
  10: {
    date: 'Nisan 1915',
    locationIds: ['alcitepe', 'kirte'],
    locationByFaction: { ottoman: 'alcitepe', british: 'kirte', french: 'kirte', anzac: 'conkbayiri' },
    locationByUnit: {
      '5-ordu': 'alcitepe',
      '3-kolordu': 'alcitepe',
      '19-tumen': 'alcitepe',
      '57-alay': 'alcitepe',
      '27-alay': 'alcitepe',
      'anzac-1div': 'conkbayiri',
      'nz-inf': 'kabatepe',
      '29-div': 'kirte',
      'fr-corps': 'kirte',
      '9-tumen': 'kirte',
      'hms-queen-elizabeth': 'suvla',
      'hms-ocean': 'morto-koyu',
      'hms-irresistible': 'morto-koyu'
    },
    statusByFaction: { ottoman: 'savunma', british: 'savaşta', french: 'savaşta', anzac: 'savaşta' },
    objectiveByFaction: {
      ottoman: 'Alçıtepe hattını dengele ve tut.',
      british: 'Krithia çevresindeki baskıyı artır.',
      french: 'Seddülbahir destek hattını koru.',
      anzac: 'Conkbayırı-Eski Siper hattında baskıyı sürdür.'
    },
    outcomeByFaction: {
      ottoman: 'Cephe hattı ciddi şekilde daraldı.',
      british: 'Kayıplar artmasına rağmen hücum sürdürüldü.',
      french: 'Kritik noktada destekleme ihtiyacı doğdu.',
      anzac: 'İlerleme sınırlı kaldı.'
    }
  },
  11: {
    date: 'Nisan 1915',
    locationIds: ['alcitepe', 'kirte'],
    locationByFaction: { ottoman: 'alcitepe', british: 'kirte', french: 'kirte', anzac: 'kabatepe' },
    locationByUnit: {
      '5-ordu': 'alcitepe',
      '3-kolordu': 'alcitepe',
      '19-tumen': 'alcitepe',
      '57-alay': 'alcitepe',
      '27-alay': 'alcitepe',
      'anzac-1div': 'kabatepe',
      'nz-inf': 'kabatepe',
      '29-div': 'kirte',
      'fr-corps': 'kirte',
      '9-tumen': 'alcitepe',
      'hms-queen-elizabeth': 'suvla',
      'hms-ocean': 'suvla',
      'hms-irresistible': 'bogaz'
    },
    statusByFaction: { ottoman: 'savaşta', british: 'savaşta', french: 'savaşta', anzac: 'savaşta' },
    objectiveByFaction: {
      ottoman: 'Cephede yeni karşı pozisyonlar kur.',
      british: 'Siper hattını derinleştir.',
      french: 'Topçu ve ikmal hattını düzene sok.',
      anzac: 'Yeniden gruplanmaya çalış.'
    },
    outcomeByFaction: {
      ottoman: 'Karşı hareketin temposu düştü.',
      british: 'Büyük yıpratma başladı.',
      french: 'Kaybın ağırlığı arttı.',
      anzac: 'Gerçekçi bir yıpranma noktasına gelindi.'
    }
  },
  12: {
    date: 'Haziran 1915',
    locationIds: ['eceabat', 'canakkale'],
    locationByFaction: { ottoman: 'eceabat', british: 'suvla', french: 'suvla', anzac: 'anafartalar' },
    locationByUnit: {
      '5-ordu': 'eceabat',
      '3-kolordu': 'bigali',
      '19-tumen': 'bigali',
      '57-alay': 'ariburnu',
      '27-alay': 'ariburnu',
      '29-div': 'seddulbahir',
      'fr-corps': 'suvla',
      'anzac-1div': 'anafartalar',
      'nz-inf': 'anafartalar',
      '9-tumen': 'seddulbahir',
      'hms-queen-elizabeth': 'canakkale',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'bogaz',
      'nusret': 'bogaz'
    },
    statusByFaction: { ottoman: 'savunma', british: 'hazır', french: 'hazır', anzac: 'hazır' },
    objectiveByFaction: {
      ottoman: 'Komuta zinciriyle yeni emirleri yay.',
      british: 'Kış operasyonu öncesi toparlanma başlat.',
      french: 'Cephe ikmalini dengele.',
      anzac: 'Muharebe arası toparlanma için geri çekil.'
    },
    outcomeByFaction: {
      ottoman: 'Komuta zinciri stabilize oldu.',
      british: 'Tekrar toplama dönemi başladı.',
      french: 'İkmal zamanlaması düzeltildi.',
      anzac: 'Yorgunluk azaltıldı.'
    }
  },
  13: {
    date: 'Ağustos 1915',
    locationIds: ['suvla', 'anafartalar'],
    locationByFaction: { ottoman: 'conkbayiri', british: 'suvla', french: 'suvla', anzac: 'anafartalar' },
    locationByUnit: {
      '5-ordu': 'bigali',
      '3-kolordu': 'conkbayiri',
      '19-tumen': 'conkbayiri',
      '57-alay': 'conkbayiri',
      '27-alay': 'anafartalar',
      'anzac-1div': 'anafartalar',
      'nz-inf': 'anafartalar',
      '29-div': 'suvla',
      'fr-corps': 'suvla',
      '9-tumen': 'suvla',
      'hms-queen-elizabeth': 'bogaz',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'morto-koyu'
    },
    statusByFaction: { ottoman: 'savaşta', british: 'taarruz', french: 'taarruz', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'Suvla yönündeki kuvvet yoğunluğunu karşıla.',
      british: 'Suvla açılımını sürdürerek sarsılma yarat.',
      french: 'Topçu desteğiyle ortak baskıyı artır.',
      anzac: 'Kritik konumlarda yorgunluk nedeniyle ilerleme yavaşlasın.'
    },
    outcomeByFaction: {
      ottoman: 'Bölgesel savunma hattı yeniden toplandı.',
      british: 'Bölgesel ilerleme sınırlı kaldı.',
      french: 'Destek hattı zorlu koşullarda çalıştı.',
      anzac: 'Birimler yıpranma nedeniyle yavaşladı.'
    }
  },
  14: {
    date: 'Ağustos 1915',
    locationIds: ['anafartalar', 'conkbayiri'],
    locationByFaction: { ottoman: 'conkbayiri', british: 'conkbayiri', french: 'alcitepe', anzac: 'anafartalar' },
    locationByUnit: {
      '5-ordu': 'conkbayiri',
      '3-kolordu': 'conkbayiri',
      '19-tumen': 'conkbayiri',
      '57-alay': 'conkbayiri',
      '27-alay': 'anafartalar',
      'anzac-1div': 'anafartalar',
      'nz-inf': 'anafartalar',
      '29-div': 'conkbayiri',
      'fr-corps': 'alcitepe',
      '9-tumen': 'canakkale',
      'hms-queen-elizabeth': 'bogaz',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'bogaz'
    },
    statusByFaction: { ottoman: 'savaşta', british: 'savaşta', french: 'savaşta', anzac: 'savaşta' },
    objectiveByFaction: {
      ottoman: 'Anafartalar’daki gedikleri kapat.',
      british: 'Kırılma arayışını hızlandır.',
      french: 'Dağınık kuvvetleri yeniden birleştir.',
      anzac: 'Anafartalar’da son bir hamle için baskı kur.'
    },
    outcomeByFaction: {
      ottoman: 'Toplu karşı taarruzla ilerleme durduruldu.',
      british: 'Planlanan kırılma hedefi yakalanamadı.',
      french: 'Ek kayıplar nedeniyle operasyon yavaşladı.',
      anzac: 'Çatışma yoğunlaştı, hat korunamadı.'
    }
  },
  15: {
    date: '6–15 Ağustos 1915',
    locationIds: ['suvla'],
    locationByFaction: { ottoman: 'bigali', british: 'suvla', french: 'suvla', anzac: 'suvla' },
    locationByUnit: {
      '5-ordu': 'bigali',
      '3-kolordu': 'conkbayiri',
      '19-tumen': 'bigali',
      '57-alay': 'conkbayiri',
      '27-alay': 'suvla',
      'anzac-1div': 'suvla',
      'nz-inf': 'suvla',
      '29-div': 'suvla',
      'fr-corps': 'suvla',
      '9-tumen': 'suvla',
      'hms-queen-elizabeth': 'morto-koyu',
      'hms-irresistible': 'suvla',
      'hms-ocean': 'suvla',
      'nusret': 'canakkale'
    },
    statusByFaction: { ottoman: 'savunma', british: 'taarruz', french: 'taarruz', anzac: 'taarruz' },
    objectiveByFaction: {
      ottoman: 'Suvla çevresine gelişimi durdur.',
      british: 'Suvla’dan kara hattını genişlet.',
      french: 'Açık hedeflerde topçu desteği ver.',
      anzac: 'Yaralı birimlerle geçici mevzi al.'
    },
    outcomeByFaction: {
      ottoman: 'Suvla savunması kritik olarak tutuldu.',
      british: 'Hedeflenen derinlik elde edilemedi.',
      french: 'Arazi ilerlemeyi zorlaştırdı.',
      anzac: 'Birim kayıpları nedeniyle ivme düştü.'
    }
  },
  16: {
    date: '21 Ağustos 1915',
    locationIds: ['suvla', 'canakkale'],
    locationByFaction: { ottoman: 'bigali', british: 'suvla', french: 'suvla', anzac: 'anafartalar' },
    locationByUnit: {
      '5-ordu': 'bigali',
      '3-kolordu': 'bigali',
      '19-tumen': 'conkbayiri',
      '57-alay': 'suvla',
      '27-alay': 'anafartalar',
      'anzac-1div': 'anafartalar',
      'nz-inf': 'anafartalar',
      '29-div': 'suvla',
      'fr-corps': 'suvla',
      '9-tumen': 'suvla',
      'hms-queen-elizabeth': 'suvla',
      'hms-irresistible': 'suvla',
      'hms-ocean': 'morto-koyu',
      'nusret': 'bogaz'
    },
    statusByFaction: { ottoman: 'savunma', british: 'savaşta', french: 'savaşta', anzac: 'savaşta' },
    objectiveByFaction: {
      ottoman: 'Kalan baskıyı kesmek için karşı harekât yap.',
      british: 'Kısa vadede sonuç alınmadan taarruzu sürdür.',
      french: 'Maliyetli hücumun etkisini azalt.',
      anzac: 'Ateş altında savunmayı derinleştir.'
    },
    outcomeByFaction: {
      ottoman: 'Taarruzun etkinliği düşürülerek çatırsama engellendi.',
      british: 'Harekât sonuç vermeden tükendi.',
      french: 'Kayıplar yükseldi.',
      anzac: 'Üstünlük elde edilemedi.'
    }
  },
  17: {
    date: 'Eylül 1915',
    locationIds: ['canakkale'],
    locationByUnit: {
      '5-ordu': 'canakkale',
      '3-kolordu': 'canakkale',
      '19-tumen': 'canakkale',
      '57-alay': 'canakkale',
      '27-alay': 'conkbayiri',
      'anzac-1div': 'canakkale',
      'nz-inf': 'canakkale',
      '29-div': 'suvla',
      'fr-corps': 'suvla',
      '9-tumen': 'suvla',
      'hms-queen-elizabeth': 'bogaz',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'bogaz',
      'nusret': 'bogaz'
    },
    statusByFaction: { ottoman: 'savunma', british: 'savunma', french: 'savunma', anzac: 'savunma' },
    objectiveByFaction: {
      ottoman: 'Kazanılmış mevzileri koru.',
      british: 'Çekilme için plan geliştirmeye başla.',
      french: 'Maliyetli cephenin kapanma senaryosunu hazırla.',
      anzac: 'Birimleri toparla ve yeni talimat bekle.'
    },
    outcomeByFaction: {
      ottoman: 'Savunma hattı stabil kaldı.',
      british: 'Çekilme senaryosu ciddileşti.',
      french: 'Manevra planları komutaya geçti.',
      anzac: 'Geri çekilme hazırlığı başladı.'
    }
  },
  18: {
    date: 'Kasım 1915',
    locationIds: ['seddulbahir', 'morto-koyu'],
    locationByFaction: { ottoman: 'canakkale', british: 'seddulbahir', french: 'seddulbahir', anzac: 'suvla' },
    locationByUnit: {
      '5-ordu': 'canakkale',
      '3-kolordu': 'canakkale',
      '19-tumen': 'canakkale',
      '57-alay': 'canakkale',
      '27-alay': 'suvla',
      'anzac-1div': 'suvla',
      'nz-inf': 'suvla',
      '29-div': 'seddulbahir',
      'fr-corps': 'seddulbahir',
      '9-tumen': 'seddulbahir',
      'hms-queen-elizabeth': 'canakkale',
      'hms-irresistible': 'seddulbahir',
      'hms-ocean': 'seddulbahir',
      'nusret': 'bogaz'
    },
    statusByFaction: { ottoman: 'savunma', british: 'çekilme', french: 'çekilme', anzac: 'çekilme' },
    objectiveByFaction: {
      ottoman: 'Son hattı tut, düşmanın geri dönüşünü denetle.',
      british: 'Tahliye düzenini güvenli hale getir.',
      french: 'Gemilere geçişi hızlandır.',
      anzac: 'Yeniden denize çekilme rotasını destekle.'
    },
    outcomeByFaction: {
      ottoman: 'Tahliye anlarında karşı ateş avantajı korundu.',
      british: 'Çekilme düzeni kurulmaya başladı.',
      french: 'Kritik personel kayıpları azaltıldı.',
      anzac: 'Birimler düzenli biçimde çekildi.'
    },
    narration: 'İtilaf kuvvetleri kontrollü çekilmeye başladı; geri çekilme planları uygulanıyor.'
  },
  19: {
    date: 'Kasım 1915',
    locationIds: ['seddulbahir', 'kilitbahir'],
    locationByFaction: { ottoman: 'kilitbahir', british: 'seddulbahir', french: 'seddulbahir', anzac: 'suvla' },
    locationByUnit: {
      '5-ordu': 'canakkale',
      '3-kolordu': 'kilitbahir',
      '19-tumen': 'kilitbahir',
      '57-alay': 'kilitbahir',
      '27-alay': 'suvla',
      'anzac-1div': 'suvla',
      'nz-inf': 'suvla',
      '29-div': 'seddulbahir',
      'fr-corps': 'seddulbahir',
      '9-tumen': 'seddulbahir',
      'hms-queen-elizabeth': 'seddulbahir',
      'hms-irresistible': 'seddulbahir',
      'hms-ocean': 'seddulbahir'
    },
    statusByFaction: { ottoman: 'savunma', british: 'çekilme', french: 'çekilme', anzac: 'çekilme' },
    objectiveByFaction: {
      ottoman: 'Seddülbahir hattını son kez güvenceye al.',
      british: 'Geçişi mümkün olan en az kayıpla tamamla.',
      french: 'Meydandaki personeli deniz yoluna ilet.',
      anzac: 'Son çıkarma hatlarını kapat.'
    },
    outcomeByFaction: {
      ottoman: 'Savunma hattı bozulmadan kaldı.',
      british: 'Disiplini koruyan bir çekilme sağlandı.',
      french: 'Destek görevleri gemilere düzenli taşındı.',
      anzac: 'Birimler gemilere taşınarak toparlandı.'
    }
  },
  20: {
    date: 'Aralık 1915',
    locationIds: ['gelibolu'],
    locationByUnit: {
      '5-ordu': 'gelibolu',
      '3-kolordu': 'gelibolu',
      '19-tumen': 'gelibolu',
      '57-alay': 'gelibolu',
      '27-alay': 'gelibolu',
      'anzac-1div': 'gelibolu',
      'nz-inf': 'gelibolu',
      '29-div': 'canakkale',
      'fr-corps': 'canakkale',
      '9-tumen': 'canakkale',
      'hms-queen-elizabeth': 'bogaz',
      'hms-irresistible': 'bogaz',
      'hms-ocean': 'bogaz',
      'nusret': 'bogaz'
    },
    statusByFaction: { ottoman: 'savunma', british: 'çekilme', french: 'çekilme', anzac: 'çekilme' },
    objectiveByFaction: {
      ottoman: 'Seferi geride bırakarak bölgesel toparlanma tamamla.',
      british: 'Denizden dönüşü tamamla.',
      french: 'Sefer sonrası bilanço çıkar.',
      anzac: 'Kaynakları envantere geri yatır.'
    },
    outcomeByFaction: {
      ottoman: 'Bölgesel savunma zaferi siyasi anlamda öne çıktı.',
      british: 'Tahliyeden sonra kampanya sona erdi.',
      french: 'Geri çekilme emri doğrultusunda ayrışma sağlandı.',
      anzac: 'Birimler tarihsel ders çıkaracak şekilde taşındı.'
    },
    narration: 'Seferin sonunda geriye çekilme tamamlandı; tarihsel miras daha sonraki anlatımlarda sembolleşti.'
  }
};

const sanitizeLocationHint = (hint) => {
  if (!hint) return '';
  return String(hint).trim().toLowerCase().replace(/[^a-zçğıöşüÇĞİÖŞÜ0-9-]/gi, '');
};
const normalizeByKey = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = String(obj[key]);
    return acc;
  }, {});
};
const normalizeLocationMapByKey = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
  const out = {};
  Object.keys(obj).forEach((key) => {
    const value = sanitizeLocationHint(obj[key]);
    if (value) out[key] = value;
  });
  return Object.keys(out).length ? out : undefined;
};
const sanitizeLocationIds = (ids = []) => {
  const list = Array.isArray(ids) ? ids : [];
  return [...new Set(list.map((id) => String(id || '').trim().toLowerCase()).filter(Boolean))];
};

function validateOutput(weeklyGuide, dailyPhases) {
  const weekly = Array.isArray(weeklyGuide) ? weeklyGuide.length : 0;
  const daily = Array.isArray(dailyPhases) ? dailyPhases.length : 0;
  const start = daily ? dailyPhases[0].isoStart : '';
  const end = daily ? dailyPhases[daily - 1].isoStart : '';
  const yearMismatch = (dailyPhases || []).filter((item) => {
    const year = String(item.date || '').match(/(\d{4})\s*$/);
    return year && item.isoStart && year[1] !== item.isoStart.slice(0, 4);
  }).length;

  const errors = [];
  if (weekly !== 62) errors.push(`weekly=${weekly}`);
  if (daily !== 433) errors.push(`daily=${daily}`);
  if (start !== CAMPAIGN_START_ISO || end !== CAMPAIGN_END_ISO) errors.push(`range=${start}->${end}`);
  if (yearMismatch !== 0) errors.push(`yearMismatch=${yearMismatch}`);
  const dateMismatch = (dailyPhases || []).filter((item) => item.isoStart && item.date !== formatDateFromISO(item.isoStart)).length;
  if (dateMismatch !== 0) errors.push(`dateMismatch=${dateMismatch}`);
  const invalidTypeCount = (dailyPhases || []).filter((item) => !DAILY_TYPES.has(item.type)).length;
  if (invalidTypeCount !== 0) errors.push(`invalidType=${invalidTypeCount}`);
  const invalidSourceCount = (dailyPhases || []).filter((item) => !DAILY_SOURCES.has(item.source)).length;
  if (invalidSourceCount !== 0) errors.push(`invalidSource=${invalidSourceCount}`);
  const missingEvidenceCount = (dailyPhases || []).filter((item) => !Array.isArray(item.evidenceCodes) || item.evidenceCodes.length < 1).length;
  if (missingEvidenceCount !== 0) errors.push(`missingEvidence=${missingEvidenceCount}`);
  const invalidDetailParts = (dailyPhases || []).filter((item) => {
    const parts = item.detailParts || {};
    return !parts.explicit || !parts.state || !parts.weekly;
  }).length;
  if (invalidDetailParts !== 0) errors.push(`invalidDetailParts=${invalidDetailParts}`);
  if (errors.length) {
    throw new Error(`Doğrulama başarısız: ${errors.join(', ')}`);
  }
  return { weekly, daily, start, end, yearMismatch };
}

try {
  const toc = execSync(`unzip -p "${epubPath}" toc.ncx`).toString('utf8');
  const entries = [...toc.matchAll(/<navPoint[^>]*class="chapter"[^>]*>\s*<navLabel>\s*<text>([^<]+)<\/text>\s*<\/navLabel>\s*<content src="([^"]+)"/g)];

  const majorPhases = [];
  const chapterEntries = [];
  let i = 0;
  for (const m of entries) {
    const titleEn = (m[1] || '').trim();
    const src = (m[2] || '').trim();

    if (!titleEn) continue;
    if (/^(Cover Page|Title Page|Copyright Page|Contents|Notes|Acknowledgments|Appendix A: A Gallipoli Tour|Appendix B: Glossary of Military Terms|Index|Plates|Preface)$/i.test(titleEn)) {
      continue;
    }

    i += 1;
    const phaseNo = Number((titleEn.match(/^\d+/) || [String(i)])[0]) || i;
    const meta = PHASE_METADATA[phaseNo] || {};
    const title = titleMap[titleEn] || titleEn.replace(/^\d+\s*/, '');
    const locIds = sanitizeLocationIds(meta.locationIds);
    chapterEntries.push({ title, titleEn, src });

    majorPhases.push({
      id: `event-major-${String(i).padStart(2, '0')}`,
      src,
      title,
      titleEn,
      date: meta.date || parseDate(titleEn),
      isoDate: CHAPTER_DATE_OVERRIDES[phaseNo] || parseTurkishDateToISO(meta.date || parseDate(titleEn), i),
      importance: 'major',
      narration: meta.narration || `${title} safhasında kuvvetlerin hareketleri yoğunlaştı ve cephe hattında yeni kararlar alındı.`,
      locationIds: locIds.length ? locIds : undefined,
      locationByFaction: normalizeLocationMapByKey(meta.locationByFaction),
      locationByUnit: normalizeLocationMapByKey(meta.locationByUnit),
      statusByFaction: normalizeByKey(meta.statusByFaction),
      objectiveByFaction: normalizeByKey(meta.objectiveByFaction),
      outcomeByFaction: normalizeByKey(meta.outcomeByFaction)
    });
  }

  if (!majorPhases.length) {
    throw new Error('EPUB olayları ayrıştırılamadı.');
  }

  const epubDateIndex = buildEpubDateIndex(chapterEntries);
  const weeklyGuide = buildWeeklyGuide();
  const weeklyAnchorIndex = buildWeeklyAnchorIndex(weeklyGuide);
  const phases = buildDailyGuidedEvents(majorPhases, weeklyGuide, epubDateIndex, weeklyAnchorIndex).map((phase) => {
    const out = { ...phase };
    delete out.isoDate;
    return out;
  });
  const summary = validateOutput(weeklyGuide, phases);

  const content =
    `export const BOOK_WEEKLY_GUIDE = ${JSON.stringify(weeklyGuide, null, 2)};\n` +
    `export const BOOK_PHASE_EVENTS = ${JSON.stringify(phases, null, 2)};\n`;
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`Oluşturuldu: ${outPath} (${phases.length} günlük olay, ${weeklyGuide.length} haftalık kılavuz)`);
  console.log(`Doğrulama: weekly=${summary.weekly}, daily=${summary.daily}, range=${summary.start}->${summary.end}, yearMismatch=${summary.yearMismatch}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — KAMPANYA HAREKET REHBERİ ("Mekke")
// ──────────────────────────────────────────────────────────────
// Bu dosya, haritadaki HER kara VE deniz biriminin gün-gün NEREDEN
// NEREYE hareket ettiğinin TEK ve OKUNABİLİR doğruluk kaynağıdır.
// (Deniz birimleri Haziran 2026'da bu rehbere konsolide edildi;
//  koordinatlar position-engine su-ankrajlarıyla hizalı, prosedürel
//  ALLIED_NAVAL_LANES yalnızca kapsam-dışı günler için fallback.)
//
// Neden var?  Eskiden konumlar dağınık üç sistemde (canonical-positions
// yer-adı, historical-map-data anchor/route, position-engine elle naval
// lane) tutuluyordu; birim aylarca tek bir noktada donup sonra bir
// gün aniden ışınlanıyordu. Burada her birim, ARDIŞIK TARİHLİ KEYFRAME
// dizisi olarak yazılır; çözümleyici ardışık keyframe'ler arasında
// yumuşak (ease-in-out) interpolasyon yaparak belgesel gibi akıcı
// günlük hareket üretir.
//
// Şema — her birim: MOVEMENT_TIMELINE[unitId] = [ keyframe, ... ]
//   keyframe = {
//     iso:   'YYYY-MM-DD'        // bu keyframe'in yürürlüğe girdiği gün
//     place: 'ariburnu' | null   // GEO_LOCATION_BY_ID yer-adı (kalibre koord)
//     x,y:   number              // place yoksa ham harita koordinatı
//     dx,dy: number              // yer-adı üstüne küçük ayrışma ofseti
//     kind:  'march'|'hold'|'land'
//            // march = SONRAKİ keyframe'e doğru gün-gün YÜRÜ (rota, locked)
//            // hold  = sonraki keyframe'e kadar BURADA bekle (cephe, locked)
//            // land  = kesin çıkarma/olay noktası (exact, locked)
//     event: 'kısa tarihsel gerekçe'   // panelde "neden hareket etti"
//     conf:  'high'|'medium'           // kaynak güveni
//     src:   ['kaynak-id', ...]        // HISTORICAL_SOURCES referansları
//   }
//
// KURALLAR
//  • Keyframe'ler kronolojik ve birimin SADECE harita-üstü (on-map) dönemini
//    kapsar. İhtiyat/karargâh/tahliye-sonrası off-map dönemleri BURAYA
//    yazılmaz — onları mevcut reserve-gate (unit-sectors) ve canonical
//    end-state'leri (sunk/withdrawn/evacuated) yönetmeye devam eder.
//  • Bir 'march' keyframe'i SONRAKİ keyframe'in noktasına doğru interpolasyon
//    başlatır. "Yürü sonra dur" için: march@A (gün d0) → hold@B (gün d1).
//  • "İleri atıl-geri çekil" (taarruz nabzı) için: hold@hat → march@ileri →
//    hold@hat (3 keyframe, 2 gün) yaz.
//
// Kaynaklar: Peter Hart, *Gallipoli* (2011); Anzac Portal & Te Ara harita
// serileri; AWM / NZ History Anzac-Suvla cephe haritaları; The National
// Archives Gelibolu harita ekleri; Dardanelles defences 1915.
// ══════════════════════════════════════════════════════════════

import { GEO_LOCATION_BY_ID } from './geo-calibration.js?v=20260622-hp-polish-r1';

const SRC = {
    hart: 'peter-hart-gallipoli-2011',
    anzac: 'anzac-portal-gallipoli-maps',
    teara: 'te-ara-gallipoli-map',
    awm: 'awm-anzac-suvla-1915',
    nz: 'nz-history-anzac-suvla',
    na: 'national-archives-map-series',
    dard: 'dardanelles-defences-1915',
    gdi: 'gdi-naval-campaign',
    brit: 'britannica-naval-operations'
};

// Yer-adı → okunabilir Türkçe etiket (panel "Hareket Güzergâhı" ve
// "Günlük Hareket Defteri" nereden→nereye metni için). Ham koordinatlı
// keyframe'ler kendi `label` alanını taşır.
const PLACE_LABEL = {
    bigali: 'Bigalı', conkbayiri: 'Conkbayırı', ariburnu: 'Arıburnu (ANZAC Koyu)',
    anafartalar: 'Anafartalar', eceabat: 'Eceabat/Maydos', seddulbahir: 'Seddülbahir',
    kirte: 'Kirte (Krithia)', alcitepe: 'Alçıtepe', 'morto-koyu': 'Morto Koyu',
    kumkale: 'Kumkale (Asya yakası)', 'x-beach': 'X Beach / Helles', suvla: 'Suvla Koyu',
    'scimitar-hill': 'Scimitar Hill', kirectepe: 'Kireçtepe'
};

/** Bir keyframe'in okunabilir konum etiketi. */
function kfLabel(kf) {
    if (!kf) return '';
    if (kf.label) return kf.label;
    if (kf.place && PLACE_LABEL[kf.place]) return PLACE_LABEL[kf.place];
    if (kf.place) return kf.place;
    return 'mevzi';
}

/** Hareket türünün Türkçe etiketi (panel/defter için). */
export const LEG_KIND_LABEL = {
    march: 'yürüyüş', hold: 'mevzi tutuyor', land: 'çıkarma'
};

// ── Birim hareket zaman çizelgeleri ──────────────────────────────
// (yer-adı koordinatları GEO_LOCATION_BY_ID'den kalibre gelir; aşağıdaki
//  parantez içi piksel değerler okuyucu için referanstır.)
export const MOVEMENT_TIMELINE = {

    // ═══ OSMANLI KARA ═══════════════════════════════════════════

    // 3. Kolordu (Esat Paşa) — Arıburnu-Conkbayırı cephe komutası
    '3-kolordu': [
        { iso: '1915-04-25', place: 'conkbayiri', dx: 28, dy: 30, kind: 'hold', conf: 'medium', src: [SRC.awm, SRC.anzac], event: 'Esat Paşa Arıburnu-Conkbayırı cephe komutasını üstlendi.' },
        { iso: '1915-08-06', place: 'conkbayiri', dx: 34, dy: 24, kind: 'hold', conf: 'medium', src: [SRC.awm, SRC.nz], event: 'Ağustos taarruzunda kuzey cephe koordinasyonu.' },
        { iso: '1915-12-19', place: 'conkbayiri', dx: 34, dy: 24, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'Anzac tahliyesi arifesi — cephe komutası.' }
    ],

    // 19. Tümen (Yrb. Mustafa Kemal) — kampanyanın en hareketli birliği
    '19-tumen': [
        { iso: '1915-04-25', place: 'bigali', dx: -52, dy: 18, kind: 'march', conf: 'high', src: [SRC.hart, SRC.teara], event: '25 Nisan: Bigalı ihtiyatından Conkbayırı\'na koşu — "ölmeyi emrediyorum".' },
        { iso: '1915-04-26', place: 'conkbayiri', dx: 4, dy: 24, kind: 'hold', conf: 'high', src: [SRC.hart, SRC.teara, SRC.anzac], event: 'Conkbayırı-Arıburnu sırtında karşı taarruz hattı kuruldu.' },
        { iso: '1915-05-18', place: 'conkbayiri', dx: 4, dy: 24, kind: 'hold', conf: 'high', src: [SRC.anzac, SRC.teara], event: 'Arıburnu siper hattını tutmaya devam.' },
        { iso: '1915-05-19', place: 'ariburnu', dx: 8, dy: -4, kind: 'hold', conf: 'high', src: [SRC.hart], event: '19 Mayıs genel taarruzu — Arıburnu siperlerine yüklenme.' },
        { iso: '1915-05-20', place: 'conkbayiri', dx: 4, dy: 24, kind: 'hold', conf: 'high', src: [SRC.hart], event: '19 Mayıs taarruzu ağır kayıpla püskürtüldü; hatta dönüş.' },
        { iso: '1915-08-06', place: 'conkbayiri', dx: 4, dy: 24, kind: 'hold', conf: 'high', src: [SRC.awm, SRC.nz], event: 'Ağustos taarruzu başında Arıburnu-Conkbayırı hattında.' },
        { iso: '1915-08-08', place: 'conkbayiri', dx: 4, dy: 24, kind: 'march', conf: 'high', src: [SRC.hart, SRC.awm], event: 'M. Kemal Anafartalar Grup Komutanlığına atandı — kuzeye intikal.' },
        { iso: '1915-08-11', place: 'anafartalar', dx: 0, dy: 8, kind: 'hold', conf: 'high', src: [SRC.awm, SRC.nz], event: 'Anafartalar-Suvla cephesi savunma komutası.' },
        { iso: '1915-12-19', place: 'anafartalar', dx: 0, dy: 8, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'Tahliye arifesi — Anafartalar hattı.' }
    ],

    // 57. Alay (Yrb. Hüseyin Avni) — 19. Tümen öncüsü
    '57-alay': [
        { iso: '1915-04-25', place: 'bigali', dx: -34, dy: 30, kind: 'march', conf: 'high', src: [SRC.hart, SRC.teara], event: '57. Alay 19. Tümen öncüsü olarak Conkbayırı\'na koştu.' },
        { iso: '1915-04-27', place: 'ariburnu', dx: -4, dy: -8, kind: 'hold', conf: 'high', src: [SRC.hart, SRC.teara, SRC.anzac], event: 'Conkbayırı eteğinde Arıburnu karşı taarruz hattı — subay kadrosu şehit.' },
        { iso: '1915-05-19', place: 'ariburnu', dx: 6, dy: -2, kind: 'march', conf: 'high', src: [SRC.hart], event: '19 Mayıs taarruzunda Arıburnu siperlerine atıldı.' },
        { iso: '1915-05-20', place: 'ariburnu', dx: -4, dy: -8, kind: 'hold', conf: 'high', src: [SRC.hart], event: 'Taarruz sonrası yeniden teşkil; siper savunması.' },
        { iso: '1915-12-19', place: 'ariburnu', dx: -4, dy: -8, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Arıburnu siperlerinde tahliyeye kadar.' }
    ],

    // 27. Alay (Yrb. Şefik Aker) — Arıburnu ilk teması
    '27-alay': [
        { iso: '1914-11-03', place: 'eceabat', dx: -30, dy: -8, kind: 'hold', conf: 'medium', src: [SRC.teara, SRC.anzac], event: 'Maydos/Eceabat bölgesinde yarımada savunması.' },
        { iso: '1915-04-25', place: 'eceabat', dx: -30, dy: -8, kind: 'march', conf: 'high', src: [SRC.hart, SRC.teara], event: '25 Nisan: Maydos\'tan Arıburnu\'na ilk temas savunmasına sevk.' },
        { iso: '1915-04-27', place: 'ariburnu', dx: 16, dy: 2, kind: 'hold', conf: 'high', src: [SRC.hart, SRC.teara, SRC.anzac], event: 'Arıburnu ilk savunma hattı — çıkarmayı geciktirdi.' },
        { iso: '1915-08-06', place: 'ariburnu', dx: 16, dy: 2, kind: 'march', conf: 'high', src: [SRC.awm, SRC.nz], event: 'Ağustos: Arıburnu hattından Sarı Bayır savunmasına kaydırıldı.' },
        { iso: '1915-08-09', place: 'conkbayiri', dx: -8, dy: 6, kind: 'hold', conf: 'high', src: [SRC.awm, SRC.nz], event: 'Conkbayırı sırt savunmasında kritik mevziler.' },
        { iso: '1915-12-19', place: 'conkbayiri', dx: -8, dy: 6, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'Tahliyeye kadar Conkbayırı hattı.' }
    ],

    // 9. Tümen (Alb. Halil Sami) — güney sektör savunması (V/W Beach 26. Alay)
    '9-tumen': [
        { iso: '1914-11-03', x: 1375, y: 2135, kind: 'hold', label: 'Güney sektör (Boğaz-Helles ekseni)', conf: 'medium', src: [SRC.na, SRC.dard], event: 'Güney yarımada sektör savunması (Boğaz tahkimatından ayrı).' },
        { iso: '1915-04-25', x: 1375, y: 2135, kind: 'march', label: 'Güney sektör', conf: 'high', src: [SRC.hart, SRC.anzac, SRC.na], event: '25 Nisan: 26. Alay V/W Beach ve Seddülbahir\'i savundu, River Clyde\'a makineli tüfek direnişi.' },
        { iso: '1915-04-28', place: 'kirte', dx: -52, dy: 74, kind: 'hold', conf: 'high', src: [SRC.anzac, SRC.na], event: 'Seddülbahir-Kirte hattında İngiliz/Fransız köprübaşını çevreledi (Halil Sami Bey).' },
        { iso: '1915-12-31', place: 'kirte', dx: -52, dy: 74, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Helles cephesinde siper savunması.' }
    ],

    // 7. Tümen (Alb. Remzi Bey) — Seddülbahir V/W Beach
    '7-tumen': [
        { iso: '1914-11-03', place: 'seddulbahir', dx: 22, dy: -10, kind: 'hold', conf: 'medium', src: [SRC.anzac, SRC.na], event: 'Güney yarımada savunma kademesi (Saros/Bulair ihtiyatı, Maidos üzerinden güneye).' },
        { iso: '1915-04-25', place: 'seddulbahir', dx: 14, dy: -4, kind: 'hold', conf: 'high', src: [SRC.hart, SRC.anzac], event: '25 Nisan: Seddülbahir-Helles güney cephe savunmasını takviye etti.' },
        { iso: '1915-07-01', place: 'seddulbahir', dx: 14, dy: -4, kind: 'march', conf: 'high', src: [SRC.anzac], event: 'Kirte muharebeleri sonrası Alçıtepe savunma hattına çekildi.' },
        { iso: '1915-07-08', place: 'alcitepe', dx: 18, dy: 30, kind: 'hold', conf: 'high', src: [SRC.anzac], event: 'Helles/Alçıtepe siper hattı.' },
        { iso: '1915-12-31', place: 'alcitepe', dx: 18, dy: 30, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Alçıtepe hattında tahliyeye kadar.' }
    ],

    // 5. Tümen (Alb. Hasan Askeri) — Eceabat → Kirte
    '5-tumen': [
        { iso: '1914-11-03', place: 'eceabat', dx: 24, dy: 18, kind: 'hold', conf: 'medium', src: [SRC.na, SRC.anzac], event: 'Eceabat-Maydos güney savunma rezervi.' },
        { iso: '1915-04-25', place: 'eceabat', dx: 24, dy: 18, kind: 'march', conf: 'high', src: [SRC.hart, SRC.anzac], event: '25 Nisan: Helles cephesini takviyeye güneye yürüdü.' },
        { iso: '1915-04-29', place: 'seddulbahir', dx: 52, dy: -78, kind: 'hold', conf: 'high', src: [SRC.anzac, SRC.na], event: 'Kirte (Krithia) muharebe hattında İngiliz/Fransız taarruzlarına direniş.' },
        { iso: '1915-07-01', place: 'kirte', dx: 38, dy: 86, kind: 'hold', conf: 'high', src: [SRC.anzac], event: 'Kirte-Alçıtepe siper hattı.' },
        { iso: '1915-12-31', place: 'kirte', dx: 38, dy: 86, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Güney cephe siper savunması.' }
    ],

    // Çanakkale Müstahkem Mevki (Cevat Paşa) — kıyı bataryaları
    'mustahkem-mevki': [
        { iso: '1914-11-03', x: 1432, y: 2091, kind: 'hold', label: 'Kilitbahir / Narrows bataryaları', conf: 'high', src: [SRC.na, SRC.dard], event: 'Kilitbahir/Narrows kıyı bataryaları — Boğaz savunması.' },
        { iso: '1915-03-18', x: 1432, y: 2091, kind: 'hold', label: 'Kilitbahir / Narrows bataryaları', conf: 'high', src: [SRC.dard, SRC.na], event: '18 Mart: 230+ topla İtilaf donanmasını püskürttü.' },
        { iso: '1915-12-31', x: 1432, y: 2091, kind: 'hold', label: 'Kilitbahir / Narrows bataryaları', conf: 'high', src: [SRC.na], event: 'Boğaz kıyı savunması — kampanya boyunca.' }
    ],

    // ═══ İTİLAF KARA / ÇIKARMA ══════════════════════════════════

    // İngiliz 29. Tümen (Hunter-Weston) — Helles
    '29-div': [
        { iso: '1915-04-25', place: 'x-beach', dx: 0, dy: 0, kind: 'land', conf: 'high', src: [SRC.hart, SRC.anzac, SRC.na], event: '25 Nisan: S/V/W/X/Y Beach Cape Helles çıkarması (ana hücum V/W/X uçta) — V Beach\'te River Clyde katliamı.' },
        { iso: '1915-04-28', place: 'seddulbahir', dx: 36, dy: -64, kind: 'march', conf: 'high', src: [SRC.hart, SRC.anzac], event: '1. Kirte taarruzu — Alçıtepe\'ye doğru ilerleme denemesi.' },
        { iso: '1915-04-29', place: 'seddulbahir', dx: 24, dy: -52, kind: 'hold', conf: 'high', src: [SRC.anzac, SRC.na], event: 'Helles köprübaşında tutundu.' },
        { iso: '1915-05-06', place: 'kirte', dx: -40, dy: 64, kind: 'march', conf: 'high', src: [SRC.hart], event: '2. Kirte taarruzu (6-8 Mayıs) — kanlı, sınırlı ilerleme.' },
        { iso: '1915-05-09', place: 'seddulbahir', dx: 30, dy: -40, kind: 'hold', conf: 'high', src: [SRC.anzac], event: 'Taarruz durdu; siper hattına dönüş.' },
        { iso: '1915-06-04', place: 'kirte', dx: -34, dy: 58, kind: 'march', conf: 'high', src: [SRC.hart], event: '3. Kirte taarruzu — yine yarma sağlanamadı.' },
        { iso: '1915-06-07', place: 'seddulbahir', dx: 26, dy: -44, kind: 'hold', conf: 'high', src: [SRC.anzac], event: 'Helles cephesi siper savaşına yerleşti.' },
        { iso: '1915-12-31', place: 'seddulbahir', dx: 26, dy: -44, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Son tahliye arifesi — Helles köprübaşı.' }
    ],

    // Fransız Sefer Kuvveti (d'Amade) — Kumkale aldatması → Helles sağ kanat
    'fr-corps': [
        { iso: '1915-04-25', place: 'kumkale', dx: 0, dy: 0, kind: 'land', conf: 'high', src: [SRC.hart, SRC.anzac, SRC.na], event: '25 Nisan: Kumkale (Asya yakası) aldatma çıkarması.' },
        { iso: '1915-04-27', place: 'kumkale', dx: 0, dy: 0, kind: 'march', conf: 'high', src: [SRC.hart, SRC.anzac], event: '27 Nisan: Kumkale\'den Seddülbahir/Morto\'ya transfer.' },
        { iso: '1915-04-29', place: 'morto-koyu', dx: 6, dy: 4, kind: 'hold', conf: 'high', src: [SRC.anzac, SRC.na], event: 'Helles sağ kanadı (Kereves Dere) Fransız sektörü.' },
        { iso: '1915-06-21', place: 'morto-koyu', dx: 14, dy: -8, kind: 'march', conf: 'medium', src: [SRC.hart], event: 'Kereves Dere taarruzları — sınırlı ilerleme.' },
        { iso: '1915-06-24', place: 'morto-koyu', dx: 6, dy: 4, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Sağ kanat siper savunması.' },
        { iso: '1915-12-31', place: 'morto-koyu', dx: 6, dy: 4, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'Son tahliye arifesi — Helles sağ kanat.' }
    ],

    // 1. Avustralya Tümeni (Bridges) — Arıburnu / ANZAC Koyu
    'anzac-1div': [
        { iso: '1915-04-25', place: 'ariburnu', dx: 0, dy: 0, kind: 'land', conf: 'high', src: [SRC.hart, SRC.anzac, SRC.teara], event: '25 Nisan 04:30: Arıburnu\'na çıkarma — hedefin 1.5 km kuzeyi.' },
        { iso: '1915-04-27', place: 'ariburnu', dx: 8, dy: 14, kind: 'hold', conf: 'high', src: [SRC.hart, SRC.anzac], event: 'Dar "Old Anzac" köprübaşında tutunma; 400 Plateau çekişmesi.' },
        { iso: '1915-08-06', place: 'ariburnu', dx: 18, dy: 24, kind: 'march', conf: 'high', src: [SRC.hart, SRC.awm], event: '6 Ağustos 17:30: 1. Avustralya Piyade Tugayı Lone Pine (Kanlı Sırt) aldatma taarruzunu başlattı.' },
        { iso: '1915-08-09', place: 'ariburnu', dx: 0, dy: 6, kind: 'hold', conf: 'high', src: [SRC.awm, SRC.nz], event: 'Lone Pine ele geçirildi; tutulan zeminin savunması.' },
        { iso: '1915-12-16', place: 'ariburnu', dx: 0, dy: 6, kind: 'hold', conf: 'medium', src: [SRC.nz, SRC.anzac], event: 'Tahliye arifesi — Anzac köprübaşı.' },
        { iso: '1915-12-17', place: 'ariburnu', dx: 0, dy: 6, kind: 'march', retreat: true, conf: 'medium', src: [SRC.nz, SRC.anzac], event: '19-20 Ara: gece gizlice North Beach\'e sessiz çekiliş.' },
        { iso: '1915-12-19', place: 'ariburnu', dx: -96, dy: 16, kind: 'hold', conf: 'medium', src: [SRC.anzac], event: 'North Beach tahliye iskelesinde son birlikler.' }
    ],

    // Yeni Zelanda Tugayı (Johnston) — ANZAC → Conkbayırı zirvesi → geri
    'nz-inf': [
        { iso: '1915-04-25', place: 'ariburnu', dx: -4, dy: -6, kind: 'land', conf: 'high', src: [SRC.teara, SRC.anzac], event: '25 Nisan: Arıburnu\'na çıkarma; Anzac mevzileri.' },
        { iso: '1915-04-28', place: 'ariburnu', dx: -6, dy: -10, kind: 'hold', conf: 'high', src: [SRC.teara, SRC.anzac], event: 'Anzac kuzey kanadında siper savunması.' },
        { iso: '1915-08-06', place: 'ariburnu', dx: -6, dy: -10, kind: 'march', conf: 'high', src: [SRC.hart, SRC.teara, SRC.nz], event: '6-7 Ağustos gecesi: Sarı Bayır — Conkbayırı\'na tırmanış başladı.' },
        { iso: '1915-08-08', place: 'conkbayiri', dx: 0, dy: 0, kind: 'hold', conf: 'high', src: [SRC.hart, SRC.teara, SRC.nz], event: '8 Ağustos: Wellington Taburu Conkbayırı zirvesini aldı — 8-9 Ağustos tutuldu.' },
        { iso: '1915-08-10', place: 'ariburnu', dx: -8, dy: -16, kind: 'march', retreat: true, conf: 'high', src: [SRC.hart, SRC.nz], event: '9 Ağustos akşamı İngiliz taburlarına devredildi; 10 Ağustos M. Kemal\'in karşı taarruzu zirveyi geri aldı — Yeni Zelandalılar Anzac hattına döndü.' },
        { iso: '1915-08-12', place: 'ariburnu', dx: -8, dy: -14, kind: 'hold', conf: 'high', src: [SRC.nz, SRC.teara], event: 'Anzac hattına dönüş; siper savunması.' },
        { iso: '1915-12-16', place: 'ariburnu', dx: -8, dy: -14, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'Tahliye arifesi — Anzac hattı.' },
        { iso: '1915-12-17', place: 'ariburnu', dx: -8, dy: -14, kind: 'march', retreat: true, conf: 'medium', src: [SRC.nz], event: '19-20 Ara: North Beach\'e sessiz çekiliş.' },
        { iso: '1915-12-19', place: 'ariburnu', dx: -104, dy: -4, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'North Beach iskelesinde tahliye.' }
    ],

    // İngiliz IX Kolordusu (Stopford) — Suvla çıkarması
    'ix-corps': [
        { iso: '1915-08-06', place: 'suvla', dx: 0, dy: 0, kind: 'land', conf: 'high', src: [SRC.hart, SRC.awm, SRC.nz], event: '6-7 Ağustos: Suvla Koyu çıkarması — düşük dirençle başladı.' },
        { iso: '1915-08-08', place: 'suvla', dx: 26, dy: -8, kind: 'march', conf: 'high', src: [SRC.hart, SRC.awm], event: 'Komuta tereddüdü ve su sıkıntısı — Anafartalar yükseltilerine geciken ilerleme.' },
        { iso: '1915-08-21', place: 'scimitar-hill', dx: 0, dy: 0, kind: 'march', conf: 'high', src: [SRC.hart, SRC.awm, SRC.nz], event: '21 Ağustos: Scimitar Hill / Yusufçuktepe taarruzu — kampanyanın son büyük hamlesi.' },
        { iso: '1915-08-23', place: 'suvla', dx: 18, dy: -6, kind: 'hold', conf: 'high', src: [SRC.awm, SRC.nz], event: 'Taarruz başarısız; Suvla köprübaşında savunmaya geçildi.' },
        { iso: '1915-12-17', place: 'suvla', dx: 18, dy: -6, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'Tahliye arifesi — Suvla köprübaşı.' },
        { iso: '1915-12-18', place: 'suvla', dx: 18, dy: -6, kind: 'march', retreat: true, conf: 'medium', src: [SRC.nz], event: '19-20 Ara: Suvla Koyu\'ndan sessiz tahliye.' },
        { iso: '1915-12-20', place: 'suvla', dx: -56, dy: 10, kind: 'hold', conf: 'medium', src: [SRC.nz], event: 'Suvla tahliye iskelesinde son birlikler.' }
    ],

    // SS River Clyde — V Beach'e oturtulan çıkarma platformu
    'ss-river-clyde': [
        { iso: '1915-04-25', x: 1024, y: 2392, naval: true, kind: 'land', label: 'V Beach (Seddülbahir)', conf: 'high', src: [SRC.hart, SRC.anzac, SRC.na], event: '25 Nisan: V Beach önüne bilerek oturtuldu — açık hedef.' },
        { iso: '1915-04-27', x: 1024, y: 2392, naval: true, kind: 'hold', label: 'V Beach (Seddülbahir)', conf: 'high', src: [SRC.anzac], event: 'V Beach köprübaşı ağır kayıpla tutuldu.' }
    ],

    // ═══ DENİZ KUVVETLERİ — Boğaz harekâtı (artık aynı rehberde) ════════
    // Koordinatlar position-engine kalibre su-ankrajlarıyla (NA.*) ve
    // historical-map-data naval rotalarıyla hizalı; render yine snapToSeaWater
    // + naval display offset'leri uygular. Batış sahnesi base-faz "battı"
    // outcome'u + 'land' (exact) keyframe'i ile korunur.

    // Nusret Mayın Gemisi (Kolağası Nazmi Bey) — kampanya boyunca on-map
    'nusret': [
        { iso: '1914-11-03', x: 1475, y: 2103, naval: true, kind: 'hold', label: 'Boğaz / Erenköy mayın devriyesi', conf: 'medium', src: [SRC.dard, SRC.gdi], event: 'Boğaz mayın savunması ve Erenköy çevresinde gece operasyonları.' },
        { iso: '1915-03-07', x: 1179, y: 2386, naval: true, kind: 'march', label: 'Erenköy koyu — döşeme intikali', conf: 'high', src: [SRC.dard, SRC.gdi], event: '7/8 Mart gecesi gizli hattı döşemek için Erenköy koyuna intikal.' },
        { iso: '1915-03-08', x: 1244, y: 2446, naval: true, kind: 'hold', label: 'Erenköy mayın hattı (26 mayın)', conf: 'high', src: [SRC.dard, SRC.gdi], event: '7/8 Mart gecesi Erenköy koyuna paralel 26 mayınlık hat — 18 Mart\'ın kaderini belirledi.' },
        { iso: '1915-03-09', x: 1179, y: 2386, naval: true, kind: 'hold', label: 'Erenköy/Kephez nöbet hattı', conf: 'medium', src: [SRC.dard, SRC.gdi], event: 'Mayın hattı döşendi; Boğaz savunmasına devam etti.' },
        { iso: '1916-01-09', x: 1179, y: 2386, naval: true, kind: 'hold', label: 'Erenköy/Kephez nöbet hattı', conf: 'medium', src: [SRC.dard], event: 'Kampanya boyunca Boğaz mayın savunması.' }
    ],

    // HMS Queen Elizabeth (amiral gemisi — Amiral de Robeck filo komutanı)
    'hms-queen-elizabeth': [
        { iso: '1915-02-19', x: 790, y: 2718, naval: true, kind: 'march', label: 'Ege yaklaşımı', conf: 'medium', src: [SRC.na, SRC.brit, SRC.gdi], event: '19 Şubat: dış bombardımanlarla Boğaz ağzına yaklaşım başladı.' },
        { iso: '1915-03-07', x: 1138, y: 2385, naval: true, kind: 'march', label: 'Narrows bombardıman hattı', conf: 'medium', src: [SRC.na, SRC.gdi], event: 'Erenköy körfezine, Narrows menziline ilerleme.' },
        { iso: '1915-03-18', x: 1215, y: 2420, naval: true, kind: 'hold', label: 'Line A — uzun menzil bombardıman hattı', conf: 'medium', src: [SRC.gdi, SRC.brit], event: '18 Mart: amiral gemisi Line A\'dan uzun menzilli ateş; hasar almadı.' },
        { iso: '1915-03-19', x: 1215, y: 2420, naval: true, kind: 'march', retreat: true, label: 'Boğaz dışına çekilme', conf: 'medium', src: [SRC.gdi, SRC.brit], event: '18 Mart sonrası Boğaz dışına çekilme.' },
        { iso: '1915-05-12', x: 880, y: 2710, naval: true, kind: 'hold', label: 'Ege — tiyatrodan ayrılış', conf: 'medium', src: [SRC.gdi, SRC.brit], event: 'Mayıs 1915: denizaltı tehdidiyle Çanakkale tiyatrosundan ayrıldı.' }
    ],

    // Suffren (Fransız) — ağır hasar aldı, sağ kaldı
    'suffren': [
        { iso: '1915-02-19', x: 700, y: 2790, naval: true, kind: 'march', label: 'Ege yaklaşımı (Fransız hattı)', conf: 'medium', src: [SRC.na, SRC.gdi], event: '19 Şubat: Fransız ikinci hattı Boğaz\'a yaklaştı.' },
        { iso: '1915-03-07', x: 1250, y: 2460, naval: true, kind: 'march', label: 'Erenköy dönüş hattı', conf: 'medium', src: [SRC.gdi], event: 'Erenköy körfezi muharebe hattına ilerleme.' },
        { iso: '1915-03-18', x: 1314, y: 2375, naval: true, kind: 'hold', label: 'Erenköy dönüşü — ağır hasar', conf: 'medium', src: [SRC.gdi, SRC.dard], event: '18 Mart: Erenköy dönüş bölgesinde ağır hasar aldı ama battmadı.' },
        { iso: '1915-03-19', x: 1314, y: 2375, naval: true, kind: 'march', retreat: true, label: 'Hasarlı — Boğaz dışına çekilme', conf: 'medium', src: [SRC.gdi], event: 'Ağır hasarlı halde onarım için Boğaz dışına çekildi.' },
        { iso: '1915-04-24', x: 930, y: 2685, naval: true, kind: 'hold', label: 'Ege — onarıma ayrılış', conf: 'medium', src: [SRC.gdi], event: 'Onarım için ayrıldı; Çanakkale harekâtına dönmedi.' }
    ],

    // Bouvet (Fransız) — 18 Mart'ta battı
    'bouvet': [
        { iso: '1915-02-19', x: 665, y: 2805, naval: true, kind: 'march', label: 'Ege yaklaşımı (Fransız hattı)', conf: 'high', src: [SRC.dard, SRC.gdi], event: '19 Şubat: Fransız hattında Boğaz\'a yaklaşım.' },
        { iso: '1915-03-07', x: 1148, y: 2472, naval: true, kind: 'march', label: 'Erenköy dönüş hattı', conf: 'high', src: [SRC.dard, SRC.gdi], event: 'Erenköy körfezi muharebe hattına ilerleme.' },
        { iso: '1915-03-18', x: 1293, y: 2356, naval: true, kind: 'land', label: 'Erenköy dönüşü — battı', conf: 'high', src: [SRC.dard, SRC.gdi], event: '18 Mart ~13:58: Erenköy dönüşünde Nusret mayınına çarpıp ~2 dakikada battı (~640 kayıp).' }
    ],

    // HMS Irresistible — 18 Mart'ta battı
    'hms-irresistible': [
        { iso: '1915-02-19', x: 720, y: 2830, naval: true, kind: 'march', label: 'Ege yaklaşımı', conf: 'high', src: [SRC.dard, SRC.gdi], event: '19 Şubat: Boğaz operasyonlarına katıldı.' },
        { iso: '1915-03-07', x: 1164, y: 2542, naval: true, kind: 'march', label: 'Erenköy dönüş hattı', conf: 'high', src: [SRC.dard, SRC.gdi], event: 'İkinci/üçüncü hat dönüş bölgesine ilerleme.' },
        { iso: '1915-03-18', x: 1226, y: 2369, naval: true, kind: 'land', label: 'Erenköy mayın hattı — battı', conf: 'high', src: [SRC.dard, SRC.gdi], event: '18 Mart: Erenköy mayın hattında makineleri devre dışı kaldı; battı.' }
    ],

    // HMS Ocean — 18 Mart'ta battı
    'hms-ocean': [
        { iso: '1915-02-19', x: 755, y: 2860, naval: true, kind: 'march', label: 'Ege yaklaşımı', conf: 'high', src: [SRC.dard, SRC.gdi], event: '19 Şubat: Boğaz operasyonlarına katıldı.' },
        { iso: '1915-03-07', x: 1220, y: 2540, naval: true, kind: 'march', label: 'Erenköy dönüş hattı', conf: 'high', src: [SRC.dard, SRC.gdi], event: 'Dönüş bölgesine ilerleme.' },
        { iso: '1915-03-18', x: 1273, y: 2410, naval: true, kind: 'land', label: 'Erenköy mayın hattı — battı', conf: 'high', src: [SRC.dard, SRC.gdi], event: '18 Mart: Irresistible\'ı kurtarmaya çalışırken aynı mayın sahasında battı.' }
    ],

    // İtilaf Mayın Tarama Trawlerları — hat açılamadı
    'allied-minesweepers': [
        { iso: '1915-02-19', x: 1040, y: 2580, naval: true, kind: 'march', label: 'Erenköy — gece tarama denemeleri', conf: 'medium', src: [SRC.dard, SRC.gdi], event: 'Silahlı koruma altında gece mayın tarama denemeleri başladı.' },
        { iso: '1915-03-08', x: 1155, y: 2445, naval: true, kind: 'hold', label: 'Erenköy mayın hattı — açılamadı', conf: 'medium', src: [SRC.dard, SRC.gdi], event: 'Akıntı, kıyı ateşi ve deneyimsiz sivil ekipler yüzünden hat açılamadı.' },
        { iso: '1915-03-18', x: 1130, y: 2380, naval: true, kind: 'hold', label: '18 Mart — açılamamış hat', conf: 'medium', src: [SRC.dard, SRC.gdi], event: '45 tarama denemesi başarısız; taarruz günü Erenköy hattı hâlâ kapalıydı.' }
    ]
};

// ── Çözümleyici ──────────────────────────────────────────────────

function isoDay(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return NaN;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

/** Cubic ease-in-out — yürüyüş hissi (hızlan → yavaşla). */
function easeInOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Keyframe → kalibre {x,y} (yer-adı + ofset veya ham koordinat). */
function keyframePoint(kf) {
    if (typeof kf.x === 'number' && typeof kf.y === 'number') {
        return { x: kf.x + (kf.dx || 0), y: kf.y + (kf.dy || 0) };
    }
    const loc = kf.place ? GEO_LOCATION_BY_ID[kf.place] : null;
    if (!loc) return null;
    return { x: loc.x + (kf.dx || 0), y: loc.y + (kf.dy || 0) };
}

const KIND_TO_PLACEMENT = { march: 'route', hold: 'frontline', land: 'exact' };

/**
 * Birimin verilen ISO günündeki harita konumunu, ardışık keyframe'ler
 * arasında yumuşak interpolasyonla çözer.
 *
 * @returns normalize edilmiş placement objesi (historical-map-data ile
 *   aynı şekil) — on-map ise; aksi halde null (engine eski katmana düşer).
 */
export function resolveCampaignMovement(unitOrId, isoDate) {
    const unitId = typeof unitOrId === 'string' ? unitOrId : unitOrId?.id;
    if (!unitId || !isoDate) return null;
    const frames = MOVEMENT_TIMELINE[unitId];
    if (!frames || !frames.length) return null;

    const day = isoDay(isoDate);
    if (Number.isNaN(day)) return null;

    // İlk keyframe'den önce / son keyframe'den sonra → kapsam dışı (fallback).
    if (day < isoDay(frames[0].iso)) return null;
    if (day > isoDay(frames[frames.length - 1].iso)) return null;

    // Aktif keyframe k: frames[k].iso <= iso < frames[k+1].iso
    let k = 0;
    for (let i = 0; i < frames.length; i++) {
        if (isoDay(frames[i].iso) <= day) k = i; else break;
    }
    const start = frames[k];
    const next = frames[k + 1] || null;
    const startPt = keyframePoint(start);
    const nextPt = next ? keyframePoint(next) : null;
    if (!startPt) return null;

    let point = startPt;
    let progress = 0;
    // 'march' → sonraki keyframe noktasına doğru gün-gün yumuşak interpolasyon.
    if (start.kind === 'march' && nextPt) {
        const span = isoDay(next.iso) - isoDay(start.iso);
        progress = span > 0 ? easeInOut((day - isoDay(start.iso)) / span) : 1;
        point = {
            x: Math.round(startPt.x + (nextPt.x - startPt.x) * progress),
            y: Math.round(startPt.y + (nextPt.y - startPt.y) * progress)
        };
    } else {
        point = { x: Math.round(startPt.x), y: Math.round(startPt.y) };
    }

    const fromLabel = kfLabel(start);
    const toLabel = (start.kind === 'march' && next) ? kfLabel(next) : fromLabel;

    return {
        id: `move:${unitId}:${start.iso}`,
        unitId,
        kind: KIND_TO_PLACEMENT[start.kind] || 'frontline',
        confidence: start.conf || 'medium',
        tolerance: 200,
        sourceIds: Array.isArray(start.src) ? start.src : [],
        note: start.event || '',
        point,
        fromPoint: { x: Math.round(startPt.x), y: Math.round(startPt.y) },
        toPoint: nextPt ? { x: Math.round(nextPt.x), y: Math.round(nextPt.y) } : { x: Math.round(startPt.x), y: Math.round(startPt.y) },
        progress,
        routeId: `move:${unitId}:${start.iso}`,
        legKind: start.kind,
        legEvent: start.event || '',
        retreat: !!start.retreat,
        naval: !!start.naval,
        label: fromLabel,
        fromLabel,
        toLabel,
        moved: start.kind === 'march' && fromLabel !== toLabel,
        fromIso: start.iso,
        toIso: next ? next.iso : start.iso
    };
}

/**
 * Birimin tüm hareket güzergâhını (kronolojik leg listesi) okunabilir
 * etiketlerle döndürür — panel "Hareket Güzergâhı" ve hareket defteri için.
 * Pozisyon çözmez; yalnızca nereden→nereye + gerekçe + kaynak meta.
 */
export function getUnitItinerary(unitId) {
    const frames = MOVEMENT_TIMELINE[unitId];
    if (!frames || !frames.length) return [];
    return frames.map((kf, i) => {
        const next = frames[i + 1] || null;
        const fromLabel = kfLabel(kf);
        const toLabel = (kf.kind === 'march' && next) ? kfLabel(next) : fromLabel;
        return {
            iso: kf.iso,
            kind: kf.kind,
            kindLabel: LEG_KIND_LABEL[kf.kind] || kf.kind,
            naval: !!kf.naval,
            retreat: !!kf.retreat,
            fromLabel,
            toLabel,
            moved: kf.kind === 'march' && fromLabel !== toLabel,
            event: kf.event || '',
            conf: kf.conf || 'medium',
            src: Array.isArray(kf.src) ? kf.src : []
        };
    });
}

/** Birimin tüm hareket rehberinde olup olmadığını söyler (gate/diag için). */
export function isUnitInMovementGuide(unitId) {
    return !!(unitId && MOVEMENT_TIMELINE[unitId] && MOVEMENT_TIMELINE[unitId].length);
}

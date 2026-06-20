// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Kaynaklı Tarihsel Harita Veri Katmanı
// Ünite anchor'ları, rota polyline'ları ve kaynak izlenebilirliği
// ══════════════════════════════════════════════════════════════

import { VP_MIN_X, VP_MAX_X, VP_MIN_Y, VP_MAX_Y } from './coordinate-map.js?v=20260620-combat-fx-r1';
import { resolveCampaignMovement } from './campaign-movement.js?v=20260620-combat-fx-r1';

export const HISTORICAL_SOURCES = {
    'peter-hart-gallipoli-2011': {
        id: 'peter-hart-gallipoli-2011',
        title: 'Peter Hart — Gallipoli (Profile Books, 2011)',
        url: 'https://www.profilebooks.com/title/gallipoli/',
        type: 'campaign-history',
        dateRange: '1914-11-03/1916-01-09',
        confidence: 'high',
        note: 'Birincil anlatı kaynağı; birim hareketleri, çıkarmalar, Kirte ve Ağustos taarruzları kronolojisi (campaign-movement.js rehberinin temeli).'
    },
    'national-archives-map-series': {
        id: 'national-archives-map-series',
        title: 'The National Archives — Gallipoli Campaign map series',
        url: 'https://discovery.nationalarchives.gov.uk/details/r/C14505',
        type: 'archive-map-series',
        dateRange: '1914-1918',
        confidence: 'context',
        note: 'Official-history map appendices, reconnaissance maps and Dardanelles Commission material.'
    },
    'dardanelles-defences-1915': {
        id: 'dardanelles-defences-1915',
        title: 'Dardanelles defences, February-March 1915',
        url: 'https://commons.wikimedia.org/wiki/File:Dardanelles_defences_1915.png',
        type: 'minefield-map',
        dateRange: '1915-02-01/1915-03-18',
        confidence: 'high',
        note: 'Mine lines 1-10 and Nusret/Nusrat line 11 in Erin Keui/Erenköy Bay.'
    },
    'gdi-naval-campaign': {
        id: 'gdi-naval-campaign',
        title: 'Gallipoli & Dardanelles International — The Naval Campaign',
        url: 'https://gdinternational.org.uk/research/the-naval-campaign/',
        type: 'historical-narrative',
        dateRange: '1914-08-01/1915-03-18',
        confidence: 'medium',
        note: '18 March battle sequence, ship lines, Erenköy turn and Nusret minefield context.'
    },
    'britannica-naval-operations': {
        id: 'britannica-naval-operations',
        title: 'Britannica — Naval operations in the Dardanelles Campaign',
        url: 'https://www.britannica.com/event/naval-operations-in-the-Dardanelles-Campaign-1915',
        type: 'historical-summary',
        dateRange: '1915-02-19/1915-03-18',
        confidence: 'medium',
        note: 'High-level naval operation chronology and minefield context.'
    },
    'awm-anzac-suvla-1915': {
        id: 'awm-anzac-suvla-1915',
        title: 'Australian War Memorial — Anzac & Suvla 1915',
        url: 'https://www.awm.gov.au/visit/exhibitions/gmaps/turkish/anzacsuvla1915',
        type: 'annotated-frontline-map',
        dateRange: '1915-08-12/1915-08-21',
        confidence: 'high',
        note: 'Anzac/Suvla front line and Turkish positions after the August offensive.'
    },
    'anzac-portal-gallipoli-maps': {
        id: 'anzac-portal-gallipoli-maps',
        title: 'Anzac Portal — Maps of Australian locations on Gallipoli 1915',
        url: 'https://anzacportal.dva.gov.au/wars-and-missions/ww1/where-australians-served/gallipoli/map-australian-locations',
        type: 'campaign-map',
        dateRange: '1915-04-25/1916-01-09',
        confidence: 'high',
        note: 'Anzac, Helles, Suvla, Sari Bair and Allied ground-held areas.'
    },
    'nz-history-anzac-suvla': {
        id: 'nz-history-anzac-suvla',
        title: 'NZ History — Anzac-Suvla sectors of Gallipoli, Aug-Dec 1915',
        url: 'https://nzhistory.govt.nz/media/photo/anzac-suvla-sectors-gallipoli-aug-dec-1915',
        type: 'frontline-map',
        dateRange: '1915-08-06/1915-12-20',
        confidence: 'high',
        note: 'Suvla landing, Hill 60, Anafarta/Scimitar Hill and evacuation front-line context.'
    },
    'te-ara-gallipoli-map': {
        id: 'te-ara-gallipoli-map',
        title: 'Te Ara — Map of Gallipoli',
        url: 'https://teara.govt.nz/en/interactive/34111/map-of-gallipoli',
        type: 'anzac-sector-map',
        dateRange: '1915-04-25/1915-12-20',
        confidence: 'medium',
        note: 'New Zealand movement from Anzac Cove to Chunuk Bair and evacuation context.'
    },
    'gallipoli-association-maps': {
        id: 'gallipoli-association-maps',
        title: 'The Gallipoli Association — Maps of Gallipoli',
        url: 'https://www.gallipoli-association.org/campaign/maps-of-gallipoli/',
        type: 'map-context',
        dateRange: '1915-03-28/1915-04-25',
        confidence: 'context',
        note: 'War Office map limitations and aerial reconnaissance context.'
    }
};

const LOC = {
    suvla: { x: 1143, y: 1632 },
    tuzgolu: { x: 1172, y: 1575 },
    kirectepe: { x: 1285, y: 1449 },
    anafartalar: { x: 1264, y: 1622 },
    bigali: { x: 1473, y: 1888 },
    conkbayiri: { x: 1236, y: 1744 },
    ariburnu: { x: 1246, y: 1788 },
    kabatepe: { x: 1199, y: 1919 },
    eceabat: { x: 1437, y: 2004 },
    kilitbahir: { x: 1451, y: 2091 },
    bogaz: { x: 1475, y: 2103 },
    canakkale: { x: 1508, y: 2102 },
    erenkoyu: { x: 1196, y: 2532 },
    alcitepe: { x: 1117, y: 2251 },
    xBeach: { x: 1017, y: 2336 },
    ikizKoyu: { x: 1039, y: 2325 },
    kirte: { x: 1112, y: 2246 },
    seddulbahir: { x: 1033, y: 2399 },
    morto: { x: 1063, y: 2358 },
    kumkale: { x: 1061, y: 2509 }
};

export const HISTORICAL_CALIBRATION_POINTS = [
    { id: 'kilitbahir', label: 'Kilitbahir', point: LOC.kilitbahir, sourceIds: ['national-archives-map-series', 'dardanelles-defences-1915'], residualPx: 0 },
    { id: 'canakkale', label: 'Çanakkale/Chanak', point: LOC.canakkale, sourceIds: ['national-archives-map-series', 'dardanelles-defences-1915'], residualPx: 0 },
    { id: 'erenkoyu', label: 'Erenköy / Erin Keui Bay', point: LOC.erenkoyu, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], residualPx: 18 },
    { id: 'seddulbahir', label: 'Seddülbahir / Cape Helles', point: LOC.seddulbahir, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], residualPx: 0 },
    { id: 'kumkale', label: 'Kumkale', point: LOC.kumkale, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], residualPx: 0 },
    { id: 'ariburnu', label: 'Arıburnu / Anzac Cove', point: LOC.ariburnu, sourceIds: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'], residualPx: 0 },
    { id: 'conkbayiri', label: 'Conkbayırı / Chunuk Bair', point: LOC.conkbayiri, sourceIds: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'], residualPx: 12 },
    { id: 'suvla', label: 'Suvla Bay', point: LOC.suvla, sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], residualPx: 12 },
    { id: 'alcitepe', label: 'Alçıtepe / Achi Baba', point: LOC.alcitepe, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], residualPx: 16 },
    { id: 'x-beach', label: 'X Beach / İkiz Koyu landing point', point: LOC.xBeach, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], residualPx: 0 }
];

export const HISTORICAL_ROUTES = [
    {
        id: 'nusret-erenkoy-mineline-7-8-march',
        unitIds: ['nusret'],
        start: '1915-03-07',
        end: '1915-03-08',
        kind: 'route',
        confidence: 'high',
        tolerance: 130,
        sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        note: '7/8 Mart gecesi Erenköy koyuna paralel 26 mayınlık 11. hat.',
        points: [
            { x: 1179, y: 2386 },
            { x: 1200, y: 2405 },
            { x: 1222, y: 2425 },
            { x: 1244, y: 2446 }
        ]
    },
    {
        id: 'hms-queen-elizabeth-naval-approach',
        unitIds: ['hms-queen-elizabeth'],
        start: '1915-02-19',
        end: '1915-03-18',
        kind: 'route',
        confidence: 'medium',
        tolerance: 170,
        sourceIds: ['national-archives-map-series', 'britannica-naval-operations', 'gdi-naval-campaign'],
        note: 'Ana muharebe hattı: dış yaklaşma, narrows bombardımanı, 18 Mart birinci hat.',
        points: [
            { x: 790, y: 2718 },
            { x: 940, y: 2580 },
            { x: 1070, y: 2490 },
            { x: 1138, y: 2385 },
            { x: 1260, y: 2415 }
        ]
    },
    {
        id: 'hms-queen-elizabeth-withdrawal',
        unitIds: ['hms-queen-elizabeth'],
        start: '1915-03-19',
        end: '1915-05-12',
        kind: 'route',
        confidence: 'medium',
        tolerance: 190,
        sourceIds: ['gdi-naval-campaign', 'britannica-naval-operations'],
        note: '18 Mart sonrası Boğaz dışına çekilme, Mayıs ayında denizaltı tehdidiyle tiyatrodan ayrılış.',
        points: [
            { x: 1215, y: 2420 },
            { x: 1080, y: 2520 },
            { x: 880, y: 2710 }
        ]
    },
    {
        id: 'suffren-naval-approach-damage',
        unitIds: ['suffren'],
        start: '1915-02-19',
        end: '1915-03-18',
        kind: 'route',
        confidence: 'medium',
        tolerance: 170,
        sourceIds: ['national-archives-map-series', 'gdi-naval-campaign'],
        note: 'Fransız ikinci hattı, Erenköy dönüş bölgesinde ağır hasar.',
        points: [
            { x: 700, y: 2790 },
            { x: 980, y: 2700 },
            { x: 1140, y: 2570 },
            { x: 1250, y: 2460 },
            { x: 1314, y: 2375 }
        ]
    },
    {
        id: 'suffren-withdrawal-repair',
        unitIds: ['suffren'],
        start: '1915-03-19',
        end: '1915-04-24',
        kind: 'route',
        confidence: 'medium',
        tolerance: 190,
        sourceIds: ['gdi-naval-campaign'],
        note: 'Ağır hasarlı halde Boğaz dışına çekilme.',
        points: [
            { x: 1314, y: 2375 },
            { x: 1110, y: 2520 },
            { x: 930, y: 2685 }
        ]
    },
    {
        id: 'bouvet-erenkoy-turn',
        unitIds: ['bouvet'],
        start: '1915-02-19',
        end: '1915-03-18',
        kind: 'route',
        confidence: 'high',
        tolerance: 145,
        sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        note: 'Fransız hattı Erenköy dönüşü; 13:54 civarı mayın çarpması.',
        points: [
            { x: 665, y: 2805 },
            { x: 840, y: 2700 },
            { x: 990, y: 2570 },
            { x: 1148, y: 2472 },
            { x: 1293, y: 2356 }
        ]
    },
    {
        id: 'irresistible-erenkoy-mine-strike',
        unitIds: ['hms-irresistible'],
        start: '1915-02-19',
        end: '1915-03-18',
        kind: 'route',
        confidence: 'high',
        tolerance: 145,
        sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        note: 'İkinci/üçüncü hat dönüş bölgesi; Erenköy mayın hattında hasar.',
        points: [
            { x: 720, y: 2830 },
            { x: 860, y: 2720 },
            { x: 1010, y: 2580 },
            { x: 1164, y: 2542 },
            { x: 1226, y: 2369 }
        ]
    },
    {
        id: 'ocean-rescue-mine-strike',
        unitIds: ['hms-ocean'],
        start: '1915-02-19',
        end: '1915-03-18',
        kind: 'route',
        confidence: 'high',
        tolerance: 150,
        sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        note: 'Irresistible yardım girişimi ve aynı mayın sahasında kayıp.',
        points: [
            { x: 755, y: 2860 },
            { x: 900, y: 2760 },
            { x: 1050, y: 2650 },
            { x: 1220, y: 2540 },
            { x: 1273, y: 2410 }
        ]
    },
    {
        id: 'allied-minesweepers-night-sweeps',
        unitIds: ['allied-minesweepers'],
        start: '1915-02-19',
        end: '1915-03-17',
        kind: 'route',
        confidence: 'medium',
        tolerance: 170,
        sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'],
        note: 'Silahlı koruma altındaki trawler mayın tarama denemeleri; akıntı, ateş ve deneyimsiz sivil ekipler yüzünden hat açılamadı.',
        points: [
            { x: 1040, y: 2580 },
            { x: 1125, y: 2500 },
            { x: 1155, y: 2445 },
            { x: 1130, y: 2380 }
        ]
    },
    {
        id: 'anzac-landing-ariburnu',
        unitIds: ['anzac-1div'],
        start: '1915-04-25',
        end: '1915-04-28',
        kind: 'route',
        confidence: 'high',
        tolerance: 220,
        sourceIds: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'],
        note: 'Arıburnu/North Beach çıkarması ve dar Old Anzac tutunması.',
        points: [
            { x: 1246, y: 1788 },
            { x: 1260, y: 1780 },
            { x: 1270, y: 1770 },
            { x: 1280, y: 1765 }
        ]
    },
    {
        id: 'new-zealand-sari-bair-chunuk-bair',
        unitIds: ['nz-inf'],
        start: '1915-08-06',
        end: '1915-08-10',
        kind: 'route',
        confidence: 'high',
        tolerance: 170,
        sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps', 'nz-history-anzac-suvla'],
        note: 'Sarı Bayır/Conkbayırı taarruzu; Yeni Zelanda Tugayı zirveye ulaşır.',
        points: [
            { x: 1246, y: 1788 },
            { x: 1240, y: 1768 },
            { x: 1238, y: 1755 },
            { x: 1236, y: 1744 }
        ]
    },
    {
        id: 'mustafa-kemal-countermove-conkbayiri',
        unitIds: ['19-tumen', '57-alay'],
        start: '1915-04-25',
        end: '1915-04-26',
        kind: 'route',
        confidence: 'medium',
        tolerance: 180,
        sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'],
        note: 'Bigalı ihtiyatından Conkbayırı/Arıburnu karşı hareketi.',
        points: [
            { x: 1314, y: 1762 },
            { x: 1280, y: 1755 },
            { x: 1236, y: 1744 },
            { x: 1246, y: 1788 }
        ]
    },
    {
        id: '27-alay-ariburnu-response',
        unitIds: ['27-alay'],
        start: '1915-04-25',
        end: '1915-04-26',
        kind: 'route',
        confidence: 'medium',
        tolerance: 180,
        sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'],
        note: 'Eceabat/Maydos hattından Arıburnu ilk temas savunmasına hareket.',
        points: [
            { x: 1404, y: 1958 },
            { x: 1350, y: 1900 },
            { x: 1300, y: 1830 },
            { x: 1246, y: 1788 }
        ]
    },
    {
        id: 'helles-v-w-beach-landing',
        unitIds: ['29-div'],
        start: '1915-04-25',
        end: '1915-04-28',
        kind: 'route',
        confidence: 'high',
        tolerance: 210,
        sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        note: 'Cape Helles çıkarması: X Beach ayrı iniş noktası, V/W Beach ve SS River Clyde hattı üzerinden Seddülbahir köprübaşı.',
        points: [
            { x: 1017, y: 2336 },
            { x: 1033, y: 2399 },
            { x: 1060, y: 2350 },
            { x: 1085, y: 2305 }
        ]
    },
    {
        id: 'french-kumkale-to-helles',
        unitIds: ['fr-corps'],
        start: '1915-04-25',
        end: '1915-04-28',
        kind: 'route',
        confidence: 'high',
        tolerance: 220,
        sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        note: 'Kumkale aldatma çıkarması ardından Helles sağ kanadına geçiş.',
        points: [
            { x: 1061, y: 2509 },
            { x: 1080, y: 2460 },
            { x: 1063, y: 2358 },
            { x: 1085, y: 2320 }
        ]
    },
    {
        id: 'anzac-suvla-evacuation',
        unitIds: ['anzac-1div', 'nz-inf'],
        start: '1915-12-07',
        end: '1915-12-20',
        kind: 'route',
        confidence: 'medium',
        tolerance: 360,
        sourceIds: ['nz-history-anzac-suvla', 'anzac-portal-gallipoli-maps'],
        note: 'Anzac/Suvla cephesinden sahile sessiz tahliye.',
        points: [
            { x: 1280, y: 1765 },
            { x: 1246, y: 1788 },
            { x: 1080, y: 1815 },
            { x: 900, y: 1860 }
        ]
    },
    {
        id: 'helles-final-evacuation',
        unitIds: ['29-div', 'fr-corps'],
        start: '1916-01-01',
        end: '1916-01-09',
        kind: 'route',
        confidence: 'medium',
        tolerance: 220,
        sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'],
        note: 'Helles/Seddülbahir son tahliyesi.',
        points: [
            { x: 1085, y: 2305 },
            { x: 1033, y: 2399 },
            { x: 900, y: 2430 },
            { x: 760, y: 2520 }
        ]
    }
];

export const HISTORICAL_ANCHORS = [
    { id: 'cevat-pasha-narrows-command', unitId: 'mustahkem-mevki', start: '1914-11-03', end: '1916-01-09', kind: 'exact', confidence: 'high', tolerance: 120, point: LOC.kilitbahir, sourceIds: ['national-archives-map-series', 'dardanelles-defences-1915'], note: 'Çanakkale Müstahkem Mevki Komutanlığı, Narrows/kıyı bataryaları.' },
    { id: 'nusret-erenkoy-patrol-before', unitId: 'nusret', start: '1914-11-03', end: '1915-03-06', kind: 'route', confidence: 'medium', tolerance: 180, point: { x: 1475, y: 2103 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: 'Boğaz mayın savunması ve Erenköy çevresi devriye/operasyon alanı.' },
    { id: 'nusret-erenkoy-watch-after-mines', unitId: 'nusret', start: '1915-03-09', end: '1916-01-09', kind: 'exact', confidence: 'medium', tolerance: 190, point: { x: 1179, y: 2386 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: 'Mayın hattı döşendikten sonra Erenköy/Kephez savunma hattı.' },
    { id: 'trawlers-minesweeping-failed', unitId: 'allied-minesweepers', start: '1915-02-19', end: '1915-03-17', kind: 'route', confidence: 'medium', tolerance: 180, point: { x: 1130, y: 2380 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: 'Mayın tarama trawlerları kıyı ateşi ve akıntı nedeniyle Erenköy hattını açamadı.' },
    { id: 'trawlers-18-march-failed-screen', unitId: 'allied-minesweepers', exactDate: '1915-03-18', kind: 'route', confidence: 'medium', tolerance: 180, point: { x: 1130, y: 2380 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: '18 Mart sahnesinde, taarruzdan önce açılamayan mayın tarama hattının görsel özeti.' },

    { id: 'bouvet-sunk-18-march', unitId: 'bouvet', exactDate: '1915-03-18', kind: 'exact', confidence: 'high', tolerance: 105, point: { x: 1293, y: 2356 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: 'Erenköy dönüş hattında mayına çarpıp battı.' },
    { id: 'irresistible-sunk-18-march', unitId: 'hms-irresistible', exactDate: '1915-03-18', kind: 'exact', confidence: 'high', tolerance: 105, point: { x: 1226, y: 2369 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: 'Erenköy mayın hattında devre dışı kaldı.' },
    { id: 'ocean-sunk-18-march', unitId: 'hms-ocean', exactDate: '1915-03-18', kind: 'exact', confidence: 'high', tolerance: 105, point: { x: 1273, y: 2410 }, sourceIds: ['dardanelles-defences-1915', 'gdi-naval-campaign'], note: 'Irresistible yardım girişiminde mayına çarptı.' },
    { id: 'suffren-damaged-18-march', unitId: 'suffren', exactDate: '1915-03-18', kind: 'exact', confidence: 'medium', tolerance: 120, point: { x: 1314, y: 2375 }, sourceIds: ['gdi-naval-campaign', 'dardanelles-defences-1915'], note: 'Erenköy dönüş bölgesinde ağır hasar aldı.' },
    { id: 'queen-elizabeth-line-a-18-march', unitId: 'hms-queen-elizabeth', exactDate: '1915-03-18', kind: 'exact', confidence: 'medium', tolerance: 130, point: { x: 1215, y: 2420 }, sourceIds: ['gdi-naval-campaign', 'britannica-naval-operations'], note: 'Line A uzun menzil bombardıman hattı.' },

    { id: '5-ordu-gelibolu-proxy', unitId: '5-ordu', start: '1915-03-24', end: '1916-01-09', kind: 'inferred', confidence: 'medium', tolerance: 420, point: LOC.bigali, sourceIds: ['national-archives-map-series', 'anzac-portal-gallipoli-maps'], note: 'Gelibolu karargahı harita dışında olduğundan Bigalı proxy noktası kullanılır.' },
    { id: '3-kolordu-bigali-reserve', unitId: '3-kolordu', start: '1914-11-03', end: '1915-04-24', kind: 'inferred', confidence: 'medium', tolerance: 260, point: LOC.bigali, sourceIds: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'], note: 'Bigalı ihtiyat/karargah bölgesi.' },
    { id: '3-kolordu-ariburnu-command', unitId: '3-kolordu', start: '1915-04-25', end: '1915-12-19', kind: 'frontline', side: 'ottoman', confidence: 'medium', tolerance: 280, point: LOC.conkbayiri, sourceIds: ['awm-anzac-suvla-1915', 'anzac-portal-gallipoli-maps'], note: 'Arıburnu-Conkbayırı savunma komutası.' },
    { id: '3-kolordu-post-anzac-evacuation', unitId: '3-kolordu', start: '1915-12-20', end: '1916-01-09', kind: 'inferred', confidence: 'medium', tolerance: 420, point: LOC.bigali, sourceIds: ['nz-history-anzac-suvla'], note: 'Anzac tahliyesinden sonra kuzey cephe komutası geriye alınır.' },

    { id: '19-tumen-bigali-reserve', unitId: '19-tumen', start: '1914-11-03', end: '1915-04-24', kind: 'inferred', confidence: 'medium', tolerance: 240, point: LOC.bigali, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: 'Bigalı ihtiyatı.' },
    { id: '19-tumen-ariburnu', unitId: '19-tumen', start: '1915-04-27', end: '1915-08-05', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 220, point: { x: 1240, y: 1768 }, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: 'Arıburnu/Conkbayırı karşı savunma hattı.' },
    { id: '19-tumen-anafartalar', unitId: '19-tumen', start: '1915-08-06', end: '1915-12-19', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 260, point: LOC.anafartalar, sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], note: 'Anafartalar/Suvla savunması.' },
    { id: '19-tumen-post-evac', unitId: '19-tumen', start: '1915-12-20', end: '1916-01-09', kind: 'inferred', confidence: 'medium', tolerance: 420, point: LOC.bigali, sourceIds: ['nz-history-anzac-suvla'], note: 'Tahliye sonrası geride kalan Osmanlı savunması.' },

    { id: '57-alay-bigali-reserve', unitId: '57-alay', start: '1914-11-03', end: '1915-04-24', kind: 'inferred', confidence: 'medium', tolerance: 240, point: LOC.bigali, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: '19. Tümen ihtiyatı.' },
    { id: '57-alay-ariburnu-line', unitId: '57-alay', start: '1915-04-27', end: '1915-12-19', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 240, point: { x: 1242, y: 1780 }, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: 'Arıburnu siper/karşı taarruz hattı.' },
    { id: '57-alay-post-evac', unitId: '57-alay', start: '1915-12-20', end: '1916-01-09', kind: 'inferred', confidence: 'medium', tolerance: 420, point: LOC.bigali, sourceIds: ['nz-history-anzac-suvla'], note: 'Tahliye sonrası yarımada içi savunma.' },

    { id: '27-alay-eceabat-defense', unitId: '27-alay', start: '1914-11-03', end: '1915-04-24', kind: 'inferred', confidence: 'medium', tolerance: 260, point: LOC.eceabat, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: 'Maydos/Eceabat savunması.' },
    { id: '27-alay-ariburnu-line', unitId: '27-alay', start: '1915-04-27', end: '1915-08-05', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 240, point: { x: 1260, y: 1788 }, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: 'Arıburnu ilk savunma hattı.' },
    { id: '27-alay-conkbayiri-line', unitId: '27-alay', start: '1915-08-06', end: '1915-12-19', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 250, point: LOC.conkbayiri, sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], note: 'Conkbayırı/Sarı Bayır savunması.' },
    { id: '27-alay-post-evac', unitId: '27-alay', start: '1915-12-20', end: '1916-01-09', kind: 'inferred', confidence: 'medium', tolerance: 420, point: LOC.bigali, sourceIds: ['nz-history-anzac-suvla'], note: 'Tahliye sonrası geride kalan savunma.' },

    { id: '7-tumen-seddulbahir-defense', unitId: '7-tumen', start: '1914-11-03', end: '1915-04-24', kind: 'frontline', side: 'ottoman', confidence: 'medium', tolerance: 260, point: LOC.seddulbahir, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'Güney yarımada kıyı savunması.' },
    { id: '7-tumen-v-beach-defense', unitId: '7-tumen', start: '1915-04-25', end: '1915-06-30', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 220, point: { x: 1033, y: 2399 }, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'Seddülbahir V/W Beach savunması.' },
    { id: '7-tumen-alcitepe-line', unitId: '7-tumen', start: '1915-07-01', end: '1916-01-09', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 260, point: { x: 1225, y: 2285 }, sourceIds: ['anzac-portal-gallipoli-maps'], note: 'Helles/Alçıtepe savunma hattı.' },

    { id: '9-tumen-kilitbahir-defense', unitId: '9-tumen', start: '1914-11-03', end: '1915-04-24', kind: 'frontline', side: 'ottoman', confidence: 'medium', tolerance: 260, point: { x: 1375, y: 2135 }, sourceIds: ['national-archives-map-series', 'dardanelles-defences-1915'], note: 'Boğaz ve güney tahkimat savunması; Müstahkem Mevki komuta düğümünden ayrı savunma sektörü.' },
    { id: '9-tumen-helles-line', unitId: '9-tumen', start: '1915-04-25', end: '1916-01-09', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 260, point: { x: 1060, y: 2325 }, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'Seddülbahir/Kirte savunması.' },

    { id: '5-tumen-eceabat-reserve', unitId: '5-tumen', start: '1914-11-03', end: '1915-04-24', kind: 'inferred', confidence: 'medium', tolerance: 280, point: LOC.eceabat, sourceIds: ['national-archives-map-series', 'anzac-portal-gallipoli-maps'], note: 'Eceabat-Maydos güney savunma rezervi.' },
    { id: '5-tumen-seddulbahir-line', unitId: '5-tumen', start: '1915-04-25', end: '1915-06-30', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 260, point: { x: 1080, y: 2320 }, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'Seddülbahir/Kirte muharebe hattı.' },
    { id: '5-tumen-kirte-line', unitId: '5-tumen', start: '1915-07-01', end: '1916-01-09', kind: 'frontline', side: 'ottoman', confidence: 'high', tolerance: 260, point: { x: 1148, y: 2328 }, sourceIds: ['anzac-portal-gallipoli-maps'], note: 'Kirte/Alçıtepe siper hattı.' },

    { id: '29-div-x-beach-landing', unitId: '29-div', start: '1915-04-25', end: '1915-04-28', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 220, point: LOC.xBeach, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'X Beach/İkiz Koyu ayrı çıkarma noktası; V/W Beach ve River Clyde hattını tamamlayan Helles inişi.' },
    { id: '29-div-helles-front', unitId: '29-div', start: '1915-04-29', end: '1915-12-31', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 260, point: { x: 1039, y: 2325 }, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'Helles köprübaşı ve Kirte yönü.' },
    { id: '29-div-final-evac-proxy', unitId: '29-div', start: '1916-01-09', end: '1916-01-09', kind: 'frontline', side: 'allied', confidence: 'medium', tolerance: 280, point: LOC.seddulbahir, sourceIds: ['anzac-portal-gallipoli-maps'], note: 'Helles son tahliye günü.' },
    { id: 'ix-corps-suvla-landing', unitId: 'ix-corps', start: '1915-08-06', end: '1915-08-20', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 260, point: LOC.suvla, sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], note: 'Suvla çıkarması ve Anafartalar yükseltilerine geciken ilerleme.' },
    { id: 'ix-corps-suvla-front', unitId: 'ix-corps', start: '1915-08-21', end: '1915-12-20', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 280, point: { x: 1225, y: 1600 }, sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], note: 'Scimitar Hill/Kireçtepe sonrası Suvla köprübaşı.' },
    { id: 'ss-river-clyde-v-beach', unitId: 'ss-river-clyde', start: '1915-04-25', end: '1915-04-27', kind: 'exact', side: 'allied', confidence: 'high', tolerance: 90, point: { x: 1024, y: 2392 }, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'SS River Clyde V Beach önünde karaya oturtulan çıkarma platformu.' },

    { id: 'anzac-old-anzac-front', unitId: 'anzac-1div', start: '1915-04-29', end: '1915-08-05', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 240, point: { x: 1246, y: 1788 }, sourceIds: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'], note: 'Old Anzac dar cephe hattı.' },
    { id: 'anzac-august-held-ground', unitId: 'anzac-1div', start: '1915-08-06', end: '1915-12-06', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 260, point: { x: 1238, y: 1755 }, sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], note: 'Ağustos sonrası Anzac-Suvla bağlantı cephesi.' },

    { id: 'nz-anzac-front-before-august', unitId: 'nz-inf', start: '1915-04-25', end: '1915-08-05', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 240, point: { x: 1244, y: 1782 }, sourceIds: ['te-ara-gallipoli-map', 'anzac-portal-gallipoli-maps'], note: 'Anzac mevzileri; Ağustos taarruzuna kadar.' },
    { id: 'nz-after-chunuk-bair', unitId: 'nz-inf', start: '1915-08-11', end: '1915-12-06', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 260, point: { x: 1240, y: 1760 }, sourceIds: ['te-ara-gallipoli-map', 'nz-history-anzac-suvla'], note: 'Conkbayırı sonrası Anzac hattına dönüş.' },

    { id: 'fr-corps-helles-right', unitId: 'fr-corps', start: '1915-04-29', end: '1915-12-31', kind: 'frontline', side: 'allied', confidence: 'high', tolerance: 260, point: { x: 1063, y: 2358 }, sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], note: 'Helles sağ kanat Fransız sektörü.' },
    { id: 'fr-corps-final-evac-proxy', unitId: 'fr-corps', start: '1916-01-09', end: '1916-01-09', kind: 'frontline', side: 'allied', confidence: 'medium', tolerance: 280, point: LOC.seddulbahir, sourceIds: ['anzac-portal-gallipoli-maps'], note: 'Helles son tahliye günü.' }
];

export const HISTORICAL_FRONTLINE_SNAPSHOTS = [
    { id: 'old-anzac-april-august', start: '1915-04-25', end: '1915-08-05', side1: 'allied', side2: 'ottoman', sourceIds: ['anzac-portal-gallipoli-maps', 'te-ara-gallipoli-map'], points: [{ x: 1246, y: 1788 }, { x: 1240, y: 1768 }, { x: 1236, y: 1744 }] },
    { id: 'anzac-suvla-august-december', start: '1915-08-06', end: '1915-12-20', side1: 'allied', side2: 'ottoman', sourceIds: ['awm-anzac-suvla-1915', 'nz-history-anzac-suvla'], points: [{ x: 1246, y: 1788 }, { x: 1238, y: 1755 }, { x: 1236, y: 1744 }, { x: 1264, y: 1622 }] },
    { id: 'helles-april-january', start: '1915-04-25', end: '1916-01-09', side1: 'allied', side2: 'ottoman', sourceIds: ['anzac-portal-gallipoli-maps', 'national-archives-map-series'], points: [{ x: 1033, y: 2399 }, { x: 1085, y: 2305 }, { x: 1117, y: 2251 }] }
];

function isoDay(iso) {
    const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 0;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000;
}

function inRange(item, isoDate) {
    if (!isoDate) return false;
    if (item.exactDate) return isoDate === item.exactDate;
    return isoDate >= item.start && isoDate <= item.end;
}

function normalizeProgress(isoDate, start, end) {
    const a = isoDay(start);
    const b = isoDay(end);
    const value = isoDay(isoDate);
    if (!a || !b || b <= a) return 0;
    return Math.max(0, Math.min(1, (value - a) / (b - a)));
}

function interpolate(points, t) {
    if (!Array.isArray(points) || !points.length) return null;
    if (points.length === 1) return points[0];
    const scaled = Math.max(0, Math.min(1, t)) * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(scaled));
    const localT = scaled - index;
    const a = points[index];
    const b = points[index + 1];
    return {
        x: a.x + (b.x - a.x) * localT,
        y: a.y + (b.y - a.y) * localT
    };
}

function clonePoint(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    return { x: point.x, y: point.y };
}

function normalizePlacement(record, point, extra = {}) {
    if (!record || !point) return null;
    return {
        id: record.id,
        unitId: record.unitId,
        kind: record.kind || 'inferred',
        confidence: record.confidence || 'medium',
        tolerance: record.tolerance || 180,
        sourceIds: Array.isArray(record.sourceIds) ? record.sourceIds : [],
        note: record.note || '',
        side: record.side,
        point: clonePoint(point),
        ...extra
    };
}

export function getHistoricalSourcesForIds(sourceIds = []) {
    return sourceIds
        .map((id) => HISTORICAL_SOURCES[id])
        .filter(Boolean);
}

export function getHistoricalRouteForUnit(unitId, isoDate) {
    const id = typeof unitId === 'string' ? unitId : unitId?.id;
    if (!id || !isoDate) return null;
    return HISTORICAL_ROUTES.find((route) => route.unitIds.includes(id) && inRange(route, isoDate)) || null;
}

export function getHistoricalAnchorForUnit(unitId, isoDate) {
    const id = typeof unitId === 'string' ? unitId : unitId?.id;
    if (!id || !isoDate) return null;
    const exact = HISTORICAL_ANCHORS.find((anchor) => anchor.unitId === id && anchor.exactDate === isoDate);
    if (exact) return exact;
    return HISTORICAL_ANCHORS.find((anchor) => anchor.unitId === id && !anchor.exactDate && inRange(anchor, isoDate)) || null;
}

export function getHistoricalPlacementForUnit(unitOrId, isoDate) {
    const unitId = typeof unitOrId === 'string' ? unitOrId : unitOrId?.id;
    if (!unitId || !isoDate) return null;

    // ── ÖNCELİK 0: Kampanya Hareket Rehberi ("mekke") ──
    // Birim bu günü kapsayan sürekli keyframe zaman çizelgesine sahipse,
    // yumuşak interpolasyonlu konum buradan gelir (gün-gün akıcı hareket).
    // Kapsam dışıysa null döner ve aşağıdaki eski anchor/route katmanına düşülür.
    const guided = resolveCampaignMovement(unitId, isoDate);
    if (guided && guided.point) return guided;

    const exactAnchor = HISTORICAL_ANCHORS.find((anchor) => anchor.unitId === unitId && anchor.exactDate === isoDate);
    if (exactAnchor) {
        return normalizePlacement(exactAnchor, exactAnchor.point, { anchorId: exactAnchor.id });
    }

    const route = getHistoricalRouteForUnit(unitId, isoDate);
    if (route) {
        const point = interpolate(route.points, normalizeProgress(isoDate, route.start, route.end));
        return normalizePlacement({ ...route, unitId, kind: 'route' }, point, { routeId: route.id });
    }

    const anchor = getHistoricalAnchorForUnit(unitId, isoDate);
    if (anchor) {
        return normalizePlacement(anchor, anchor.point, { anchorId: anchor.id });
    }

    return null;
}

export function getHistoricalFrontlineSnapshot(isoDate, id = null) {
    return HISTORICAL_FRONTLINE_SNAPSHOTS.find((snapshot) => {
        if (id && snapshot.id !== id) return false;
        return isoDate >= snapshot.start && isoDate <= snapshot.end;
    }) || null;
}

function pointInBounds(point) {
    return point && point.x >= VP_MIN_X && point.x <= VP_MAX_X && point.y >= VP_MIN_Y && point.y <= VP_MAX_Y;
}

export function getHistoricalDataDiagnostics() {
    const issues = [];
    const knownSources = new Set(Object.keys(HISTORICAL_SOURCES));

    const checkSources = (record, kind) => {
        if (!Array.isArray(record.sourceIds) || !record.sourceIds.length) {
            issues.push({ type: 'missing-source', kind, id: record.id, message: `${record.id} kaynak referansı taşımıyor.` });
            return;
        }
        record.sourceIds.forEach((sourceId) => {
            if (!knownSources.has(sourceId)) {
                issues.push({ type: 'unknown-source', kind, id: record.id, sourceId, message: `${record.id} bilinmeyen kaynak kullanıyor: ${sourceId}.` });
            }
        });
    };

    HISTORICAL_ANCHORS.forEach((anchor) => {
        checkSources(anchor, 'anchor');
        if (!anchor.unitId) issues.push({ type: 'missing-unit', kind: 'anchor', id: anchor.id, message: `${anchor.id} unitId taşımıyor.` });
        if (!anchor.exactDate && (!anchor.start || !anchor.end)) issues.push({ type: 'missing-date-range', kind: 'anchor', id: anchor.id, message: `${anchor.id} tarih aralığı taşımıyor.` });
        if (!pointInBounds(anchor.point)) issues.push({ type: 'point-out-of-bounds', kind: 'anchor', id: anchor.id, point: anchor.point, message: `${anchor.id} harita sınırları dışında.` });
    });

    HISTORICAL_ROUTES.forEach((route) => {
        checkSources(route, 'route');
        if (!Array.isArray(route.unitIds) || !route.unitIds.length) issues.push({ type: 'missing-unit', kind: 'route', id: route.id, message: `${route.id} unitIds taşımıyor.` });
        if (!route.start || !route.end) issues.push({ type: 'missing-date-range', kind: 'route', id: route.id, message: `${route.id} tarih aralığı taşımıyor.` });
        if (!Array.isArray(route.points) || route.points.length < 2) issues.push({ type: 'route-too-short', kind: 'route', id: route.id, message: `${route.id} en az iki rota noktası taşımalı.` });
        (route.points || []).forEach((point, index) => {
            if (!pointInBounds(point)) issues.push({ type: 'point-out-of-bounds', kind: 'route', id: route.id, pointIndex: index, point, message: `${route.id} rota noktası sınır dışında.` });
        });
    });

    HISTORICAL_CALIBRATION_POINTS.forEach((point) => {
        checkSources(point, 'calibration');
        if (!pointInBounds(point.point)) issues.push({ type: 'point-out-of-bounds', kind: 'calibration', id: point.id, point: point.point, message: `${point.id} kalibrasyon noktası sınır dışında.` });
        if (Number(point.residualPx || 0) > 80) issues.push({ type: 'high-residual', kind: 'calibration', id: point.id, residualPx: point.residualPx, message: `${point.id} kaynak harita residual değeri yüksek.` });
    });

    return issues;
}

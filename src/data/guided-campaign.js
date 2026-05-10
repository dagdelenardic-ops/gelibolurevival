// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Guided Campaign Omurgası
// Kullanıcının 10 dakikalık ana kampanya akışında gördüğü 6 bölüm.
// ══════════════════════════════════════════════════════════════

export const GUIDED_CAMPAIGN_CHAPTERS = [
    {
        id: 'opening',
        title: 'İlk Bombardıman',
        shortTitle: 'Başlangıç',
        startIso: '1914-11-03',
        endIso: '1915-02-18',
        defaultLocations: ['seddulbahir', 'kumkale', 'bogaz', 'canakkale'],
        primaryUnitIds: ['mustahkem-mevki', 'nusret', '7-tumen', '9-tumen'],
        promise: 'Boğaz savunması uyarıldı; savaş artık harita üzerinde kuruluyor.',
        outcome: 'Osmanlı hazırlıkları hızlandı, kıyı bataryaları ve mayın hatları önem kazandı.',
        metricLabel: 'Hazırlık evresi',
        casualtyLabel: 'Düşük yoğunluk'
    },
    {
        id: 'nusret',
        title: 'Deniz ve Nusret',
        shortTitle: 'Nusret',
        startIso: '1915-02-19',
        endIso: '1915-03-17',
        defaultLocations: ['bogaz', 'kilitbahir', 'erenkoyu', 'canakkale'],
        primaryUnitIds: ['nusret', 'allied-minesweepers', 'mustahkem-mevki'],
        promise: 'İtilaf donanması Boğazı zorlar; mayın tarama başarısız kalır.',
        outcome: '7/8 Mart gecesi Erenköy hattı 18 Martın sonucunu belirleyecek hale geldi.',
        metricLabel: 'Mayın savaşı',
        casualtyLabel: 'Yükselen risk'
    },
    {
        id: 'march18',
        title: '18 Mart',
        shortTitle: '18 Mart',
        startIso: '1915-03-18',
        endIso: '1915-04-24',
        defaultLocations: ['bogaz', 'kilitbahir', 'erenkoyu', 'canakkale'],
        primaryUnitIds: ['mustahkem-mevki', 'nusret', 'bouvet', 'hms-irresistible', 'hms-ocean'],
        promise: 'Kıyı bataryaları ve Nusret hattı donanmayı durdurur.',
        outcome: 'Bouvet, Irresistible ve Ocean battı; denizden geçiş planı çöktü.',
        metricLabel: '3 zırhlı battı',
        casualtyLabel: '~640 Bouvet kaybı'
    },
    {
        id: 'landings',
        title: '25 Nisan Çıkarmaları',
        shortTitle: 'Çıkarma',
        startIso: '1915-04-25',
        endIso: '1915-08-05',
        defaultLocations: ['ariburnu', 'seddulbahir', 'x-beach', 'bigali', 'alcitepe'],
        primaryUnitIds: ['19-tumen', '57-alay', '27-alay', '29-div', 'anzac-1div', 'ss-river-clyde'],
        maxVisibleUnits: 7,
        scoreFloor: 5,
        factionUnitCaps: { ottoman: 3, british: 2, anzac: 2, french: 1 },
        promise: 'İtilaf karaya çıkar; Arıburnu ve Seddülbahir ayrı krizlere dönüşür.',
        outcome: 'Mustafa Kemal Conkbayırını kapattı; V Beach ve Kirte hattı kanlı bir siper savaşına döndü.',
        metricLabel: 'İki ana cephe',
        casualtyLabel: 'Ağır çıkarma kayıpları'
    },
    {
        id: 'august',
        title: 'Conkbayırı ve Anafartalar',
        shortTitle: 'Conkbayırı',
        startIso: '1915-08-06',
        endIso: '1915-12-06',
        defaultLocations: ['suvla', 'anafartalar', 'conkbayiri', 'ariburnu'],
        primaryUnitIds: ['19-tumen', '27-alay', 'ix-corps', 'anzac-1div', 'nz-inf', '5-ordu'],
        maxVisibleUnits: 7,
        scoreFloor: 5,
        factionUnitCaps: { ottoman: 3, british: 2, anzac: 2, french: 0 },
        promise: 'Son büyük İtilaf hamlesi yüksek sırtları almaya çalışır.',
        outcome: '10 Ağustos karşı taarruzu Conkbayırını geri aldı; kampanyanın kırılma anı geldi.',
        metricLabel: 'Son büyük hamle',
        casualtyLabel: 'Çok yüksek yıpranma'
    },
    {
        id: 'evacuation',
        title: 'Tahliye',
        shortTitle: 'Tahliye',
        startIso: '1915-12-07',
        endIso: '1916-01-09',
        defaultLocations: ['ariburnu', 'suvla', 'seddulbahir', 'morto-koyu'],
        primaryUnitIds: ['29-div', 'fr-corps', 'anzac-1div', '5-ordu', '3-kolordu'],
        promise: 'İtilaf kuvvetleri sessizce yarımadadan çekilir.',
        outcome: 'Arıburnu, Anafartalar ve Seddülbahir boşaltıldı; kampanya yarım milyonu aşan kayıpla bitti.',
        metricLabel: 'Kampanya sonu',
        casualtyLabel: '500.000+ toplam kayıp'
    }
];

export function getGuidedCampaignChapters() {
    return GUIDED_CAMPAIGN_CHAPTERS;
}

export function getGuidedCampaignChapter(isoDate) {
    const iso = String(isoDate || '');
    return GUIDED_CAMPAIGN_CHAPTERS.find((chapter) => iso >= chapter.startIso && iso <= chapter.endIso)
        || GUIDED_CAMPAIGN_CHAPTERS[0];
}

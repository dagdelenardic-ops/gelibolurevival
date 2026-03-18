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
        cropFocus: 'center',
        context:  '3 Kasım 1914\'te İngiliz ve Fransız savaş gemileri Seddülbahir ve Kumkale tabyalarını bombaladı. Bu saldırı Osmanlı\'yı uyararak Boğaz savunmasının güçlendirilmesine yol açtı — stratejik bir hata.',
    },
    // ── 2. Osmanlı Savaş İlanı / Cihat ──
    {
        startIso: '1914-11-10',
        endIso:   '1914-11-16',
        url:      `${P}/sultan-mehmed-v.jpg`,
        caption:  'Sultan V. Mehmed — Cihat ilanı, 14 Kasım 1914',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 20%',
        context:  'Sultan V. Mehmed, 14 Kasım 1914\'te İtilaf Devletleri\'ne karşı cihat ilan etti. Bu karar Osmanlı İmparatorluğu\'nu resmen I. Dünya Savaşı\'na soktu ve Çanakkale Cephesi\'nin açılmasına zemin hazırladı.',
    },
    // ── 2a. Enver Paşa — Savaş kararı ──
    {
        startIso: '1914-11-17',
        endIso:   '1914-11-30',
        url:      `${P}/enver-pasha.jpg`,
        caption:  'Enver Paşa — Harbiye Nazırı, savaş kararının mimarı',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 20%',
        context:  'Harbiye Nazırı Enver Paşa, Osmanlı\'nın Almanya safında savaşa girmesinin baş mimarıydı. Boğazların savunmasını en yüksek öncelik ilan ederek kıyı bataryalarının takviyesini ve mayın hatlarının döşenmesini emretti.',
    },
    // ── 2b. Kilitbahir Kalesi — Boğaz savunmasının kalbi ──
    {
        startIso: '1914-12-01',
        endIso:   '1914-12-20',
        url:      `${P}/kilitbahir-castle.jpg`,
        caption:  'Kilitbahir Kalesi — Boğaz savunmasının merkezi',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center',
        context:  'Kilitbahir Kalesi, Boğaz\'ın en dar noktasını kontrol eden kilit savunma mevziiydi. Osmanlı mühendisleri Aralık 1914\'te kaleyi modern toplarla tahkim ederek mayın hatlarını koruyan ateş şemsiyesi oluşturdu.',
    },
    // ── 2c. Cevat Paşa — Müstahkem Mevki Komutanı ──
    {
        startIso: '1914-12-21',
        endIso:   '1915-01-07',
        url:      `${P}/cevat-pasha.jpg`,
        caption:  'Cevat Paşa (Çobanlı) — Çanakkale Müstahkem Mevki Komutanı',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 20%',
        context:  'Cevat Paşa (Çobanlı), Çanakkale Müstahkem Mevki Komutanı olarak Boğaz savunmasının asıl yöneticisiydi. 82 sabit top ve 230 seyyar topun koordinasyonunu sağlayarak İtilaf donanmasına karşı çok katmanlı savunma hattı kurdu.',
    },
    // ── 2d. Churchill — Gelibolu harekâtının politik mimarı ──
    {
        startIso: '1915-01-08',
        endIso:   '1915-01-25',
        url:      `${P}/churchill-1914.jpg`,
        caption:  'Winston Churchill — Bahriye Nazırı, Çanakkale harekâtının mimarı',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 25%',
        context:  'İngiliz Bahriye Nazırı Winston Churchill, Çanakkale harekâtının en ateşli savunucusuydu. 13 Ocak 1915\'te Savaş Konseyi\'ni Boğazları denizden zorlamaya ikna etti. Harekâtın başarısızlığı siyasi kariyerini geçici olarak sona erdirecekti.',
    },
    // ── 2e. Osmanlı siperleri — Boğaz savunma tahkimatı ──
    {
        startIso: '1915-01-26',
        endIso:   '1915-02-08',
        url:      `${P}/ottoman-soldiers-trench.jpg`,
        caption:  'Osmanlı askerleri siperde — Çanakkale savunma hattı',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center',
        context:  'Ocak-Şubat 1915\'te Osmanlı birlikleri Gelibolu Yarımadası boyunca savunma mevzileri inşa etti. Kıyı tahkimatları, tel örgüler ve siper hatları olası bir kara çıkarmasına karşı hazırlandı.',
    },
    // ── 2f. Boğaz savunma haritası — tahkimat düzeni ──
    {
        startIso: '1915-02-09',
        endIso:   '1915-02-18',
        url:      `${P}/dardanelles-map-1915.jpg`,
        caption:  'Çanakkale Boğazı savunma düzeni — 1915 haritası',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center',
        context:  'Şubat 1915 itibarıyla Boğaz savunması çok katmanlı bir sistem haline geldi: 11 sıra mayın hattı (toplam 373 mayın), kıyı bataryaları, seyyar obüsler ve Nusret mayın gemisinin gizli seferleri. İtilaf donanması 19 Şubat\'ta ilk büyük saldırıyı başlatacaktı.',
    },
    // ── 3. Deniz Harekâtı Başlangıcı / Bombardıman Dönemi ──
    {
        startIso: '1915-02-19',
        endIso:   '1915-03-06',
        url:      `${P}/ottoman-heavy-gun.jpg`,
        caption:  'Osmanlı ağır topu, Çanakkale Boğazı savunması',
        source:   'Bundesarchiv, CC BY-SA 3.0',
        cropFocus: 'center 30%',
        context:  '19 Şubat 1915\'te İtilaf donanması Boğaz giriş tabyalarına ağır bombardıman başlattı. Osmanlı topçuları ilk atışlarda geri çekilerek İngilizleri yanılttı, ardından seyyar bataryalarla karşı ateşe geçerek düşman gemilerini Boğaz\'dan uzak tuttu.',
    },
    // ── 4. Nusret Mayın Seferi ──
    {
        startIso: '1915-03-07',
        endIso:   '1915-03-10',
        url:      `${P}/nusret-1912.png`,
        caption:  'Nusret Mayın Gemisi — 1912 deniz denemesi',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center',
        context:  '7-8 Mart 1915 gecesi Nusret mayın gemisi, Kolağası Nazmi Bey komutasında Erenköy Koyu\'na 26 mayın döşedi. Bu mayınlar İtilaf donanmasının taramadığı bir hatta, kıyıya paralel yerleştirildi — 18 Mart felaketinin habercisiydi.',
    },
    // ── 5. Mayın Temizleme / 18 Mart Öncesi ──
    {
        startIso: '1915-03-11',
        endIso:   '1915-03-17',
        url:      `${P}/ottoman-battery.jpg`,
        caption:  'Osmanlı topçu bataryası — Boğaz savunması',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 30%',
        context:  'İngiliz mayın tarama gemileri (trawler\'lar) her gece Boğaz\'a girmeye çalıştı ama Osmanlı projektörleri ve seyyar topçu ateşi altında geri çekilmek zorunda kaldı. Mayın tarama başarısızlığı, 18 Mart\'taki deniz saldırısının kaderini belirledi.',
    },
    // ── 6. 18 Mart Deniz Zaferi — Bouvet Batışı ──
    {
        startIso: '1915-03-18',
        endIso:   '1915-03-22',
        url:      `${P}/bouvet-sinking.jpg`,
        caption:  'Bouvet zırhlısının batışı — 18 Mart 1915',
        source:   'TSK Arşivi, Wikimedia Commons',
        cropFocus: 'center',
        context:  '18 Mart 1915: İtilaf\'ın en büyük deniz saldırısı. 18 savaş gemisi Boğaz\'a girdi. Nusret\'in mayınlarına çarpan Bouvet 2 dakikada battı (~640 şehit). Irresistible ve Ocean da mayına çarparak battı. İtilaf 3 zırhlı kaybetti, Boğaz geçilemeyeceği anlaşıldı.',
    },
    // ── 7. 5. Ordu Kuruluşu — Savunma Hazırlığı ──
    {
        startIso: '1915-03-23',
        endIso:   '1915-04-24',
        url:      `${P}/ottoman-battery.jpg`,
        caption:  'Osmanlı topçu bataryası, Gelibolu savunma hazırlığı',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 30%',
        context:  'Deniz saldırısının başarısızlığı üzerine İtilaf kara çıkarmasına karar verdi. Alman Mareşal Liman von Sanders komutasında 5. Ordu kurularak yarımada savunmasını üstlendi. Mustafa Kemal\'in 19. Tümeni Bigalı\'ya konuşlandırıldı — kritik bir öngörü.',
    },
    // ── 8. Büyük Kara Çıkarması — 25 Nisan ──
    {
        startIso: '1915-04-25',
        endIso:   '1915-04-25',
        url:      `${P}/anzac-landing-painting.jpg`,
        caption:  '«Anzac, the Landing» — 25 Nisan çıkarma tablosu',
        source:   'Charles Dixon, Australian War Memorial, Public Domain',
        cropFocus: 'center 30%',
        context:  '25 Nisan 1915 şafağında İtilaf kuvvetleri beş noktadan çıkarma yaptı. ANZAC birlikleri Arıburnu\'na çıktı ama planlanan noktanın 1.5 km kuzeyine sürüklendi. Mustafa Kemal 57. Alay\'ı "Ben size taarruzu emretmiyorum, ölmeyi emrediyorum!" emriyle karşı taarruza geçirdi.',
    },
    // ── 9. ANZAC Çıkarması Sonrası ──
    {
        startIso: '1915-04-26',
        endIso:   '1915-04-27',
        url:      `${P}/anzac-landing.jpg`,
        caption:  'ANZAC çıkarması — 25 Nisan 1915, Arıburnu',
        source:   'Australian War Memorial, Public Domain',
        cropFocus: 'center 30%',
        context:  'Çıkarmanın ilk 48 saatinde ANZAC birlikleri dar bir kıyı şeridine sıkıştı. Sarp yamaçlar ve Osmanlı ateşi ilerlemeyi imkânsız kıldı. Avustralya ve Yeni Zelanda askerleri siperlere gömülerek 8 ay sürecek bir savunma savaşına başladı.',
    },
    // ── 10. V Beach / Seddülbahir ──
    {
        startIso: '1915-04-28',
        endIso:   '1915-05-05',
        url:      `${P}/v-beach-river-clyde.jpg`,
        caption:  'V Beach ve Seddülbahir kalesi — SS River Clyde\'dan görünüm',
        source:   'Royal Museums Greenwich, Public Domain',
        cropFocus: 'center 30%',
        context:  'V Beach çıkarması savaşın en kanlı sahnelerinden biriydi. SS River Clyde\'dan çıkan İngiliz askerleri Osmanlı makineli tüfek ateşiyle karşılaştı — ilk dalganın %70\'i kıyıya bile ulaşamadan düştü. Seddülbahir kalesi ancak ikinci gün alınabildi.',
    },
    // ── 11. W Beach / Helles ──
    {
        startIso: '1915-05-06',
        endIso:   '1915-05-14',
        url:      `${P}/w-beach-helles.jpg`,
        caption:  'W Beach, Helles — Lancashire Fusiliers çıkarması',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 30%',
        context:  'W Beach\'te Lancashire Fusiliers alayı tel örgüler ve mayınlar arasından sahile çıktı. "Altı Victoria Haçı\'nın kazanıldığı sahil" olarak tarihe geçti. Helles cephesinde İngilizler Alçıtepe\'yi (Achi Baba) asla ele geçiremeyecekti — hedef sadece 6 km uzaktaydı.',
    },
    // ── 12. Osmanlı Taarruzu / 19 Mayıs ──
    {
        startIso: '1915-05-15',
        endIso:   '1915-05-24',
        url:      `${P}/ottoman-assault.jpg`,
        caption:  'Osmanlı askerleri taarruzda — Çanakkale 1915',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 30%',
        context:  '19 Mayıs 1915\'te Osmanlı 42.000 askerle ANZAC mevzilerine genel taarruz düzenledi. Saldırı ağır kayıplarla püskürtüldü — 3.000\'den fazla Osmanlı askeri şehit düştü. 24 Mayıs\'ta ceset toplama ateşkesi yapıldı; düşman askerler birbirine sigara ve çikolata verdi.',
    },
    // ── 13. Siper Savaşı Dönemi — Osmanlı Siperleri ──
    {
        startIso: '1915-05-25',
        endIso:   '1915-06-15',
        url:      `${P}/ottoman-trench.jpg`,
        caption:  'Osmanlı siperleri — Çanakkale Cephesi',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 30%',
        context:  'Mayıs sonu itibarıyla cephe dondu. İki taraf da birbirinden 10-50 metre uzaklıkta siperler kazdı. Churchill, harekâtın başarısızlığı nedeniyle 25 Mayıs\'ta Bahriye Nazırlığı\'ndan düşürüldü — siyasi kariyerindeki en büyük darbe.',
    },
    // ── 14. Siper Savaşı — MG Mevzisi ──
    {
        startIso: '1915-06-16',
        endIso:   '1915-08-02',
        url:      `${P}/ottoman-mg.jpg`,
        caption:  'Osmanlı makineli tüfek mevzisi — Çanakkale',
        source:   'Bundesarchiv, CC BY-SA 3.0',
        cropFocus: 'center 30%',
        context:  'Haziran-Temmuz 1915\'te üç Kirte muharebesi ve Zığındere saldırıları yapıldı ama İngilizler Alçıtepe\'ye ulaşamadı. Osmanlı makineli tüfekleri dar cephe hatlarını savunmada belirleyici oldu. Her iki tarafta da hastalık ve bitkinlik arttı.',
    },
    // ── 15. Conkbayırı / Anafartalar — Mustafa Kemal ──
    {
        startIso: '1915-08-03',
        endIso:   '1915-08-21',
        url:      `${P}/mustafa-kemal-gallipoli.jpg`,
        caption:  'Yarbay Mustafa Kemal — Anafartalar Grup Komutanı, 1915',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 25%',
        context:  'Ağustos taarruzu kampanyanın doruk noktasıydı. 6 Ağustos\'ta Suvla\'ya yeni çıkarma yapıldı, Yeni Zelanda Tugayı 8 Ağustos\'ta Conkbayırı zirvesine ulaştı. Mustafa Kemal 10 Ağustos\'ta bizzat süngü hücumu yöneterek zirveyi geri aldı — göğsündeki saat parçayı durdurarak hayatını kurtardı.',
    },
    // ── 16. Mustafa Kemal ve silah arkadaşları ──
    {
        startIso: '1915-08-22',
        endIso:   '1915-10-14',
        url:      `${P}/ataturk-anafartalar.jpg`,
        caption:  'Mustafa Kemal Bey ve silah arkadaşları — Anafartalar, 1915',
        source:   'Wikimedia Commons, Public Domain',
        cropFocus: 'center 15%',
        context:  'Anafartalar zaferinden sonra cephe kesin olarak durağanlaştı. İtilaf kuvvetleri dar köprübaşlarına sıkışmış, Osmanlı birlikleri yüksek zemini kontrol ediyordu. Eylül-Ekim aylarında Bulgaristan\'ın savaşa girmesi ve Sırbistan\'ın düşmesi Gelibolu\'nun stratejik önemini ortadan kaldırdı.',
    },
    // ── 17. Siper Savaşı Son Dönemi ──
    {
        startIso: '1915-10-15',
        endIso:   '1915-12-06',
        url:      `${P}/anzac-trench.jpg`,
        caption:  'ANZAC siperleri — Arıburnu',
        source:   'Australian War Memorial, Public Domain',
        cropFocus: 'center 30%',
        context:  'Lord Kitchener Kasım\'da Gelibolu\'yu ziyaret ederek tahliye kararını onayladı. Siperlerde kış koşulları ağırlaştı — dondurucu soğuk, sel baskınları ve hastalıklar kayıpları artırdı. Her iki taraf yaklaşık 250.000\'er kayıp verdi.',
    },
    // ── 18. Tahliye Dönemi ──
    {
        startIso: '1915-12-07',
        endIso:   '1916-01-09',
        url:      `${P}/periscope-rifle.jpg`,
        caption:  'Periskoplu tüfek — Tahliye öncesi ANZAC buluşu',
        source:   'Australian War Memorial, Public Domain',
        cropFocus: 'center 30%',
        context:  'Tahliye harekâtı savaşın en başarılı operasyonu oldu. ANZAC\'lar periskoplu tüfekler ve zamanlı ateş düzenekleriyle siperlerin dolu olduğu izlenimini yarattı. 83.000 asker, 186 top ve 1.700 at tek kayıp vermeden tahliye edildi. 9 Ocak 1916\'da son asker yarımadayı terk etti.',
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

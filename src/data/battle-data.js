// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Savaş Verileri
// Faksiyonlar, askeri birimler, savaş fazları, konum bilgileri
// ══════════════════════════════════════════════════════════════

import { GEO_LOCATIONS } from './geo-calibration.js?v=20260508-sprint-r1';

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
        // ══════════════════════════════════════════════════════════
        // BİRİM POZİSYONLARI — naval-assault fazı (18 Mart 1915)
        //
        // Tarihsel dağılım:
        //   ● Osmanlı kara: yarımada boyunca savunma hatlarında
        //   ● Nusret: Erenköy Koyu (Asya yakası)
        //   ● İtilaf donanması: Boğaz girişinden Narrows'a hat halinde
        //   ● İtilaf kara: henüz çıkarmamış (Ege/Limni'de hazırlık)
        //
        // Gemiler Boğaz suyunda (peninsula-asia arası), kara birlikleri
        // peninsula polygon İÇİNDE veya Asya polygon içinde olmalı.
        // ══════════════════════════════════════════════════════════

        // ── OSMANLI KARA KUVVETLERİ ──
        {
            id: "5-ordu", name: "5. Ordu Karargâhı", faction: "ottoman", type: "ordu",
            entityType: "infantry_unit", unitClass: "army_hq", side: "ottoman", anchorRegion: "gelibolu",
            commander: "Mareşal Liman von Sanders", strength: 84000,
            description: "Çanakkale Yarımadası'nın tüm savunmasını yöneten karargâh. Alman Mareşal Liman von Sanders Mart 1915'te Falkenhayn'ın emriyle komutayı devraldı ve savunma planını kökten yeniden örgütledi: büyük yedek kuvvetler oluşturdu, yarımada içi ulaşımı güçlendirdi, İtilaf'ın olası çıkarma noktalarını tahmin etmeye çalıştı. Bağlı kuvvetler: 3. Kolordu (Esat Paşa, 25.000), Çanakkale Müstahkem Mevki (Cevat Paşa, 20.000). Gelibolu kasabasında karargâh kurdu; tüm kara ve deniz savunması buradan koordine edildi. Von Sanders, 25 Nisan'da ANZAC'ın Arıburnu'na çıkacağını önceden tahmin edemedi — bu büyük eleştiri konusu oldu.",
            phases: { "naval-assault": { x: 1095, y: 1785, status: "savunma", objective: "Tüm yarımada savunmasını yönet", outcome: "Deniz harekâtını başarıyla püskürttü" } }
        },
        {
            id: "3-kolordu", name: "3. Kolordu", faction: "ottoman", type: "kolordu",
            entityType: "infantry_unit", unitClass: "corps", side: "ottoman", anchorRegion: "conkbayiri",
            commander: "Tümg. Esat Paşa", strength: 25000,
            description: "Gelibolu Yarımadası'nın kuzey ve orta sektörlerini savunan ana kara kuvveti. Tümgeneral Esat Paşa komutasında Bigalı'da karargâh kurdu. 19. Tümen'i (Mustafa Kemal) ve birden fazla müstakil alayı bünyesinde barındırdı. Arıburnu-Conkbayırı cephesinin tüm savunma koordinasyonu Esat Paşa'nın elindeydi. En kritik kararı: 25 Nisan sabahı Mustafa Kemal'e müstakil hareket yetkisi tanımak — bu karar Arıburnu'ndaki zaferin temelini attı. Tüm kampanya boyunca Bigalı karargâhından hem Arıburnu hem Conkbayırı cepheleri koordine edildi.",
            phases: { "naval-assault": { x: 1015, y: 1800, status: "savunma", objective: "Bigalı'da yarımada genelini savun", outcome: "Deniz saldırısını püskürttü" } }
        },
        {
            id: "19-tumen", name: "19. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "ariburnu",
            commander: "Yrb. Mustafa Kemal", strength: 9000,
            description: "Gelibolu'nun kaderini değiştiren efsanevi tümen. Kasım 1914'ten Nisan 1915'e Bigalı'da yedek olarak bekledi; 25 Nisan sabahı çıkarma haberi üzerine Mustafa Kemal derhal 57. Alayı öne sürdü. 'Size taarruzu değil, ölmeyi emrediyorum' emriyle başlayan karşı taarruz Conkbayırı'nı saatlerce tuttu. İlk günde tüm cephane tükennce Kemal 'süngü tak, yere yat' emrini verdi. 19 Mayıs 1915 Osmanlı genel taarruzunda ağır kayıplar vererek tümen yeniden yapılandı. Ağustos 1915'te Kemal Anafartalar Grup Komutanı olarak terfi etti. Kampanya boyunca üç kez yeniden yapılandırılan 19. Tümen, Gelibolu'nun en yıpratıcı muharebe birliğidir.",
            phases: { "naval-assault": { x: 1045, y: 1845, status: "hazır", objective: "Bigalı'da yedek kuvvet olarak bekle", outcome: "Karaya çıkışa karşı hazır bekledi" } }
        },
        {
            id: "57-alay", name: "57. Alay", faction: "ottoman", type: "piyade",
            entityType: "infantry_unit", unitClass: "regiment", side: "ottoman", anchorRegion: "ariburnu",
            commander: "Yrb. Hüseyin Avni Bey", strength: 3000,
            description: "\"Ben size taarruzu emretmiyorum, ölmeyi emrediyorum!\" — Yarbay Hüseyin Avni Bey'in 25 Nisan 1915 sabahı 57. Alaya verdiği bu emir, Türk askeri tarihinin en ünlü sözüdür. 19. Tümen'in öncü alayı olarak Conkbayırı'na koşturdu; ilk günde tüm subay kadrosunun büyük bölümü şehit düştü, Hüseyin Avni Bey de muharebeyi hayatta tamamlayamadı. Alay yüksek kayıplara rağmen ANZAC'ı günün sonuna kadar durdurdu. Şehitlerine saygı olarak 57. Alay'ın numarası sonraki Osmanlı ve Türk ordularında bir daha verilmedi — bu gelenek bugün Türk Silahlı Kuvvetleri'nde sürmektedir.",
            phases: { "naval-assault": { x: 990, y: 1850, status: "hazır", objective: "Bigalı'da emir bekle", outcome: "25 Nisan taarruzu için hazır" } }
        },
        {
            id: "27-alay", name: "27. Alay", faction: "ottoman", type: "piyade",
            entityType: "infantry_unit", unitClass: "regiment", side: "ottoman", anchorRegion: "ariburnu",
            commander: "Yrb. Şefik Aker", strength: 3000,
            description: "19. Tümen'in diğer ana alayı, Arıburnu çıkarmasında Osmanlı savunmasının ilk temas noktasıydı. 25 Nisan'da ANZAC kuvvetleri kıyıya ayak basmadan önce sahil gözcüleri alarma geçirdi ve 27. Alay Yarbay Şefik Aker komutasında bölgeye süratle yönlendirildi. Üstün ANZAC ateş gücüne rağmen alay, kıyı şeridinde tutunmayı uzun süre engelledi. Kampanya boyunca Arıburnu-Conkbayırı sektöründe görev yaptı. Ağustos 1915 Conkbayırı taarruzunda da cephe savunmasında kritik mevzileri savundu.",
            phases: { "naval-assault": { x: 1080, y: 2040, status: "hazır", objective: "Eceabat bölgesinde savunma", outcome: "Çıkarmaya karşı hazır konumda" } }
        },
        {
            id: "mustahkem-mevki", name: "Çanakkale Müstahkem Mevki Komutanlığı", faction: "ottoman", type: "kolordu",
            entityType: "artillery_battery", unitClass: "battery", side: "ottoman", anchorRegion: "kilitbahir",
            commander: "Tümg. Cevat Paşa (Çobanlı)", strength: 20000,
            description: "Çanakkale Boğazı'nın kıyı savunmasından sorumlu komutanlık. Cevat Paşa, 18 Mart deniz savaşında kıyı bataryalarını yöneterek İtilaf donanmasını püskürten asıl komutandır. 17 Aralık 1914'te Usedom ve Merten Paşalarla birlikte Nusret'in ilk mayın döşeme operasyonuna bizzat katıldı. Emrindeki topçu bataryaları: Hamidiye, Mecidiye, Namazgâh, Rumeli ve Anadolu tabyaları.",
            phases: { "naval-assault": { x: 1451, y: 2091, status: "savunma", objective: "Boğaz kıyı savunmasını yönet", outcome: "230+ topla donanmayı durdurdu" } }
        },
        {
            id: "7-tumen", name: "7. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "seddulbahir",
            commander: "Alb. Remzi Bey", strength: 10000,
            description: "Seddülbahir ve güney sahillerinin birincil savunma tümeni. Albay Remzi Bey komutasında 9. Tümen ve 5. Tümen ile birlikte Helles cephesini savundu. 25 Nisan 1915'te V Beach ve W Beach çıkarmalarına karşı ağır direniş gösterdi; V Beach'te SS River Clyde'dan sahile çıkmaya çalışan İngiliz askerlerini makineli tüfek ateşiyle durdurdu. Kirte (Krithia) muharebelerinde İngiliz ve Fransız kuvvetlerine karşı dört ay boyunca mevzileri tuttu. Tahliyeye kadar güney cephesinin omurgasını oluşturdu.",
            phases: { "naval-assault": { x: 1033, y: 2399, status: "savunma", objective: "Seddülbahir bölgesinde güney sahillerini savun", outcome: "Kıyı savunma hattını korudu" } }
        },
        {
            id: "9-tumen", name: "9. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "seddulbahir",
            commander: "Alb. Halil Sami", strength: 10000,
            description: "Kilitbahir'den Seddülbahir'e güney kesimin savunma gücü. Albay Halil Sami Bey komutasında 7. Tümen ile koordineli çalıştı. Boğaz kıyısındaki tahkimatları tutarak 18 Mart deniz savaşında kıyı bataryalarına destek sağladı. 25 Nisan'da güney çıkarmasını göğüsleyen birinci hat birliklerinden biriydi. Kampanya boyunca Helles cephesinde İngiliz ve Fransız taarruzlarına karşı siper savaşı yürüttü.",
            phases: { "naval-assault": { x: 1375, y: 2135, status: "savunma", objective: "Kilitbahir hattında Boğaz savunması", outcome: "Kıyı tahkimatlarını korudu" } }
        },
        {
            id: "5-tumen", name: "5. Tümen", faction: "ottoman", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "ottoman", anchorRegion: "seddulbahir",
            commander: "Alb. Hasan Askeri Bey", strength: 10000,
            description: "Eceabat-Maydos bölgesinden başlayıp güney cephesine uzanan savunma hattında 7. ve 9. Tümenlerle birlikte görev yaptı. Albay Hasan Askeri Bey komutasında Kirte (Krithia) bölgesinde İngiliz ve Fransız kuvvetlerine karşı üç büyük Kirte taarruzunu durdurdu (Nisan-Haziran 1915). Bu muharebeler tümenin en ağır kayıplarını verdiği dönem oldu. Güney cephesinin tamamen siper savaşına dönüştüğü süreçte Hasan Askeri Bey'in savunma hattı düzeni bölgenin tutulmasında belirleyici rol oynadı.",
            phases: { "naval-assault": { x: 1404, y: 1958, status: "savunma", objective: "Eceabat-Maydos bölgesinde savunma", outcome: "Kıyı savunma hattını destekledi" } }
        },

        // ── OSMANLI DENİZ ──
        {
            id: "nusret", name: "Nusret Mayın Gemisi", faction: "ottoman", type: "deniz",
            entityType: "ship", unitClass: "mine_layer", side: "ottoman", anchorRegion: "bogaz",
            commander: "Kolağası Nazmi Bey (Korvet Kaptanı Yeniköylü İbrahim oğlu Hafız Nazmi Efendi)", strength: 76,
            description: "Nusret, Kasım 1914'ten itibaren Boğaz'da birden fazla mayın döşeme seferi gerçekleştirdi. En kritik operasyonu 7/8 Mart 1915 gecesi saat 05:30'da Erenköy Koyu'na paralel 26 karbonik mayınlık gizli hattı döşemesiydi — 100-150 m aralıklarla, 4,5 m derinliğe. İtilaf keşif uçuşlarının göremediği bu hat, 18 Mart'ta Bouvet, Irresistible ve Ocean'ı batırdı. 6 Nisan 1915 itibariyle Boğaz'da toplam 422 mayın bulunuyordu (53 Alman, 362 karbonik, 7 Rus). İtilaf'ın 45 mayın tarama girişimi başarısızlıkla sonuçlandı. Komutanı Nazmi Bey, 19 Temmuz 1915'te Binbaşılığa terfi etti.",
            phases: { "naval-assault": { x: 1179, y: 2386, status: "savunma", objective: "Erenköy Koyu'na mayın döşe — düşmanı geçirmemek", outcome: "Döşediği mayınlar 3 gemiyi batırdı, 3'ünü savaş dışı bıraktı" } }
        },
        {
            id: "allied-minesweepers", name: "İtilaf Mayın Tarama Trawlerları", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Kraliyet Donanması gözetimindeki sivil trawler ekipleri", strength: 24,
            description: "Boğaz saldırısından önce İtilaf donanmasının en zayıf halkası mayın tarama trawlerlarıydı. Çoğu sivil ekipli balıkçı/trawler gemileri, gece akıntı, projektör, topçu ateşi ve makineli tüfek baskısı altında mayın hatlarını açmaya çalıştı. 18 Mart'a kadar 45 mayın tarama girişimi başarısız oldu; Nusret'in Erenköy hattı bu nedenle taarruz günü görünmeden kaldı.",
            phases: { "naval-assault": { x: 1130, y: 2380, status: "başarısız", objective: "Mayın hatlarını temizle", outcome: "Kıyı ateşi ve akıntı altında hat açılamadı" } }
        },

        // ── İTİLAF DONANMASI ──
        // 18 Mart taarruz formasyonu: Hat halinde güneybatıdan kuzeydoğuya.
        // Boğaz suyu ortası: doğrulanmış Kilitbahir/Çanakkale/Erenköy
        // anchor'ları arasında, gemiler hat formasyonunda tutulur.
        {
            id: "hms-queen-elizabeth", name: "HMS Queen Elizabeth", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Amiral de Robeck (Donanma Komutanı)", strength: 950,
            description: "İtilaf donanmasının amiral gemisi ve dönemin en modern savaş gemisi. 15 inçlik sekiz ana tobu, 24.000 ton deplasmanı ve 24 düğüm hızıyla filodan farklı sınıftaydı. Amiral de Robeck gemi kaptanı değil, genel filo komutanıydı — geminin ayrı bir kaptanı vardı. 18 Mart 1915'te Osmanlı kıyı bataryalarını susturmaya çalıştı ancak Nusret'in döşediği mayın hattı nedeniyle hareket alanı kısıtlandı. De Robeck bu gemiden verdiği 'geri çekilin' emriyle Boğaz geçme planını fiilen sonlandırdı. 13 Mayıs 1915'te denizaltı tehdidi artınca Ege'ye geri döndü.",
            phases: { "naval-assault": { x: 1215, y: 2420, status: "taarruz", objective: "Boğaz savunmalarını yok et", outcome: "Tabyaları bombaladı ama geçemedi" } }
        },
        {
            id: "hms-irresistible", name: "HMS Irresistible", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Albay Douglas Dent", strength: 780,
            description: "18 Mart 1915'te saat 16:14 civarında Nusret'in Erenköy mayın hattına çarparak ağır hasar alan İngiliz zırhlısı. Makineleri devre dışı kaldı; kıyı bataryalarının yoğun ateşi altında hiçbir kurtarma gemisi yaklaşamadı. Albay Douglas Dent mürettebatını terk etme emri verdi; küçük teknelerle transfer sürüyor, gemi sürtünce battı. Nazmi Bey günlüğünde şöyle yazdı: 'İngiliz zırhlısı Irresistible de limana dönemedi.' Mürettebatın büyük bölümü kurtarıldı.",
            phases: { "naval-assault": { x: 1226, y: 2369, status: "taarruz", objective: "Boğaz'ı geç", outcome: "Nusret'in döşediği mayına çarparak battı" } }
        },
        {
            id: "hms-ocean", name: "HMS Ocean", faction: "british", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Albay Hayes-Sadler", strength: 750,
            description: "18 Mart 1915'te hasarlı Irresistible'ı yedeğe almaya çalışırken kendisi de Erenköy mayın hattına çarpan İngiliz zırhlısı. Albay Hayes-Sadler'ın Ocean'ı kurtarma girişimi mahkûm bir görevdi; gemi saat 18:05'te terk edildi. Nazmi Bey günlüğüne şöyle yazdı: 'Akşam karanlığında Ocean da yan yattı.' Mürettebatın büyük çoğunluğu küçük teknelerle kurtarıldı. Her iki İngiliz zırhlısının batışı, 18 Mart'ın Osmanlı zaferini pekiştiren son sahneydi.",
            phases: { "naval-assault": { x: 1273, y: 2410, status: "taarruz", objective: "Boğaz'ı geç", outcome: "Mayına çarparak battı" } }
        },

        // ── İNGİLİZ KARA ──
        {
            id: "29-div", name: "29. Tümen", faction: "british", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "allied", anchorRegion: "seddulbahir",
            commander: "Tümg. Hunter-Weston", strength: 17000,
            description: "Seddülbahir (Cape Helles) çıkarmasının ana İngiliz kuvveti. Tümgeneral Hunter-Weston komutasında 25 Nisan 1915'te V, W, X ve Y sahillerinden eşzamanlı çıkarma yaptı. En ağır kayıplar V Beach'te: SS River Clyde sahile oturtularak askerler teknenin yanlarındaki kapılardan çıkmaya çalışırken Osmanlı makineli tüfek ateşiyle biçildi. Üç Kirte (Krithia) taarruzu (28 Nisan, 6-8 Mayıs, 4-6 Haziran 1915) kanlı başarısızlıklarla sonuçlandı. Helles cephesinde aylarca siper savaşı yürüttükten sonra 1-9 Ocak 1916'da son tahliyeyi gerçekleştirdi.",
            phases: { "naval-assault": { x: 1017, y: 2336, status: "hazır", objective: "Seddülbahir ve X Beach çıkarması planlaması", outcome: "Nisan çıkarması için hazırlandı" } }
        },
        {
            id: "ix-corps", name: "IX Kolordusu (Suvla)", faction: "british", type: "kolordu",
            entityType: "infantry_unit", unitClass: "corps", side: "allied", anchorRegion: "suvla",
            commander: "Korg. Sir Frederick Stopford", strength: 25000,
            description: "Ağustos 1915'te Suvla Koyu çıkarmasını yöneten İngiliz IX Kolordusu. General Sir Frederick Stopford komutasındaki kuvvet, Anzac köprübaşını Suvla ile birleştirip Kocaçimen-Conkbayırı sırtlarına baskı kurmak için getirildi. Çıkarma ilk saatlerde düşük dirençle ilerleyebilecek durumdayken emir gecikmeleri, su sıkıntısı ve komuta tereddüdü yüzünden Anafartalar yükseltileri hızla tutulamadı. Bu yavaşlık Mustafa Kemal'in Anafartalar savunmasını örgütlemesine zaman kazandırdı; Suvla harekâtı kampanyanın son büyük fırsatını tüketti.",
            phases: {}
        },
        {
            id: "ss-river-clyde", name: "SS River Clyde", faction: "british", type: "çıkarma",
            entityType: "landing_boat", unitClass: "ship", side: "allied", anchorRegion: "seddulbahir",
            commander: "Komutan Edward Unwin ve V Beach çıkarma müfrezeleri", strength: 2000,
            description: "Eski kömür gemisi SS River Clyde, 25 Nisan 1915'te V Beach'e bilerek oturtulan yüzer çıkarma platformuydu. Gövdesine açılan kapılardan ve dubalı köprülerden asker çıkarılması planlandı; ancak Osmanlı ateşi, tel örgüler ve açık kumsal yüzünden ilk dalgalar ağır kayıp verdi. Gemi askeri bir başarıdan çok Helles çıkarmasının bedelini görünür kılan sembol haline geldi. Seddülbahir kalesi ve V Beach ancak ağır kayıplardan sonra tutulabildi.",
            phases: {}
        },

        // ── ANZAC ──
        {
            id: "anzac-1div", name: "1. Avustralya Tümeni", faction: "anzac", type: "tümen",
            entityType: "infantry_unit", unitClass: "division", side: "allied", anchorRegion: "ariburnu",
            commander: "Tümg. Bridges", strength: 12000,
            description: "Avustralya tarihinin dönüm noktası. 25 Nisan 1915 saat 04:30'da Arıburnu'na — asıl hedefin yaklaşık 1.5 km kuzeyine — ayak bastı. Dar koyda düzen sağlamak zorlaştı; Osmanlı 27. Alayı'nın beklenmedik hızlı tepkisi çıkarmayı başından güçleştirdi. Tümgeneral Bridges ilk gün tümenin geri çekilmesini talep etti; öneri reddedildi. Bridges 15 Mayıs'ta bir keskin nişancı tarafından vurulan yarasından hayatını kaybetti. ANZAC Koyu, 8 ay boyunca yaklaşık 3 km²'lik bir alanda 8.000 Avustralyalının şehit düştüğü bir kıyı çıkmazına dönüştü. Bu çıkarma, Avustralya ulusal kimliğinin kurucu anısı haline geldi.",
            phases: { "naval-assault": { x: 1246, y: 1788, status: "hazır", objective: "Mısır'da çıkarma için eğitim", outcome: "Nisan çıkarması için hazırlandı" } }
        },
        {
            id: "nz-inf", name: "Yeni Zelanda Tugayı", faction: "anzac", type: "tugay",
            entityType: "infantry_unit", unitClass: "brigade", side: "allied", anchorRegion: "conkbayiri",
            commander: "Alb. Johnston", strength: 4000,
            description: "Yeni Zelanda'nın Çanakkale'deki en dramatik anının kahramanları. Ağustos 1915 Taarruzu'nda Conkbayırı zirvesine tırmanışıyla tarihe geçti. 8-9 Ağustos 1915 gecesi Albay Johnston komutasında 4.000 kişi büyük kayıplar vererek Gelibolu Yarımadası'nın en stratejik tepesine, Conkbayırı sırtına ulaştı. Zirveyi bir gece boyunca tuttu. Ancak 10 Ağustos sabahı Mustafa Kemal'in Anafartalar Grup Komutanı olarak yönettiği karşı taarruz tugayı geri sürdü. Bu an Türk tarafınca 'Türkiye'yi kurtaran taarruz' olarak anılır. Tugay yaklaşık 2.500 kayıp verdi; Albay Johnston muharebenin ardından sağlığını kaybetti.",
            phases: { "naval-assault": { x: 1236, y: 1744, status: "hazır", objective: "Mısır'da eğitim", outcome: "Çıkarma planlaması devam etti" } }
        },

        // ── FRANSIZ ──
        {
            id: "bouvet", name: "Bouvet", faction: "french", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Kaptan Rageot de la Touche", strength: 721,
            description: "18 Mart 1915 saat 13:58'de Nusret'in Erenköy hattındaki mayına çarparak yaklaşık 2 dakikada batan Fransız zırhlısı. Bouvet kaybı kaynaklara göre değişir; Osmanlı/Nazmi Bey anlatısında 721 mürettebattan 66 kurtulan verilirken, modern özetlerde kayıp çoğunlukla yaklaşık 640 olarak aktarılır. Kesin olan: Bouvet'in batışı, o günkü İtilaf kayıplarının en ağırıdır.",
            phases: { "naval-assault": { x: 1293, y: 2356, status: "taarruz", objective: "Osmanlı tabyalarını sustur", outcome: "Mayına çarparak battı – yaklaşık 640 kayıp" } }
        },
        {
            id: "suffren", name: "Suffren", faction: "french", type: "deniz",
            entityType: "ship", unitClass: "ship", side: "allied", anchorRegion: "bogaz",
            commander: "Kaptan Guépratte", strength: 700,
            description: "Fransız Donanması'nın 18 Mart 1915 muharebelerindeki simge gemisi. Kaptan Guépratte komutasında Osmanlı kıyı bataryalarıyla yoğun ateş alışverişi yürüttü; ağır hasar aldı ama batmadı. Amiral de Robeck'in 'geri çekilin' emrini Guépratte bir süre geciktirerek çatışmayı sürdürdü — bu cesaret Fransız anlatısında kahraman motifi oldu. Bouvet'in batışından kısa süre sonra hâlâ sahada olan Suffren, nihayetinde ciddi yapısal hasarla geri döndü. Onarım için ayrıldıktan sonra Çanakkale harekâtına dönmedi.",
            phases: { "naval-assault": { x: 1314, y: 2375, status: "taarruz", objective: "Kıyı bataryalarını bombalama", outcome: "Ağır hasar aldı ama sağ kaldı" } }
        },
        {
            id: "fr-corps", name: "Fransız Sefer Kuvveti", faction: "french", type: "kolordu",
            entityType: "infantry_unit", unitClass: "corps", side: "allied", anchorRegion: "kumkale",
            commander: "General d'Amade", strength: 18000,
            description: "General d'Amade komutasında 18.000 kişilik Fransız Sefer Kuvveti, kampanyanın ilk gününden son tahliyeye kadar İtilaf'ın vazgeçilmez cephe ortağıydı. 25 Nisan 1915'te Kumkale'ye (Asya yakasına) 3.000 kişilik aldatma çıkarması yaparak Osmanlı dikkatini güneye çekti; 27 Nisan'da Seddülbahir'e transfer edildi. Helles cephesinde İngiliz 29. Tümen'in sağ kanadını oluşturdu; Kirte muharebelerinde ve Alçitepe savaşlarında ağır kayıplar verdi. 1-9 Ocak 1916'da İngilizlerle birlikte Seddülbahir'den son tahliyeyi gerçekleştirdi.",
            phases: { "naval-assault": { x: 1061, y: 2509, status: "hazır", objective: "Kumkale hedefi için hazırlık", outcome: "Deniz harekâtını destekledi" } }
        }
    ],

    phases: [
        {
            id: "naval-assault", date: "18 Mart 1915", title: "Deniz Harekâtı",
            narration: "18 savaş gemisinden oluşan İtilaf donanması Çanakkale Boğazı'nı geçmeye çalıştı. Saat 11:10'da başlayan taarruz, Cevat Paşa'nın kıyı bataryaları ve Nusret'in 7/8 Mart gecesi Erenköy Koyu'na döşediği 26 mayınlık gizli hat sayesinde felaketle sonuçlandı. Bouvet, Irresistible ve Ocean batırıldı; Inflexible, Suffren ve Gaulois ağır hasar aldı. İtilaf'ın 45 mayın tarama girişimi bu hattı açamamıştı. Boğaz geçilemezdi.",
            locationByFaction: { ottoman: ["kilitbahir", "canakkale", "seddulbahir", "kumkale"], british: ["bogaz", "erenkoyu"], french: "kumkale" }
        },
        {
            id: "april-landings", date: "25 Nisan 1915", title: "Kara Çıkarması",
            narration: "İtilaf kuvvetleri Arıburnu, Seddülbahir ve Kumkale çevresinde eşzamanlı çıkarma yaptı. 29. Tümen X Beach/İkiz Koyu, V Beach ve W Beach hatlarına yayıldı; V Beach'te SS River Clyde açık hedefe dönüştü. Mustafa Kemal'in 19. Tümeni Arıburnu'na, 7. ve 9. Tümenler Helles sahillerine karşı koydu.",
            locationByFaction: { anzac: "ariburnu", british: ["x-beach", "seddulbahir"], french: "kumkale", ottoman: ["ariburnu", "alcitepe", "seddulbahir"] }
        },
        {
            id: "ariburnu-battles", date: "Nisan–Mayıs 1915", title: "Arıburnu Muharebeleri",
            narration: "Mustafa Kemal'in 57. Alayı ANZAC kuvvetlerine karşı taarruza geçti. Siperlerde kanlı bir denge kuruldu.",
            locationByFaction: { anzac: "ariburnu", ottoman: "conkbayiri", british: "kirte", french: "morto-koyu" }
        },
        {
            id: "seddulbahir-battles", date: "Nisan–Haziran 1915", title: "Seddülbahir Muharebeleri",
            narration: "Yarımadanın güneyinde İngiliz ve Fransız kuvvetleri Alçıtepe'ye ulaşmak için Kirte hattına yüklendi. V Beach ve W Beach'teki kanlı köprübaşları kalıcı bir yarma sağlayamadı; Osmanlı 5., 7. ve 9. Tümenleri güney cepheyi siper savaşına çevirdi.",
            locationByFaction: { british: "kirte", french: "seddulbahir", ottoman: "alcitepe", anzac: "ariburnu" }
        },
        {
            id: "august-offensive", date: "6–21 Ağustos 1915", title: "Ağustos Taarruzu",
            narration: "Suvla Koyu çıkarması, Lone Pine/Nek aldatmaları ve Sarı Bayır-Conkbayırı taarruzu İtilaf'ın son büyük hamlesiydi. Yeni Zelanda birlikleri kısa süreliğine Conkbayırı zirvesine ulaştı; 10 Ağustos'ta Mustafa Kemal'in karşı taarruzu yüksek zemini geri aldı.",
            locationByFaction: { british: "suvla", anzac: "conkbayiri", ottoman: ["anafartalar", "conkbayiri"], french: "seddulbahir" }
        },
        {
            id: "evacuation", date: "Aralık 1915 – Ocak 1916", title: "Tahliye",
            narration: "İtilaf kuvvetleri yarımadadan çekildi. Şaşırtıcı biçimde çekilme sırasında çok az kayıp verildi.",
            locationByFaction: { anzac: "ariburnu", british: "seddulbahir", french: "seddulbahir", ottoman: "suvla" }
        }
    ],

    locations: GEO_LOCATIONS
};

/** Location ID → konum objesi look-up tablosu */
export const LOCATION_BY_ID = BATTLE_DATA.locations.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

/** Harita üzerinde kullanılacak vekil konumu çözümle */
export function getMapLocationById(locationId) {
    if (!locationId) return null;
    const raw = LOCATION_BY_ID[locationId];
    if (!raw) return null;
    return raw.mapProxyId ? (LOCATION_BY_ID[raw.mapProxyId] || raw) : raw;
}

/** Harita üzerinde kullanılacak vekil ID */
export function getMapLocationId(locationId) {
    const point = getMapLocationById(locationId);
    return point ? point.id : locationId;
}

/** Temel faz ID'si (birim başlangıç konumları bu fazdan okunur) */
export const BASE_PHASE_ID = "naval-assault";

/** Token'lar arasındaki minimum mesafe (cluster spread) */
export const PHASE_TOKEN_SPREAD = 60;

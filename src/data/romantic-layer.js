// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Romantik Katman
// Asker mektupları, kişisel tanıklıklar, duygusal anekdotlar
// Kaynak: Enis Şahin (Atatürk Araştırma Merkezi Dergisi, 2009)
//         Nevin Yazıcı (Erdem Dergisi, 2011)
//         Nazmi Bey Çanakkale Deniz Savaşları Günlüğü (1914-1922)
// ══════════════════════════════════════════════════════════════

/**
 * Her kayıt belirli bir tarih aralığına bağlı.
 * Narration panelinde ilgili faz aktifken gösterilir.
 *
 * type: 'quote' | 'letter' | 'anecdote' | 'witness' | 'spirit'
 * source: Kaynak kişi/belge
 * faction: 'ottoman' | 'allied' | 'neutral'
 */
export const ROMANTIC_ENTRIES = [

    // ─── SAVAŞ ÖNCESİ & İLK BOMBARDIMAN ───
    {
        startDate: '1914-11-03',
        endDate: '1914-11-30',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Enis Şahin, Kronolojik Çanakkale Savaşları Tarihi',
        text: '3 Kasım 1914\'te İngiliz ve Fransız donanması Seddülbahir ve Ertuğrul tabyalarını bombardıman etti. Türk tarafı 71 asker kaybetti — bunlar Çanakkale\'nin ilk şehitleriydi.',
        emoji: '🕯️',
    },

    // ─── MUSTAFA KEMAL'İN ATANMASI ───
    {
        startDate: '1915-01-18',
        endDate: '1915-02-18',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: '18 Ocak 1915: Yarbay Mustafa Kemal, 19. Tümen Komutanlığı\'na atandı. Bu sıradan görünen atama, savaşın kaderini değiştirecekti.',
        emoji: '⭐',
    },

    // ─── MAYIN TARAMA DÖNEMİ ───
    {
        startDate: '1915-02-19',
        endDate: '1915-03-17',
        type: 'quote',
        faction: 'allied',
        source: 'Lord Fisher, İngiliz Deniz Kuvvetleri Başkomutanı',
        text: '"Kahrolası Çanakkale! Hepimizin mezarı olacak."',
        emoji: '⚓',
    },

    // ─── 18 MART DENİZ MUHAREBESİ ───
    {
        startDate: '1915-03-15',
        endDate: '1915-03-22',
        type: 'witness',
        faction: 'ottoman',
        source: 'Enis Şahin, cephe raporları',
        text: 'İtilaf donanmasının %35\'i kaybedildi. Bouvet, Irresistible ve Ocean batırıldı. Bu, bölgedeki deniz savaşlarının en büyüğüydü. Türk topçuları, kıyı bataryalarından durmaksızın ateş etti.',
        emoji: '💥',
    },

    // ─── 5. ORDU KURULUŞU ───
    {
        startDate: '1915-03-23',
        endDate: '1915-04-24',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Mucip Kemal Bey',
        text: '"Devlet fakir, millet fakirdi... Ama sözlerin çok ilerisinde bulunan bu ödevin derin manasını, kutsiyetini kumandanlar, subaylar, erler iyice anlamışlardı... Ve böylece Çanakkale Ruhu doğmuş oluyordu."',
        emoji: '🔥',
    },

    // ─── 25 NİSAN ÇIKARMA ───
    {
        startDate: '1915-04-25',
        endDate: '1915-04-28',
        type: 'quote',
        faction: 'ottoman',
        source: 'Yarbay Mustafa Kemal, 57. Alay emri',
        text: '"Ben size taarruz emretmiyorum, ölmeyi emrediyorum! Biz ölünceye kadar geçecek zaman zarfında yerimize başka kuvvetler ve kumandanlar kaim olabilir."',
        emoji: '⚔️',
    },
    {
        startDate: '1915-04-25',
        endDate: '1915-04-28',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Hamdullah Suphi, Edebiyat Heyeti',
        text: '"Taburlarımız arasında günlerden beri \'Harp yerlerine biz evvel varacağız!\' diye bir yarışmadır devam ediyor... Bu günkü askerlerimizi tahrik eden ruhu, en iyi bir hayâl ile tahmin etmek dahi mümkün değildir."',
        emoji: '🏃',
    },

    // ─── ÇIKARMA SONRASI İLK HAFTALAR ───
    {
        startDate: '1915-04-29',
        endDate: '1915-05-10',
        type: 'quote',
        faction: 'ottoman',
        source: 'Mustafa Kemal, 1-2 Mayıs 1915 muharebe raporu',
        text: '"Benimle beraber burada muharebe eden bütün askerler kesinlikle bilmelidirler ki, bize verilen namus görevini tam olarak yerine getirmek için bir adım geri gitmek yoktur."',
        emoji: '🛡️',
    },
    {
        startDate: '1915-04-29',
        endDate: '1915-05-15',
        type: 'witness',
        faction: 'ottoman',
        source: 'Ürgüplü Mustafa Fevzi',
        text: '"Alçıtepe eğer düşman tarafından zapt edilirse, İstanbul\'u kurtarma imkânının elden gideceğine inanıyorduk. Onun için pervasızca ölüme koşuyorduk."',
        emoji: '💀',
    },

    // ─── HASTANE BOMBARDIMANI ───
    {
        startDate: '1915-05-01',
        endDate: '1915-05-10',
        type: 'witness',
        faction: 'ottoman',
        source: 'Enver Paşa, ABD Büyükelçisi Morgenthau\'ya protesto',
        text: '1 Mayıs\'ta Eceabat\'taki 2.500 yaralı askerin bulunduğu hastane bombardıman edildi. İtilaf Devletleri savaş hukukunu açıkça çiğniyordu.',
        emoji: '🏥',
    },

    // ─── GOLİATH'IN BATIRILMASI ───
    {
        startDate: '1915-05-11',
        endDate: '1915-05-18',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: '12-13 Mayıs gecesi saat 01.15: Muavenet-i Milliye Muhribi, 3 torpil atışıyla İngiliz zırhlısı Goliath\'ı batırdı. 500\'den fazla İngiliz askeri hayatını kaybetti. Mürettebatın 157 kişisi madalya ile taltif edildi.',
        emoji: '🚢',
    },

    // ─── 19 MAYIS TAARRUZU ───
    {
        startDate: '1915-05-17',
        endDate: '1915-05-25',
        type: 'letter',
        faction: 'ottoman',
        source: 'Mustafa Kemal, Arıburnu askerlerine veda mektubu',
        text: '17 Mayıs\'ta görev değişikliği sırasında Mustafa Kemal, Arıburnu\'ndaki askerlerine duygusal bir veda mektubunda "Rahatlıkla uyuma yolunu aramanın, bu rahatlıktan yalnız bizim değil, bütün milletimizin ebedî olarak yoksun kalmasına sebep olacağını hatırlatırım" diye yazdı.',
        emoji: '✉️',
    },

    // ─── SİPER HAYATI — SİNEK SORUNU ───
    {
        startDate: '1915-06-01',
        endDate: '1915-08-30',
        type: 'witness',
        faction: 'ottoman',
        source: 'Münim Mustafa, cephe hatıraları',
        text: '"Bizi en çok sıkan şeylerden biri de sineklerdi... Yemek yerken çatalımızın ucundaki lokmaya binlerce sinek hücum ediyor..." Bir Amerikalı gazeteci: "Siz İngilizlerle başa çıkacaksınız... Ama bu sineklerle başa çıkamayacaksınız."',
        emoji: '🪰',
    },

    // ─── SİPER HAYATI — İNSANİ AN ───
    {
        startDate: '1915-06-15',
        endDate: '1915-07-15',
        type: 'witness',
        faction: 'allied',
        source: 'William George Stewart Fawkes, İngiliz esir asker',
        text: '"Tekrar kendime geldiğim zaman zapt etmeye uğraştığım Türk siperinin içinde şefik ve rahîm yüzlü Türk evlatlarını gördüm. Bana su ve yiyecek verdiler..."',
        emoji: '🤝',
    },

    // ─── ZIĞINDERE MUHAREBESİ ───
    {
        startDate: '1915-06-28',
        endDate: '1915-07-05',
        type: 'witness',
        faction: 'ottoman',
        source: 'Enis Şahin, cephe raporları',
        text: 'Zığındere Muharebesi: Türk kaybı 16.000, sadece 5 Temmuz\'da 5.000. Kokan cesetler nedeniyle ölü Türk askerlerinin cesetleri yakılmak zorunda kalındı. Güney Grubu ateşkes talep etti — reddedildi.',
        emoji: '⚰️',
    },

    // ─── SİPER SANATI ───
    {
        startDate: '1915-07-01',
        endDate: '1915-09-30',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Nevin Yazıcı, Siper Hayatı',
        text: 'Muharebe olmadığı zamanlarda askerler, patlamamış bombaların içindeki dinamit fitilini çıkararak boş kapsüllerden saksılar, mürekkep hokkaları, biblolar ve lambalar yaparlardı. Savaşın ortasında bile sanat yaşıyordu.',
        emoji: '🎨',
    },

    // ─── BEHZAT KERİM EFENDİ ───
    {
        startDate: '1915-07-25',
        endDate: '1915-08-05',
        type: 'letter',
        faction: 'ottoman',
        source: 'Behzat Kerim Efendi, şehit asker, 28 Temmuz 1915',
        text: '"Artık emelime nâil oldum... Dinim, yurdum için canımı İstanbul\'um için feda edebileceğim... Çanakkale değil, demir ve kan kaleye gidiyorum." Babamın nurlu çehresinden akıttığı yaşları göremediğini yazdı — ve şehit düştü.',
        emoji: '💔',
    },

    // ─── ANAFARTALAR VE CONKBAYIRI ───
    {
        startDate: '1915-08-06',
        endDate: '1915-08-15',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: 'Conkbayırı\'nda göğsüne doğru gelen bir şarapnel parçası, Mustafa Kemal\'in annesinin hediye ettiği saati parçaladı. Saat onu ölümden kurtardı. O saati daha sonra Liman von Sanders Paşa\'ya hediye edecekti.',
        emoji: '⌚',
    },
    {
        startDate: '1915-08-06',
        endDate: '1915-08-15',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: 'Kanlısırt/Lone Pine muharebesinde Avustralya kaybı: 1.700+, Türk kaybı: 1.530 şehit, 4.750 yaralı. 8 metre arayla siperlerde, bazen süngüyle göğüs göğüse savaşıldı.',
        emoji: '🗡️',
    },

    // ─── GENERAL HAMILTON'UN İTİRAFI ───
    {
        startDate: '1915-08-20',
        endDate: '1915-08-30',
        type: 'quote',
        faction: 'allied',
        source: 'General Hamilton, günlük kaydı, 23 Ağustos 1915',
        text: '"Uğursuz Çanakkale!"',
        emoji: '📖',
    },

    // ─── İSTANBUL'DAN PAKET ───
    {
        startDate: '1915-08-15',
        endDate: '1915-09-15',
        type: 'witness',
        faction: 'ottoman',
        source: 'Münim Mustafa, hatıratı',
        text: '"Bir gün zeminlikte otururken bir telefon haberi geldi: \'İstanbul\'dan eşyalar geldi.\' Bu haber bizi hayli keyiflendirmişti... Çikolatalar, şekerlemeler, pasta, bisküvilerle süslendiğini gördüğüm vakit, âdeta bir çocuk neşesi hissediyordum..."',
        emoji: '📦',
    },

    // ─── YARALI ASKERLERİN RUHU ───
    {
        startDate: '1915-09-01',
        endDate: '1915-10-15',
        type: 'witness',
        faction: 'ottoman',
        source: 'Cephe gözlemcisi',
        text: '"Balkan Harbi\'nde mecrûhînin hâliyle bu günkü mecrûhînin hâlindeki fark... Onlar mahzun idi. Bunlar memnun! Yaralarının acısından bahis yok, ancak şifâyâb olup tekrar harbe gitmek arzu ve hevesi hüküm sürüyor."',
        emoji: '💪',
    },
    {
        startDate: '1915-09-15',
        endDate: '1915-10-30',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Nevin Yazıcı',
        text: 'Yaralılar, seyyar hastanelerdeki tedavilerle yetinerek harp meydanına koşmak istedi. Yaraları ağır olanlar bile siperlerinde kalmak için tabiplere yalvardı.',
        emoji: '🩹',
    },

    // ─── KURBAN BAYRAMI ───
    {
        startDate: '1915-10-15',
        endDate: '1915-10-22',
        type: 'witness',
        faction: 'ottoman',
        source: 'Münim Mustafa, 19 Ekim 1915 hatırası',
        text: '"Kurban bayramına tesadüf ediyordu. İngilizler bombardımana başladılar... Herkes birbiriyle bayramlaşmaya başladı. Eller sıkılırken, herkesin muhayyilesinden annelerin, sevgililerin hayali geçtiği görülüyor gibi oluyordu..."',
        emoji: '🌙',
    },
    {
        startDate: '1915-10-15',
        endDate: '1915-10-22',
        type: 'witness',
        faction: 'ottoman',
        source: 'Mehmet Fasih Bey, günlük',
        text: '"Bugün Kurban Bayramı. Biraz siperlerde gezdim ve kovan topladım. Sonra yerime gelerek bir kahve içtim... İşte bu esnada toplar başladı..."',
        emoji: '☕',
    },

    // ─── KASIM FIRTINASI ───
    {
        startDate: '1915-11-25',
        endDate: '1915-12-01',
        type: 'witness',
        faction: 'ottoman',
        source: 'Enis Şahin, cephe raporları',
        text: '25-27 Kasım: Şiddetli fırtına ve sağanak. Siperler suyla doldu. Askerler boğularak öldü. Kar yağdı, dondurucu soğuk geldi. Anzak bölgesinde 280 asker donarak hayatını kaybetti.',
        emoji: '❄️',
    },

    // ─── UÇAK ÇATIŞMASI ───
    {
        startDate: '1915-11-28',
        endDate: '1915-12-05',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: '30 Kasım: Üsteğmen Ali Rıza ve Teğmen Orhan\'ın Albatros I uçağı, Fransız Farman uçağını düşürdü. Atılan kurşun yakıt deposunu deldi; uçak yanarak İntepe-Helles arasına düştü.',
        emoji: '✈️',
    },

    // ─── TAHLİYE DÖNEMİ ───
    {
        startDate: '1915-12-07',
        endDate: '1915-12-20',
        type: 'quote',
        faction: 'ottoman',
        source: 'Albay Mustafa Kemal, 10 Aralık 1915',
        text: 'Mustafa Kemal, Müttefiklerin çekileceğinden kuşku duymadı ve son bir saldırıyla hepsini denize dökmeyi önerdi. Üst komutanlar: "Boşuna harcayacak bir kuvvetimiz, hatta bir erimiz yoktur." Kemal bunun üzerine görevinden istifa etti.',
        emoji: '🚪',
    },

    // ─── SON TAHLİYE ───
    {
        startDate: '1916-01-04',
        endDate: '1916-01-09',
        type: 'witness',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: 'Sabaha karşı 03.30: Cesarettepe\'deki iki lağımın patlatılmasından çıkan gürültü, İngiliz birliklerinin yarımadayı terk ettiğini Türklere hissettirdi. 433 günlük savaş sona ermişti.',
        emoji: '🌅',
    },
    {
        startDate: '1916-01-04',
        endDate: '1916-01-09',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Enis Şahin',
        text: '"Bu savaşın en önemli kazancı Çanakkale Ruhu\'nu ortaya çıkarmasıdır ki, bu ruh, Millî Mücadele\'de Türk Milleti\'nin en önemli silahlarından birisi olacaktır." Toplam kayıp: Türk 213.882, İtilaf ~410.000.',
        emoji: '🇹🇷',
    },

    // ─── EDEBİYAT HEYETİ ───
    {
        startDate: '1915-09-20',
        endDate: '1915-10-10',
        type: 'quote',
        faction: 'ottoman',
        source: 'Edebiyat Heyeti beyannamesi, cephe ziyareti',
        text: '"Ey vatanın, kurucu ve kurtarıcı kahraman ordusu! Kilidini açmağa uğraşan hain elleri, toprağını çiğnemeye çabalayan namert ayakları kırdığınız mukaddes yurdundan size selamlar ve hürmetler getirdik."',
        emoji: '📜',
    },

    // ─── CEPHEYİ ZİYARET EDEN HEYETİN GÖZLEM ───
    {
        startDate: '1915-07-17',
        endDate: '1915-07-24',
        type: 'witness',
        faction: 'ottoman',
        source: 'Veliaht Yusuf İzzetin Efendi heyeti, Temmuz 1915',
        text: '"Aman ya Rabbi! Bu nedir, ne himmettir? Bunlar öyle yalan yanlış şeyler değil. Her yeri fennin iktizasına göre kurulmuş, ince ince işlenmiş... İnsan bunları görmeli de ordunun hayatını nasıl hiçe saydığını anlamalı!"',
        emoji: '👁️',
    },

    // ─── HİLAL-İ AHMER ───
    {
        startDate: '1915-05-01',
        endDate: '1915-12-31',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Hilâl-i Ahmer Cemiyeti kayıtları',
        text: 'Hilâl-i Ahmer Cemiyeti 1915 yılında cephede toplam 1.248.965 fincan çay dağıttı. Günlük tayinat: 600 gr un, 250 gr et, 86 gr pirinç. Ceketlere dikilmiş "harp paketleri"nde gazlı bez ve tentürdiyot bulunurdu.',
        emoji: '🍵',
    },

    // ─── SİPER MESAFESİ ───
    {
        startDate: '1915-05-25',
        endDate: '1915-11-30',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Nevin Yazıcı, Siper Hayatı',
        text: 'Karşı siperlerle mesafe 8 metre ile 100 metre arasında değişiyordu. Siperlerin uzunluğu yüzlerce kilometreyi geçmişti. "Rah-ı mestur" adında gizli geçitler kullanılıyor, siper girişlerine sokak tabelaları konuyordu.',
        emoji: '🪖',
    },

    // ─── BOMBARDIMAN DENEYİMİ ───
    {
        startDate: '1915-06-04',
        endDate: '1915-06-10',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nevin Yazıcı, siper tanıklıkları',
        text: '"Silindir ateşi" denilen bombardımanlar sekiz saat sürerdi. Bombalar üstlerinden ıslıklar çalarak geçer, patladığında siperleri sarsar, her tarafa toprak yağardı. Bomba siper içine düşerse, dumandan nefes alınamaz hale gelir, erlerin çoğu bayılırdı.',
        emoji: '💣',
    },

    // ══════════════════════════════════════════════════════════════
    // NAZMİ BEY GÜNLÜĞÜ — BİRİNCİ ELDEN TANILIKLAR
    // Kaynak: Kolağası Nazmi Bey, Çanakkale Deniz Savaşları Günlüğü
    // ══════════════════════════════════════════════════════════════

    // ─── NUSRET İLK MAYIN OPERASYONU ───
    {
        startDate: '1914-12-15',
        endDate: '1914-12-22',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 17 Aralık 1914',
        text: '17 Aralık 1914: Nusret mayın gemisi ilk operasyonuna çıktı. Usedom Paşa, Merten Paşa ve Cevat Paşa bizzat hazır bulundu. Boğaz\'ın derinliklerine ilk mayın hatları döşenmeye başladı.',
        emoji: '⚓',
    },

    // ─── İTİLAF MAYIN TARAMA GİRİŞİMLERİ ───
    {
        startDate: '1915-01-15',
        endDate: '1915-03-07',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü',
        text: 'İtilaf donanması Boğaz\'daki mayınları temizlemek için 45 ayrı tarama girişiminde bulundu. Her seferinde Osmanlı kıyı bataryaları ve projektörleri tarama gemilerini geri püskürttü. Bir gecede bile tam temizleme yapılamadı.',
        emoji: '🔦',
    },

    // ─── 7/8 MART KRİTİK OPERASYON ───
    {
        startDate: '1915-03-07',
        endDate: '1915-03-10',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 8 Mart 1915',
        text: '"Saat 05.30\'da Nusret vapuru ile Erenköy Koyu\'na gidilerek 26 karbonik mayın ile bir hat oluşturulmuştur. Mayınlar arasındaki mesafe 100-150 metre, derinlik 4,5 metredir. Düşman görememiştir." Bu hat, 10 gün sonra 3 zırhlıyı batıracaktı.',
        emoji: '💣',
    },

    // ─── 18 MART SABAHI ───
    {
        startDate: '1915-03-18',
        endDate: '1915-03-18',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 18 Mart 1915',
        text: '18 Mart sabahı saat 11:10: İtilaf donanmasının 18 savaş gemisi Boğaz\'a girdi. Nazmi Bey: "Düşman donanması bütün azametiyle ilerliyordu. Fakat Erenköy önünde onları bekleyen sürprizi bilmiyorlardı."',
        emoji: '🚢',
    },

    // ─── BOUVET'İN BATIŞI ───
    {
        startDate: '1915-03-18',
        endDate: '1915-03-20',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 18 Mart 1915',
        text: 'Saat 13:58 — Bouvet, Erenköy hattındaki mayına çarptı. Nazmi Bey: "Müthiş bir infilak oldu. Bouvet sancak tarafına yattı. İki dakika içinde 721 kişilik mürettebatıyla denizin dibini boyladı. Sadece 66 kişi kurtulabildi."',
        emoji: '💥',
    },

    // ─── IRRESISTIBLE VE OCEAN ───
    {
        startDate: '1915-03-18',
        endDate: '1915-03-20',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 18 Mart 1915',
        text: 'Saat 16:14: HMS Irresistible mayına çarptı. Saat 18:05: Onu kurtarmaya gelen HMS Ocean da aynı mayın hattına girdi. Nazmi Bey: "Akşam karanlığında Ocean da yan yattı. İki büyük İngiliz zırhlısı daha Erenköy\'ün sularına gömüldü."',
        emoji: '⚓',
    },

    // ─── NAZMİ BEY MEDENİYET ELEŞTİRİSİ ───
    {
        startDate: '1915-03-20',
        endDate: '1915-04-15',
        type: 'quote',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü',
        text: '"Lanet olsun böyle medeniyete! Bunlar medeni olsalardı, Osmanlı\'nın topraklarına bu kadar hırsla saldırmazlardı. Biz barbarız diyorlar — barbarlık mı bu, vatanını savunmak mı?"',
        emoji: '✊',
    },

    // ─── SAKİN GÜNLER ───
    {
        startDate: '1915-03-25',
        endDate: '1915-04-10',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü',
        text: '"Bugün sakin geçmiştir." Nazmi Bey\'in günlüğündeki en kısa cümlelerden biri. 18 Mart felaketinden sonra İtilaf donanması haftalarca Boğaz\'a yaklaşamadı. Osmanlı, bu sessizlikte savunmayı güçlendirdi.',
        emoji: '🕊️',
    },

    // ─── DENİZALTI TEHDİDİ — SAPHIR ───
    {
        startDate: '1915-01-13',
        endDate: '1915-01-20',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, Ocak 1915',
        text: 'Fransız denizaltısı Saphir, Boğaz\'ı geçmeye çalışırken karaya oturdu ve teslim olmak zorunda kaldı. Mürettebat esir alındı. Nazmi Bey: "Denizaltıları da durdurduk. Bu Boğaz geçit vermez."',
        emoji: '🔱',
    },

    // ─── DENİZALTI — E-15 ───
    {
        startDate: '1915-04-15',
        endDate: '1915-04-20',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, Nisan 1915',
        text: 'İngiliz denizaltısı E-15, Kepez Burnu açıklarında akıntıya kapılarak karaya oturdu. Mürettebatı esir alındı. İngilizler denizaltının sırlarını kurtarmak için torpido botlarıyla imha girişiminde bulundu ama Osmanlı bataryaları buna da izin vermedi.',
        emoji: '🎯',
    },

    // ─── TOPLAM MAYIN SAYISI ───
    {
        startDate: '1915-04-01',
        endDate: '1915-04-15',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 6 Nisan 1915',
        text: '6 Nisan 1915 itibariyle Boğaz\'daki toplam mayın sayısı 422\'ye ulaştı: 53 Alman yapımı, 362 karbonik mayın ve 7 Rus yapımı mayın. Bu görünmez ordu, dünyanın en güçlü donanmasını dize getirmişti.',
        emoji: '💣',
    },

    // ─── NAZMİ BEY TERFİ ───
    {
        startDate: '1915-07-15',
        endDate: '1915-07-25',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, 19 Temmuz 1915',
        text: '19 Temmuz 1915: Kolağası Nazmi Bey, Nusret mayın gemisindeki üstün hizmetleri nedeniyle Binbaşılığa terfi etti. Tam adı: Korvet Kaptanı Yeniköylü İbrahim oğlu Hafız Nazmi Efendi. Boğaz\'ın görünmez kahramanıydı.',
        emoji: '🎖️',
    },

    // ─── DENİZALTI — MARIOTTE ───
    {
        startDate: '1915-07-25',
        endDate: '1915-08-05',
        type: 'witness',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü',
        text: 'Fransız denizaltısı Mariotte, Boğaz\'ı geçmeye çalışırken mayın ağlarına takılarak ele geçirildi. Mürettebat esir alındı. Nazmi Bey, Boğaz\'ın denizaltılara karşı da geçilmez olduğunu bir kez daha ispatlamıştı.',
        emoji: '⚓',
    },

    // ─── DENİZALTI — TURQUOISE ───
    {
        startDate: '1915-10-25',
        endDate: '1915-11-05',
        type: 'anecdote',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü, Ekim 1915',
        text: 'Fransız denizaltısı Turquoise, Çanakkale Boğazı\'nda karaya oturdu ve sağlam olarak ele geçirildi. İçinden çıkan gizli belgeler, İngiliz denizaltısı E-11 ile buluşma planını ortaya koydu. Bu istihbarat sayesinde E-11 de tuzağa düşürüldü.',
        emoji: '📋',
    },

    // ─── NUSRET'İN SON SEFERLERİ ───
    {
        startDate: '1915-11-01',
        endDate: '1915-12-15',
        type: 'spirit',
        faction: 'ottoman',
        source: 'Nazmi Bey Günlüğü',
        text: 'Nusret, kampanya boyunca 15\'ten fazla mayın döşeme seferi gerçekleştirdi. Her seferinde düşman keşif uçuşlarından ve denizaltılardan kaçınarak, gece karanlığında operasyon yaptı. Küçük bir mayın gemisi, dünya tarihinin seyrini değiştirmişti.',
        emoji: '🌙',
    },
];

/**
 * Verilen ISO tarihine göre eşleşen romantik girişleri döndürür.
 * @param {string} isoDate - "YYYY-MM-DD" formatında tarih
 * @returns {Array} Eşleşen girişler
 */
export function getRomanticEntries(isoDate) {
    if (!isoDate) return [];
    return ROMANTIC_ENTRIES.filter(e => isoDate >= e.startDate && isoDate <= e.endDate);
}

/**
 * Verilen tarih için rastgele bir romantik giriş seçer.
 * Aynı tarih için her zaman aynı girişi döndürür (deterministik).
 * @param {string} isoDate
 * @returns {object|null}
 */
export function getRandomRomanticEntry(isoDate) {
    const entries = getRomanticEntries(isoDate);
    if (entries.length === 0) return null;
    // Deterministik seçim: tarih string'inin basit hash'i
    let hash = 0;
    for (let i = 0; i < isoDate.length; i++) {
        hash = ((hash << 5) - hash) + isoDate.charCodeAt(i);
        hash |= 0;
    }
    return entries[Math.abs(hash) % entries.length];
}

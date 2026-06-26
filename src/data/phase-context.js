// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Phase Bağlam Katmanı
// Major olaylar için "Neden Önemli" içeriği ve belgesel ton
// narration override'ları. İsoStart tarihi ile indekslenir.
// ══════════════════════════════════════════════════════════════

/**
 * PHASE_CONTEXT: isoStart → "Neden Önemli" sekmesi metni
 * Sadece major olaylar için doldurulmuştur.
 * Yoksa sekme gizlenir.
 */
export const PHASE_CONTEXT = {
    '1914-11-03': 'İngiliz ve Fransız topçularının ilk bombardımanı, Osmanlı Boğaz savunmasını uyardı. Bu "stratejik hata" geri tepti: Osmanlı, tahkimat ve mayın programını hızla genişletti. Uyarı olmadan yapılsaydı farklı bir sonuç doğabilirdi.',

    '1915-02-19': 'İtilaf\'ın "denizden geçiş" stratejisi burada başladı. Kıyı bataryaları bombalanarak susturulacak, Boğaz temizlenecek, İstanbul alınacaktı. Churchill\'in planı Boğaz\'ın piyade desteği olmadan geçilebileceğini varsayıyordu — bu varsayım kanlı bir yanılgıya dönüştü.',

    '1915-03-18': 'İtilaf\'ın en büyük deniz harekâtı, Nusret\'in 7/8 Mart gecesi döşediği 26 mayına çarptı. Üç zırhlı battı. Churchill\'in "denizden geçiş" planı sona erdi. Artık karadan çıkarma kaçınılmazdı — bu karar 250.000\'i aşkın kayıbın habercisiydi.',

    '1915-04-25': 'Kara çıkarması iki ayrı krize dönüştü. Arıburnu\'nda Mustafa Kemal doğru yerde, doğru anda bulundu. Seddülbahir\'de V Beach bir mezbahaya döndü. İlk 24 saat her iki cephenin kaderini belirledi; kampanyanın geri kalanı bu günün donmuş çizgisinde savaşıldı.',

    '1915-08-06': 'Son büyük İtilaf hamlesi — Suvla çıkarması, Conkbayırı taarruzu, Lone Pine aldatması — aynı anda başlatıldı. Yeni Zelanda birlikleri Conkbayırı\'na ulaştı. Ama Suvla\'daki komuta tereddüdü zirveyi kaybettirdi. 10 Ağustos karşı taarruzu kampanyanın son kırılma anıydı.',

    '1915-12-10': 'Kampanyanın en başarılı operasyonu çekilme oldu. Sekiz aylık ölümün ardından, Ocak 1916\'ya kadar sadece 2 kayıpla 83.000 kişi tahliye edildi. Bu paradoks tarihe geçti: Gallipoli\'den en temiz çıkış, girerken değil çıkarken gerçekleşti.'
};

/**
 * NARRATION_OVERRIDES: isoStart → belgesel ton "Ne Oldu" metni
 * Bu metinler updateNarrationPanel'de phase.narration'ın önüne geçer.
 * Sadece 6 ana sahne için tanımlanmıştır.
 */
export const NARRATION_OVERRIDES = {
    '1914-11-03': 'Saat 08:10 — İngiliz ve Fransız savaş gemileri Seddülbahir ve Ertuğrul tabyalarına ateş açtı. On iki dakika süren bombardımanda Osmanlı tarafı 71 asker kaybetti. Bunlar Çanakkale\'nin ilk şehitleriydi. İngilizler, "Boğaz savunulamaz" mesajı vermek istiyordu; aksine Cevat Paşa\'nın hazırlıkları o gece hızlandı. Savaşın fitili ateşlenmişti.',

    '1915-03-18': 'Saat 10:30 — 18 savaş gemisi Boğaz\'a ilerledi. Nusret\'in 7/8 Mart gecesi Erenköy Körfezi\'ne gizlice döşediği 26 mayın, İtilaf\'ın 45 tarama girişiminden sağ çıkmıştı. Saat 13:54\'te Bouvet\'in pruvasından dumanı yükselen su sütunu göğe fırladı. İki dakika. 574 kişi. Irresistible ve Ocean aynı hatta battı. Gün bitti; Boğaz geçilemezdi.',

    '1915-04-25': 'Şafak sökmeden İtilaf sandalları Arıburnu kayalıklarına yanaştı. Seddülbahir\'de SS River Clyde gönüllü kurşun siperliğine dönüştü. V Beach\'te taşıyıcılar birer birer denize düştü — kıyı kanlı kırmızıya boyandı. Arıburnu\'nda Mustafa Kemal Conkbayırı\'nda göründü: "Ben size taarruzu emretmiyorum, ölmeyi emrediyorum." 57. Alay ilerledi. Cephe dondu.',

    '1915-04-27': '24 saatlik kanlı çarpışmanın ardından Arıburnu\'nda siper kazma sesi başladı. Mustafa Kemal\'in 57. Alayı ANZAC kuvvetlerini Conkbayırı sırtlarında durdurdu. Kilometre ilerleyemeyen iki ordu, birbirinden yüz metre uzakta toprak kazmaya başladı. Siper savaşı burada, bu gün başladı.',

    '1915-08-06': 'Gece 09:30 — Suvla Koyu\'nda İngiliz sandalları karaya çıktı. Aynı anda Lone Pine\'da Avustralyalılar siperlerden fırlayarak Osmanlı mevzilerine daldı. Conkbayırı\'nda Yeni Zelanda birlikleri zirveye tırmandı. Kampanyanın son büyük hamlesi üç cephede birden patlak verdi. Ama Suvla\'da komutanlar emri bekledi. Saatler geçti. Fırsat geçti.',

    '1915-12-10': 'Gece — son sandallar Arıburnu sahilinden ayrıldı. Saat 03:30\'da son asker kıyıyı terketti. Osmanlılar hiçbir şey fark etmedi. Sekiz ay boyunca 500.000\'i aşkın kayba tanıklık eden bu yarımada, bugün ıssız kaldı. Tahliye, Gallipoli\'nin en kusursuz operasyonuydu.'
};

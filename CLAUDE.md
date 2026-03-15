# Gelibolu Revival — Handoff Reçetesi
## Tarih Profesörü & UIX Uzmanı Değerlendirmesi

> [!NOTE]
> Bu doküman, projenin **kod değiştirmeden** yapılan bir incelemesidir. İki perspektiften sorunlar ve çözüm önerileri içerir.

---

## BÖLÜM 1: TARİH PROFESÖRÜ DEĞERLENDİRMESİ 🎓

### 1.1 Genel Değerlendirme
Proje, Çanakkale/Gelibolu Muharebeleri'ni (3 Kasım 1914 – 9 Ocak 1916) interaktif bir SVG haritası üzerinde günlük faz bazlı olarak canlandırıyor. Peter Hart'ın *Gallipoli* (2011) kitabından çıkarılmış veri (`book/gallipoli-events.js`) ile destekleniyor. Genel küratöryel çerçeve iyi kurulmuş.

### 1.2 Tarihsel Doğruluk Sorunları

> [!CAUTION]
> Aşağıdaki maddeler tarihsel güvenilirliği zedeleyebilecek sorunlardır.

#### 🔴 Kritik Hatalar

| # | Sorun | Konum | Doğrusu |
|---|-------|-------|---------|
| 1 | **Nusret'in komutanı "Yzb. Tophaneli Hakkı" olarak verilmiş** | `canakkale-1915.html:141` | Nusret Mayın Gemisi'nin komutanı **Kolağası (Kıdemli Yüzbaşı) Nazmi Bey**'dir. "Tophaneli Hakkı" bilinen bir isim değildir. Bazı kaynaklarda ikinci komutan vb. karışıklık olmuş olabilir, ama standart tarih kaynaklarında Nazmi Bey kabul edilir. |
| 2 | **Nusret'in mürettebat sayısı 40 verilmiş** | `canakkale-1915.html:141` | Nusret'in mürettebatı yaklaşık **70-80 kişi**dir. 40 çok düşük; mayın gemisinin operasyonel kapasitesini yanlış yansıtır. |
| 3 | **Nusret'in mayın döşediği tarih "8 Mart gecesi"** | `canakkale-1915.html:142` | Nusret'in kritik mayın döşemesi **7/8 Mart 1915 gecesi** gerçekleşmiştir, ancak bu sadece son sefer değildir. Nusret **birden fazla kez** mayın döşemiştir. En kritik olanı 8 Mart serisindeki Erenköy koyu hattıdır. Tam tarih: **7-8 Mart 1915 gecesi**. |
| 4 | **"26 mayın döşeyerek" ifadesi** | `canakkale-1915.html:142` | Nusret'in son kritik seferinde döşediği mayın sayısı **26** olarak bilinir — bu doğru, ancak toplam döşenen mayın sayısını sadece bu sefere indirgemek hatalı. Nusret toplam operasyonlarında çok daha fazla mayın döşemiştir. |
| 5 | **Bouvet battığında "574 şehit" ifadesi** | `canakkale-1915.html:174` | Bouvet'in mürettebatı 630, kayıp sayısı "574" verilmiş — ancak farklı kaynaklar **639-643 mürettebat, 638-640 kayıp** verir. Bu tutarsızlık: 630 mürettebat - 66 kurtulan = 564. Kaynak tutarlılığı sağlanmalı. |
| 6 | **HMS Irresistible'ın komutanı "Yüzbaşı Dent"** | `canakkale-1915.html:150` | HMS Irresistible'ın komutanı **Captain Douglas Dent** — İngiliz unvanı doğru ama Türkçeye "Yüzbaşı" olarak çevrilmiş. Royal Navy'de "Captain" **Albay** rütbesine denk gelir, "Yüzbaşı" değil. |
| 7 | **HMS Ocean'ın komutanı "Yüzbaşı Hayes-Sadler"** | `canakkale-1915.html:155` | Aynı sorun: Captain (RN) = Albay, Yüzbaşı değil. **Kaptan (Albay) Hayes-Sadler** olmalı. |
| 8 | **Amiral de Robeck'in HMS Queen Elizabeth üzerinde gösterilmesi** | `canakkale-1915.html:147` | 18 Mart 1915'te komutan **Amiral Sir John de Robeck**'tir, ancak HMS Queen Elizabeth'in gemi kaptanı ayrıdır. Amiral donanma komutanıdır; geminin kaptanı değildir. Bu ayrım net yapılmalı. |

#### 🟡 İçerik Eksiklikleri

| # | Eksiklik | Açıklama |
|---|----------|----------|
| 1 | **Cevat Paşa (Cevat Çobanlı) hiç yok** | Çanakkale Müstahkem Mevki Komutanı. Deniz savaşında kıyı bataryalarını yöneten asıl kişi. Projedeki en büyük tarihsel boşluk. |
| 2 | **Seddülbahir çıkarmasının V Beach/W Beach ayrıntısı yok** | 29. Tümen'in çıkarması çok genel. SS River Clyde olayı, V Beach katliamı anlatılmamış. |
| 3 | **Conkbayırı/Chunuk Bair muharebesi eksik** | Ağustos 1915'te Yeni Zelanda Tugayı'nın Conkbayırı'na ulaşması ve Mustafa Kemal'in karşı taarruzu, kampanyanın en dramatik anlarından biridir. Faz tanımı çok yüzeysel. |
| 4 | **Osmanlı 7. Tümen ve 5. Tümen eksik** | Seddülbahir savunmasında kritik rol oynamış birimler haritada yok. |
| 5 | **Mayın tarama gemileri (trawlers) hiç yok** | 18 Mart öncesinde İtilaf'ın mayın tarama girişimleri ve başarısızlıkları anlatılmamış. Bu, Nusret'in başarısını bağlamlandıran kritik bir detaydır. |
| 6 | **Churchill'in rolü hiç anlatılmamış** | Gelibolu harekâtının politik arka planı tamamen eksik. Winston Churchill'in Denizcilik Bakanlığı'ndan düşüşü kampanyanın en önemli politik sonuçlarından biridir. |
| 7 | **Kayıp istatistikleri yok** | Toplam kayıplar belirtilmemiş: ~500.000+ (her iki taraf toplamı). Bu, savaşın boyutunu kavramak için zorunlu. |
| 8 | **"İlk Bombardıman" 3 Kasım 1914 ama bağlam eksik** | Bu bombardıman İngilizlerin Osmanlı'ya "Boğazlar savunulamaz" mesajı vermek istediği stratejik bir hataydı — aksine Osmanlı'yı uyardı ve savunma hazırlıklarını hızlandırdı. |

#### 🟢 Doğru ve İyi Yapılmış Kısımlar

- Komuta zinciri hiyerarşisi (5. Ordu → 3. Kolordu → 19. Tümen → Alaylar) tarihen doğrudur.
- Mustafa Kemal'in 19. Tümen komutanı olarak Yarbay rütbesiyle gösterilmesi doğru.
- 57. Alay'ın "Ben size taarruzu emretmiyorum, ölmeyi emrediyorum!" sözü doğru atıf.
- Liman von Sanders'in Mart 1915'te komutayı devralması doğru.
- Coğrafi konum adları (Arıburnu, Conkbayırı, Seddülbahir, Kumkale, Kilitbahir vb.) doğru.
- Tahliyenin Aralık 1915 – Ocak 1916 tarihlemesi doğru.
- Kampanya kronolojisi (deniz → kara → siper → tahliye) genel yapısı doğru.

---

## BÖLÜM 2: UIX UZMAN DEĞERLENDİRMESİ 🎨

### 2.1 Mimari Sorunlar

> [!WARNING]
> Proje iki paralel versiyon içeriyor: Monolitik `canakkale-1915.html` (1490 satır) ve modüler `src/` mimarisi. Bu kafa karışıklığı yaratır.

| # | Sorun | Detay |
|---|-------|-------|
| 1 | **İki paralel mimari** | `canakkale-1915.html` = monolitik (CSS+JS+HTML tek dosya, 1490 satır). `index.html` + `src/` = ES Modules bazlı modüler versiyon. Hangisinin gerçek entry point olduğu belirsiz. **Birini seçip diğerini kaldır.** |
| 2 | **book/gallipoli-events.js 1.1 MB** | 1.148.730 byte'lık bir JS dosyası global `BOOK_PHASE_EVENTS` ve `BOOK_WEEKLY_GUIDE` oluşturuyor. İlk yükleme performansını öldürür. **JSON'a dönüştürüp lazy-load yapılmalı.** |
| 3 | **animation-events.json 609 KB** | `fetch()` ile async yükleniyor (iyi), ama 609KB çok büyük. Gzip/Brotli sıkıştırma veya veri budama gerekli. |
| 4 | **CSS token tekrarı** | `base.css` ve `canakkale-1915.html` içindeki inline `<style>` aynı CSS token'ları tanımlar. DRY ihlali. |

### 2.2 Kullanıcı Deneyimi Sorunları

> [!IMPORTANT]
> Bir ilk defa gelen ziyaretçinin perspektifinden kritik UX sorunları.

#### 🔴 Acil Düzeltmeler

| # | Sorun | Etki | Çözüm |
|---|-------|------|-------|
| 1 | **Otomatik oynatma (autoplay) çok hızlı** | `AUTO_PLAY_INTERVAL = 420` ms = her 0.42 saniyede bir faz geçişi. 433+ gün = ~3 dakikada tüm savaş bitip başa sarıyor. Kullanıcı hiçbir şey okuyamaz. | Minimum 2000ms interval yapın + narration uzunluğuna göre adaptive hız. Büyük olaylar (major) için 5-8 sn. |
| 2 | **Onboarding / tutorial yok** | Kullanıcı haritayı açınca ne yapacağını bilmiyor. Tokenler ne? Timeline ne? Tıklanabilir mi? | İlk girişte 3-4 adımlık highlight tour (tooltip ile birlikte). |
| 3 | **Narration kutusu çok küçük** | `max-width: 340px`, `font-size: .8rem`. Tarihi anlatılar okunması zor. Mobile'da neredeyse görünmez. | Desktop'ta 420-460px genişlik, mobile'da full-width bottom sheet olarak açılmalı. |
| 4 | **Mobile deneyim kırık** | SVG harita `max-height: calc(100vh - 130px)` ile sabit. Pinch-to-zoom yok. Timeline horizontal scroll mobilde zor. | Touch/gesture desteği ekle. Alt timeline'ı kartlara dönüştür. |
| 5 | **Token'lar üst üste biniyor** | `getClusterOffset` cluster dağıtımı yapmaya çalışıyor ama aynı konumdaki 4-5 birlik yine de üst üste. Özellikle deniz savaşı fazında Boğaz bölgesinde kaos. | Zoom seviyesine göre adaptive cluster radius. |

#### 🟡 Önemli İyileştirmeler

| # | Sorun | Çözüm |
|---|-------|-------|
| 1 | **Renk erişilebilirliği (a11y)** | Osmanlı kırmızısı (#c0392b) ve İngiliz mavisi (#2e6ca4) koyu arka plan üzerinde yeterli kontrast sağlıyor, ama ANZAC yeşili (#27864a) WAG 2.0 AA standardını **geçemiyor**. Renk paleti a11y denetiminden geçirilmeli. |
| 2 | **Timeline dot'ları çok küçük** | Major: 12px, Minor: 6px. 433+ gün = binlerce dot sıralanıyor, yatay scroll çok uzun. **Haftalık/aylık gruplama yapılmalı.** |
| 3 | **Pusula "K" harfi** | Kuzey yönü "K" ile işaretlenmiş. Uluslararası kullanıcılar için "N" (North) beklenir. Dil bazlı yapın veya her ikisini gösterin. |
| 4 | **Font yüklenmesi garanti değil** | `JetBrains Mono` CSS'te var ama `@import` veya `<link>` ile yüklenmiyor. Kullanıcının bilgisayarında yoksa Menlo/Consolas fallback'i çalışır, ama her yerde tutarsız görünüm. Google Fonts'tan veya @font-face ile yükleyin. |
| 5 | **Kayıp/hasar gösterimi eksik** | Batan gemiler "X" ile işaretleniyor ama kayıp asker sayısı, muharebe sertliği gibi bilgiler görsel olarak yansıtılmıyor. Intensity heat-map veya pulse efekti ekleyin. |
| 6 | **Birim Paneli çok basit** | Sadece 6 alan (İsim, Komutan, Kuvvet, Durum, Hedef, Sonuç). Birim açıklaması (`description` alanı) panelde **gösterilmiyor**. Bu çok zengin metinler boşa gidiyor. |
| 7 | **Keyboard navigation yok** | Sol/sağ ok tuşlarıyla fazlar arası gezinti, Space ile play/pause, Escape ile panel kapatma gibi kısayollar eksik. |
| 8 | **"Başlat/Duraklat" butonu çok mütevazı** | Küçük, timeline'ın soluna sıkışmış. Haritanın merkezine büyük bir play overlay koyulabilir (tıkla ve başlat paterni). |

### 2.3 Görsel Tasarım Analizi

#### ✅ İyi Yapılanlar
- **Renk paleti konsepti güçlü**: Parşömen/altın tonları + karanlık zemin askeri harita hissi veriyor.
- **SVG harita detayı etkileyici**: Topoğrafik çizgiler, sırt hatları, hachure desenleri, rakım notları profesyonel görünüyor.
- **Token tasarımları sembolik açıdan anlamlı**: Osmanlı=Hilal, İngiliz=Çapa, ANZAC=Yükselen Güneş, Fransız=Fleur-de-lis.
- **Kıyı bataryaları ve mayın hatları** harita üzerinde doğru konumda ve iyi görselleştirilmiş.
- **Gemi silüetleri** (`navalTokenShape`) ayrı tasarlanmış, amiral gemisi ve batan gemi ayrımı var.

#### ❌ Sorunlu Alanlar
- **Micro-animations yok**: Hover dışında birlikler durağan. "Nefes alan" idle animasyonu, ambient deniz dalgası eksik.
- **Harita grid/scale** çok altlak (opacity .35). Mesafe algısı zayıf; kullanıcı "Seddülbahir ile Conkbayırı arası kaç km?" bilemiyor.
- **Dawn/dusk atmosfer efekti** yok: Kasım'da, Mart'ta, Ağustos'ta farklı ışık hissiyatı oluşturulabilir.
- **Loading state** yok: 1.1MB+609KB veri yüklenirken kullanıcı boş ekran görüyor.

---

## BÖLÜM 3: TEKNİK BORÇ & MİMARİ REÇETE 🏗️

### 3.1 Dosya Temizliği (Öncelik: Yüksek)

```
gerekenler:
  - [ ] canakkale-1915.html monolitik dosyayı ARŞİVLE veya SİL
  - [ ] canakkale-requirements.html ne amaçla var? Belgelendir veya sil
  - [ ] olay-akisi-log.html ne? Debug artığıysa sil
  - [ ] gallipoli-events.js.bak.codex yedek dosyayı sil
  - [ ] .DS_Store'ları .gitignore'a ekle
```

### 3.2 Veri Mimarisi (Öncelik: Yüksek)

```
gerekenler:
  - [ ] gallipoli-events.js (1.1MB) → JSON formatına dönüştür
  - [ ] animation-events.json (609KB) → tarih aralığına göre chunk'la
  - [ ] Birim verilerini battle-data.js'den ayır → units.json
  - [ ] Lokasyon verilerini ayır → locations.json
  - [ ] Tarihsel anchor'ları ayır → historical-anchors.json
```

### 3.3 Performans (Öncelik: Orta)

```
gerekenler:
  - [ ] Loading spinner / skeleton screen ekle
  - [ ] SVG token'ları her faz geçişinde innerHTML ile yeniden oluşturulyor → 
        DOM patching veya keyed update'e geç
  - [ ] requestAnimationFrame tabanlı animasyon yerine CSS transition kullanılıyor,
        ama 420ms interval'da 433+ faz = sürekli DOM thrashing
  - [ ] IntersectionObserver ile off-screen token'ları pasifize et
```

### 3.4 Erişilebilirlik (a11y) (Öncelik: Yüksek)

```
gerekenler:
  - [ ] ARIA live region: narration-box'a aria-live="polite" ekle
  - [ ] Token'lara role="button" ve aria-label ekle
  - [ ] Keyboard navigation: ArrowLeft/Right + Space + Escape
  - [ ] Focus management: panel açıldığında focus trap
  - [ ] Renk kontrast oranlarını WCAG 2.1 AA'ya çek
  - [ ] prefers-reduced-motion media query ile animasyonları durdur
  - [ ] Screen reader için faz geçişlerinde anons
```

### 3.5 Responsive Design (Öncelik: Yüksek)

```
gerekenler:
  - [ ] body overflow:hidden → mobile'da scroll kilitli, kullanılamaz
  - [ ] SVG viewBox sabit (720x560) → mobilde çok küçük
  - [ ] Touch gesture: pinch-to-zoom, pan
  - [ ] Portrait modda timeline alt, landscape'de yan panel
  - [ ] Narration box: mobile'da bottom sheet / drawer
  - [ ] Min-width breakpoint'ler: 320px, 768px, 1024px
```

---

## BÖLÜM 4: ÖNCELİK SIRASI (YÜRÜTME PLANI) 📋

### Faz 1: Temel Düzeltmeler (1-2 gün)
1. Tarihsel hataları düzelt (Nusret komutanı, rütbe çevirileri, kayıp sayıları)
2. Otomatik oynatma hızını düzelt (interval → 2500ms+)
3. Birim paneline `description` alanını ekle
4. Font yüklemesini garanti et (CDN veya local)

### Faz 2: UX İyileştirmeleri (3-5 gün)
5. Loading state ekle
6. Keyboard navigation
7. Mobile responsive düzenlemeler
8. Narration box büyütme
9. Onboarding tutorial (3-step overlay)

### Faz 3: İçerik Zenginleştirme (5-7 gün)
10. Cevat Paşa, eksik birimler ekle
11. Conkbayırı, V Beach ayrıntıları
12. Kayıp istatistikleri ve savaş sertlik göstergesi
13. Churchill ve politik bağlam ek paneli

### Faz 4: Teknik Borç Temizliği (3-5 gün)
14. Monolitik dosyayı arşivle
15. Veri dosyalarını JSON'a dönüştür
16. DOM patching optimizasyonu
17. a11y tam denetim ve düzeltme

---

## BÖLÜM 5: KRİTİK KURALLAR (YENİ GELİŞTİRİCİ İÇİN) ⚠️

1. **`canakkale-1915.html` dosyasına dokunma** — bu dosya monolitik eski versiyondur. Tüm geliştirme `index.html` + `src/` üzerinden yapılmalı.
2. **`book/gallipoli-events.js` global scope'a yazıyor** (`window.BOOK_PHASE_EVENTS`). ES Module sistemiyle çelişiyor ama şu an çalışıyor. Uzun vadede import'a dönüştür.
3. **Phase ID'ler `gun-0001` formatında otomatik üretiliyor** (`buildDailyHistoricalPhases`). 433+ günlük faz var. Manuel phase eklemesi yaparken bu sistemi bozma.
4. **SVG koordinat sistemi 720x560 viewport'ta**. Lokasyon x,y değerleri bu koordinat sistemine göre. Harita düzenlemesinde bu sınırları aşma.
5. **Token pozisyonları deterministik seed ile hesaplanıyor** (`unitSeed` fonksiyonu). Seed değiştirirsen tüm birim yerleşimleri bozulur.
6. **CSS variable'ları `base.css`'te ve `canakkale-1915.html` inline style'da** çift tanımlı. Değişiklik yaparken her iki yeri de kontrol et — veya ideal olarak monolitik dosyayı sil.
7. **`HISTORICAL_ANCHORS` dizisi ana tarihsel olayları belirler**. Yeni bir büyük olay ekliyorsan bu diziye de ekle, yoksa timeline'da minor olarak görünür.

---

*Bu doküman 12 Mart 2026 tarihinde oluşturulmuştur. Projenin mevcut haliyle kapsamlı bir değerlendirmesidir.*

# Claude Handoff: Gelibolu Harita Yerleştirme

## Kullanıcı Hedefi

Kullanıcı, Gelibolu/Çanakkale projesindeki harita üzerindeki tüm görünür katmanların doğru yerlere oturmasını istiyor. Özellikle:

- Yer adları doğru coğrafi konumda olmalı.
- Tabyalar doğru kıyıda olmalı.
- Tümenler/aleyler/kolordular tarihsel olarak doğru cephe veya karargah bölgelerinde görünmeli.
- Base raster harita dışında görünen her şey editörde seçilebilir/sürüklenebilir olmalı.
- Kullanıcı editörden JSON export alıp konumları elle düzeltmek istedi.

Kullanıcı son aşamada "yine olmamış" dedi; yani mevcut sonuç güvenilir kabul edilmemeli.

## Mevcut Durum

Yerel proje dizini:

`/Users/gurursonmez/Downloads/gelibolurevival`

Yerel sunucu:

`npm run serve`

Son açılan URL:

`http://127.0.0.1:4174/?date=1915-03-18`

Yayın/sağlamlık kapısı:

`npm run qa`

Harita asset:

`assets/gallipoli-map.png`

Bu raster 2451x3467 boyutunda. `src/data/coordinate-map.js` içinde `MAP_WIDTH = 2451`, `MAP_HEIGHT = 3467`, `MAP_CROP_TOP = 780`.

## Yapılan Ana Değişiklikler

1. Harita editörü eklendi:

`src/ui/map-editor.js`

Özellikler:

- Sağda açık panel.
- Birim, yer, tabya, sahne etiketi, süs katmanı listesi.
- Marker sürükleme.
- Yer adı/tabya/sahne etiketi üstünden sürükleme.
- Arama, filtre, X/Y sayısal giriş, nudge, seçileni ortala.
- JSON kopyalama/indirme.
- LocalStorage key en son `gelibolu-overlay-editor-v4-logic-r2`.

2. Raster harita renderer'a alındı:

`src/render/map-renderer.js`

Renderer eski 720x560 vektör harita yerine `assets/gallipoli-map.png` asset'ini `2451x3467` viewBox içinde gösteriyor. Ancak dosyada eski renderer bloğu da return sonrası duruyor; pratikte erken `return` ile raster blok kullanılıyor. Bu teknik borç temizlenebilir.

3. Pan/zoom motoru yenilendi:

`src/engine/touch-zoom.js`

Mouse wheel zoom, boş zeminden pan, touch pinch ve `window.GELIBOLU_VIEWPORT` controller var.

4. Konum kalibrasyonları ayrı dosyaya taşındı:

`src/data/geo-calibration.js`

İçerik:

- `GEO_LOCATIONS`
- `MAP_FORTS`
- `MAP_SCENE_LABELS`
- `MAP_ORNAMENTS`
- `MAP_FRONTLINES`

Kullanıcının verdiği son JSON'dan bazı anchor'lar buraya işlendi.

5. Modül cache/version hattı birleştirildi:

Tüm yerel ES module import'ları aynı runtime sürüm query'sine çekildi. Bunun nedeni, ESM query string yüzünden aynı modülün birden fazla kopya olarak yüklenmesiydi. Bu durum `BATTLE_DATA` bir kopyada hydrate edilirken renderer'ın başka bir kopyaya bakmasına yol açabiliyordu. Güncel runtime sürümü `index.html` içindeki `src/app.js?v=...` değerinden okunmalı; elle dosya dosya değiştirmek yerine `npm run version:runtime -- <sürüm>` kullanılmalı.

## Kullanıcının Verdiği Son JSON'dan İşlenen Anchor'lar

Şu noktalar doğrudan veya kısmen işlendi:

- `kilitbahir`: `1427,2086`
- `bogaz`: `1428,2202`
- `canakkale`: `1517,2098`
- `seddulbahir`: `1019,2365`
- `kumkale`: `1058,2526`
- `alcitepe`: `1312,2523`
- `fort-kilitbahir`: `1448,2097`
- `fort-rumeli-mecidiye`: `1379,2154`
- `fort-namazgah`: `1409,2128`
- `fort-seddulbahir`: `1022,2364`
- `fort-cimenlik`: `1536,2187`
- `fort-hamidiye`: `1526,2131`
- `fort-kephez`: `1534,2161` gibi verilmişti, fakat kodda yanlışlıkla `1534,2161` yerine bir ara `1534,2161`/`1534,1381` kontrol edilmeli. Özellikle bu alan tekrar doğrulanmalı.
- `fort-dardanos`: `1447,2302`
- `fort-erenkeui`: `1367,2452`
- `fort-kumkale`: `1067,2530`

Not: JSON'da bazı `cropY` ve `y` değerleri tutarlıydı: `y = cropY + 780`. Kodda tüm elle girilenler bu mantığa göre tekrar kontrol edilmeli.

## Birliklerde Son Yapılan Dağıtım

`src/data/battle-data.js` içinde `naval-assault` seed pozisyonları son olarak yaklaşık şöyle ayarlandı:

- `5-ordu`: `1095,1785`
- `3-kolordu`: `1015,1800`
- `19-tumen`: `1045,1845`
- `57-alay`: `990,1850`
- `27-alay`: `1080,2040`
- `mustahkem-mevki`: `1427,2086`
- `7-tumen`: `1019,2365`
- `9-tumen`: `1375,2135`
- `5-tumen`: `1120,2065`
- `nusret`: `1310,2340`
- `hms-queen-elizabeth`: `1405,2170`
- `hms-irresistible`: `1365,2245`
- `hms-ocean`: `1325,2315`
- `29-div`: `960,2390`
- `anzac-1div`: `820,1815`
- `nz-inf`: `950,1760`
- `bouvet`: `1285,2295`
- `suffren`: `1245,2360`
- `fr-corps`: `1058,2526`

Kullanıcı bu sonuçtan memnun değil. Bu listeyi "doğru" kabul etme; sadece son deneme olarak gör.

## Kritik Sorunlar / Neden Hala Olmamış Olabilir

1. Kullanıcının elle yerleştirdiği JSON kısmen eksik/karışık olabilir.

Kullanıcı kendisi de "hepsini düzeltemedim" dedi. Yer adlarının bazıları iyi, bazı birlikler yanlış yere sürüklenmiş olabilir.

2. `battle-data.js` seed pozisyonları ile `phase-engine`/`position-engine` sonradan üretilen günlük faz pozisyonları aynı şey değil.

Uygulama açılırken:

- `hydrateTimelineData()`
- `expandUnitTrails()`
- `setActivePhase(0)`

çalışıyor. Kitap verisinden günlük fazlar geliyorsa `naval-assault` seed'i doğrudan görünmeyebilir; canonical positions ve generated phase id'leri devreye girer.

3. `canonical-positions.js` yer adlarını lokasyon anchor'larına bağlar.

Asıl tarihsel yerleşim için şu dosya çok önemli:

`src/data/canonical-positions.js`

Orada örneğin:

- `19-tumen` Bigalı/Arıburnu/Conkbayırı/Anafartalar
- `57-alay` Bigalı/Arıburnu
- `7-tumen` Seddülbahir/Alçıtepe
- `9-tumen` Kilitbahir/Seddülbahir
- `5-tumen` Eceabat/Seddülbahir/Kirte

şeklinde location segmentleri var. Bu daha doğru yol olabilir: önce lokasyon anchor'larını güvenilir yap, sonra birlikleri canonical location'a göre otomatik dağıt.

4. `getNarrativeNavalPosition()` gemileri ayrıca oynatıyor.

`src/engine/position-engine.js` içindeki bu fonksiyon deniz döneminde gemileri hesaplıyor. Bu hesap elle girilen `battle-data` pozisyonlarının üstüne etkileyebilir.

5. Terrain clamp hâlâ pozisyonları değiştirebilir.

`src/data/terrain-zones.js` raster sampler ile kara/deniz tespiti yapıyor. Birim terrain'e uymuyorsa `clampToAllowedTerrain()` pozisyonu değiştirebilir.

6. Renderer'da eski 720x560 vektör kodu return sonrasında hâlâ duruyor.

`src/render/map-renderer.js` temizlenmeli. Şu an early return sayesinde çalışmıyor, ama dosya karmaşık ve hata yapmaya açık.

## Önerilen Devam Planı

1. Harita asset üstünde önce sadece `GEO_LOCATIONS` doğrulansın.

`src/data/geo-calibration.js` içindeki tüm `GEO_LOCATIONS` tek tek gerçek harita üzerinde doğru mu kontrol et. Özellikle:

- `suvla`
- `kirectepe`
- `anafartalar`
- `bigali`
- `conkbayiri`
- `ariburnu`
- `kabatepe`
- `eceabat`
- `kilitbahir`
- `canakkale`
- `alcitepe`
- `kirte`
- `seddulbahir`
- `kumkale`

2. Sonra `MAP_FORTS` doğrulansın.

Özellikle iki kıyı ayrımı:

- Avrupa/Gelibolu yakası: Kilitbahir, Rumeli Mecidiye, Namazgah, Seddülbahir.
- Anadolu/Çanakkale yakası: Çimenlik, Hamidiye, Dardanos, Kumkale vb.

3. Birlikleri direkt pixel ile değil, canonical location üzerinden hesaplat.

Yani `battle-data.js` içindeki tekil `x/y` seed'leri değil, `canonical-positions.js` içindeki `location` segmentleri esas alınmalı. Position engine'in `resolvePhaseLocation()` yolu doğru çalışırsa birlikler doğrulanmış location anchor'larına göre dağılır.

4. Editörde sadece default anchor'ları gösteren bir mod eklenebilir.

Kullanıcının işi kolaylaşır:

- Önce "Yerler" filtresi.
- Sonra "Tabyalar" filtresi.
- Sonra "Birimler", ama birimler lokasyona bağlı olarak offsetli gösterilsin.

5. LocalStorage etkisini unutma.

Editör eski localStorage koordinatlarını yeni default'ların üstüne yazabilir. Şu an key:

`gelibolu-overlay-editor-v4-logic-r2`

Yeni denemede key'i artır veya localStorage'ı temizle.

## Son Kontroller

Şunlar temiz geçti:

`node --check src/app.js src/data/battle-data.js src/data/geo-calibration.js src/engine/phase-engine.js src/engine/position-engine.js src/render/token-renderer.js src/render/effects-renderer.js src/render/map-renderer.js src/render/timeline-renderer.js src/render/animation-orchestrator.js src/ui/unit-panel.js src/ui/autoplay-controller.js src/ui/narration-panel.js src/ui/map-editor.js`

Browser-oriented module/import kontrolleri artık `npm run qa` içinde çalışıyor.

Playwright MCP bu ortamda çalışmadı:

`Error: ENOENT: no such file or directory, mkdir '/.playwright-mcp'`

Chrome AppleScript JS execution da kapalıydı:

`Executing JavaScript through AppleScript is turned off`

Bu yüzden görsel doğrulama otomatik yapılamadı.

## Önemli Kullanıcı Geri Bildirimi

Kullanıcı son olarak:

> yine olmamış. neyse Claude için hand off yap ne yaptık diye

dedi. Bu yüzden mevcut yerleşimi final çözüm gibi sunma. Claude'un görevi önce koordinat sistemini ve anchor'ları sadeleştirip güvenilir hale getirmek olmalı.

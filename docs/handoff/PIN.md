# PIN — Devam Noktası

## Hızlı başlangıç
```bash
cd /Users/gurursonmez/Downloads/gelibolurevival
npm run serve
```

Standart uygulama adresi:

- Ana uygulama → http://127.0.0.1:4174/
- Kritik test tarihi → http://127.0.0.1:4174/?date=1915-03-18
- Kalibrasyon stüdyosu → http://127.0.0.1:4174/assets/calibrate.html

## Yayın kapısı

```bash
npm run predeploy
```

Bu komut syntax, runtime import/version sözleşmeleri, asset sözleşmeleri,
tarihsel sözleşmeler, repo hijyeni, kritik tarih matrisi, harita veri kapıları,
sektör doğrulaması, HTTP smoke, deploy sözleşmesi ve `git diff --check`
adımlarını tek seferde çalıştırır.

Preview deploy:

```bash
npm run deploy:preview
```

Production deploy:

```bash
npm run deploy:prod
```

Runtime cache sürümünü elle dosya dosya değiştirme:

```bash
npm run version:runtime -- 20260523-logic-r3
npm run qa
```

## Güncel karar

Yeni tarihsel içerik, yeni UI veya yeni animasyon eklemeden önce `npm run qa`
yeşil olmalı. Bundan sonra "devam" akışı rastgele hata avı değil; düşen kalite
kapısını düzeltme ve aynı hata sınıfını kapıya bağlama akışı.

## Ne yapıldı (bu oturum)
1. **`src/data/geo-calibration.js`** yeniden yazıldı
   - 4 ground-truth anchor (Kilitbahir, Seddülbahir, Suvla, Kumkale)
   - Least-squares affine transform çözücü eklendi
   - Diğer 14 lokasyon + 12 tabya artık **lat/lon'dan matematiksel** üretiliyor
   - API'ler (`GEO_LOCATIONS`, `MAP_FORTS`, `GEO_LOCATION_BY_ID`, `MAP_FRONTLINES`...) değişmedi — çağıran kod sağlam
2. **`assets/calibrate.html`** — "Tıkla → piksel" aracından **Kalibrasyon Stüdyosu**na dönüştürüldü
   - Overlay: anchor (sarı) vs projekte (mavi) noktalar + isimler
   - Canlı RMS + rezidüel tablosu
   - Hover: SVG (x,y) + ters-projeksiyon (lat, lon)
   - Zoom: 25/50/100/200%
   - "Anchor yap" butonu: seç → tıkla → snippet panoya

## Mevcut kalibrasyon
**RMS: 22.8 px** (2451×3467 raster üzerinde ≈ %1)

| Anchor      | Hata  |
|-------------|-------|
| Kilitbahir  | 14 px ✓ |
| Suvla       | 14 px ✓ |
| Seddülbahir | 29 px ⚠ |
| Kumkale     | 29 px ⚠ |

## Eve gelince yapılacaklar
- [ ] Kalibrasyon stüdyosunu büyük ekranda aç, tüm anchor'ları **"hata oku"** togglesiyle gör
- [ ] Seddülbahir ve Kumkale için daha doğru piksel tıklamasıyla cropX/cropY güncelle
- [ ] **Yeni anchor ekle**: Bigalı veya Eceabat (yarımadanın iç bölgesi) → RMS düşer
- [ ] Raporu oku: hangi lokasyonlar (projected) hâlâ yanlış duruyor?
  - Listeden tıkla → ekranda konumunu gör → yanlışsa anchor'a dönüştür
- [ ] RMS 10 px altına indiğinde commit at:
  ```
  git add src/data/geo-calibration.js assets/calibrate.html PIN.md
  git commit -m "feat: affine kalibrasyon + stüdyo — RMS <Xpx"
  ```

## Dokunulan dosyalar
- `src/data/geo-calibration.js` — tamamen yenilendi
- `assets/calibrate.html` — tamamen yenilendi
- `PIN.md` — yeni

## Dokunulmamış ama ilişkili
- `src/data/coordinate-map.js` — `MAP_CROP_TOP=780` sabiti affine'e giriyor, değiştirme
- `src/data/canonical-positions.js` — birim→lokasyon mappingi zaten ID bazlı, otomatik düzeliyor
- `src/engine/position-engine.js` — sadece `loc.x`, `loc.y` okuyor, değişiklik gerekmez

## Nasıl çalışıyor (1 paragraf)
4 anchor noktası hem (lat, lon) hem manuel (cropX, cropY) taşıyor. `solveAffine()` bu 4 eşleşmeyi least-squares ile çözerek `{a,b,c,d,e,f}` katsayılarını üretiyor: `x = a·lon + b·lat + c`. Diğer tüm lokasyonlar/tabyalar sadece lat/lon veriyor; `materialize()` affine'i uygulayıp x/y pikselini türetiyor. Anchor'ı düzeltirsen → matris yeniden çözülür → **tüm dünya otomatik hizalanır**.

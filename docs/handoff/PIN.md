# 📌 PIN — Eve gelince buradan devam et

## Hızlı başlangıç
```bash
cd /Users/gurursonmez/Downloads/gelibolurevival
npx serve -l 8915 --no-clipboard
```
Sonra aç:
- **Kalibrasyon stüdyosu** → http://localhost:8915/assets/calibrate.html
- **Ana uygulama** → http://localhost:8915/

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

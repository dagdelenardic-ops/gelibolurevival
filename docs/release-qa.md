# Gelibolu Revival Release QA

Bu proje icin artik tek bitis cizgisi var:

```bash
npm run qa
```

Deploy oncesi kapı:

```bash
npm run predeploy
```

Bu komut su kapilari sirayla calistirir:

- JavaScript syntax kontrolu: `src/`, `scripts/`, `book/gallipoli-events.js`
- Runtime sozlesmeleri: tek `?v=` surumu, versiyonsuz yerel ES module import yok, eski UI metin sizintisi yok
- Asset sozlesmeleri: CSS, manifest, ikon, foto, video, ses, harita ve kitap/animasyon dosyasi yolları mevcut ve bos degil
- Tarihsel sozlesmeler: Nusret, Cevat Pasa, 5. Ordu tarihi, RN rutbe cevirileri, Bouvet kaybi, V/W Beach ve Conkbayiri kritik bilgileri
- Repo hijyeni: eski port/surum/storage key sizintisi ve tracked debug/yedek artefact yok
- Kritik tarih matrisi: 7 tarih icin campaign fazi, gorunur token sayisi, gosterilmesi/gizlenmesi gereken birimler
- Harita veri kapisi: bilinmeyen birim/lokasyon, kanonik pozisyon eksigi, kaynakli rota sapmasi
- Sektor dogrulamasi: reserve/locked siniflandirmasi
- HTTP smoke: `127.0.0.1:4174` uzerinden index, app module, kitap verisi, animasyon JSON ve raster harita
- `git diff --check`
- Deploy sozlesmesi: Vercel config, `.vercelignore`, runtime dosyalari ve analytics guard

Yerel calistirma:

```bash
npm run serve
```

Standart test adresi:

```text
http://127.0.0.1:4174/?date=1915-03-18
```

Runtime cache surumunu tek hamlede degistirmek icin:

```bash
npm run version:runtime -- 20260523-logic-r3
npm run qa
```

Vercel preview deploy:

```bash
npm run deploy:preview
```

Vercel production deploy:

```bash
npm run deploy:prod
```

Yeni gelistirme kuralı: `npm run qa` yesil olmadan yeni tarihsel icerik, yeni UI veya yeni animasyon eklenmez. QA duserse once dusen kapi sinifi duzeltilir; ayni hata sinifi tekrar etmesin diye kapı guncellenir.

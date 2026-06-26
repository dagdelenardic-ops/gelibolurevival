# Narration Upgrade — Tasarım Dokümanı
**Tarih:** 2026-06-26  
**Yaklaşım:** Eklentili (Yaklaşım 1) — mevcut `narration-panel.js` korunur, üstüne katmanlar eklenir

---

## Hedef

Mevcut narration panelini dört boyutta iyileştir:

| Boyut | Hedef |
|-------|-------|
| **A · Metin kalitesi** | Belgesel anlatıcı tonu — dramatik, sinematik, şimdiki zaman |
| **B · Yapısal tasarım** | 3 sekme: Ne Oldu / Neden Önemli / İnsan Hikayeleri |
| **C · Medya entegrasyonu** | Fotoğraf/video panelden çıkar → modal butona taşınır |
| **D · Romantik katman** | `romantic-layer.js` → "İnsan Hikayeleri" sekmesine otomatik bağlı |

---

## A · Metin Kalitesi — Belgesel Ton Kuralları

### Ton Tanımı
Mevcut narration metinleri düz anlatımlı ve pasif. Yeni ton: **BBC Belgeseli anlatıcısı** — sahnede, hisseden, dramatik.

### Yazım Kuralları (major event metinleri için)
1. **Açılış cümlesi = en güçlü gerçek**: Saat, yer, eylem ya da sayı ile başla.  
   ❌ `"18 Mart 1915'te büyük deniz taarruzu başladı."`  
   ✅ `"Saat 10:30 — 18 büyük savaş gemisi Boğaz'a girdi. Hiçbiri bilmiyordu."`

2. **Şimdiki zaman veya dramatik geçmiş**: Pasif yapıdan kaçın.  
   ❌ `"574 kişi hayatını kaybetti."`  
   ✅ `"574 kişi iki dakikada suya gömüldü."`

3. **İnsan ölçeği**: Rakamları somut karşılığıyla ver.  
   ❌ `"574 mürettebat kaybedildi."`  
   ✅ `"574 kişi — bir Fransız kasabasının tüm erkek nüfusu."`

4. **Uzunluk**: Major olaylar 80–120 kelime. Geçiş günleri 30–50 kelime.

5. **Kapanış**: Sahneyi bir sonraki güne köprüle, soru veya gerilimle bitir.

### Hangi Günler Yeni Metin Alacak
`mobilePriority === 'feature'` olan ~30 phase. Bu günler için `battle-data.js` ve `historical-map-data.js`'teki mevcut `narration` alanı yeniden yazılacak.

---

## B · Yapısal Tasarım — 3 Sekme Sistemi

### Veri Katmanı Değişikliği

Major phase objelerine bir yeni alan ekleniyor:

```js
{
  // ... mevcut alanlar aynen kalıyor ...
  context: 'Bouvet\'in batışı tüm İtilaf donanma planının...',  // YENİ — opsiyonel
}
```

`context` alanı: stratejik bağlam, kampanya içindeki yeri, bu anın neden kırılma noktası olduğu.  
Sadece ~30 major event için doldurulur. Yoksa sekme gizlenir.

### UI Değişiklikleri — `narration-panel.js`

**`renderDesktopNarrationShell()` içine** mevcut `narration-title` + `narration-text` bloğunun yerine:

```html
<!-- Sekme bar -->
<div class="narration-tab-bar" role="tablist">
  <button class="narration-tab is-active" data-tab="what" role="tab">Ne Oldu</button>
  <button class="narration-tab" data-tab="why" role="tab" hidden>Neden Önemli</button>
  <button class="narration-tab" data-tab="human" role="tab">İnsan Hikayeleri</button>
</div>

<!-- Sekme panelleri -->
<div class="narration-tab-panel" data-panel="what" role="tabpanel">
  <div class="narration-title" id="narrationTitle">…</div>
  <div class="narration-text" id="narrationText">…</div>
</div>
<div class="narration-tab-panel" data-panel="why" role="tabpanel" hidden>
  <div class="narration-context" id="narrationContext">…</div>
</div>
<div class="narration-tab-panel" data-panel="human" role="tabpanel" hidden>
  <div class="romantic-quote" id="romanticQuote"></div>
</div>
```

**`updateNarrationPanel()` içine** yeni güncellemeler:
- `#narrationContext` → `phase.context` ile doldur
- "Neden Önemli" sekmesi: `phase.context` varsa tab butonu göster, yoksa gizle
- `#romanticQuote` zaten `updateRomanticQuote()` ile dolduruluyor — sekme paneline taşı

**Sekme geçiş mantığı** — `bindDesktopCampaignInteractions()` içine eklenir:
```js
document.querySelectorAll('.narration-tab').forEach(btn => {
  btn.addEventListener('click', () => switchNarrationTab(btn.dataset.tab));
});
```

**`switchNarrationTab(tab)`** yeni yardımcı fonksiyon:
- Aktif tab butonunu güncelle
- İlgili panel'i göster/gizle
- Sekme değişiminde panel scroll'unu sıfırla

### Mobil Uyumu
Mobil `renderMobileNarrationShell()` şu an ayrı yapıda. Sekme sistemi şimdilik sadece **desktop** için. Mobil mevcut yapısını koruyor (story + detail toggle). İkinci fazda eklenebilir.

---

## C · Medya Entegrasyonu — Modal Viewer

### Mevcut Sorun
`#eventImage` ve `#eventVideo` div'leri panel içinde inline gösteriliyor — metni iter, düzeni bozar.

### Yeni Yaklaşım
1. **Desktop** `renderDesktopNarrationShell()` içindeki `#eventImage` ve `#eventVideo` div'leri kaldırılır. Mobil `renderMobileNarrationShell()` bu div'lere dokunmaz — mobil mevcut yapısını koruyor.
2. Görsel/video varsa sağ alt köşede küçük bir buton çıkar:
   ```html
   <button class="narration-media-btn" id="narrationMediaBtn" hidden>
     📷 Arşiv Fotoğrafı →
   </button>
   ```
3. Video varsa metin `🎬 Arşiv Görüntüsü →` olur.
4. Tıklandığında `<dialog>` overlay açılır — tam ekran, ESC ile kapanır.

### Modal HTML (body'ye eklenir, bir kez)
```html
<dialog id="mediaModal" class="media-modal">
  <button class="media-modal-close" autofocus>✕</button>
  <div class="media-modal-content" id="mediaModalContent"></div>
</dialog>
```

### `updateNarrationPanel()` değişikliği

`updateEventVideo()` çağrısı `true/false` döndürecek şekilde güncellenir (şu an `void`). Buna göre:

```js
const hasVideo = updateEventVideo(imageResult.hasImage, campaignPhaseId, animData, imageResult.preferStill, phase.isoStart || '');
const mediaBtn = document.getElementById('narrationMediaBtn');
if (mediaBtn) {
  const hasMedia = imageResult.hasImage || hasVideo;
  mediaBtn.hidden = !hasMedia;
  mediaBtn.textContent = hasVideo ? '🎬 Arşiv Görüntüsü →' : '📷 Arşiv Fotoğrafı →';
}
```

`updateEventVideo()` fonksiyonu: mevcut imzası `void`, `true` (clip bulundu) veya `false` (clip yok) döndürecek şekilde güncellenir.

### `openMediaModal()` yeni fonksiyon
```js
function openMediaModal(content) {
  document.getElementById('mediaModalContent').innerHTML = content;
  document.getElementById('mediaModal').showModal();
}
```

---

## D · Romantik Katman — "İnsan Hikayeleri" Sekmesi

### Mevcut Durum
`updateRomanticQuote()` zaten `romantic-layer.js`'ten tarih eşleşmeli entry çekiyor ve `#romanticQuote` div'ine yazıyor. Bu div şu an desktop'ta "narration-content" içinde, mobilde "story-detail" içinde.

### Değişiklik
- `#romanticQuote` div'i "İnsan Hikayeleri" sekme panelinin içine taşınır
- `updateRomanticQuote()` fonksiyonu değişmez — sadece render ettiği hedef sekme paneline alınmış olur
- Entry yoksa sekme "Kayıt yok" mesajı gösterir (romantik katman kapsamlı, bu nadiren olur)

### İçerik Hiyerarşisi
```
İnsan Hikayeleri sekmesi
├── romantic-layer.js → tarih eşleşmeli entry (quote / letter / anecdote / witness / spirit)
│   ├── Emoji + tür etiketi (Tarihi Söz / Asker Mektubu / Anekdot…)
│   ├── Metin
│   └── Kaynak
└── (major olaylar için opsiyonel) phase.humanStory alanı — ilerleyen fazda
```

---

## Etkilenen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/ui/narration-panel.js` | Sekme bar + paneller, modal fonksiyonu, `renderDesktopNarrationShell()` güncelleme |
| `styles/panel.css` | `.narration-tab`, `.narration-tab-panel`, `.media-modal` stilleri |
| `src/data/battle-data.js` | ~30 major phase'e `context` alanı ekleme |
| `src/data/historical-map-data.js` | ~30 major phase'e yeniden yazılmış `narration` metni |
| `index.html` | `<dialog id="mediaModal">` body'ye ekleme |

---

## Kapsam Dışı

- Mobil sekme sistemi (ikinci faz)
- `phase.humanStory` manuel alanı (üçüncü faz)
- `book/gallipoli-events.js` içeriği (ayrı proje)
- Autoplay hız değişikliği (ayrı konu)

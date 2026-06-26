# Narration Upgrade — Implementasyon Planı

> **Subagent için:** `subagent-driven-development` skill'i ile task-by-task uygula.

**Hedef:** Narration panelini 4 boyutta iyileştir — belgesel ton, 3 sekme, modal medya, romantik katman.

**Mimari:** Eklentili yaklaşım. `narration-panel.js` korunur, sekme UI + modal mantığı eklenir. `phase-context.js` yeni dosyası context ve narration override verisi taşır.

**Etkilenen dosyalar:**
- `styles/map.css` — sekme + modal CSS
- `index.html` — dialog elemanı
- `src/data/phase-context.js` — YENİ: context ve narration override lookup
- `src/ui/narration-panel.js` — desktop shell refactor, modal, sekme mantığı
- `src/data/battle-data.js` — 6 major phase narration yeniden yazma

**Versiyon:** Her dosya değişikliğinde `?v=20260626-narration-r1` versiyonu ekle.

---

## Task 1: CSS — Sekme ve Modal Stilleri

**Hedef:** `.narration-tab-bar`, `.narration-tab`, `.narration-tab-panel`, `.media-modal` stillerini `styles/map.css`'e ekle.

**Dosya:** `styles/map.css`

**Adım 1:** `styles/map.css`'te `.narration-text` bloğunun sonunu bul (satır ~1273). Hemen altına ekle:

```css
/* ── Narration Sekmeler ── */
.narration-tab-bar {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid rgba(120, 100, 70, .22);
    margin-bottom: 12px
}

.narration-tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: .68rem;
    letter-spacing: .04em;
    padding: 6px 10px;
    cursor: pointer;
    transition: color .15s, border-color .15s
}

.narration-tab.is-active {
    color: var(--red-light);
    border-bottom-color: var(--red)
}

.narration-tab:hover:not(.is-active) {
    color: var(--text)
}

.narration-tab-panel[hidden] {
    display: none
}

.narration-context {
    font-size: .86rem;
    color: var(--text-muted);
    line-height: 1.65
}

.narration-media-btn {
    display: block;
    margin-top: 10px;
    background: rgba(30, 20, 10, .6);
    border: 1px solid rgba(120, 100, 70, .3);
    color: #c9a84c;
    font-size: .72rem;
    font-family: var(--mono);
    padding: 5px 12px;
    border-radius: 3px;
    cursor: pointer;
    letter-spacing: .03em;
    transition: background .15s
}

.narration-media-btn:hover {
    background: rgba(139, 58, 58, .25)
}

/* ── Media Modal ── */
.media-modal {
    background: rgba(10, 8, 6, .97);
    border: 1px solid rgba(120, 100, 70, .35);
    border-radius: 8px;
    padding: 0;
    max-width: min(90vw, 860px);
    max-height: 90vh;
    width: 100%
}

.media-modal::backdrop {
    background: rgba(0, 0, 0, .82)
}

.media-modal-inner {
    position: relative;
    padding: 48px 24px 24px
}

.media-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(80, 70, 50, .2);
    border: 1px solid rgba(120, 100, 70, .3);
    color: var(--text-muted);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    font-size: .9rem;
    display: flex;
    align-items: center;
    justify-content: center
}

.media-modal img,
.media-modal video {
    max-width: 100%;
    max-height: 65vh;
    object-fit: contain;
    display: block;
    margin: 0 auto
}

.media-modal-caption {
    margin-top: 10px;
    font-size: .8rem;
    color: var(--text-muted);
    text-align: center
}

.media-modal-source {
    font-size: .72rem;
    color: rgba(180, 160, 120, .5);
    text-align: center;
    margin-top: 4px
}
```

**Adım 2:** Kaydet.

**Adım 3:** Commit:
```bash
git add styles/map.css
git commit -m "style: narration sekme bar, tab panelleri ve media modal CSS"
```

---

## Task 2: Dialog Elemanı — index.html

**Hedef:** `<dialog id="mediaModal">` body'ye ekle.

**Dosya:** `index.html`

**Adım 1:** `index.html`'de `</body>` kapanış etiketini bul. Hemen öncesine ekle:

```html
<dialog id="mediaModal" class="media-modal">
  <div class="media-modal-inner">
    <button class="media-modal-close" id="mediaModalClose" aria-label="Kapat">✕</button>
    <div id="mediaModalContent"></div>
  </div>
</dialog>
```

**Adım 2:** Kaydet.

**Adım 3:** Commit:
```bash
git add index.html
git commit -m "feat: media modal dialog elemanı (kapalı, JS ile açılacak)"
```

---

## Task 3: `phase-context.js` — Yeni Veri Dosyası

**Hedef:** Major olaylar için `context` (Neden Önemli sekmesi) ve `narrationOverride` (belgesel ton) verisi.

**Dosya:** `src/data/phase-context.js` (YENİ)

**Adım 1:** Dosyayı oluştur:

```js
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
```

**Adım 2:** Kaydet.

**Adım 3:** Commit:
```bash
git add src/data/phase-context.js
git commit -m "feat(data): phase-context.js — belgesel ton override + Neden Önemli bağlam metinleri"
```

---

## Task 4: Desktop Narration Shell — 3 Sekme HTML

**Hedef:** `renderDesktopNarrationShell()` fonksiyonunu sekme sistemiyle güncelle.

**Dosya:** `src/ui/narration-panel.js`

**Adım 1:** Dosyanın başındaki import bloğunu bul (satır 1–13). `phase-context.js` importunu ekle:

```js
import { PHASE_CONTEXT, NARRATION_OVERRIDES } from '../data/phase-context.js?v=20260626-narration-r1';
```

**Adım 2:** `renderDesktopNarrationShell` fonksiyonunu bul (satır 506). Tüm fonksiyon gövdesini şununla değiştir:

```js
function renderDesktopNarrationShell(phase, displayTitle, clean, icon) {
    const chapter = getGuidedCampaignChapter(phase.isoStart);
    const contextText = PHASE_CONTEXT[phase.isoStart] || '';
    const hasContext = Boolean(contextText);
    return `
        <button class="narration-toggle" id="narrationToggle" type="button" aria-label="Paneli aç/kapat">
            <span class="narration-toggle-icon">▼</span>
            <span class="narration-toggle-label">${displayTitle}</span>
        </button>
        <div class="narration-content" id="narrationContent">
            <div class="guided-campaign-panel">
                <div class="guided-campaign-kicker">Kampanya Akışı</div>
                <div class="guided-chapter-strip" aria-label="Kampanya bölümleri">
                    ${renderChapterButtons('guided-chapter-marker')}
                </div>
                <div class="guided-campaign-readout">
                    <div><span>Kırılma</span><strong id="campaignPromise">${escapeHtml(phase.guidedChapterPromise || chapter.promise)}</strong></div>
                    <div><span>Ölçek</span><strong id="campaignMetric">${escapeHtml(phase.guidedChapterMetric || chapter.metricLabel)}</strong></div>
                    <div><span>Baskı</span><strong id="campaignIntensity">${escapeHtml(phase.guidedChapterCasualty || chapter.casualtyLabel)}</strong></div>
                    <div><span>Sonuç</span><strong id="campaignOutcome">${escapeHtml(phase.guidedChapterOutcome || chapter.outcome)}</strong></div>
                </div>
            </div>
            <div class="narration-title" id="narrationTitle">
                <img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon">
                ${displayTitle} <span class="narration-date">— ${phase.date}</span>
            </div>
            <div class="narration-tab-bar" role="tablist" aria-label="Olay sekmeleri">
                <button class="narration-tab is-active" data-tab="what" role="tab" aria-selected="true">Ne Oldu</button>
                <button class="narration-tab" data-tab="why" role="tab" aria-selected="false"${hasContext ? '' : ' hidden'}>Neden Önemli</button>
                <button class="narration-tab" data-tab="human" role="tab" aria-selected="false">İnsan Hikayeleri</button>
            </div>
            <div class="narration-tab-panel" data-panel="what" role="tabpanel">
                <div class="narration-text" id="narrationText">${clean || ''}</div>
            </div>
            <div class="narration-tab-panel" data-panel="why" role="tabpanel" hidden>
                <div class="narration-context" id="narrationContext">${escapeHtml(contextText)}</div>
            </div>
            <div class="narration-tab-panel" data-panel="human" role="tabpanel" hidden>
                <div class="romantic-quote" id="romanticQuote" style="display:none"></div>
            </div>
            <button class="narration-media-btn" id="narrationMediaBtn" hidden>📷 Arşiv Fotoğrafı →</button>
            <div class="narration-transition" id="sceneTransitionText" style="display:none"></div>
        </div>
    `;
}
```

**Adım 3:** Kaydet ama henüz commit etme — Task 5 ile birlikte commit edilecek.

---

## Task 5: Sekme Geçiş Mantığı

**Hedef:** `switchNarrationTab()` yardımcı fonksiyon ekle; `bindDesktopCampaignInteractions()`'a sekme binding'i ekle.

**Dosya:** `src/ui/narration-panel.js`

**Adım 1:** `bindDesktopCampaignInteractions` fonksiyonunu bul (satır 450). Fonksiyona şunu ekle:

```js
function bindDesktopCampaignInteractions() {
    document.querySelectorAll('.guided-chapter-marker').forEach((button) => {
        button.addEventListener('click', () => {
            if (mobileHandlers.onJumpToChapter) mobileHandlers.onJumpToChapter(button.dataset.startIso);
        });
    });
    // Sekme geçişi
    document.querySelectorAll('.narration-tab').forEach((btn) => {
        btn.addEventListener('click', () => switchNarrationTab(btn.dataset.tab));
    });
}
```

**Adım 2:** `bindDesktopCampaignInteractions`'ın hemen üstüne yeni `switchNarrationTab` fonksiyonunu ekle:

```js
function switchNarrationTab(tab) {
    document.querySelectorAll('.narration-tab').forEach((btn) => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.narration-tab-panel').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab;
    });
    const content = document.getElementById('narrationContent');
    if (content) content.scrollTop = 0;
}
```

**Adım 3:** Commit (Task 4 + Task 5 birlikte):
```bash
git add src/ui/narration-panel.js
git commit -m "feat(ui): narration 3 sekme shell + switchNarrationTab mantığı"
```

---

## Task 6: `updateEventVideo()` Return Value

**Hedef:** `updateEventVideo()` fonksiyonu `void` yerine `boolean` döndürsün.

**Dosya:** `src/ui/narration-panel.js`

**Adım 1:** `updateEventVideo` fonksiyonunu bul (satır 287). Fonksiyon gövdesindeki tüm `return;` ifadelerini `return false;` yap. `lastVideoFile = clip.file;` satırından sonraki bloğun sonuna `return true;` ekle.

Sonuç:
```js
function updateEventVideo(hasImage, campaignPhaseId, animData, preferStill = false, isoDate = '') {
    const el = document.getElementById('eventVideo');
    if (!el) return false;

    const eventType = animData?.eventType || 'IDLE';
    const intensity = animData?.intensity ?? 0;

    if (hasImage && (preferStill || intensity < 7)) {
        if (lastVideoFile) {
            el.style.display = 'none';
            el.innerHTML = '';
            lastVideoFile = '';
        }
        return false;
    }

    const clip = getEventVideo(campaignPhaseId, eventType, intensity, isoDate || animData?.date || '');

    if (!clip) {
        if (lastVideoFile) {
            el.style.display = 'none';
            el.innerHTML = '';
            lastVideoFile = '';
        }
        return false;
    }

    if (clip.file === lastVideoFile) return true;
    lastVideoFile = clip.file;

    if (hasImage) {
        const imgEl = document.getElementById('eventImage');
        if (imgEl) {
            imgEl.style.display = 'none';
            imgEl.innerHTML = '';
            lastImageUrl = '';
        }
    }

    el.style.display = 'block';
    el.innerHTML = `<video class="event-video-player" src="${clip.file}" muted playsinline controls preload="metadata"></video><div class="event-image-caption">${clip.desc}</div><div class="event-image-source">Gerçek görüntü — renklendirilmiş arşiv</div>`;
    return true;
}
```

**Not:** `#eventVideo` div'i artık desktop narration shell'de yok (Task 4'te kaldırıldı). Bu fonksiyon mobile için çalışmaya devam eder (`#eventVideo` mobile shell'de var). Desktop için dönen `boolean` media modal kararında kullanılacak.

**Adım 2:** Kaydet ama henüz commit etme — Task 7 ile birlikte.

---

## Task 7: Modal Açma Mantığı + `updateNarrationPanel()` Güncelleme

**Hedef:** `openMediaModal()` fonksiyonu ekle. `updateNarrationPanel()`'i context, narration override ve media button için güncelle.

**Dosya:** `src/ui/narration-panel.js`

**Adım 1:** `switchNarrationTab` fonksiyonunun hemen altına `openMediaModal` ve `initMediaModal` ekle:

```js
function openMediaModal(htmlContent) {
    const modal = document.getElementById('mediaModal');
    const content = document.getElementById('mediaModalContent');
    if (!modal || !content) return;
    content.innerHTML = htmlContent;
    modal.showModal();
}

function initMediaModal() {
    const modal = document.getElementById('mediaModal');
    const closeBtn = document.getElementById('mediaModalClose');
    if (!modal) return;
    if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
}
```

**Adım 2:** `updateNarrationPanel` fonksiyonunu bul (satır 331). Mevcut `imageResult` ve `updateEventVideo` çağrılarının altına, `updateDetailToggle` çağrısından önce şunu ekle:

```js
// Narration override (belgesel ton)
const overrideText = NARRATION_OVERRIDES[phase.isoStart] || '';
if (text && overrideText) text.textContent = overrideText;
else if (text) text.textContent = detailText;

// Context sekme görünürlüğü
const contextEl = document.getElementById('narrationContext');
const whyTab = document.querySelector('.narration-tab[data-tab="why"]');
const contextText = PHASE_CONTEXT[phase.isoStart] || '';
if (contextEl) contextEl.textContent = contextText;
if (whyTab) whyTab.hidden = !contextText;

// Media butonu
const mediaBtn = document.getElementById('narrationMediaBtn');
if (mediaBtn && !isMobileNarration()) {
    const hasVideo = updateEventVideo(imageResult.hasImage, campaignPhaseId, animData, imageResult.preferStill, phase.isoStart || '');
    const hasMedia = imageResult.hasImage || hasVideo;
    mediaBtn.hidden = !hasMedia;
    if (hasMedia) {
        mediaBtn.textContent = hasVideo ? '🎬 Arşiv Görüntüsü →' : '📷 Arşiv Fotoğrafı →';
        mediaBtn.onclick = () => {
            const imgEl = document.getElementById('eventImage');
            const vidEl = document.getElementById('eventVideo');
            const src = hasVideo ? vidEl?.innerHTML : imgEl?.innerHTML;
            if (src) openMediaModal(src);
        };
    }
}
```

**Adım 3:** `updateNarrationPanel`'deki mevcut `if (text) text.textContent = detailText;` satırını kaldır (yukarıdaki override bloğu onu kapsıyor).

**Adım 4:** `attachNarrationElements` fonksiyonundaki desktop binding bloğunu bul (satır ~579). `bindDesktopCampaignInteractions()` çağrısının hemen öncesine `initMediaModal()` ekle:

```js
if (isMobileNarration()) {
    // ... mobile path (değişmez)
} else {
    initMediaModal();
    const toggleBtn = document.getElementById('narrationToggle');
    // ... (mevcut toggle kodu değişmez)
    bindDesktopCampaignInteractions();
}
```

**Adım 5:** Commit (Task 6 + Task 7 birlikte):
```bash
git add src/ui/narration-panel.js
git commit -m "feat(ui): narration modal viewer, context sekme + belgesel ton override"
```

---

## Task 8: Battle-Data Major Phase Narration — Belgesel Ton

**Hedef:** `battle-data.js`'teki 6 ana fazın narration metinlerini belgesel tona çevir.

**Dosya:** `src/data/battle-data.js`

Bu narrationlar `phase-context.js`'teki `NARRATION_OVERRIDES`'dan zaten geçersiz kılınacak (Task 3). Yine de `battle-data.js` doğrudan çalışıldığında (fallback) da belgesel ton hissettirsin.

**Adım 1:** `battle-data.js`'te `phases` dizisini bul (satır ~205). Her fazın `narration` alanını güncelle:

**`naval-assault` (satır ~208):**
```js
narration: "Saat 10:30 — 18 savaş gemisi Boğaz'a ilerledi. Nusret'in 7/8 Mart gecesi Erenköy Körfezi'ne gizlice döşediği 26 mayın, İtilaf'ın 45 tarama girişiminden sağ çıkmıştı. Saat 13:54'te Bouvet'in pruvasından dumanı yükselen su sütunu göğe fırladı. İki dakika. 574 kişi. Irresistible ve Ocean aynı hatta battı. Gün bitti; Boğaz geçilemezdi.",
```

**`april-landings` (satır ~213):**
```js
narration: "Şafak sökmeden İtilaf sandalları Arıburnu kayalıklarına yanaştı. Seddülbahir'de SS River Clyde gönüllü kurşun siperliğine dönüştü — V Beach kıyısı kıpkırmızı oldu. Arıburnu'nda Mustafa Kemal Conkbayırı'nda göründü: 'Ben size taarruzu emretmiyorum, ölmeyi emrediyorum.' 57. Alay ilerledi. Cephe dondu.",
```

**`ariburnu-battles` (satır ~218):**
```js
narration: "Arıburnu kayalıklarında iki ordu birbirine kenetlendi. Mustafa Kemal'in 57. Alayı ANZAC kuvvetlerinin her ilerleyişini geri püskürttü. Yüz metre gerisinde mevzi kazılıyor, yüz metre önünde adam ölüyordu. Siper savaşı başlamıştı — ve bitmeyecekti.",
```

**`seddulbahir-battles` (satır ~223):**
```js
narration: "Kirte ve Alçıtepe için her taarruz kan istedi. V Beach ve W Beach'teki köprübaşları genişleyemedi. Osmanlı 5., 7. ve 9. Tümenleri her metre toprak için bedel biçti. Güney cephe bir hesap makinesine dönüşmüştü: toprak yerine adam, adam yerine kayıp sayısı.",
```

**`august-offensive` (satır ~228):**
```js
narration: "Üç cephede aynı anda: Suvla Koyu'nda çıkarma, Lone Pine'da aldatma, Conkbayırı'nda tırmanış. Yeni Zelanda birlikleri zirveye ulaştı. Ama Suvla'da komutanlar bekledi — saatler geçti, fırsat geçti. 10 Ağustos'ta Mustafa Kemal'in karşı taarruzu Conkbayırı'nı geri aldı. Son büyük hamle çöktü.",
```

**`evacuation` (satır ~233):**
```js
narration: "Gece — son sandallar Arıburnu'ndan ayrıldı. Osmanlılar fark etmedi. Sekiz ayda 500.000'i aşkın kayba sahne olan bu toprak, sessiz kaldı. Tahliye, Gallipoli'nin en kusursuz operasyonuydu: girerken değil çıkarken.",
```

**Adım 2:** Commit:
```bash
git add src/data/battle-data.js
git commit -m "feat(data): 6 ana faz narration belgesel tona güncellendi"
```

---

## Task 9: Versiyon Güncelleme + Smoke Test

**Hedef:** Import versiyonlarını güncelle, sayfayı aç, 3 sekmeyi test et.

**Dosya:** `src/ui/narration-panel.js`

**Adım 1:** Dosyanın tepesindeki tüm `?v=20260622-hp-polish-r1` versiyonlarını `?v=20260626-narration-r1` yap.

**Adım 2:** `src/data/phase-context.js`'te (Task 3'te oluşturuldu) — versiyon gerekmez, static dosya.

**Adım 3:** Tarayıcıda `index.html`'i aç (local server ile). Şunları kontrol et:

| Test | Beklenen |
|------|----------|
| 3 sekme görünüyor mu? | "Ne Oldu" aktif, diğerleri tıklanabilir |
| İnsan Hikayeleri sekmesi | Romantic layer entry görünüyor |
| 18 Mart 1915 tarihine git | "Neden Önemli" sekmesi çıkıyor |
| Görsel olan bir güne git | "📷 Arşiv Fotoğrafı →" butonu çıkıyor |
| Butona tıkla | Modal açılıyor, ESC kapatıyor |
| Mobil genişlik | Sekme yok, mevcut story/detail yapısı |

**Adım 4:** Final commit:
```bash
git add src/ui/narration-panel.js
git commit -m "chore: narration-r1 versiyon bump + smoke test kontrol"
```

---

## Özet Commit Sırası

```
style: narration sekme bar, tab panelleri ve media modal CSS
feat: media modal dialog elemanı (kapalı, JS ile açılacak)
feat(data): phase-context.js — belgesel ton override + Neden Önemli bağlam metinleri
feat(ui): narration 3 sekme shell + switchNarrationTab mantığı
feat(ui): narration modal viewer, context sekme + belgesel ton override
feat(data): 6 ana faz narration belgesel tona güncellendi
chore: narration-r1 versiyon bump + smoke test kontrol
```

---

## Dikkat Noktaları

1. **Mobil korunuyor**: `renderMobileNarrationShell()` dokunulmaz. `isMobileNarration()` false ise sekme bind'ları çalışmaz.
2. **`#eventImage` / `#eventVideo` div'leri**: Desktop shell'den kaldırıldı (Task 4). Mobile shell'de var — orada media inline kalmaya devam ediyor.
3. **`updateNarrationPanel()`'deki `text.textContent` satırı**: Task 7'de override bloğu bunu kapsıyor — eski satırı sil, double-write yaratma.
4. **`NARRATION_OVERRIDES` önceliği**: `phase-context.js`'ten gelen override > `battle-data.js` narration > kitap verisi. Sadece Task 3'te tanımlı 6 tarihe uygulanır.

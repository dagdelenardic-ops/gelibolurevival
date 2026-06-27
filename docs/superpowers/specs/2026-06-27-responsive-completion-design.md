# Tasarım: Responsive İpliğini Tamamlama + 3B'yi Mobilde Kapatma

> **Tarih:** 27 Haziran 2026
> **Durum:** Onaylandı (brainstorming) → implementasyon planı bekliyor
> **Kapsam tipi:** Yarım kalmış responsive ipliğini production-ready yapma + 3B mobil davranışı

---

## 1. Bağlam & Problem

Çalışma ağacında commit edilmemiş ~40 dosya var. Bu yığın **tek bir iş değil, üç ayrı ipliktir**:

1. **`hp-polish-r1` cache-bust** (dosyaların ~%75'i): mekanik `?v=20260620-combat-fx-r1` → `?v=20260622-hp-polish-r1` import zıplaması. Mantık değişikliği yok.
2. **3B "hp-polish" özelliği** (`scene3d.js` +819 satır, `campaign-movement.js` veri kontratı, `scene3d.css` motion-caption baz stilleri): kıyı rampası terrain, gemi offshore snap, HP vitals plakaları, 3B rota tüpleri, Türkçe hareket-caption overlay, borda muharebesi. **Responsive DEĞİL.**
3. **Gerçek responsive ipliği** (bu spec'in konusu): yeni `src/engine/responsive.js` merkezi breakpoint modülü, tüketicilerin refactor'u, ve yeni CSS tablet tier'ı (769–1024px).

Bu spec yalnızca **İplik 3'ü** production-ready yapar ve 3B mobil davranışını düzeltir. İplik 1 ve 2 ayrı teslimat olarak ele alınır (bkz. §7).

### Kodla doğrulanan gerçekler (zemin)

- `responsive.js` export'larından **yalnızca `isMobile`, `isTablet`, `prefersReducedMotion` canlı**. `isDesktop`, `isMobileOrTablet`, `isLandscape`, `onBreakpointChange`, `BREAKPOINTS` **sıfır tüketici** — `onBreakpointChange` narration-panel'de import edilmiş ama hiç çağrılmıyor. Kodda hiç reaktif tüketici yok; her şey nokta-anı (`isMobile()` render anında örnekleniyor).
- `responsive.js` **iki farklı `?v=` tag** ile import ediliyor (6 yerde `hp-polish-r1`, narration-panel'de `narration-r1`) → ES loader iki ayrı modül instance yüklüyor.
- `app.js:49` yorumu: "3B artık HER cihazda (mobil dahil) varsayılan." `scene3dPref` mobilde de `'3d'`. Bu, hedeflenen "mobilde 3B kapalı" davranışının tersi.
- `scene3d.js` `responsive.js`'i **import etmiyor**; hiçbir breakpoint/reduced-motion farkındalığı yok.
- `--timeline-h` CSS değişkeni `scene3d.css`'te kullanılıyor ama JS'te **hiç set edilmiyor** (hep `120px` fallback).

---

## 2. Hedefler & Kapsam-dışı

### Hedefler
1. `responsive.js`'i yalın, canlı API yüzeyine indir (`isMobile`/`isTablet`/`prefersReducedMotion`).
2. Çift-instance bug'ını kapat: tüm import sitelerini tek kanonik `?v=` tag'e birle.
3. Tablet tier'ı (769–1024px) sağlamlaştır; dokunma hedeflerini WCAG/Apple standardına çek.
4. 3B'yi mobilde tamamen kapat — three.js'i bile indirmeden.
5. 3B'yi tablet/masaüstünde `prefers-reduced-motion` duyarlı yap.

### Kapsam-dışı (YAGNI — açıkça yapılmayacak)
- Reaktif re-layout (döndür/boyutlandır anında yeniden akış) — zaten hiç yok, de-scope.
- Pinch-to-zoom elden geçirme.
- Narration bottom-sheet redizaynı (mevcut story/map-focus modları korunur).
- Mobil token clustering revizyonu.
- `hp-polish-r1` cache-bust içeriği ve 819 satırlık 3B-özellik ipliği (ayrı teslimat).
- `prefers-reduced-motion`'ın mid-session OS toggle'ı (init-time örnekleme kabul, mevcut token-animator davranışıyla tutarlı).

---

## 3. Tasarım — `responsive.js` yalınlaştırma

Modülü canlı yüzeye indir.

**Kalan:**
- `clientWidth()` (internal) — `cw===0 → 1280` (SSR) / `0` guard.
- `isMobile()` — `cw===0 ? false : cw <= 768`.
- `isTablet()` — `cw===0 ? false : 768 < cw <= 1024`.
- `prefersReducedMotion()` — `_mqReducedMotion?.matches ?? false`.
- `_mqReducedMotion` matchMedia nesnesi (yalnızca `prefersReducedMotion` için).

**Silinen (0 tüketici):** `isDesktop`, `isMobileOrTablet`, `isLandscape`, `onBreakpointChange`, `BREAKPOINTS`, ve yalnızca bunlara hizmet eden `_mqMobile` / `_mqTablet` / `_mqLandscape`.

> `isMobile`/`isTablet` zaten `clientWidth()`'i doğrudan kullandığından (matchMedia'ya bağlı değil), silme davranışı değiştirmez.

**Kontrat yorumu:** `cw===0 → isMobile()=false` (masaüstü-bias) **kasıtlı**; 0-genişlik preview/iframe bağlamında 3B'nin yanlışlıkla kapanmasını önler. Bu, `responsive.js` başına yorumla belgelenecek. CSS `@media` breakpoint'leri (768/1024) bu modülün `BP_MOBILE`/`BP_TABLET` sabitlerini yansıtır (yorumla not edilir; `BREAKPOINTS` export'u olmadan).

---

## 4. Tasarım — çift-instance bug'ı: tek kanonik tag

`responsive.js`'in **7 import sitesini** tek tag'e birle: **`?v=20260627-responsive-r1`**.

İlgili dosyalar:
- `src/app.js:35`
- `src/ui/onboarding.js:6`
- `src/ui/autoplay-controller.js:8`
- `src/ui/narration-panel.js:12` — ayrıca **kullanılmayan `onBreakpointChange` import'unu kaldır** (`import { isMobile, isTablet }` kalır)
- `src/render/token-animator.js:14`
- `src/render/map-renderer.js:13`
- `src/render/timeline-renderer.js:9`

> Yalnızca `responsive.js`'in kendi import tag'leri birleştirilir. Geri kalan `hp-polish-r1` cache-bust ipliğine dokunulmaz (ayrı teslimat).

---

## 5. Tasarım — tablet tier (769–1024px) sağlamlaştırma

Mevcut tablet `@media (min-width:769px) and (max-width:1024px)` blokları (`base.css`, `panel.css`, `timeline.css`, `scene3d.css`) iş görüyor; cilalama:

- **Dokunma hedefleri (WCAG 2.5.5 / Apple HIG → min 44×44px dokunmatik bağlamda):**
  - `base.css` `.audio-btn` şu an `min-width:44px; height:28px` → yükseklik ≥44px.
  - `panel.css` `.panel-close` tablette 36×36, mobilde 48×48 (tutarsız) → tek standart ≥44×44.
  - `base.css` tablet `.stats-btn` padding (`3px 6px`) dokunma hedefinin çok altında → büyüt.
- **Breakpoint senkronu:** CSS 768/1024 ile `responsive.js` 768/1024 eşleşiyor; `responsive.js` yorumu bu senkronu belgeler.

---

## 6. Tasarım — 3B'yi mobilde kapatma (`app.js` + CSS)

### `app.js` değişiklikleri

| Yer | Değişiklik |
|-----|-----------|
| `scene3dPref` init (47–59) | Mobilde localStorage `'3d'` yok sayılır, varsayılan `'2d'`. **Tek istisna:** açık `?view=3d` (veya `?3d`) URL param → debug escape hatch, 3B'yi mobilde de zorlar. Çözüm sırası: `forced` → (mobil ? `'2d'` : `localStorage || '3d'`). |
| `initThreeLayer()` (106) | Başa `if (isMobile() && scene3dPref !== '3d') return;` → mobilde **scene3d.js + three.js hiç dinamik import edilmez** (en iyi mobil yükleme perf'i). |
| `buildView3DToggle()` | Mobil + zorlanmamış durumda erken-return zaten çağırmaz → 3B toggle butonu mobilde yok. |

> Masaüstü/tablet: bugünkü davranış korunur (eager import, toggle mevcut, 2B seçse bile toggle ile 3B'ye dönebilir). Yalnızca mobil import'u atlar.

### CSS değişiklikleri (`scene3d.css`)

3B mobilde olmadığından şu mobil `@media` kuralları ölü → kaldırılır:
- `.view3d-toggle` mobil konumu (`:151`).
- `.scene3d-motion-caption` mobil yeniden konumu (`:156`).

### Preview tuzağı kontrolü
- Claude Preview'da `cw===0 → isMobile()=false` → 3B boot olur (doğrulama için istenen davranış).
- `preview_resize` ile dar genişlik → `isMobile()=true` → 3B kapanır, toggle yok, 2B harita (mobil test).

---

## 7. Tasarım — 3B reduced-motion (tablet/masaüstü a11y) — `scene3d.js`

`scene3d.js`'e `prefersReducedMotion`'ı import et (init'te **bir kez örnekle**, `token-animator.js` ile tutarlı). Açıkken sinematik hareketi sönümle:
- Kamera sarsıntısı (shake)
- Muharebe lunge / recoil
- Vitals loss-pulse
- Su parıltısı (water shimmer)
- Ambient burst'ler

Sahne statik kalır; birimler ve plakalar yerli yerinde, yalnızca devinim durur. (3B mobilde olmadığı için bu yalnızca tablet/masaüstünü etkiler — saf a11y kazancı.)

### Küçük & opsiyonel — `--timeline-h` (ertelenebilir)
3B motion-caption `calc(var(--timeline-h, 120px) + …)` kullanıyor ama JS hiç set etmiyor. 3B artık yalnızca tablet/masaüstünde olduğundan timeline yüksekliğini ölçüp `:root`'a `--timeline-h` yazmak caption dikey konumunu doğrular. **Bu kalem 3B-özellik ipliğine (İplik 2) bağlı**, bu spec'ten ertelenebilir.

---

## 8. Teslimat / commit stratejisi

Çalışma ağacı üç ipliği karıştırıyor ve responsive değişiklikleri `scene3d.js`/`scene3d.css`'e dokunuyor — bunlar zaten 819 satırlık 3B-özellik diff'i taşıyor. **Yaklaşım A (seçildi):**

1. **Önkoşul commit(ler) — İplik 1 + İplik 2:** mevcut `hp-polish-r1` cache-bust + 3B-özellik işini kendi logical commit'i olarak indir (temiz baz). Bu spec'in işi değil ama responsive 3B düzenlemesinin okunur diff üretmesi için önkoşul. *Kullanıcı bu işin tamam/çalışır olduğunu teyit etmeli.*
2. **Commit B — `responsive`:** yalın `responsive.js` + tek tag birleştirme + tablet tier + dokunma hedefleri.
3. **Commit C — `responsive 3B`:** `app.js` mobil gate + `scene3d.js` reduced-motion + ölü mobil 3B CSS temizliği.

**Reddedilen alternatif (B):** her şeyi tek blob'da gönder — pragmatik ama bulanık git geçmişi; `scene3d.js` diff'i okunmaz hale gelir.

---

## 9. Dosya-bazlı değişiklik listesi

| Dosya | Değişiklik | Commit |
|-------|-----------|--------|
| `src/engine/responsive.js` | Ölü export/matchMedia sil; yalın API; kontrat yorumu; import tag → `responsive-r1` (dosya adı sabit, tüketiciler tag günceller) | B |
| `src/app.js` | responsive import tag; 3B mobil gate (`scene3dPref` init + `initThreeLayer` erken-return) | B (tag), C (gate) |
| `src/ui/narration-panel.js` | Tag birle; kullanılmayan `onBreakpointChange` import'unu kaldır | B |
| `src/ui/onboarding.js` | Tag birle | B |
| `src/ui/autoplay-controller.js` | Tag birle | B |
| `src/render/token-animator.js` | Tag birle | B |
| `src/render/map-renderer.js` | Tag birle | B |
| `src/render/timeline-renderer.js` | Tag birle | B |
| `styles/base.css` | Tablet dokunma hedefleri (`.audio-btn` yükseklik, `.stats-btn` padding) | B |
| `styles/panel.css` | `.panel-close` dokunma hedefi tutarlılığı (≥44×44) | B |
| `styles/scene3d.css` | Ölü mobil 3B `@media` kuralları (toggle/caption) kaldır | C |
| `src/render/scene3d.js` | `prefersReducedMotion` import + sinematik hareket gate'i | C |

---

## 10. Doğrulama planı

- **QA scriptleri:** `scripts/qa-map-gates.mjs`, `scripts/qa-release-matrix.mjs`, `scripts/check-historical-contracts.mjs`, `scripts/verify-sectors.mjs` — tag birleştirme sonrası loader hook'u `?v=` strip ettiğinden kırılmamalı.
- **Preview matrisi:**
  - Masaüstü genişlik → 3B + toggle görünür, reduced-motion kapalıyken tam efekt.
  - `preview_resize` dar (mobil) → 3B yok, toggle yok, 2B harita; three.js network isteği yok (`preview_network` ile doğrula).
  - Tablet genişlik (769–1024) → docked panel, tablet tier stilleri, ≥44px dokunma hedefleri.
  - OS reduced-motion açık (veya `prefers-reduced-motion` emülasyon) → 3B statik, 2B token animasyonu da durur.
- **Headless 3B:** `window.GELIBOLU_3D.tick()` ile reduced-motion gate'i doğrula (preview gizliyken rAF durur — hafıza notu).

---

## 11. Riskler & açık noktalar

- **Önkoşul commit (§8.1):** İplik 1+2'nin commit'lenmesi bu spec dışı; kullanıcı teyidi gerekir. Eğer İplik 2 (3B özellik) yarım/çalışmıyorsa, Commit C'nin `scene3d.js` düzenlemesi onun üstüne biner.
- **`localStorage 'gelibolu-view'='3d'` paylaşımı:** Mobilde stored `'3d'` yok sayılır (yalnızca `?view=3d` URL zorlar) — önceki masaüstü oturumundan gelen tercih mobili etkilemez. Bu kasıtlı.
- **`--timeline-h` (§7):** ertelenmiş; 3B-özellik ipliğiyle birlikte ele alınması daha mantıklı.

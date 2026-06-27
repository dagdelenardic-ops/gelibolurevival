# Responsive Tamamlama + 3B Mobilde Kapatma — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Çalışma ağacındaki yarım kalmış responsive ipliğini production-ready yapmak: `responsive.js`'i yalın canlı API'ye indirmek, çift-instance tag bug'ını kapatmak, tablet dokunma hedeflerini düzeltmek, 3B'yi mobilde tamamen kapatmak ve 3B'yi tablet/masaüstünde `prefers-reduced-motion` duyarlı yapmak.

**Architecture:** Vanilla ES-module web app (build yok). `src/engine/responsive.js` merkezi nokta-anı breakpoint kaynağı; tüketiciler render anında `isMobile()`/`isTablet()`/`prefersReducedMotion()` örnekler. 3B katmanı (`scene3d.js`, three.js) `app.js`'ten dinamik import edilir; mobilde import hiç tetiklenmez. Reaktif abonelik YOK (de-scope).

**Tech Stack:** Vanilla JS (ES Modules), three.js (3B), CSS `@media`, Node QA scriptleri (`npm run qa`), Python http.server (`npm run serve`), Claude Preview (tarayıcı doğrulama).

**Spec:** [docs/superpowers/specs/2026-06-27-responsive-completion-design.md](../superpowers/specs/2026-06-27-responsive-completion-design.md)

---

## Test/Doğrulama gerçekliği (oku)

Bu projede **JS unit-test runner yok**. Doğrulama üç araçla yapılır:
1. **`npm run qa`** — tam QA süiti (modül yükleme + tarih/harita kontratları). Tag değişiklikleri modül yüklemeyi bozarsa burada patlar. Beklenen: exit 0.
2. **grep ile yapısal assert** — ölü export gitti mi, tek tag kaldı mı, guard yerinde mi.
3. **Claude Preview** — `preview_start` / `preview_resize` / `preview_network` / `preview_snapshot` / `preview_console_logs`; 3B için headless `window.GELIBOLU_3D.tick(60)`.

> Her kod görevinde TDD-uyarlaması: önce doğrulama komutunu/grep'i çalıştır (mevcut durumu gör), edit yap, tekrar çalıştır (geçişi doğrula), commit.

---

## Phase 0 — Baseline (ÖNKOŞUL, kullanıcı teyidi gerekir)

> Çalışma ağacı 3 ipliği (hp-polish tag bump + 819 satır 3B özellik + responsive scaffolding) karıştırıyor. `scene3d.js`/`map-renderer.js` gibi dosyalar hem hp-polish hem responsive değişikliği taşıdığından, temiz Commit B/C ancak mevcut WIP baseline'a alınırsa mümkün. Bu baseline, yarım olabilecek 3B özelliğini de içerir — **kullanıcı "bu WIP commit'lenebilir" onayı vermeden Phase 0 başlamaz.**

### Task 0.1: `.superpowers/` tooling artefaktını gitignore'a al

**Files:** Modify: `.gitignore`

**Step 1:** `.gitignore`'da `.superpowers/` var mı bak:
```bash
grep -n "superpowers" .gitignore || echo "YOK"
```
**Step 2:** Yoksa ekle (dosya sonuna):
```
.superpowers/
```
**Step 3:** Doğrula:
```bash
git status --short | grep "superpowers" || echo "OK: artık izlenmiyor"
```
Beklenen: `.superpowers/` `git status`'ta görünmez.

### Task 0.2: Mevcut WIP'i baseline olarak commit'le

**Objective:** İzlenen 40 değişmiş dosyayı tek baseline commit'e al. `responsive.js` (untracked) ve `.superpowers/` **dışarıda kalır** — `responsive.js` slimlenmiş haliyle Commit B'de eklenecek.

**Step 1:** Yalnızca izlenen değişiklikleri stage'le (untracked dosyalar dahil olmaz):
```bash
git add -u
git status --short
```
Beklenen staged: 40 `M` dosya. Beklenen unstaged/untracked: `?? src/engine/responsive.js` (hâlâ untracked).

**Step 2:** QA yeşil mi (baseline sağlığı)?
```bash
npm run qa
```
Beklenen: exit 0. (Patlarsa, sorunu raporla — responsive işi öncesi mevcut bir kırık var demektir.)

**Step 3:** Commit:
```bash
git commit -m "chore: WIP baseline — hp-polish tag bump + 3B özellik + responsive scaffolding

Üç iç-içe ipliği tek baseline'a alır ki responsive bitirme edit'leri
(Commit B/C) temiz delta olarak gözden geçirilebilsin. responsive.js
bilerek dışarıda — slimlenmiş haliyle responsive commit'inde eklenecek.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git log --oneline -1
```

---

## Phase B — Responsive çekirdek + tablet cilalama (Commit B)

### Task B1: `responsive.js`'i yalın API'ye indir

**Objective:** Yalnızca canlı export'ları bırak (`isMobile`/`isTablet`/`prefersReducedMotion`); 5 ölü export + 3 kullanılmayan matchMedia nesnesini sil.

**Files:** Modify (rewrite): `src/engine/responsive.js`

**Step 1: Mevcut ölü export tüketicisi YOK doğrula (başlangıç durumu)**
```bash
grep -rn "isDesktop\|isMobileOrTablet\|isLandscape\|onBreakpointChange\|BREAKPOINTS" src --include="*.js" | grep -v "engine/responsive.js"
```
Beklenen: yalnızca `narration-panel.js:12` (kullanılmayan `onBreakpointChange` import'u) — B3'te kaldırılacak. Başka tüketici yok.

**Step 2: Dosyayı tamamen değiştir**

`src/engine/responsive.js` içeriği:
```js
// Merkezi responsive utility — breakpoint / cihaz tespiti tek yerden.
// Tüketiciler NOKTA-ANI örnekler (render anında çağır). Reaktif abonelik YOK.
// Kontrat: clientWidth()===0 (0-genişlik preview/iframe) → masaüstü varsayılır
// (isMobile=false) ki 3B/desktop davranışı yanlışlıkla mobile düşmesin.
// CSS @media breakpoint'leri bu sabitleri (768 / 1024) yansıtmalıdır.
const BP_MOBILE = 768;
const BP_TABLET = 1024;

const _mqReducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion:reduce)') : null;

function clientWidth() {
    if (typeof document === 'undefined') return 1280;
    return document.documentElement?.clientWidth || window.innerWidth || 0;
}

export function isMobile() {
    const cw = clientWidth();
    if (cw === 0) return false;
    return cw <= BP_MOBILE;
}

export function isTablet() {
    const cw = clientWidth();
    if (cw === 0) return false;
    return cw > BP_MOBILE && cw <= BP_TABLET;
}

export function prefersReducedMotion() {
    return _mqReducedMotion ? _mqReducedMotion.matches : false;
}
```

**Step 3: Ölü export'lar gitti doğrula**
```bash
grep -nE "isDesktop|isMobileOrTablet|isLandscape|onBreakpointChange|BREAKPOINTS|_mqMobile|_mqTablet|_mqLandscape" src/engine/responsive.js || echo "OK: hepsi silindi"
```
Beklenen: `OK: hepsi silindi`.

---

### Task B2: `responsive.js` import tag'ini 6 tüketicide birle

**Objective:** 6 dosyada `responsive.js?v=20260622-hp-polish-r1` → `responsive.js?v=20260627-responsive-r1`.

**Files:** Modify: `src/app.js:35`, `src/ui/onboarding.js:6`, `src/ui/autoplay-controller.js:8`, `src/render/token-animator.js:14`, `src/render/map-renderer.js:13`, `src/render/timeline-renderer.js:9`

**Step 1: Toplu değiştir (yalnızca responsive.js import'larında)**
```bash
grep -rl "responsive.js?v=20260622-hp-polish-r1" src --include="*.js" | xargs sed -i '' "s#responsive\.js?v=20260622-hp-polish-r1#responsive.js?v=20260627-responsive-r1#g"
```

**Step 2: Doğrula — 6 site güncellendi**
```bash
grep -rn "responsive.js?v=" src --include="*.js"
```
Beklenen: app/onboarding/autoplay/token-animator/map-renderer/timeline-renderer → `responsive-r1`; narration-panel hâlâ `narration-r1` (B3'te).

---

### Task B3: `narration-panel.js` — tag birle + kullanılmayan `onBreakpointChange` import'unu kaldır

**Files:** Modify: `src/ui/narration-panel.js:12`

**Step 1: Edit**
- Old: `import { isMobile, isTablet, onBreakpointChange } from '../engine/responsive.js?v=20260626-narration-r1';`
- New: `import { isMobile, isTablet } from '../engine/responsive.js?v=20260627-responsive-r1';`

**Step 2: Doğrula — başka narration-r1 yok, onBreakpointChange referansı yok**
```bash
grep -rn "narration-r1\|onBreakpointChange" src --include="*.js" || echo "OK: temiz"
```
Beklenen: `OK: temiz`.

---

### Task B4: Tek-instance + QA doğrulama

**Step 1: `responsive.js` tüm repo'da TEK tag ile import ediliyor**
```bash
grep -rohn "responsive.js?v=[a-z0-9-]*" src --include="*.js" | sort -u
```
Beklenen: tek satır → `responsive.js?v=20260627-responsive-r1`.

**Step 2: QA süiti**
```bash
npm run qa
```
Beklenen: exit 0 (Phase 0'daki baseline ile aynı yeşil).

---

### Task B5: `base.css` — tablet/mobil dokunma hedefleri (≥44×44)

**Objective:** WCAG 2.5.5 / Apple HIG: dokunmatik kontroller ≥44×44px.

**Files:** Modify: `styles/base.css`

**Step 1: Mobil `.audio-btn` (36×36 → 44×44)**
- Mobil `@media(max-width:768px)` bloğundaki:
  - Old:
    ```css
  .audio-btn{
    width:36px;
    height:36px
  }
    ```
  - New:
    ```css
  .audio-btn{
    width:44px;
    height:44px
  }
    ```

**Step 2: Tablet `.audio-btn` (height 28 → 44)**
- Tablet `@media(min-width:769px) and (max-width:1024px)` bloğundaki:
  - Old:
    ```css
  .audio-btn{
    min-width:44px;
    height:28px;
    font-size:.65rem
  }
    ```
  - New:
    ```css
  .audio-btn{
    min-width:44px;
    height:44px;
    font-size:.65rem
  }
    ```

**Step 3: Tablet `.stats-btn` dokunma yüksekliği**
- Old:
  ```css
  .stats-btn{
    font-size:.68rem;
    padding:3px 6px
  }
  ```
- New:
  ```css
  .stats-btn{
    font-size:.68rem;
    padding:3px 6px;
    min-height:44px
  }
  ```

**Step 4: Doğrula**
```bash
grep -n "height:44px\|min-height:44px" styles/base.css
```
Beklenen: ≥3 eşleşme.

---

### Task B6: `panel.css` — tablet `.panel-close` (36×36 → 44×44)

**Files:** Modify: `styles/panel.css`

**Step 1: Edit** (tablet `@media(min-width:769px) and (max-width:1024px)` bloğu)
- Old:
  ```css
    .panel-close{
        width:36px;
        height:36px
    }
  ```
- New:
  ```css
    .panel-close{
        width:44px;
        height:44px
    }
  ```
> Mobil `.panel-close` zaten 48×48 (≥44) — değişmez.

**Step 2: Doğrula**
```bash
grep -n "width:44px" styles/panel.css
```
Beklenen: ≥1 eşleşme (tablet panel-close).

---

### Task B7: Commit B

**Step 1: Stage (responsive.js dahil — artık izlenir)**
```bash
git add src/engine/responsive.js src/app.js src/ui/onboarding.js src/ui/autoplay-controller.js \
        src/render/token-animator.js src/render/map-renderer.js src/render/timeline-renderer.js \
        src/ui/narration-panel.js styles/base.css styles/panel.css
git status --short
```
> Not: `src/app.js` bu commit'te yalnızca tag değişikliği içerir; 3B gate (Task C1) ayrı commit'tedir. Eğer C1 henüz yapılmadıysa app.js diff'i yalnızca tag satırıdır — doğru.

**Step 2: QA**
```bash
npm run qa
```
Beklenen: exit 0.

**Step 3: Commit**
```bash
git commit -m "feat(responsive): yalın responsive.js + tek modül tag + tablet dokunma hedefleri

- responsive.js 5 ölü export'tan arındırıldı (isMobile/isTablet/prefersReducedMotion kaldı)
- responsive.js'in 7 import sitesi tek kanonik ?v=20260627-responsive-r1 tag'ine birleştirildi
  (ES loader çift-instance bug'ı kapandı); narration-panel'deki kullanılmayan
  onBreakpointChange import'u kaldırıldı
- tablet/mobil dokunma hedefleri WCAG 2.5.5 (>=44x44): audio-btn, stats-btn, panel-close

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Step 4: Preview doğrulaması (masaüstü + tablet)**
- `preview_start` (komut: `npm run serve`, URL `http://127.0.0.1:4174/`).
- `preview_console_logs` → hata yok.
- `preview_snapshot` → harita + topbar render.
- `preview_resize` 900×800 (tablet) → unit panel docked 340px, `.panel-close` 44px.
- `preview_inspect` `.audio-btn` → height 44px.

---

## Phase C — 3B mobilde kapalı + 3B reduced-motion (Commit C)

### Task C1: `app.js` — 3B'yi mobilde kapat (three.js indirilmez)

**Objective:** Mobilde `scene3dPref='2d'` + `initThreeLayer()` erken-return → three.js/scene3d.js hiç import edilmez, toggle kurulmaz. `?view=3d` debug escape hatch korunur.

**Files:** Modify: `src/app.js` (scene3dPref init ~47-59, initThreeLayer ~106-108)

**Step 1: `scene3dPref` init — mobil varsayılan 2B**
- Old:
  ```js
        if (forced === '3d' || forced === '2d') {
            try { localStorage.setItem('gelibolu-view', forced); } catch {}
            return forced;
        }
        return localStorage.getItem('gelibolu-view') || '3d';
  ```
- New:
  ```js
        if (forced === '3d' || forced === '2d') {
            try { localStorage.setItem('gelibolu-view', forced); } catch {}
            return forced;
        }
        // Mobil: 3B kapalı (three.js indirilmez). Sadece açık ?view=3d zorlar.
        // localStorage'daki masaüstü '3d' tercihi mobilde yok sayılır.
        if (isMobile()) return '2d';
        return localStorage.getItem('gelibolu-view') || '3d';
  ```
> `isMobile` zaten `app.js:35`'te import edilmiş (B2'de tag güncellendi). 0-genişlik preview'da `isMobile()=false` → bu satır atlanır → 3B boot olur (istenen).

**Step 2: `initThreeLayer()` erken-return**
- Old:
  ```js
async function initThreeLayer() {
    const host = document.getElementById('scene3d');
    if (!host) return;
    try {
  ```
- New:
  ```js
async function initThreeLayer() {
    const host = document.getElementById('scene3d');
    if (!host) return;
    // Mobil: 3B katmanını (three.js dahil) hiç yükleme — yalnızca açık ?view=3d zorlarsa yükle.
    if (isMobile() && scene3dPref !== '3d') return;
    try {
  ```
> `buildView3DToggle()` yalnızca `initThreeLayer()` içinde çağrıldığından, erken-return mobilde toggle'ı da kurmaz.

**Step 3: Doğrula (yapısal)**
```bash
grep -n "if (isMobile()) return '2d'\|isMobile() && scene3dPref" src/app.js
```
Beklenen: 2 eşleşme.

---

### Task C2: `scene3d.js` — `prefers-reduced-motion` ile sinematik hareketi sönümle

**Objective:** Tablet/masaüstünde (3B mobilde yok) reduced-motion açıkken kamera sarsıntısı, muharebe lunge/recoil, vitals loss-pulse, su parıltısı ve burst'leri durdur. Sahne statik kalır; birim yerleşimi/oryantasyonu korunur.

**Files:** Modify: `src/render/scene3d.js`

**Step 1: Import ekle** (mevcut data import'larının altına, ~satır 15'ten sonra)
```js
import { prefersReducedMotion } from '../engine/responsive.js?v=20260627-responsive-r1';
```

**Step 2: Modül-seviye bayrak** (`let cameraShake = 0;` satırının hemen altına, ~53)
```js
let reduceMotion = false;
```

**Step 3: init'te örnekle** (`initScene3D` başında, `if (ready) return;`'den sonra)
- Old: `    if (ready) return;`
- New:
  ```js
    if (ready) return;
    reduceMotion = prefersReducedMotion();
  ```

**Step 4: Kamera sarsıntısı atamasını gate'le** (~1503)
- Old: `            cameraShake = Math.max(cameraShake, opts.autoplay ? 0.012 : 0.006);`
- New: `            if (!reduceMotion) cameraShake = Math.max(cameraShake, opts.autoplay ? 0.012 : 0.006);`

**Step 5: Muharebe lunge/lean salınımını gate'le** (~1666)
- Old: `            if (tk.combat && land) {`
- New: `            if (tk.combat && land && !reduceMotion) {`

**Step 6: Vitals loss-pulse ÖLÇEK salınımını gate'le** (~826)
- Old: `        const s = 1 + pulse * (0.38 + 0.12 * Math.sin(t * 18));`
- New: `        const s = reduceMotion ? 1 : 1 + pulse * (0.38 + 0.12 * Math.sin(t * 18));`

**Step 7: Su parıltısını gate'le** (~1697)
- Old: `    if (water) water.position.y = WATER_Y + Math.sin(t * 0.45) * 0.0035;`
- New: `    if (water) water.position.y = WATER_Y + (reduceMotion ? 0 : Math.sin(t * 0.45) * 0.0035);`

**Step 8: `applyRecoil` erken-return** (~1184)
- Old: `function applyRecoil(tk, dx, dz, amt) {`
- New:
  ```js
function applyRecoil(tk, dx, dz, amt) {
    if (reduceMotion) return;
  ```

**Step 9: `spawnBurst` erken-return** (~1066)
- Old: `function spawnBurst(pos, delay = 0, power = 1) {`
- New:
  ```js
function spawnBurst(pos, delay = 0, power = 1) {
    if (reduceMotion) return;
  ```

**Step 10: Doğrula (yapısal)**
```bash
grep -nc "reduceMotion" src/render/scene3d.js
```
Beklenen: ≥8 eşleşme (import + bayrak + init + 6 guard).

**Step 11: Normal modda 3B regresyon yok (headless)**
```bash
npm run serve   # arka planda
```
Preview'da (masaüstü genişlik, reduced-motion KAPALI):
- `preview_eval`: `window.GELIBOLU_3D && window.GELIBOLU_3D.tick(60)` → `{ fx, proj, simT }` döner, `fx` muharebe fazında > 0 (efektler normal çalışıyor).
- `preview_console_logs` → hata yok.

> Reduced-motion AÇIK yolu preview harness'ında OS ayarı emüle edilemediğinden kod-incelemesiyle kapsanır (guard'lar yapısal grep + iki-aşamalı review ile doğrulanır).

---

### Task C3: scene3d.css mobil 3B kuralları — KORU (kaldırma iptal)

**Objective:** Spec §6 "ölü mobil 3B CSS kaldır" öngörmüştü; ancak `?view=3d` escape hatch bu kuralları potansiyel-canlı tutuyor (mobilde zorlanan 3B'nin stillenmesi için). Zararsız oldukları için **KORUNUR** — bu görevde CSS silme YOK. (Şeffaflık için kaydedildi; aksiyon gerektirmez.)

**Doğrulama:** yok (no-op).

---

### Task C4: Commit C

**Step 1: Stage**
```bash
git add src/app.js src/render/scene3d.js
git status --short
```

**Step 2: QA**
```bash
npm run qa
```
Beklenen: exit 0.

**Step 3: Commit**
```bash
git commit -m "feat(responsive): 3B'yi mobilde kapat + 3B reduced-motion duyarlılığı

- app.js: mobilde scene3dPref='2d' ve initThreeLayer erken-return —
  three.js/scene3d.js hiç import edilmez, 3B toggle kurulmaz; ?view=3d
  debug escape hatch korunur; 0-genişlik preview'da masaüstü-bias ile 3B açık
- scene3d.js: prefers-reduced-motion açıkken kamera sarsıntısı, muharebe
  lunge/recoil, vitals loss-pulse, su parıltısı, burst'ler sönümlenir
  (birim yerleşimi/oryantasyonu korunur)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Step 4: Preview doğrulaması (mobil 3B kapalı)**
- `preview_resize` 390×800 (mobil) → reload.
- `preview_network` → `scene3d.js` / `three` isteği YOK (mobilde import tetiklenmedi).
- `preview_snapshot` → `#view3dToggle` YOK; `#scene3d` `aria-hidden="true"`; 2B harita render.
- `preview_console_logs` → hata yok.
- Kontrol: `http://127.0.0.1:4174/?view=3d` mobil genişlikte → 3B boot olur (escape hatch çalışıyor).

---

## Phase D — Kapanış doğrulama

### Task D1: Tam regresyon + temizlik teyidi

**Step 1: Tam QA**
```bash
npm run qa
```
Beklenen: exit 0.

**Step 2: Tek-tag invariant**
```bash
grep -rohn "responsive.js?v=[a-z0-9-]*" src --include="*.js" | sort -u
```
Beklenen: tek satır `responsive.js?v=20260627-responsive-r1` (scene3d.js dahil 8 site).

**Step 3: Commit geçmişi okunur mu**
```bash
git log --oneline -4
```
Beklenen: baseline → Commit B → Commit C sırası net.

---

## Tamamlanma kriterleri (Definition of Done)

- [ ] `responsive.js` yalnızca `isMobile`/`isTablet`/`prefersReducedMotion` export eder; ölü export yok.
- [ ] Repo genelinde `responsive.js` tek `?v=` tag ile import edilir (çift-instance kapandı).
- [ ] `npm run qa` exit 0.
- [ ] Tablet/mobil dokunma hedefleri ≥44×44 (audio-btn, stats-btn, panel-close).
- [ ] Mobil genişlikte: 3B yok, toggle yok, three.js network isteği yok; `?view=3d` ile escape hatch çalışır.
- [ ] Masaüstü/tablette: 3B normal; reduced-motion açıkken sinematik hareket durur, sahne statik.
- [ ] 3 commit: WIP baseline → responsive çekirdek → 3B responsive.

## Kapsam-dışı (bu planda YOK)
- Reaktif re-layout, pinch-to-zoom revizyonu, narration bottom-sheet redizaynı, token clustering.
- `--timeline-h` JS setter'ı (spec §7'de ertelendi — 3B-özellik ipliğiyle ele alınacak).
- `hp-polish-r1` cache-bust içeriğinin gözden geçirilmesi (baseline'a alındı).

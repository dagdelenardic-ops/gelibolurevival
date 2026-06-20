// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Token Animator
// Kalıcı (keyed) token DOM + rAF tween motoru + hareket "game feel"
// katmanı: yürüyüş adımı, yön eğilmesi, toz/köpük izi, varış settle'ı.
//
// Eski akış her fazda unitTokens.innerHTML'i sıfırdan kuruyordu;
// idle animasyonlar her tıkta resetleniyor, hareket 0.34s lineer
// kaymadan ibaret kalıyordu. Bu modül token'ları data-unit-id ile
// diff'ler: görsel imzası değişmeyen birimin iç DOM'una dokunulmaz
// (duman/dalga/SMIL animasyonları kesintisiz akar), pozisyon ise
// mesafeye göre ölçeklenen ease'li tween ile yürütülür.
// ══════════════════════════════════════════════════════════════

const SVG_NS = 'http://www.w3.org/2000/svg';

function isMobileDevice() {
    if (typeof window === 'undefined') return false;
    const cw = document.documentElement?.clientWidth || window.innerWidth || 0;
    if (cw === 0) return false;
    return cw <= 768;
}
const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animatörün sahiplendiği durum sınıfları — attribute senkronunda korunur
const MOTION_CLASSES = ['is-marching', 'is-steaming', 'is-arriving', 'is-entering', 'is-exiting'];

// Bunun üstü "yürüyüş" değil yeniden konuşlanmadır: tween yerine fade-teleport
const TELEPORT_LIMIT_LAND = 520;
const TELEPORT_LIMIT_NAVAL = 980;
// Sahneye giriş (haritaya ilk varış): çıkarma/takviye yaklaşması sinematik
// olarak süzülmeli — giriş kökenleri 650-900px uzakta tanımlı.
const TELEPORT_LIMIT_ENTRY = 1150;

const activeTweens = new Map(); // unitId → tween
let rafId = null;
let quakeTimer = null;

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

function shortestAngle(from, to) {
    return ((to - from + 540) % 360) - 180;
}

function parseTranslate(el) {
    const m = /translate\(\s*(-?[\d.]+)px[ ,]+\s*(-?[\d.]+)px\s*\)/.exec(el.style.transform || '');
    if (m) return { x: +m[1], y: +m[2] };
    const tx = Number(el.getAttribute('data-target-x'));
    const ty = Number(el.getAttribute('data-target-y'));
    return { x: Number.isFinite(tx) ? tx : 0, y: Number.isFinite(ty) ? ty : 0 };
}

function getMotion(el) {
    if (!el.__geliboluMotion) {
        const pos = parseTranslate(el);
        el.__geliboluMotion = { x: pos.x, y: pos.y, h: Number(el.getAttribute('data-heading')) || 0 };
    }
    return el.__geliboluMotion;
}

function isNavalToken(el) {
    return el.classList.contains('is-naval');
}

// ── Reconciliation ────────────────────────────────────────────

/**
 * Token katmanını yeni markup ile keyed olarak uzlaştırır.
 * Var olan birim: yerinde güncellenir + hedefe tween'lenir.
 * Yeni birim: giriş kökeninden kayarak/solarak girer.
 * Kaybolan birim: solarak çıkar.
 */
export function reconcileTokens(layer, markup, options = {}) {
    if (!layer) return;
    const budgetMs = Number.isFinite(options.budgetMs) ? options.budgetMs : 2400;
    const instant = !!options.instant || prefersReducedMotion;

    const doc = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${markup}</svg>`, 'image/svg+xml');
    if (doc.querySelector('parsererror')) {
        // Bozuk markup'ta güvenli geri dönüş: eski davranış
        layer.innerHTML = markup;
        return;
    }
    const nextNodes = [...doc.documentElement.children]
        .filter((node) => node.getAttribute && node.getAttribute('data-unit-id'));

    const existingById = new Map();
    [...layer.children].forEach((el) => {
        const id = el.getAttribute('data-unit-id');
        if (id) existingById.set(id, el);
    });

    const seen = new Set();
    nextNodes.forEach((node) => {
        const id = node.getAttribute('data-unit-id');
        if (seen.has(id)) return;
        seen.add(id);

        const target = {
            x: Number(node.getAttribute('data-target-x')) || 0,
            y: Number(node.getAttribute('data-target-y')) || 0
        };
        const targetHeading = Number(node.getAttribute('data-heading')) || 0;

        let el = existingById.get(id);
        let isEntry = false;
        if (!el) {
            el = document.importNode(node, true);
            layer.appendChild(el);
            getMotion(el); // markup'taki kaynak (giriş kökeni) pozisyonunu sahiplen
            el.__geliboluSig = node.getAttribute('data-visual-sig') || '';
            isEntry = true;
            if (!instant) markEntering(el);
        } else {
            if (el.__geliboluExitTimer) {
                clearTimeout(el.__geliboluExitTimer);
                el.__geliboluExitTimer = null;
                el.classList.remove('is-exiting');
            }
            syncToken(el, node);
        }
        startTween(el, target, targetHeading, { budgetMs, instant, isEntry });
    });

    existingById.forEach((el, id) => {
        if (!seen.has(id)) retireToken(el, id, instant);
    });
}

function markEntering(el) {
    el.classList.add('is-entering');
    clearTimeout(el.__geliboluEnterTimer);
    el.__geliboluEnterTimer = window.setTimeout(() => el.classList.remove('is-entering'), 950);
}

function retireToken(el, id, instant) {
    activeTweens.delete(id);
    if (instant) { el.remove(); return; }
    if (el.__geliboluExitTimer) return;
    el.classList.add('is-exiting');
    el.__geliboluExitTimer = window.setTimeout(() => el.remove(), 640);
}

/** Var olan token'ı yeni markup'la yerinde eşitle (transform animatörün) */
function syncToken(el, next) {
    const keep = new Set();
    for (const attr of [...next.attributes]) {
        keep.add(attr.name);
        if (attr.name === 'style') continue;
        if (attr.name === 'class') {
            const preserved = MOTION_CLASSES.filter((cls) => el.classList.contains(cls));
            const merged = preserved.length ? `${attr.value} ${preserved.join(' ')}` : attr.value;
            if (el.getAttribute('class') !== merged) el.setAttribute('class', merged);
            continue;
        }
        if (el.getAttribute(attr.name) !== attr.value) el.setAttribute(attr.name, attr.value);
    }
    for (const attr of [...el.attributes]) {
        if (attr.name === 'style' || keep.has(attr.name)) continue;
        el.removeAttribute(attr.name);
    }

    // style: transform dışındaki her şey (opacity, --stamina, --pulse-dur…) senkron
    const currentTransform = el.style.transform;
    el.setAttribute('style', next.getAttribute('style') || '');
    if (currentTransform) el.style.transform = currentTransform;
    delete el.dataset.baseOpacity; // renderUnits highlight cache'i tazelensin

    const nextSig = next.getAttribute('data-visual-sig') || '';
    if (el.__geliboluSig !== nextSig) {
        // Görsel durum değişti (çatışmaya girdi, hasar aldı…) → iç DOM'u yeniden kur
        el.replaceChildren(...[...next.childNodes].map((child) => document.importNode(child, true)));
        el.__geliboluSig = nextSig;
        applyHeadingNow(el); // tween'deki güncel rotayı geri yaz
    } else {
        patchVolatileBits(el, next);
    }
}

/** İmza değişmediyse sadece günlük sayılar değişir: badge, title, etiket */
function patchVolatileBits(el, next) {
    const nextTitle = next.querySelector(':scope > title');
    const curTitle = el.querySelector(':scope > title');
    if (nextTitle && curTitle && curTitle.textContent !== nextTitle.textContent) {
        curTitle.textContent = nextTitle.textContent;
    }

    const nextBadge = next.querySelector(':scope > .strength-badge');
    const curBadge = el.querySelector(':scope > .strength-badge');
    if (nextBadge && curBadge) curBadge.replaceWith(document.importNode(nextBadge, true));
    else if (nextBadge) el.appendChild(document.importNode(nextBadge, true));
    else if (curBadge) curBadge.remove();

    const nextLabel = next.querySelector(':scope > .unit-label');
    const curLabel = el.querySelector(':scope > .unit-label');
    if (nextLabel && curLabel && curLabel.textContent !== nextLabel.textContent) {
        curLabel.textContent = nextLabel.textContent;
    }
}

// ── Tween Motoru ──────────────────────────────────────────────

function startTween(el, target, targetHeading, { budgetMs, instant, isEntry = false }) {
    const id = el.getAttribute('data-unit-id');
    const m = getMotion(el);
    const naval = isNavalToken(el);
    const dx = target.x - m.x;
    const dy = target.y - m.y;
    const dist = Math.hypot(dx, dy);
    const dh = naval ? shortestAngle(m.h, targetHeading) : 0;

    if (instant || (dist < 1 && Math.abs(dh) < 1.5)) {
        activeTweens.delete(id);
        finishMove(el, m, target, targetHeading, 0, false);
        return;
    }

    // Işınlanma ölçeği (yeniden konuşlanma): yürütme, fade-teleport et.
    // Sahneye giriş bunun istisnası — çıkarma/takviye yaklaşması süzülür.
    const teleportLimit = isEntry ? TELEPORT_LIMIT_ENTRY : (naval ? TELEPORT_LIMIT_NAVAL : TELEPORT_LIMIT_LAND);
    if (dist > teleportLimit) {
        activeTweens.delete(id);
        finishMove(el, m, target, targetHeading, 0, false);
        markEntering(el);
        return;
    }

    const cap = Math.max(700, Math.min(isEntry ? 3600 : 3200, budgetMs * (isEntry ? 1.25 : 1)));
    const duration = Math.max(640, Math.min(cap, 460 + dist * 5.4));

    if (dist >= 14) {
        el.classList.add(naval ? 'is-steaming' : 'is-marching');
        el.classList.remove('is-arriving');
        if (!naval) {
            const lean = Math.max(-4.5, Math.min(4.5, dx * 0.05));
            el.style.setProperty('--lean', `${lean.toFixed(2)}deg`);
            el.style.setProperty('--march-dur', dist / duration > 0.16 ? '.42s' : '.6s');
        }
    }

    activeTweens.set(id, {
        el, naval, dist, duration,
        sx: m.x, sy: m.y, tx: target.x, ty: target.y,
        sh: m.h, th: m.h + dh,
        start: performance.now(),
        dirX: dist > 0 ? dx / dist : 0,
        dirY: dist > 0 ? dy / dist : 0,
        lastPuff: 0
    });
    ensureLoop();
}

function finishMove(el, motion, target, heading, dist, celebrate) {
    motion.x = target.x;
    motion.y = target.y;
    motion.h = heading;
    el.style.transform = `translate(${target.x}px, ${target.y}px)`;
    applyHeadingNow(el);
    el.classList.remove('is-marching', 'is-steaming');
    el.style.removeProperty('--lean');
    if (celebrate && dist >= 26) {
        el.classList.add('is-arriving');
        clearTimeout(el.__geliboluArriveTimer);
        el.__geliboluArriveTimer = window.setTimeout(() => el.classList.remove('is-arriving'), 540);
        if (!isNavalToken(el) && dist >= 46 && !isMobileDevice()) spawnSettleRing(target.x, target.y);
    }
}

function applyHeadingNow(el) {
    if (!isNavalToken(el)) return;
    const nv = el.querySelector('.naval-visual');
    if (!nv) return;
    const m = getMotion(el);
    const listing = nv.getAttribute('data-listing') || '0';
    const scale = nv.getAttribute('data-scale') || '1';
    nv.setAttribute('transform', `rotate(${m.h.toFixed(1)}) rotate(${listing}) scale(${scale})`);
}

function ensureLoop() {
    if (rafId == null) rafId = window.requestAnimationFrame(step);
}

function step(now) {
    rafId = null;
    if (!activeTweens.size) return;

    activeTweens.forEach((tw, id) => {
        const el = tw.el;
        if (!el.isConnected) { activeTweens.delete(id); return; }

        const k = Math.min(1, (now - tw.start) / tw.duration);
        const e = tw.naval ? easeInOutSine(k) : easeInOutCubic(k);
        const x = tw.sx + (tw.tx - tw.sx) * e;
        const y = tw.sy + (tw.ty - tw.sy) * e;
        const m = getMotion(el);
        m.x = x;
        m.y = y;
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
        if (tw.naval) {
            m.h = tw.sh + (tw.th - tw.sh) * e;
            applyHeadingNow(el);
        }

        // Hareket izi parçacıkları: karada toz, denizde köpük
        const puffGap = tw.naval ? 150 : 115;
        if (!isMobileDevice() && tw.dist >= 26 && k > 0.04 && k < 0.96 && now - tw.lastPuff > puffGap) {
            tw.lastPuff = now;
            if (tw.naval) spawnFoam(x, y, tw);
            else if (!el.classList.contains('is-entering')) spawnDust(x, y, tw);
        }

        if (k >= 1) {
            activeTweens.delete(id);
            finishMove(el, m, { x: tw.tx, y: tw.ty }, tw.th, tw.dist, true);
        }
    });

    if (activeTweens.size) rafId = window.requestAnimationFrame(step);
}

// ── Hareket Efekt Katmanı ─────────────────────────────────────

function getFxLayer() {
    let fx = document.getElementById('layer-movement-fx');
    if (fx && fx.isConnected) return fx;
    const tokens = document.getElementById('unitTokens');
    if (!tokens || !tokens.parentNode) return null;
    fx = document.createElementNS(SVG_NS, 'g');
    fx.setAttribute('id', 'layer-movement-fx');
    fx.setAttribute('aria-hidden', 'true');
    fx.setAttribute('pointer-events', 'none');
    tokens.parentNode.insertBefore(fx, tokens);
    return fx;
}

function spawnFx(node, life) {
    const fx = getFxLayer();
    if (!fx) return;
    fx.appendChild(node);
    while (fx.childElementCount > 80) fx.firstElementChild.remove();
    window.setTimeout(() => node.remove(), life);
}

function spawnDust(x, y, tw) {
    const back = 12 + Math.random() * 12;
    const side = (Math.random() - 0.5) * 18;
    const px = x - tw.dirX * back - tw.dirY * side;
    const py = y - tw.dirY * back + tw.dirX * side + 13; // ayak hizası
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'move-dust');
    dot.setAttribute('cx', px.toFixed(1));
    dot.setAttribute('cy', py.toFixed(1));
    dot.setAttribute('r', (2.4 + Math.random() * 2.6).toFixed(1));
    dot.style.setProperty('--drift-x', `${(-tw.dirX * (6 + Math.random() * 9)).toFixed(1)}px`);
    dot.style.setProperty('--drift-y', `${(-3 - Math.random() * 5).toFixed(1)}px`);
    spawnFx(dot, 1000);
}

function spawnFoam(x, y, tw) {
    const back = 26 + Math.random() * 16;
    const side = (Math.random() - 0.5) * 14;
    const px = x - tw.dirX * back - tw.dirY * side;
    const py = y - tw.dirY * back + tw.dirX * side;
    const foam = document.createElementNS(SVG_NS, 'circle');
    foam.setAttribute('class', 'move-foam');
    foam.setAttribute('cx', px.toFixed(1));
    foam.setAttribute('cy', py.toFixed(1));
    foam.setAttribute('r', (2.8 + Math.random() * 3.4).toFixed(1));
    spawnFx(foam, 1350);
}

function spawnSettleRing(x, y) {
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'move-settle');
    ring.setAttribute('cx', x.toFixed(1));
    ring.setAttribute('cy', y.toFixed(1));
    ring.setAttribute('r', '16');
    spawnFx(ring, 700);
}

// ── Harita Sarsıntısı (büyük bombardıman günleri) ─────────────

export function quakeMap(strength = 'light') {
    if (prefersReducedMotion || isMobileDevice) return;
    const container = document.querySelector('.map-container');
    if (!container) return;
    container.style.setProperty('--quake-amp', strength === 'heavy' ? '2.6px' : '1.3px');
    container.classList.remove('is-quaking');
    void container.offsetWidth; // animasyonu yeniden tetikle
    container.classList.add('is-quaking');
    clearTimeout(quakeTimer);
    quakeTimer = window.setTimeout(() => container.classList.remove('is-quaking'), 560);
}

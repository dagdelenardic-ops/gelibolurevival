// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Gerçek Zamanlı 3B Rölyef Harita (three.js)
// Blender'da üretilen heightmap + GLB token modelleriyle beslenir.
// Mevcut kampanya verisi (pozisyonlar/fazlar) bu sahneyi sürer.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Veriler app.js'ten enjekte edilir (modül-versiyon ikizlenmesini önlemek için).
let UNITS = [], LOCATIONS = [];
const UNITS_BY_ID = new Map();
let onUnitClick = null;

const ASSET = 'assets/3d';
const MAP_W = 2451, MAP_H = 3467;
const WORLD_W = 24.51, WORLD_H = 34.67, ZSCALE = 3.6;
const WATER_Y = 0.12 * 1; // sea sits just above h=0 land

const FACTION_COLOR = {
    ottoman: 0xc4645a, british: 0x7a9ab0, anzac: 0x8aaa78, french: 0x9a8aaa,
    allied: 0x7a9ab0
};
function factionColor(f) { return FACTION_COLOR[f] || 0xcccccc; }

let renderer, labelRenderer, scene, camera, controls, clock;
let terrain, water, sun;
let heightData = null, hw = 0, hh = 0;
let raf = 0, visible = false, ready = false;
const models = {};            // name -> THREE.Object3D template
const tokens = new Map();     // unitId -> {group, target, model, unit}
let tooltipEl = null, hovered = null;
let currentPhase = null, currentAnim = null;
let autoFrame = { active: false, target: new THREE.Vector3(), dist: 30, t: 1 };
let lastUserInput = 0;

// ── coordinate helpers ──
const wX = (x) => (x / MAP_W - 0.5) * WORLD_W;
const wZ = (y) => (y / MAP_H - 0.5) * WORLD_H;

function sampleHeight(u, v) {
    if (!heightData) return 0;
    u = Math.min(1, Math.max(0, u)); v = Math.min(1, Math.max(0, v));
    const fx = u * (hw - 1), fy = v * (hh - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(hw - 1, x0 + 1), y1 = Math.min(hh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const g = (xx, yy) => heightData[(yy * hw + xx) * 4] / 255;
    const a = g(x0, y0), b = g(x1, y0), c = g(x0, y1), d = g(x1, y1);
    const top = a + (b - a) * tx, bot = c + (d - c) * tx;
    return (top + (bot - top) * ty);
}
function heightAtMap(x, y) { return sampleHeight(x / MAP_W, y / MAP_H) * ZSCALE; }

// ── hypsometric color ramp (matches Blender terrain) ──
function hypso(h) {
    // h normalized 0..1
    const stops = [
        [0.00, [0.74, 0.66, 0.47]],
        [0.06, [0.28, 0.40, 0.21]],
        [0.20, [0.52, 0.47, 0.27]],
        [0.45, [0.46, 0.31, 0.21]],
        [1.00, [0.82, 0.78, 0.72]],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
        const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
        if (h <= p1) {
            const t = (h - p0) / Math.max(1e-5, p1 - p0);
            return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
        }
    }
    return stops[stops.length - 1][1];
}

function loadImageData(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            resolve({ data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height });
        };
        img.onerror = reject;
        img.src = url;
    });
}

function buildSkyBackground() {
    const c = document.createElement('canvas'); c.width = 8; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#10141d');
    g.addColorStop(0.55, '#2b3344');
    g.addColorStop(0.82, '#6e5a52');
    g.addColorStop(1.0, '#caa06a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

async function buildTerrain() {
    const hm = await loadImageData(`${ASSET}/gelibolu-heightmap.png`);
    heightData = hm.data; hw = hm.w; hh = hm.h;

    const SX = 256, SY = 362;
    const positions = new Float32Array((SX + 1) * (SY + 1) * 3);
    const colors = new Float32Array((SX + 1) * (SY + 1) * 3);
    const uvs = new Float32Array((SX + 1) * (SY + 1) * 2);
    let p = 0, cI = 0, uI = 0;
    for (let j = 0; j <= SY; j++) {
        for (let i = 0; i <= SX; i++) {
            const u = i / SX, v = j / SY;
            const h = sampleHeight(u, v);
            positions[p++] = (u - 0.5) * WORLD_W;
            positions[p++] = h * ZSCALE;
            positions[p++] = (v - 0.5) * WORLD_H;
            const col = hypso(h);
            colors[cI++] = col[0]; colors[cI++] = col[1]; colors[cI++] = col[2];
            uvs[uI++] = u; uvs[uI++] = 1 - v;
        }
    }
    const indices = [];
    const row = SX + 1;
    for (let j = 0; j < SY; j++) {
        for (let i = 0; i < SX; i++) {
            const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mapTex = new THREE.TextureLoader().load(`${ASSET}/../gallipoli-map.png`);
    mapTex.colorSpace = THREE.SRGBColorSpace;
    mapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true, map: mapTex, roughness: 0.95, metalness: 0.0,
    });
    mat.onBeforeCompile = (s) => {
        // soften map influence so hypsometric tint stays dominant
        s.fragmentShader = s.fragmentShader.replace(
            '#include <map_fragment>',
            '#include <map_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vColor, 0.45);'
        );
    };
    terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // diorama base skirt
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD_W, 1.4, WORLD_H),
        new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.7 })
    );
    base.position.set(0, -0.7 + 0.02, 0);
    scene.add(base);

    // water
    const wgeo = new THREE.PlaneGeometry(WORLD_W * 1.04, WORLD_H * 1.04, 1, 1);
    wgeo.rotateX(-Math.PI / 2);
    const wmat = new THREE.MeshStandardMaterial({
        color: 0x16566b, roughness: 0.1, metalness: 0.3,
        transparent: true, opacity: 0.88
    });
    water = new THREE.Mesh(wgeo, wmat);
    water.position.y = WATER_Y;
    water.receiveShadow = true;
    scene.add(water);
}

function loadModels() {
    const loader = new GLTFLoader();
    const list = ['battleship', 'cannon', 'mine', 'flag'];
    return Promise.all(list.map((name) => new Promise((res) => {
        loader.load(`${ASSET}/models/${name}.glb`,
            (g) => { models[name] = g.scene; res(); },
            undefined,
            () => { console.warn('GLB yüklenemedi:', name); res(); });
    })));
}

function addLocationLabels() {
    const KEY = new Set(['ariburnu', 'conkbayiri', 'seddulbahir', 'kilitbahir', 'canakkale',
        'suvla', 'anafartalar', 'kumkale', 'alcitepe', 'eceabat', 'kabatepe', 'erenkoyu']);
    LOCATIONS.forEach((loc) => {
        if (!KEY.has(loc.id) || loc.hiddenOnMap) return;
        const el = document.createElement('div');
        el.className = 'scene3d-place';
        el.textContent = loc.name.replace(/\s*\(.*\)/, '');
        const obj = new CSS2DObject(el);
        obj.position.set(wX(loc.x), heightAtMap(loc.x, loc.y) + 0.45, wZ(loc.y));
        scene.add(obj);
    });
}

function modelForUnit(unit) {
    const et = unit.entityType;
    if (et === 'ship' || et === 'landing_boat') return 'battleship';
    if (et === 'artillery_battery') return 'cannon';
    return 'flag';
}

function tintMesh(obj, hex, intensity = 1) {
    obj.traverse((n) => {
        if (n.isMesh && n.material && n.material.name === 'FlagCloth') {
            n.material = n.material.clone();
            n.material.color.setHex(hex);
            n.material.emissive.setHex(hex);
            n.material.emissiveIntensity = 0.15;
        }
    });
}

function makeToken(unit) {
    const group = new THREE.Group();
    const tpl = models[modelForUnit(unit)];
    let model;
    if (tpl) {
        model = tpl.clone(true);
        const et = unit.entityType;
        const scale = et === 'ship' ? 0.52 : et === 'artillery_battery' ? 0.6 : et === 'landing_boat' ? 0.42 : 0.78;
        model.scale.setScalar(scale);
        model.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.material = n.material.clone(); } });
        if (modelForUnit(unit) === 'flag') tintMesh(model, factionColor(unit.faction));
        group.add(model);
    } else {
        model = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6),
            new THREE.MeshStandardMaterial({ color: factionColor(unit.faction) }));
        group.add(model);
    }
    // faction ring on ground
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.6, 28),
        new THREE.MeshBasicMaterial({ color: factionColor(unit.faction), transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    ring.name = 'ring';
    group.add(ring);
    group.userData = { unitId: unit.id, unit, model };
    // make the model meshes hit-testable -> store unit on them
    group.traverse((n) => { if (n.isMesh) n.userData.unitId = unit.id; });
    scene.add(group);
    return group;
}

function isWaterUnit(unit) { return unit.entityType === 'ship' || unit.entityType === 'landing_boat'; }

// ── Tarihsel/sinematik katman: mayın hattı, batan gemi dumanı, top patlamaları ──
let minefield = null;
const fx = [];                 // aktif patlama/duman partikülleri
let smokeTex = null;
const TR = (s) => String(s || '').toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

function makeRadialTexture(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(([p, col]) => g.addColorStop(p, col));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// Nusret'in 7/8 Mart Erenköy koyu mayın hattı
const MINE_LINE = (() => {
    const pts = [];
    for (let i = 0; i < 14; i++) { const t = i / 13; pts.push({ x: 1150 + t * 185 + Math.sin(t * 6) * 9, y: 2362 + t * 118 }); }
    return pts;
})();

function buildMinefield() {
    if (!models.mine) return;
    minefield = new THREE.Group(); minefield.visible = false;
    MINE_LINE.forEach((p) => {
        const m = models.mine.clone(true);
        m.scale.setScalar(0.16);
        m.traverse((n) => { if (n.isMesh) { n.material = n.material.clone(); n.castShadow = true; } });
        m.position.set(wX(p.x), WATER_Y + 0.02, wZ(p.y));
        m.userData.bob = Math.random() * Math.PI * 2;
        minefield.add(m);
    });
    scene.add(minefield);
}

function spawnBurst(pos, delay = 0) {
    if (!smokeTex) smokeTex = makeRadialTexture([[0, 'rgba(80,80,82,0.9)'], [0.5, 'rgba(50,50,52,0.55)'], [1, 'rgba(40,40,42,0)']]);
    // flash
    const flashMat = new THREE.SpriteMaterial({ color: 0xffb24d, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, map: smokeTex });
    const flash = new THREE.Sprite(flashMat); flash.position.copy(pos); flash.position.y += 0.25; flash.scale.setScalar(0.1);
    scene.add(flash); fx.push({ sprite: flash, age: 0, delay, life: 0.45, kind: 'flash' });
    // smoke
    const smMat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false });
    const sm = new THREE.Sprite(smMat); sm.position.copy(pos); sm.position.y += 0.2; sm.scale.setScalar(0.2);
    scene.add(sm); fx.push({ sprite: sm, age: 0, delay: delay + 0.06, life: 1.8, kind: 'smoke' });
}

function updateFX(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.age += dt;
        if (f.age < f.delay) { f.sprite.material.opacity = 0; continue; }
        const u = (f.age - f.delay) / f.life;
        if (u >= 1) { scene.remove(f.sprite); f.sprite.material.dispose(); fx.splice(i, 1); continue; }
        if (f.kind === 'flash') {
            f.sprite.scale.setScalar(0.1 + u * 0.9);
            f.sprite.material.opacity = (1 - u) * 0.9;
        } else {
            f.sprite.scale.setScalar(0.2 + u * 1.4);
            f.sprite.position.y += dt * 0.5;
            f.sprite.material.opacity = Math.sin(u * Math.PI) * 0.6;
        }
    }
    if (minefield && minefield.visible) {
        const t = clock.elapsedTime;
        minefield.children.forEach((m) => { m.position.y = WATER_Y + 0.02 + Math.sin(t * 1.3 + m.userData.bob) * 0.025; });
    }
}

function isSunk(unit, phase) {
    if (!isWaterUnit(unit)) return false;
    const pd = unit.phases?.[phase?.id];
    const txt = TR((pd?.status || '') + ' ' + (pd?.outcome || ''));
    return /(batt|batir|batik|sunk|imha|kayb|hasar agir)/.test(txt);
}

function ensureSmoke(tk) {
    if (tk._smoke) { tk._smoke.visible = true; return; }
    if (!smokeTex) smokeTex = makeRadialTexture([[0, 'rgba(80,80,82,0.9)'], [0.5, 'rgba(50,50,52,0.55)'], [1, 'rgba(40,40,42,0)']]);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.5, depthWrite: false }));
    s.scale.setScalar(0.8); s.position.set(0, 0.6, 0);
    tk._smoke = s; tk.group.add(s);
}

export function setPhase3D(phase, positions, animData, opts = {}) {
    if (!ready) return;
    currentPhase = phase; currentAnim = animData || null;
    const seen = new Set();
    const cx = [], cz = [];
    let hasShips = false;
    const landPts = [];
    Object.keys(positions || {}).forEach((id) => {
        const pos = positions[id];
        if (!pos) return;
        const unit = UNITS_BY_ID.get(id);
        if (!unit) return;
        seen.add(id);
        let tk = tokens.get(id);
        if (!tk) { tk = { group: makeToken(unit), unit }; tokens.set(id, tk); }
        const onWater = isWaterUnit(unit);
        if (onWater) hasShips = true; else landPts.push(new THREE.Vector3(wX(pos.x), heightAtMap(pos.x, pos.y), wZ(pos.y)));
        const ty = onWater ? WATER_Y + 0.05 : heightAtMap(pos.x, pos.y);
        const tgt = new THREE.Vector3(wX(pos.x), ty, wZ(pos.y));
        tk.target = tgt;
        if (!tk.placed) { tk.group.position.copy(tgt); tk.placed = true; }
        tk.group.visible = true;
        tk.sunk = isSunk(unit, phase);   // batan gemi durumu (animate'te uygulanır)
        cx.push(tgt.x); cz.push(tgt.z);
    });
    // hide/remove stale
    tokens.forEach((tk, id) => {
        if (!seen.has(id)) { tk.group.visible = false; tk.target = null; }
    });

    // Nusret mayın hattı: deniz harekâtı sürerken görünür
    const naval = hasShips || /NAVAL/i.test(animData?.eventType || '');
    if (minefield) minefield.visible = naval;

    // Yüksek yoğunluklu günlerde top mermisi patlamaları (kıyı + deniz hedefleri)
    const intensity = Number(animData?.intensity || 0);
    if (intensity >= 6) {
        const targets = landPts.length ? landPts : cx.map((x, i) => new THREE.Vector3(x, WATER_Y, cz[i]));
        const n = Math.min(targets.length, intensity >= 8 ? 5 : 3);
        for (let i = 0; i < n; i++) {
            const base = targets[(i * 7) % targets.length];
            const jx = ((i * 131 % 7) / 7 - 0.5) * 1.2, jz = ((i * 97 % 5) / 5 - 0.5) * 1.2;
            spawnBurst(new THREE.Vector3(base.x + jx, base.y, base.z + jz), i * 0.28);
        }
    }
    // sinematik çerçeveleme: o günün aksiyonuna pan + dolly
    if (cx.length) {
        const minx = Math.min(...cx), maxx = Math.max(...cx);
        const minz = Math.min(...cz), maxz = Math.max(...cz);
        const mx = (minx + maxx) / 2, mz = (minz + maxz) / 2;
        const radius = Math.max(maxx - minx, maxz - minz) / 2 + 2.2;
        const idle = performance.now() - lastUserInput;
        // oynatım sırasında her fazda çerçevele; manuel modda sadece uzun boşlukta
        const trigger = (opts.autoplay && idle > 1200) || idle > 5200;
        if (trigger) {
            autoFrame.target.set(mx, 0.9, mz);
            autoFrame.dist = Math.max(10, Math.min(40, radius * 2.4));
            autoFrame.t = 0; autoFrame.active = true;
        }
    }
    applyAtmosphere(animData);
}

function applyAtmosphere(animData) {
    if (!scene.fog) return;
    const type = animData?.eventType || '';
    const intensity = Number(animData?.intensity || 0);
    let fogCol = 0x3a4150, sunInt = 2.2;
    if (type === 'BOMBARDMENT' || intensity >= 8) { fogCol = 0x4a4036; sunInt = 1.6; }
    else if (type === 'NAVAL' || type === 'NAVAL_ASSAULT') { fogCol = 0x36424f; }
    scene.fog.color.setHex(fogCol);
    if (sun) sun.intensity = sunInt;
}

function onPointerMove(e) {
    if (!ready || !visible) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerScreen.x = e.clientX; pointerScreen.y = e.clientY;
    pointerMoved = true;
}

const pointer = new THREE.Vector2();
const pointerScreen = { x: 0, y: 0 };
let pointerMoved = false;
const raycaster = new THREE.Raycaster();

function pickToken() {
    raycaster.setFromCamera(pointer, camera);
    const meshes = [];
    tokens.forEach((tk) => { if (tk.group.visible) tk.group.traverse((n) => { if (n.isMesh && n.name !== 'ring') meshes.push(n); }); });
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
        let o = hits[0].object;
        while (o && !o.userData.unitId) o = o.parent;
        return o ? o.userData.unitId : null;
    }
    return null;
}

function setHover(unitId) {
    if (hovered === unitId) return;
    if (hovered) { const t = tokens.get(hovered); if (t) t.group.userData.model.scale.multiplyScalar(1); }
    hovered = unitId;
    renderer.domElement.style.cursor = unitId ? 'pointer' : 'grab';
    if (!unitId) { tooltipEl.style.display = 'none'; return; }
    const tk = tokens.get(unitId);
    if (tk) {
        tooltipEl.textContent = tk.unit.name;
        tooltipEl.style.display = 'block';
    }
}

function onClick() {
    if (!hovered) return;
    const tk = tokens.get(hovered);
    if (!tk || !currentPhase) return;
    if (typeof onUnitClick === 'function') onUnitClick(tk.unit, currentPhase, currentAnim);
}

function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());   // arka plan/duraklama sonrası sıçramayı önle
    controls.update();
    // token position tween + bobbing for ships
    const t = clock.elapsedTime;
    tokens.forEach((tk) => {
        if (!tk.group.visible) return;
        if (tk.target && !tk.sunk) tk.group.position.lerp(tk.target, Math.min(1, dt * 3.2));
        if (isWaterUnit(tk.unit)) {
            if (tk.sunk) {
                tk.group.position.y += (WATER_Y - 0.14 - tk.group.position.y) * Math.min(1, dt * 1.5);
                tk.group.rotation.z += (0.55 - tk.group.rotation.z) * Math.min(1, dt * 1.2);
                tk.group.rotation.x = 0.16;
                ensureSmoke(tk);
            } else {
                tk.group.position.y = WATER_Y + 0.05 + Math.sin(t * 1.5 + tk.group.position.x) * 0.02;
                tk.group.rotation.z = Math.sin(t * 1.1 + tk.group.position.z) * 0.02;
                tk.group.rotation.x = 0;
                if (tk._smoke) tk._smoke.visible = false;
            }
        }
        if (tk._smoke && tk._smoke.visible) {
            const s = 0.7 + 0.25 * Math.sin(t * 2 + tk.group.position.z);
            tk._smoke.scale.setScalar(s);
            tk._smoke.material.opacity = 0.45 + 0.2 * Math.sin(t * 1.7);
        }
        const ring = tk.group.getObjectByName('ring');
        if (ring) {
            ring.visible = !tk.sunk;
            ring.material.opacity = 0.5 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + tk.group.position.x));
        }
    });
    updateFX(dt);
    // water shimmer
    if (water) water.position.y = WATER_Y + Math.sin(t * 0.6) * 0.01;
    // auto-frame
    if (autoFrame.active && autoFrame.t < 1) {
        autoFrame.t = Math.min(1, autoFrame.t + dt * 0.5);
        const k = Math.min(0.05, dt * 1.5);
        controls.target.lerp(autoFrame.target, k);
        // mevcut bakış açısını koru, sadece mesafeyi (dolly) hedefe yaklaştır
        const dir = camera.position.clone().sub(controls.target);
        const cur = dir.length();
        if (cur > 1e-3) { dir.setLength(cur + (autoFrame.dist - cur) * k); camera.position.copy(controls.target).add(dir); }
    }
    // hover pick (throttled to pointer movement)
    if (pointerMoved) { pointerMoved = false; setHover(pickToken()); }
    if (hovered && tooltipEl.style.display === 'block') {
        tooltipEl.style.left = pointerScreen.x + 14 + 'px';
        tooltipEl.style.top = pointerScreen.y + 14 + 'px';
        const tk = tokens.get(hovered);
        if (tk) tk.group.userData.model.rotation.y += dt * 0.6;
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

export function show3D(v) {
    visible = v;
    const host = renderer?.domElement?.parentElement;
    if (host) host.style.display = v ? 'block' : 'none';
    if (v && !raf) animate();
    if (!v && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (v) resize3D();
}
export function is3DReady() { return ready; }

export function resize3D() {
    const host = renderer?.domElement?.parentElement;
    if (!host) return;
    // overlay the 2D map-container region exactly
    const map = document.querySelector('.map-container');
    if (map) {
        const r = map.getBoundingClientRect();
        host.style.top = r.top + 'px';
        host.style.left = r.left + 'px';
        host.style.width = r.width + 'px';
        host.style.height = r.height + 'px';
    }
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h); labelRenderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
}

export async function initScene3D(container, opts = {}) {
    if (ready) return;
    UNITS = opts.units || [];
    LOCATIONS = opts.locations || [];
    onUnitClick = opts.onUnitClick || null;
    UNITS_BY_ID.clear();
    UNITS.forEach((u) => UNITS_BY_ID.set(u.id, u));
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = buildSkyBackground();
    scene.fog = new THREE.Fog(0x3a4150, 26, 74);

    camera = new THREE.PerspectiveCamera(44, 1, 0.1, 300);
    camera.position.set(11, 17, 27);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';

    labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3';
    container.appendChild(labelRenderer.domElement);

    // env for subtle reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // lights
    const hemi = new THREE.HemisphereLight(0xddc7a8, 0x202830, 0.7);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffe6c2, 2.2);
    sun.position.set(-18, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.near = 1; sc.far = 90; sc.left = -22; sc.right = 22; sc.top = 26; sc.bottom = -26;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 6; controls.maxDistance = 70;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 1, 1.5);
    controls.addEventListener('start', () => { lastUserInput = performance.now(); autoFrame.active = false; });

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'scene3d-tooltip';
    tooltipEl.style.display = 'none';
    document.body.appendChild(tooltipEl);

    await buildTerrain();
    await loadModels();
    buildMinefield();
    addLocationLabels();

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('resize', resize3D);

    ready = true;
    resize3D();

    // QA / hata ayıklama kancası
    window.GELIBOLU_3D = {
        tokenCount: () => tokens.size,
        visibleTokens: () => [...tokens.values()].filter((t) => t.group.visible).map((t) => t.unit.id),
        focus: (x, y, dist = 14) => {
            autoFrame.active = false;   // manuel odak otomatik çerçevelemeyi ezsin
            controls.target.set(wX(x), heightAtMap(x, y) + 0.5, wZ(y));
            const d = controls.target.clone(); d.x += dist * 0.5; d.y += dist * 0.7; d.z += dist;
            camera.position.copy(d); controls.update();
        },
        camera, controls, scene,
        _debug: () => ({ active: autoFrame.active, t: +autoFrame.t.toFixed(2),
            target: [+autoFrame.target.x.toFixed(1), +autoFrame.target.z.toFixed(1)],
            dist: +autoFrame.dist.toFixed(1),
            idle: Math.round(performance.now() - lastUserInput),
            elapsed: +clock.elapsedTime.toFixed(1), raf, visible }),
    };
}

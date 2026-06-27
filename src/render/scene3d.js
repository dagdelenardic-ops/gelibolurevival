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
import { getTerrainAtPoint, clampToAllowedTerrain, snapToSeaWater } from '../data/terrain-zones.js?v=20260622-hp-polish-r1';
import { ENTITY_TYPES } from '../data/entity-types.js?v=20260622-hp-polish-r1';
import { resolveCampaignMovement } from '../data/campaign-movement.js?v=20260622-hp-polish-r1';
import { getUnitVitals, formatStrength } from '../data/casualty-model.js?v=20260622-hp-polish-r1';
import { prefersReducedMotion } from '../engine/responsive.js?v=20260622-hp-polish-r1';

// Veriler app.js'ten enjekte edilir (modül-versiyon ikizlenmesini önlemek için).
let UNITS = [], LOCATIONS = [];
const UNITS_BY_ID = new Map();
let onUnitClick = null;

const ASSET = 'assets/3d';
const MAP_W = 2451, MAP_H = 3467;
const WORLD_W = 29.4, WORLD_H = 32.8, ZSCALE = 3.15;
const WATER_Y = 0.08; // sea sits just above h=0 land
const LOW_WATER_HEIGHT = 0.035;
const SHORE_RAMP_START = 18;
const SHORE_RAMP_END = 255;
const SHIP_OFFSHORE_CLEARANCE = 112;

const FACTION_COLOR = {
    ottoman: 0xc4645a, british: 0x7a9ab0, anzac: 0x8aaa78, french: 0x9a8aaa,
    allied: 0x7a9ab0
};
function factionColor(f) { return FACTION_COLOR[f] || 0xcccccc; }
const ROUTE_COLOR = {
    ottoman: 0xff695c, british: 0x7ec8ff, anzac: 0x92e384, french: 0xd5a8ff,
    allied: 0x7ec8ff, default: 0xf4d784
};
function routeColor(unit) { return ROUTE_COLOR[unit?.faction] || ROUTE_COLOR.default; }

let renderer, labelRenderer, scene, camera, controls, clock;
let terrain, water, sun, hemi;
let movementRouteGroup = null;
let heightData = null, hw = 0, hh = 0;
let raf = 0, visible = false, ready = false, simT = 0;
const models = {};            // name -> THREE.Object3D template
const tokens = new Map();     // unitId -> {group, target, model, unit}
let tooltipEl = null, hovered = null;
let currentPhase = null, currentAnim = null;
let autoFrame = { active: false, target: new THREE.Vector3(), dist: 30, height: 11, yaw: 0.4, orbit: 0, tight: false, t: 1 };
let lastUserInput = 0;
let cameraShake = 0;
let reduceMotion = false;
let autoplayActive = false;
let motionCaptionEl = null;

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

function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

const shoreDistanceCache = new Map();
const SHORE_SAMPLE_RINGS = [8, 16, 28, 44, 66, 94, 130, 174, 226, 286];
const SHORE_SAMPLE_DIRS = Array.from({ length: 20 }, (_, i) => (i / 20) * Math.PI * 2);

function distanceToWaterHeight(u, v, rawHeight) {
    if (rawHeight <= LOW_WATER_HEIGHT) return 0;
    const key = `${Math.round(u * 760)}:${Math.round(v * 1080)}`;
    const cached = shoreDistanceCache.get(key);
    if (cached !== undefined) return cached;

    for (const r of SHORE_SAMPLE_RINGS) {
        for (const angle of SHORE_SAMPLE_DIRS) {
            const su = u + Math.cos(angle) * r / MAP_W;
            const sv = v + Math.sin(angle) * r / MAP_H;
            if (su < 0 || su > 1 || sv < 0 || sv > 1) continue;
            if (sampleHeight(su, sv) <= LOW_WATER_HEIGHT) {
                shoreDistanceCache.set(key, r);
                return r;
            }
        }
    }

    const far = SHORE_RAMP_END + 1;
    shoreDistanceCache.set(key, far);
    return far;
}

function terrainHeight01(u, v) {
    const raw = sampleHeight(u, v);
    if (raw <= LOW_WATER_HEIGHT) return 0;

    // The source heightmap marks most land as a raised plateau. Fade elevation
    // in from nearby water so beaches read as beaches, not vertical walls.
    const dist = distanceToWaterHeight(u, v, raw);
    const shore = smoothstep(SHORE_RAMP_START, SHORE_RAMP_END, dist);
    const ramp = 0.14 + shore * 0.86;
    return Math.min(1, Math.pow(raw, 1.08) * ramp);
}

function heightAtMap(x, y) { return terrainHeight01(x / MAP_W, y / MAP_H) * ZSCALE; }
const mapXfromW = (wx) => (wx / WORLD_W + 0.5) * MAP_W;
const mapYfromW = (wz) => (wz / WORLD_H + 0.5) * MAP_H;
function heightAtWorld(wx, wz) { return heightAtMap(mapXfromW(wx), mapYfromW(wz)); }

function clampMapPoint(x, y) {
    return {
        x: Math.max(0, Math.min(MAP_W - 1, Math.round(x))),
        y: Math.max(0, Math.min(MAP_H - 1, Math.round(y))),
    };
}

function safeMapPointForUnit(unit, mx, my) {
    const base = clampMapPoint(mx, my);
    if (!unit) return base;

    // Ships must read as afloat in 3D. The 2D layer allows "coast" for readable
    // naval anchors, but in relief view a coast pixel can tuck the hull into land.
    if (unit.entityType === 'ship') return snapShipOffshore(base.x, base.y);

    const typeDef = ENTITY_TYPES[unit.entityType];
    if (!typeDef) return base;
    const terrain = getTerrainAtPoint(base.x, base.y);
    if (typeDef.allowedTerrain.includes(terrain)) return base;

    const fixed = clampToAllowedTerrain(base.x, base.y, typeDef.allowedTerrain);
    return clampMapPoint(fixed.x, fixed.y);
}

function nearestLandVector(mx, my, maxRadius = SHIP_OFFSHORE_CLEARANCE) {
    let best = null;
    for (let r = 12; r <= maxRadius; r += 12) {
        const steps = Math.max(16, Math.round(Math.PI * 2 * r / 18));
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const lx = mx + Math.cos(angle) * r;
            const ly = my + Math.sin(angle) * r;
            const terrain = getTerrainAtPoint(lx, ly);
            if (terrain !== 'land' && terrain !== 'coast') continue;
            const vx = mx - lx;
            const vy = my - ly;
            const d = Math.hypot(vx, vy) || r;
            if (!best || d < best.dist) best = { dist: d, x: vx / d, y: vy / d };
        }
        if (best) return best;
    }
    return best;
}

function snapShipOffshore(mx, my) {
    let p = snapToSeaWater(mx, my, 360);
    const near = nearestLandVector(p.x, p.y);
    if (!near || near.dist >= SHIP_OFFSHORE_CLEARANCE) return clampMapPoint(p.x, p.y);

    const push = Math.min(190, SHIP_OFFSHORE_CLEARANCE - near.dist + 34);
    p = snapToSeaWater(p.x + near.x * push, p.y + near.y * push, 430);
    return clampMapPoint(p.x, p.y);
}

function safeWorldPointForUnit(unit, wx, wz) {
    const safe = safeMapPointForUnit(unit, mapXfromW(wx), mapYfromW(wz));
    return {
        wx: wX(safe.x),
        wz: wZ(safe.y),
        mx: safe.x,
        my: safe.y,
        terrain: getTerrainAtPoint(safe.x, safe.y),
    };
}

function groundClearanceForUnit(unit) {
    if (!unit || isWaterUnit(unit)) return 0;
    if (unit.entityType === 'infantry_unit') return 0.12;
    if (unit.entityType === 'artillery_battery') return 0.08;
    return 0.06;
}

function groundYForUnit(unit, wx, wz) {
    return groundY(wx, wz) + groundClearanceForUnit(unit);
}

// ── Arazi mesh çözünürlüğü (buildTerrain ile AYNI olmalı) ──
// Token'lar GÖRÜNEN mesh yüzeyine otursun diye yükseklik, tam çözünürlüklü
// heightmap'ten değil, mesh'in örneklendiği AYNI ızgaradan bilinear okunur.
// Aksi halde dik sırtlarda (Sarıbayır/Conkbayırı) token'lar havada/gömülü kalıyordu.
const SEG_X = 256, SEG_Y = 362;
function groundY(wx, wz) {
    if (!heightData) return 0;
    const u = Math.min(1, Math.max(0, wx / WORLD_W + 0.5));
    const v = Math.min(1, Math.max(0, wz / WORLD_H + 0.5));
    const fx = u * SEG_X, fy = v * SEG_Y;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(SEG_X, x0 + 1), y1 = Math.min(SEG_Y, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const H = (i, j) => terrainHeight01(i / SEG_X, j / SEG_Y) * ZSCALE;
    const a = H(x0, y0), b = H(x1, y0), c = H(x0, y1), d = H(x1, y1);
    const top = a + (b - a) * tx, bot = c + (d - c) * tx;
    return top + (bot - top) * ty;
}

// ════════════════════════════════════════════════════════════════
// Milli bayraklar — her birim ait olduğu milletin gerçek bayrağını taşır.
// Dokular canvas'ta prosedürel çizilir (Osmanlı ay-yıldız, Union Jack,
// Fransız trikolor, ANZAC/Avustralya mavi sancak) → GLB'ye bağımlı değil.
// ════════════════════════════════════════════════════════════════
const flagTextures = {};
function drawStar(ctx, cx, cy, points, outer, inner, rot) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = rot + i * Math.PI / points;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
}
function drawOttoman(ctx, w, h) {
    ctx.fillStyle = '#E30A17'; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.40, cy = h * 0.5, r = h * 0.33;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E30A17';
    ctx.beginPath(); ctx.arc(cx + r * 0.30, cy, r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    drawStar(ctx, w * 0.62, cy, 5, h * 0.17, h * 0.07, -Math.PI / 2);
}
function drawUnionJack(ctx, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    ctx.fillStyle = '#012169'; ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.20;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
    ctx.strokeStyle = '#C8102E'; ctx.lineWidth = h * 0.075;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.33;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.strokeStyle = '#C8102E'; ctx.lineWidth = h * 0.19;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.restore();
}
function drawAnzac(ctx, w, h) {
    ctx.fillStyle = '#00247D'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * 0.5, h * 0.5); ctx.clip();
    drawUnionJack(ctx, w * 0.5, h * 0.5); ctx.restore();
    ctx.fillStyle = '#fff';
    drawStar(ctx, w * 0.25, h * 0.77, 7, h * 0.11, h * 0.05, -Math.PI / 2);   // Commonwealth Star
    drawStar(ctx, w * 0.72, h * 0.24, 7, h * 0.06, h * 0.027, -Math.PI / 2);  // Southern Cross
    drawStar(ctx, w * 0.84, h * 0.46, 7, h * 0.07, h * 0.031, -Math.PI / 2);
    drawStar(ctx, w * 0.71, h * 0.66, 7, h * 0.06, h * 0.027, -Math.PI / 2);
    drawStar(ctx, w * 0.92, h * 0.70, 7, h * 0.05, h * 0.022, -Math.PI / 2);
    drawStar(ctx, w * 0.80, h * 0.86, 5, h * 0.035, h * 0.016, -Math.PI / 2);
}
function drawFrench(ctx, w, h) {
    ctx.fillStyle = '#0055A4'; ctx.fillRect(0, 0, w / 3, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(w / 3, 0, w / 3, h);
    ctx.fillStyle = '#EF4135'; ctx.fillRect(2 * w / 3, 0, w / 3, h);
}
const FLAG_DRAW = { ottoman: drawOttoman, british: drawUnionJack, anzac: drawAnzac, french: drawFrench };
function flagTexture(faction) {
    const key = (faction === 'allied' || faction === 'naval') ? 'british' : faction;
    if (flagTextures[key]) return flagTextures[key];
    const W = 192, H = 120;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    (FLAG_DRAW[key] || drawOttoman)(ctx, W, H);
    // hafif kenar gölgesi → bez hissi
    const grd = ctx.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.18)'); grd.addColorStop(0.12, 'rgba(0,0,0,0)');
    grd.addColorStop(0.9, 'rgba(255,255,255,0.05)'); grd.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    flagTextures[key] = tex; return tex;
}
// Direk + dalgalanan bez. Bez geometrisinin temel pozisyonları saklanır (animate'te dalga).
function makeFlag(faction, { poleH = 1.45, flagW = 0.92, flagH = 0.58 } = {}) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.028, poleH, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a2c1d, roughness: 0.7, metalness: 0.12 })
    );
    pole.position.y = poleH / 2; pole.castShadow = true; g.add(pole);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.35, metalness: 0.7 }));
    finial.position.y = poleH + 0.03; g.add(finial);
    const fgeo = new THREE.PlaneGeometry(flagW, flagH, 16, 8);
    fgeo.translate(flagW / 2, 0, 0);   // sol kenar direğe yapışsın
    const flag = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({
        map: flagTexture(faction), side: THREE.DoubleSide, roughness: 0.82, metalness: 0.0,
    }));
    flag.position.set(0.025, poleH - flagH / 2 - 0.06, 0);
    flag.castShadow = true;
    flag.userData.base = Float32Array.from(fgeo.attributes.position.array);
    flag.userData.wave = Math.random() * Math.PI * 2;
    flag.userData.flagW = flagW;
    g.add(flag);
    g.userData.flagMesh = flag;
    return g;
}
function waveFlag(flag, t) {
    const pos = flag.geometry.attributes.position;
    const base = flag.userData.base;
    const ph = flag.userData.wave, fw = flag.userData.flagW;
    for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1];
        const k = bx / fw;   // direkten uzaklık 0..1 (uçta daha çok savrulur)
        pos.array[i * 3 + 2] = (Math.sin(bx * 7 - t * 6 + ph) * 0.07 + Math.sin(by * 6 + t * 3.5) * 0.025) * k;
    }
    pos.needsUpdate = true;
}

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
        // crossOrigin BİLEREK ayarlanmıyor: heightmap aynı-origin; 'anonymous' koyunca
        // Vercel'in immutable cache'iyle CORS uyuşmazlığı çıkıp yükleme fail ediyordu
        // (yerelde npx serve ACAO:* gönderdiği için fark edilmiyordu) → 3B çöküp 2B'ye düşüyordu.
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
    // ?v= cache-bust: /assets/ 1 yıl immutable cache'leniyor; sürüm sorgusu olmadan
    // bayat/bozuk cache kalıcı oluyordu. Her deploy taze çekilsin diye sürüm eklenir.
    const hm = await loadImageData(`${ASSET}/gelibolu-heightmap.png?v=20260622-hp-polish-r1`);
    heightData = hm.data; hw = hm.w; hh = hm.h;

    const SX = SEG_X, SY = SEG_Y;   // groundY() ile aynı ızgara → token'lar tam yüzeye oturur
    const positions = new Float32Array((SX + 1) * (SY + 1) * 3);
    const colors = new Float32Array((SX + 1) * (SY + 1) * 3);
    const uvs = new Float32Array((SX + 1) * (SY + 1) * 2);
    let p = 0, cI = 0, uI = 0;
    for (let j = 0; j <= SY; j++) {
        for (let i = 0; i <= SX; i++) {
            const u = i / SX, v = j / SY;
            const h = terrainHeight01(u, v);
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

    const texLoader = new THREE.TextureLoader();
    texLoader.crossOrigin = undefined;   // aynı-origin; CORS uyuşmazlığını önle
    const mapTex = texLoader.load(`${ASSET}/../gallipoli-map.png?v=20260622-hp-polish-r1`);
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
    const list = ['battleship', 'cannon', 'mine', 'flag', 'soldier'];
    // ?v= cache-bust: /assets 1 yıl immutable cache'leniyor; model güncellense bile
    // sürüm sorgusu olmadan bayat GLB kalıcı oluyordu (heightmap'teki aynı tuzak).
    return Promise.all(list.map((name) => new Promise((res) => {
        loader.load(`${ASSET}/models/${name}.glb?v=20260622-hp-polish-r1`,
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
    if (et === 'infantry_unit' && models.soldier) return 'soldier';   // kara birliği = asker
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

// Gemi gövdesini tarafa göre hafifçe tonla (Osmanlı kırmızımsı, İtilaf mavi-gri) →
// deniz muharebesinde kimin kim olduğu net okunur.
function tintShip(obj, hex, faction) {
    const fc = new THREE.Color(hex);
    const amt = faction === 'ottoman' ? 0.4 : 0.28;
    obj.traverse((n) => {
        if (n.isMesh && n.material && n.material.color) {
            n.material = n.material.clone();
            n.material.color.lerp(fc, amt);
        }
    });
}

// Token'ın tüm mesh'lerine opaklık uygula (tahliye solması için).
function setTokenOpacity(tk, op) {
    tk.group.traverse((n) => {
        if ((n.isMesh || n.isSprite) && n.material) {
            n.material.transparent = op < 1;
            n.material.opacity = op;
        }
    });
}

function liftLandVisualsAboveFootprint(group, unit) {
    if (!group || isWaterUnit(unit)) return;
    group.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group);
    if (!Number.isFinite(box.min.y) || box.min.y >= -0.015) return;
    const lift = -box.min.y + 0.025;
    group.children.forEach((child) => { child.position.y += lift; });
}

let solidSpriteTex = null;
function getSolidSpriteTexture() {
    if (solidSpriteTex) return solidSpriteTex;
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    solidSpriteTex = new THREE.CanvasTexture(c);
    return solidSpriteTex;
}

function makeVitalsTextTexture(text, tone = '#f2dfab') {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = '700 22px JetBrains Mono, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = tone;
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

function hpColorForVitals(vitals) {
    if (!vitals) return 0x72ad67;
    if (vitals.ratio <= 0.38 || vitals.stamina <= 0.24) return 0xc95b4d;
    if (vitals.ratio <= 0.62 || vitals.stamina <= 0.42) return 0xd9a94f;
    return 0x72ad67;
}

function vitalsLiftForUnit(unit) {
    if (unit.entityType === 'ship') return 1.02;
    if (unit.entityType === 'landing_boat') return 0.72;
    if (unit.entityType === 'artillery_battery') return 1.32;
    if (unit.entityType === 'infantry_unit') return 1.92;
    return 1.28;
}

function makeVitalsPlate(unit) {
    if (!unit.strength) return null;
    const root = new THREE.Group();
    root.name = 'vitals';
    root.position.set(0, vitalsLiftForUnit(unit), 0);
    root.userData.barWidth = isWaterUnit(unit) ? 0.78 : 0.92;

    const tex = getSolidSpriteTexture();
    const back = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0x11161a, transparent: true, opacity: 0.72,
        depthWrite: false, depthTest: false,
    }));
    back.name = 'vitals-back';
    back.scale.set(root.userData.barWidth + 0.12, 0.18, 1);
    root.add(back);

    const bar = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0x72ad67, transparent: true, opacity: 0.94,
        depthWrite: false, depthTest: false,
    }));
    bar.name = 'vitals-bar';
    bar.scale.set(root.userData.barWidth, 0.075, 1);
    bar.position.set(0, 0.012, 0.01);
    root.add(bar);

    const loss = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0xc95b4d, transparent: true, opacity: 0,
        depthWrite: false, depthTest: false,
    }));
    loss.name = 'vitals-loss-pulse';
    loss.scale.set(root.userData.barWidth + 0.26, 0.28, 1);
    loss.position.set(0, 0.01, 0.02);
    root.add(loss);

    const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeVitalsTextTexture(formatStrength(unit.strength), '#e9dcc2'),
        transparent: true, opacity: 0.88,
        depthWrite: false, depthTest: false,
    }));
    label.name = 'vitals-label';
    label.scale.set(root.userData.barWidth + 0.28, 0.24, 1);
    label.position.set(0, -0.2, 0.03);
    root.add(label);

    root.userData.bar = bar;
    root.userData.loss = loss;
    root.userData.label = label;
    root.userData.labelText = '';
    root.userData.displayRatio = 1;
    root.visible = false;
    return root;
}

function makeToken(unit) {
    const group = new THREE.Group();
    const tpl = models[modelForUnit(unit)];
    let model;
    if (tpl) {
        model = tpl.clone(true);
        const et = unit.entityType;
        const scale = et === 'ship' ? 0.42 : et === 'artillery_battery' ? 0.6 : et === 'landing_boat' ? 0.36 : et === 'infantry_unit' ? 1.08 : 0.78;
        model.scale.setScalar(scale);
        model.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.material = n.material.clone(); } });
        const mk = modelForUnit(unit);
        if (mk === 'flag' || mk === 'soldier') tintMesh(model, factionColor(unit.faction));
        else if (mk === 'battleship') tintShip(model, factionColor(unit.faction), unit.faction);
        group.add(model);
        // Piyade = tek asker değil, küçük bir MANGA: ana sancaktar + 2 yan asker.
        // "Savaşan birim" hissi verir; soyut işaret değil bir müfreze görünür.
        if (et === 'infantry_unit' && mk === 'soldier') {
            model.position.set(0, 0, 0.1);
            [[-0.33, -0.06, 0.86, 0.32], [0.31, -0.16, 0.8, -0.42]].forEach(([dx, dz, s, ry]) => {
                const extra = tpl.clone(true);
                extra.scale.setScalar(scale * s);
                extra.position.set(dx, 0, dz);
                extra.rotation.y = ry;
                extra.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.material = n.material.clone(); } });
                tintMesh(extra, factionColor(unit.faction));
                group.add(extra);
            });
        }
        // Topçu bataryası = sadece top değil, başında EKİBİYLE bir mevzi.
        if (et === 'artillery_battery' && mk === 'cannon' && models.soldier) {
            [[-0.58, 0.2, 0.85, 1.1], [0.54, -0.22, 0.8, -0.9]].forEach(([dx, dz, s, ry]) => {
                const crew = models.soldier.clone(true);
                crew.scale.setScalar(s);
                crew.position.set(dx, 0, dz);
                crew.rotation.y = ry;
                crew.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.material = n.material.clone(); } });
                tintMesh(crew, factionColor(unit.faction));
                group.add(crew);
            });
        }
    } else {
        model = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6),
            new THREE.MeshStandardMaterial({ color: factionColor(unit.faction) }));
        group.add(model);
    }
    // Milli bayrak: hangi milletse onun bayrağını taşır.
    let flag = null;
    const et2 = unit.entityType;
    if (et2 === 'infantry_unit') {
        flag = makeFlag(unit.faction, { poleH: 1.5, flagW: 0.95, flagH: 0.6 });
        flag.position.set(0.04, 0, -0.32);   // sancaktar mangaının arka-merkezinde
    } else if (et2 === 'artillery_battery') {
        flag = makeFlag(unit.faction, { poleH: 1.15, flagW: 0.72, flagH: 0.46 });
        flag.position.set(-0.34, 0, -0.1);
    } else if (et2 === 'ship') {
        flag = makeFlag(unit.faction, { poleH: 0.78, flagW: 0.5, flagH: 0.32 });
        flag.position.set(0.02, 0.14, 1.35);   // kıç sancağı (gemi uzun ekseni +Z)
    } else if (et2 === 'landing_boat') {
        flag = makeFlag(unit.faction, { poleH: 0.6, flagW: 0.4, flagH: 0.26 });
        flag.position.set(0, 0.1, 0.5);
    }
    if (flag) {
        group.add(flag);
        group.userData = group.userData || {};
    }

    liftLandVisualsAboveFootprint(group, unit);

    // faction ring on ground
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.6, 28),
        new THREE.MeshBasicMaterial({ color: factionColor(unit.faction), transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    ring.name = 'ring';
    group.add(ring);
    const vitalsPlate = makeVitalsPlate(unit);
    if (vitalsPlate) group.add(vitalsPlate);
    group.userData = { unitId: unit.id, unit, model, flagMesh: flag ? flag.userData.flagMesh : null };
    if (vitalsPlate) group.userData.vitalsPlate = vitalsPlate;
    // Geri tepme/sallanma/nişan, ana modelin BU temel duruşu etrafında uygulanır.
    model.userData.base = model.position.clone();
    model.userData.baseRotZ = model.rotation.z;
    model.userData.baseRotY = model.rotation.y;   // çatışma dışında bu doğal yönelime dönülür
    // make the model meshes hit-testable -> store unit on them
    group.traverse((n) => { if (n.isMesh) n.userData.unitId = unit.id; });
    scene.add(group);
    return group;
}

function isWaterUnit(unit) { return unit.entityType === 'ship' || unit.entityType === 'landing_boat'; }

function normalizeAnimUnitName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

function getAnimatedUnitState(unit, animData) {
    let unitState = 'idle';
    let intensity = 0;
    if (!animData) return { unitState, intensity };

    intensity = Number(animData.intensity || 0);
    const unitName = normalizeAnimUnitName(unit.name);
    const animUnit = animData.units?.find((entry) => {
        const animName = normalizeAnimUnitName(entry.name);
        return animName === unitName || animName.includes(unitName) || unitName.includes(animName);
    });

    if (animUnit) unitState = animUnit.state || unitState;
    return { unitState, intensity };
}

function getVitalsForUnit(unit, phase, animData) {
    const iso = String(phase?.isoStart || animData?.date || '');
    const { unitState, intensity } = getAnimatedUnitState(unit, animData);
    return getUnitVitals(unit.id, iso, intensity, unitState, unit.strength || 0);
}

function setVitalsLabel(plate, text, tone) {
    const label = plate?.userData?.label;
    if (!label || plate.userData.labelText === text) return;
    if (label.material.map) label.material.map.dispose();
    label.material.map = makeVitalsTextTexture(text, tone);
    label.material.needsUpdate = true;
    plate.userData.labelText = text;
}

function updateTokenVitals(tk, phase, animData) {
    const plate = tk.group?.userData?.vitalsPlate;
    if (!plate || !tk.unit?.strength) return;

    const vitals = getVitalsForUnit(tk.unit, phase, animData);
    const ratio = Math.max(0.03, Math.min(1, vitals.ratio || 0));
    const lossDelta = Math.max(0, (vitals.loss || 0) - (tk._lastLoss || 0));
    const firstVitals = tk._lastLoss === undefined;
    tk._lastLoss = vitals.loss || 0;
    tk._vitals = vitals;
    tk._vitalsTarget = ratio;
    tk._vitalsVisible = !tk.sunk && !tk.evac;

    const color = hpColorForVitals(vitals);
    if (plate.userData.bar) plate.userData.bar.material.color.setHex(color);
    const todayLoss = vitals.todayLoss || 0;
    const lossText = todayLoss > 0
        ? `-${formatStrength(todayLoss)}`
        : (vitals.loss > 0 ? `-${formatStrength(vitals.loss)}` : '');
    const label = lossText ? `${formatStrength(vitals.current)} ${lossText}` : formatStrength(vitals.current);
    const tone = todayLoss > 0 || vitals.ratio <= 0.45 ? '#f0c768' : '#e9dcc2';
    setVitalsLabel(plate, label, tone);

    if (!firstVitals && lossDelta > Math.max(12, (tk.unit.strength || 0) * 0.004)) {
        tk._lossPulse = Math.max(tk._lossPulse || 0, Math.min(1, 0.35 + lossDelta / Math.max(1, tk.unit.strength) * 8));
    } else if (todayLoss > 0 && !firstVitals) {
        tk._lossPulse = Math.max(tk._lossPulse || 0, 0.45);
    }
}

function animateVitalsPlate(tk, dt, t) {
    const plate = tk.group?.userData?.vitalsPlate;
    if (!plate) return;
    const targetVisible = !!(tk._vitalsVisible && tk.group.visible);
    plate.visible = targetVisible || (plate.userData.opacity || 0) > 0.02;
    const targetOpacity = targetVisible ? 1 : 0;
    plate.userData.opacity = (plate.userData.opacity ?? 0) + (targetOpacity - (plate.userData.opacity ?? 0)) * damp(7, dt);
    const op = plate.userData.opacity;

    const bar = plate.userData.bar;
    const loss = plate.userData.loss;
    const label = plate.userData.label;
    const width = plate.userData.barWidth || 0.9;
    const ratio = Math.max(0.03, Math.min(1, tk._vitalsTarget ?? 1));
    plate.userData.displayRatio = (plate.userData.displayRatio ?? ratio) + (ratio - (plate.userData.displayRatio ?? ratio)) * damp(4.8, dt);
    const displayRatio = plate.userData.displayRatio;

    if (bar) {
        bar.scale.x = width * displayRatio;
        bar.position.x = -width / 2 + bar.scale.x / 2;
        bar.material.opacity = 0.94 * op;
    }
    if (label) label.material.opacity = Math.min(0.92, 0.42 + op * 0.5);
    const back = plate.getObjectByName('vitals-back');
    if (back) back.material.opacity = 0.7 * op;

    tk._lossPulse = Math.max(0, (tk._lossPulse || 0) - dt * 1.25);
    if (loss) {
        const pulse = tk._lossPulse || 0;
        loss.material.opacity = pulse * 0.55 * op;
        const s = reduceMotion ? 1 : 1 + pulse * (0.38 + 0.12 * Math.sin(t * 18));
        loss.scale.set((width + 0.26) * s, 0.28 * s, 1);
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isMovingLeg(leg) {
    return !!(leg && (leg.moved || leg.retreat || leg.legKind === 'land'));
}

function motionVerbForLeg(unit, leg) {
    if (leg.retreat) return 'çekiliyor';
    if (leg.legKind === 'land') {
        if (unit.entityType === 'landing_boat') return 'çıkarma yapıyor';
        const text = `${leg.fromLabel || ''} ${leg.legEvent || ''}`.toLowerCase();
        return text.includes('battı') || text.includes('batış') ? 'batış noktasında' : 'olay noktasında';
    }
    return 'ilerliyor';
}

function updateMotionCaption(phase, liveUnits) {
    if (!motionCaptionEl || !phase) return;
    const iso = String(phase.isoStart || '');
    const movers = liveUnits
        .map(({ id, unit }) => ({ unit, leg: resolveCampaignMovement(id, iso) }))
        .filter(({ leg }) => isMovingLeg(leg))
        .sort((a, b) => {
            const aw = isWaterUnit(a.unit) ? 1 : 0;
            const bw = isWaterUnit(b.unit) ? 1 : 0;
            return aw === bw ? 0 : aw - bw;
        });
    const losses = liveUnits
        .map(({ unit }) => ({ unit, vitals: getVitalsForUnit(unit, phase, currentAnim) }))
        .filter(({ vitals }) => vitals?.base && (vitals.todayLoss || 0) > 0)
        .sort((a, b) => (b.vitals.todayLoss || 0) - (a.vitals.todayLoss || 0));

    const titleParts = [];
    if (movers.length) titleParts.push(`${movers.length} hareket / olay`);
    if (losses.length) titleParts.push(`${losses.length} kayıp güncellemesi`);
    const title = titleParts.length ? titleParts.join(' · ') : 'Cephe tutuluyor';
    const visibleMovers = movers.slice(0, 3);
    const movementDetail = movers.length
        ? visibleMovers.map(({ unit, leg }) => {
            const verb = motionVerbForLeg(unit, leg);
            const route = leg.moved
                ? `${leg.fromLabel} → ${leg.toLabel}`
                : leg.fromLabel;
            return `${unit.name}: ${route} (${verb})`;
        }).concat(movers.length > visibleMovers.length ? [`+${movers.length - visibleMovers.length} hareket daha`] : []).join(' · ')
        : 'Bugün belirgin yürüyüş yok; birlikler siper/hat üzerinde bekliyor.';
    const lossDetail = losses.length
        ? `Kayıp: ${losses.slice(0, 2).map(({ unit, vitals }) => `${unit.name} -${formatStrength(vitals.todayLoss)}`).join(' · ')}${losses.length > 2 ? ` · +${losses.length - 2} birim` : ''}`
        : '';
    const detail = lossDetail ? `${movementDetail} · ${lossDetail}` : movementDetail;

    motionCaptionEl.classList.toggle('is-empty', !movers.length);
    motionCaptionEl.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
}

function disposeNodeTree(node) {
    node.traverse((item) => {
        if (item.geometry) item.geometry.dispose();
        if (item.material) {
            const materials = Array.isArray(item.material) ? item.material : [item.material];
            materials.forEach((mat) => mat.dispose && mat.dispose());
        }
    });
}

function clearMovementRoutes() {
    if (!movementRouteGroup) return;
    while (movementRouteGroup.children.length) {
        const child = movementRouteGroup.children.pop();
        disposeNodeTree(child);
    }
}

function getRoutePointForMap(unit, point, lift = 0.16) {
    const safe = safeMapPointForUnit(unit, point.x, point.y);
    const wx = wX(safe.x);
    const wz = wZ(safe.y);
    const y = isWaterUnit(unit) ? WATER_Y + 0.11 : groundYForUnit(unit, wx, wz) + lift;
    return new THREE.Vector3(wx, y, wz);
}

function lerpMapPoint(a, b, t) {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
    };
}

function addMovementRoute(unit, leg, fromPoint, toPoint) {
    if (!movementRouteGroup || !fromPoint || !toPoint) return;
    const pxDist = Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
    if (pxDist < 38) return;

    const water = isWaterUnit(unit);
    const sampleCount = Math.max(8, Math.min(52, Math.round(pxDist / 28)));
    const points = [];
    for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const mapPoint = lerpMapPoint(fromPoint, toPoint, t);
        points.push(getRoutePointForMap(unit, mapPoint, water ? 0.22 : 0.42));
    }

    const color = routeColor(unit);
    const route = new THREE.Group();
    route.name = `route:${unit.id}`;
    const curve = new THREE.CatmullRomCurve3(points);
    const radius = water ? 0.07 : 0.052;
    const halo = new THREE.Mesh(
        new THREE.TubeGeometry(curve, sampleCount * 2, radius * 1.75, 7, false),
        new THREE.MeshBasicMaterial({
            color: 0x0b0f12,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            depthTest: false,
        })
    );
    halo.renderOrder = 7;
    route.add(halo);

    const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, sampleCount * 2, radius, 8, false),
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: leg?.retreat ? 0.78 : 0.94,
            depthWrite: false,
            depthTest: false,
        })
    );
    tube.renderOrder = 8;
    route.add(tube);

    const end = points[points.length - 1];
    const prev = points[points.length - 2] || points[0];
    const dir = end.clone().sub(prev);
    if (dir.lengthSq() > 0.0001) {
        dir.normalize();
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(water ? 0.22 : 0.17, water ? 0.54 : 0.44, 14),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, depthWrite: false, depthTest: false })
        );
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        arrow.position.copy(end);
        arrow.renderOrder = 9;
        route.add(arrow);
    }

    const progress = Number.isFinite(leg?.progress) ? Math.max(0, Math.min(1, leg.progress)) : 1;
    if (progress > 0.02 && progress < 0.98) {
        const bead = new THREE.Mesh(
            new THREE.SphereGeometry(water ? 0.17 : 0.135, 12, 8),
            new THREE.MeshBasicMaterial({ color: 0xf4d784, transparent: true, opacity: 0.96, depthWrite: false, depthTest: false })
        );
        bead.position.copy(curve.getPoint(progress));
        bead.position.y += water ? 0.04 : 0.07;
        bead.renderOrder = 10;
        route.add(bead);
    }

    movementRouteGroup.add(route);
}

function buildMovementRoutes(phase, liveUnits) {
    clearMovementRoutes();
    if (!phase || !movementRouteGroup) return;

    const iso = String(phase.isoStart || '');
    liveUnits.forEach((item) => {
        const leg = resolveCampaignMovement(item.id, iso);
        if (leg?.moved && leg.fromPoint && leg.toPoint) {
            addMovementRoute(item.unit, leg, leg.fromPoint, leg.toPoint);
            return;
        }
        if (leg?.legKind === 'land' && item.routeStart && item.routeEnd) {
            const from = { x: mapXfromW(item.routeStart.x), y: mapYfromW(item.routeStart.z) };
            const to = { x: mapXfromW(item.routeEnd.x), y: mapYfromW(item.routeEnd.z) };
            addMovementRoute(item.unit, { ...leg, progress: 1 }, from, to);
        }
    });
}

// ── Tarihsel/sinematik katman: mayın hattı, batan gemi dumanı, top patlamaları ──
let minefield = null;
const fx = [];                 // aktif patlama/duman partikülleri
let smokeTex = null;

// ── Muharebe koreografisi: tracer mermi yayları, namlu alevi, isabet, gemi izi ──
const projectiles = [];
let tracerTex = null, wakeTex = null, gunSmokeTex = null;
const wind = { x: 0.18, z: -0.06 };                   // hafif rüzgâr → duman/toz sürüklenir
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);  // kare-hızından BAĞIMSIZ yumuşatma (akıcı akış)
const combat = { active: false, naval: false, intensity: 0, pairs: [], fireTimer: 0, ambientTimer: 0, salvoIdx: 0 };
const sideOf = (f) => (f === 'ottoman' ? 'ottoman' : 'allied');
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

function spawnBurst(pos, delay = 0, power = 1) {
    if (reduceMotion) return;
    if (!smokeTex) smokeTex = makeRadialTexture([[0, 'rgba(80,80,82,0.9)'], [0.5, 'rgba(50,50,52,0.55)'], [1, 'rgba(40,40,42,0)']]);
    // flash
    const flashMat = new THREE.SpriteMaterial({ color: 0xffb24d, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, map: smokeTex });
    const flash = new THREE.Sprite(flashMat); flash.position.copy(pos); flash.position.y += 0.25; flash.scale.setScalar(0.1);
    scene.add(flash); fx.push({ sprite: flash, age: 0, delay, life: 0.45, kind: 'flash', power });
    // smoke
    const smMat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false });
    const sm = new THREE.Sprite(smMat); sm.position.copy(pos); sm.position.y += 0.2; sm.scale.setScalar(0.2);
    scene.add(sm); fx.push({ sprite: sm, age: 0, delay: delay + 0.06, life: 1.8, kind: 'smoke', power });
}

function updateFX(dt) {
    // Tepe-yük emniyeti: aşırı sprite birikiminde en eski duman/iz partiküllerini zorla
    // temizle (tracer/flash dokunulmaz). Normalde devreye girmez; intensity~10 çok-cepheli kalkan.
    if (fx.length > 160) {
        for (let i = 0; i < fx.length && fx.length > 140; i++) {
            const k = fx[i].kind;
            if (k === 'gunsmoke' || k === 'smoke' || k === 'wake') {
                scene.remove(fx[i].sprite); fx[i].sprite.material.dispose(); fx.splice(i, 1); i--;
            }
        }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.age += dt;
        if (f.age < f.delay) { f.sprite.material.opacity = 0; continue; }
        const u = (f.age - f.delay) / f.life;
        if (u >= 1) { scene.remove(f.sprite); f.sprite.material.dispose(); fx.splice(i, 1); continue; }
        if (f.kind === 'flash') {
            f.sprite.scale.setScalar(0.1 + u * 0.9);
            f.sprite.material.opacity = (1 - u) * 0.9;
        } else if (f.kind === 'wake') {
            f.sprite.scale.setScalar(0.35 + u * 1.05);
            f.sprite.material.opacity = (1 - u) * 0.4;
        } else if (f.kind === 'gunsmoke') {
            f.sprite.position.x += (f.vx || 0) * dt;
            f.sprite.position.z += (f.vz || 0) * dt;
            f.sprite.position.y += dt * 0.34;
            f.sprite.scale.setScalar(0.16 + u * (f.grow || 1));
            f.sprite.material.opacity = Math.sin(u * Math.PI) * 0.72;
        } else {
            f.sprite.scale.setScalar(0.2 + u * 1.4);
            f.sprite.position.x += wind.x * dt;        // patlama dumanı da rüzgârla savrulur
            f.sprite.position.z += wind.z * dt;
            f.sprite.position.y += dt * 0.5;
            f.sprite.material.opacity = Math.sin(u * Math.PI) * 0.6;
        }
    }
    if (minefield && minefield.visible) {
        minefield.children.forEach((m) => { m.position.y = WATER_Y + 0.02 + Math.sin(simT * 1.3 + m.userData.bob) * 0.025; });
    }
}

// ── Namlu alevi (ateş açan birimde kısa parlama) ──
function spawnMuzzle(pos, naval, delay = 0) {
    if (!tracerTex) tracerTex = makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,200,110,0.9)'], [1, 'rgba(255,140,40,0)']]);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tracerTex, color: 0xffdf9a, blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false }));
    m.position.set(pos.x, pos.y + 0.22, pos.z); m.scale.setScalar(naval ? 0.34 : 0.2);
    scene.add(m); fx.push({ sprite: m, age: 0, delay, life: naval ? 0.26 : 0.2, kind: 'flash' });
}

// ── Tracer: ateş eden birimden hedefe balistik yay çizen parlak mermi izi ──
function spawnTracer(from, to, naval, delay = 0) {
    if (!tracerTex) tracerTex = makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,200,110,0.9)'], [1, 'rgba(255,140,40,0)']]);
    spawnMuzzle(from, naval, delay);
    const col = naval ? 0xfff0c8 : 0xffd060;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tracerTex, color: col, blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false }));
    s.scale.setScalar(naval ? 0.3 : 0.22);
    s.position.set(from.x, from.y + 0.22, from.z);
    scene.add(s);
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    projectiles.push({
        sprite: s,
        from: { x: from.x, y: from.y + 0.22, z: from.z },
        to: { x: to.x, y: to.y + 0.12, z: to.z },
        age: -delay, life: Math.max(0.5, Math.min(1.15, dist * 0.06 + 0.45)),
        arc: Math.min(3.4, 0.8 + dist * 0.2), naval,
    });
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]; p.age += dt;
        if (p.age < 0) {
            p.sprite.material.opacity = 0;
            continue;
        }
        const u = p.age / p.life;
        if (u >= 1) {
            scene.remove(p.sprite); p.sprite.material.dispose(); projectiles.splice(i, 1);
            spawnBurst(new THREE.Vector3(p.to.x, p.to.y, p.to.z), 0, p.naval ? 1.25 : 0.82);   // isabet patlaması
            continue;
        }
        p.sprite.position.x = p.from.x + (p.to.x - p.from.x) * u;
        p.sprite.position.z = p.from.z + (p.to.z - p.from.z) * u;
        p.sprite.position.y = p.from.y + (p.to.y - p.from.y) * u + p.arc * Math.sin(Math.PI * u);
        p.sprite.material.opacity = u < 0.12 ? u / 0.12 : 1;
    }
}

// ── Namlu dumanı: her atışta kabaran barut bulutu; rüzgârla sürüklenir, yükselir, dağılır ──
function spawnGunSmoke(pos, nx, nz, naval, delay = 0) {
    if (!gunSmokeTex) gunSmokeTex = makeRadialTexture([[0, 'rgba(204,199,190,0.92)'], [0.4, 'rgba(150,145,138,0.58)'], [1, 'rgba(120,116,108,0)']]);
    // Yük altında otomatik kıs: yoğun çok-cepheli günde sprite churn'ü sınırla (mobil GC koruması).
    const puffs = fx.length > 110 ? 1 : (naval ? 3 : 2);
    for (let i = 0; i < puffs; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: gunSmokeTex, transparent: true, opacity: 0, depthWrite: false }));
        m.position.set(pos.x + nx * (0.08 + i * 0.14), pos.y + 0.16 + i * 0.07, pos.z + nz * (0.08 + i * 0.14));
        m.scale.setScalar((naval ? 0.26 : 0.16) + i * 0.06);
        scene.add(m);
        fx.push({
            sprite: m, age: 0, delay: delay + i * 0.05, life: (naval ? 1.5 : 1.1) + i * 0.32, kind: 'gunsmoke',
            vx: nx * 0.2 + wind.x, vz: nz * 0.2 + wind.z, grow: naval ? 2.0 : 1.25,
        });
    }
}

// Ateş eden birime geri tepme dürtüsü (model lokalinde; animate'te yumuşak sönümlenir)
function applyRecoil(tk, dx, dz, amt) {
    if (reduceMotion) return;
    tk._rec = tk._rec || { x: 0, y: 0, z: 0 };
    tk._rec.x += dx * amt;
    tk._rec.z += dz * amt;
    tk._rec.y += amt * 0.22;
}

// Tek atış: namlu ucundan tracer + barut dumanı + geri tepme + hedefe nişan
function fireShot(p, j) {
    const dx = p.to.x - p.from.x, dz = p.to.z - p.from.z;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d, nz = dz / d;
    const off = p.naval ? 0.85 : 0.42;                  // namlu ucu, gövde merkezinden ileride
    const rounds = p.naval ? 2 : 1;
    for (let r = 0; r < rounds; r++) {
        const broadside = (r - (rounds - 1) / 2) * (p.naval ? 0.28 : 0.12);
        const spread = j + (r - (rounds - 1) / 2) * 0.18;
        const delay = r * (p.naval ? 0.09 : 0.055);
        const muzzle = {
            x: p.from.x + nx * off - nz * broadside,
            y: p.from.y,
            z: p.from.z + nz * off + nx * broadside,
        };
        const target = {
            x: p.to.x - nz * broadside + spread * 0.8,
            y: p.to.y,
            z: p.to.z + nx * broadside + spread * 0.8,
        };
        spawnTracer(muzzle, target, p.naval, delay);
        spawnGunSmoke({ x: muzzle.x, y: muzzle.y + 0.22, z: muzzle.z }, nx, nz, p.naval, delay);
    }
    if (p.fromTk && !p.fromTk.sunk && !p.fromTk.evac) {
        applyRecoil(p.fromTk, -nx, -nz, p.naval ? 0.08 : 0.15);
        p.fromTk._aimYaw = Math.atan2(nx, nz);          // model +Z ekseni düşmana döner
        p.fromTk._combatPulse = Math.max(p.fromTk._combatPulse || 0, p.naval ? 0.5 : 0.8);
    }
}

// O günün aksiyonuna göre karşıt cepheleri eşle, ateş hattı kur
function buildCombat(animData, sideTokens) {
    const st = animData?.animationState || {};
    const type = animData?.eventType || '';
    const intensity = Number(animData?.intensity || 0);
    const ottActive = /fight|bombard|march/i.test(st.ottoman || '');
    const allyActive = /fight|bombard|march/i.test(st.allied || '');
    const isCombatType = /COMBAT|BOMBARDMENT|NAVAL/i.test(type);
    const haveBoth = sideTokens.ottoman.length && sideTokens.allied.length;
    combat.pairs = []; combat.active = false;
    if (intensity < 2 || (!ottActive && !allyActive && !isCombatType)) return;
    if (!haveBoth && intensity < 5) return;
    combat.intensity = intensity;
    const MAXR = 28;
    const addPairs = (attackers, targets) => {
        attackers.forEach((a) => {
            let best = null, bd = Infinity;
            targets.forEach((t) => {
                const d = (a.x - t.x) ** 2 + (a.z - t.z) ** 2;
                if (d < bd) { bd = d; best = t; }
            });
            if (best && bd <= MAXR * MAXR) {
                combat.pairs.push({
                    from: { x: a.x, y: a.y, z: a.z },
                    to: { x: best.x, y: best.y, z: best.z },
                    naval: a.water || best.water,
                    fromTk: a.tk || null, toTk: best.tk || null,
                });
                // Çatışmaya giren birimler "savaşıyor" işaretlenir → animate'te tetikte sallanırlar
                if (a.tk) a.tk.combat = true;
                if (best.tk) best.tk.combat = true;
            }
        });
    };
    if (ottActive || isCombatType) addPairs(sideTokens.ottoman, sideTokens.allied);
    if (allyActive || isCombatType) addPairs(sideTokens.allied, sideTokens.ottoman);

    // Bazı anlatı günlerinde karşı taraf token'i kamera dışında/off-map kalır.
    // O zaman birim donuk beklemesin; en yakın cephe yönüne kısa baskı ateşi kur.
    if (!combat.pairs.length && intensity >= 5) {
        const actors = [
            ...(ottActive || isCombatType ? sideTokens.ottoman : []),
            ...(allyActive || isCombatType ? sideTokens.allied : []),
        ].slice(0, 5);
        actors.forEach((a) => {
            const dir = sideOf(a.tk?.unit?.faction) === 'ottoman'
                ? { x: -0.88, z: 0.18 }
                : { x: 0.88, z: -0.12 };
            const range = a.water ? 7.5 : 3.8;
            combat.pairs.push({
                from: { x: a.x, y: a.y, z: a.z },
                to: { x: a.x + dir.x * range, y: a.y, z: a.z + dir.z * range },
                naval: a.water,
                fromTk: a.tk || null,
                toTk: null,
                suppressive: true,
            });
            if (a.tk) a.tk.combat = true;
        });
    }

    const cap = Math.max(3, Math.min(14, intensity + 2));
    if (combat.pairs.length > cap) combat.pairs = combat.pairs.slice(0, cap);
    combat.active = combat.pairs.length > 0;
    combat.naval = combat.pairs.some((p) => p.naval);   // QA hook'u doğru raporlasın
    combat.fireTimer = 0; combat.ambientTimer = 0.35; combat.salvoIdx = 0;
}

function updateCombat(dt) {
    if (!combat.active || !combat.pairs.length) return;
    combat.fireTimer -= dt;
    if (combat.fireTimer <= 0) {
        combat.fireTimer = Math.max(0.65, 1.45 - combat.intensity * 0.07);
        const salvo = Math.min(combat.pairs.length, combat.intensity >= 8 ? 2 : 1);
        for (let k = 0; k < salvo; k++) {
            const p = combat.pairs[(combat.salvoIdx++) % combat.pairs.length];
            const j = ((combat.salvoIdx * 53) % 11) / 11 - 0.5;
            fireShot(p, j);
        }
    }

    combat.ambientTimer -= dt;
    if (combat.ambientTimer <= 0 && fx.length < 135) {
        combat.ambientTimer = Math.max(1.2, 2.4 - combat.intensity * 0.08);
        const p = combat.pairs[(combat.salvoIdx + 1) % combat.pairs.length];
        const u = 0.42 + (((combat.salvoIdx * 29) % 17) / 17) * 0.22;
        const side = ((((combat.salvoIdx * 41) % 13) / 13) - 0.5) * (p.naval ? 1.5 : 0.9);
        const dx = p.to.x - p.from.x, dz = p.to.z - p.from.z;
        const d = Math.hypot(dx, dz) || 1;
        const nx = dx / d, nz = dz / d;
        const pos = new THREE.Vector3(
            p.from.x + dx * u - nz * side,
            p.from.y + (p.naval ? 0.08 : 0.02),
            p.from.z + dz * u + nx * side
        );
        spawnBurst(pos, 0, p.naval ? 0.75 : 0.5);
    }
}

// Hareket eden geminin kıçında köpük izi
function spawnWake(pos) {
    if (!wakeTex) wakeTex = makeRadialTexture([[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(220,238,245,0.5)'], [1, 'rgba(220,238,245,0)']]);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wakeTex, color: 0xdfeef4, transparent: true, opacity: 0.4, depthWrite: false }));
    s.position.set(pos.x, WATER_Y + 0.03, pos.z); s.scale.setScalar(0.35);
    scene.add(s); fx.push({ sprite: s, age: 0, delay: 0, life: 1.6, kind: 'wake' });
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
    autoplayActive = !!opts.autoplay;
    const seen = new Set();
    const cx = [], cz = [];
    let hasShips = false;
    const landPts = [];
    const sideTokens = { ottoman: [], allied: [] };
    // 1) Geçerli birimleri topla
    const live = [];
    Object.keys(positions || {}).forEach((id) => {
        const pos = positions[id];
        if (!pos) return;
        const unit = UNITS_BY_ID.get(id);
        if (!unit) return;
        live.push({ id, unit, mx: pos.x, my: pos.y, onWater: isWaterUnit(unit), ox: 0, oz: 0, sinking: !!pos.sinking, evacuating: !!pos.evacuating, enterFrom: pos.enterFrom || null });
    });
    // 2) Çakışma çözümü: token'lar birbirinin içine girmesin.
    //    (a) Tam üst üste olanlara deterministik küçük açılım,
    //    (b) aynı ortamdaki (deniz/kara) çiftleri model ayak izine göre birbirinden it.
    const seedJit = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
    const cellCount = new Map();
    live.forEach((L) => {
        const key = (L.onWater ? 'W' : 'L') + Math.round(L.mx / 8) + ',' + Math.round(L.my / 8);
        const k = cellCount.get(key) || 0; cellCount.set(key, k + 1);
        if (k > 0) {                       // aynı noktada >1 birim → deterministik açılım
            const a = (seedJit(L.id) % 360) * Math.PI / 180, r = 0.5 + k * 0.3;
            L.ox = Math.cos(a) * r; L.oz = Math.sin(a) * r;
        }
    });
    for (let it = 0; it < 8; it++) {        // separation relaxation
        for (let i = 0; i < live.length; i++) {
            for (let j = i + 1; j < live.length; j++) {
                const A = live[i], B = live[j];
                if (A.onWater !== B.onWater) continue;       // farklı ortamı itme
                const ax = wX(A.mx) + A.ox, az = wZ(A.my) + A.oz;
                const bx = wX(B.mx) + B.ox, bz = wZ(B.my) + B.oz;
                let dx = bx - ax, dz = bz - az; let d = Math.hypot(dx, dz);
                const minSep = A.onWater ? 1.55 : 0.95;       // gemiler uzun → daha geniş
                if (d > 1e-3 && d < minSep) {
                    const push = (minSep - d) / 2; dx /= d; dz /= d;
                    A.ox -= dx * push; A.oz -= dz * push;
                    B.ox += dx * push; B.oz += dz * push;
                } else if (d <= 1e-3) {                        // tam çakışma artığı
                    A.ox -= 0.3; B.ox += 0.3;
                }
            }
        }
    }

    const settleVisualTargets = () => {
        live.forEach((L) => {
            const settled = safeWorldPointForUnit(L.unit, wX(L.mx) + L.ox, wZ(L.my) + L.oz);
            L.wx = settled.wx;
            L.wz = settled.wz;
            L.safeTerrain = settled.terrain;
        });
    };
    settleVisualTargets();

    // Terrain clamp gemileri denize, piyadeyi karaya geri çektikten sonra yeni
    // mikro-çakışma oluşabilir; küçük bir ikinci pass görünür ayak izlerini açar.
    for (let it = 0; it < 3; it++) {
        let moved = false;
        for (let i = 0; i < live.length; i++) {
            for (let j = i + 1; j < live.length; j++) {
                const A = live[i], B = live[j];
                if (A.onWater !== B.onWater) continue;
                let dx = B.wx - A.wx, dz = B.wz - A.wz;
                const d = Math.hypot(dx, dz);
                const minSep = A.onWater ? 1.62 : 1.02;
                if (d <= 1e-3 || d >= minSep) continue;
                dx /= d; dz /= d;
                const push = (minSep - d) / 2;
                const aSafe = safeWorldPointForUnit(A.unit, A.wx - dx * push, A.wz - dz * push);
                const bSafe = safeWorldPointForUnit(B.unit, B.wx + dx * push, B.wz + dz * push);
                A.wx = aSafe.wx; A.wz = aSafe.wz; A.safeTerrain = aSafe.terrain;
                B.wx = bSafe.wx; B.wz = bSafe.wz; B.safeTerrain = bSafe.terrain;
                moved = true;
            }
        }
        if (!moved) break;
    }

    // 3) Token oluştur/güncelle (dağıtılmış konumlarda)
    live.forEach((L) => {
        const { id, unit, onWater } = L;
        seen.add(id);
        let tk = tokens.get(id);
        if (!tk) { tk = { group: makeToken(unit), unit }; tokens.set(id, tk); }
        tk.combat = false;                  // bu faz çatışmasını buildCombat yeniden işaretler
        const wx = Number.isFinite(L.wx) ? L.wx : wX(L.mx) + L.ox;
        const wz = Number.isFinite(L.wz) ? L.wz : wZ(L.my) + L.oz;
        if (onWater) hasShips = true;
        const ty = onWater ? WATER_Y + 0.05 : groundYForUnit(unit, wx, wz);   // görünen mesh yüzeyine tam otur
        const tgt = new THREE.Vector3(wx, ty, wz);
        if (!onWater) landPts.push(tgt.clone());
        tk.target = tgt;
        L.routeEnd = tgt.clone();
        if (!tk.placed) {
            // Amfibi giriş: ilk kez görünen çıkarma birliği denizden başlasın, tween kıyıya taşısın.
            if (L.enterFrom) {
                tk.group.position.set(wX(L.enterFrom.x), WATER_Y + 0.05, wZ(L.enterFrom.y));
            } else {
                tk.group.position.copy(tgt);
            }
            tk.placed = true;
        }
        L.routeStart = tk.group.position.clone();
        tk.group.visible = true;
        // Batış: kanonik tek otorite (yarın 'sunk' olan gemi bugün batar).
        // Eski metin taraması nusret'in "...batırdı" ifadesini yanlış eşliyordu — kaldırıldı.
        tk.sunk = L.sinking;
        // Tahliye/çekilme: yarın 'evacuated'/'withdrawn' → bugün gece sisine karışarak sol.
        tk.evac = L.evacuating;
        if (!tk.evac && tk._evacOp !== undefined && tk._evacOp < 1) { tk._evacOp = 1; setTokenOpacity(tk, 1); }
        updateTokenVitals(tk, phase, animData);
        if (!tk.sunk && !tk.evac) sideTokens[sideOf(unit.faction)].push({ x: tgt.x, y: tgt.y, z: tgt.z, water: onWater, tk });
        cx.push(tgt.x); cz.push(tgt.z);
    });
    // hide/remove stale
    tokens.forEach((tk, id) => {
        if (!seen.has(id)) { tk.group.visible = false; tk.target = null; tk._vitalsVisible = false; }
    });

    // Nusret mayın hattı: deniz harekâtı sürerken görünür
    const naval = hasShips || /NAVAL/i.test(animData?.eventType || '');
    if (minefield) minefield.visible = naval;

    // Muharebe koreografisi: o günün cephelerine göre karşı tarafları eşle.
    // Tracer mermi yayları + namlu alevleri animate() döngüsünde sürekli atılır.
    buildCombat(animData, sideTokens);
    updateMotionCaption(phase, live);
    buildMovementRoutes(phase, live);
    // Sinematik çerçeveleme: önce o günün FİİLİ çatışmasına (tracer hattı) yakın plan,
    // çatışma yoksa tüm birimlere geniş açı. Böylece autoplay her muharebeyi yakından gösterir.
    let bx0, bx1, bz0, bz1;
    if (combat.active && combat.pairs.length) {
        const xs = [], zs = [];
        combat.pairs.forEach((p) => { xs.push(p.from.x, p.to.x); zs.push(p.from.z, p.to.z); });
        bx0 = Math.min(...xs); bx1 = Math.max(...xs); bz0 = Math.min(...zs); bz1 = Math.max(...zs);
    } else if (cx.length) {
        bx0 = Math.min(...cx); bx1 = Math.max(...cx); bz0 = Math.min(...cz); bz1 = Math.max(...cz);
    }
    if (bx0 !== undefined) {
        const mx = (bx0 + bx1) / 2, mz = (bz0 + bz1) / 2;
        const tight = combat.active && combat.pairs.length;
        const radius = Math.max(bx1 - bx0, bz1 - bz0) / 2 + (tight ? 1.6 : 2.2);
        const idle = performance.now() - lastUserInput;
        // oynatım sırasında her fazda çerçevele; manuel modda sadece uzun boşlukta
        const trigger = (opts.autoplay && idle > 1200) || idle > 5200;
        if (trigger) {
            const firstPair = combat.active && combat.pairs.length ? combat.pairs[0] : null;
            const pairYaw = firstPair
                ? Math.atan2(firstPair.to.x - firstPair.from.x, firstPair.to.z - firstPair.from.z)
                : Math.atan2(mx || 1, mz || 1);
            autoFrame.target.set(mx, 0.9, mz);
            autoFrame.dist = Math.max(tight ? 8 : 10, Math.min(40, radius * (tight ? 2.0 : 2.4)));
            autoFrame.height = tight
                ? Math.max(4.6, Math.min(8.4, radius * 0.9 + 4.4))
                : Math.max(8.5, Math.min(15, radius * 0.55 + 9));
            autoFrame.yaw = pairYaw + (tight ? 0.92 : 0.64);
            autoFrame.orbit = tight ? 0.06 : 0.025;
            autoFrame.tight = tight;
            autoFrame.t = 0; autoFrame.active = true;
            if (!reduceMotion) cameraShake = Math.max(cameraShake, opts.autoplay ? 0.012 : 0.006);
        }
    }
    applyAtmosphere(animData);
}

function blendHex(a, b, t) {
    const c = new THREE.Color(a); c.lerp(new THREE.Color(b), t); return c.getHex();
}

// Sezona (aya) göre ışık/sis: 14 aylık kampanya boyunca atmosfer değişir.
function seasonPalette(iso) {
    const m = Number(String(iso || '').slice(5, 7)) || 3;
    if (m === 11 || m === 12 || m <= 2)          // Kış (Kasım-Şubat): soğuk, alçak güneş, kasvetli
        return { fog: 0x2f3742, sun: 0xc2cdda, sunInt: 1.7, sky: 0x9fb0c4, ground: 0x1c232c, sunPos: [-22, 17, 13] };
    if (m >= 3 && m <= 5)                          // İlkbahar (Mart-Mayıs): serin, açık
        return { fog: 0x3a4150, sun: 0xffe6c2, sunInt: 2.2, sky: 0xddc7a8, ground: 0x202830, sunPos: [-18, 26, 10] };
    if (m >= 6 && m <= 8)                          // Yaz (Haziran-Ağustos): sert sıcak, yüksek güneş, tozlu pus
        return { fog: 0x5a4f3a, sun: 0xfff1cf, sunInt: 2.9, sky: 0xe8d2a0, ground: 0x2a2620, sunPos: [-7, 34, 7] };
    return { fog: 0x46443e, sun: 0xffdca0, sunInt: 2.1, sky: 0xd8b98a, ground: 0x241f17, sunPos: [-20, 24, 12] }; // Sonbahar
}

function applyAtmosphere(animData) {
    if (!scene.fog) return;
    const iso = animData?.date || currentPhase?.isoStart || '';
    const type = animData?.eventType || '';
    const intensity = Number(animData?.intensity || 0);
    const p = seasonPalette(iso);
    let fogCol = p.fog, sunInt = p.sunInt;
    // Olay tipi sezonun üstüne katman: bombardıman dumanı → sıcak pus + sönük güneş.
    if (type === 'BOMBARDMENT' || intensity >= 8) { fogCol = blendHex(fogCol, 0x4a4036, 0.5); sunInt *= 0.72; }
    else if (type === 'NAVAL' || type === 'NAVAL_ASSAULT') { fogCol = blendHex(fogCol, 0x36424f, 0.4); }
    scene.fog.color.setHex(fogCol);
    if (sun) { sun.intensity = sunInt; sun.color.setHex(p.sun); sun.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]); }
    if (hemi) { hemi.color.setHex(p.sky); hemi.groundColor.setHex(p.ground); }
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
    stepFrame(Math.min(0.05, clock.getDelta()));   // arka plan/duraklama sonrası sıçramayı önle
}

// Bir kareyi ilerletir. Canlıda rAF döngüsü sürer; QA için GELIBOLU_3D.tick() de çağırır
// (preview sekmesi arka planda rAF'i durdurduğunda animasyonu başsız doğrulayabilmek için).
function stepFrame(dt) {
    simT += dt;
    controls.update();
    // token position tween + bobbing for ships
    const t = simT;
    tokens.forEach((tk) => {
        if (!tk.group.visible) return;
        // Tahliye: gece sisine karışarak sol (yerinde fade-out)
        if (tk.evac) {
            // Çatışmadan çekiliyorsa son geri-tepme/nişan pozunu temele döndür ki
            // "sakin çekilme" donuk-eğik bir pozda donup kalmasın.
            const me = tk.group.userData.model;
            if (me && me.userData.base) me.position.copy(me.userData.base);
            if (tk._rec) { tk._rec.x = tk._rec.y = tk._rec.z = 0; }
            tk._evacOp = (tk._evacOp ?? 1) - dt * 0.45;   // ~2.2 sn
            const op = Math.max(0, tk._evacOp);
            setTokenOpacity(tk, op);
            animateVitalsPlate(tk, dt, t);
            tk.group.position.y += dt * 0.05;
            if (op <= 0.001) tk.group.visible = false;
            return;
        }
        if (tk.target) {
            if (tk.sunk) {
                // batarken yatayda (mayın hattına) süzülmeye devam et; y/eğim sink koduna ait
                const k = damp(3.2, dt);
                tk.group.position.x += (tk.target.x - tk.group.position.x) * k;
                tk.group.position.z += (tk.target.z - tk.group.position.z) * k;
            } else {
                tk.group.position.lerp(tk.target, damp(autoplayActive ? 1.25 : 3.4, dt));
            }
        }
        // Kara birimi: her karede GÖRÜNEN arazi yüzeyine yapışsın (yamaçta süzülürken
        // bile havada/gömülü kalmasın). Su birimleri kendi bob/batış y'sini yönetir.
        if (!isWaterUnit(tk.unit) && !tk.sunk) {
            const gy = groundYForUnit(tk.unit, tk.group.position.x, tk.group.position.z);
            tk.group.position.y += (gy - tk.group.position.y) * damp(11, dt);
        }
        if (isWaterUnit(tk.unit)) {
            if (tk.sunk) {
                tk.group.position.y += (WATER_Y - 0.14 - tk.group.position.y) * damp(1.5, dt);
                tk.group.rotation.z += (0.55 - tk.group.rotation.z) * damp(1.2, dt);
                tk.group.rotation.x = 0.16;
                ensureSmoke(tk);
            } else {
                tk.group.position.y = WATER_Y + 0.05 + Math.sin(t * 1.5 + tk.group.position.x) * 0.02;
                tk.group.rotation.z = Math.sin(t * 1.1 + tk.group.position.z) * 0.02;
                tk.group.rotation.x = 0;
                if (tk._smoke) tk._smoke.visible = false;
                // hareket halindeki gemi kıçında köpük izi bırakır
                if (tk.target) {
                    const moved = Math.hypot(tk.group.position.x - tk.target.x, tk.group.position.z - tk.target.z);
                    tk._wakeT = (tk._wakeT || 0) - dt;
                    if (moved > 0.12 && tk._wakeT <= 0) { tk._wakeT = 0.16; spawnWake(tk.group.position); }
                }
            }
        }
        if (tk._smoke && tk._smoke.visible) {
            const s = 0.7 + 0.25 * Math.sin(t * 2 + tk.group.position.z);
            tk._smoke.scale.setScalar(s);
            tk._smoke.material.opacity = 0.45 + 0.2 * Math.sin(t * 1.7);
        }
        animateVitalsPlate(tk, dt, t);
        // ── Savaşırken hareket: ana model geri teper, düşmana döner, çatışmada tetikte sallanır ──
        const m = tk.group.userData.model;
        if (m && m.userData.base && !tk.sunk) {
            const b = m.userData.base;
            const land = !isWaterUnit(tk.unit);
            tk._combatPulse = Math.max(0, (tk._combatPulse || 0) - dt * 1.6);
            const pulse = tk._combatPulse || 0;
            // çatışmadaki kara birimi nefes alır gibi sallanır (donuk kalmaz)
            let sx = 0, sz = 0, lean = 0;
            if (tk.combat && land && !reduceMotion) {
                const ph = tk.group.position.x * 1.7 + tk.group.position.z * 0.9;
                const lunge = Math.max(0, Math.sin(t * 2.35 + ph)) * (0.014 + pulse * 0.04);
                sx = Math.sin(t * 1.9 + ph) * (0.01 + pulse * 0.008);
                sz = Math.sin(t * 1.6 + ph * 1.3) * 0.008 + lunge;
                lean = Math.sin(t * 1.8 + ph) * 0.018 + pulse * 0.014;
            }
            const r = tk._rec;
            m.position.set(b.x + sx + (r ? r.x : 0), b.y + (r ? r.y : 0), b.z + sz + (r ? r.z : 0));
            if (r) { const d = Math.exp(-dt * 7.5); r.x *= d; r.y *= d; r.z *= d; }   // geri tepme yumuşak söner
            // Nişan YALNIZ aktif çatışmada hedefe döner; çatışma bitince modelin doğal
            // yönelimine (baseRotY) yumuşakça geri döner — eski savaş yönünde kilitli kalmaz.
            const aimTarget = (tk.combat && tk._aimYaw !== undefined) ? tk._aimYaw : (m.userData.baseRotY || 0);
            let diff = aimTarget - m.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            m.rotation.y += diff * damp(land ? 5 : 2.5, dt);
            if (land) m.rotation.z = (m.userData.baseRotZ || 0) + lean;
        }
        const ring = tk.group.getObjectByName('ring');
        if (ring) {
            ring.visible = !tk.sunk;
            ring.material.opacity = 0.5 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + tk.group.position.x));
        }
        // Milli bayrak dalgalanır (batan/tahliye olan birimde durur)
        const fm = tk.group.userData.flagMesh;
        if (fm && !tk.sunk) waveFlag(fm, t);
    });
    updateFX(dt);
    updateProjectiles(dt);
    updateCombat(dt);
    // water shimmer
    if (water) water.position.y = WATER_Y + (reduceMotion ? 0 : Math.sin(t * 0.45) * 0.0035);
    // auto-frame
    if (autoFrame.active && autoFrame.t < 1) {
        autoFrame.t = Math.min(1, autoFrame.t + dt * (autoFrame.tight ? 0.42 : 0.32));
        const k = damp(autoFrame.tight ? 1.25 : 0.92, dt);
        controls.target.lerp(autoFrame.target, k);
        const yaw = autoFrame.yaw + Math.sin(simT * 0.22 + autoFrame.target.x * 0.7) * autoFrame.orbit;
        const desired = controls.target.clone().add(new THREE.Vector3(
            Math.sin(yaw) * autoFrame.dist * 0.58,
            autoFrame.height,
            Math.cos(yaw) * autoFrame.dist
        ));
        camera.position.lerp(desired, k * 0.86);
    }
    // hover pick (throttled to pointer movement)
    if (pointerMoved) { pointerMoved = false; setHover(pickToken()); }
    if (hovered && tooltipEl.style.display === 'block') {
        tooltipEl.style.left = pointerScreen.x + 14 + 'px';
        tooltipEl.style.top = pointerScreen.y + 14 + 'px';
        const tk = tokens.get(hovered);
        if (tk) tk.group.userData.model.rotation.y += dt * 0.6;
    }
    let shakeOffset = null;
    if (cameraShake > 0.001) {
        const mag = cameraShake;
        shakeOffset = new THREE.Vector3(
            Math.sin(simT * 17.1) * mag,
            Math.sin(simT * 23.7) * mag * 0.28,
            Math.cos(simT * 19.3) * mag
        );
        camera.position.add(shakeOffset);
        cameraShake *= Math.exp(-dt * 6.2);
    } else {
        cameraShake = 0;
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    if (shakeOffset) camera.position.sub(shakeOffset);
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
    reduceMotion = prefersReducedMotion();
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

    motionCaptionEl = document.createElement('div');
    motionCaptionEl.className = 'scene3d-motion-caption';
    motionCaptionEl.setAttribute('aria-live', 'polite');
    container.appendChild(motionCaptionEl);

    // env for subtle reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    movementRouteGroup = new THREE.Group();
    movementRouteGroup.name = 'movement-routes';
    scene.add(movementRouteGroup);

    // lights
    hemi = new THREE.HemisphereLight(0xddc7a8, 0x202830, 0.7);
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
        sunkTokens: () => [...tokens.values()].filter((t) => t.sunk && t.group.visible).map((t) => t.unit.id),
        evacTokens: () => [...tokens.values()].filter((t) => t.evac).map((t) => t.unit.id),
        placements: () => [...tokens.values()].filter((t) => t.group.visible).map((t) => {
            const mx = mapXfromW(t.target?.x ?? t.group.position.x);
            const my = mapYfromW(t.target?.z ?? t.group.position.z);
            const terrain = getTerrainAtPoint(mx, my);
            return {
                id: t.unit.id,
                entityType: t.unit.entityType,
                x: Math.round(mx),
                y: Math.round(my),
                terrain,
                allowed: ENTITY_TYPES[t.unit.entityType]?.allowedTerrain || [],
            };
        }),
        terrainViolations: () => window.GELIBOLU_3D.placements()
            .filter((p) => p.allowed.length && !p.allowed.includes(p.terrain)),
        focus: (x, y, dist = 14) => {
            autoFrame.active = false;   // manuel odak otomatik çerçevelemeyi ezsin
            controls.target.set(wX(x), heightAtMap(x, y) + 0.5, wZ(y));
            const d = controls.target.clone(); d.x += dist * 0.5; d.y += dist * 0.7; d.z += dist;
            camera.position.copy(d); controls.update();
        },
        camera, controls, scene,
        combat: () => ({ active: combat.active, pairs: combat.pairs.length, intensity: combat.intensity, naval: combat.naval, fx: fx.length, proj: projectiles.length }),
        tick: (n = 60, dt = 1 / 30) => { for (let i = 0; i < n; i++) stepFrame(dt); return { fx: fx.length, proj: projectiles.length, simT: +simT.toFixed(2) }; },
        anim: () => (currentAnim ? { eventType: currentAnim.eventType, intensity: currentAnim.intensity, state: currentAnim.animationState, fronts: currentAnim.fronts } : null),
        _debug: () => ({ active: autoFrame.active, t: +autoFrame.t.toFixed(2),
            target: [+autoFrame.target.x.toFixed(1), +autoFrame.target.z.toFixed(1)],
            dist: +autoFrame.dist.toFixed(1),
            idle: Math.round(performance.now() - lastUserInput),
            elapsed: +clock.elapsedTime.toFixed(1), raf, visible }),
    };
}

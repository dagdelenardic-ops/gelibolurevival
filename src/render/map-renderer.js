// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Harita Renderer (v2 — Askeri Kartografi)
// Historically grounded military cartography with modern UI clarity
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { renderTokens } from './token-renderer.js';
import { renderBattleEffects } from './effects-renderer.js';
import { updateMapDateIndicator, updateNarrationPanel, attachNarrationElements } from '../ui/narration-panel.js';

function getSceneKey(phase, animData) {
    const iso = String(phase && phase.isoStart || '');
    const fronts = Array.isArray(animData && animData.fronts) ? animData.fronts : [];
    if (iso <= '1915-03-19' || (fronts.length === 1 && fronts[0] === 'Deniz')) return 'naval';
    if (fronts.length === 1 && fronts[0] === 'Arıburnu') return 'anzac';
    if (fronts.length === 1 && fronts[0] === 'Seddülbahir') return 'helles';
    return 'general';
}

export function updateMapSceneState(phase, animData) {
    const svg = document.getElementById('battleMap');
    const ctr = document.querySelector('.map-container');
    if (!svg || !ctr) return;

    const sceneKey = getSceneKey(phase, animData);
    svg.dataset.scene = sceneKey;
    ctr.dataset.scene = sceneKey;

    const visibleByScene = {
        naval: new Set(['bogaz', 'canakkale', 'kilitbahir', 'kumkale', 'seddulbahir', 'gelibolu']),
        anzac: new Set(['ariburnu', 'kabatepe', 'conkbayiri', 'bigali', 'kirectepe', 'anafartalar', 'kilitbahir']),
        helles: new Set(['seddulbahir', 'kirte', 'alcitepe', 'morto-koyu', 'kumkale', 'kilitbahir']),
        general: null
    };
    const visible = visibleByScene[sceneKey] || null;

    svg.querySelectorAll('.location-group').forEach((el) => {
        const locationId = el.dataset.locationId;
        el.classList.toggle('is-scene-hidden', !!visible && !visible.has(locationId));
    });

    svg.querySelectorAll('.scene-annotation-group').forEach((el) => {
        el.classList.toggle('is-scene-hidden', el.dataset.sceneGroup !== sceneKey);
    });

    const minefields = document.getElementById('minefields');
    const forts = document.getElementById('forts');
    const fortifications = document.getElementById('layer-fortifications');
    if (minefields) minefields.classList.toggle('is-scene-dimmed', sceneKey !== 'naval');
    if (forts) forts.classList.toggle('is-scene-dimmed', sceneKey === 'anzac');
    if (fortifications) fortifications.classList.toggle('is-scene-dimmed', sceneKey === 'naval');
}

/** Mayın hattı SVG helper */
function mineLine(x1, y1, x2, y2, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        s += `<circle cx="${mx}" cy="${my}" r="1.8" fill="none" stroke="#6a5535" stroke-width=".6" opacity=".6"/>
              <circle cx="${mx}" cy="${my}" r=".6" fill="#6a5535" opacity=".5"/>`;
    }
    return s;
}

/** Kıyı bataryası SVG helper */
function fort(x, y, name) {
    return `<g>
  <rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="none" stroke="#7a6040" stroke-width=".8" opacity=".7" transform="rotate(45,${x},${y})"/>
  <circle cx="${x}" cy="${y}" r="1.5" fill="#7a6040" opacity=".6"/>
  <text x="${x + 6}" y="${y + 2}" fill="#8a7555" font-family="var(--mono)" font-size="4.5" opacity=".7" font-weight="600"
    paint-order="stroke" stroke="rgba(30,28,24,.7)" stroke-width="1.2">${name}</text></g>`;
}

// ── Yarımada kıyı hattı path'leri (daha gerçekçi, daha fazla kontrol noktası) ──
const PENINSULA_PATH = `
    M 525 18
    C 515 24, 505 28, 495 34
    C 482 40, 472 44, 462 52
    C 452 60, 446 68, 442 78
    C 438 88, 436 98, 434 108
    C 432 118, 431 128, 430 138
    C 428 152, 426 166, 424 178
    C 422 190, 420 202, 418 212
    C 416 224, 416 236, 418 248
    C 420 260, 422 272, 422 284
    C 422 296, 420 308, 416 320
    C 412 332, 406 344, 400 356
    C 394 368, 388 380, 382 392
    C 376 404, 370 416, 364 428
    C 356 442, 348 455, 340 466
    C 334 476, 328 484, 322 492
    C 316 500, 310 506, 304 508
    C 296 510, 288 506, 282 498
    C 276 488, 270 474, 264 458
    C 258 442, 252 426, 248 410
    C 244 394, 240 378, 236 362
    C 232 346, 228 330, 226 314
    C 224 298, 222 282, 220 266
    C 218 252, 218 240, 220 228
    C 222 218, 224 210, 224 200
    C 224 190, 222 180, 224 170
    C 226 160, 230 150, 234 140
    C 238 130, 242 120, 246 110
    C 248 100, 252 90, 258 82
    C 266 72, 278 62, 295 50
    C 315 38, 340 30, 370 24
    C 400 18, 440 16, 480 14
    L 525 18 Z
`;

const ASIA_PATH = `
    M 530 190
    C 534 208, 530 228, 524 250
    L 518 275
    C 512 295, 506 315, 500 335
    L 496 360
    C 492 380, 490 396, 488 414
    L 486 436
    C 482 456, 474 474, 464 488
    C 454 500, 448 512, 450 524
    C 456 534, 476 540, 512 542
    L 720 540
    L 720 560 L 440 560
    C 432 548, 428 536, 432 522
    C 436 508, 444 494, 452 480
    C 460 464, 464 446, 466 428
    L 470 402
    C 474 382, 478 362, 480 342
    L 484 312
    C 486 292, 492 272, 500 254
    L 512 228
    C 518 214, 524 200, 530 190 Z
`;

/** Ana SVG harita oluştur ve DOM'a ekle */
export function renderMap(currentPhaseIndex, currentPositions) {
    const ctr = document.querySelector('.map-container');
    const phase = BATTLE_DATA.phases[currentPhaseIndex];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 720 560');
    svg.setAttribute('id', 'battleMap');
    svg.innerHTML = `
  <defs>
    <!-- ═══ GRADIENTS — desatüre, askeri kartografi ═══ -->
    <linearGradient id="seaG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a3540"/>
      <stop offset="40%" stop-color="#303d48"/>
      <stop offset="70%" stop-color="#28353e"/>
      <stop offset="100%" stop-color="#222d36"/>
    </linearGradient>

    <radialGradient id="seaDepthG" cx="55%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#354550" stop-opacity=".3"/>
      <stop offset="100%" stop-color="#1a2228" stop-opacity=".2"/>
    </radialGradient>

    <linearGradient id="landG" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#6a6852"/>
      <stop offset="25%" stop-color="#5e5c48"/>
      <stop offset="50%" stop-color="#555340"/>
      <stop offset="75%" stop-color="#4a4838"/>
      <stop offset="100%" stop-color="#3e3c30"/>
    </linearGradient>

    <linearGradient id="landG2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#585648"/>
      <stop offset="100%" stop-color="#3a3830"/>
    </linearGradient>

    <linearGradient id="ridgeHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7a7862" stop-opacity=".15"/>
      <stop offset="100%" stop-color="#4a4838" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="hillShade" cx="35%" cy="30%">
      <stop offset="0%" stop-color="#8a886e" stop-opacity=".12"/>
      <stop offset="100%" stop-color="#4a4838" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="vignetteG" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity=".2"/>
      <stop offset="8%" stop-color="#000" stop-opacity="0"/>
      <stop offset="92%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>

    <radialGradient id="vignetteR" cx="50%" cy="50%" r="62%">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".2"/>
    </radialGradient>

    <!-- ═══ FILTERS — doğal, subtil ═══ -->
    <filter id="terrainRelief" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="5" seed="12" result="noise"/>
      <feDiffuseLighting in="noise" lighting-color="#f0ead0" surfaceScale="1.2" diffuseConstant=".6" result="light">
        <feDistantLight azimuth="315" elevation="40"/>
      </feDiffuseLighting>
      <feComposite in="light" in2="SourceGraphic" operator="in" result="litTerrain"/>
      <feBlend in="SourceGraphic" in2="litTerrain" mode="soft-light"/>
    </filter>

    <filter id="paperTex" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="4" seed="3" result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="soft-light" result="textured"/>
      <feComposite in="textured" in2="SourceGraphic" operator="in"/>
    </filter>

    <filter id="coastSoft">
      <feGaussianBlur stdDeviation=".8"/>
    </filter>

    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>

    <!-- ═══ PATTERNS — doğal harita dokusu ═══ -->
    <pattern id="wave" width="60" height="16" patternUnits="userSpaceOnUse">
      <path d="M0 8 Q15 4 30 8 Q45 12 60 8" fill="none" stroke="#3a4a54" stroke-width=".35" opacity=".4"/>
    </pattern>

    <pattern id="hachure" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#5a5840" stroke-width=".5" opacity=".2"/>
    </pattern>

    <pattern id="contourFill" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
      <line x1="0" y1="0" x2="0" y2="12" stroke="#6a6850" stroke-width=".3" opacity=".08"/>
    </pattern>

    <clipPath id="mapClip"><rect width="720" height="560" rx="4"/></clipPath>
  </defs>

  <!-- ═══ LAYER: TERRAIN ═══ -->
  <g id="layer-terrain" clip-path="url(#mapClip)">

    <!-- DENİZ — desatüre gri-mavi, sessiz -->
    <rect width="720" height="560" fill="url(#seaG)"/>
    <rect width="720" height="560" fill="url(#seaDepthG)"/>
    <rect width="720" height="560" fill="url(#wave)" opacity=".35"/>

    <!-- Hafif kağıt dokusu (tüm harita üstü) -->
    <rect width="720" height="560" fill="url(#contourFill)" opacity=".15"/>

    <!-- Deniz derinlik konturu — Boğaz kanalı -->
    <g class="depth-contours" opacity=".15">
      <path d="M466 310 C470 335 472 360 470 385 C468 405 464 425 460 445"
        fill="none" stroke="#1a2830" stroke-width="1" stroke-dasharray="8,6"/>
      <path d="M40 360 C90 370 150 380 220 395 C280 410 320 430 360 460"
        fill="none" stroke="#1a2830" stroke-width=".7" stroke-dasharray="12,8"/>
    </g>

    <!-- ═══ TRAKYA ═══ -->
    <path d="M 0 0 L 530 0 L 525 18 C 490 22,440 18,400 15 C 350 12,310 14,280 20
      C 245 28,210 30,175 40 C 130 55,80 65,35 72 L 0 82 Z"
      fill="url(#landG2)" stroke="#4a4838" stroke-width=".8" opacity=".75" filter="url(#terrainRelief)"/>

    <!-- TRAKYA etiketi — primary tier -->
    <text x="30" y="32" class="label-primary" fill="#a09880" font-size="13" letter-spacing="5"
      paint-order="stroke" stroke="rgba(30,28,24,.5)" stroke-width="1.5">TRAKYA</text>

    <!-- ═══ GÖKÇEADA ═══ -->
    <path d="M 50 285 C 60 272,85 268,105 272 C 125 276,135 285,132 296 C 128 306,108 312,88 310 C 65 306,45 298,50 285 Z"
      fill="url(#landG2)" stroke="#4a4838" stroke-width=".7" opacity=".6" filter="url(#terrainRelief)"/>
    <text x="70" y="295" class="label-secondary" fill="#8a8068">Gökçeada</text>

    <!-- ═══ GELİBOLU YARIMADASI — doğal kontur ═══ -->
    <!-- Kıyı gölgesi (soft edge — deniz/kara geçişi) -->
    <path d="${PENINSULA_PATH}" fill="#283038" stroke="none" opacity=".25" filter="url(#coastSoft)" transform="translate(2,2)"/>

    <!-- Ana yarımada -->
    <path d="${PENINSULA_PATH}" fill="url(#landG)" stroke="#5a5848" stroke-width="1" opacity=".92" filter="url(#terrainRelief)"/>

    <!-- Hachure dokusu (yarımada üstü) -->
    <path d="${PENINSULA_PATH}" fill="url(#hachure)" opacity=".15" pointer-events="none"/>

    <!-- ═══ SUVLA KOYU ═══ -->
    <path d="M 246 110 C 250 116, 252 124, 248 132
      C 244 140, 238 142, 234 138 C 230 132, 233 124, 238 116
      C 242 110, 246 108, 246 110 Z"
      fill="url(#seaG)" stroke="#3a4550" stroke-width=".5" opacity=".8"/>

    <!-- ═══ ANZAC KOYU ═══ -->
    <path d="M 218 240 C 222 246, 226 252, 224 258
      C 222 264, 218 266, 214 262 C 210 256, 210 248, 214 242
      C 216 238, 218 238, 218 240 Z"
      fill="url(#seaG)" stroke="#3a4550" stroke-width=".4" opacity=".8"/>

    <!-- ═══ TOPOGRAFİK KATMAN — hillshade ve sırt hatları ═══ -->

    <!-- Ana sırt hattı (Kocaçimen → Conkbayırı → Alçıtepe) — belirgin -->
    <path d="M 470 45 C 450 72 440 105 435 135 C 430 165 425 195 420 225
      C 418 248 415 270 410 295 C 404 320 395 345 385 370
      C 372 400 355 425 340 450 C 325 470 315 485 305 498"
      fill="none" stroke="#7a7860" stroke-width="1" opacity=".3" stroke-dasharray="6,3"/>

    <!-- İkincil sırtlar — silik -->
    <path d="M 445 80 C 438 115 432 148 428 180 C 424 210 420 240 415 268"
      fill="none" stroke="#5a5842" stroke-width=".5" opacity=".15" stroke-dasharray="3,4"/>
    <path d="M 250 120 C 246 155 240 190 236 225 C 232 260 236 295 245 330 C 255 365 268 400 278 435"
      fill="none" stroke="#5a5842" stroke-width=".5" opacity=".15" stroke-dasharray="3,4"/>

    <!-- Sarıbayır sırt bandı (yükseklik ısı) -->
    <path d="M310 220 C330 205 355 180 375 162 C395 145 415 125 430 105"
      fill="none" stroke="#8a886e" stroke-width="3" opacity=".06"/>

    <!-- ═══ TEPE NOKTALARI — yükseklik hiyerarşisi ═══ -->

    <!-- Conkbayırı (261m) — önemli, belirgin -->
    <g class="summit-marker">
      <circle cx="320" cy="223" r="2.5" fill="none" stroke="#8a886e" stroke-width=".8" opacity=".5"/>
      <line x1="320" y1="220" x2="320" y2="226" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <line x1="317" y1="223" x2="323" y2="223" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <text x="326" y="226" fill="#a09880" font-family="var(--mono)" font-size="5.5" font-weight="600" opacity=".7"
        paint-order="stroke" stroke="rgba(30,28,24,.6)" stroke-width="1.2">Conkbayırı 261m</text>
    </g>

    <!-- Kocaçimen (305m) — en yüksek, belirgin -->
    <g class="summit-marker">
      <circle cx="431" cy="100" r="2.5" fill="none" stroke="#8a886e" stroke-width=".8" opacity=".5"/>
      <line x1="431" y1="97" x2="431" y2="103" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <line x1="428" y1="100" x2="434" y2="100" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <text x="437" y="103" fill="#a09880" font-family="var(--mono)" font-size="5.5" font-weight="600" opacity=".7"
        paint-order="stroke" stroke="rgba(30,28,24,.6)" stroke-width="1.2">Kocaçimen 305m</text>
    </g>

    <!-- Alçıtepe / Achi Baba (218m) — önemli -->
    <g class="summit-marker">
      <circle cx="305" cy="406" r="2.5" fill="none" stroke="#8a886e" stroke-width=".8" opacity=".5"/>
      <line x1="305" y1="403" x2="305" y2="409" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <line x1="302" y1="406" x2="308" y2="406" stroke="#8a886e" stroke-width=".4" opacity=".4"/>
      <text x="311" y="409" fill="#a09880" font-family="var(--mono)" font-size="5" font-weight="600" opacity=".65"
        paint-order="stroke" stroke="rgba(30,28,24,.6)" stroke-width="1.2">Alçıtepe 218m</text>
    </g>

    <!-- Battleship Hill (220m) — mikro tier -->
    <g class="summit-marker" opacity=".45">
      <circle cx="295" cy="210" r="1.5" fill="none" stroke="#7a7860" stroke-width=".5"/>
      <text x="300" y="213" fill="#8a8068" font-family="var(--mono)" font-size="3.5">220m</text>
    </g>

    <!-- Baby 700 — mikro -->
    <g class="summit-marker" opacity=".35">
      <circle cx="268" cy="242" r="1.2" fill="none" stroke="#7a7860" stroke-width=".4"/>
      <text x="273" y="245" fill="#7a7060" font-family="var(--mono)" font-size="3">210m</text>
    </g>

    <!-- Hill 60 — mikro -->
    <g class="summit-marker" opacity=".35">
      <circle cx="258" cy="158" r="1.2" fill="none" stroke="#7a7860" stroke-width=".4"/>
      <text x="263" y="161" fill="#7a7060" font-family="var(--mono)" font-size="3">60m</text>
    </g>

    <!-- Chocolate Hill — mikro -->
    <g class="summit-marker" opacity=".35">
      <circle cx="272" cy="148" r="1.2" fill="none" stroke="#7a7860" stroke-width=".4"/>
      <text x="277" y="151" fill="#7a7060" font-family="var(--mono)" font-size="3">48m</text>
    </g>

    <!-- Kilitbahir Platosu -->
    <ellipse cx="380" cy="345" rx="32" ry="25" fill="url(#hillShade)" stroke="#5a5840"
      stroke-width=".5" opacity=".25" stroke-dasharray="3,2"/>
    <text x="358" y="349" fill="#7a7060" font-family="var(--mono)" font-size="4" opacity=".45" font-style="italic">Kilitbahir Plt.</text>

    <!-- Kontur çizgileri -->
    <g class="contour-lines" opacity=".12">
      <path d="M228 222 C226 232 224 242 220 258 C218 272 216 286 216 300"
        fill="none" stroke="#5a5842" stroke-width=".35" stroke-dasharray="2,3"/>
      <path d="M244 215 C248 228 252 242 258 256 C264 270 268 280 272 290"
        fill="none" stroke="#5a5842" stroke-width=".35" stroke-dasharray="2,3"/>
      <path d="M308 218 C325 205 345 185 365 168 C385 152 400 138 415 122 C422 114 428 108 431 102"
        fill="none" stroke="#5a5842" stroke-width=".4" stroke-dasharray="2,3"/>
      <path d="M272 432 C285 425 298 420 310 418 C322 420 335 428 345 440"
        fill="none" stroke="#5a5842" stroke-width=".35" stroke-dasharray="2,3"/>
      <path d="M238 112 C248 106 258 100 268 94 C275 90 282 86 288 84"
        fill="none" stroke="#5a5842" stroke-width=".3" stroke-dasharray="2,3"/>
    </g>

    <!-- Dere/vadi göstergeleri -->
    <g class="ravines" opacity=".15">
      <path d="M232 228 C238 232 244 238 252 246" fill="none" stroke="#3a3828" stroke-width=".4" stroke-dasharray="1.5,2"/>
      <text x="234" y="226" fill="#5a5842" font-family="var(--mono)" font-size="2.8" font-style="italic" opacity=".6">Shrapnel D.</text>
      <path d="M242 238 C248 244 254 250 262 258" fill="none" stroke="#3a3828" stroke-width=".4" stroke-dasharray="1.5,2"/>
      <text x="250" y="236" fill="#5a5842" font-family="var(--mono)" font-size="2.8" font-style="italic" opacity=".5">Monash V.</text>
    </g>

    <!-- Falezler (batı kıyısı) -->
    <g class="cliff-marks" opacity=".12">
      <line x1="220" y1="310" x2="215" y2="308" stroke="#4a4838" stroke-width=".5"/>
      <line x1="222" y1="330" x2="217" y2="327" stroke="#4a4838" stroke-width=".5"/>
      <line x1="226" y1="350" x2="221" y2="347" stroke="#4a4838" stroke-width=".5"/>
      <line x1="230" y1="370" x2="225" y2="367" stroke="#4a4838" stroke-width=".5"/>
      <line x1="234" y1="390" x2="229" y2="387" stroke="#4a4838" stroke-width=".5"/>
      <line x1="240" y1="410" x2="235" y2="407" stroke="#4a4838" stroke-width=".5"/>
      <line x1="248" y1="430" x2="243" y2="427" stroke="#4a4838" stroke-width=".5"/>
      <line x1="256" y1="450" x2="251" y2="447" stroke="#4a4838" stroke-width=".5"/>
    </g>

    <!-- Tuz Gölü -->
    <ellipse cx="252" cy="118" rx="10" ry="6" fill="#303d48" stroke="#3a4550" stroke-width=".4" opacity=".4"/>
    <text x="246" y="122" fill="#4a5560" font-family="var(--mono)" font-size="3" opacity=".4" font-style="italic">Tuz Gölü</text>

    <!-- Suvla Ovası -->
    <g class="suvla-detail" opacity=".2">
      <ellipse cx="255" cy="125" rx="16" ry="9" fill="#3a3828" stroke="#4a4838" stroke-width=".3" stroke-dasharray="2,2"/>
      <text x="243" y="132" fill="#5a5842" font-family="var(--mono)" font-size="2.8" font-style="italic">Suvla Ovası</text>
    </g>

    <!-- Sahil kenarı dalga çizgileri — kıyı şeridi -->
    <g class="coastal-waves" opacity=".08">
      <path d="M216 268 C214 280 212 295 214 310 C216 325 220 340 224 355"
        fill="none" stroke="#5a6a72" stroke-width=".4" stroke-dasharray="2,4"/>
      <path d="M224 355 C228 370 232 385 238 400 C244 415 250 430 258 445"
        fill="none" stroke="#5a6a72" stroke-width=".4" stroke-dasharray="2,4"/>
      <path d="M282 498 C290 502 300 506 312 510 C324 508 334 502 340 496"
        fill="none" stroke="#5a6a72" stroke-width=".4" stroke-dasharray="2,4"/>
    </g>

    <!-- ═══ ASYA YAKASI ═══ -->
    <path d="${ASIA_PATH}" fill="#283038" stroke="none" opacity=".2" filter="url(#coastSoft)" transform="translate(-2,2)"/>
    <path d="${ASIA_PATH}" fill="url(#landG2)" stroke="#4a4838" stroke-width=".8" opacity=".7" filter="url(#terrainRelief)"/>

    <!-- ═══ SU ETİKETLERİ — primary tier, desatüre ═══ -->
    <text x="460" y="270" fill="#506878" font-family="var(--mono)" font-size="8" font-weight="600"
      opacity=".4" transform="rotate(-72,460,270)" letter-spacing="3"
      paint-order="stroke" stroke="rgba(25,30,35,.4)" stroke-width="1">CANAKKALE BOGAZI</text>

    <text x="60" y="420" fill="#3a5060" font-family="var(--mono)" font-size="10" font-weight="600"
      opacity=".3" letter-spacing="5"
      paint-order="stroke" stroke="rgba(25,30,35,.3)" stroke-width="1">EGE DENiZi</text>

    <text x="530" y="100" fill="#3a5060" font-family="var(--mono)" font-size="8" font-weight="600"
      opacity=".25" letter-spacing="3"
      paint-order="stroke" stroke="rgba(25,30,35,.3)" stroke-width="1">MARMARA DENiZi</text>

    <text x="155" y="115" fill="#3a5060" font-family="var(--mono)" font-size="7" font-weight="600"
      opacity=".3" letter-spacing="2" transform="rotate(-12,155,115)"
      paint-order="stroke" stroke="rgba(25,30,35,.3)" stroke-width="1">SAROS KORFEZi</text>

    <!-- ═══ COĞRAFİ İSİMLER — hiyerarşik ═══ -->

    <!-- Mikro tier: burunlar, koylar, küçük detaylar -->
    <g class="coastal-names" opacity=".45">
      <text x="198" y="260" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Arı Burnu</text>
      <text x="270" y="500" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Tekke Burnu</text>
      <text x="345" y="490" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Helles Br.</text>
      <text x="240" y="140" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Nibrunesi Pt.</text>
      <text x="350" y="470" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Morto Koyu</text>
      <text x="500" y="240" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Kepez Br.</text>
      <text x="450" y="428" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Erenköy</text>
      <text x="208" y="320" fill="#6a6852" font-family="var(--mono)" font-size="3.5" font-style="italic">Gaba Tepe</text>
      <text x="228" y="96" fill="#6a6852" font-family="var(--mono)" font-size="3" font-style="italic">Suvla Pt.</text>
    </g>

    <!-- Orta tier: Asya yakası yerleşimler -->
    <g class="asia-detail" opacity=".45">
      <text x="520" y="440" fill="#7a7060" font-family="var(--mono)" font-size="4.5" font-style="italic"
        paint-order="stroke" stroke="rgba(30,28,24,.5)" stroke-width="1">Canakkale</text>
      <text x="480" y="510" fill="#6a6052" font-family="var(--mono)" font-size="3.5" font-style="italic">Yeniköy</text>
      <text x="450" y="478" fill="#6a6052" font-family="var(--mono)" font-size="3" font-style="italic">Intepe</text>
    </g>

    <!-- Mesafe referansı -->
    <g class="distance-refs" opacity=".12">
      <line x1="220" y1="248" x2="305" y2="406" stroke="#5a5540" stroke-width=".25" stroke-dasharray="1,6"/>
      <text x="260" y="330" fill="#5a5540" font-family="var(--mono)" font-size="2.8" transform="rotate(-58,260,330)">~22 km</text>
    </g>

  </g><!-- /layer-terrain -->

  <!-- ═══ LAYER: FORTIFICATIONS ═══ -->
  <g id="layer-fortifications">

    <!-- Osmanlı Siper Hatları — toprak kahverengisi -->
    <g class="trench-system" opacity=".22">
      <path d="M240 218 C245 225 250 235 255 248 C260 260 265 270 270 280"
        fill="none" stroke="#6a5a3a" stroke-width=".6" stroke-dasharray="3,1.5,1,1.5"/>
      <path d="M250 212 C256 222 262 234 268 248 C274 262 278 274 282 286"
        fill="none" stroke="#6a5a3a" stroke-width=".4" stroke-dasharray="2,2,1,2"/>
      <path d="M272 438 C282 432 292 427 305 424 C318 424 328 428 338 435"
        fill="none" stroke="#6a5a3a" stroke-width=".6" stroke-dasharray="3,1.5,1,1.5"/>
      <path d="M278 430 C288 425 298 420 310 418 C322 418 332 422 340 428"
        fill="none" stroke="#6a5a3a" stroke-width=".4" stroke-dasharray="2,2,1,2"/>
      <path d="M260 138 C272 145 286 155 302 166 C314 174 325 180 335 186"
        fill="none" stroke="#6a5a3a" stroke-width=".4" stroke-dasharray="2,2,1,2"/>
    </g>

    <!-- İtilaf Siper Hatları — soluk mavi-gri -->
    <g class="trench-system" opacity=".18">
      <path d="M218 230 C222 238 228 250 234 262 C240 274 245 282 250 292"
        fill="none" stroke="#4a5a6a" stroke-width=".5" stroke-dasharray="3,1.5,1,1.5"/>
      <path d="M214 236 C218 244 222 256 226 268 C230 280 234 288 238 298"
        fill="none" stroke="#4a5a6a" stroke-width=".35" stroke-dasharray="2,3"/>
      <path d="M258 452 C270 444 282 438 298 434 C312 434 324 438 336 446"
        fill="none" stroke="#4a5a6a" stroke-width=".5" stroke-dasharray="3,1.5,1,1.5"/>
    </g>

    <!-- İrtibat Siperleri -->
    <g class="comm-trenches" opacity=".1">
      <path d="M268 272 C278 262 288 252 298 242 C306 235 312 230 318 226"
        fill="none" stroke="#5a5540" stroke-width=".35" stroke-dasharray="2,3"/>
      <path d="M310 420 C310 412 308 405 306 398"
        fill="none" stroke="#5a5540" stroke-width=".35" stroke-dasharray="2,3"/>
    </g>

    <!-- Tel Örgü — çok ince -->
    <g class="wire-entanglements" opacity=".07">
      <path d="M232 232 L234 230 L236 234 L238 230 L240 234" fill="none" stroke="#5a5540" stroke-width=".3"/>
      <path d="M272 442 L274 440 L276 444 L278 440 L280 444" fill="none" stroke="#5a5540" stroke-width=".3"/>
    </g>

    <!-- İkmal Yolları — ince kesikli -->
    <g class="supply-routes" opacity=".08">
      <path d="M478 52 C465 68 452 88 440 108 C428 132 415 158 400 182
        C388 205 370 228 352 255 C338 278 325 305 312 340 C302 370 296 398 292 425"
        fill="none" stroke="#6a6040" stroke-width=".5" stroke-dasharray="6,4"/>
    </g>

  </g><!-- /layer-fortifications -->

  <!-- ═══ LAYER: SEA ═══ -->
  <g id="layer-sea">
    <g id="minefields" opacity=".7">
      ${mineLine(460, 340, 492, 358, 7)}
      ${mineLine(455, 355, 488, 372, 6)}
      ${mineLine(450, 370, 484, 386, 8)}
      ${mineLine(458, 383, 490, 398, 5)}
      ${mineLine(453, 395, 486, 410, 6)}
    </g>

    <!-- Kıyı Bataryaları — askeri sembol (kare+nokta) -->
    <g id="forts" opacity=".85">
      ${fort(405, 340, 'Kilitbahir')} ${fort(400, 365, 'Mecidiye')} ${fort(395, 385, 'Hamidiye')}
      ${fort(415, 310, 'Namazgah')} ${fort(498, 345, 'Cimenlik')} ${fort(495, 365, 'Mesudiye')}
      ${fort(345, 468, 'Ertugrul')} ${fort(502, 385, 'Dardanos')}
      ${fort(388, 398, 'R.Mecidiye')} ${fort(508, 405, 'A.Hamidiye')}
    </g>
  </g><!-- /layer-sea -->

  <!-- ═══ LAYER: ZONES ═══ -->
  <g id="layer-zones"></g>

  <!-- ═══ LAYER: ROUTES ═══ -->
  <g id="layer-routes"></g>

  <!-- ═══ LAYER: LABELS — hiyerarşik ═══ -->
  <g id="layer-labels">

    <!-- Lokasyonlar (battle-data'dan) -->
    <g id="locations">
      ${BATTLE_DATA.locations.map(l => {
        // Hiyerarşi belirle
        const primary = ['gelibolu', 'canakkale', 'eceabat', 'conkbayiri', 'anafartalar'].includes(l.id);
        const secondary = ['ariburnu', 'seddulbahir', 'kabatepe', 'kirte', 'kirectepe', 'kumkale', 'bigali', 'suvla'].includes(l.id);
        const fontSize = primary ? '8' : secondary ? '6' : '5';
        const fontWeight = primary ? '700' : secondary ? '600' : '400';
        const dotR = primary ? '2.5' : secondary ? '2' : '1.5';
        const opacity = primary ? '.85' : secondary ? '.65' : '.5';
        const fillColor = primary ? '#c0b898' : secondary ? '#a09880' : '#8a8068';
        const strokeW = primary ? '2' : '1.5';
        return `<g class="location-group" data-location-id="${l.id}">
          <circle cx="${l.x}" cy="${l.y}" r="${dotR}" class="location-dot" fill="#a09880" stroke="#6a6852" stroke-width=".6" opacity="${opacity}"/>
          <text x="${l.x + 5}" y="${l.y + 3}" class="location-label" fill="${fillColor}" font-size="${fontSize}" font-weight="${fontWeight}" opacity="${opacity}"
            paint-order="stroke" stroke="rgba(30,28,24,.7)" stroke-width="${strokeW}">${l.name}</text></g>`;
      }).join('')}
    </g>

    <!-- Naval sahne anotasyonları -->
    <g class="scene-annotation-group" data-scene-group="naval">
      <path class="scene-focus-line" d="M470 335 L500 300 L530 250" />
      <text x="505" y="286" class="scene-label">DARDANELLES NARROWS</text>
      <text x="500" y="402" class="scene-label scene-label-sub">MINEFIELD</text>
    </g>

    <!-- ANZAC sahne anotasyonları -->
    <g class="scene-annotation-group" data-scene-group="anzac">
      <path class="scene-ridge" d="M248 112 C270 150 285 188 300 220 C315 250 330 282 345 320" />
      <path class="scene-ridge" d="M275 92 C298 132 314 172 328 212" />
      <text x="188" y="232" class="scene-label">ANZAC COVE</text>
      <text x="334" y="176" class="scene-label">SARI BAIR</text>
      <text x="386" y="326" class="scene-label scene-label-sub">KILITBAHIR HEIGHTS</text>

      <!-- Taktik mevziler -->
      <g class="tactical-posts" opacity=".6">
        <g transform="translate(252,232)"><rect x="-1.5" y="-1.5" width="3" height="3" fill="none" stroke="#8a8068" stroke-width=".5" transform="rotate(45)"/>
          <text x="4" y="2" fill="#8a8068" font-family="var(--mono)" font-size="3" opacity=".7">The Nek</text></g>
        <g transform="translate(242,258)"><rect x="-1.5" y="-1.5" width="3" height="3" fill="none" stroke="#8a8068" stroke-width=".5" transform="rotate(45)"/>
          <text x="4" y="2" fill="#8a8068" font-family="var(--mono)" font-size="3" opacity=".7">Lone Pine</text></g>
        <g transform="translate(248,244)"><rect x="-1.5" y="-1.5" width="3" height="3" fill="none" stroke="#8a8068" stroke-width=".5" transform="rotate(45)"/>
          <text x="4" y="2" fill="#8a8068" font-family="var(--mono)" font-size="3" opacity=".6">Quinn's Post</text></g>
      </g>
    </g>

    <!-- Helles sahne anotasyonları -->
    <g class="scene-annotation-group" data-scene-group="helles">
      <text x="338" y="506" class="scene-label">V BEACH</text>
      <text x="298" y="520" class="scene-label">W BEACH</text>
      <text x="250" y="486" class="scene-label scene-label-sub">X BEACH</text>
      <text x="218" y="458" class="scene-label scene-label-sub">Y BEACH</text>
      <text x="364" y="450" class="scene-label scene-label-sub">S BEACH</text>
      <path class="scene-focus-line" d="M320 490 L302 448 L290 426" />
      <text x="246" y="418" class="scene-label scene-label-sub">KRITHIA</text>
      <text x="278" y="392" class="scene-label scene-label-sub">ACHI BABA</text>

      <!-- Çıkarma sahili göstergeleri — yarı saydam iniş şeridi -->
      <g class="beach-indicators" opacity=".3">
        <path d="M330 502 Q338 498 346 502" fill="none" stroke="#a09880" stroke-width="1" stroke-linecap="round"/>
        <path d="M290 512 Q298 508 306 512" fill="none" stroke="#a09880" stroke-width="1" stroke-linecap="round"/>
        <path d="M242 480 Q248 476 254 480" fill="none" stroke="#a09880" stroke-width=".8" stroke-linecap="round"/>
        <path d="M212 452 Q218 448 224 452" fill="none" stroke="#a09880" stroke-width=".8" stroke-linecap="round"/>
        <path d="M356 460 Q362 456 368 460" fill="none" stroke="#a09880" stroke-width=".8" stroke-linecap="round"/>
      </g>
    </g>
  </g><!-- /layer-labels -->

  <!-- ═══ LAYER: UNITS ═══ -->
  <g id="unitTokens" class="units-layer">${renderTokens(phase.id, currentPositions, currentPositions, currentPhaseIndex, currentPhaseIndex, phase.isoStart || '')}</g>

  <!-- ═══ LAYER: COMBAT FX ═══ -->
  <g id="layer-combat-fx">
    <g id="battleEffects" class="battle-effects"></g>
  </g>

  <!-- ═══ PUSULA — zarif, minimal ═══ -->
  <g transform="translate(672,50)" opacity=".35">
    <circle r="16" fill="rgba(30,28,24,.4)" stroke="#6a6040" stroke-width=".5"/>
    <circle r="11" fill="none" stroke="#6a6040" stroke-width=".25"/>
    <line x1="0" y1="-14" x2="0" y2="14" stroke="#6a6040" stroke-width=".3"/>
    <line x1="-14" y1="0" x2="14" y2="0" stroke="#6a6040" stroke-width=".3"/>
    <polygon points="0,-13 -2,-5 2,-5" fill="#8b3a3a" opacity=".8"/>
    <polygon points="0,13 -2,5 2,5" fill="#6a6040" opacity=".4"/>
    <circle r="1.5" fill="#8a7555"/>
    <text x="0" y="-17" text-anchor="middle" fill="#8a7555" font-family="var(--mono)" font-size="4.5" font-weight="600">N</text>
    <text x="18" y="1.5" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">E</text>
    <text x="0" y="21" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">S</text>
    <text x="-18" y="1.5" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">W</text>
  </g>

  <!-- ═══ ÖLÇEK — minimal ═══ -->
  <g transform="translate(575,538)" opacity=".3">
    <line x1="0" y1="0" x2="30" y2="0" stroke="#8a7555" stroke-width=".8"/>
    <line x1="30" y1="0" x2="60" y2="0" stroke="#6a6040" stroke-width=".8"/>
    <line x1="0" y1="-2" x2="0" y2="2" stroke="#8a7555" stroke-width=".6"/>
    <line x1="30" y1="-2" x2="30" y2="2" stroke="#6a6040" stroke-width=".5"/>
    <line x1="60" y1="-2" x2="60" y2="2" stroke="#6a6040" stroke-width=".6"/>
    <text x="15" y="-4" text-anchor="middle" fill="#8a7555" font-family="var(--mono)" font-size="3">5 km</text>
    <text x="45" y="-4" text-anchor="middle" fill="#6a6040" font-family="var(--mono)" font-size="3">10 km</text>
  </g>

  <!-- ═══ VIGNETTE — hafif ═══ -->
  <rect width="720" height="560" fill="url(#vignetteG)" pointer-events="none"/>
  <rect width="720" height="560" fill="url(#vignetteR)" pointer-events="none"/>

  <text x="15" y="548" fill="#6a6040" font-family="var(--mono)" font-size="5" opacity=".35"
    paint-order="stroke" stroke="rgba(25,22,18,.3)" stroke-width=".8">Canakkale 1915</text>
  <text x="705" y="555" text-anchor="end" fill="rgba(120,110,90,.25)" font-family="var(--mono)" font-size="3">Icons by Icons8</text>
  `;

    ctr.innerHTML = '';
    ctr.appendChild(svg);

    const dateChip = document.createElement('div');
    dateChip.className = 'map-date-chip';
    dateChip.id = 'mapDateChip';
    dateChip.innerHTML = `<span class="map-date-day" id="mapDateDay">—</span><span class="map-date-month" id="mapDateMonth">Tarih</span><span class="map-date-year" id="mapDateYear"></span>`;
    ctr.appendChild(dateChip);

    attachNarrationElements(ctr, phase);
    updateMapDateIndicator(phase.date);
    renderBattleEffects(currentPhaseIndex);
}

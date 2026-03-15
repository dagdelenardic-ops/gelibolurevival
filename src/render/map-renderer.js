// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Harita Renderer
// SVG harita oluşturma, coğrafi elemanlar, dekoratif katmanlar
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
        const o = (.45 + (i % 4) * .15).toFixed(2);
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        s += `<image href="assets/icons/naval-mine.png" x="${mx - 3}" y="${my - 3}" width="6" height="6" opacity="${o}"/>`;
    }
    return s;
}

/** Kıyı bataryası SVG helper */
function fort(x, y, name) {
    return `<g>
  <image href="assets/icons/old-war-bunker.png" x="${x - 6}" y="${y - 6}" width="12" height="12" opacity=".95"/>
  <text x="${x + 7}" y="${y + 2}" fill="#ff8a8a" font-family="var(--mono)" font-size="5.5" opacity="1" font-weight="bold" paint-order="stroke" stroke="rgba(0,0,0,.8)" stroke-width="1.5">${name}</text></g>`;
}

/** Ana SVG harita oluştur ve DOM'a ekle */
export function renderMap(currentPhaseIndex, currentPositions) {
    const ctr = document.querySelector('.map-container');
    const phase = BATTLE_DATA.phases[currentPhaseIndex];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 720 560');
    svg.setAttribute('id', 'battleMap');
    svg.innerHTML = `
  <defs>
    <!-- ═══ GRADIENTS ═══ -->
    <linearGradient id="seaG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1e2e"/><stop offset="30%" stop-color="#102a3c"/><stop offset="60%" stop-color="#163448"/><stop offset="100%" stop-color="#0a1a28"/></linearGradient>
    <radialGradient id="seaDepthG" cx="65%" cy="55%" r="55%">
      <stop offset="0%" stop-color="#1a3c52" stop-opacity=".5"/><stop offset="100%" stop-color="#061420" stop-opacity=".3"/></radialGradient>
    <linearGradient id="seaSheen" x1="0%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#1e5070" stop-opacity=".12"/><stop offset="100%" stop-color="transparent"/></linearGradient>
    <linearGradient id="landG" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#556838"/><stop offset="30%" stop-color="#4a5a30"/><stop offset="70%" stop-color="#3e4e28"/><stop offset="100%" stop-color="#2e3a1e"/></linearGradient>
    <linearGradient id="landG2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#404c2c"/><stop offset="100%" stop-color="#2a321c"/></linearGradient>
    <radialGradient id="hillShade" cx="35%" cy="30%"><stop offset="0%" stop-color="#7a8a55" stop-opacity=".2"/><stop offset="100%" stop-color="#313b22" stop-opacity="0"/></radialGradient>
    <linearGradient id="landEdgeG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#556838" stop-opacity=".6"/><stop offset="100%" stop-color="#2a321c" stop-opacity=".2"/></linearGradient>
    <radialGradient id="coastGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e5a72" stop-opacity=".15"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    <linearGradient id="vignetteG" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity=".3"/><stop offset="10%" stop-color="#000" stop-opacity="0"/>
      <stop offset="90%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".35"/></linearGradient>
    <radialGradient id="vignetteR" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="transparent"/><stop offset="100%" stop-color="#000" stop-opacity=".25"/></radialGradient>

    <!-- ═══ FILTERS ═══ -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
    <filter id="glowStrong" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
    <filter id="terrainTex">
      <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="5" seed="5" result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="soft-light" result="textured"/>
      <feComposite in="textured" in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="waterFx" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="turbulence" baseFrequency=".008,.012" numOctaves="3" seed="8" result="waveN"/>
      <feDisplacementMap in="SourceGraphic" in2="waveN" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
      <feGaussianBlur in="displaced" stdDeviation=".4" result="softWater"/>
      <feComposite in="softWater" in2="SourceGraphic" operator="atop"/>
    </filter>
    <filter id="terrainRelief" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="4" seed="12" result="noise"/>
      <feDiffuseLighting in="noise" lighting-color="#fffde8" surfaceScale="1.5" diffuseConstant=".7" result="light">
        <feDistantLight azimuth="315" elevation="35"/>
      </feDiffuseLighting>
      <feComposite in="light" in2="SourceGraphic" operator="in" result="litTerrain"/>
      <feBlend in="SourceGraphic" in2="litTerrain" mode="soft-light"/>
    </filter>
    <filter id="innerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
      <feOffset dx="1" dy="2" result="offsetBlur"/>
      <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
    </filter>
    <filter id="coastBlur">
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>

    <!-- ═══ PATTERNS ═══ -->
    <pattern id="wave" width="50" height="14" patternUnits="userSpaceOnUse">
      <path d="M0 7 Q12 2 25 7 Q38 12 50 7" fill="none" stroke="#1a4560" stroke-width=".5" opacity=".5"/>
      <path d="M0 11 Q12 6 25 11 Q38 16 50 11" fill="none" stroke="#14384e" stroke-width=".3" opacity=".25"/>
    </pattern>
    <pattern id="waveAnim" width="60" height="16" patternUnits="userSpaceOnUse">
      <path d="M0 8 Q15 3 30 8 Q45 13 60 8" fill="none" stroke="#1e5a72" stroke-width=".4" opacity=".35">
        <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="60 0" dur="8s" repeatCount="indefinite"/>
      </path>
    </pattern>
    <pattern id="hachure" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#5a7038" stroke-width=".6" opacity=".35"/></pattern>
    <pattern id="cliffHatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
      <line x1="0" y1="0" x2="0" y2="4" stroke="#4a5a32" stroke-width=".7" opacity=".25"/></pattern>
    <pattern id="sandTex" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="3" r=".3" fill="#c8b878" opacity=".15"/>
      <circle cx="5" cy="1" r=".2" fill="#c8b878" opacity=".1"/>
      <circle cx="7" cy="6" r=".25" fill="#c8b878" opacity=".12"/>
    </pattern>

    <!-- ═══ CLIP PATHS ═══ -->
    <clipPath id="mapClip"><rect width="720" height="560" rx="4"/></clipPath>
  </defs>

  <!-- ═══ LAYER: TERRAIN ═══ -->
  <g id="layer-terrain" clip-path="url(#mapClip)">

  <!-- DENİZ — çok katmanlı derinlik -->
  <rect width="720" height="560" fill="url(#seaG)"/>
  <rect width="720" height="560" fill="url(#seaDepthG)"/>
  <rect width="720" height="560" fill="url(#seaSheen)"/>
  <rect width="720" height="560" fill="url(#wave)" opacity=".45"/>
  <rect width="720" height="560" fill="url(#waveAnim)" opacity=".2"/>

  <!-- Deniz yüzey ışıltısı (caustics efekti) -->
  <g class="sea-caustics" opacity=".06" filter="url(#waterFx)">
    <ellipse cx="120" cy="380" rx="80" ry="50" fill="#2a7a9a"/>
    <ellipse cx="350" cy="520" rx="60" ry="35" fill="#1e6a8a"/>
    <ellipse cx="600" cy="480" rx="70" ry="40" fill="#2a7090"/>
  </g>

  <!-- Deniz derinlik bantları -->
  <g class="depth-contours" opacity=".2">
    <!-- Boğaz derin kanal -->
    <path d="M465 320 C470 340 472 360 470 380 C468 400 465 420 460 440"
      fill="none" stroke="#0a4060" stroke-width="1.2" stroke-dasharray="8,6"/>
    <!-- Ege açık deniz -->
    <path d="M30 350 C80 360 140 370 200 385 C260 400 300 420 340 450"
      fill="none" stroke="#0a4060" stroke-width=".8" stroke-dasharray="12,8"/>
    <!-- Marmara girişi -->
    <path d="M520 180 C540 195 560 210 580 225"
      fill="none" stroke="#0a4060" stroke-width=".8" stroke-dasharray="8,6"/>
  </g>

  <!-- Boğaz akıntı yönü okları -->
  <g class="current-arrows" opacity=".22">
    <path d="M470 300 L468 310" fill="none" stroke="#3a7a9a" stroke-width=".6" marker-end="url(#arrowCurrent)"/>
    <path d="M475 340 L473 350" fill="none" stroke="#3a7a9a" stroke-width=".6"/>
    <path d="M472 370 L470 380" fill="none" stroke="#3a7a9a" stroke-width=".6"/>
    <text x="478" y="355" fill="#3a7a9a" font-family="var(--mono)" font-size="2.8" font-style="italic">akıntı ↓</text>
  </g>

  <!-- TRAKYA -->
  <path d="M 0 0 L 530 0 L 525 18 C 490 22,440 18,400 15 C 350 12,310 14,280 20
    C 245 28,210 30,175 40 C 130 55,80 65,35 72 L 0 82 Z"
    fill="url(#landG2)" stroke="#4a5a30" stroke-width="1.2" opacity=".7" filter="url(#terrainRelief)"/>
  <text x="30" y="32" fill="#e0d0a0" font-family="var(--mono)" font-size="14" font-weight="700" opacity=".85" letter-spacing="3"
    paint-order="stroke" stroke="rgba(0,0,0,.6)" stroke-width="2">TRAKYA</text>

  <!-- ═══ GÖKÇEADA ═══ -->
  <!-- Ada çevresi kıyı parıltısı -->
  <ellipse cx="90" cy="290" rx="52" ry="28" fill="url(#coastGlow)" opacity=".5"/>
  <path d="M 50 285 C 60 272,85 268,105 272 C 125 276,135 285,132 296 C 128 306,108 312,88 310 C 65 306,45 298,50 285 Z"
    fill="url(#landG2)" stroke="#4a5a30" stroke-width="1" opacity=".65" filter="url(#terrainRelief)"/>
  <text x="68" y="295" fill="#e0d0a0" font-family="var(--mono)" font-size="10" font-weight="700" opacity=".85"
    paint-order="stroke" stroke="rgba(0,0,0,.6)" stroke-width="2">Gökçeada</text>

  <!-- ═══ GELİBOLU YARIMADASI ═══ -->
  <!-- Kıyı parıltısı (sahil kenarı derinlik geçişi) -->
  <path d="
    M 525 18
    C 510 28, 498 32, 485 38 C 470 42, 458 48, 450 58 C 442 68, 438 80, 435 95
    C 432 110, 430 130, 426 150 C 422 170, 418 185, 416 200 C 415 220, 416 240, 420 260
    C 422 280, 422 300, 416 318 C 410 335, 402 352, 396 370 C 390 388, 382 408, 372 428
    C 362 448, 350 465, 340 480 C 335 492, 325 502, 312 508 C 300 512, 290 506, 282 496
    C 274 480, 266 458, 258 436 C 250 414, 244 394, 238 374 C 232 354, 228 336, 224 318
    C 220 300, 218 284, 216 268 C 214 252, 215 238, 220 226 C 224 216, 226 206, 224 196
    C 222 186, 222 176, 226 166 C 230 156, 234 146, 238 136 C 242 126, 246 116, 248 106
    C 250 92, 255 80, 265 70 C 280 56, 300 44, 330 32 C 370 20, 420 16, 480 14
    L 525 18 Z
  " fill="#1a3848" stroke="none" opacity=".3" filter="url(#coastBlur)" transform="translate(2,2)"/>
  <!-- Ana yarımada -->
  <path d="
    M 525 18
    C 510 28, 498 32, 485 38 C 470 42, 458 48, 450 58 C 442 68, 438 80, 435 95
    C 432 110, 430 130, 426 150 C 422 170, 418 185, 416 200 C 415 220, 416 240, 420 260
    C 422 280, 422 300, 416 318 C 410 335, 402 352, 396 370 C 390 388, 382 408, 372 428
    C 362 448, 350 465, 340 480 C 335 492, 325 502, 312 508 C 300 512, 290 506, 282 496
    C 274 480, 266 458, 258 436 C 250 414, 244 394, 238 374 C 232 354, 228 336, 224 318
    C 220 300, 218 284, 216 268 C 214 252, 215 238, 220 226 C 224 216, 226 206, 224 196
    C 222 186, 222 176, 226 166 C 230 156, 234 146, 238 136 C 242 126, 246 116, 248 106
    C 250 92, 255 80, 265 70 C 280 56, 300 44, 330 32 C 370 20, 420 16, 480 14
    L 525 18 Z
  " fill="url(#landG)" stroke="#5a6e3c" stroke-width="1.5" opacity=".95" filter="url(#terrainRelief)"/>

  <!-- SUVLA KOYU -->
  <path d="M 248 106 C 252 112, 254 120, 250 128
    C 246 136, 240 140, 236 136 C 230 130, 234 122, 240 114
    C 244 108, 248 106, 248 106 Z"
    fill="url(#seaG)" stroke="#1e3a4a" stroke-width=".6" opacity=".85"/>

  <!-- ANZAC KOYU -->
  <path d="M 218 238 C 222 244, 226 250, 224 256
    C 222 262, 218 264, 214 260 C 210 254, 210 246, 214 240
    C 216 236, 218 236, 218 238 Z"
    fill="url(#seaG)" stroke="#1e3a4a" stroke-width=".5" opacity=".85"/>

  <!-- ═══ TOPOGRAFİK KATMAN ═══ -->
  <path d="M 525 18 C 510 28, 498 32, 485 38 C 470 42, 458 48, 450 58 C 442 68, 438 80, 435 95
    C 432 110, 430 130, 426 150 C 422 170, 418 185, 416 200 C 415 220, 416 240, 420 260
    C 422 280, 422 300, 416 318 C 410 335, 402 352, 396 370 C 390 388, 382 408, 372 428
    C 362 448, 350 465, 340 480 C 335 492, 325 502, 312 508 C 300 512, 290 506, 282 496
    C 274 480, 266 458, 258 436 C 250 414, 244 394, 238 374 C 232 354, 228 336, 224 318
    C 220 300, 218 284, 216 268 C 214 252, 215 238, 220 226 C 224 216, 226 206, 224 196
    C 222 186, 222 176, 226 166 C 230 156, 234 146, 238 136 C 242 126, 246 116, 248 106
    C 250 92, 255 80, 265 70 C 280 56, 300 44, 330 32 C 370 20, 420 16, 480 14 L 525 18 Z"
    fill="url(#hachure)" opacity=".2" pointer-events="none"/>

  <!-- Ana sırt hattı -->
  <path d="M 470 45 C 450 72 440 105 435 135 C 430 165 425 195 420 225
    C 418 248 415 270 410 295 C 404 320 395 345 385 370
    C 372 400 355 425 340 450 C 325 470 315 485 305 498"
    fill="none" stroke="#7a8a55" stroke-width="1.2" opacity=".35" stroke-dasharray="8,4"/>

  <!-- İkincil sırt hatları -->
  <path d="M 445 80 C 438 115 432 148 428 180 C 424 210 420 240 415 268"
    fill="none" stroke="#5d6e3a" stroke-width=".6" opacity=".2" stroke-dasharray="4,5"/>
  <path d="M 250 120 C 246 155 240 190 236 225 C 232 260 236 295 245 330 C 255 365 268 400 278 435"
    fill="none" stroke="#5d6e3a" stroke-width=".6" opacity=".2" stroke-dasharray="4,5"/>
  <path d="M 400 290 C 385 325 368 360 352 395 C 340 420 328 445 318 470"
    fill="none" stroke="#5d6e3a" stroke-width=".5" opacity=".18" stroke-dasharray="3,5"/>

  <!-- Conkbayırı tepesi -->
  <g opacity=".6" stroke="#8a9a5a" stroke-width=".7">
    <line x1="320" y1="218" x2="315" y2="210"/><line x1="324" y1="219" x2="327" y2="211"/>
    <line x1="316" y1="222" x2="309" y2="218"/><line x1="326" y1="224" x2="332" y2="218"/>
    <line x1="318" y1="228" x2="312" y2="232"/><line x1="324" y1="228" x2="330" y2="232"/>
    <line x1="320" y1="218" x2="320" y2="210"/>
  </g>
  <circle cx="320" cy="223" r="3" fill="#9fb074" opacity=".6"/>
  <text x="308" y="238" fill="#c8e090" font-family="var(--mono)" font-size="7" font-weight="700" opacity=".85" paint-order="stroke" stroke="#1a1a1a" stroke-width="2">261m</text>

  <!-- Kocaçimen Tepe -->
  <g opacity=".5" stroke="#8a9a5a" stroke-width=".6">
    <line x1="430" y1="100" x2="425" y2="92"/><line x1="434" y1="101" x2="437" y2="93"/>
    <line x1="427" y1="104" x2="421" y2="100"/><line x1="436" y1="104" x2="441" y2="99"/>
    <line x1="431" y1="100" x2="431" y2="91"/>
  </g>
  <circle cx="431" cy="100" r="3" fill="#9fb074" opacity=".5"/>
  <text x="440" y="98" fill="#c8e090" font-family="var(--mono)" font-size="7" font-weight="700" opacity=".85" paint-order="stroke" stroke="#1a1a1a" stroke-width="2">305m</text>

  <!-- Alçıtepe (Achi Baba) -->
  <g opacity=".35" stroke="#6a7a4a" stroke-width=".6">
    <line x1="305" y1="402" x2="300" y2="393"/><line x1="309" y1="403" x2="312" y2="394"/>
    <line x1="301" y1="405" x2="294" y2="400"/><line x1="312" y1="406" x2="318" y2="400"/>
    <line x1="305" y1="402" x2="305" y2="392"/><line x1="298" y1="410" x2="292" y2="412"/>
    <line x1="314" y1="410" x2="320" y2="413"/>
  </g>
  <circle cx="305" cy="406" r="3" fill="#9fb074" opacity=".5"/>
  <text x="290" y="420" fill="#c8e090" font-family="var(--mono)" font-size="7" font-weight="700" opacity=".85" paint-order="stroke" stroke="#1a1a1a" stroke-width="2">218m</text>

  <!-- Kireçtepe -->
  <g opacity=".22" stroke="#6a7a4a" stroke-width=".4">
    <line x1="265" y1="82" x2="261" y2="76"/><line x1="269" y1="83" x2="272" y2="77"/>
    <line x1="265" y1="82" x2="265" y2="74"/>
  </g>

  <!-- Kilitbahir Platosu -->
  <ellipse cx="380" cy="345" rx="35" ry="28" fill="url(#hillShade)" stroke="#566a36"
    stroke-width=".8" opacity=".3" stroke-dasharray="3,2"/>
  <text x="358" y="350" fill="#8a9a5a" font-family="var(--mono)" font-size="5.5" opacity=".6" font-style="italic">Kilitbahir Plt.</text>

  <!-- Yükseklik bandı -->
  <path d="M 435 95 C 430 130 426 165 420 200 C 418 230 420 260 415 290
    C 408 320 398 350 385 380 C 372 405 355 435 340 460"
    fill="none" stroke="#8a9a5a" stroke-width="3" opacity=".08"/>

  <!-- Tuz Gölü -->
  <ellipse cx="252" cy="118" rx="12" ry="7" fill="#1a3040" stroke="#2a5060" stroke-width=".5" opacity=".5"/>
  <text x="245" y="122" fill="#2a5060" font-family="var(--mono)" font-size="4" opacity=".45">tuz gölü</text>

  <!-- ═══ ASYA YAKASI ═══ -->
  <!-- Kıyı gölgesi -->
  <path d="
    M 530 190 C 535 210, 530 230, 522 255 L 515 280
    C 508 300, 502 320, 498 340 L 495 365
    C 492 385, 490 400, 488 418 L 485 440
    C 480 462, 472 478, 460 492 C 450 505, 445 515, 448 525
    C 455 535, 475 540, 510 542 L 720 540
    L 720 560 L 440 560
    C 430 548, 425 535, 430 520 C 435 505, 442 492, 450 478
    C 458 462, 462 445, 465 425 L 470 400
    C 475 378, 478 358, 480 338 L 482 310
    C 485 288, 492 268, 500 250 L 510 225
    C 518 210, 525 198, 530 190 Z
  " fill="#1a3848" stroke="none" opacity=".25" filter="url(#coastBlur)" transform="translate(-2,2)"/>
  <path d="
    M 530 190 C 535 210, 530 230, 522 255 L 515 280
    C 508 300, 502 320, 498 340 L 495 365
    C 492 385, 490 400, 488 418 L 485 440
    C 480 462, 472 478, 460 492 C 450 505, 445 515, 448 525
    C 455 535, 475 540, 510 542 L 720 540
    L 720 560 L 440 560
    C 430 548, 425 535, 430 520 C 435 505, 442 492, 450 478
    C 458 462, 462 445, 465 425 L 470 400
    C 475 378, 478 358, 480 338 L 482 310
    C 485 288, 492 268, 500 250 L 510 225
    C 518 210, 525 198, 530 190 Z
  " fill="url(#landG2)" stroke="#4a5a30" stroke-width="1.2" opacity=".75" filter="url(#terrainRelief)"/>
  <path d="M 530 420 C 570 418 620 425 680 435"
    fill="none" stroke="#3a4528" stroke-width=".5" opacity=".2" stroke-dasharray="3,4"/>

  <!-- ═══ SU ETİKETLERİ ═══ -->
  <text x="460" y="270" fill="#5a8aa0" font-family="var(--mono)" font-size="9" font-weight="700"
    opacity=".6" transform="rotate(-72,460,270)" letter-spacing="4">ÇANAKKALE BOĞAZI</text>
  <text x="55" y="420" fill="#3a6a8a" font-family="var(--mono)" font-size="11" font-weight="700"
    opacity=".45" letter-spacing="5">EGE DENİZİ</text>
  <text x="520" y="100" fill="#3a6a8a" font-family="var(--mono)" font-size="9" font-weight="700"
    opacity=".4" letter-spacing="4">MARMARA DENİZİ</text>
  <text x="155" y="115" fill="#3a6a8a" font-family="var(--mono)" font-size="8" font-weight="700"
    opacity=".5" letter-spacing="3" transform="rotate(-12,155,115)">SAROS KÖRFEZİ</text>

  <!-- ═══ EK TOPOGRAFİK DETAY ═══ -->

  <!-- Kontur çizgileri (ek yükseklik bantları) -->
  <g class="contour-lines" opacity=".22">
    <!-- ANZAC sektörü alçak kontur (~50m) - sahilden ilk yükselme -->
    <path d="M228 222 C226 232 224 242 220 258 C218 272 216 286 216 300"
      fill="none" stroke="#5d6e3a" stroke-width=".4" stroke-dasharray="2,3"/>
    <!-- ANZAC sektörü orta kontur (~150m) - çatışma hattı gerisi -->
    <path d="M244 215 C248 228 252 242 258 256 C264 270 268 280 272 290"
      fill="none" stroke="#5d6e3a" stroke-width=".4" stroke-dasharray="2,3"/>
    <!-- Sarıbayır sırtı konturu (~200m) - Conkbayırı'ndan Kocaçimen'e -->
    <path d="M308 218 C325 205 345 185 365 168 C385 152 400 138 415 122 C422 114 428 108 431 102"
      fill="none" stroke="#5d6e3a" stroke-width=".5" stroke-dasharray="2,3"/>
    <!-- Kirte/Alçıtepe güney yamaç konturu (~100m) -->
    <path d="M272 432 C285 425 298 420 310 418 C322 420 335 428 345 440"
      fill="none" stroke="#5d6e3a" stroke-width=".4" stroke-dasharray="2,3"/>
    <!-- Alçıtepe üst kontur (~180m) -->
    <path d="M278 420 C292 414 305 410 318 414 C326 418 332 424 336 430"
      fill="none" stroke="#5d6e3a" stroke-width=".35" stroke-dasharray="2,3"/>
    <!-- Kuzey yarımada konturu - Suvla ova kenarı (~50m) -->
    <path d="M238 112 C248 106 258 100 268 94 C275 90 282 86 288 84"
      fill="none" stroke="#5d6e3a" stroke-width=".35" stroke-dasharray="2,3"/>
  </g>

  <!-- Ek tepe noktaları -->
  <!-- Battleship Hill (220m) -->
  <g opacity=".5" stroke="#8a9a5a" stroke-width=".6">
    <line x1="295" y1="210" x2="291" y2="203"/><line x1="299" y1="211" x2="302" y2="204"/>
    <line x1="291" y1="213" x2="285" y2="210"/><line x1="300" y1="214" x2="306" y2="210"/>
    <line x1="295" y1="210" x2="295" y2="202"/>
  </g>
  <circle cx="295" cy="210" r="2.5" fill="#9fb074" opacity=".5"/>
  <text x="280" y="224" fill="#c8e090" font-family="var(--mono)" font-size="5.5" font-weight="700" opacity=".75" paint-order="stroke" stroke="#1a1a1a" stroke-width="1.5">220m</text>

  <!-- Baby 700 (210m) -->
  <g opacity=".2" stroke="#6a7a4a" stroke-width=".4">
    <line x1="268" y1="242" x2="265" y2="236"/><line x1="272" y1="243" x2="275" y2="237"/>
    <line x1="265" y1="245" x2="260" y2="242"/><line x1="268" y1="242" x2="268" y2="234"/>
  </g>
  <circle cx="268" cy="242" r="1.5" fill="#7a8a55" opacity=".2"/>
  <text x="254" y="254" fill="#9fb074" font-family="var(--mono)" font-size="3.5" opacity=".45">210m</text>

  <!-- Hill 60 (Suvla yakını) -->
  <g opacity=".2" stroke="#6a7a4a" stroke-width=".4">
    <line x1="258" y1="158" x2="255" y2="152"/><line x1="262" y1="159" x2="265" y2="153"/>
    <line x1="255" y1="161" x2="250" y2="158"/><line x1="258" y1="158" x2="258" y2="150"/>
  </g>
  <circle cx="258" cy="158" r="1.5" fill="#7a8a55" opacity=".2"/>
  <text x="244" y="170" fill="#9fb074" font-family="var(--mono)" font-size="3.5" opacity=".4">60m</text>

  <!-- Chocolate Hill (Suvla) -->
  <g opacity=".2" stroke="#6a7a4a" stroke-width=".4">
    <line x1="272" y1="148" x2="269" y2="142"/><line x1="276" y1="149" x2="279" y2="143"/>
    <line x1="269" y1="151" x2="264" y2="148"/><line x1="272" y1="148" x2="272" y2="140"/>
  </g>
  <circle cx="272" cy="148" r="1.5" fill="#7a8a55" opacity=".2"/>
  <text x="258" y="162" fill="#9fb074" font-family="var(--mono)" font-size="3.5" opacity=".4">48m</text>

  <!-- Vadi/Dere göstergeleri (ANZAC arazisinin derin vadileri) -->
  <g class="ravines" opacity=".18">
    <!-- Shrapnel Deresi -->
    <path d="M232 228 C238 232 244 238 252 246" fill="none" stroke="#3a4a28" stroke-width=".5" stroke-dasharray="1.5,2"/>
    <text x="234" y="226" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic" opacity=".6">Shrapnel G.</text>
    <!-- Monash Vadisi -->
    <path d="M242 238 C248 244 254 250 262 258" fill="none" stroke="#3a4a28" stroke-width=".5" stroke-dasharray="1.5,2"/>
    <text x="250" y="236" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic" opacity=".5">Monash V.</text>
    <!-- Wire Gully -->
    <path d="M248 230 C252 234 258 238 262 242" fill="none" stroke="#3a4a28" stroke-width=".4" stroke-dasharray="1.5,2"/>
    <!-- Legge Valley -->
    <path d="M226 272 C232 278 238 282 244 286" fill="none" stroke="#3a4a28" stroke-width=".4" stroke-dasharray="1.5,2"/>
  </g>

  <!-- Batı kıyısı uçurum işaretleri (Ege'ye bakan sarp falezler) -->
  <g class="cliff-marks" opacity=".18">
    <line x1="220" y1="310" x2="214" y2="308" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="222" y1="330" x2="216" y2="327" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="226" y1="350" x2="220" y2="347" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="230" y1="370" x2="224" y2="367" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="234" y1="390" x2="228" y2="387" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="240" y1="410" x2="234" y2="407" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="248" y1="430" x2="242" y2="427" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="256" y1="450" x2="250" y2="447" stroke="#4a5a32" stroke-width=".6"/>
    <line x1="264" y1="468" x2="258" y2="465" stroke="#4a5a32" stroke-width=".6"/>
  </g>

  <!-- Sarıbayır sırt yükseklik bandı (ek) -->
  <path d="M310 220 C330 205 355 180 375 162 C395 145 415 125 430 105"
    fill="none" stroke="#8a9a5a" stroke-width="3.5" opacity=".05"/>

  <!-- Coğrafi detay noktaları -->
  <text x="208" y="320" fill="#a0b070" font-family="var(--mono)" font-size="5" font-style="italic" opacity=".65">Gaba Tepe</text>
  <text x="228" y="96" fill="#a0b070" font-family="var(--mono)" font-size="5" font-style="italic" opacity=".65">Suvla Pt.</text>

  <!-- ═══ EK COĞRAFİ DETAYLAR ═══ -->

  <!-- Sahil kenarı dalga çizgileri (kıyı şeridi efekti) -->
  <g class="coastal-waves" opacity=".12">
    <!-- Batı kıyısı (Ege) -->
    <path d="M216 268 C214 280 212 295 214 310 C216 325 220 340 224 355"
      fill="none" stroke="#4a8aaa" stroke-width=".4" stroke-dasharray="2,4"/>
    <path d="M224 355 C228 370 232 385 238 400 C244 415 250 430 258 445"
      fill="none" stroke="#4a8aaa" stroke-width=".4" stroke-dasharray="2,4"/>
    <!-- Güney kıyısı (Seddülbahir burnu) -->
    <path d="M282 498 C290 502 300 506 312 510 C324 508 334 502 340 496"
      fill="none" stroke="#4a8aaa" stroke-width=".4" stroke-dasharray="2,4"/>
    <!-- Boğaz doğu kıyısı (Asya) -->
    <path d="M530 192 C528 210 524 230 518 255 C512 275 506 295 500 315"
      fill="none" stroke="#4a8aaa" stroke-width=".4" stroke-dasharray="2,4"/>
  </g>

  <!-- Ek burun/koy isimleri -->
  <g class="coastal-names" opacity=".6">
    <text x="198" y="260" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Ari Burnu</text>
    <text x="270" y="500" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Tekke Burnu</text>
    <text x="345" y="490" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Helles Burnu</text>
    <text x="240" y="140" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Nibrunesi Pt.</text>
    <text x="350" y="470" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Morto Koyu</text>
    <text x="500" y="240" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Kepez Br.</text>
    <text x="450" y="428" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Erenköy</text>
  </g>

  <!-- Suvla Ovası detayı -->
  <g class="suvla-detail" opacity=".2">
    <ellipse cx="255" cy="125" rx="18" ry="10" fill="#2a3a1a" stroke="#4a5a32" stroke-width=".4" stroke-dasharray="2,2"/>
    <text x="242" y="132" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">Suvla Ovası</text>
  </g>

  <!-- Yarımada batı kıyısı kum/kayalık göstergesi -->
  <g class="beach-marks" opacity=".15">
    <path d="M216 240 C212 242 210 244" fill="none" stroke="#c8b888" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M286 492 C292 496 298 498" fill="none" stroke="#c8b888" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M310 510 C318 512 325 510" fill="none" stroke="#c8b888" stroke-width="1.2" stroke-linecap="round"/>
  </g>

  <!-- Asya yakası ek detay -->
  <g class="asia-detail" opacity=".6">
    <text x="520" y="440" fill="#5d6e3a" font-family="var(--mono)" font-size="4" font-style="italic">Çanakkale Şehri</text>
    <text x="480" y="510" fill="#5d6e3a" font-family="var(--mono)" font-size="3.5" font-style="italic">Yeniköy</text>
    <text x="450" y="478" fill="#5d6e3a" font-family="var(--mono)" font-size="3" font-style="italic">İntepe</text>
  </g>

  <!-- Kilometre referans noktaları (mesafe algısı) -->
  <g class="distance-refs" opacity=".18">
    <line x1="220" y1="248" x2="305" y2="406" stroke="#6a6040" stroke-width=".3" stroke-dasharray="1,6"/>
    <text x="260" y="330" fill="#6a6040" font-family="var(--mono)" font-size="3" transform="rotate(-58,260,330)">~22 km</text>
  </g>

  </g><!-- /layer-terrain -->

  <!-- ═══ LAYER: FORTIFICATIONS (Mevziler, Siperler, İkmal Yolları) ═══ -->
  <g id="layer-fortifications">

    <!-- ── Osmanlı Siper Hatları ── -->
    <g class="trench-system" opacity=".3">
      <!-- Arıburnu Osmanlı birinci hattı (cephe hattının ~12px doğusu) -->
      <path d="M240 218 C245 225 250 235 255 248 C260 260 265 270 270 280"
        fill="none" stroke="#8a5a3a" stroke-width=".7" stroke-dasharray="3,1.5,1,1.5"/>
      <!-- Arıburnu Osmanlı ikinci hattı (destek hattı) -->
      <path d="M250 212 C256 222 262 234 268 248 C274 262 278 274 282 286"
        fill="none" stroke="#8a5a3a" stroke-width=".5" stroke-dasharray="2,2,1,2"/>

      <!-- Seddülbahir Osmanlı birinci savunma hattı (Alçıtepe önü) -->
      <path d="M272 438 C282 432 292 427 305 424 C318 424 328 428 338 435"
        fill="none" stroke="#8a5a3a" stroke-width=".7" stroke-dasharray="3,1.5,1,1.5"/>
      <!-- Seddülbahir Osmanlı ikinci savunma hattı -->
      <path d="M278 430 C288 425 298 420 310 418 C322 418 332 422 340 428"
        fill="none" stroke="#8a5a3a" stroke-width=".5" stroke-dasharray="2,2,1,2"/>
      <!-- Seddülbahir Osmanlı üçüncü hattı (Alçıtepe'ye yakın) -->
      <path d="M282 418 C292 414 305 410 318 412 C328 416 335 420 340 425"
        fill="none" stroke="#8a5a3a" stroke-width=".4" stroke-dasharray="2,3"/>

      <!-- Anafartalar Osmanlı siperleri -->
      <path d="M260 138 C272 145 286 155 302 166 C314 174 325 180 335 186"
        fill="none" stroke="#8a5a3a" stroke-width=".5" stroke-dasharray="2,2,1,2"/>
    </g>

    <!-- ── İtilaf Siper Hatları ── -->
    <g class="trench-system" opacity=".26">
      <!-- ANZAC çevresi (cephe hattının ~10px batısı) -->
      <path d="M218 230 C222 238 228 250 234 262 C240 274 245 282 250 292"
        fill="none" stroke="#3a6a8a" stroke-width=".6" stroke-dasharray="3,1.5,1,1.5"/>
      <!-- ANZAC ikinci hattı (sahile yakın) -->
      <path d="M214 236 C218 244 222 256 226 268 C230 280 234 288 238 298"
        fill="none" stroke="#3a6a8a" stroke-width=".4" stroke-dasharray="2,3"/>

      <!-- Helles İtilaf hattı (Seddülbahir cephe güneyinde) -->
      <path d="M258 452 C270 444 282 438 298 434 C312 434 324 438 336 446"
        fill="none" stroke="#3a6a8a" stroke-width=".6" stroke-dasharray="3,1.5,1,1.5"/>
    </g>

    <!-- ── İrtibat Siperleri (communication trenches) ── -->
    <g class="comm-trenches" opacity=".18">
      <!-- Osmanlı: Arıburnu cephesinden Conkbayırı'na -->
      <path d="M268 272 C278 262 288 252 298 242 C306 235 312 230 318 226"
        fill="none" stroke="#7a6a4a" stroke-width=".4" stroke-dasharray="2,3"/>
      <!-- Osmanlı: Seddülbahir cephesinden Alçıtepe'ye -->
      <path d="M310 420 C310 412 308 405 306 398"
        fill="none" stroke="#7a6a4a" stroke-width=".4" stroke-dasharray="2,3"/>
      <!-- ANZAC: Sahilden cepheye -->
      <path d="M218 252 C222 248 226 242 232 236 C236 232 240 228 244 225"
        fill="none" stroke="#4a6a7a" stroke-width=".35" stroke-dasharray="2,3"/>
    </g>

    <!-- ── Tel Örgü Göstergeleri ── -->
    <g class="wire-entanglements" opacity=".1">
      <!-- ANZAC sektörü -->
      <path d="M232 232 L234 230 L236 234 L238 230 L240 234" fill="none" stroke="#7a6a4a" stroke-width=".4"/>
      <path d="M236 248 L238 246 L240 250 L242 246 L244 250" fill="none" stroke="#7a6a4a" stroke-width=".4"/>
      <path d="M242 262 L244 260 L246 264 L248 260 L250 264" fill="none" stroke="#7a6a4a" stroke-width=".4"/>
      <!-- Helles sektörü -->
      <path d="M272 442 L274 440 L276 444 L278 440 L280 444" fill="none" stroke="#7a6a4a" stroke-width=".4"/>
      <path d="M296 432 L298 430 L300 434 L302 430 L304 434" fill="none" stroke="#7a6a4a" stroke-width=".4"/>
      <path d="M318 428 L320 426 L322 430 L324 426 L326 430" fill="none" stroke="#7a6a4a" stroke-width=".4"/>
    </g>

    <!-- ── İkmal/Ulaşım Yolları ── -->
    <g class="supply-routes" opacity=".12">
      <!-- Osmanlı ana ikmal yolu: Gelibolu → Bigalı → cephelere -->
      <path d="M478 52 C465 68 452 88 440 108 C428 132 415 158 400 182
        C388 205 370 228 352 255 C338 278 325 305 312 340 C302 370 296 398 292 425"
        fill="none" stroke="#8a7535" stroke-width=".6" stroke-dasharray="6,4"/>
      <!-- ANZAC sahil ikmal hattı -->
      <path d="M215 252 C218 248 222 244 228 238 C232 234 236 230 240 226"
        fill="none" stroke="#4a7a8a" stroke-width=".5" stroke-dasharray="4,4"/>
      <!-- Helles sahil ikmal hattı -->
      <path d="M320 488 C318 475 315 462 310 450 C305 440 300 434 294 430"
        fill="none" stroke="#4a7a8a" stroke-width=".5" stroke-dasharray="4,4"/>
    </g>

  </g><!-- /layer-fortifications -->

	  <!-- ═══ LAYER: SEA ═══ -->
	  <g id="layer-sea">
	  <g id="minefields" opacity=".95">
	    ${mineLine(460, 340, 492, 358, 7)}
	    ${mineLine(455, 355, 488, 372, 6)}
	    ${mineLine(450, 370, 484, 386, 8)}
    ${mineLine(458, 383, 490, 398, 5)}
    ${mineLine(453, 395, 486, 410, 6)}
    <text x="496" y="382" fill="#c9a84c"opacity=".85"></text>
  </g>

  <!-- ═══ KIYI BATARYALARI ═══ -->
  <g id="forts" opacity="1">
    ${fort(405, 340, 'Kilitbahir')} ${fort(400, 365, 'Mecidiye')} ${fort(395, 385, 'Hamidiye')}
    ${fort(415, 310, 'Namazgâh')} ${fort(498, 345, 'Çimenlik')} ${fort(495, 365, 'Mesudiye')}
    ${fort(345, 468, 'Ertuğrul')} ${fort(502, 385, 'Dardanos')}
    ${fort(388, 398, 'R.Mecidiye')} ${fort(508, 405, 'A.Hamidiye')}
  </g>

  </g><!-- /layer-sea -->

  <!-- ═══ LAYER: ZONES (frontlines, control zones) ═══ -->
  <g id="layer-zones"></g>

  <!-- ═══ LAYER: ROUTES (arrows, paths) ═══ -->
  <g id="layer-routes"></g>

  <!-- ═══ LAYER: LABELS ═══ -->
  <g id="layer-labels">
  <g id="locations">
	    ${BATTLE_DATA.locations.map(l => `<g class="location-group" data-location-id="${l.id}">
	      <circle cx="${l.x}" cy="${l.y}" r="2.5" class="location-dot"/>
	      <text x="${l.x + 5}" y="${l.y + 3}" class="location-label">${l.name}</text></g>`).join('')}
	  </g>

	  <g class="scene-annotation-group" data-scene-group="naval">
	    <path class="scene-focus-line" d="M470 335 L500 300 L530 250" />
	    <text x="505" y="286" class="scene-label">DARDANELLES NARROWS</text>
	    <text x="500" y="402" class="scene-label scene-label-sub">MINEFIELD</text>
	  </g>

	  <g class="scene-annotation-group" data-scene-group="anzac">
	    <path class="scene-ridge" d="M248 112 C270 150 285 188 300 220 C315 250 330 282 345 320" />
	    <path class="scene-ridge" d="M275 92 C298 132 314 172 328 212" />
	    <text x="188" y="232" class="scene-label">ANZAC COVE</text>
	    <text x="334" y="176" class="scene-label">SARI BAIR</text>
	    <text x="386" y="326" class="scene-label scene-label-sub">KILITBAHIR HEIGHTS</text>

	    <!-- Taktik Mevziler (Ünlü ANZAC noktaları) -->
	    <g class="tactical-posts" opacity=".9">
	      <g transform="translate(252,232)"><rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#e7c97e" stroke-width=".7" transform="rotate(45)"/>
	        <text x="5" y="2" fill="#e7c97e" font-family="var(--mono)" font-size="3.5" opacity=".8">The Nek</text></g>
	      <g transform="translate(242,258)"><rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#e7c97e" stroke-width=".7" transform="rotate(45)"/>
	        <text x="5" y="2" fill="#e7c97e" font-family="var(--mono)" font-size="3.5" opacity=".8">Lone Pine</text></g>
	      <g transform="translate(248,244)"><rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#e7c97e" stroke-width=".7" transform="rotate(45)"/>
	        <text x="5" y="2" fill="#e7c97e" font-family="var(--mono)" font-size="3.5" opacity=".7">Quinn's Post</text></g>
	      <g transform="translate(246,240)"><rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#e7c97e" stroke-width=".6" transform="rotate(45)"/>
	        <text x="5" y="2" fill="#e7c97e" font-family="var(--mono)" font-size="3" opacity=".6">Courtney's</text></g>
	      <g transform="translate(244,252)"><rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#e7c97e" stroke-width=".6" transform="rotate(45)"/>
	        <text x="5" y="2" fill="#e7c97e" font-family="var(--mono)" font-size="3" opacity=".6">Johnston's Jolly</text></g>
	    </g>
	  </g>

	  <g class="scene-annotation-group" data-scene-group="helles">
	    <text x="338" y="506" class="scene-label">V BEACH</text>
	    <text x="298" y="520" class="scene-label">W BEACH</text>
	    <text x="250" y="486" class="scene-label">X BEACH</text>
	    <text x="218" y="458" class="scene-label">Y BEACH</text>
	    <text x="364" y="450" class="scene-label">S BEACH</text>
	    <path class="scene-focus-line" d="M320 490 L302 448 L290 426" />
	    <text x="246" y="418" class="scene-label scene-label-sub">KRITHIA</text>
	    <text x="278" y="392" class="scene-label scene-label-sub">ACHI BABA</text>

	    <!-- Çıkarma sahili göstergeleri -->
	    <g class="beach-indicators" opacity=".45">
	      <path d="M330 502 Q338 498 346 502" fill="none" stroke="#d5c8a1" stroke-width="1.5" stroke-linecap="round"/>
	      <path d="M290 512 Q298 508 306 512" fill="none" stroke="#d5c8a1" stroke-width="1.5" stroke-linecap="round"/>
	      <path d="M242 480 Q248 476 254 480" fill="none" stroke="#d5c8a1" stroke-width="1.2" stroke-linecap="round"/>
	      <path d="M212 452 Q218 448 224 452" fill="none" stroke="#d5c8a1" stroke-width="1.2" stroke-linecap="round"/>
	      <path d="M356 460 Q362 456 368 460" fill="none" stroke="#d5c8a1" stroke-width="1.2" stroke-linecap="round"/>
	    </g>
	  </g>

  </g><!-- /layer-labels -->

  <!-- ═══ LAYER: UNITS ═══ -->
  <g id="unitTokens" class="units-layer">${renderTokens(phase.id, currentPositions, currentPositions, currentPhaseIndex, currentPhaseIndex, phase.isoStart || '')}</g>

  <!-- ═══ LAYER: COMBAT FX ═══ -->
  <g id="layer-combat-fx">
    <g id="battleEffects" class="battle-effects"></g>
  </g>

  <!-- Pusula -->
  <g transform="translate(670,52)" opacity=".45">
    <circle r="20" fill="rgba(10,10,12,.5)" stroke="#8a7535" stroke-width=".8"/>
    <circle r="14" fill="none" stroke="#8a7535" stroke-width=".3"/>
    <line x1="0" y1="-17" x2="0" y2="17" stroke="#8a7535" stroke-width=".4"/>
    <line x1="-17" y1="0" x2="17" y2="0" stroke="#8a7535" stroke-width=".4"/>
    <line x1="-12" y1="-12" x2="12" y2="12" stroke="#8a7535" stroke-width=".2" opacity=".5"/>
    <line x1="12" y1="-12" x2="-12" y2="12" stroke="#8a7535" stroke-width=".2" opacity=".5"/>
    <polygon points="0,-16 -3,-6 3,-6" fill="#dc3545"/>
    <polygon points="0,16 -3,6 3,6" fill="#8a7535" opacity=".5"/>
    <circle r="2" fill="#c9a84c"/>
    <text x="0" y="-21" text-anchor="middle" fill="#c9a84c" font-family="var(--mono)" font-size="5.5" font-weight="700">N</text>
    <text x="22" y="2" text-anchor="middle" fill="#8a7535" font-family="var(--mono)" font-size="3.5">E</text>
    <text x="0" y="24" text-anchor="middle" fill="#8a7535" font-family="var(--mono)" font-size="3.5">S</text>
    <text x="-22" y="2" text-anchor="middle" fill="#8a7535" font-family="var(--mono)" font-size="3.5">W</text>
  </g>

  <!-- Ölçek -->
  <g transform="translate(570,535)" opacity=".4">
    <line x1="0" y1="0" x2="35" y2="0" stroke="#c9a84c" stroke-width="1"/>
    <line x1="35" y1="0" x2="70" y2="0" stroke="#8a7535" stroke-width="1"/>
    <line x1="0" y1="-3" x2="0" y2="3" stroke="#c9a84c" stroke-width=".8"/>
    <line x1="35" y1="-3" x2="35" y2="3" stroke="#8a7535" stroke-width=".6"/>
    <line x1="70" y1="-3" x2="70" y2="3" stroke="#8a7535" stroke-width=".8"/>
    <rect x="0" y="-1" width="35" height="2" fill="#c9a84c" opacity=".2"/>
    <text x="17" y="-5" text-anchor="middle" fill="#c9a84c" font-family="var(--mono)" font-size="3.5">5 km</text>
    <text x="52" y="-5" text-anchor="middle" fill="#8a7535" font-family="var(--mono)" font-size="3.5">10 km</text>
  </g>

  <!-- ═══ AMBIENT OVERLAY ═══ -->
  <!-- Vignette efekti — harita kenarlarına derinlik -->
  <rect width="720" height="560" fill="url(#vignetteG)" pointer-events="none"/>
  <rect width="720" height="560" fill="url(#vignetteR)" pointer-events="none"/>

  <!-- Boğaz ışık yansıması -->
  <ellipse cx="470" cy="360" rx="30" ry="60" fill="#1a5a72" opacity=".04" filter="url(#glow)"/>

  <text x="15" y="545" fill="#8a7d60" font-family="var(--mono)" font-size="6" opacity=".5"
    paint-order="stroke" stroke="rgba(0,0,0,.4)" stroke-width="1">Çanakkale 1915 – İnteraktif Savaş Haritası</text>
  <text x="705" y="555" text-anchor="end" fill="rgba(200,180,130,.35)" font-family="var(--mono)" font-size="3.5">Icons by Icons8</text>
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

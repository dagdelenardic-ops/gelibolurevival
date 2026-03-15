// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Animation Language Primitives
// Temsili, kontrollü, bilgi taşıyan animasyonlar
// Her animasyon: max 600ms, max 2-3 SVG element, opacity < 0.4
// ══════════════════════════════════════════════════════════════

// ── Yardımcılar ──

/** İki nokta arası birim vektör */
function unitVec(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    return len < 1 ? { nx: 0, ny: 0, len: 0 } : { nx: dx / len, ny: dy / len, len };
}

/** Seed-tabanlı pseudo-random (0-1 arası, deterministik) */
function seededRand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// ═══════════════════════════════════════════════════════════
// TEMEL PRİMİTİFLER
// ═══════════════════════════════════════════════════════════

/**
 * İlerleme oku — dashed arrow + hafif motion
 */
export function renderAdvanceArrow(from, to, factionColor) {
    const { nx, ny, len } = unitVec(from, to);
    if (len < 5) return '';
    const ax = to.x - nx * 6;
    const ay = to.y - ny * 6;
    const px1 = ax - ny * 3, py1 = ay + nx * 3;
    const px2 = ax + ny * 3, py2 = ay - nx * 3;

    return `<g class="anim-advance" opacity=".35">
        <line x1="${from.x}" y1="${from.y}" x2="${ax}" y2="${ay}"
            stroke="${factionColor}" stroke-width="1.5" stroke-dasharray="4 3"
            stroke-linecap="round">
            <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.2s" repeatCount="indefinite"/>
        </line>
        <polygon points="${to.x},${to.y} ${px1},${py1} ${px2},${py2}"
            fill="${factionColor}" opacity=".6">
            <animate attributeName="opacity" values=".6;.3;.6" dur="1.2s" repeatCount="indefinite"/>
        </polygon>
    </g>`;
}

/**
 * Geri çekilme oku — soluklaşan arrow + geri yön
 */
export function renderRetreatArrow(from, to, factionColor) {
    return `<g class="anim-retreat" opacity=".2">
        <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
            stroke="${factionColor}" stroke-width="1.2" stroke-dasharray="3 5"
            stroke-linecap="round" opacity=".5">
            <animate attributeName="stroke-dashoffset" values="0;16" dur="2s" repeatCount="indefinite"/>
        </line>
    </g>`;
}

/**
 * Topçu ateşi — origin → arc hint → impact pulse
 */
export function renderArtilleryArc(origin, target) {
    const midX = (origin.x + target.x) / 2;
    const midY = Math.min(origin.y, target.y) - 15;
    return `<g class="anim-artillery" opacity=".3">
        <path d="M${origin.x} ${origin.y} Q${midX} ${midY} ${target.x} ${target.y}"
            fill="none" stroke="#ffdf84" stroke-width="1" stroke-dasharray="3 4">
            <animate attributeName="stroke-dashoffset" values="0;-14" dur="0.8s" repeatCount="indefinite"/>
        </path>
        <circle cx="${target.x}" cy="${target.y}" r="3"
            fill="rgba(255,200,100,.3)" stroke="rgba(255,200,100,.5)" stroke-width=".8">
            <animate attributeName="r" values="2;5;2" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".4;.15;.4" dur="1.5s" repeatCount="indefinite"/>
        </circle>
    </g>`;
}

/**
 * Çıkarma yaklaşımı — kıyıya yaklaşan path + sahil pulse
 */
export function renderLandingApproach(from, beachPoint) {
    return `<g class="anim-landing" opacity=".3">
        <line x1="${from.x}" y1="${from.y}" x2="${beachPoint.x}" y2="${beachPoint.y}"
            stroke="#5b9bd5" stroke-width="1.2" stroke-dasharray="5 3">
            <animate attributeName="stroke-dashoffset" values="0;-16" dur="1.5s" repeatCount="indefinite"/>
        </line>
        <circle cx="${beachPoint.x}" cy="${beachPoint.y}" r="4"
            fill="none" stroke="#5b9bd5" stroke-width="1" opacity=".4">
            <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".4;.1;.4" dur="2s" repeatCount="indefinite"/>
        </circle>
    </g>`;
}

/**
 * Cephe nabzı — bölge üstünde pulsing heat zone
 */
export function renderFrontlinePressure(centerX, centerY, intensity) {
    const r = intensity === 'high' ? 18 : intensity === 'medium' ? 12 : 8;
    const dur = intensity === 'high' ? '1.2s' : intensity === 'medium' ? '2s' : '3s';
    return `<circle class="anim-pressure" cx="${centerX}" cy="${centerY}" r="${r}"
        fill="rgba(180,60,40,.08)" stroke="none" pointer-events="none">
        <animate attributeName="r" values="${r * 0.8};${r * 1.2};${r * 0.8}" dur="${dur}" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".12;.06;.12" dur="${dur}" repeatCount="indefinite"/>
    </circle>`;
}

// ═══════════════════════════════════════════════════════════
// SİPER SAVAŞI PRİMİTİFLERİ
// ═══════════════════════════════════════════════════════════

/**
 * Siper hattı çifti — iki paralel zigzag çizgi (karşılıklı siperler)
 * No-man's land aralarında boşluk olarak kalır
 * @param {Array} points - cephe hattı noktaları [{x,y}]
 * @param {number} corridorWidth - iki siper arası mesafe
 * @param {string} ottomanColor
 * @param {string} alliedColor
 */
export function renderTrenchPair(points, corridorWidth, ottomanColor, alliedColor) {
    if (!points || points.length < 2) return '';
    const hw = corridorWidth / 2;

    // Polyline'ı iki tarafa offset et (normal yönünde)
    const ottomanLine = offsetPolyline(points, -hw);
    const alliedLine = offsetPolyline(points, hw);

    // Zigzag efekti — siper gerçekçiliği
    const ottomanZigzag = toZigzagPath(ottomanLine, 2.5);
    const alliedZigzag = toZigzagPath(alliedLine, 2.5);

    return `<g class="anim-trench-pair" opacity=".3">
        <path d="${ottomanZigzag}" fill="none"
            stroke="${ottomanColor}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
        <path d="${alliedZigzag}" fill="none"
            stroke="${alliedColor}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
    </g>`;
}

/**
 * Siper ateş alışverişi — siperler arası hızlı, kısa ateş çizgileri
 * "Yıpratma teması" görselleştirmesi
 * @param {object} from - ateş eden tarafın konumu {x,y}
 * @param {object} to - hedef tarafın konumu {x,y}
 * @param {number} intensity - 1-10 (kaç ateş çizgisi)
 * @param {number} seed - deterministik random için
 */
export function renderTrenchExchange(from, to, intensity, seed = 0) {
    const lines = Math.min(Math.ceil(intensity / 2), 5); // max 5 ateş çizgisi
    let svg = `<g class="anim-trench-exchange" opacity=".25">`;

    for (let i = 0; i < lines; i++) {
        const r1 = seededRand(seed + i * 7.3);
        const r2 = seededRand(seed + i * 13.1);
        // Rastgele lateral offset — ateş dağılımı
        const { nx, ny, len } = unitVec(from, to);
        const lateralFrom = (r1 - 0.5) * 12;
        const lateralTo = (r2 - 0.5) * 12;
        const x1 = from.x - ny * lateralFrom;
        const y1 = from.y + nx * lateralFrom;
        const x2 = to.x - ny * lateralTo;
        const y2 = to.y + nx * lateralTo;
        // Ateş noktaya kadar gitmez — %60-80 arası durur
        const reach = 0.6 + r1 * 0.2;
        const ex = x1 + (x2 - x1) * reach;
        const ey = y1 + (y2 - y1) * reach;
        const delay = `${(r1 * 1.5).toFixed(2)}s`;
        const dur = `${(0.3 + r2 * 0.4).toFixed(2)}s`;

        svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
            x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"
            stroke="rgba(255,220,150,.6)" stroke-width=".6" stroke-linecap="round">
            <animate attributeName="opacity" values="0;.5;0" dur="${dur}"
                begin="${delay}" repeatCount="indefinite"/>
        </line>`;
    }

    svg += `</g>`;
    return svg;
}

/**
 * Taarruz dalgası — bir taraftan diğerine yürüyen küçük noktalar
 * "19 Mayıs taarruzu" gibi büyük hücumları temsil eder
 * @param {object} from - taarruz başlangıcı {x,y}
 * @param {object} to - hedef {x,y}
 * @param {string} color - taarruz eden tarafın rengi
 * @param {number} waveCount - dalga sayısı (1-3)
 */
export function renderAssaultWave(from, to, color, waveCount = 2) {
    const { nx, ny, len } = unitVec(from, to);
    if (len < 10) return '';

    let svg = `<g class="anim-assault-wave" opacity=".3">`;
    const dotCount = Math.min(waveCount, 3);

    for (let w = 0; w < dotCount; w++) {
        const offset = w * (len / (dotCount + 1));
        const startX = from.x + nx * offset;
        const startY = from.y + ny * offset;
        const delay = `${(w * 0.6).toFixed(1)}s`;

        // Nokta, baştan sona hareket eder
        svg += `<circle r="2" fill="${color}" opacity=".5">
            <animate attributeName="cx" values="${startX};${to.x}" dur="2.5s"
                begin="${delay}" repeatCount="indefinite"/>
            <animate attributeName="cy" values="${startY};${to.y}" dur="2.5s"
                begin="${delay}" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".5;.3;0" dur="2.5s"
                begin="${delay}" repeatCount="indefinite"/>
            <animate attributeName="r" values="2;1.5;0" dur="2.5s"
                begin="${delay}" repeatCount="indefinite"/>
        </circle>`;
    }

    svg += `</g>`;
    return svg;
}

/**
 * Baraj ateşi — belirli bir alanda çoklu küçük patlama efektleri
 * Yoğun topçu bombardımanı için
 * @param {number} cx - merkez x
 * @param {number} cy - merkez y
 * @param {number} radius - baraj alanı yarıçapı
 * @param {number} burstCount - patlama sayısı (2-6)
 * @param {number} seed - deterministik random
 */
export function renderBarrage(cx, cy, radius, burstCount = 4, seed = 0) {
    const count = Math.min(burstCount, 6);
    let svg = `<g class="anim-barrage" opacity=".25">`;

    for (let i = 0; i < count; i++) {
        const angle = seededRand(seed + i * 5.7) * Math.PI * 2;
        const dist = seededRand(seed + i * 11.3) * radius;
        const bx = cx + Math.cos(angle) * dist;
        const by = cy + Math.sin(angle) * dist;
        const delay = `${(seededRand(seed + i * 3.1) * 2).toFixed(2)}s`;
        const dur = `${(0.5 + seededRand(seed + i * 7.7) * 0.8).toFixed(2)}s`;

        // Patlama: genişleyen + solan daire
        svg += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" fill="rgba(255,180,80,.3)" stroke="none">
            <animate attributeName="r" values="0;4;1" dur="${dur}"
                begin="${delay}" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".4;.2;0" dur="${dur}"
                begin="${delay}" repeatCount="indefinite"/>
        </circle>`;
    }

    svg += `</g>`;
    return svg;
}

/**
 * No-man's land gerginliği — iki siper arası titreşen alan
 * Sürekli yıpranma durumunu temsil eder
 * @param {Array} points - cephe hattı noktaları
 * @param {number} width - genişlik
 */
export function renderNoMansLand(points, width) {
    if (!points || points.length < 2) return '';

    // Polyline'dan orta hattı al
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

    return `<g class="anim-nomansland" opacity=".12">
        <path d="${pathD}" fill="none"
            stroke="rgba(200,100,60,.4)" stroke-width="${width}"
            stroke-linecap="round" stroke-linejoin="round">
            <animate attributeName="opacity" values=".08;.18;.08" dur="3s" repeatCount="indefinite"/>
        </path>
    </g>`;
}

/**
 * Keskin nişancı ateşi — siperler arası anlık ince çizgi + küçük flaş
 * Siper günlüğünün sessiz ama ölümcül rutinini temsil eder
 */
export function renderSniperFire(from, to, seed = 0) {
    const r = seededRand(seed);
    const delay = `${(r * 4).toFixed(2)}s`;

    return `<g class="anim-sniper" opacity=".2">
        <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
            stroke="rgba(255,255,200,.8)" stroke-width=".4">
            <animate attributeName="opacity" values="0;.6;0" dur="0.15s"
                begin="${delay}" repeatCount="indefinite"/>
        </line>
        <circle cx="${to.x}" cy="${to.y}" r="1.5"
            fill="rgba(255,255,200,.4)">
            <animate attributeName="opacity" values="0;.4;0" dur="0.15s"
                begin="${delay}" repeatCount="indefinite"/>
            <animate attributeName="r" values="1;2.5;1" dur="0.15s"
                begin="${delay}" repeatCount="indefinite"/>
        </circle>
    </g>`;
}

/**
 * Mayın patlaması — deniz mayını veya kara mayını
 * Genişleyen halka + merkez flaş
 */
export function renderMineExplosion(cx, cy, isNaval = false) {
    const color = isNaval ? 'rgba(100,180,255,.4)' : 'rgba(255,150,50,.4)';
    const ringColor = isNaval ? 'rgba(100,180,255,.3)' : 'rgba(255,100,30,.3)';

    return `<g class="anim-mine-explosion" opacity=".35">
        <circle cx="${cx}" cy="${cy}" fill="${color}">
            <animate attributeName="r" values="2;8;2" dur="1.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".5;.1;.5" dur="1.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${cx}" cy="${cy}" fill="none" stroke="${ringColor}" stroke-width=".8">
            <animate attributeName="r" values="3;14;3" dur="1.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".3;0;.3" dur="1.8s" repeatCount="indefinite"/>
        </circle>
    </g>`;
}

/**
 * Kayıp göstergesi — soluk, yavaş nabız
 * Bir bölgedeki insan kaybını sessizce temsil eder
 * @param {number} cx
 * @param {number} cy
 * @param {string} level - 'heavy' | 'moderate' | 'light'
 */
export function renderCasualtyIndicator(cx, cy, level) {
    const r = level === 'heavy' ? 14 : level === 'moderate' ? 10 : 6;
    const color = level === 'heavy'
        ? 'rgba(120,30,30,.12)'
        : level === 'moderate'
            ? 'rgba(140,50,40,.08)'
            : 'rgba(160,80,60,.05)';
    const dur = level === 'heavy' ? '2.5s' : '4s';

    return `<circle class="anim-casualty" cx="${cx}" cy="${cy}" r="${r}"
        fill="${color}" stroke="none" pointer-events="none">
        <animate attributeName="r" values="${r};${r * 1.3};${r}" dur="${dur}" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".15;.05;.15" dur="${dur}" repeatCount="indefinite"/>
    </circle>`;
}

// ═══════════════════════════════════════════════════════════
// YARDIMCI GEOMETRİ FONKSİYONLARI
// ═══════════════════════════════════════════════════════════

/** Polyline'ı belirli mesafede offset et (normal yönünde) */
function offsetPolyline(points, offset) {
    return points.map((p, i) => {
        let nx = 0, ny = 0;
        if (i < points.length - 1) {
            const dx = points[i + 1].x - p.x;
            const dy = points[i + 1].y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            // Normal: saat yönünde 90 derece
            nx = -dy / len;
            ny = dx / len;
        } else if (i > 0) {
            const dx = p.x - points[i - 1].x;
            const dy = p.y - points[i - 1].y;
            const len = Math.hypot(dx, dy) || 1;
            nx = -dy / len;
            ny = dx / len;
        }
        return { x: p.x + nx * offset, y: p.y + ny * offset };
    });
}

/** Polyline noktalarından zigzag SVG path üret */
function toZigzagPath(points, amplitude) {
    if (points.length < 2) return '';
    let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        // Normal yön
        const nx = -dy / len;
        const ny = dx / len;
        // Ara noktada zigzag
        const midX = (prev.x + curr.x) / 2 + nx * amplitude * (i % 2 === 0 ? 1 : -1);
        const midY = (prev.y + curr.y) / 2 + ny * amplitude * (i % 2 === 0 ? 1 : -1);
        d += ` L${midX.toFixed(1)} ${midY.toFixed(1)} L${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    return d;
}

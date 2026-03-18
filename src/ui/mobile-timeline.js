// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Mobil Kart Bazlı Deneyim
// Haritasız, dikey scroll, versus infografik timeline
// ══════════════════════════════════════════════════════════════

const BATTLES = [
    {
        id: 1,
        date: '19 ŞUBAT 1915',
        dateRange: '16-22 Şubat 1915',
        title: 'İlk Deniz Bombardımanı',
        summary: 'İtilaf donanması Boğaz giriş tabyalarına ağır bombardıman başlattı. Osmanlı topçuları ilk atışlarda geri çekilerek İngilizleri yanılttı, ardından seyyar bataryalarla karşı ateşe geçerek düşman gemilerini Boğaz\'dan uzak tuttu.',
        ottoman: { soldiers: { dead: 8, wounded: 17 }, ships: { sunk: 0, damaged: 0 }, guns: { destroyed: 2, operational: 28 } },
        allied: { soldiers: { dead: 0, wounded: 0 }, ships: { sunk: 0, damaged: 2 }, label: 'İNGİLİZ-FRANSIZ' },
        bgGradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        accent: '#e94560'
    },
    {
        id: 2,
        date: '18 MART 1915',
        dateRange: '18 Mart 1915',
        title: 'Büyük Deniz Zaferi',
        summary: 'İtilaf donanması 18 gemiden oluşan dev bir filoyla Boğaz\'ı zorladı. Nusret mayın gemisinin döşediği mayınlar ve kıyı bataryalarının ateşi altında 3 zırhlı battı, birçoğu ağır hasar aldı. Deniz savaşı Osmanlı zaferiyle sonuçlandı.',
        ottoman: { soldiers: { dead: 40, wounded: 74 }, ships: { sunk: 0, damaged: 0 }, guns: { destroyed: 8, operational: 22 } },
        allied: { soldiers: { dead: 700, wounded: 0 }, ships: { sunk: 3, damaged: 3 }, label: 'İNGİLİZ-FRANSIZ' },
        bgGradient: 'linear-gradient(180deg, #0d0d0d 0%, #1a0a0a 40%, #2d1111 100%)',
        accent: '#ff6b35'
    },
    {
        id: 3,
        date: '25 NİSAN 1915',
        dateRange: '25 Nisan 1915',
        title: 'Arıburnu Çıkarması',
        summary: 'ANZAC birlikleri Arıburnu\'na çıkarma yaptı. Mustafa Kemal komutasındaki 57. Alay, "Ben size taarruzu emretmiyorum, ölmeyi emrediyorum" emriyle karşı taarruza geçti. Çıkarma dar sahil şeridinde durduruldu.',
        ottoman: { soldiers: { dead: 2160, wounded: 6700 }, ships: { sunk: 0, damaged: 0 }, guns: { destroyed: 0, operational: 30 } },
        allied: { soldiers: { dead: 860, wounded: 1900 }, ships: { sunk: 0, damaged: 1 }, label: 'ANZAC' },
        bgGradient: 'linear-gradient(180deg, #1a1a0e 0%, #2d2a10 40%, #3d3516 100%)',
        accent: '#d4a017'
    },
    {
        id: 4,
        date: '6 AĞUSTOS 1915',
        dateRange: '6-10 Ağustos 1915',
        title: 'Conkbayırı Muharebeleri',
        summary: 'İtilaf kuvvetleri Suvla ve Conkbayırı\'na büyük çaplı taarruz başlattı. Mustafa Kemal bizzat cephede komuta ederek düşman ilerleyişini durdurdu. Göğsüne isabet eden şarapnel parçasını cep saati engelledi.',
        ottoman: { soldiers: { dead: 5000, wounded: 14000 }, ships: { sunk: 0, damaged: 0 }, guns: { destroyed: 3, operational: 27 } },
        allied: { soldiers: { dead: 5300, wounded: 16000 }, ships: { sunk: 0, damaged: 0 }, label: 'İNGİLİZ-ANZAC' },
        bgGradient: 'linear-gradient(180deg, #0d1117 0%, #161b22 40%, #21262d 100%)',
        accent: '#58a6ff'
    },
    {
        id: 5,
        date: '20 ARALIK 1915',
        dateRange: '20 Aralık 1915 - 9 Ocak 1916',
        title: 'Tahliye — Osmanlı Zaferi',
        summary: 'Başarısızlığı kabul eden İtilaf kuvvetleri gizlice tahliyeye başladı. Osmanlı keşif kolları geç fark etti. 9 Ocak 1916\'da son İngiliz askeri yarımadayı terk etti. Çanakkale\'nin geçilmezliği kanıtlandı.',
        ottoman: { soldiers: { dead: 57263, wounded: 100000 }, ships: { sunk: 0, damaged: 0 }, guns: { destroyed: 13, operational: 17 } },
        allied: { soldiers: { dead: 56707, wounded: 123598 }, ships: { sunk: 6, damaged: 12 }, label: 'İTİLAF TOPLAM' },
        bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 30%, #0d1117 100%)',
        accent: '#c9302c',
        isTotal: true
    }
];

// ── SVG İkonları ──

function soldierSVG(side, scale = 1) {
    const c = side === 'ottoman' ? '#e8d5b0' : '#8bb8d0';
    const fes = side === 'ottoman' ? `<path d="M4 0.5H10L9 2.5H5L4 0.5Z" fill="${c}" opacity="0.7"/>` : '';
    return `<svg width="${14 * scale}" height="${22 * scale}" viewBox="0 0 14 22" fill="none" style="display:inline-block;vertical-align:middle"><circle cx="7" cy="3.5" r="3" fill="${c}" opacity="0.9"/><path d="M7 7.5C4 7.5 1.5 9 1.5 11.5V16.5C1.5 17 2 17.5 2.5 17.5H5V21H9V17.5H11.5C12 17.5 12.5 17 12.5 16.5V11.5C12.5 9 10 7.5 7 7.5Z" fill="${c}" opacity="0.9"/>${fes}</svg>`;
}

function shipSVG(sunk) {
    const fill = sunk ? '#c9302c' : '#666';
    const op = sunk ? '0.9' : '0.4';
    const stroke = sunk ? '#ff4444' : '#888';
    const x = sunk ? `<line x1="6" y1="3" x2="22" y2="13" stroke="#ff4444" stroke-width="1.5" opacity="0.7"/>` : '';
    return `<svg width="28" height="16" viewBox="0 0 28 16" fill="none" style="display:inline-block"><path d="M2 10L4 14H24L26 10L22 8L20 4H8L6 8L2 10Z" fill="${fill}" opacity="${op}" stroke="${stroke}" stroke-width="0.5"/><line x1="14" y1="2" x2="14" y2="8" stroke="${stroke}" stroke-width="1"/>${x}</svg>`;
}

// ── Animasyonlu Sayaç ──

function animateNumber(el, target, duration = 1200) {
    if (!target) { el.textContent = '0'; return; }
    let start = null;
    const fmt = target >= 1000;
    function step(ts) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(eased * target);
        el.textContent = fmt ? val.toLocaleString('tr-TR') : val;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── Kart Oluştur ──

function createSideHTML(data, side, maxCasualty, battle) {
    const isOttoman = side === 'ottoman';
    const accentColor = isOttoman ? '#c41e3a' : '#1e5c8b';
    const textColor = isOttoman ? '#e8d5b0' : '#8bb8d0';
    const label = isOttoman ? 'OSMANLI' : (data.label || 'ANZAC');
    const align = isOttoman ? 'left' : 'right';
    const flexEnd = isOttoman ? 'flex-start' : 'flex-end';

    const iconCount = Math.min(Math.ceil(data.soldiers.dead / (battle.isTotal ? 5000 : 50)), 12);
    const soldiers = Array.from({ length: iconCount }, () => soldierSVG(side, 0.7)).join('');

    const shipCount = (data.ships?.sunk || 0) + (data.ships?.damaged || 0);
    let shipsHTML = '';
    if (shipCount > 0) {
        const sunkShips = Array.from({ length: data.ships.sunk }, () => shipSVG(true)).join('');
        const damagedShips = Array.from({ length: data.ships.damaged }, () => shipSVG(false)).join('');
        const sunkLabel = data.ships.sunk > 0 ? `<span style="font-size:10px;color:#c41e3a">${data.ships.sunk} batık</span>` : '';
        const damagedLabel = data.ships.damaged > 0 ? `<span style="font-size:10px;color:rgba(255,255,255,.35)">${data.ships.damaged} hasarlı</span>` : '';
        shipsHTML = `
            <div style="display:flex;gap:4px;justify-content:${flexEnd};align-items:center;flex-wrap:wrap">${sunkShips}${damagedShips}</div>
            <div style="display:flex;gap:8px;justify-content:${flexEnd};margin-top:4px">${sunkLabel}${damagedLabel}</div>`;
    } else {
        shipsHTML = `<span style="font-size:10px;color:rgba(255,255,255,.25)">—</span>`;
    }

    // Osmanlı tarafında TOP, İtilaf tarafında GEMİ göster
    const equipLabel = isOttoman ? 'TOP' : 'GEMİ';
    let equipContent = '';
    if (isOttoman) {
        const guns = battle.ottoman.guns;
        equipContent = `
            <div style="display:flex;align-items:baseline;gap:4px;justify-content:${flexEnd}">
                <span style="font-size:16px;font-weight:700;color:${guns.destroyed > 0 ? '#c41e3a' : 'rgba(255,255,255,.3)'};font-family:monospace">${guns.destroyed}</span>
                <span style="font-size:9px;color:rgba(255,255,255,.3)">tahrip</span>
                <span style="font-size:9px;color:rgba(255,255,255,.15);margin:0 2px">|</span>
                <span style="font-size:16px;font-weight:700;color:#4a9e4a;font-family:monospace">${guns.operational}</span>
                <span style="font-size:9px;color:rgba(255,255,255,.3)">aktif</span>
            </div>`;
    } else {
        equipContent = shipsHTML;
    }

    // Header
    const headerHTML = isOttoman
        ? `<div style="width:8px;height:8px;border-radius:50%;background:${accentColor};box-shadow:0 0 6px ${accentColor}88"></div><span class="mob-side-label" style="color:${textColor}">${label}</span>`
        : `<span class="mob-side-label" style="color:${textColor}">${label}</span><div style="width:8px;height:8px;border-radius:50%;background:${accentColor};box-shadow:0 0 6px ${accentColor}88"></div>`;

    const totalCasualty = data.soldiers.dead + data.soldiers.wounded;
    const barPct = Math.min((totalCasualty / maxCasualty) * 100, 100);

    return `
        <div class="mob-side" style="${isOttoman ? 'border-right:1px solid rgba(255,255,255,.06)' : ''}">
            <div class="mob-side-header" style="justify-content:${flexEnd}">${headerHTML}</div>
            <div class="mob-soldiers" style="text-align:${align}">
                <div style="display:flex;gap:3px;margin-bottom:6px;flex-wrap:wrap;justify-content:${flexEnd}">${soldiers}</div>
                <div class="mob-big-number" style="color:${textColor}" data-target="${data.soldiers.dead}">0</div>
                <div class="mob-stat-label">ŞEHİT</div>
                <div class="mob-med-number" style="color:${textColor}99;margin-top:6px" data-target="${data.soldiers.wounded}">0</div>
                <div class="mob-stat-label">YARALI</div>
            </div>
            <div class="mob-bar-wrap">
                <div class="mob-stat-label" style="margin-bottom:3px">Toplam kayıp</div>
                <div class="mob-bar-track"><div class="mob-bar-fill" style="background:${accentColor}" data-width="${barPct}"></div></div>
            </div>
            <div class="mob-equip">
                <div class="mob-stat-label" style="margin-bottom:4px;text-align:${align}">${equipLabel}</div>
                ${equipContent}
            </div>
        </div>`;
}

function createBattleCard(battle) {
    const maxCasualty = Math.max(
        battle.ottoman.soldiers.dead + battle.ottoman.soldiers.wounded,
        battle.allied.soldiers.dead + battle.allied.soldiers.wounded, 1
    );

    const totalBanner = battle.isTotal ? `
        <div class="mob-total-banner">
            <div style="font-size:11px;color:#c9302c;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Savaş Toplam Bilançosu</div>
            <div style="font-size:10px;color:rgba(255,255,255,.4);margin-top:4px">Çanakkale Geçilmez — 1915-1916</div>
        </div>` : '';

    const scrollHint = !battle.isTotal ? `
        <div class="mob-scroll-hint">
            <span>KAYDIRIN</span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M1 1L8 8L15 1" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/></svg>
        </div>` : '';

    const card = document.createElement('div');
    card.className = 'mob-card';
    card.style.background = battle.bgGradient;
    card.innerHTML = `
        <div class="mob-atmos" style="background:radial-gradient(ellipse at 50% 30%, ${battle.accent}15 0%, transparent 60%)"></div>
        <div class="mob-noise"></div>
        <div class="mob-header">
            <div class="mob-date" style="color:${battle.accent}">${battle.date}</div>
            <div class="mob-daterange">${battle.dateRange}</div>
        </div>
        <div class="mob-title-section">
            <h2 class="mob-title">${battle.title}</h2>
            <p class="mob-summary">${battle.summary}</p>
        </div>
        <div class="mob-versus">
            <div class="mob-versus-inner">
                ${createSideHTML(battle.ottoman, 'ottoman', maxCasualty, battle)}
                ${createSideHTML(battle.allied, 'allied', maxCasualty, battle)}
            </div>
            ${totalBanner}
        </div>
        ${scrollHint}`;
    return card;
}

// ── Ana Giriş ──

export function initMobileTimeline() {
    // Loading overlay'i kaldır
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.remove();

    // Mevcut desktop DOM'u gizle
    document.querySelector('.topbar')?.setAttribute('style', 'display:none');
    document.querySelector('.map-container')?.setAttribute('style', 'display:none');
    document.querySelector('.timeline')?.setAttribute('style', 'display:none');
    document.querySelector('#unitPanel')?.setAttribute('style', 'display:none');

    // Container oluştur
    const container = document.createElement('div');
    container.className = 'mobile-timeline';

    // Kartları oluştur
    const cardEls = [];
    BATTLES.forEach((battle, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mob-card-wrapper';
        const card = createBattleCard(battle);
        wrapper.appendChild(card);
        container.appendChild(wrapper);
        cardEls.push(wrapper);
    });

    // Progress dots
    const dots = document.createElement('div');
    dots.className = 'mob-dots';
    BATTLES.forEach((b, i) => {
        const dot = document.createElement('div');
        dot.className = 'mob-dot';
        dot.style.background = i === 0 ? b.accent : 'rgba(255,255,255,.2)';
        dot.dataset.accent = b.accent;
        dot.addEventListener('click', () => {
            cardEls[i].scrollIntoView({ behavior: 'smooth' });
        });
        dots.appendChild(dot);
    });
    container.appendChild(dots);

    document.body.appendChild(container);

    // IntersectionObserver — aktif kartı belirle + animasyonları tetikle
    let activeIndex = 0;
    const activated = new Set();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const idx = cardEls.indexOf(entry.target);
            if (idx === -1) return;
            activeIndex = idx;

            // Dots güncelle
            dots.querySelectorAll('.mob-dot').forEach((d, di) => {
                const isActive = di === idx;
                d.style.background = isActive ? d.dataset.accent : 'rgba(255,255,255,.2)';
                d.style.width = isActive ? '10px' : '6px';
                d.style.height = isActive ? '10px' : '6px';
                d.style.boxShadow = isActive ? `0 0 8px ${d.dataset.accent}66` : 'none';
            });

            // Sayaç + bar animasyonlarını tetikle (bir kez)
            if (activated.has(idx)) return;
            activated.add(idx);

            const card = entry.target;
            card.querySelectorAll('.mob-big-number, .mob-med-number').forEach(el => {
                const target = parseInt(el.dataset.target, 10);
                if (target) animateNumber(el, target);
            });
            card.querySelectorAll('.mob-bar-fill').forEach(bar => {
                setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, 100);
            });
        });
    }, { threshold: 0.55 });

    cardEls.forEach(el => observer.observe(el));
}

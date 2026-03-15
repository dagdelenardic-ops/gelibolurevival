// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Kayıp İstatistikleri Paneli
// Kampanya geneli toplam kayıp özeti
// ══════════════════════════════════════════════════════════════

const CAMPAIGN_STATS = {
    ottoman: {
        name: 'Osmanlı Devleti',
        deployed: 315000,
        killed: 86692,
        wounded: 164617,
        missing: 11178,
        total: 253000,
        color: 'var(--ottoman)'
    },
    allied: {
        name: 'İtilaf Devletleri',
        deployed: 489000,
        killed: 44092,
        wounded: 97037,
        missing: 12000,
        total: 265000,
        subgroups: [
            { name: 'İngiliz', killed: 21255, wounded: 52230 },
            { name: 'ANZAC', killed: 11410, wounded: 23218 },
            { name: 'Fransız', killed: 9798, wounded: 17371 },
            { name: 'Hint', killed: 1358, wounded: 3421 },
        ],
        color: 'var(--british)'
    }
};

let panelEl = null;

function createPanel() {
    const el = document.createElement('div');
    el.id = 'statsPanel';
    el.className = 'stats-panel';
    el.innerHTML = `
        <div class="stats-panel-inner">
            <div class="stats-header">
                <img src="assets/icons/medal.png" width="20" height="20" alt="">
                <h3>Kampanya Kayıp İstatistikleri</h3>
                <button class="stats-close" type="button" aria-label="Kapat">&times;</button>
            </div>
            <div class="stats-subtitle">3 Kasım 1914 – 9 Ocak 1916 &bull; 433 Gün</div>
            <div class="stats-grid">
                ${renderSide(CAMPAIGN_STATS.ottoman)}
                ${renderSide(CAMPAIGN_STATS.allied)}
            </div>
            <div class="stats-total">
                <span>Toplam Kayıp (her iki taraf)</span>
                <strong>${(CAMPAIGN_STATS.ottoman.total + CAMPAIGN_STATS.allied.total).toLocaleString('tr-TR')}+</strong>
            </div>
            ${CAMPAIGN_STATS.allied.subgroups ? `
            <div class="stats-subgroups">
                <div class="stats-sub-title">İtilaf Kayıp Dağılımı</div>
                ${CAMPAIGN_STATS.allied.subgroups.map(sg => `
                    <div class="stats-sub-row">
                        <span>${sg.name}</span>
                        <span>${sg.killed.toLocaleString('tr-TR')} ölü / ${sg.wounded.toLocaleString('tr-TR')} yaralı</span>
                    </div>
                `).join('')}
            </div>` : ''}
            <div class="stats-source">Kaynak: Peter Hart, <em>Gallipoli</em> (2011); TDV İslam Ansiklopedisi</div>
        </div>
    `;
    document.body.appendChild(el);

    el.querySelector('.stats-close').addEventListener('click', hideStatsPanel);
    el.addEventListener('click', (e) => { if (e.target === el) hideStatsPanel(); });

    return el;
}

function renderSide(side) {
    return `
        <div class="stats-side">
            <div class="stats-side-name" style="color:${side.color}">${side.name}</div>
            <div class="stats-row"><span>Sevk Edilen</span><span>${side.deployed.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row"><span>Şehit / Ölü</span><span>${side.killed.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row"><span>Yaralı</span><span>${side.wounded.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row"><span>Kayıp / Esir</span><span>${side.missing.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row stats-row-total"><span>Toplam Kayıp</span><span>~${side.total.toLocaleString('tr-TR')}</span></div>
            <div class="stats-bar">
                <div class="stats-bar-fill" style="width:${Math.round(side.total/side.deployed*100)}%;background:${side.color}"></div>
            </div>
            <div class="stats-bar-label">${Math.round(side.total/side.deployed*100)}% kayıp oranı</div>
        </div>
    `;
}

export function showStatsPanel() {
    if (!panelEl) panelEl = createPanel();
    panelEl.classList.add('open');
}

export function hideStatsPanel() {
    if (panelEl) panelEl.classList.remove('open');
}

export function toggleStatsPanel() {
    if (!panelEl || !panelEl.classList.contains('open')) {
        showStatsPanel();
    } else {
        hideStatsPanel();
    }
}

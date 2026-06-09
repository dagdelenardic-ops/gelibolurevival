// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Kayıp İstatistikleri Paneli
// Kampanya geneli toplam kayıp özeti
// ══════════════════════════════════════════════════════════════

// Peter Hart, Gallipoli (2011) konsolide seti. Toplam = bileşenlerin
// toplamı (şehit + yaralı + kayıp + hastalık/sevk) — hardcoded değil.
// Gelibolu'nun tanımlayıcı dizanteri/hastalık tahliyesi 'sick' olarak ayrı.
const CAMPAIGN_STATS = {
    ottoman: {
        name: 'Osmanlı Devleti',
        deployed: 315000,
        fatalityLabel: 'Dar askerî ölüm kaydı',
        killed: 56643,
        fatalityNote: 'Geniş ölüm aralığı kaynak tanımına göre 66.000-86.692 olarak verilir.',
        wounded: 107007,
        missing: 11178,
        sick: 76000,
        color: 'var(--ottoman)'
    },
    allied: {
        name: 'İtilaf Devletleri',
        deployed: 489000,
        fatalityLabel: 'Ölü',
        killed: 44092,
        wounded: 97037,
        missing: 12000,
        sick: 99000,
        subgroups: [
            { name: 'İngiliz', killed: 21255, wounded: 52230 },
            { name: 'ANZAC', killed: 11410, wounded: 23218 },
            { name: 'Fransız', killed: 9798, wounded: 17371 },
            { name: 'Hint', killed: 1358, wounded: 3421 },
        ],
        color: 'var(--british)'
    }
};

/** Toplam kayıp = şehit + yaralı + kayıp/esir + hastalık/sevk */
function sideTotal(side) {
    return (side.killed || 0) + (side.wounded || 0) + (side.missing || 0) + (side.sick || 0);
}

let panelEl = null;

function getFocusableElements(root) {
    return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.disabled && el.offsetParent !== null);
}

function trapStatsFocus(event) {
    if (!panelEl || !panelEl.classList.contains('open')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        hideStatsPanel();
        return;
    }
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(panelEl);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function createPanel() {
    const el = document.createElement('div');
    el.id = 'statsPanel';
    el.className = 'stats-panel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    el.hidden = true;
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
                <strong>${(sideTotal(CAMPAIGN_STATS.ottoman) + sideTotal(CAMPAIGN_STATS.allied)).toLocaleString('tr-TR')}+</strong>
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
            <div class="stats-source">Kaynaklar: Peter Hart, <em>Gallipoli</em> (2011); Australian DVA / Anzac Portal kayıp tabloları; TDV İslam Ansiklopedisi</div>
        </div>
    `;
    document.body.appendChild(el);

    el.querySelector('.stats-close').addEventListener('click', hideStatsPanel);
    el.addEventListener('click', (e) => { if (e.target === el) hideStatsPanel(); });
    el.addEventListener('keydown', trapStatsFocus);

    return el;
}

function setStatsPanelA11yState(open) {
    if (!panelEl) return;
    panelEl.hidden = !open;
    panelEl.toggleAttribute('inert', !open);
    panelEl.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function renderSide(side) {
    const total = sideTotal(side);
    const pct = Math.round(total / side.deployed * 100);
    return `
        <div class="stats-side">
            <div class="stats-side-name" style="color:${side.color}">${side.name}</div>
            <div class="stats-row"><span>Sevk Edilen</span><span>${side.deployed.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row"><span>${side.fatalityLabel || 'Şehit / Ölü'}</span><span>${side.killed.toLocaleString('tr-TR')}</span></div>
            ${side.fatalityNote ? `<div class="stats-note">${side.fatalityNote}</div>` : ''}
            <div class="stats-row"><span>Yaralı</span><span>${side.wounded.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row"><span>Kayıp / Esir</span><span>${side.missing.toLocaleString('tr-TR')}</span></div>
            <div class="stats-row"><span>Hastalık / Sevk</span><span>${(side.sick || 0).toLocaleString('tr-TR')}</span></div>
            <div class="stats-row stats-row-total"><span>Toplam Kayıp</span><span>~${total.toLocaleString('tr-TR')}</span></div>
            <div class="stats-bar">
                <div class="stats-bar-fill" style="width:${pct}%;background:${side.color}"></div>
            </div>
            <div class="stats-bar-label">${pct}% kayıp oranı</div>
        </div>
    `;
}

export function showStatsPanel() {
    if (!panelEl) panelEl = createPanel();
    setStatsPanelA11yState(true);
    panelEl.classList.add('open');
    requestAnimationFrame(() => panelEl?.querySelector('.stats-close')?.focus());
}

export function hideStatsPanel() {
    if (!panelEl) return;
    if (panelEl.contains(document.activeElement)) {
        document.getElementById('statsBtn')?.focus?.();
    }
    panelEl.classList.remove('open');
    setStatsPanelA11yState(false);
}

export function toggleStatsPanel() {
    if (!panelEl || !panelEl.classList.contains('open')) {
        showStatsPanel();
    } else {
        hideStatsPanel();
    }
}

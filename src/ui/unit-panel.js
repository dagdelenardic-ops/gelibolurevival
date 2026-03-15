// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birim Detay Paneli
// Birim tıklayınca açılan sağ panel yönetimi
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { getUnitIcon } from '../data/icon-registry.js';

/** Faksiyon banner rengi */
function getFactionBanner(faction) {
    const colors = {
        ottoman: { bg: 'linear-gradient(135deg, #8b1a25 0%, #dc3545 50%, #8b1a25 100%)', label: 'OSMANLI KUVVETLERİ' },
        british: { bg: 'linear-gradient(135deg, #0d47a1 0%, #2196F3 50%, #0d47a1 100%)', label: 'İNGİLİZ KUVVETLERİ' },
        anzac: { bg: 'linear-gradient(135deg, #1b5e20 0%, #4CAF50 50%, #1b5e20 100%)', label: 'ANZAC KUVVETLERİ' },
        french: { bg: 'linear-gradient(135deg, #4a148c 0%, #9C27B0 50%, #4a148c 100%)', label: 'FRANSIZ KUVVETLERİ' },
    };
    return colors[faction] || colors.ottoman;
}

/** Birim detay panelini aç */
export function showUnitPanel(u, d) {
    const panel = document.getElementById('unitPanel');
    if (!panel || !u) return;

    // Faction banner
    const banner = getFactionBanner(u.faction);
    const bannerEl = document.getElementById('panelBanner');
    if (bannerEl) {
        const iconInfo = getUnitIcon(u.id);
        bannerEl.style.background = banner.bg;
        bannerEl.innerHTML = `<img src="assets/icons/${iconInfo.icon}.png" width="28" height="28" alt="" style="opacity:.9;filter:brightness(1.3)"><span>${banner.label}</span>`;
    }

    document.getElementById('panelUnitName').textContent = u.name || '-';
    document.getElementById('panelUnitCommander').textContent = u.commander || '-';
    document.getElementById('panelUnitStrength').textContent = u.strength ? `${u.strength.toLocaleString('tr-TR')} asker` : '-';
    document.getElementById('panelUnitStatus').textContent = (d && d.status) || 'Bilinmiyor';
    document.getElementById('panelUnitObjective').textContent = (d && d.objective) || 'Bilinmiyor';
    document.getElementById('panelUnitOutcome').textContent = (d && d.outcome) || 'Bilinmiyor';
    document.getElementById('panelUnitDescription').textContent = u.description || '-';
    panel.classList.add('open');
}

/** Birim detay panelini kapat */
export function hideUnitPanel() {
    const panel = document.getElementById('unitPanel');
    if (panel) panel.classList.remove('open');
}

/** Birim token tıklama olaylarını bağla */
export function attachUnitClicks(getCurrentPhaseIndex) {
    const tg = document.getElementById('unitTokens');
    if (!tg || tg.dataset.clickBound === '1') return;
    tg.dataset.clickBound = '1';
    tg.addEventListener('click', (ev) => {
        const el = ev.target.closest('.unit-token');
        if (!el) return;
        const unitId = el.dataset.unitId;
        const unit = BATTLE_DATA.units.find((u) => u.id === unitId);
        if (!unit) return;
        const phase = BATTLE_DATA.phases[getCurrentPhaseIndex()];
        const phaseData = unit.phases[phase.id] || { status: 'Bilinmiyor', objective: 'Bilinmiyor', outcome: 'Bilinmiyor' };
        showUnitPanel(unit, phaseData);
    });
}

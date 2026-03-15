// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birim Detay Paneli
// Birim tıklayınca açılan sağ panel — komutan portresi dahil
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { getUnitIcon } from '../data/icon-registry.js';
import { getCommanderPortrait } from '../data/commander-portraits.js';

/** Faksiyon banner rengi — desatüre askeri tonlar */
function getFactionBanner(faction) {
    const colors = {
        ottoman: { bg: 'linear-gradient(135deg, #5a2828 0%, #8b3a3a 50%, #5a2828 100%)', label: 'OSMANLI KUVVETLERİ' },
        british: { bg: 'linear-gradient(135deg, #2a4a5a 0%, #4a6a82 50%, #2a4a5a 100%)', label: 'İNGİLİZ KUVVETLERİ' },
        anzac: { bg: 'linear-gradient(135deg, #2a4a22 0%, #5a7a52 50%, #2a4a22 100%)', label: 'ANZAC KUVVETLERİ' },
        french: { bg: 'linear-gradient(135deg, #3a2a4a 0%, #6a5a7a 50%, #3a2a4a 100%)', label: 'FRANSIZ KUVVETLERİ' },
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
        bannerEl.innerHTML = `<img src="assets/icons/${iconInfo.icon}.png" width="28" height="28" alt="" style="opacity:.85"><span>${banner.label}</span>`;
    }

    // Komutan portresi
    const portraitEl = document.getElementById('panelPortrait');
    const portrait = getCommanderPortrait(u.id);
    if (portraitEl) {
        if (portrait) {
            portraitEl.style.display = 'block';
            portraitEl.innerHTML = `
                <div class="portrait-frame">
                    <img src="${portrait.url}" alt="${portrait.caption}" class="portrait-img" loading="lazy"
                         onerror="this.parentElement.parentElement.style.display='none'"/>
                    <div class="portrait-caption">${portrait.caption}</div>
                    <div class="portrait-credit">${portrait.credit}</div>
                </div>`;
        } else {
            portraitEl.style.display = 'none';
            portraitEl.innerHTML = '';
        }
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

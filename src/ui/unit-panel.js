// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birim Detay Paneli
// Birim tıklayınca açılan sağ panel — komutan portresi dahil
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260407-manual-r1';
import { getUnitIcon } from '../data/icon-registry.js';
import { getCommanderPortrait } from '../data/commander-portraits.js';
import { deriveUnitIntent } from '../engine/unit-intelligence.js';

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

function setPanelA11yState(panel, open) {
    panel.toggleAttribute('inert', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
}

/** Birim detay panelini aç */
export function showUnitPanel(u, d, phase, animData) {
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

    // Derive intent data (action, location, target, contact)
    const intent = deriveUnitIntent(u, phase || null, d || null, animData || null);

    document.getElementById('panelUnitName').textContent = u.name || '-';
    document.getElementById('panelUnitCommander').textContent = u.commander || '-';
    document.getElementById('panelUnitStrength').textContent = u.strength ? `${u.strength.toLocaleString('tr-TR')} asker` : '-';
    document.getElementById('panelUnitAction').textContent = intent.actionLabel || '-';
    document.getElementById('panelUnitLocation').textContent = intent.currentLocationName || '-';
    document.getElementById('panelUnitTarget').textContent = intent.targetLocationName || '-';
    document.getElementById('panelUnitContact').textContent = intent.contactLabel || '-';
    document.getElementById('panelUnitStatus').textContent = intent.statusText || 'Bilinmiyor';
    document.getElementById('panelUnitObjective').textContent = intent.objectiveText || 'Bilinmiyor';
    document.getElementById('panelUnitOutcome').textContent = intent.outcomeText || 'Bilinmiyor';
    document.getElementById('panelUnitDescription').textContent = u.description || '-';
    setPanelA11yState(panel, true);
    panel.classList.add('open');
    requestAnimationFrame(() => document.getElementById('closeUnitPanelBtn')?.focus());
}

/** Birim detay panelini kapat */
export function hideUnitPanel() {
    const panel = document.getElementById('unitPanel');
    if (panel) {
        if (panel.contains(document.activeElement)) {
            document.getElementById('battleMap')?.focus?.();
        }
        panel.style.transform = '';
        panel.classList.remove('open');
        setPanelA11yState(panel, false);
    }
}

// Swipe-to-close logic
let startY = 0;
let currentY = 0;
let isDragging = false;

function initSwipeToClose() {
    const panel = document.getElementById('unitPanel');
    if (!panel) return;

    panel.addEventListener('touchstart', (e) => {
        // Only allow dragging from the top area (the pseudo-element handle or near it) to avoid blocking scroll inside panel
        if (panel.scrollTop === 0) {
            startY = e.touches[0].clientY;
            isDragging = true;
            panel.style.transition = 'none';
        }
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
            panel.style.transform = `translateY(${diff}px)`;
            if (e.cancelable) e.preventDefault();
        }
    }, { passive: false });

    panel.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        const diff = currentY - startY;
        if (diff > 100) {
            hideUnitPanel();
        } else {
            panel.style.transform = ''; // snap back
        }
        currentY = 0;
    });
}
// Initialize immediately since script is deferred or loaded dynamically
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const panel = document.getElementById('unitPanel');
            if (panel) setPanelA11yState(panel, false);
            initSwipeToClose();
        });
    } else {
        const panel = document.getElementById('unitPanel');
        if (panel) setPanelA11yState(panel, false);
        initSwipeToClose();
    }
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
        const currentIso = String(phase.isoStart || phase.date);
        const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso] || null;
        showUnitPanel(unit, phaseData, phase, animData);
    });
}

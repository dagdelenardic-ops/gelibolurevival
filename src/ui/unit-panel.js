// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birim Detay Paneli
// Birim tıklayınca açılan sağ panel — komutan portresi dahil
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260508-sprint-r1';
import { getUnitIcon } from '../data/icon-registry.js';
import { getCommanderPortrait } from '../data/commander-portraits.js';
import { deriveUnitIntent } from '../engine/unit-intelligence.js?v=20260508-sprint-r1';
import { getUnitVitals, formatStrength } from '../data/casualty-model.js';

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
    panel.hidden = !open;
    panel.toggleAttribute('inert', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function getFocusableElements(root) {
    return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.disabled && el.offsetParent !== null);
}

function trapPanelFocus(event, panel) {
    if (event.key === 'Escape') {
        event.preventDefault();
        hideUnitPanel();
        return;
    }
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(panel);
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

function renderVitals(unit, phase, animData) {
    if (!unit.strength) return '-';
    const isoDate = String(phase?.isoStart || '');
    const { unitState, intensity } = getAnimatedUnitState(unit, animData);
    const vitals = getUnitVitals(unit.id, isoDate, intensity, unitState, unit.strength);
    const current = vitals.current.toLocaleString('tr-TR');
    const base = vitals.base.toLocaleString('tr-TR');
    const loss = vitals.loss.toLocaleString('tr-TR');
    const lossPct = Math.round(vitals.lossRatio * 100);
    const strengthPct = Math.round(vitals.ratio * 100);

    return `
        <div class="panel-vitals">
            <div><strong>${current}</strong> / ${base} asker</div>
            <div class="panel-vitals-sub">Kayıp: ${loss} (${lossPct}%) · Stamina: ${vitals.staminaPercent}% ${vitals.staminaLabel}</div>
            <div class="panel-vitals-bars" aria-hidden="true">
                <span style="--vital-width:${strengthPct}%;--vital-color:${vitals.ratio > .62 ? '#72ad67' : vitals.ratio > .38 ? '#d9a94f' : '#c95b4d'}"></span>
                <span style="--vital-width:${vitals.staminaPercent}%;--vital-color:${vitals.stamina > .62 ? '#7eaec8' : vitals.stamina > .38 ? '#d9a94f' : '#c95b4d'}"></span>
            </div>
            <div class="panel-vitals-sub">Bugünkü baskı: ${intensity}/10 · ${formatStrength(vitals.todayLoss || 0)} tahmini günlük kayıp</div>
        </div>`;
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
    document.getElementById('panelUnitStrength').innerHTML = renderVitals(u, phase, animData);
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

    panel.addEventListener('keydown', (event) => trapPanelFocus(event, panel));
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
    tg.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const el = ev.target.closest('.unit-token');
        if (!el) return;
        ev.preventDefault();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
}

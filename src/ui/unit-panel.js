// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birim Detay Paneli
// Birim tıklayınca açılan sağ panel — komutan portresi dahil
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260622-hp-polish-r1';
import { getUnitIcon } from '../data/icon-registry.js?v=20260622-hp-polish-r1';
import { getCommanderPortrait } from '../data/commander-portraits.js?v=20260622-hp-polish-r1';
import { deriveUnitIntent } from '../engine/unit-intelligence.js?v=20260622-hp-polish-r1';
import { getUnitVitals, formatStrength } from '../data/casualty-model.js?v=20260622-hp-polish-r1';
import { getUnitDossier } from '../data/unit-dossiers.js?v=20260622-hp-polish-r1';
import { getHistoricalSourcesForIds, HISTORICAL_ROUTES } from '../data/historical-map-data.js?v=20260622-hp-polish-r1';
import { getUnitItinerary } from '../data/campaign-movement.js?v=20260622-hp-polish-r1';

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

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function getStrengthNoun(unit) {
    return unit?.type === 'deniz' || unit?.entityType === 'ship' || unit?.entityType === 'landing_boat'
        ? 'personel'
        : 'asker';
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
    const noun = getStrengthNoun(unit);

    return `
        <div class="panel-vitals">
            <div><strong>${current}</strong> / ${base} ${noun}</div>
            <div class="panel-vitals-sub">Kayıp: ${loss} (${lossPct}%) · Direnç: ${vitals.staminaPercent}% ${vitals.staminaLabel}</div>
            <div class="panel-vitals-bars" aria-hidden="true">
                <span style="--vital-width:${strengthPct}%;--vital-color:${vitals.ratio > .62 ? '#72ad67' : vitals.ratio > .38 ? '#d9a94f' : '#c95b4d'}"></span>
                <span style="--vital-width:${vitals.staminaPercent}%;--vital-color:${vitals.stamina > .62 ? '#7eaec8' : vitals.stamina > .38 ? '#d9a94f' : '#c95b4d'}"></span>
            </div>
            <div class="panel-vitals-sub">Bugünkü baskı: ${intensity}/10 · ${formatStrength(vitals.todayLoss || 0)} tahmini günlük kayıp</div>
        </div>`;
}

function ensurePanelExtensions(panel) {
    if (document.getElementById('panelDossier')) return;
    const title = panel.querySelector('.unit-panel-title');
    if (!title) return;
    title.insertAdjacentHTML('afterend', `
        <section id="panelDossier" class="panel-dossier"></section>
        <section id="panelItinerary" class="panel-itinerary"></section>
        <section id="panelEvidence" class="panel-evidence"></section>
        <section id="panelDossierMedia" class="panel-dossier-media"></section>
    `);
}

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
function formatIsoShort(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso || '';
    return `${Number(m[3])} ${TR_MONTHS[Number(m[2]) - 1] || ''} ${m[1]}`;
}

const LEG_GLYPH = { march: '→', hold: '◧', land: '⚓' };

/** Birimin tüm sefer güzergâhı (nereden→nereye, gerekçe, kaynak) — wiki bölümü */
function renderItinerary(unitId, currentIso) {
    const legs = getUnitItinerary(unitId);
    if (!legs.length) return '';
    const rows = legs.map((leg, i) => {
        const next = legs[i + 1];
        const active = currentIso && leg.iso <= currentIso && (!next || next.iso > currentIso);
        const fromTo = leg.moved
            ? `${escapeHtml(leg.fromLabel)} <span class="leg-arrow">→</span> ${escapeHtml(leg.toLabel)}`
            : escapeHtml(leg.fromLabel);
        const glyph = leg.retreat ? '↩' : (LEG_GLYPH[leg.kind] || '•');
        return `<li class="itinerary-leg${active ? ' is-active' : ''}${leg.retreat ? ' is-retreat' : ''}${leg.naval ? ' is-naval' : ''}">
            <span class="leg-date">${escapeHtml(formatIsoShort(leg.iso))}</span>
            <span class="leg-glyph" aria-hidden="true">${glyph}</span>
            <span class="leg-body">
                <span class="leg-route">${fromTo}</span>
                ${leg.event ? `<small class="leg-event">${escapeHtml(leg.event)}</small>` : ''}
            </span>
        </li>`;
    }).join('');
    return `
        <div class="panel-section-title">Hareket Güzergâhı</div>
        <ol class="itinerary-list">${rows}</ol>
    `;
}

function confidenceLabel(value) {
    const key = String(value || '').toLowerCase();
    if (key === 'high') return 'Yüksek güven';
    if (key === 'medium') return 'Orta güven';
    if (key === 'low') return 'Düşük güven';
    return 'Kaynak yok';
}

function evidenceLabel(value) {
    const key = String(value || '').toLowerCase();
    if (key === 'exact') return 'Kesin anchor';
    if (key === 'route') return 'Kaynaklı rota';
    if (key === 'frontline') return 'Cephe hattı';
    if (key === 'inferred') return 'Tarihsel çıkarım';
    return 'Kanıt yok';
}

function renderEvidence(d) {
    const sourceIds = Array.isArray(d?.historicalSourceIds) ? d.historicalSourceIds : [];
    const sources = getHistoricalSourcesForIds(sourceIds);
    const sourceMarkup = sources.length
        ? sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>`).join('')
        : '<span>Kaynak kaydı yok; konum fallback veriden geliyor.</span>';
    return `
        <div class="panel-section-title">Konum Kanıtı</div>
        <div class="panel-evidence-grid">
            <span>${evidenceLabel(d?.historicalEvidence)}</span>
            <strong>${confidenceLabel(d?.historicalConfidence)}</strong>
        </div>
        ${d?.historicalReferenceId ? `<div class="panel-evidence-ref">${escapeHtml(d.historicalReferenceId)}</div>` : ''}
        ${d?.historicalNote ? `<p>${escapeHtml(d.historicalNote)}</p>` : ''}
        <div class="panel-source-list">${sourceMarkup}</div>
    `;
}

function renderDossier(dossier, unitDescription) {
    const notes = Array.isArray(dossier.timelineNotes) ? dossier.timelineNotes : [];
    return `
        <div class="panel-section-title">Birim Dosyası & Tarihsel Bağlam</div>
        ${unitDescription ? `<p class="unit-historical-desc" style="font-style: italic; color: #f2dfab; margin-bottom: 12px; line-height: 1.5; font-size: 0.84rem;">${escapeHtml(unitDescription)}</p>` : ''}
        <p>${escapeHtml(dossier.summary)}</p>
        ${notes.length ? `<ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : ''}
    `;
}

function renderDossierMedia(dossier) {
    const media = Array.isArray(dossier.media) ? dossier.media.filter((item) => item.type === 'image').slice(0, 2) : [];
    if (!media.length) return '';
    return media.map((item) => `
        <figure class="panel-media-card">
            <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption)}" loading="lazy" onerror="this.closest('figure').style.display='none'">
            <figcaption>${escapeHtml(item.caption)}<span>${escapeHtml(item.credit || '')}</span></figcaption>
        </figure>
    `).join('');
}

/** Birim detay panelini aç */
export function showUnitPanel(u, d, phase, animData) {
    const panel = document.getElementById('unitPanel');
    if (!panel || !u) return;
    ensurePanelExtensions(panel);

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
    const dossier = getUnitDossier(u.id);
    const dossierEl = document.getElementById('panelDossier');
    const itineraryEl = document.getElementById('panelItinerary');
    const evidenceEl = document.getElementById('panelEvidence');
    const mediaEl = document.getElementById('panelDossierMedia');

    if (dossierEl) dossierEl.innerHTML = renderDossier(dossier, u.description);
    if (itineraryEl) itineraryEl.innerHTML = renderItinerary(u.id, String(phase?.isoStart || ''));
    if (evidenceEl) evidenceEl.innerHTML = renderEvidence(d || {});
    if (mediaEl) mediaEl.innerHTML = renderDossierMedia(dossier);

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
    if (tg && tg.dataset.clickBound !== '1') {
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

    // Also bind clicks on tactical route groups (arrows) AND daily movement
    // trails (gün-gün hareket okları) to open unit details!
    const routesLayer = document.getElementById('layer-routes');
    if (routesLayer && routesLayer.dataset.clickBound !== '1') {
        routesLayer.dataset.clickBound = '1';
        const openForUnitId = (unitId) => {
            const unit = BATTLE_DATA.units.find((u) => u.id === unitId);
            if (!unit) return;
            const phase = BATTLE_DATA.phases[getCurrentPhaseIndex()];
            const phaseData = unit.phases[phase.id] || { status: 'Bilinmiyor', objective: 'Bilinmiyor', outcome: 'Bilinmiyor' };
            const currentIso = String(phase.isoStart || phase.date);
            const animData = window.ANIMATION_EVENTS_BY_DATE?.[currentIso] || null;
            showUnitPanel(unit, phaseData, phase, animData);
        };
        routesLayer.addEventListener('click', (ev) => {
            const trail = ev.target.closest('.unit-move-trail');
            if (trail && trail.dataset.unitId) { openForUnitId(trail.dataset.unitId); return; }
            const el = ev.target.closest('.tactical-route-group');
            if (!el) return;
            const route = HISTORICAL_ROUTES.find((r) => r.id === el.dataset.routeId);
            if (route && route.unitIds.length) openForUnitId(route.unitIds[0]);
        });
        routesLayer.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const trail = ev.target.closest('.unit-move-trail');
            if (!trail || !trail.dataset.unitId) return;
            ev.preventDefault();
            openForUnitId(trail.dataset.unitId);
        });
    }
}

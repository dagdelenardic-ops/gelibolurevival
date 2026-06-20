// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Günlük Hareket Defteri
// "Siteyi açan, o gün hangi deniz ve kara biriminin NEREDEN NEREYE
//  gittiğini görsün." — campaign-movement.js (tek doğruluk kaynağı)
//  üzerinden gün-gün hareket özeti. Her satır tıklanınca birim wiki
//  paneli açılır.
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260618-3d-spectacle-r4';
import { resolveCampaignMovement } from '../data/campaign-movement.js?v=20260618-3d-spectacle-r4';
import { showUnitPanel } from './unit-panel.js?v=20260618-3d-spectacle-r4';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
function formatIsoShort(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso || '';
    return `${Number(m[3])} ${TR_MONTHS[Number(m[2]) - 1] || ''} ${m[1]}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isNaval(unit) {
    return unit.type === 'deniz' || unit.entityType === 'landing_boat';
}

let lastPhase = null;
let lastAnimData = null;
// Başlangıçta KAPALI (hem mobil hem masaüstü): açık panel narration'ı eziyordu.
// Kullanıcı isterse ⚑ Hareket Defteri barına tıklayıp açar — opt-in kalsın,
// autoplay deneyimi temiz başlasın.
let collapsedPref = true;

function ensureLedgerDom() {
    let el = document.getElementById('movementLedger');
    if (el) return el;
    el = document.createElement('aside');
    el.id = 'movementLedger';
    el.className = 'movement-ledger';
    el.setAttribute('aria-label', 'Günlük hareket defteri');
    el.innerHTML = `
        <button type="button" class="ledger-toggle" id="ledgerToggle" aria-expanded="true">
            <span class="ledger-toggle-icon" aria-hidden="true">⚑</span>
            <span class="ledger-toggle-label">Hareket Defteri</span>
            <span class="ledger-toggle-count" id="ledgerCount"></span>
            <span class="ledger-toggle-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="ledger-body" id="ledgerBody">
            <div class="ledger-date" id="ledgerDate"></div>
            <div class="ledger-content" id="ledgerContent"></div>
        </div>`;
    document.body.appendChild(el);

    const toggle = el.querySelector('#ledgerToggle');
    toggle.addEventListener('click', () => setCollapsed(!el.classList.contains('is-collapsed')));

    el.querySelector('#ledgerContent').addEventListener('click', (ev) => {
        const row = ev.target.closest('.ledger-row');
        if (!row || !row.dataset.unitId) return;
        openUnitById(row.dataset.unitId);
    });
    el.querySelector('#ledgerContent').addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const row = ev.target.closest('.ledger-row');
        if (!row || !row.dataset.unitId) return;
        ev.preventDefault();
        openUnitById(row.dataset.unitId);
    });

    setCollapsed(collapsedPref);
    return el;
}

function setCollapsed(collapsed) {
    const el = document.getElementById('movementLedger');
    if (!el) return;
    collapsedPref = collapsed;
    el.classList.toggle('is-collapsed', collapsed);
    const toggle = el.querySelector('#ledgerToggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
}

function openUnitById(unitId) {
    const unit = BATTLE_DATA.units.find((u) => u.id === unitId);
    if (!unit || !lastPhase) return;
    const phaseData = unit.phases[lastPhase.id] || { status: 'Bilinmiyor', objective: 'Bilinmiyor', outcome: 'Bilinmiyor' };
    showUnitPanel(unit, phaseData, lastPhase, lastAnimData);
}

function legGlyph(leg, naval) {
    if (leg.retreat) return '↩';
    if (leg.legKind === 'land') return '⚓';
    if (leg.moved) return '→';
    return naval ? '≈' : '◧';
}

function isMover(leg) {
    return !!(leg.moved || leg.retreat || leg.legKind === 'land');
}

function renderRow(entry) {
    const { unit, leg, faction } = entry;
    const naval = isNaval(unit);
    let route;
    if (leg.moved) {
        route = `<span class="ledger-from">${escapeHtml(leg.fromLabel)}</span> <span class="ledger-arrow">→</span> <span class="ledger-to">${escapeHtml(leg.toLabel)}</span>`;
    } else if (leg.legKind === 'land') {
        route = `<span class="ledger-to">${escapeHtml(leg.fromLabel)}</span> <span class="ledger-hold">· çıkarma</span>`;
    } else {
        route = `<span class="ledger-from">${escapeHtml(leg.fromLabel)}</span> <span class="ledger-hold">· ${leg.retreat ? 'çekiliyor' : 'mevzide'}</span>`;
    }
    return `<button type="button" class="ledger-row${isMover(leg) ? ' is-moving' : ''}${leg.retreat ? ' is-retreat' : ''}" data-unit-id="${escapeHtml(unit.id)}">
        <span class="ledger-dot" style="--unit-color:${escapeHtml(faction.colorLight)}"></span>
        <span class="ledger-glyph" aria-hidden="true">${legGlyph(leg, naval)}</span>
        <span class="ledger-main">
            <span class="ledger-name">${escapeHtml(unit.name)}${naval ? ' <span class="ledger-tag">⚓</span>' : ''}</span>
            <span class="ledger-route">${route}</span>
            ${leg.legEvent ? `<small class="ledger-reason">${escapeHtml(leg.legEvent)}</small>` : ''}
        </span>
    </button>`;
}

/**
 * O günün hareket defterini güncelle.
 * @param phase aktif faz (isoStart taşır)
 * @param nextPositions o gün haritada görünür birimlerin {id:{x,y}} haritası
 * @param animData o günün animasyon verisi (panel açılışı için)
 */
export function updateMovementLedger(phase, nextPositions = {}, animData = null) {
    if (!phase) return;
    lastPhase = phase;
    lastAnimData = animData;
    const el = ensureLedgerDom();
    const iso = String(phase.isoStart || '');

    const entries = Object.keys(nextPositions)
        .map((unitId) => {
            const unit = BATTLE_DATA.units.find((u) => u.id === unitId);
            if (!unit) return null;
            const leg = resolveCampaignMovement(unitId, iso);
            if (!leg) return null; // hareket rehberi kapsamı dışındaki birimler (HQ/ihtiyat)
            return { unit, leg, faction: BATTLE_DATA.factions[unit.faction] || {} };
        })
        .filter(Boolean);

    const movers = entries.filter((e) => isMover(e.leg));
    const holders = entries.filter((e) => !isMover(e.leg));

    // Hareket edenleri deniz/kara grupla; önce hareket, sonra tutanlar.
    const sortFn = (a, b) => (isNaval(a.unit) === isNaval(b.unit) ? 0 : isNaval(a.unit) ? 1 : -1);
    movers.sort(sortFn);
    holders.sort(sortFn);

    const dateEl = el.querySelector('#ledgerDate');
    if (dateEl) dateEl.textContent = `${formatIsoShort(iso)} — bu gün`;

    const countEl = el.querySelector('#ledgerCount');
    if (countEl) countEl.textContent = movers.length ? String(movers.length) : '';

    const content = el.querySelector('#ledgerContent');
    if (!content) return;

    let html = '';
    if (movers.length) {
        html += `<div class="ledger-group-title">Bugün hareket edenler (${movers.length})</div>`;
        html += movers.map(renderRow).join('');
    } else {
        html += `<div class="ledger-empty">Bugün haritada belirgin birlik hareketi yok — cephe tutuluyor.</div>`;
    }
    if (holders.length) {
        html += `<div class="ledger-group-title is-muted">Cephede tutanlar (${holders.length})</div>`;
        html += holders.map(renderRow).join('');
    }
    content.innerHTML = html;
}

export function initMovementLedger() {
    // Başlangıçta KAPALI (hem masaüstü hem mobil): açık panel sol narration'ı
    // eziyordu. Kullanıcı ⚑ barına tıklayıp açar — autoplay temiz başlar.
    collapsedPref = true;
    ensureLedgerDom();
}

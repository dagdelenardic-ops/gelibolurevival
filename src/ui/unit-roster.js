// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Pause Unit Roster
// Lists active rendered units while playback is paused.
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260508-sprint-r1';
import { showUnitPanel } from './unit-panel.js?v=20260508-sprint-r1';

let rosterRoot = null;
let rosterBound = false;
let lastPhaseIndex = 0;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function confidenceLabel(value) {
    const key = String(value || '').toLowerCase();
    if (key === 'high') return 'yüksek';
    if (key === 'medium') return 'orta';
    if (key === 'low') return 'düşük';
    return 'kanıt yok';
}

function ensureRosterRoot() {
    if (rosterRoot) return rosterRoot;
    rosterRoot = document.createElement('aside');
    rosterRoot.id = 'unitRoster';
    rosterRoot.className = 'unit-roster';
    rosterRoot.setAttribute('aria-label', 'Duraklatılmış fazdaki aktif birlikler');
    rosterRoot.setAttribute('aria-hidden', 'true');
    rosterRoot.setAttribute('inert', '');
    rosterRoot.hidden = true;
    rosterRoot.innerHTML = `
        <div class="unit-roster-header">
            <div>
                <span class="unit-roster-kicker">Pause Roster</span>
                <strong id="unitRosterTitle">Aktif Birlikler</strong>
            </div>
            <button type="button" class="unit-roster-close" data-roster-action="close" aria-label="Birlik listesini kapat">×</button>
        </div>
        <div id="unitRosterMeta" class="unit-roster-meta"></div>
        <div id="unitRosterList" class="unit-roster-list"></div>
    `;
    document.body.appendChild(rosterRoot);
    bindRosterEvents();
    return rosterRoot;
}

function setRosterOpen(open) {
    const root = ensureRosterRoot();
    root.hidden = !open;
    root.toggleAttribute('inert', !open);
    root.setAttribute('aria-hidden', open ? 'false' : 'true');
    root.classList.toggle('open', open);
    document.body.dataset.pauseRoster = open ? 'open' : 'closed';
    if (open) requestAnimationFrame(() => root.querySelector('.unit-roster-close')?.focus());
}

function getRenderedUnitEntries() {
    return [...document.querySelectorAll('#unitTokens .unit-token')]
        .map((el) => {
            const unit = BATTLE_DATA.units.find((item) => item.id === el.dataset.unitId);
            if (!unit) return null;
            return {
                unit,
                action: el.dataset.actionLabel || 'Bilinmiyor',
                location: el.dataset.currentLocationName || 'Konum yok',
                target: el.dataset.targetLocationName || '',
                confidence: el.dataset.confidence || '',
                evidence: el.dataset.evidence || '',
                lossRatio: Number(el.dataset.lossRatio || 0),
                stamina: Number(el.dataset.stamina || 1)
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const factionOrder = ['ottoman', 'british', 'anzac', 'french'];
            return factionOrder.indexOf(a.unit.faction) - factionOrder.indexOf(b.unit.faction)
                || a.unit.name.localeCompare(b.unit.name, 'tr');
        });
}

function renderRosterList(phaseIndex) {
    const phase = BATTLE_DATA.phases[phaseIndex];
    const root = ensureRosterRoot();
    const title = root.querySelector('#unitRosterTitle');
    const meta = root.querySelector('#unitRosterMeta');
    const list = root.querySelector('#unitRosterList');
    const entries = getRenderedUnitEntries();

    if (title) title.textContent = 'Aktif Birlikler';
    if (meta) meta.textContent = `${phase?.date || ''} · ${entries.length} görünür birim`;
    if (!list) return;

    if (!entries.length) {
        list.innerHTML = '<div class="unit-roster-empty">Bu fazda görünür birlik yok.</div>';
        return;
    }

    list.innerHTML = entries.map((entry) => {
        const f = BATTLE_DATA.factions[entry.unit.faction] || BATTLE_DATA.factions.ottoman;
        const stress = entry.stamina <= .35 || entry.lossRatio >= .35 ? 'is-stressed' : '';
        const target = entry.target && entry.target !== entry.location ? ` → ${entry.target}` : '';
        return `<button type="button" class="unit-roster-item ${stress}" data-unit-id="${escapeHtml(entry.unit.id)}">
            <span class="unit-roster-dot" style="--unit-color:${escapeHtml(f.colorLight)}"></span>
            <span class="unit-roster-main">
                <strong>${escapeHtml(entry.unit.name)}</strong>
                <small>${escapeHtml(entry.action)} · ${escapeHtml(entry.location)}${escapeHtml(target)}</small>
            </span>
            <span class="unit-roster-confidence">${confidenceLabel(entry.confidence)}</span>
        </button>`;
    }).join('');
}

function openUnitFromRoster(unitId) {
    const unit = BATTLE_DATA.units.find((item) => item.id === unitId);
    const phase = BATTLE_DATA.phases[lastPhaseIndex];
    if (!unit || !phase) return;
    const phaseData = unit.phases[phase.id] || { status: 'Bilinmiyor', objective: 'Bilinmiyor', outcome: 'Bilinmiyor' };
    const animData = window.ANIMATION_EVENTS_BY_DATE?.[String(phase.isoStart || phase.date)] || null;
    showUnitPanel(unit, phaseData, phase, animData);
}

function bindRosterEvents() {
    if (rosterBound || !rosterRoot) return;
    rosterBound = true;
    rosterRoot.addEventListener('click', (event) => {
        const close = event.target.closest('[data-roster-action="close"]');
        if (close) {
            hideUnitRoster();
            return;
        }
        const item = event.target.closest('.unit-roster-item');
        if (item) openUnitFromRoster(item.dataset.unitId);
    });
    rosterRoot.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            hideUnitRoster();
        }
    });
}

export function showUnitRoster(phaseIndex) {
    lastPhaseIndex = phaseIndex;
    renderRosterList(phaseIndex);
    setRosterOpen(true);
}

export function hideUnitRoster() {
    if (!rosterRoot) return;
    setRosterOpen(false);
}

export function refreshUnitRoster(phaseIndex) {
    lastPhaseIndex = phaseIndex;
    if (!rosterRoot || !rosterRoot.classList.contains('open')) return;
    renderRosterList(phaseIndex);
}

// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Timeline Renderer
// Timeline UI oluşturma, aktif marker yönetimi
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { normalizeDateText } from '../engine/date-utils.js';
import { getWeeklyGuide, getActiveWeekIndex, getPhaseIndexByIso } from '../engine/phase-engine.js';

/** Timeline DOM'unu oluştur */
export function renderTimeline(setActivePhase, toggleAutoPlay) {
    const WEEKLY_GUIDE = getWeeklyGuide();
    const guideEntries = WEEKLY_GUIDE.length
        ? WEEKLY_GUIDE
        : BATTLE_DATA.phases.map((p, i) => ({
            id: `rehber-${i}`,
            startIso: p.isoStart || normalizeDateText(p.date, i),
            endIso: p.isoStart || normalizeDateText(p.date, i),
            label: p.date,
            title: p.title,
            importance: p.importance || 'minor'
        }));

    document.querySelector('.timeline').innerHTML = `
    <div class="timeline-label">Olay Akışı Kronolojisi</div>
    <div class="timeline-controls"><button class="timeline-btn" id="playPauseBtn" type="button" aria-label="Animasyonu başlat">Başlat</button></div>
    <div class="timeline-track"><div class="timeline-line"></div><div class="timeline-phases">
      ${guideEntries.map((w, i) => `<button class="phase-marker ${w.importance === 'major' ? 'major' : 'minor'}" type="button" data-week-index="${i}" data-start-iso="${w.startIso}" aria-label="${w.label}">
        <span class="phase-dot"></span>
        <span class="phase-tooltip">${w.title}<span class="phase-tooltip-date">${w.label}</span></span>
      </button>`).join('')}
    </div></div>`;

    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', toggleAutoPlay);
    }
    document.querySelectorAll('.phase-marker').forEach((el) => el.addEventListener('click', () => {
        const startIso = el.dataset.startIso;
        setActivePhase(getPhaseIndexByIso(startIso));
    }));
}

/** Aktif timeline marker'ını güncelle */
let cachedPhaseMarkers = null;
let lastActiveWeekIndex = -1;

export function updateTimelineActiveState(currentPhaseIndex) {
    const activeWeekIndex = getActiveWeekIndex(currentPhaseIndex);
    // Aynı hafta indeksiyse DOM dokunma
    if (activeWeekIndex === lastActiveWeekIndex) return;
    lastActiveWeekIndex = activeWeekIndex;

    if (!cachedPhaseMarkers) cachedPhaseMarkers = [...document.querySelectorAll('.phase-marker')];
    cachedPhaseMarkers.forEach((el) => {
        el.classList.toggle('active', Number(el.dataset.weekIndex) === activeWeekIndex);
    });
}

/** Aktif marker'ı görünür alana kaydır */
export function focusActiveTimelineMarker() {
    const marker = document.querySelector('.phase-marker.active');
    if (!marker || typeof marker.scrollIntoView !== 'function') return;
    marker.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Timeline Renderer
// Timeline UI oluşturma, aktif marker yönetimi
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260523-markers-r2';
import { normalizeDateText } from '../engine/date-utils.js?v=20260523-markers-r2';
import { getWeeklyGuide, getActiveWeekIndex, getPhaseIndexByIso, getMobileStoryChapter, getMobileStoryChapters } from '../engine/phase-engine.js?v=20260523-markers-r2';

const isMobileTimeline = typeof window !== 'undefined' && window.innerWidth <= 768;

/** Timeline DOM'unu oluştur */
export function renderTimeline(setActivePhase, toggleAutoPlay) {
    cachedPhaseMarkers = null;
    lastActiveWeekIndex = -1;
    lastActiveChapterId = '';

    if (isMobileTimeline) {
        const timeline = document.querySelector('.timeline');
        if (timeline) timeline.innerHTML = '';
        return;
    }

    const WEEKLY_GUIDE = getWeeklyGuide();
    const chapters = getMobileStoryChapters();
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
    <div class="timeline-chapters" aria-label="Kampanya bölümleri">
      ${chapters.map((chapter) => `<button class="timeline-chapter-marker" type="button" data-chapter-id="${chapter.id}" data-start-iso="${chapter.startIso}" aria-label="${chapter.title} bölümüne git">${chapter.shortTitle}</button>`).join('')}
    </div>
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
    document.querySelectorAll('.timeline-chapter-marker').forEach((el) => el.addEventListener('click', () => {
        const startIso = el.dataset.startIso;
        setActivePhase(getPhaseIndexByIso(startIso));
    }));
}

/** Aktif timeline marker'ını güncelle */
let cachedPhaseMarkers = null;
let lastActiveWeekIndex = -1;
let lastActiveChapterId = '';

export function updateTimelineActiveState(currentPhaseIndex) {
    const phase = BATTLE_DATA.phases[currentPhaseIndex];
    const chapter = getMobileStoryChapter(phase?.isoStart);
    document.querySelectorAll('.timeline-chapter-marker, .story-chapter-marker, .guided-chapter-marker').forEach((el) => {
        const active = !!chapter && el.dataset.chapterId === chapter.id;
        el.classList.toggle('active', active);
        el.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (isMobileTimeline) {
        if (!chapter || chapter.id === lastActiveChapterId) return;
        lastActiveChapterId = chapter.id;
        cachedPhaseMarkers = [...document.querySelectorAll('.story-chapter-marker')];
        cachedPhaseMarkers.forEach((el) => {
            el.classList.toggle('active', el.dataset.chapterId === chapter.id);
        });
        return;
    }

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
    const marker = document.querySelector('.timeline .phase-marker.active');
    if (marker && typeof marker.scrollIntoView === 'function') {
        marker.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    const storyMarker = document.querySelector('.story-chapter-strip .story-chapter-marker.active');
    const strip = storyMarker?.closest('.story-chapter-strip');
    if (!storyMarker || !strip || typeof strip.scrollTo !== 'function') return;
    const left = storyMarker.offsetLeft - ((strip.clientWidth - storyMarker.offsetWidth) / 2);
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Otomatik Oynatma Kontrolcüsü
// Adaptive hız: major fazlar 6s, minor fazlar 2.5s, narration uzunluğuna göre ek süre
// ══════════════════════════════════════════════════════════════

import { isMajorPhase } from '../engine/phase-engine.js?v=20260622-hp-polish-r1';
import { BATTLE_DATA } from '../data/battle-data.js?v=20260622-hp-polish-r1';
import { isMobile, isTablet } from '../engine/responsive.js?v=20260622-hp-polish-r1';
const MINOR_INTERVAL = 3500; const MINOR_INTERVAL_M = 4000; const MINOR_INTERVAL_T = 3800;
const MAJOR_INTERVAL = 8000; const MAJOR_INTERVAL_M = 9000; const MAJOR_INTERVAL_T = 8500;
const MAX_INTERVAL = 12000;  const MAX_INTERVAL_M = 10000;  const MAX_INTERVAL_T = 11000;
const READING_WPM = 165;     const READING_WPM_M = 130;     const READING_WPM_T = 150;
const MIN_READING_WORDS = 28; const MIN_READING_WORDS_M = 18; const MIN_READING_WORDS_T = 24;

let autoplayTimer = null;
let isAutoPlaying = false;

// Sessiz dönemler — büyük olay olmayan aralıklar hızlı geçer
const QUIET_PERIODS = [
    { start: '1914-11-04', end: '1915-02-18' },  // İlk bombardıman sonrası → deniz harekâtı öncesi
    { start: '1915-08-25', end: '1915-12-06' },  // Anafartalar sonrası → tahliye kararı öncesi
];

function isQuietPeriod(isoDate) {
    if (!isoDate) return false;
    return QUIET_PERIODS.some(p => isoDate >= p.start && isoDate <= p.end);
}

function countReadableWords(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .length;
}

function _pick(mobile, tablet, desktop) {
    if (isMobile()) return mobile;
    if (isTablet()) return tablet;
    return desktop;
}

function getReadingExtraMs(phase) {
    const sourceText = phase.mobileSummary || phase.narration || phase.title || '';
    const wordCount = countReadableWords(sourceText);
    if (!wordCount) return 0;

    const effectiveWords = Math.max(0, wordCount - _pick(MIN_READING_WORDS_M, MIN_READING_WORDS_T, MIN_READING_WORDS));
    if (!effectiveWords) return 0;

    const rawMs = Math.round((effectiveWords / _pick(READING_WPM_M, READING_WPM_T, READING_WPM)) * 60_000);
    return Math.min(_pick(2600, 2900, 3200), rawMs);
}

function getIntensityExtraMs(phase) {
    const iso = String(phase?.isoStart || '');
    const animData = typeof window !== 'undefined' ? window.ANIMATION_EVENTS_BY_DATE?.[iso] : null;
    const intensity = Number(animData?.intensity || 0);

    if (intensity >= 8) return _pick(1400, 1600, 1800);
    if (intensity >= 6) return _pick(900, 1050, 1200);
    if (intensity >= 4) return _pick(400, 480, 550);
    return 0;
}

function getAdaptiveInterval(phaseIndex) {
    const phase = BATTLE_DATA.phases[phaseIndex];
    if (!phase) return _pick(MINOR_INTERVAL_M, MINOR_INTERVAL_T, MINOR_INTERVAL);

    if (Number.isFinite(phase.autoplayHoldMs)) {
        return Math.max(2500, _pick(phase.autoplayHoldMs, Math.round(phase.autoplayHoldMs * 0.97), Math.round(phase.autoplayHoldMs * 0.95)));
    }

    const iso = phase.isoStart || '';

    if (isQuietPeriod(iso)) {
        return _pick(3000, 2700, 2500);
    }

    const major = isMajorPhase(phase);

    if (!major && iso >= '1915-02-19' && iso <= '1915-03-15') {
        return _pick(3000, 2700, 2500);
    }

    const base = major
        ? _pick(MAJOR_INTERVAL_M, MAJOR_INTERVAL_T, MAJOR_INTERVAL)
        : _pick(MINOR_INTERVAL_M, MINOR_INTERVAL_T, MINOR_INTERVAL);
    const readingExtra = getReadingExtraMs(phase);
    const intensityExtra = getIntensityExtraMs(phase);

    return Math.min(_pick(MAX_INTERVAL_M, MAX_INTERVAL_T, MAX_INTERVAL), base + readingExtra + intensityExtra);
}

export function getAutoPlayIntervalForPhase(phaseIndex) {
    return getAdaptiveInterval(phaseIndex);
}

function scheduleNext(setActivePhase, getCurrentPhaseIndex) {
    if (!isAutoPlaying) return;
    const nextIndex = getCurrentPhaseIndex() + 1;
    const interval = getAdaptiveInterval(getCurrentPhaseIndex());
    autoplayTimer = setTimeout(() => {
        setActivePhase(nextIndex);
        scheduleNext(setActivePhase, getCurrentPhaseIndex);
    }, interval);
}

export function startAutoPlay(setActivePhase, getCurrentPhaseIndex) {
    if (isAutoPlaying) return;
    isAutoPlaying = true;
    scheduleNext(setActivePhase, getCurrentPhaseIndex);
    refreshAutoPlayButton();
}

export function stopAutoPlay() {
    isAutoPlaying = false;
    if (autoplayTimer) clearTimeout(autoplayTimer);
    autoplayTimer = null;
    refreshAutoPlayButton();
}

export function toggleAutoPlay(setActivePhase, getCurrentPhaseIndex) {
    isAutoPlaying ? stopAutoPlay() : startAutoPlay(setActivePhase, getCurrentPhaseIndex);
}

export function syncAutoPlay(setActivePhase, getCurrentPhaseIndex) {
    if (!isAutoPlaying) return;
    if (autoplayTimer) clearTimeout(autoplayTimer);
    autoplayTimer = null;
    scheduleNext(setActivePhase, getCurrentPhaseIndex);
}

export function refreshAutoPlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (!btn) return;
    btn.textContent = isAutoPlaying ? 'Duraklat' : 'Başlat';
    btn.setAttribute('aria-label', isAutoPlaying ? 'Animasyonu duraklat' : 'Animasyonu başlat');
}

export function getIsAutoPlaying() { return isAutoPlaying; }

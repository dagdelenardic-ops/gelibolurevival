// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Otomatik Oynatma Kontrolcüsü
// Adaptive hız: major fazlar 6s, minor fazlar 2.5s, narration uzunluğuna göre ek süre
// ══════════════════════════════════════════════════════════════

import { isMajorPhase } from '../engine/phase-engine.js?v=20260501-scene-r2';
import { BATTLE_DATA } from '../data/battle-data.js?v=20260407-manual-r1';

const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
const MINOR_INTERVAL = isMobile ? 4000 : 3500;
const MAJOR_INTERVAL = isMobile ? 9000 : 8000;
const MAX_INTERVAL = isMobile ? 10000 : 12000; // Narration readTime üst sınırı
const READING_WPM = isMobile ? 130 : 165;
const MIN_READING_WORDS = isMobile ? 18 : 28;

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

function getReadingExtraMs(phase) {
    const sourceText = phase.mobileSummary || phase.narration || phase.title || '';
    const wordCount = countReadableWords(sourceText);
    if (!wordCount) return 0;

    const effectiveWords = Math.max(0, wordCount - MIN_READING_WORDS);
    if (!effectiveWords) return 0;

    const rawMs = Math.round((effectiveWords / READING_WPM) * 60_000);
    return Math.min(isMobile ? 2600 : 3200, rawMs);
}

function getIntensityExtraMs(phase) {
    const iso = String(phase?.isoStart || '');
    const animData = typeof window !== 'undefined' ? window.ANIMATION_EVENTS_BY_DATE?.[iso] : null;
    const intensity = Number(animData?.intensity || 0);

    if (intensity >= 8) return isMobile ? 1400 : 1800;
    if (intensity >= 6) return isMobile ? 900 : 1200;
    if (intensity >= 4) return isMobile ? 400 : 550;
    return 0;
}

function getAdaptiveInterval(phaseIndex) {
    const phase = BATTLE_DATA.phases[phaseIndex];
    if (!phase) return MINOR_INTERVAL;

    if (Number.isFinite(phase.autoplayHoldMs)) {
        return isMobile ? phase.autoplayHoldMs : Math.max(1200, Math.round(phase.autoplayHoldMs * 0.95));
    }

    const iso = phase.isoStart || '';

    // Sessiz dönemlerde hızlı ama okunabilir geç (fotoğraflar ve bağlam görünsün)
    if (isQuietPeriod(iso)) {
        return isMobile ? 1200 : 800;
    }

    const major = isMajorPhase(phase);

    // Sessiz dönemden çıkışta kademeli yavaşlama (ani 500ms→5s atlama yok)
    // Şubat 19 – Mart 15: orta hız (geçiş dönemi)
    if (!major && iso >= '1915-02-19' && iso <= '1915-03-15') {
        return isMobile ? 3000 : 1800;
    }

    const base = major ? MAJOR_INTERVAL : MINOR_INTERVAL;
    const readingExtra = getReadingExtraMs(phase);
    const intensityExtra = getIntensityExtraMs(phase);

    return Math.min(MAX_INTERVAL, base + readingExtra + intensityExtra);
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

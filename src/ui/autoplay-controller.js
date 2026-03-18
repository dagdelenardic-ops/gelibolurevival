// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Otomatik Oynatma Kontrolcüsü
// Adaptive hız: major fazlar 6s, minor fazlar 2.5s, narration uzunluğuna göre ek süre
// ══════════════════════════════════════════════════════════════

import { isMajorPhase } from '../engine/phase-engine.js';
import { BATTLE_DATA } from '../data/battle-data.js';

const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
const MINOR_INTERVAL = isMobile ? 5000 : 2500;
const MAJOR_INTERVAL = isMobile ? 10000 : 6000;
const CHARS_PER_MS = 0.08; // ~80 karakter/saniye okuma hızı → 1 char = 12.5ms

let autoplayTimer = null;
let isAutoPlaying = false;

function getAdaptiveInterval(phaseIndex) {
    const phase = BATTLE_DATA.phases[phaseIndex];
    if (!phase) return MINOR_INTERVAL;

    const base = isMajorPhase(phase) ? MAJOR_INTERVAL : MINOR_INTERVAL;
    const narrationLen = (phase.narration || '').length;
    const readTime = narrationLen / CHARS_PER_MS;

    return Math.max(base, readTime);
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

export function refreshAutoPlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (!btn) return;
    btn.textContent = isAutoPlaying ? 'Duraklat' : 'Başlat';
    btn.setAttribute('aria-label', isAutoPlaying ? 'Animasyonu duraklat' : 'Animasyonu başlat');
}

export function getIsAutoPlaying() { return isAutoPlaying; }

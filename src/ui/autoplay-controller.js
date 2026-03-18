// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Otomatik Oynatma Kontrolcüsü
// Adaptive hız: major fazlar 6s, minor fazlar 2.5s, narration uzunluğuna göre ek süre
// ══════════════════════════════════════════════════════════════

import { isMajorPhase } from '../engine/phase-engine.js';
import { BATTLE_DATA } from '../data/battle-data.js';

const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
const MINOR_INTERVAL = isMobile ? 3000 : 2500;
const MAJOR_INTERVAL = isMobile ? 7000 : 6000;
const MAX_INTERVAL = isMobile ? 5000 : 8000; // Narration readTime üst sınırı

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

function getAdaptiveInterval(phaseIndex) {
    const phase = BATTLE_DATA.phases[phaseIndex];
    if (!phase) return MINOR_INTERVAL;

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

    return Math.min(MAX_INTERVAL, base);
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

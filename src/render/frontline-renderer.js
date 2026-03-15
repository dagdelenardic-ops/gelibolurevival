// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Frontline & Land Combat FX Renderer
// Cephe hatları, engagement corridors, kontrollü savaş efektleri
// ══════════════════════════════════════════════════════════════

import { FRONTLINES } from '../data/frontlines.js';

/**
 * Aktif cephe hatlarını render et (#layer-zones veya fallback #battleEffects'e).
 * @param {object} campaignPhase - resolveCampaignPhase() çıktısı
 * @param {string} isoDate - mevcut tarih
 */
export function renderFrontlines(campaignPhase, isoDate) {
    const container = document.getElementById('layer-zones') || document.getElementById('battleEffects');
    if (!container) return;

    // Sadece inland_combat ve stalemate fazlarında frontline göster
    if (!['inland_combat', 'stalemate'].includes(campaignPhase.id)) {
        container.innerHTML = '';
        return;
    }

    const activeFrontlines = FRONTLINES.filter((fl) => {
        if (!fl.phase.includes(campaignPhase.id)) return false;
        if (isoDate < fl.dateRange.start || isoDate > fl.dateRange.end) return false;
        return true;
    });

    if (!activeFrontlines.length) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = activeFrontlines.map((fl) => {
        const pathD = fl.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

        // Ana cephe hattı
        const mainLine = `<path class="frontline-segment" data-intensity="${fl.intensity || 'medium'}"
            d="${pathD}" data-frontline-id="${fl.id}"/>`;

        // Engagement corridor (iki taraf arasındaki bölge)
        const corridorPts = fl.points.map((p) => {
            const hw = (fl.corridorWidth || 18) / 2;
            return `<ellipse cx="${p.x}" cy="${p.y}" rx="${hw}" ry="${hw * 0.6}"
                class="engagement-zone" opacity=".12"/>`;
        }).join('');

        return `<g class="frontline-group">${mainLine}${corridorPts}</g>`;
    }).join('');
}

/**
 * Kara savaşı combat FX render et (#layer-combat-fx veya fallback).
 * Kontrollü: her bölgede max 1 temas çizgisi + 2 dust puff.
 * @param {object} campaignPhase
 * @param {object|null} animData - animation-events verisi
 */
export function renderLandCombatFX(campaignPhase, animData) {
    const container = document.getElementById('layer-combat-fx');
    if (!container) return;

    // Naval fazda kara FX yok (naval battery shots effects-renderer'da)
    if (!['inland_combat', 'stalemate', 'landing'].includes(campaignPhase.id)) {
        // Sadece kendi eklediğimiz land FX'i temizle, naval efektleri bırak
        container.querySelectorAll('.land-combat-fx').forEach((el) => el.remove());
        return;
    }

    // Animasyon verisi yoksa veya intensity düşükse FX gösterme
    const intensity = animData?.intensity ?? 0;
    const eventType = animData?.eventType || '';
    const isCombat = eventType === 'COMBAT' || eventType === 'BOMBARDMENT';

    if (!isCombat || intensity < 3) {
        container.querySelectorAll('.land-combat-fx').forEach((el) => el.remove());
        return;
    }

    // Aktif cephe hatlarından FX noktaları oluştur
    const activeFrontlines = FRONTLINES.filter((fl) => fl.phase.includes(campaignPhase.id));

    const fxMarkup = activeFrontlines.map((fl) => {
        const fx = [];
        const midIdx = Math.floor(fl.points.length / 2);
        const mid = fl.points[midIdx] || fl.points[0];

        // 1 ana temas çizgisi (düşük opacity)
        if (fl.points.length >= 2) {
            const p1 = fl.points[0];
            const p2 = fl.points[fl.points.length - 1];
            fx.push(`<line class="land-combat-fx combat-contact-line"
                x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"/>`);
        }

        // Intensity'ye göre dust puff'lar
        const level = intensity >= 7 ? 'high' : intensity >= 5 ? 'medium' : 'low';
        const dustCount = level === 'high' ? 2 : level === 'medium' ? 1 : 0;

        for (let d = 0; d < dustCount; d++) {
            const offsetX = (d === 0 ? -8 : 8) + (Math.random() * 4 - 2);
            const offsetY = (d === 0 ? -4 : 4) + (Math.random() * 4 - 2);
            fx.push(`<circle class="land-combat-fx combat-dust"
                cx="${mid.x + offsetX}" cy="${mid.y + offsetY}" r="${4 + d * 2}"/>`);
        }

        // High intensity: muzzle flash
        if (level === 'high') {
            fx.push(`<circle class="land-combat-fx combat-muzzle"
                cx="${mid.x}" cy="${mid.y}" r="2"/>`);
        }

        return fx.join('');
    }).join('');

    // Eski land FX'i temizle, yenisini ekle
    container.querySelectorAll('.land-combat-fx').forEach((el) => el.remove());
    if (fxMarkup) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('land-combat-fx-group');
        g.innerHTML = fxMarkup;
        container.appendChild(g);
    }
}

/**
 * Verilen tarihte aktif olan cephe hatlarını döndür.
 * position-engine corridor separation için kullanılır.
 */
export function getActiveFrontlines(campaignPhaseId, isoDate) {
    return FRONTLINES.filter((fl) => {
        if (!fl.phase.includes(campaignPhaseId)) return false;
        if (isoDate && (isoDate < fl.dateRange.start || isoDate > fl.dateRange.end)) return false;
        return true;
    });
}

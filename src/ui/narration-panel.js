// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Anlatım Paneli
// Harita üstü tarih göstergesi, anlatım kutusu, atmosfer
// ══════════════════════════════════════════════════════════════

import { getNarrationIcon } from '../data/icon-registry.js';
import { getRandomRomanticEntry } from '../data/romantic-layer.js';

/** Tarih metni → gün/ay/yıl parçaları */
export function splitDisplayDateParts(dateText) {
    const raw = String(dateText || '').trim();
    const ranged = raw.match(/(\d{1,2})\s*[–-]\s*\d{1,2}\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
    if (ranged) return { day: ranged[1], month: ranged[2], year: ranged[3] };
    const full = raw.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
    if (full) return { day: full[1], month: full[2], year: full[3] };
    const monthYear = raw.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
    if (monthYear) return { day: '—', month: monthYear[1], year: monthYear[2] };
    const yearOnly = raw.match(/\b(\d{4})\b/);
    if (yearOnly) return { day: '—', month: 'Yıl', year: yearOnly[1] };
    return { day: '—', month: raw || 'Tarih', year: '' };
}

/** Harita üstü tarih chip güncelle */
export function updateMapDateIndicator(dateText) {
    const day = document.getElementById('mapDateDay');
    const month = document.getElementById('mapDateMonth');
    const year = document.getElementById('mapDateYear');
    if (!day || !month || !year) return;
    const parts = splitDisplayDateParts(dateText);
    day.textContent = parts.day;
    month.textContent = parts.month;
    year.textContent = parts.year;
}

/** Anlatım panelini güncelle */
export function updateNarrationPanel(phase) {
    const title = document.getElementById('narrationTitle');
    const text = document.getElementById('narrationText');
    if (title) {
        const icon = getNarrationIcon(phase.title || '');
        title.innerHTML = `<img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${phase.title} – ${phase.date}`;
    }
    if (text) text.textContent = phase.narration || '';

    // Romantik katman
    updateRomanticQuote(phase.isoStart || '');
}

/** Romantik alıntı kutusunu güncelle */
function updateRomanticQuote(isoDate) {
    let el = document.getElementById('romanticQuote');
    if (!el) return;

    const entry = getRandomRomanticEntry(isoDate);
    if (!entry) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }

    const typeLabels = {
        quote: 'Tarihi Söz',
        letter: 'Asker Mektubu',
        anecdote: 'Anekdot',
        witness: 'Tanıklık',
        spirit: 'Çanakkale Ruhu',
    };
    const typeClass = `romantic-type-${entry.type}`;
    const factionClass = `romantic-faction-${entry.faction}`;

    el.style.display = 'block';
    el.className = `romantic-quote ${typeClass} ${factionClass}`;
    el.innerHTML = `<div class="romantic-header"><span class="romantic-emoji">${entry.emoji || '📜'}</span><span class="romantic-label">${typeLabels[entry.type] || 'Kayıt'}</span></div><div class="romantic-text">${entry.text}</div><div class="romantic-source">— ${entry.source}</div>`;
}

/** Atmosfer state güncelle (savaş durumuna göre border rengi) */
export function renderAtmosphere(animationState) {
    const map = document.querySelector('.map-container');
    if (!map) return;
    if (!animationState || typeof animationState !== 'object') {
        delete map.dataset.ottomanState;
        delete map.dataset.alliedState;
        return;
    }
    map.dataset.ottomanState = String(animationState.ottoman || 'idle');
    map.dataset.alliedState = String(animationState.allied || 'idle');

    const box = document.getElementById('narrationBox');
    if (!box) return;
    const hot = ['fighting', 'bombardment'].includes(map.dataset.ottomanState) || ['fighting', 'bombardment'].includes(map.dataset.alliedState);
    box.style.borderLeftColor = hot ? 'rgba(220,53,69,.95)' : 'var(--red)';
}

/** Sahne geçiş metni göster */
export function renderTransition(sceneTransition) {
    const box = document.getElementById('narrationBox');
    if (!box) return;
    let el = document.getElementById('sceneTransitionText');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sceneTransitionText';
        el.className = 'narration-transition';
        box.appendChild(el);
    }
    if (!sceneTransition) {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.textContent = `Geçiş: ${sceneTransition}`;
}

/** Anlatım kutusu DOM elemanlarını oluştur */
export function attachNarrationElements(container, phase) {
    const nb = document.createElement('div');
    nb.className = 'narration-box';
    nb.id = 'narrationBox';
    nb.setAttribute('aria-live', 'polite');
    nb.setAttribute('role', 'status');
    const icon = getNarrationIcon(phase.title || '');
    nb.innerHTML = `<div class="narration-title" id="narrationTitle"><img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${phase.title} – ${phase.date}</div><div class="narration-text" id="narrationText">${phase.narration}</div><div class="romantic-quote" id="romanticQuote" style="display:none"></div>`;
    container.appendChild(nb);

    // İlk romantik alıntıyı göster
    updateRomanticQuote(phase.isoStart || '');
}

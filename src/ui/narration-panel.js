// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Anlatım Paneli
// Harita üstü tarih göstergesi, anlatım kutusu, atmosfer
// ══════════════════════════════════════════════════════════════

import { getNarrationIcon } from '../data/icon-registry.js';
import { getRandomRomanticEntry } from '../data/romantic-layer.js';
import { getWeeklyGuide, getActiveWeekIndex } from '../engine/phase-engine.js';
import { getEventImage } from '../data/event-images.js';
import { getEventVideo } from '../data/event-videos.js';

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

/**
 * Narration metninden "Açık Olay:", "Operasyon Durumu:", "Haftalık Bağlam:" bölümlerini ayır.
 * Sadece Haftalık Bağlam kısmını ayrı döndürür, diğerlerini temizler.
 */
function parseNarration(rawNarration) {
    if (!rawNarration) return { clean: '', weeklyContext: '' };

    // "Açık Olay: ... | Operasyon Durumu: ... | Haftalık Bağlam: ..." formatını parse et
    const parts = rawNarration.split(/\s*\|\s*/);
    let weeklyContext = '';
    const cleanParts = [];

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith('Haftalık Bağlam:')) {
            weeklyContext = trimmed.replace('Haftalık Bağlam:', '').trim();
        } else if (trimmed.startsWith('Açık Olay:')) {
            // Sadece "Açık Olay:" etiketini kaldır, içeriği koru
            cleanParts.push(trimmed.replace('Açık Olay:', '').trim());
        } else if (trimmed.startsWith('Operasyon Durumu:')) {
            // Sadece "Operasyon Durumu:" etiketini kaldır, içeriği koru
            cleanParts.push(trimmed.replace('Operasyon Durumu:', '').trim());
        } else {
            // "Açık Olay" vs. prefix olmayan normal narration
            cleanParts.push(trimmed);
        }
    }

    // Tekrarlanan cümleleri kaldır (Açık Olay ve Operasyon Durumu aynı metni içerebilir)
    const unique = [];
    const seen = new Set();
    for (const part of cleanParts) {
        const normalized = part.replace(/\s+/g, ' ').trim();
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            unique.push(normalized);
        }
    }

    // Eğer parse sonucu boşsa ve "Açık Olay:" yoksa, orijinal metni kullan
    const clean = unique.join(' ').trim();
    if (!clean && !weeklyContext && !rawNarration.includes('Açık Olay:')) {
        return { clean: rawNarration, weeklyContext: '' };
    }

    return { clean, weeklyContext };
}

/** Anlatım panelini güncelle */
export function updateNarrationPanel(phase, currentPhaseIndex, campaignPhaseId, animData) {
    const title = document.getElementById('narrationTitle');
    const text = document.getElementById('narrationText');

    // Narration metnini parse et
    const { clean, weeklyContext } = parseNarration(phase.narration);

    if (title) {
        const icon = getNarrationIcon(phase.title || '');
        let displayTitle = (phase.title || '').replace(/\s*[·–-]\s*(Günlük Akış|Resmi Günlük Kayıt)\s*/gi, '').trim();
        title.innerHTML = `<img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${displayTitle} – ${phase.date}`;
        // Toggle label güncelle
        const toggleLabel = document.querySelector('.narration-toggle-label');
        if (toggleLabel) toggleLabel.textContent = displayTitle;
    }

    // Tarihsel olay görseli veya gerçek görüntü videosu
    const imageResult = updateEventImage(phase.isoStart || '');
    updateEventVideo(imageResult.hasImage, campaignPhaseId, animData);

    // Narration metni: görsel bağlamı varsa onu göster, yoksa parse edilmiş metni
    if (text) {
        if (imageResult.context) {
            text.textContent = imageResult.context;
        } else if (clean) {
            text.textContent = clean;
        } else if (weeklyContext) {
            text.textContent = weeklyContext;
        } else {
            text.textContent = '';
        }
    }

    // Haftalık bağlam barını güncelle
    updateWeeklyBar(phase.isoStart, currentPhaseIndex, weeklyContext);

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

/** Tarihsel olay görselini güncelle — { hasImage, context } döner */
function updateEventImage(isoDate) {
    let el = document.getElementById('eventImage');
    if (!el) return { hasImage: false, context: '' };

    const img = getEventImage(isoDate);
    if (!img) {
        el.style.display = 'none';
        el.innerHTML = '';
        return { hasImage: false, context: '' };
    }

    el.style.display = 'block';
    const posStyle = img.cropFocus ? ` style="object-position:${img.cropFocus}"` : '';
    el.innerHTML = `<img src="${img.url}" alt="${img.caption}" class="event-image-photo" loading="lazy" referrerpolicy="no-referrer"${posStyle} onerror="this.parentElement.style.display='none'"><div class="event-image-caption">${img.caption}</div><div class="event-image-source">${img.source}</div>`;
    return { hasImage: true, context: img.context || '' };
}

/** Gerçek görüntü videosunu güncelle */
function updateEventVideo(hasImage, campaignPhaseId, animData) {
    let el = document.getElementById('eventVideo');
    if (!el) return;

    const eventType = animData?.eventType || 'IDLE';
    const intensity = animData?.intensity ?? 0;

    // Yoğun olaylarda video her zaman göster (fotoğrafı gizle)
    // Düşük yoğunlukta fotoğraf varsa video gösterme
    if (hasImage && intensity < 7) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }

    const clip = getEventVideo(campaignPhaseId, eventType, intensity);

    if (!clip) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }

    // Yoğun olayda fotoğrafı gizle, video göster
    if (hasImage) {
        const imgEl = document.getElementById('eventImage');
        if (imgEl) { imgEl.style.display = 'none'; imgEl.innerHTML = ''; }
    }

    el.style.display = 'block';
    el.innerHTML = `<video class="event-video-player" src="${clip.file}" autoplay muted loop playsinline preload="none"></video><div class="event-image-caption">${clip.desc}</div><div class="event-image-source">Gerçek görüntü — renklendirilmiş arşiv</div>`;
}

/** Haftalık bağlam progress barını güncelle */
function updateWeeklyBar(isoDate, currentPhaseIndex, weeklyContext) {
    let bar = document.getElementById('weeklyBar');
    if (!bar) return;

    const WEEKLY_GUIDE = getWeeklyGuide();
    if (!WEEKLY_GUIDE.length) {
        bar.style.display = 'none';
        return;
    }

    const iso = String(isoDate || '');
    const weekIdx = WEEKLY_GUIDE.findIndex((w) => w.startIso <= iso && iso <= w.endIso);
    if (weekIdx === -1) {
        bar.style.display = 'none';
        return;
    }

    const week = WEEKLY_GUIDE[weekIdx];

    // Hafta içindeki ilerleme oranını hesapla
    const startMs = new Date(week.startIso + 'T00:00:00Z').getTime();
    const endMs = new Date(week.endIso + 'T00:00:00Z').getTime();
    const currentMs = new Date(iso + 'T00:00:00Z').getTime();
    const totalSpan = Math.max(1, endMs - startMs);
    const progress = Math.min(1, Math.max(0, (currentMs - startMs) / totalSpan));
    const progressPct = Math.round(progress * 100);

    // Haftalık bağlam metni: önce weeklyContext (parse edilmiş), yoksa guide narration
    const contextText = weeklyContext || week.narration || '';

    bar.style.display = 'block';
    bar.innerHTML = `
        <div class="weekly-bar-header">
            <span class="weekly-bar-label">${week.title}</span>
            <span class="weekly-bar-dates">${week.label}</span>
        </div>
        <div class="weekly-bar-track">
            <div class="weekly-bar-fill" style="width:${progressPct}%"></div>
        </div>
        ${contextText ? `<div class="weekly-bar-context">${contextText}</div>` : ''}
    `;
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
    const { clean } = parseNarration(phase.narration);
    let displayTitle = (phase.title || '').replace(/\s*[·–-]\s*(Günlük Akış|Resmi Günlük Kayıt)\s*/gi, '').trim();
    nb.innerHTML = `<button class="narration-toggle" id="narrationToggle" type="button" aria-label="Paneli aç/kapat"><span class="narration-toggle-icon">▼</span> <span class="narration-toggle-label">${displayTitle}</span></button><div class="narration-content" id="narrationContent"><div class="narration-title" id="narrationTitle"><img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${displayTitle} – ${phase.date}</div><div class="narration-text" id="narrationText">${clean || ''}</div><div class="event-image" id="eventImage" style="display:none"></div><div class="event-image" id="eventVideo" style="display:none"></div><div class="weekly-bar" id="weeklyBar" style="display:none"></div><div class="romantic-quote" id="romanticQuote" style="display:none"></div></div>`;
    container.appendChild(nb);

    // Toggle butonu
    const toggleBtn = document.getElementById('narrationToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            nb.classList.toggle('is-collapsed');
            const ic = toggleBtn.querySelector('.narration-toggle-icon');
            if (ic) ic.textContent = nb.classList.contains('is-collapsed') ? '▲' : '▼';
        });
    }

    // İlk romantik alıntıyı göster
    updateRomanticQuote(phase.isoStart || '');
}

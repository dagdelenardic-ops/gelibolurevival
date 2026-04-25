// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Anlatım Paneli / Story Shell
// Desktop'ta destek paneli, mobilde story-first bottom sheet
// ══════════════════════════════════════════════════════════════

import { getNarrationIcon } from '../data/icon-registry.js';
import { getRandomRomanticEntry } from '../data/romantic-layer.js';
import { getEventImage } from '../data/event-images.js';
import { getEventVideo } from '../data/event-videos.js';
import { getMobileStoryChapters } from '../engine/phase-engine.js?v=20260407-manual-r1';

const isMobileNarration = typeof window !== 'undefined' && window.innerWidth <= 768;
const MOBILE_VIEW_MODES = ['story', 'story+map', 'map-focus'];

let mobileHandlers = {};
let mobileViewMode = isMobileNarration ? 'story' : 'desktop';
let storySwipeStartY = 0;

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

function cleanSourceLanguage(value) {
    return String(value || '')
        .replace(/^[^.?!]*\bEPUB\b[^.?!]*[.?!]\s*/i, '')
        .replace(/\bEPUB\s*kayd[ıi]\b/gi, '')
        .replace(/(?:Resmi Günlük Kayıt|Günlük Akış|Haftalık Bağlam|Haftalık Bağ|Kayd[ıi])\s*:?/gi, '')
        .replace(/\s*[·–-]\s*(?=[·–-]|\.|,|;|:|$)/g, '')
        .replace(/^[\s·–-]+|[\s·–-]+$/g, '')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function getDisplayTitle(rawTitle) {
    return cleanSourceLanguage(rawTitle)
        .replace(/\s*[·–-]\s*(Günlük Akış|Resmi Günlük Kayıt|Haftalık Bağ|Haftalık Bağlam)\s*/gi, '')
        .replace(/\s*\(EPUB[^)]*\)/gi, '')
        .replace(/\s*EPUB\s*/gi, '')
        .replace(/\s*Haftalık Bağ\s*/gi, '')
        .replace(/\s*·\s*/g, ' · ')
        .replace(/^[\s·–-]+|[\s·–-]+$/g, '')
        .trim() || 'Cephe Günü';
}

function cleanText(value) {
    return cleanSourceLanguage(value).replace(/\s+/g, ' ').trim();
}

/**
 * Narration metninden "Açık Olay:", "Operasyon Durumu:", "Haftalık Bağlam:" bölümlerini ayır.
 * Haftalık bağlam ayrı döndürülür, diğer etiketler temizlenir.
 */
function parseNarration(rawNarration) {
    if (!rawNarration) return { clean: '', weeklyContext: '' };

    const parts = String(rawNarration).split(/\s*\|\s*/);
    let weeklyContext = '';
    const cleanParts = [];

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith('Haftalık Bağlam:')) {
            weeklyContext = cleanSourceLanguage(trimmed.replace('Haftalık Bağlam:', '').trim());
        } else if (trimmed.startsWith('Açık Olay:')) {
            cleanParts.push(cleanSourceLanguage(trimmed.replace('Açık Olay:', '').trim()));
        } else if (trimmed.startsWith('Operasyon Durumu:')) {
            cleanParts.push(cleanSourceLanguage(trimmed.replace('Operasyon Durumu:', '').trim()));
        } else if (trimmed) {
            cleanParts.push(cleanSourceLanguage(trimmed));
        }
    }

    const unique = [];
    const seen = new Set();
    for (const part of cleanParts) {
        const normalized = cleanText(part);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            unique.push(normalized);
        }
    }

    const clean = unique.join(' ').trim();
    if (!clean && !weeklyContext && !String(rawNarration).includes('Açık Olay:')) {
        return { clean: cleanSourceLanguage(rawNarration), weeklyContext: '' };
    }

    return { clean, weeklyContext };
}

function getDetailText(clean, weeklyContext) {
    if (clean && weeklyContext && !clean.includes(weeklyContext)) {
        return `${clean}\n\n${weeklyContext}`;
    }
    return clean || weeklyContext || '';
}

function updatePriorityBadge(priority) {
    const badge = document.getElementById('storyPriorityBadge');
    if (!badge) return;
    const feature = priority === 'feature';
    badge.textContent = feature ? 'Büyük Olay' : 'Hızlı Geçiş';
    badge.dataset.priority = priority || 'supporting';
}

function updateDetailToggle(hasDetail) {
    const toggle = document.getElementById('storyDetailToggle');
    const detail = document.getElementById('storyDetail');
    if (!toggle || !detail) return;
    toggle.hidden = !hasDetail;
    detail.hidden = !hasDetail || !detail.classList.contains('is-open');
    if (!hasDetail) {
        detail.classList.remove('is-open');
    }
}

function syncMapButtonLabel() {
    const btn = document.getElementById('storyMapToggleBtn');
    if (!btn) return;
    btn.textContent = mobileViewMode === 'map-focus' ? 'Hikâyeye Dön' : 'Haritada Gör';
}

function syncViewModeDatasets() {
    const body = document.body;
    const map = document.querySelector('.map-container');
    const box = document.getElementById('narrationBox');
    if (body) body.dataset.viewMode = mobileViewMode;
    if (map) map.dataset.viewMode = mobileViewMode;
    if (box) box.dataset.viewMode = mobileViewMode;
    syncMapButtonLabel();
}

export function getMobileViewMode() {
    return mobileViewMode;
}

export function setMobileViewMode(nextMode, options = {}) {
    if (!isMobileNarration) return;
    if (!MOBILE_VIEW_MODES.includes(nextMode)) return;
    mobileViewMode = nextMode;
    syncViewModeDatasets();
    if (!options.silent && typeof mobileHandlers.onModeChange === 'function') {
        mobileHandlers.onModeChange(nextMode);
    }
}

function cycleMobileViewMode(step = 1) {
    const currentIndex = MOBILE_VIEW_MODES.indexOf(mobileViewMode);
    const nextIndex = Math.max(0, Math.min(MOBILE_VIEW_MODES.length - 1, currentIndex + step));
    setMobileViewMode(MOBILE_VIEW_MODES[nextIndex]);
}

/** Romantik alıntı kutusunu güncelle */
function updateRomanticQuote(isoDate) {
    const el = document.getElementById('romanticQuote');
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
let lastImageUrl = '';
function updateEventImage(isoDate) {
    const el = document.getElementById('eventImage');
    if (!el) return { hasImage: false, context: '' };

    const img = getEventImage(isoDate);
    if (!img) {
        if (lastImageUrl) {
            el.style.display = 'none';
            el.innerHTML = '';
            lastImageUrl = '';
        }
        return { hasImage: false, context: '' };
    }

    if (img.url === lastImageUrl) {
        return { hasImage: true, context: img.context || '' };
    }
    lastImageUrl = img.url;

    el.style.display = 'block';
    const posStyle = img.cropFocus ? ` style="object-position:${img.cropFocus}"` : '';
    el.innerHTML = `<img src="${img.url}" alt="${img.caption}" class="event-image-photo" loading="lazy" referrerpolicy="no-referrer"${posStyle} onerror="this.parentElement.style.display='none'"><div class="event-image-caption">${img.caption}</div><div class="event-image-source">${img.source}</div>`;
    return { hasImage: true, context: img.context || '' };
}

/** Gerçek görüntü videosunu güncelle */
let lastVideoFile = '';
function updateEventVideo(hasImage, campaignPhaseId, animData) {
    const el = document.getElementById('eventVideo');
    if (!el) return;

    const eventType = animData?.eventType || 'IDLE';
    const intensity = animData?.intensity ?? 0;

    if (hasImage && intensity < 7) {
        if (lastVideoFile) {
            el.style.display = 'none';
            el.innerHTML = '';
            lastVideoFile = '';
        }
        return;
    }

    const clip = getEventVideo(campaignPhaseId, eventType, intensity);

    if (!clip) {
        if (lastVideoFile) {
            el.style.display = 'none';
            el.innerHTML = '';
            lastVideoFile = '';
        }
        return;
    }

    if (clip.file === lastVideoFile) return;
    lastVideoFile = clip.file;

    if (hasImage) {
        const imgEl = document.getElementById('eventImage');
        if (imgEl) {
            imgEl.style.display = 'none';
            imgEl.innerHTML = '';
            lastImageUrl = '';
        }
    }

    el.style.display = 'block';
    el.innerHTML = `<video class="event-video-player" src="${clip.file}" muted playsinline controls preload="metadata"></video><div class="event-image-caption">${clip.desc}</div><div class="event-image-source">Gerçek görüntü — renklendirilmiş arşiv</div>`;
}

/** Anlatım panelini güncelle */
export function updateNarrationPanel(phase, currentPhaseIndex, campaignPhaseId, animData) {
    const title = document.getElementById('narrationTitle');
    const text = document.getElementById('narrationText');
    const summary = document.getElementById('narrationSummary');
    const dateLabel = document.getElementById('storyDateLabel');
    const chapterLabel = document.getElementById('storyChapterLabel');
    const chapterMeta = document.getElementById('storyChapterMeta');

    const { clean, weeklyContext } = parseNarration(phase.narration);
    const displayTitle = getDisplayTitle(phase.title || '');

    if (title) {
        const icon = getNarrationIcon(phase.title || '');
        title.innerHTML = isMobileNarration
            ? `<img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${displayTitle}`
            : `<img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${displayTitle} <span class="narration-date">— ${phase.date}</span>`;
    }

    if (dateLabel) dateLabel.textContent = phase.date || '';
    if (chapterLabel) chapterLabel.textContent = phase.mobileChapterTitle || 'Hikâye Akışı';
    if (chapterMeta) chapterMeta.textContent = phase.mobilePriority === 'feature' ? 'Büyük olay kartı' : 'Hızlı akıştan seçili an';
    updatePriorityBadge(phase.mobilePriority);

    const imageResult = updateEventImage(phase.isoStart || '');
    updateEventVideo(imageResult.hasImage, campaignPhaseId, animData);

    const detailText = getDetailText(clean, weeklyContext);
    const summaryText = cleanText(phase.mobileSummary || imageResult.context || clean || weeklyContext);

    if (summary) summary.textContent = summaryText;
    if (text) text.textContent = detailText;

    updateRomanticQuote(phase.isoStart || '');
    updateDetailToggle(Boolean(detailText));
    syncMapButtonLabel();
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
    if (isMobileNarration) {
        box.style.borderTopColor = hot ? 'rgba(220,53,69,.95)' : '#8b3a3a';
    } else {
        box.style.borderLeftColor = hot ? 'rgba(220,53,69,.95)' : 'var(--red)';
    }
}

/** Sahne geçiş metni göster */
export function renderTransition(sceneTransition) {
    const el = document.getElementById('sceneTransitionText');
    if (!el) return;
    if (!sceneTransition) {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.textContent = `Geçiş: ${sceneTransition}`;
}

function bindMobileStoryInteractions() {
    const prevBtn = document.getElementById('storyPrevBtn');
    const playBtn = document.getElementById('playPauseBtn');
    const nextBtn = document.getElementById('storyNextBtn');
    const mapBtn = document.getElementById('storyMapToggleBtn');
    const detailBtn = document.getElementById('storyDetailToggle');
    const detail = document.getElementById('storyDetail');
    const handle = document.getElementById('storySheetHandle');

    if (prevBtn) prevBtn.addEventListener('click', () => mobileHandlers.onPrev && mobileHandlers.onPrev());
    if (playBtn) playBtn.addEventListener('click', () => mobileHandlers.onTogglePlay && mobileHandlers.onTogglePlay());
    if (nextBtn) nextBtn.addEventListener('click', () => mobileHandlers.onNext && mobileHandlers.onNext());
    if (mapBtn) {
        mapBtn.addEventListener('click', () => {
            setMobileViewMode(mobileViewMode === 'map-focus' ? 'story' : 'map-focus');
        });
    }

    if (detailBtn && detail) {
        detailBtn.addEventListener('click', () => {
            detail.classList.toggle('is-open');
            detail.hidden = !detail.classList.contains('is-open');
            detailBtn.textContent = detail.classList.contains('is-open') ? 'Detayı Kapat' : 'Detayı Aç';
        });
    }

    if (handle) {
        handle.addEventListener('click', () => cycleMobileViewMode(1));
        handle.addEventListener('touchstart', (event) => {
            storySwipeStartY = event.touches[0].clientY;
        }, { passive: true });
        handle.addEventListener('touchend', (event) => {
            const endY = event.changedTouches[0].clientY;
            const diff = endY - storySwipeStartY;
            if (Math.abs(diff) < 32) return;
            cycleMobileViewMode(diff > 0 ? 1 : -1);
        }, { passive: true });
    }

    document.querySelectorAll('.story-chapter-marker').forEach((button) => {
        button.addEventListener('click', () => {
            if (mobileHandlers.onJumpToChapter) mobileHandlers.onJumpToChapter(button.dataset.startIso);
        });
    });
}

function renderMobileNarrationShell(phase, displayTitle, clean, icon) {
    const chapters = getMobileStoryChapters();
    const badgeText = phase.mobilePriority === 'feature' ? 'Büyük Olay' : 'Hızlı Geçiş';
    return `
        <button class="story-sheet-handle" id="storySheetHandle" type="button" aria-label="Kart görünümünü değiştir">
            <span class="story-sheet-grip"></span>
        </button>
        <div class="story-shell">
            <div class="story-shell-topline">
                <span class="story-kicker" id="storyChapterLabel">${phase.mobileChapterTitle || 'Hikâye Akışı'}</span>
                <span class="story-kicker-meta" id="storyChapterMeta">${phase.mobilePriority === 'feature' ? 'Büyük olay kartı' : 'Hızlı akıştan seçili an'}</span>
            </div>
            <div class="story-header-row">
                <div class="story-date-label" id="storyDateLabel">${phase.date || ''}</div>
                <button class="story-map-btn" id="storyMapToggleBtn" type="button">Haritada Gör</button>
            </div>
            <div class="story-badge-row">
                <span class="story-priority-badge" id="storyPriorityBadge" data-priority="${phase.mobilePriority || 'supporting'}">${badgeText}</span>
            </div>
            <div class="narration-title" id="narrationTitle"><img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${displayTitle}</div>
            <div class="story-summary" id="narrationSummary">${phase.mobileSummary || clean || ''}</div>
            <div class="story-media">
                <div class="event-image" id="eventImage" style="display:none"></div>
                <div class="event-image" id="eventVideo" style="display:none"></div>
            </div>
            <div class="story-controls">
                <button class="story-control-btn" id="storyPrevBtn" type="button">Geri</button>
                <button class="story-control-btn story-control-btn-primary" id="playPauseBtn" type="button" aria-label="Animasyonu başlat">Başlat</button>
                <button class="story-control-btn" id="storyNextBtn" type="button">İleri</button>
            </div>
            <div class="story-chapter-strip" aria-label="Bölüm seçimi">
                ${chapters.map((chapter) => `<button class="story-chapter-marker" type="button" data-chapter-id="${chapter.id}" data-start-iso="${chapter.startIso}">${chapter.shortTitle}</button>`).join('')}
            </div>
            <button class="story-detail-toggle" id="storyDetailToggle" type="button">Detayı Aç</button>
            <div class="story-detail" id="storyDetail" hidden>
                <div class="narration-text" id="narrationText">${clean || ''}</div>
                <div class="romantic-quote" id="romanticQuote" style="display:none"></div>
                <div class="narration-transition" id="sceneTransitionText" style="display:none"></div>
            </div>
        </div>
    `;
}

function renderDesktopNarrationShell(phase, displayTitle, clean, icon) {
    return `
        <button class="narration-toggle" id="narrationToggle" type="button" aria-label="Paneli aç/kapat">
            <span class="narration-toggle-icon">▼</span>
            <span class="narration-toggle-label">${displayTitle}</span>
        </button>
        <div class="narration-content" id="narrationContent">
            <div class="narration-title" id="narrationTitle"><img src="assets/icons/${icon}.png" width="16" height="16" alt="" class="narration-icon"> ${displayTitle} <span class="narration-date">— ${phase.date}</span></div>
            <div class="narration-text" id="narrationText">${clean || ''}</div>
            <div class="event-image" id="eventImage" style="display:none"></div>
            <div class="event-image" id="eventVideo" style="display:none"></div>
            <div class="romantic-quote" id="romanticQuote" style="display:none"></div>
            <div class="narration-transition" id="sceneTransitionText" style="display:none"></div>
        </div>
    `;
}

/** Anlatım kutusu DOM elemanlarını oluştur */
export function attachNarrationElements(container, phase, opts = {}) {
    mobileHandlers = opts;

    const nb = document.createElement('div');
    nb.className = 'narration-box';
    nb.id = 'narrationBox';
    nb.setAttribute('aria-live', 'polite');
    nb.setAttribute('role', 'status');

    const icon = getNarrationIcon(phase.title || '');
    const { clean } = parseNarration(phase.narration);
    const displayTitle = getDisplayTitle(phase.title || '');

    nb.innerHTML = isMobileNarration
        ? renderMobileNarrationShell(phase, displayTitle, clean, icon)
        : renderDesktopNarrationShell(phase, displayTitle, clean, icon);

    container.appendChild(nb);

    if (isMobileNarration) {
        setMobileViewMode('story', { silent: true });
        bindMobileStoryInteractions();
    } else {
        const toggleBtn = document.getElementById('narrationToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                nb.classList.toggle('is-collapsed');
                const ic = toggleBtn.querySelector('.narration-toggle-icon');
                if (ic) ic.textContent = nb.classList.contains('is-collapsed') ? '▲' : '▼';
            });
        }
    }

    updateRomanticQuote(phase.isoStart || '');
}

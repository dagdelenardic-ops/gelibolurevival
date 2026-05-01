// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Harita Doktoru Paneli
// ?doctor=1 ile çalışan geliştirici yerleşim kalite paneli
// ══════════════════════════════════════════════════════════════

import { runMapDoctor } from '../engine/map-doctor.js?v=20260430-doctor-r2';

const MAX_RENDERED_ISSUES = 80;
const MARKER_LIMIT = 120;

let root = null;
let panel = null;
let toggle = null;
let body = null;
let lastReport = null;
let isRunning = false;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setOpen(open) {
    if (!panel || !toggle) return;
    root.classList.toggle('is-open', open);
    toggle.classList.toggle('is-active', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.toggleAttribute('inert', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function severityLabel(severity) {
    switch (severity) {
        case 'P0': return 'Kritik';
        case 'P1': return 'Yüksek';
        case 'P2': return 'Orta';
        default: return 'Düşük';
    }
}

function typeLabel(type) {
    switch (type) {
        case 'terrain': return 'Zemin';
        case 'collision': return 'Çakışma';
        case 'anchor-drift': return 'Anchor';
        case 'historical-anchor-drift': return 'Tarihsel Anchor';
        case 'location-terrain': return 'Lokasyon';
        case 'label-language': return 'Dil';
        case 'historical-data': return 'Tarihsel Veri';
        case 'missing-source': return 'Kaynak';
        case 'route-deviation': return 'Rota';
        case 'frontline-side-mismatch': return 'Cephe Tarafı';
        case 'low-confidence': return 'Güven';
        default: return 'Kontrol';
    }
}

function getIssueTitle(issue) {
    if (issue.unitName) return issue.unitName;
    if (issue.locationName) return issue.locationName;
    if (issue.currentText) return issue.currentText;
    if (issue.referenceId) return issue.referenceId;
    if (issue.unitNames) return issue.unitNames.slice(0, 3).join(', ');
    return issue.type;
}

function getIssueMeta(issue) {
    const parts = [];
    if (issue.isoStart) parts.push(issue.isoStart);
    if (issue.phaseTitle) parts.push(issue.phaseTitle);
    if (Number.isFinite(issue.x) && Number.isFinite(issue.y)) parts.push(`${issue.x}, ${issue.y}`);
    return parts.join(' · ');
}

function renderSummary(report) {
    const s = report.summary;
    const isClean = s.totalIssues === 0;
    return `
        <div class="map-doctor-health ${isClean ? 'is-clean' : 'is-alert'}">
            <span>${isClean ? 'Temiz Yerleşim' : 'Müdahale Gerekli'}</span>
            <strong>${isClean ? 'Tüm zemin, çakışma, anchor ve tarihsel kaynak kontrolleri geçti.' : 'Önce kritik zemin, çakışma ve kaynak bulgularını düzelt.'}</strong>
        </div>
        <div class="map-doctor-score">
            <div>
                <strong>${s.totalIssues}</strong>
                <span>Toplam bulgu</span>
            </div>
            <div>
                <strong>${s.bySeverity.P0 || 0}</strong>
                <span>Kritik</span>
            </div>
            <div>
                <strong>${s.terrainIssues}</strong>
                <span>Zemin</span>
            </div>
            <div>
                <strong>${s.collisionIssues}</strong>
                <span>Çakışma</span>
            </div>
            <div>
                <strong>${s.historicalIssues || 0}</strong>
                <span>Tarihsel</span>
            </div>
        </div>
        <div class="map-doctor-note">
            ${s.phaseCount} faz ve ${s.unitCount} birim tarandı. Kritik hedef: P0/P1 zemin, çakışma ve kaynak sapmalarını sıfırda tutmak.
        </div>
    `;
}

function renderIssueSources(issue) {
    if (!Array.isArray(issue.sources) || !issue.sources.length) return '';
    return issue.sources
        .map((source) => `<a class="map-doctor-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>`)
        .join('');
}

function renderIssue(issue) {
    return `
        <article class="map-doctor-issue is-${issue.severity.toLowerCase()}" data-issue-id="${escapeHtml(issue.id)}">
            <div class="map-doctor-issue-top">
                <span class="map-doctor-priority">${issue.severity} · ${severityLabel(issue.severity)}</span>
                <span class="map-doctor-type">${typeLabel(issue.type)}</span>
            </div>
            <h4>${escapeHtml(getIssueTitle(issue))}</h4>
            <p>${escapeHtml(issue.message || '')}</p>
            <div class="map-doctor-meta">${escapeHtml(getIssueMeta(issue))}</div>
            <div class="map-doctor-actions">
                ${issue.unitId ? `<button type="button" class="map-doctor-link" data-doctor-action="select-unit" data-unit-id="${escapeHtml(issue.unitId)}">Editörde Seç</button>` : ''}
                ${Number.isFinite(issue.x) && Number.isFinite(issue.y) ? `<button type="button" class="map-doctor-link" data-doctor-action="focus" data-x="${issue.x}" data-y="${issue.y}">Haritada Göster</button>` : ''}
                ${renderIssueSources(issue)}
            </div>
        </article>
    `;
}

function renderReport(report) {
    if (!body) return;
    const issues = report.allIssues.slice(0, MAX_RENDERED_ISSUES);
    body.innerHTML = `
        ${renderSummary(report)}
        <div class="map-doctor-toolbar">
            <button type="button" class="map-doctor-btn" data-doctor-action="run">Tekrar Tara</button>
            <button type="button" class="map-doctor-btn" data-doctor-action="copy">JSON Kopyala</button>
            <button type="button" class="map-doctor-btn" data-doctor-action="clear-markers">Markerları Gizle</button>
        </div>
        <div class="map-doctor-list">
            ${issues.length ? issues.map(renderIssue).join('') : '<div class="map-doctor-empty is-clean">Harita doktoru görünür bir sorun bulmadı. Otomatik yerleşim sistemi şu an sağlıklı.</div>'}
        </div>
    `;
    renderMarkers(report);
}

function renderLoading() {
    if (!body) return;
    body.innerHTML = `
        <div class="map-doctor-loading">
            <span class="map-doctor-pulse"></span>
            Harita, zemin maskesi ve birlik fazları taranıyor...
        </div>
    `;
}

function clearMarkers() {
    document.getElementById('mapDoctorLayer')?.remove();
}

function renderMarkers(report) {
    clearMarkers();
    const svg = document.getElementById('battleMap');
    if (!svg) return;

    const issues = report.allIssues
        .filter((issue) => Number.isFinite(issue.x) && Number.isFinite(issue.y))
        .slice(0, MARKER_LIMIT);

    if (!issues.length) return;
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('id', 'mapDoctorLayer');
    layer.setAttribute('class', 'map-doctor-layer');
    layer.setAttribute('pointer-events', 'none');
    layer.innerHTML = issues.map((issue, index) => {
        const color = issue.severity === 'P0' ? '#ff6b5d' : issue.severity === 'P1' ? '#f2b75b' : '#d8c47a';
        const label = escapeHtml(issue.severity);
        return `<g class="map-doctor-marker" opacity=".92">
            <circle cx="${issue.x}" cy="${issue.y}" r="${issue.severity === 'P0' ? 26 : 20}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="10 7"/>
            <circle cx="${issue.x}" cy="${issue.y}" r="6" fill="${color}"/>
            <text x="${issue.x + 18}" y="${issue.y - 18}" fill="${color}" font-family="var(--mono)" font-size="18" font-weight="800"
              paint-order="stroke" stroke="rgba(10,8,6,.9)" stroke-width="5">${index + 1} ${label}</text>
        </g>`;
    }).join('');
    svg.appendChild(layer);
}

async function runDoctor() {
    if (isRunning) return;
    isRunning = true;
    renderLoading();
    try {
        lastReport = await runMapDoctor();
        renderReport(lastReport);
    } catch (err) {
        if (body) body.innerHTML = `<div class="map-doctor-empty">Harita doktoru çalışamadı: ${escapeHtml(err.message || err)}</div>`;
        console.warn('Harita doktoru çalışamadı:', err);
    } finally {
        isRunning = false;
    }
}

function focusPoint(x, y) {
    if (window.GELIBOLU_VIEWPORT && typeof window.GELIBOLU_VIEWPORT.focusOnPoint === 'function') {
        window.GELIBOLU_VIEWPORT.focusOnPoint(Number(x), Number(y), 900);
        return;
    }
    const svg = document.getElementById('battleMap');
    if (svg) svg.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function bindActions() {
    root.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-doctor-action]');
        if (!button) return;
        const action = button.dataset.doctorAction;

        if (action === 'toggle') {
            setOpen(!root.classList.contains('is-open'));
            return;
        }
        if (action === 'run') {
            await runDoctor();
            return;
        }
        if (action === 'copy') {
            if (!lastReport) return;
            await navigator.clipboard?.writeText(JSON.stringify(lastReport, null, 2));
            button.textContent = 'Kopyalandı';
            setTimeout(() => { button.textContent = 'JSON Kopyala'; }, 1200);
            return;
        }
        if (action === 'clear-markers') {
            clearMarkers();
            return;
        }
        if (action === 'select-unit') {
            const unitId = button.dataset.unitId;
            window.GELIBOLU_MAP_EDITOR?.open?.();
            window.GELIBOLU_MAP_EDITOR?.selectUnit?.(unitId);
            return;
        }
        if (action === 'focus') {
            focusPoint(button.dataset.x, button.dataset.y);
        }
    });
}

function buildPanel() {
    if (document.getElementById('mapDoctorRoot')) return;
    root = document.createElement('div');
    root.id = 'mapDoctorRoot';
    root.className = 'map-doctor-root';
    root.innerHTML = `
        <button type="button" id="mapDoctorToggle" class="map-doctor-toggle" data-doctor-action="toggle" aria-expanded="false" aria-label="Harita doktorunu aç">
            Harita Doktoru
        </button>
        <aside id="mapDoctorPanel" class="map-doctor-panel" aria-label="Harita doktoru kalite raporu" aria-hidden="true" inert>
            <div class="map-doctor-header">
                <div>
                    <div class="map-doctor-eyebrow">Geliştirici Tanılama</div>
                    <h3>Harita Doktoru</h3>
                </div>
                <button type="button" class="map-doctor-close" data-doctor-action="toggle" aria-label="Harita doktorunu kapat">×</button>
            </div>
            <p class="map-doctor-help">Birimlerin zemine uygunluğu, üst üste binmeler, lokasyon anchor'ları ve harita dili otomatik taranır.</p>
            <div id="mapDoctorBody" class="map-doctor-body"></div>
        </aside>
    `;
    document.body.appendChild(root);

    panel = root.querySelector('#mapDoctorPanel');
    toggle = root.querySelector('#mapDoctorToggle');
    body = root.querySelector('#mapDoctorBody');
    bindActions();
}

export function initMapDoctorPanel() {
    buildPanel();
    setOpen(true);
    runDoctor();

    window.GELIBOLU_MAP_DOCTOR = {
        rerun: runDoctor,
        getReport: () => lastReport,
        open: () => setOpen(true),
        close: () => setOpen(false)
    };
}

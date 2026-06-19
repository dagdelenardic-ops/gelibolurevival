import { MAP_WIDTH, MAP_HEIGHT, MAP_CROP_TOP, MAP_VIEW_HEIGHT } from '../data/coordinate-map.js?v=20260618-3d-spectacle-r2';

const MIN_VIEWBOX_WIDTH = 520;
const MAX_VIEWBOX_WIDTH = MAP_WIDTH;
const WHEEL_ZOOM_IN = 0.88;
const WHEEL_ZOOM_OUT = 1.14;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeViewBox(viewBox) {
    const aspect = MAP_VIEW_HEIGHT / MAP_WIDTH;
    const width = clamp(viewBox.w, MIN_VIEWBOX_WIDTH, MAX_VIEWBOX_WIDTH);
    const height = Math.min(MAP_VIEW_HEIGHT, Math.max(420, width * aspect));
    const x = clamp(viewBox.x, 0, Math.max(0, MAP_WIDTH - width));
    const y = clamp(viewBox.y, MAP_CROP_TOP, Math.max(MAP_CROP_TOP, MAP_HEIGHT - height));

    return { x, y, w: width, h: height };
}

function pointFromClient(svg, viewBox, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
        x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
        y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h
    };
}

export function initTouchZoom(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg || svg.dataset.viewportBound === '1') return;

    svg.dataset.viewportBound = '1';

    let currentViewBox = normalizeViewBox({
        x: svg.viewBox.baseVal.x || 0,
        y: svg.viewBox.baseVal.y || MAP_CROP_TOP,
        w: svg.viewBox.baseVal.width || MAP_WIDTH,
        h: svg.viewBox.baseVal.height || MAP_VIEW_HEIGHT
    });
    let pointerDrag = null;
    let initialPinch = null;

    function applyViewBox(nextViewBox) {
        currentViewBox = normalizeViewBox(nextViewBox);
        svg.setAttribute('viewBox', `${currentViewBox.x.toFixed(1)} ${currentViewBox.y.toFixed(1)} ${currentViewBox.w.toFixed(1)} ${currentViewBox.h.toFixed(1)}`);
    }

    function zoomAt(clientX, clientY, factor) {
        const anchor = pointFromClient(svg, currentViewBox, clientX, clientY);
        const rect = svg.getBoundingClientRect();
        const nextW = currentViewBox.w * factor;
        const nextH = currentViewBox.h * factor;
        const rx = (clientX - rect.left) / rect.width;
        const ry = (clientY - rect.top) / rect.height;

        applyViewBox({
            x: anchor.x - rx * nextW,
            y: anchor.y - ry * nextH,
            w: nextW,
            h: nextH
        });
    }

    function focusOnPoint(x, y, nextWidth = Math.min(currentViewBox.w, 1050)) {
        const width = clamp(nextWidth, MIN_VIEWBOX_WIDTH, MAX_VIEWBOX_WIDTH);
        const height = Math.min(MAP_VIEW_HEIGHT, Math.max(420, width * (currentViewBox.h / currentViewBox.w)));
        applyViewBox({
            x: x - width / 2,
            y: y - height / 2,
            w: width,
            h: height
        });
    }

    function reset() {
        applyViewBox({ x: 0, y: MAP_CROP_TOP, w: MAP_WIDTH, h: MAP_VIEW_HEIGHT });
    }

    function panByClientDelta(dx, dy) {
        const rect = svg.getBoundingClientRect();
        applyViewBox({
            ...currentViewBox,
            x: currentViewBox.x - dx * (currentViewBox.w / rect.width),
            y: currentViewBox.y - dy * (currentViewBox.h / rect.height)
        });
    }

    svg.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? WHEEL_ZOOM_IN : WHEEL_ZOOM_OUT);
    }, { passive: false });

    svg.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('.map-editor-marker, [data-overlay-key]')) return;

        pointerDrag = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            startViewBox: { ...currentViewBox }
        };
        svg.setPointerCapture?.(event.pointerId);
    });

    svg.addEventListener('pointermove', (event) => {
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        const rect = svg.getBoundingClientRect();
        const dx = (event.clientX - pointerDrag.clientX) * (pointerDrag.startViewBox.w / rect.width);
        const dy = (event.clientY - pointerDrag.clientY) * (pointerDrag.startViewBox.h / rect.height);
        applyViewBox({
            ...pointerDrag.startViewBox,
            x: pointerDrag.startViewBox.x - dx,
            y: pointerDrag.startViewBox.y - dy
        });
    });

    svg.addEventListener('pointerup', (event) => {
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        svg.releasePointerCapture?.(event.pointerId);
        pointerDrag = null;
    });

    svg.addEventListener('pointercancel', () => {
        pointerDrag = null;
    });

    svg.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 2) return;
        const [a, b] = event.touches;
        initialPinch = {
            distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
            viewBox: { ...currentViewBox }
        };
    }, { passive: false });

    svg.addEventListener('touchmove', (event) => {
        if (event.touches.length !== 2 || !initialPinch) return;
        event.preventDefault();
        const [a, b] = event.touches;
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (!distance) return;
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        currentViewBox = { ...initialPinch.viewBox };
        zoomAt(midX, midY, initialPinch.distance / distance);
    }, { passive: false });

    svg.addEventListener('touchend', (event) => {
        if (event.touches.length < 2) initialPinch = null;
    });

    const observer = new MutationObserver((mutations) => {
        if (pointerDrag || initialPinch) return;
        if (!mutations.some((mutation) => mutation.attributeName === 'viewBox')) return;

        const vb = svg.viewBox.baseVal;
        currentViewBox = normalizeViewBox({ x: vb.x, y: vb.y, w: vb.width, h: vb.height });
    });
    observer.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });

    applyViewBox(currentViewBox);

    window.GELIBOLU_VIEWPORT = {
        zoomIn: () => focusOnPoint(currentViewBox.x + currentViewBox.w / 2, currentViewBox.y + currentViewBox.h / 2, currentViewBox.w * WHEEL_ZOOM_IN),
        zoomOut: () => focusOnPoint(currentViewBox.x + currentViewBox.w / 2, currentViewBox.y + currentViewBox.h / 2, currentViewBox.w * WHEEL_ZOOM_OUT),
        reset,
        focusOnPoint,
        panByClientDelta,
        getViewBox: () => ({ ...currentViewBox })
    };
}

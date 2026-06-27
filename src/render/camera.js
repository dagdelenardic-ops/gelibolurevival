// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Camera / Viewport System
// ViewBox animasyonu ile bölgesel odaklanma
// ══════════════════════════════════════════════════════════════

import { MAP_WIDTH, MAP_HEIGHT, MAP_CROP_TOP, MAP_VIEW_HEIGHT } from '../data/coordinate-map.js?v=20260622-hp-polish-r1';

let cameraAnimFrame = null;

/**
 * SVG viewBox'ı hedef bölgeye animate et.
 * @param {SVGElement} svg
 * @param {{ x: number, y: number, w: number, h: number }} target
 * @param {number} duration - ms
 */
export function animateCamera(svg, target, duration = 600) {
    if (!svg || !target) return;
    if (cameraAnimFrame) cancelAnimationFrame(cameraAnimFrame);

    const vb = svg.viewBox.baseVal;
    const start = {
        x: Number.isFinite(vb.x) ? vb.x : 0,
        y: Number.isFinite(vb.y) ? vb.y : MAP_CROP_TOP,
        w: Number.isFinite(vb.width) && vb.width > 0 ? vb.width : MAP_WIDTH,
        h: Number.isFinite(vb.height) && vb.height > 0 ? vb.height : MAP_VIEW_HEIGHT
    };
    const targetWidth = Number.isFinite(target.w) && target.w > 0 ? target.w : MAP_WIDTH;
    const targetHeight = Number.isFinite(target.h) && target.h > 0 ? target.h : MAP_VIEW_HEIGHT;
    const targetX = Number.isFinite(target.x) ? target.x : 0;
    const targetY = Number.isFinite(target.y) ? target.y : MAP_CROP_TOP;

    // Clamp target to valid viewport bounds
    const tw = Math.max(600, Math.min(MAP_WIDTH, targetWidth));
    const th = Math.max(500, Math.min(MAP_VIEW_HEIGHT, targetHeight));
    const tx = Math.max(0, Math.min(MAP_WIDTH - tw, targetX));
    const ty = Math.max(MAP_CROP_TOP, Math.min(MAP_HEIGHT - th, targetY));

    const startTime = performance.now();

    function frame(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        // easeInOutQuad
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const cx = start.x + (tx - start.x) * ease;
        const cy = start.y + (ty - start.y) * ease;
        const cw = start.w + (tw - start.w) * ease;
        const ch = start.h + (th - start.h) * ease;

        svg.setAttribute('viewBox', `${cx.toFixed(1)} ${cy.toFixed(1)} ${Math.max(1, cw).toFixed(1)} ${Math.max(1, ch).toFixed(1)}`);

        if (t < 1) {
            cameraAnimFrame = requestAnimationFrame(frame);
        } else {
            cameraAnimFrame = null;
        }
    }

    cameraAnimFrame = requestAnimationFrame(frame);
}

/** Kamerayı varsayılan tam görünüme sıfırla */
export function resetCamera(svg, duration = 400) {
    animateCamera(svg, { x: 0, y: MAP_CROP_TOP, w: MAP_WIDTH, h: MAP_VIEW_HEIGHT }, duration);
}

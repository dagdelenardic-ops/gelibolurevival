// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Camera / Viewport System
// ViewBox animasyonu ile bölgesel odaklanma
// ══════════════════════════════════════════════════════════════

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
    const start = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    // Clamp target to valid viewport bounds
    const tx = Math.max(0, Math.min(720 - target.w, target.x));
    const ty = Math.max(0, Math.min(560 - target.h, target.y));
    const tw = Math.max(200, Math.min(720, target.w));
    const th = Math.max(160, Math.min(560, target.h));

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

        svg.setAttribute('viewBox', `${cx.toFixed(1)} ${cy.toFixed(1)} ${cw.toFixed(1)} ${ch.toFixed(1)}`);

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
    animateCamera(svg, { x: 0, y: 0, w: 720, h: 560 }, duration);
}

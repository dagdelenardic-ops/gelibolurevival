// Merkezi responsive utility — breakpoint / cihaz tespiti tek yerden.
// Tüketiciler NOKTA-ANI örnekler (render anında çağır). Reaktif abonelik YOK.
// Kontrat: clientWidth()===0 (0-genişlik preview/iframe) → masaüstü varsayılır
// (isMobile=false) ki 3B/desktop davranışı yanlışlıkla mobile düşmesin.
// CSS @media breakpoint'leri bu sabitleri (768 / 1024) yansıtmalıdır.
const BP_MOBILE = 768;
const BP_TABLET = 1024;

const _mqReducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion:reduce)') : null;

function clientWidth() {
    if (typeof document === 'undefined') return 1280;
    return document.documentElement?.clientWidth || window.innerWidth || 0;
}

export function isMobile() {
    const cw = clientWidth();
    if (cw === 0) return false;
    return cw <= BP_MOBILE;
}

export function isTablet() {
    const cw = clientWidth();
    if (cw === 0) return false;
    return cw > BP_MOBILE && cw <= BP_TABLET;
}

export function prefersReducedMotion() {
    return _mqReducedMotion ? _mqReducedMotion.matches : false;
}

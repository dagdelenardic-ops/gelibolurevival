// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Campaign Phase State Machine
// Explicit faz tanımları ve entity eligibility kuralları
// ══════════════════════════════════════════════════════════════

import { ENTITY_TYPES, isEntityAllowedInPhase } from '../data/entity-types.js';

/**
 * 5 campaign fazı — ISO date range ile.
 * Her fazın başlangıç/bitiş tarihi, varsayılan sahne modu ve kamera odağı var.
 */
export const CAMPAIGN_PHASES = [
    {
        id: 'naval',
        label: 'Deniz Harekâtı',
        start: '1914-11-03',
        end: '1915-04-24',
        scene: 'naval',
        camera: { x: 350, y: 250, w: 360, h: 280 },
    },
    {
        id: 'landing',
        label: 'Kara Çıkarması',
        start: '1915-04-25',
        end: '1915-05-18',
        scene: 'general',
        camera: { x: 150, y: 150, w: 500, h: 400 },
    },
    {
        id: 'inland_combat',
        label: 'Kara Muharebesi',
        start: '1915-05-19',
        end: '1915-08-05',
        scene: 'general',
        camera: { x: 0, y: 0, w: 720, h: 560 },
    },
    {
        id: 'stalemate',
        label: 'Siper Savaşı / Yıpranma',
        start: '1915-08-06',
        end: '1915-12-06',
        scene: 'general',
        camera: { x: 0, y: 0, w: 720, h: 560 },
    },
    {
        id: 'evacuation',
        label: 'Tahliye',
        start: '1915-12-07',
        end: '1916-01-09',
        scene: 'general',
        camera: { x: 100, y: 100, w: 550, h: 420 },
    },
];

/** ISO tarihten campaign fazını çöz */
export function resolveCampaignPhase(isoDate) {
    if (!isoDate) return CAMPAIGN_PHASES[0];
    const d = String(isoDate);
    for (const phase of CAMPAIGN_PHASES) {
        if (d >= phase.start && d <= phase.end) return phase;
    }
    // Tarih aralık dışındaysa en yakın fazı döndür
    if (d < CAMPAIGN_PHASES[0].start) return CAMPAIGN_PHASES[0];
    return CAMPAIGN_PHASES[CAMPAIGN_PHASES.length - 1];
}

/**
 * İki faz arasındaki geçişte hangi entity tipleri giriyor/çıkıyor?
 * @returns {{ entering: string[], exiting: string[] }}
 */
export function getPhaseTransition(fromPhaseId, toPhaseId) {
    if (fromPhaseId === toPhaseId) return { entering: [], exiting: [] };

    const entering = [];
    const exiting = [];

    for (const [entityType] of Object.entries(ENTITY_TYPES)) {
        const wasAllowed = isEntityAllowedInPhase(entityType, fromPhaseId);
        const isAllowed = isEntityAllowedInPhase(entityType, toPhaseId);
        if (!wasAllowed && isAllowed) entering.push(entityType);
        if (wasAllowed && !isAllowed) exiting.push(entityType);
    }

    return { entering, exiting };
}

/** Mevcut fazın önceki fazdan farklı olup olmadığını kontrol et */
export function isPhaseTransition(prevIso, nextIso) {
    const prev = resolveCampaignPhase(prevIso);
    const next = resolveCampaignPhase(nextIso);
    return prev.id !== next.id;
}

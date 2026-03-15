// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Entity Type Registry
// Her entity tipinin izinli terrain ve faz kuralları
// ══════════════════════════════════════════════════════════════

/**
 * Entity tipleri ve sert render kuralları.
 * allowedTerrain: entity'nin render edilebileceği terrain tipleri
 * allowedPhases:  entity'nin görünebileceği campaign fazları
 */
export const ENTITY_TYPES = {
    ship: {
        allowedTerrain: ['sea'],
        allowedPhases: ['naval', 'landing', 'evacuation'],
    },
    artillery_battery: {
        allowedTerrain: ['land', 'coast'],
        allowedPhases: ['naval', 'landing', 'inland_combat', 'stalemate'],
    },
    infantry_unit: {
        allowedTerrain: ['land', 'coast'],
        allowedPhases: ['landing', 'inland_combat', 'stalemate', 'evacuation'],
    },
    landing_boat: {
        allowedTerrain: ['coast', 'sea'],
        allowedPhases: ['landing'],
    },
};

/** Entity tipi bu campaign fazında izinli mi? */
export function isEntityAllowedInPhase(entityType, campaignPhaseId) {
    const def = ENTITY_TYPES[entityType];
    if (!def) return true; // Tanımsız tip → fallback olarak göster
    return def.allowedPhases.includes(campaignPhaseId);
}

/** Entity tipi bu terrain'de render edilebilir mi? */
export function isEntityAllowedOnTerrain(entityType, terrainType) {
    const def = ENTITY_TYPES[entityType];
    if (!def) return true;
    return def.allowedTerrain.includes(terrainType);
}

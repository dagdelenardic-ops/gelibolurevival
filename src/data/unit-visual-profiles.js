// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Unit Visual Profiles
// Hybrid tactical visuals: strategic symbols + close-zoom sprite layer.
// ══════════════════════════════════════════════════════════════

export const UNIT_VISUAL_PROFILES = {
    'ottoman-infantry': {
        id: 'ottoman-infantry',
        faction: 'ottoman',
        unitClass: 'infantry',
        lodMode: 'hybrid',
        spriteAtlas: 'assets/sprites/ottoman-infantry-atlas.webp',
        atlasReady: false,
        frameMap: {
            idle: [0, 5],
            move: [6, 13],
            fire: [14, 21],
            retreat: [22, 27]
        },
        scale: 1,
        anchorOffset: { x: 0, y: 8 },
        fallbackFigure: 'riflemen'
    },
    'british-infantry': {
        id: 'british-infantry',
        faction: 'british',
        unitClass: 'infantry',
        lodMode: 'hybrid',
        spriteAtlas: 'assets/sprites/british-infantry-atlas.webp',
        atlasReady: false,
        frameMap: {
            idle: [0, 5],
            move: [6, 13],
            fire: [14, 21],
            retreat: [22, 27]
        },
        scale: 1,
        anchorOffset: { x: 0, y: 8 },
        fallbackFigure: 'riflemen'
    },
    'anzac-infantry': {
        id: 'anzac-infantry',
        faction: 'anzac',
        unitClass: 'infantry',
        lodMode: 'hybrid',
        spriteAtlas: 'assets/sprites/anzac-infantry-atlas.webp',
        atlasReady: false,
        frameMap: {
            idle: [0, 5],
            move: [6, 13],
            fire: [14, 21],
            retreat: [22, 27]
        },
        scale: 1,
        anchorOffset: { x: 0, y: 8 },
        fallbackFigure: 'riflemen'
    },
    'french-infantry': {
        id: 'french-infantry',
        faction: 'french',
        unitClass: 'infantry',
        lodMode: 'hybrid',
        spriteAtlas: 'assets/sprites/french-infantry-atlas.webp',
        atlasReady: false,
        frameMap: {
            idle: [0, 5],
            move: [6, 13],
            fire: [14, 21],
            retreat: [22, 27]
        },
        scale: 1,
        anchorOffset: { x: 0, y: 8 },
        fallbackFigure: 'riflemen'
    },
    'ottoman-artillery': {
        id: 'ottoman-artillery',
        faction: 'ottoman',
        unitClass: 'artillery',
        lodMode: 'hybrid',
        spriteAtlas: 'assets/sprites/ottoman-artillery-atlas.webp',
        atlasReady: false,
        frameMap: {
            idle: [0, 5],
            fire: [6, 13]
        },
        scale: 1,
        anchorOffset: { x: 0, y: 8 },
        fallbackFigure: 'gun-crew'
    },
    'naval-symbol': {
        id: 'naval-symbol',
        faction: 'naval',
        unitClass: 'ship',
        lodMode: 'symbol',
        spriteAtlas: null,
        atlasReady: false,
        frameMap: {},
        scale: 1,
        anchorOffset: { x: 0, y: 0 },
        fallbackFigure: null
    }
};

export function getDefaultVisualProfileId(unit) {
    if (!unit) return 'ottoman-infantry';
    if (unit.type === 'deniz' || unit.entityType === 'ship' || unit.entityType === 'landing_boat') return 'naval-symbol';
    if (unit.entityType === 'artillery_battery') return 'ottoman-artillery';
    if (unit.faction === 'british') return 'british-infantry';
    if (unit.faction === 'anzac') return 'anzac-infantry';
    if (unit.faction === 'french') return 'french-infantry';
    return 'ottoman-infantry';
}

export function getUnitVisualProfile(unit) {
    const id = unit?.visualProfileId || getDefaultVisualProfileId(unit);
    return UNIT_VISUAL_PROFILES[id] || UNIT_VISUAL_PROFILES['ottoman-infantry'];
}

export function getSpriteSetId(unit) {
    return unit?.spriteSetId || getUnitVisualProfile(unit).id;
}

export function hasRuntimeSpriteAtlas(profile) {
    return Boolean(profile?.spriteAtlas && profile.atlasReady);
}

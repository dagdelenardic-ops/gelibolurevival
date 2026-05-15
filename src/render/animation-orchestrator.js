// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Animation Orchestrator
// animData (animation-events.json) + animation-language primitifleri
// → eventType + intensity + unit states → zengin savaş animasyonları
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260508-sprint-r1';
import { FRONTLINES } from '../data/frontlines.js?v=20260508-sprint-r1';
import { getUnitVitals } from '../data/casualty-model.js';
import {
    renderAdvanceArrow,
    renderRetreatArrow,
    renderArtilleryArc,
    renderLandingApproach,
    renderFrontlinePressure,
    renderTrenchPair,
    renderTrenchExchange,
    renderAssaultWave,
    renderBarrage,
    renderNoMansLand,
    renderSniperFire,
    renderMineExplosion,
    renderCasualtyIndicator,
    renderEngagementContact,
} from './animation-language.js';

/**
 * Cephe adı → harita geometrisi eşleştirmesi.
 * ottoman/allied pozisyonları + frontline referansı
 */
const FRONT_GEOMETRY = {
    'Deniz': {
        center: { x: 1245, y: 2388 },
        ottoman: { x: 1451, y: 2091 },
        allied: { x: 1215, y: 2420 },
        type: 'naval',
    },
    'Arıburnu': {
        center: { x: 1242, y: 1780 },
        ottoman: { x: 1280, y: 1762 },
        allied: { x: 1210, y: 1815 },
        frontlineId: 'ariburnu-front',
        type: 'trench',
        alliedFaction: 'anzac',
    },
    'Seddülbahir': {
        center: { x: 1040, y: 2388 },
        ottoman: { x: 1080, y: 2320 },
        allied: { x: 1017, y: 2399 },
        frontlineId: 'seddulbahir-front',
        type: 'trench',
        alliedFaction: 'allied',
    },
    'Anafartalar': {
        center: { x: 1260, y: 1706 },
        ottoman: { x: 1296, y: 1728 },
        allied: { x: 1224, y: 1686 },
        frontlineId: 'suvla-front',
        type: 'trench',
        alliedFaction: 'allied',
    },
};

const FACTION_COLORS = {
    ottoman: '#c0392b',
    allied: '#2e6ca4',
    anzac: '#27864a',
    french: '#7b4ea3',
};

/** Frontline ID'den noktaları al */
function getFrontlinePoints(frontlineId) {
    const fl = FRONTLINES.find(f => f.id === frontlineId);
    return fl ? fl.points : null;
}

function getFrontlineCorridor(frontlineId) {
    const fl = FRONTLINES.find(f => f.id === frontlineId);
    return fl ? fl.corridorWidth : 16;
}

/** Tarih tabanlı seed (günlük deterministik random) */
function dateSeed(dateStr) {
    let h = 0;
    for (let i = 0; i < (dateStr || '').length; i++) {
        h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function getPrimaryFronts(fronts, animData) {
    const valid = (Array.isArray(fronts) ? fronts : []).filter((front) => FRONT_GEOMETRY[front]);
    if (!valid.length) return [];

    const eventType = animData?.eventType || '';
    if ((eventType === 'BOMBARDMENT' || eventType === 'NAVAL_PATROL') && valid.includes('Deniz')) {
        return ['Deniz'];
    }

    const preferred = ['Anafartalar', 'Arıburnu', 'Seddülbahir', 'Deniz'];
    const match = preferred.find((front) => valid.includes(front));
    return [match || valid[0]];
}

function normalizeUnitName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

function findModelUnit(animUnit) {
    const wanted = normalizeUnitName(animUnit?.name);
    if (!wanted) return null;
    return BATTLE_DATA.units.find((unit) => {
        const actual = normalizeUnitName(unit.name);
        return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
    }) || null;
}

function getFrontCasualtyLevel(animData, frontName, fallbackIntensity) {
    const units = Array.isArray(animData?.units)
        ? animData.units.filter((unit) => !frontName || unit.front === frontName)
        : [];
    const vitals = units
        .map((animUnit) => {
            const model = findModelUnit(animUnit);
            if (!model?.strength) return null;
            return getUnitVitals(model.id, animData.date, animData.intensity || fallbackIntensity || 0, animUnit.state || 'idle', model.strength);
        })
        .filter(Boolean);

    if (!vitals.length) {
        if (fallbackIntensity >= 8) return 'heavy';
        if (fallbackIntensity >= 6) return 'moderate';
        return 'light';
    }

    const avgLoss = vitals.reduce((sum, item) => sum + item.lossRatio, 0) / vitals.length;
    const minStamina = Math.min(...vitals.map((item) => item.stamina));
    const todayLoss = vitals.reduce((sum, item) => sum + (item.todayLoss || 0), 0);

    if (avgLoss >= 0.42 || minStamina <= 0.24 || todayLoss >= 900 || fallbackIntensity >= 8) return 'heavy';
    if (avgLoss >= 0.2 || minStamina <= 0.46 || todayLoss >= 240 || fallbackIntensity >= 6) return 'moderate';
    return 'light';
}

function isLandModelUnit(unit) {
    if (!unit) return false;
    return unit.type !== 'deniz' && unit.entityType !== 'ship' && unit.entityType !== 'landing_boat';
}

function getAnimSide(animUnit, modelUnit) {
    const raw = String(animUnit?.side || modelUnit?.side || '').toLowerCase();
    if (raw === 'ottoman' || modelUnit?.faction === 'ottoman') return 'ottoman';
    if (raw === 'allied' || ['british', 'anzac', 'french'].includes(modelUnit?.faction)) return 'allied';
    return raw || 'allied';
}

function getSideState(entries, side) {
    return entries
        .filter((entry) => entry.side === side)
        .some((entry) => ['fighting', 'bombardment', 'marching'].includes(String(entry.state || '').toLowerCase()));
}

function getContactLabel(ottoman, allied, frontName) {
    const alliedLabel = allied.model.faction === 'anzac'
        ? 'ANZAC'
        : allied.model.faction === 'french'
            ? 'Fransız'
            : 'İtilaf';
    return `${frontName}: Osmanlı - ${alliedLabel} teması`;
}

function inferAttacker(animData, contactEntries) {
    const vectorSide = String(animData?.movementVector?.side || '').toLowerCase();
    if (vectorSide === 'ottoman' || vectorSide === 'allied') return vectorSide;
    if (vectorSide === 'both') return 'both';

    const ottomanActive = getSideState(contactEntries, 'ottoman');
    const alliedActive = getSideState(contactEntries, 'allied');
    if (ottomanActive && !alliedActive) return 'ottoman';
    if (alliedActive && !ottomanActive) return 'allied';
    return 'both';
}

function buildPositionContacts(animData, positions, frontName, seed) {
    if (!positions || !Array.isArray(animData?.units)) return [];

    const activeEntries = animData.units
        .filter((animUnit) => !frontName || animUnit.front === frontName)
        .map((animUnit) => {
            const model = findModelUnit(animUnit);
            const point = model && positions[model.id];
            if (!isLandModelUnit(model) || !point) return null;
            return {
                animUnit,
                model,
                point,
                side: getAnimSide(animUnit, model),
                state: String(animUnit.state || '').toLowerCase()
            };
        })
        .filter(Boolean);

    const ottomans = activeEntries.filter((entry) => entry.side === 'ottoman');
    const allies = activeEntries.filter((entry) => entry.side === 'allied');
    if (!ottomans.length || !allies.length) return [];

    const usedAllies = new Set();
    const pairs = [];
    const maxPairs = 3;
    const maxDistance = 720;

    ottomans
        .slice()
        .sort((a, b) => {
            const af = a.state === 'fighting' ? 0 : 1;
            const bf = b.state === 'fighting' ? 0 : 1;
            return af - bf || a.model.name.localeCompare(b.model.name, 'tr');
        })
        .forEach((ottoman, index) => {
            if (pairs.length >= maxPairs) return;
            const nearest = allies
                .filter((allied) => !usedAllies.has(allied.model.id))
                .map((allied) => ({
                    allied,
                    distance: Math.hypot(allied.point.x - ottoman.point.x, allied.point.y - ottoman.point.y)
                }))
                .sort((a, b) => a.distance - b.distance)[0];
            if (!nearest || nearest.distance > maxDistance) return;
            usedAllies.add(nearest.allied.model.id);
            pairs.push({
                ottoman,
                allied: nearest.allied,
                distance: nearest.distance,
                seed: seed + index * 41,
                attacker: inferAttacker(animData, [ottoman, nearest.allied]),
                label: getContactLabel(ottoman, nearest.allied, frontName)
            });
        });

    return pairs;
}

// ═══════════════════════════════════════════════════════════

/**
 * Ana orkestratör
 */
export function orchestrateAnimations(animData, positions) {
    if (!animData) return { routes: '', fx: '' };

    const eventType = animData.eventType || 'IDLE';
    const intensity = animData.intensity ?? 0;
    const fronts = getPrimaryFronts(animData.fronts || [], animData);
    const seed = dateSeed(animData.date);

    let routes = '';
    let fx = '';

    switch (eventType) {
        case 'BOMBARDMENT':
            ({ routes, fx } = renderBombardment(animData, fronts, intensity, seed));
            break;
        case 'COMBAT':
            ({ routes, fx } = renderCombat(animData, fronts, intensity, seed, positions));
            break;
        case 'NAVAL_PATROL':
            ({ routes, fx } = renderPatrol(fronts, intensity, seed));
            break;
        case 'LOGISTICS':
            ({ routes, fx } = renderLogistics(fronts, seed));
            break;
        case 'POLITICAL':
        case 'IDLE':
        default:
            if (intensity > 3) {
                ({ routes, fx } = renderIdlePressure(fronts, intensity, seed));
            }
            break;
    }

    return { routes, fx };
}

// ═══════════════════════════════════════════════════════════
// EVENT TYPE RENDERERS
// ═══════════════════════════════════════════════════════════

function renderBombardment(animData, fronts, intensity, seed) {
    let routes = '';
    let fx = '';

    for (let fi = 0; fi < fronts.length; fi++) {
        const frontName = fronts[fi];
        const geo = FRONT_GEOMETRY[frontName];
        if (!geo) continue;

        if (geo.type === 'naval') {
            // ── Deniz bombardımanı ──
            // Gemilerden kıyıya topçu arkları
            routes += renderArtilleryArc(
                { x: geo.allied.x + 20, y: geo.allied.y - 10 },
                geo.ottoman
            );
            // Yoğun bombardımanda baraj efekti
            if (intensity >= 7) {
                fx += renderBarrage(geo.ottoman.x, geo.ottoman.y, 18, 2, seed + fi);
            }
            // Mayın patlaması (18 Mart vb.)
            if (intensity >= 8) {
                fx += renderMineExplosion(geo.center.x - 5, geo.center.y + 10, true);
            }
        } else {
            // ── Kara bombardımanı ──
            routes += renderArtilleryArc(geo.allied, geo.ottoman);
            // Baraj efekti
            fx += renderBarrage(geo.center.x, geo.center.y, 15, intensity >= 7 ? 2 : 1, seed + fi);
        }

        // Cephe nabzı
        const pressureLevel = intensity > 7 ? 'high' : intensity > 4 ? 'medium' : 'low';
        fx += renderFrontlinePressure(geo.center.x, geo.center.y, pressureLevel);

        // Kayıp göstergesi, cephedeki güncel yıpranma seviyesine göre güçlenir.
        if (intensity >= 6) {
            fx += renderCasualtyIndicator(geo.center.x, geo.center.y + 8, getFrontCasualtyLevel(animData, frontName, intensity));
        }
    }

    return { routes, fx };
}

function renderCombat(animData, fronts, intensity, seed, positions) {
    let routes = '';
    let fx = '';

    const ottomanFighting = animData.units?.some(u => u.side === 'ottoman' && u.state === 'fighting');
    const alliedFighting = animData.units?.some(u => u.side === 'allied' && u.state === 'fighting');
    for (let fi = 0; fi < fronts.length; fi++) {
        const frontName = fronts[fi];
        const geo = FRONT_GEOMETRY[frontName];
        if (!geo) continue;
        const alliedColor = FACTION_COLORS[geo.alliedFaction || 'allied'];

        if (geo.type === 'trench') {
            const flPoints = getFrontlinePoints(geo.frontlineId);
            const corridor = getFrontlineCorridor(geo.frontlineId);

            if (flPoints) {
                routes += renderTrenchPair(flPoints, corridor, FACTION_COLORS.ottoman, alliedColor);
                if (intensity > 4) {
                    fx += renderNoMansLand(flPoints, corridor * 0.6);
                }
            }

            const contactPairs = buildPositionContacts(animData, positions, frontName, seed + fi * 73);
            contactPairs.forEach((pair) => {
                const pairAlliedColor = BATTLE_DATA.factions[pair.allied.model.faction]?.colorLight || alliedColor;
                routes += renderEngagementContact(pair.ottoman.point, pair.allied.point, {
                    intensity,
                    seed: pair.seed,
                    attacker: pair.attacker,
                    ottomanColor: FACTION_COLORS.ottoman,
                    alliedColor: pairAlliedColor,
                    label: pair.label
                });
            });

            if (intensity >= 5 && !contactPairs.length) {
                const from = alliedFighting && !ottomanFighting ? geo.allied : geo.ottoman;
                const to = from === geo.allied ? geo.ottoman : geo.allied;
                routes += renderTrenchExchange(from, to, Math.min(intensity, 7), seed + fi * 100);
            }

            if (intensity >= 3 && intensity < 5) {
                routes += renderSniperFire(geo.ottoman, geo.allied, seed + fi * 30);
            }

            if (ottomanFighting && intensity >= 7) {
                routes += renderAssaultWave(geo.ottoman, geo.center, FACTION_COLORS.ottoman, 2);
            } else if (alliedFighting && intensity >= 7) {
                routes += renderAssaultWave(geo.allied, geo.center, alliedColor, 2);
            }

            if (intensity >= 8) {
                fx += renderBarrage(geo.center.x, geo.center.y, 12, 2, seed + fi * 200);
            }

            const pressureLevel = intensity >= 8 ? 'high' : intensity >= 5 ? 'medium' : 'low';
            fx += renderFrontlinePressure(geo.center.x, geo.center.y, pressureLevel);

            if (intensity >= 7) {
                const casualtyLevel = getFrontCasualtyLevel(animData, frontName, intensity);
                fx += renderCasualtyIndicator(geo.center.x, geo.center.y + 10, casualtyLevel);
            }

            if (intensity <= 4 && ottomanFighting) {
                routes += renderRetreatArrow(geo.center, geo.allied, alliedColor);
            } else if (intensity <= 4 && alliedFighting) {
                routes += renderRetreatArrow(geo.center, geo.ottoman, FACTION_COLORS.ottoman);
            }

        } else {
            if (ottomanFighting && intensity > 4) {
                routes += renderAdvanceArrow(geo.ottoman, geo.center, FACTION_COLORS.ottoman);
            } else if (alliedFighting && intensity > 4) {
                routes += renderAdvanceArrow(geo.allied, geo.center, FACTION_COLORS.allied);
            }

            if (intensity > 5) {
                routes += renderArtilleryArc(geo.allied, geo.ottoman);
            }

            if (intensity >= 8) {
                fx += renderMineExplosion(geo.center.x + 8, geo.center.y - 5, true);
            }

            fx += renderFrontlinePressure(geo.center.x, geo.center.y,
                intensity > 7 ? 'high' : intensity > 4 ? 'medium' : 'low');
        }
    }

    return { routes, fx };
}

function renderPatrol(fronts, intensity, seed) {
    let routes = '';
    let fx = '';

    for (let fi = 0; fi < fronts.length; fi++) {
        const frontName = fronts[fi];
        const geo = FRONT_GEOMETRY[frontName];
        if (!geo) continue;

        if (intensity > 2) {
            fx += renderFrontlinePressure(geo.center.x, geo.center.y, 'low');
        }

        // Devriye durumunda bile keskin nişancı ateşi olabilir
        if (intensity >= 4 && geo.type === 'trench') {
            routes += renderSniperFire(geo.ottoman, geo.allied, seed + fi * 13);
        }
    }

    return { routes, fx };
}

function renderLogistics(fronts, seed) {
    let routes = '';

    for (const frontName of fronts) {
        const geo = FRONT_GEOMETRY[frontName];
        if (!geo) continue;

        const rear = geo.type === 'naval'
            ? { x: geo.allied.x + 40, y: geo.allied.y }
            : { x: geo.ottoman.x + 20, y: geo.ottoman.y - 20 };

        routes += renderAdvanceArrow(rear, geo.ottoman, 'rgba(200,180,100,.5)');
    }

    return { routes, fx: '' };
}

function renderIdlePressure(fronts, intensity, seed) {
    let routes = '';
    let fx = '';

    for (let fi = 0; fi < fronts.length; fi++) {
        const frontName = fronts[fi];
        const geo = FRONT_GEOMETRY[frontName];
        if (!geo) continue;

        fx += renderFrontlinePressure(geo.center.x, geo.center.y, 'low');

        // Siper cephesinde sessiz günlerde bile keskin nişancı
        if (geo.type === 'trench' && intensity >= 4) {
            routes += renderSniperFire(geo.ottoman, geo.allied, seed + fi * 7);
        }
    }

    return { routes, fx };
}

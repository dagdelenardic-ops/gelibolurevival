// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Animation Orchestrator
// animData (animation-events.json) + animation-language primitifleri
// → eventType + intensity + unit states → zengin savaş animasyonları
// ══════════════════════════════════════════════════════════════

import { LOCATION_BY_ID } from '../data/battle-data.js';
import { FRONTLINES } from '../data/frontlines.js';
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
} from './animation-language.js';

/**
 * Cephe adı → harita geometrisi eşleştirmesi.
 * ottoman/allied pozisyonları + frontline referansı
 */
const FRONT_GEOMETRY = {
    'Deniz': {
        center: { x: 445, y: 338 },
        ottoman: { x: 408, y: 348 },
        allied: { x: 480, y: 330 },
        type: 'naval',
    },
    'Arıburnu': {
        center: { x: 240, y: 250 },
        ottoman: { x: 270, y: 240 },
        allied: { x: 222, y: 258 },
        frontlineId: 'ariburnu-front',
        type: 'trench',
        alliedFaction: 'anzac',
    },
    'Seddülbahir': {
        center: { x: 310, y: 440 },
        ottoman: { x: 305, y: 420 },
        allied: { x: 315, y: 460 },
        frontlineId: 'seddulbahir-front',
        type: 'trench',
        alliedFaction: 'allied',
    },
    'Anafartalar': {
        center: { x: 290, y: 160 },
        ottoman: { x: 320, y: 155 },
        allied: { x: 260, y: 165 },
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

// ═══════════════════════════════════════════════════════════

/**
 * Ana orkestratör
 */
export function orchestrateAnimations(animData, positions) {
    if (!animData) return { routes: '', fx: '' };

    const eventType = animData.eventType || 'IDLE';
    const intensity = animData.intensity ?? 0;
    const fronts = animData.fronts || [];
    const seed = dateSeed(animData.date);

    let routes = '';
    let fx = '';

    switch (eventType) {
        case 'BOMBARDMENT':
            ({ routes, fx } = renderBombardment(animData, fronts, intensity, seed));
            break;
        case 'COMBAT':
            ({ routes, fx } = renderCombat(animData, fronts, intensity, seed));
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
                fx = renderIdlePressure(fronts, intensity, seed);
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
            if (intensity > 6) {
                routes += renderArtilleryArc(
                    { x: geo.allied.x + 10, y: geo.allied.y + 15 },
                    { x: geo.ottoman.x - 10, y: geo.ottoman.y + 12 }
                );
            }
            // Yoğun bombardımanda baraj efekti
            if (intensity >= 7) {
                fx += renderBarrage(geo.ottoman.x, geo.ottoman.y, 18, Math.ceil(intensity / 2), seed + fi);
            }
            // Mayın patlaması (18 Mart vb.)
            if (intensity >= 8) {
                fx += renderMineExplosion(geo.center.x - 5, geo.center.y + 10, true);
            }
        } else {
            // ── Kara bombardımanı ──
            routes += renderArtilleryArc(geo.allied, geo.ottoman);
            if (intensity > 6) {
                routes += renderArtilleryArc(
                    { x: geo.allied.x + 8, y: geo.allied.y - 5 },
                    { x: geo.ottoman.x - 5, y: geo.ottoman.y + 8 }
                );
            }
            // Baraj efekti
            fx += renderBarrage(geo.center.x, geo.center.y, 15, Math.min(intensity - 3, 5), seed + fi);
        }

        // Cephe nabzı
        const pressureLevel = intensity > 7 ? 'high' : intensity > 4 ? 'medium' : 'low';
        fx += renderFrontlinePressure(geo.center.x, geo.center.y, pressureLevel);

        // Kayıp göstergesi (yoğun bombardımanda)
        if (intensity >= 7) {
            fx += renderCasualtyIndicator(geo.center.x, geo.center.y + 8, 'moderate');
        }
    }

    return { routes, fx };
}

function renderCombat(animData, fronts, intensity, seed) {
    let routes = '';
    let fx = '';

    const ottomanFighting = animData.units?.some(u => u.side === 'ottoman' && u.state === 'fighting');
    const alliedFighting = animData.units?.some(u => u.side === 'allied' && u.state === 'fighting');
    const alliedBombarding = animData.units?.some(u => u.side === 'allied' && u.state === 'bombardment');

    for (let fi = 0; fi < fronts.length; fi++) {
        const frontName = fronts[fi];
        const geo = FRONT_GEOMETRY[frontName];
        if (!geo) continue;
        const alliedColor = FACTION_COLORS[geo.alliedFaction || 'allied'];

        if (geo.type === 'trench') {
            // ═══════════════════════════════════
            // SİPER SAVAŞI — zengin katmanlı
            // ═══════════════════════════════════

            const flPoints = getFrontlinePoints(geo.frontlineId);
            const corridor = getFrontlineCorridor(geo.frontlineId);

            // 1. Siper çifti (her zaman göster — cephe varlığını belirtir)
            if (flPoints) {
                routes += renderTrenchPair(flPoints, corridor, FACTION_COLORS.ottoman, alliedColor);

                // 2. No-man's land gerginliği (intensity > 4)
                if (intensity > 4) {
                    fx += renderNoMansLand(flPoints, corridor * 0.6);
                }
            }

            // 3. Siper ateş alışverişi — yıpratma teması
            if (intensity >= 5) {
                // Osmanlı → İtilaf ateşi
                routes += renderTrenchExchange(geo.ottoman, geo.allied, intensity, seed + fi * 100);
                // İtilaf → Osmanlı ateşi
                routes += renderTrenchExchange(geo.allied, geo.ottoman, intensity, seed + fi * 100 + 50);
            }

            // 4. Keskin nişancı ateşi (düşük-orta yoğunlukta)
            if (intensity >= 3 && intensity <= 6) {
                routes += renderSniperFire(geo.ottoman, geo.allied, seed + fi * 30);
                if (intensity >= 5) {
                    routes += renderSniperFire(geo.allied, geo.ottoman, seed + fi * 30 + 17);
                }
            }

            // 5. Taarruz dalgaları (yüksek intensity, fighting state)
            if (ottomanFighting && intensity >= 7) {
                routes += renderAssaultWave(geo.ottoman, geo.center, FACTION_COLORS.ottoman,
                    intensity >= 8 ? 3 : 2);
            }
            if (alliedFighting && intensity >= 7) {
                routes += renderAssaultWave(geo.allied, geo.center, alliedColor,
                    intensity >= 8 ? 3 : 2);
            }

            // 6. Topçu desteği (bombardment state olan birimler varsa)
            if (alliedBombarding && intensity >= 6) {
                routes += renderArtilleryArc(
                    { x: geo.allied.x - 15, y: geo.allied.y + 10 },
                    { x: geo.ottoman.x + 5, y: geo.ottoman.y - 5 }
                );
            }
            if (intensity >= 7) {
                // Osmanlı topçu cevabı
                routes += renderArtilleryArc(
                    { x: geo.ottoman.x + 15, y: geo.ottoman.y - 10 },
                    { x: geo.allied.x, y: geo.allied.y + 5 }
                );
            }

            // 7. Baraj efekti (çok yoğun çatışma)
            if (intensity >= 8) {
                fx += renderBarrage(geo.center.x, geo.center.y, 12, 4, seed + fi * 200);
            }

            // 8. Cephe nabzı
            const pressureLevel = intensity >= 8 ? 'high' : intensity >= 5 ? 'medium' : 'low';
            fx += renderFrontlinePressure(geo.center.x, geo.center.y, pressureLevel);

            // 9. Kayıp göstergesi
            if (intensity >= 7) {
                const casualtyLevel = intensity >= 8 ? 'heavy' : 'moderate';
                fx += renderCasualtyIndicator(
                    geo.center.x + (fi % 2 === 0 ? -8 : 8),
                    geo.center.y + 10,
                    casualtyLevel
                );
            }

            // 10. Geri çekilme (baskı altında — düşük intensity ama fighting var)
            if (intensity <= 4 && ottomanFighting) {
                routes += renderRetreatArrow(geo.center, geo.allied, alliedColor);
            }
            if (intensity <= 4 && alliedFighting) {
                routes += renderRetreatArrow(geo.center, geo.ottoman, FACTION_COLORS.ottoman);
            }

        } else {
            // ═══════════════════════════════════
            // DENİZ MUHAREBESİ
            // ═══════════════════════════════════

            if (ottomanFighting && intensity > 4) {
                routes += renderAdvanceArrow(geo.ottoman, geo.center, FACTION_COLORS.ottoman);
            }
            if (alliedFighting && intensity > 4) {
                routes += renderAdvanceArrow(geo.allied, geo.center, FACTION_COLORS.allied);
            }

            // Topçu düellosu
            if (intensity > 5) {
                routes += renderArtilleryArc(geo.allied, geo.ottoman);
                routes += renderArtilleryArc(
                    { x: geo.ottoman.x, y: geo.ottoman.y - 8 },
                    { x: geo.allied.x, y: geo.allied.y + 5 }
                );
            }

            // Deniz mayını
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

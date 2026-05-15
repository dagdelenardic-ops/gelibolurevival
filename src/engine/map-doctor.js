// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Harita Doktoru
// Terrain, çakışma ve label sorunlarını ölçen geliştirici aracı
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA, getMapLocationById } from '../data/battle-data.js?v=20260508-sprint-r1';
import { ENTITY_TYPES } from '../data/entity-types.js';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CROP_TOP } from '../data/coordinate-map.js?v=20260407-manual-r1';
import { MAP_SCENE_LABELS, calibrationReport } from '../data/geo-calibration.js?v=20260508-sprint-r1';
import { getTerrainAtPoint, clampToAllowedTerrain, waitForTerrainSampler } from '../data/terrain-zones.js';
import { isUnitDestroyed } from '../data/canonical-positions.js';
import {
    getHistoricalDataDiagnostics,
    getHistoricalPlacementForUnit,
    getHistoricalSourcesForIds
} from '../data/historical-map-data.js?v=20260407-manual-r1';
import { getUnitEntryPhaseIndex } from './phase-engine.js?v=20260508-sprint-r1';
import {
    enforceCorridorSeparation,
    getClusterOffset,
    getNarrativeNavalPosition,
    getTerrainSafePointForUnit,
    isDestroyedPhaseData
} from './position-engine.js?v=20260508-sprint-r1';
import { resolveCampaignPhase } from './campaign-state-machine.js';

const COLLISION_RADIUS = 64;
const NAVAL_COLLISION_RADIUS = 86;
const MAX_ANCHOR_DRIFT = 520;
const MAX_COLLISION_GROUPS = 220;
const MAX_TERRAIN_ISSUES = 420;
const MAX_HISTORICAL_ISSUES = 260;
const MAX_CALIBRATION_RMS = 35;

const SCENE_LABEL_TRANSLATIONS = {
    'naval-dardanelles-narrows': 'ÇANAKKALE BOĞAZI',
    'naval-minefield': 'MAYIN HATTI',
    'anzac-cove': 'ARIBURNU KOYU',
    'anzac-sari-bair': 'SARI BAYIR',
    'helles-x-beach': 'X PLAJI',
    'helles-v-beach': 'V PLAJI',
    'helles-w-beach': 'W PLAJI',
    'helles-achi-baba': 'ALÇITEPE'
};

function round(value) {
    return Math.round(Number(value) || 0);
}

function hasPoint(value) {
    return value && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function firstLocationId(value) {
    const ids = Array.isArray(value) ? value : [value];
    return ids.find((id) => id && id !== 'destroyed') || '';
}

function clampMapPoint(x, y) {
    return {
        x: Math.max(0, Math.min(MAP_WIDTH, round(x))),
        y: Math.max(MAP_CROP_TOP, Math.min(MAP_HEIGHT, round(y)))
    };
}

function getSeverity(type, issue = {}) {
    if (type === 'terrain') {
        if (issue.unitType === 'deniz' && issue.terrain === 'land') return 'P0';
        if (issue.entityType === 'infantry_unit' && issue.terrain === 'sea') return 'P0';
        return 'P1';
    }
    if (type === 'collision') return issue.count >= 5 ? 'P1' : 'P2';
    if (type === 'anchor-drift') return 'P2';
    if (type === 'label-language') return 'P2';
    if (type === 'location-terrain') return 'P1';
    if (type === 'historical-data') return issue.diagnosticType === 'high-residual' ? 'P2' : 'P1';
    if (type === 'calibration-gate') return 'P1';
    if (type === 'missing-source') return 'P1';
    if (type === 'route-deviation') return 'P2';
    if (type === 'historical-anchor-drift') return 'P2';
    if (type === 'frontline-side-mismatch') return 'P1';
    if (type === 'low-confidence') return 'P3';
    return 'P3';
}

function getUnitAllowedTerrain(unit) {
    return ENTITY_TYPES[unit.entityType]?.allowedTerrain || ['land', 'coast', 'sea'];
}

function getRenderedPhaseEntries(phase, phaseIndex) {
    const unitEntry = getUnitEntryPhaseIndex();
    const campaignPhase = resolveCampaignPhase(String(phase.isoStart || ''));
    const spread = {};
    const entries = [];

    for (const unit of BATTLE_DATA.units) {
        const entryIndex = unitEntry[unit.id] ?? 0;
        if (phaseIndex < entryIndex) continue;
        if (isUnitDestroyed(unit.id, String(phase.isoStart || ''))) continue;

        const typeDef = ENTITY_TYPES[unit.entityType];
        if (typeDef && !typeDef.allowedPhases.includes(campaignPhase.id)) continue;

        const phaseData = unit.phases && unit.phases[phase.id];
        if (unit.type === 'deniz' && isDestroyedPhaseData(phaseData)) continue;
        const point = phaseData || (!isDestroyedPhaseData(phaseData) ? getNarrativeNavalPosition(unit, phaseIndex) : null);
        if (!hasPoint(point)) continue;

        const separated = enforceCorridorSeparation(point.x, point.y, unit, campaignPhase.id);
        const offset = getClusterOffset(spread, separated.x, separated.y, unit, phaseIndex);
        const rendered = getTerrainSafePointForUnit(separated.x + offset.x, separated.y + offset.y, unit);

        entries.push({
            unit,
            point: {
                x: round(rendered.x),
                y: round(rendered.y)
            }
        });
    }

    return entries;
}

function makeTerrainIssue(unit, phase, point, terrain, allowedTerrain) {
    const clamped = clampToAllowedTerrain(point.x, point.y, allowedTerrain);
    const suggested = clampMapPoint(clamped.x, clamped.y);
    const issue = {
        id: `terrain:${phase.id}:${unit.id}`,
        type: 'terrain',
        severity: '',
        unitId: unit.id,
        unitName: unit.name,
        unitType: unit.type,
        entityType: unit.entityType,
        phaseId: phase.id,
        phaseTitle: phase.title,
        isoStart: phase.isoStart,
        terrain,
        allowedTerrain,
        x: round(point.x),
        y: round(point.y),
        suggestedX: suggested.x,
        suggestedY: suggested.y,
        message: `${unit.name} ${phase.date} fazında ${terrain} üzerinde; izinli zemin: ${allowedTerrain.join(', ')}.`
    };
    issue.severity = getSeverity('terrain', issue);
    return issue;
}

function analyzeTerrainIssues(phases) {
    const issues = [];

    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
        const phase = phases[phaseIndex];
        for (const { unit, point } of getRenderedPhaseEntries(phase, phaseIndex)) {
            const allowedTerrain = getUnitAllowedTerrain(unit);
            const terrain = getTerrainAtPoint(point.x, point.y);
            if (allowedTerrain.includes(terrain)) continue;

            issues.push(makeTerrainIssue(unit, phase, point, terrain, allowedTerrain));
            if (issues.length >= MAX_TERRAIN_ISSUES) return issues;
        }
    }

    return issues;
}

function analyzeCollisionIssues(phases) {
    const issues = [];

    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
        const phase = phases[phaseIndex];
        const units = getRenderedPhaseEntries(phase, phaseIndex);

        const visited = new Set();
        for (let i = 0; i < units.length; i++) {
            if (visited.has(i)) continue;
            const seed = units[i];
            const group = [seed];
            visited.add(i);

            for (let j = i + 1; j < units.length; j++) {
                if (visited.has(j)) continue;
                const other = units[j];
                const dist = Math.hypot(seed.point.x - other.point.x, seed.point.y - other.point.y);
                const radius = seed.unit.type === 'deniz' && other.unit.type === 'deniz'
                    ? NAVAL_COLLISION_RADIUS
                    : COLLISION_RADIUS;
                if (dist <= radius) {
                    group.push(other);
                    visited.add(j);
                }
            }

            if (group.length < 3) continue;
            const isNavalGroup = group.every((entry) => entry.unit.type === 'deniz');
            const collisionRadius = isNavalGroup ? NAVAL_COLLISION_RADIUS : COLLISION_RADIUS;
            const avgX = group.reduce((sum, entry) => sum + entry.point.x, 0) / group.length;
            const avgY = group.reduce((sum, entry) => sum + entry.point.y, 0) / group.length;
            const issue = {
                id: `collision:${phase.id}:${round(avgX)}:${round(avgY)}`,
                type: 'collision',
                severity: '',
                phaseId: phase.id,
                phaseTitle: phase.title,
                isoStart: phase.isoStart,
                x: round(avgX),
                y: round(avgY),
                count: group.length,
                radius: collisionRadius,
                unitIds: group.map((entry) => entry.unit.id),
                unitNames: group.map((entry) => entry.unit.name),
                message: `${phase.date} fazında ${group.length} birim ${collisionRadius}px içinde üst üste biniyor.`
            };
            issue.severity = getSeverity('collision', issue);
            issues.push(issue);
            if (issues.length >= MAX_COLLISION_GROUPS) return issues;
        }
    }

    return issues;
}

function analyzeAnchorDriftIssues(phases) {
    const issues = [];
    const samplePhases = phases.filter((phase, index) => index === 0 || phase.importance === 'major' || index % 28 === 0);

    for (const phase of samplePhases) {
        const iso = String(phase.isoStart || '');
        for (const unit of BATTLE_DATA.units) {
            if (unit.type === 'deniz') continue;
            if (isUnitDestroyed(unit.id, iso)) continue;
            const anchorId = firstLocationId(phase.locationByUnit && phase.locationByUnit[unit.id]) || unit.anchorRegion;
            const anchor = anchorId && getMapLocationById(anchorId);
            const point = unit.phases && unit.phases[phase.id];
            if (isDestroyedPhaseData(point)) continue;
            if (!anchor || !hasPoint(point)) continue;
            if (getHistoricalPlacementForUnit(unit, iso)) continue;

            const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
            if (distance <= MAX_ANCHOR_DRIFT) continue;

            const issue = {
                id: `anchor:${phase.id}:${unit.id}`,
                type: 'anchor-drift',
                severity: 'P2',
                phaseId: phase.id,
                phaseTitle: phase.title,
                isoStart: phase.isoStart,
                unitId: unit.id,
                unitName: unit.name,
                anchorRegion: anchorId,
                anchorName: anchor.name,
                x: round(point.x),
                y: round(point.y),
                distance: round(distance),
                message: `${unit.name}, ${unit.anchorRegion} anchor'ından ${round(distance)}px uzakta.`
            };
            issues.push(issue);
        }
    }

    return issues;
}

function makeSourceReferences(sourceIds = []) {
    return getHistoricalSourcesForIds(sourceIds).map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url,
        confidence: source.confidence
    }));
}

function analyzeHistoricalDataIssues() {
    return getHistoricalDataDiagnostics().map((diagnostic) => {
        const issue = {
            id: `historical-data:${diagnostic.kind || 'record'}:${diagnostic.id}:${diagnostic.type}`,
            type: 'historical-data',
            diagnosticType: diagnostic.type,
            severity: '',
            referenceId: diagnostic.id,
            message: diagnostic.message || 'Tarihsel harita veri kaydı doğrulanamadı.'
        };
        issue.severity = getSeverity('historical-data', issue);
        return issue;
    });
}

function analyzeHistoricalPlacementIssues(phases) {
    const issues = [];

    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
        const phase = phases[phaseIndex];
        const iso = String(phase.isoStart || '');

        for (const { unit, point } of getRenderedPhaseEntries(phase, phaseIndex)) {
            const placement = getHistoricalPlacementForUnit(unit, iso);

            if (!placement) {
                const issue = {
                    id: `missing-source:${phase.id}:${unit.id}`,
                    type: 'missing-source',
                    severity: getSeverity('missing-source'),
                    phaseId: phase.id,
                    phaseTitle: phase.title,
                    isoStart: iso,
                    unitId: unit.id,
                    unitName: unit.name,
                    x: point.x,
                    y: point.y,
                    message: `${unit.name} için ${iso} tarihinde kaynaklı historical anchor/route bulunamadı.`
                };
                issues.push(issue);
                if (issues.length >= MAX_HISTORICAL_ISSUES) return issues;
                continue;
            }

            const sources = makeSourceReferences(placement.sourceIds);
            if (!sources.length) {
                const issue = {
                    id: `missing-source-ref:${phase.id}:${unit.id}:${placement.id}`,
                    type: 'missing-source',
                    severity: getSeverity('missing-source'),
                    phaseId: phase.id,
                    phaseTitle: phase.title,
                    isoStart: iso,
                    unitId: unit.id,
                    unitName: unit.name,
                    x: point.x,
                    y: point.y,
                    message: `${unit.name} için historical kayıt var ama kaynak referansı yok.`
                };
                issues.push(issue);
                if (issues.length >= MAX_HISTORICAL_ISSUES) return issues;
                continue;
            }

            if (placement.confidence === 'low') {
                const issue = {
                    id: `low-confidence:${phase.id}:${unit.id}:${placement.id}`,
                    type: 'low-confidence',
                    severity: getSeverity('low-confidence'),
                    phaseId: phase.id,
                    phaseTitle: phase.title,
                    isoStart: iso,
                    unitId: unit.id,
                    unitName: unit.name,
                    x: point.x,
                    y: point.y,
                    sources,
                    message: `${unit.name} ${iso} konumu düşük güvenli tarihsel kayda dayanıyor.`
                };
                issues.push(issue);
                if (issues.length >= MAX_HISTORICAL_ISSUES) return issues;
            }

            if (placement.side && unit.side && placement.side !== unit.side) {
                const issue = {
                    id: `frontline-side:${phase.id}:${unit.id}:${placement.id}`,
                    type: 'frontline-side-mismatch',
                    severity: getSeverity('frontline-side-mismatch'),
                    phaseId: phase.id,
                    phaseTitle: phase.title,
                    isoStart: iso,
                    unitId: unit.id,
                    unitName: unit.name,
                    x: point.x,
                    y: point.y,
                    sources,
                    message: `${unit.name} kaynaklı cephe tarafı ${placement.side}; birim tarafı ${unit.side}.`
                };
                issues.push(issue);
                if (issues.length >= MAX_HISTORICAL_ISSUES) return issues;
            }

            if (hasPoint(placement.point)) {
                const expectedPoint = getTerrainSafePointForUnit(placement.point.x, placement.point.y, unit);
                const distance = Math.hypot(point.x - expectedPoint.x, point.y - expectedPoint.y);
                const tolerance = Number(placement.tolerance) || 180;
                if (distance > tolerance) {
                    const type = placement.kind === 'route' ? 'route-deviation' : 'historical-anchor-drift';
                    const issue = {
                        id: `${type}:${phase.id}:${unit.id}:${placement.id}`,
                        type,
                        severity: getSeverity(type),
                        phaseId: phase.id,
                        phaseTitle: phase.title,
                        isoStart: iso,
                        unitId: unit.id,
                        unitName: unit.name,
                        x: point.x,
                        y: point.y,
                        expectedX: round(expectedPoint.x),
                        expectedY: round(expectedPoint.y),
                        distance: round(distance),
                        tolerance,
                        sources,
                        message: `${unit.name} ${iso} konumu kaynaklı ${placement.kind} noktasından ${round(distance)}px sapıyor.`
                    };
                    issues.push(issue);
                    if (issues.length >= MAX_HISTORICAL_ISSUES) return issues;
                }
            }
        }
    }

    return issues;
}

function inferExpectedLocationTerrain(location) {
    if (location.id === 'ikiz-koyu') return ['land', 'coast', 'sea'];
    const name = `${location.id} ${location.name}`.toLowerCase();
    if (name.includes('koyu') || name.includes('boğaz') || name.includes('bogaz') || name.includes('suvla')) {
        return ['sea', 'coast'];
    }
    return ['land', 'coast'];
}

function analyzeLocationIssues() {
    return BATTLE_DATA.locations
        .filter((location) => !location.hiddenOnMap && hasPoint(location))
        .map((location) => {
            const terrain = getTerrainAtPoint(location.x, location.y);
            const expected = inferExpectedLocationTerrain(location);
            if (expected.includes(terrain)) return null;

            const issue = {
                id: `location:${location.id}`,
                type: 'location-terrain',
                severity: 'P1',
                locationId: location.id,
                locationName: location.name,
                x: round(location.x),
                y: round(location.y),
                terrain,
                expectedTerrain: expected,
                message: `${location.name} lokasyonu ${terrain} üzerinde görünüyor; beklenen: ${expected.join(', ')}.`
            };
            return issue;
        })
        .filter(Boolean);
}

function isEnglishMapLabel(label) {
    const text = String(label.text || '').trim();
    if (!text) return false;
    if (SCENE_LABEL_TRANSLATIONS[label.id]) return SCENE_LABEL_TRANSLATIONS[label.id] !== text;
    return /^[A-Z0-9\s.-]+$/.test(text) && /[A-Z]{3,}/.test(text) && !/[ÇĞİÖŞÜ]/.test(text);
}

function analyzeLabelLanguageIssues() {
    return MAP_SCENE_LABELS
        .filter(isEnglishMapLabel)
        .map((label) => ({
            id: `label:${label.id}`,
            type: 'label-language',
            severity: 'P2',
            labelId: label.id,
            x: round(label.x),
            y: round(label.y),
            currentText: label.text,
            suggestedText: SCENE_LABEL_TRANSLATIONS[label.id] || label.text,
            message: `${label.text} sahne etiketi Türkçe harita diliyle karışıyor.`
        }));
}

function analyzeCalibrationGateIssues() {
    const report = calibrationReport();
    if (report.rms <= MAX_CALIBRATION_RMS) return [];
    return [{
        id: 'calibration:rms-gate',
        type: 'calibration-gate',
        severity: getSeverity('calibration-gate'),
        rms: report.rms,
        threshold: MAX_CALIBRATION_RMS,
        message: `Harita kalibrasyon RMS ${report.rms}px; görsel birlik katmanı için hedef ${MAX_CALIBRATION_RMS}px altında.`
    }];
}

function buildSummary(issueGroups) {
    const allIssues = Object.values(issueGroups).flat();
    const calibration = calibrationReport();
    const routeDeviationIssues = issueGroups.historicalPlacement.filter((issue) => issue.type === 'route-deviation');
    const bySeverity = allIssues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
    }, { P0: 0, P1: 0, P2: 0, P3: 0 });

    return {
        totalIssues: allIssues.length,
        bySeverity,
        terrainIssues: issueGroups.terrain.length,
        collisionIssues: issueGroups.collisions.length,
        anchorDriftIssues: issueGroups.anchorDrift.length,
        locationIssues: issueGroups.locations.length,
        calibrationIssues: issueGroups.calibration.length,
        calibrationRms: calibration.rms,
        calibrationGatePass: calibration.rms <= MAX_CALIBRATION_RMS,
        labelLanguageIssues: issueGroups.labels.length,
        historicalIssues: issueGroups.historicalData.length + issueGroups.historicalPlacement.length,
        missingSourceIssues: issueGroups.historicalPlacement.filter((issue) => issue.type === 'missing-source').length,
        routeDeviationIssues: routeDeviationIssues.length,
        qaGatePass: (bySeverity.P0 || 0) === 0 && issueGroups.calibration.length === 0 && routeDeviationIssues.length === 0,
        phaseCount: BATTLE_DATA.phases.length,
        unitCount: BATTLE_DATA.units.length,
        generatedAt: new Date().toISOString()
    };
}

export async function runMapDoctor(options = {}) {
    const { waitForRaster = true } = options;
    if (waitForRaster) await waitForTerrainSampler();

    const phases = Array.isArray(BATTLE_DATA.phases) ? BATTLE_DATA.phases : [];
    const issueGroups = {
        terrain: analyzeTerrainIssues(phases),
        collisions: analyzeCollisionIssues(phases),
        anchorDrift: analyzeAnchorDriftIssues(phases),
        locations: analyzeLocationIssues(),
        calibration: analyzeCalibrationGateIssues(),
        labels: analyzeLabelLanguageIssues(),
        historicalData: analyzeHistoricalDataIssues(),
        historicalPlacement: analyzeHistoricalPlacementIssues(phases)
    };

    return {
        summary: buildSummary(issueGroups),
        issues: issueGroups,
        allIssues: Object.values(issueGroups).flat()
            .sort((a, b) => String(a.severity).localeCompare(String(b.severity)) || String(a.type).localeCompare(String(b.type))),
        thresholds: {
            collisionRadius: COLLISION_RADIUS,
            navalCollisionRadius: NAVAL_COLLISION_RADIUS,
            maxHistoricalIssues: MAX_HISTORICAL_ISSUES,
            maxAnchorDrift: MAX_ANCHOR_DRIFT,
            maxCalibrationRms: MAX_CALIBRATION_RMS
        }
    };
}

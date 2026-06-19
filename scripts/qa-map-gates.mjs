import { hydrateTimelineData } from '../src/engine/phase-engine.js?v=20260618-3d-spectacle-r2';
import { expandUnitTrails, getTerrainSafePointForUnit } from '../src/engine/position-engine.js?v=20260618-3d-spectacle-r2';
import { BATTLE_DATA, getMapLocationById } from '../src/data/battle-data.js?v=20260618-3d-spectacle-r2';
import { calibrationReport } from '../src/data/geo-calibration.js?v=20260618-3d-spectacle-r2';
import { HISTORICAL_ANCHORS as STORY_ANCHORS } from '../src/data/historical-anchors.js?v=20260618-3d-spectacle-r2';
import { CANONICAL_POSITIONS, OFF_MAP_LOCATIONS } from '../src/data/canonical-positions.js?v=20260618-3d-spectacle-r2';
import {
    HISTORICAL_ANCHORS,
    HISTORICAL_ROUTES,
    HISTORICAL_FRONTLINE_SNAPSHOTS,
    getHistoricalDataDiagnostics,
    getHistoricalPlacementForUnit
} from '../src/data/historical-map-data.js?v=20260618-3d-spectacle-r2';
import { GUIDED_CAMPAIGN_CHAPTERS } from '../src/data/guided-campaign.js?v=20260618-3d-spectacle-r2';

const MAX_CALIBRATION_RMS = 35;
const MAX_ROUTE_DEVIATION_ISSUES = 0;

function distance(a, b) {
    return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}

function visitLocationValues(value, visitor, path) {
    if (!value) return;
    if (typeof value === 'string') {
        visitor(value, path);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => visitLocationValues(item, visitor, `${path}[${index}]`));
        return;
    }
    if (typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => visitLocationValues(item, visitor, `${path}.${key}`));
    }
}

function collectReferenceIssues() {
    const issues = [];
    const unitIds = new Set(BATTLE_DATA.units.map((unit) => unit.id));
    const locationIds = new Set(BATTLE_DATA.locations.map((location) => location.id));

    const checkUnit = (unitId, path) => {
        if (!unitIds.has(unitId)) issues.push({ type: 'unknown-unit', path, id: unitId });
    };
    const checkLocation = (locationId, path) => {
        if (!locationIds.has(locationId) && !OFF_MAP_LOCATIONS.has(locationId)) {
            issues.push({ type: 'unknown-location', path, id: locationId });
            return;
        }
        if (!getMapLocationById(locationId) && !OFF_MAP_LOCATIONS.has(locationId)) {
            issues.push({ type: 'unmapped-location', path, id: locationId });
        }
    };

    STORY_ANCHORS.forEach((anchor, index) => {
        const base = `historical-anchors[${index}](${anchor.iso}:${anchor.title})`;
        visitLocationValues(anchor.locationIds, checkLocation, `${base}.locationIds`);
        visitLocationValues(anchor.locationByFaction, checkLocation, `${base}.locationByFaction`);
        visitLocationValues(anchor.mapFocusOverride?.locationIds, checkLocation, `${base}.mapFocusOverride.locationIds`);
        (anchor.guidedUnitIds || []).forEach((unitId, unitIndex) => checkUnit(unitId, `${base}.guidedUnitIds[${unitIndex}]`));
    });

    Object.entries(CANONICAL_POSITIONS).forEach(([unitId, segments]) => {
        checkUnit(unitId, `canonical-positions.${unitId}`);
        let previousEnd = null;
        segments.forEach((segment, index) => {
            checkLocation(segment.location, `canonical-positions.${unitId}[${index}].location`);
            if (previousEnd && segment.start <= previousEnd) {
                issues.push({
                    type: 'overlap-or-unsorted-canonical-range',
                    path: `canonical-positions.${unitId}[${index}]`,
                    start: segment.start,
                    previousEnd
                });
            }
            previousEnd = segment.end;
        });
    });

    BATTLE_DATA.units.forEach((unit) => {
        if (!CANONICAL_POSITIONS[unit.id]) issues.push({ type: 'missing-canonical-position', path: `battle-data.units.${unit.id}`, id: unit.id });
        checkLocation(unit.anchorRegion, `battle-data.units.${unit.id}.anchorRegion`);
    });

    HISTORICAL_ANCHORS.forEach((anchor, index) => checkUnit(anchor.unitId, `historical-map-data.anchors[${index}](${anchor.id}).unitId`));
    HISTORICAL_ROUTES.forEach((route, index) => {
        (route.unitIds || []).forEach((unitId, unitIndex) => checkUnit(unitId, `historical-map-data.routes[${index}](${route.id}).unitIds[${unitIndex}]`));
    });
    HISTORICAL_FRONTLINE_SNAPSHOTS.forEach((snapshot, index) => {
        visitLocationValues(snapshot.locationIds, checkLocation, `historical-map-data.frontlines[${index}](${snapshot.id}).locationIds`);
    });
    GUIDED_CAMPAIGN_CHAPTERS.forEach((chapter, index) => {
        visitLocationValues(chapter.defaultLocations, checkLocation, `guided-campaign[${index}](${chapter.id}).defaultLocations`);
        (chapter.primaryUnitIds || []).forEach((unitId, unitIndex) => checkUnit(unitId, `guided-campaign[${index}](${chapter.id}).primaryUnitIds[${unitIndex}]`));
    });

    return issues;
}

const calibration = calibrationReport();
const routeDeviationIssues = [];
const referenceIssues = collectReferenceIssues();
const historicalDataDiagnostics = getHistoricalDataDiagnostics();

await hydrateTimelineData({ loadBook: true, expandDaily: true });
expandUnitTrails();

for (const phase of BATTLE_DATA.phases) {
    const iso = String(phase.isoStart || '');
    if (!iso) continue;

    for (const unit of BATTLE_DATA.units) {
        const placement = getHistoricalPlacementForUnit(unit, iso);
        const actual = unit.phases?.[phase.id];
        if (!placement?.point || !actual) continue;
        const expectedPoint = getTerrainSafePointForUnit(placement.point.x, placement.point.y, unit);
        const drift = distance(actual, expectedPoint);
        if (Number.isFinite(placement.tolerance) && drift > placement.tolerance) {
            routeDeviationIssues.push({
                phaseId: phase.id,
                iso,
                unitId: unit.id,
                referenceId: placement.routeId || placement.anchorId || placement.id,
                drift: Math.round(drift),
                tolerance: placement.tolerance
            });
        }
    }
}

const failures = [];
if (calibration.rms > MAX_CALIBRATION_RMS) {
    failures.push(`Calibration RMS ${calibration.rms}px exceeds ${MAX_CALIBRATION_RMS}px.`);
}
if (routeDeviationIssues.length > MAX_ROUTE_DEVIATION_ISSUES) {
    failures.push(`${routeDeviationIssues.length} sourced route/anchor deviations exceed tolerance.`);
}
if (referenceIssues.length) {
    failures.push(`${referenceIssues.length} data reference issues found.`);
}
if (historicalDataDiagnostics.length) {
    failures.push(`${historicalDataDiagnostics.length} historical data diagnostics found.`);
}

console.log(JSON.stringify({
    ok: failures.length === 0,
    calibrationRms: calibration.rms,
    routeDeviationIssues: routeDeviationIssues.slice(0, 20),
    referenceIssues: referenceIssues.slice(0, 20),
    historicalDataDiagnostics: historicalDataDiagnostics.slice(0, 20),
    phaseCount: BATTLE_DATA.phases.length,
    unitCount: BATTLE_DATA.units.length,
    failures
}, null, 2));

if (failures.length) process.exit(1);

import { hydrateTimelineData } from '../src/engine/phase-engine.js?v=20260508-sprint-r1';
import { expandUnitTrails, getTerrainSafePointForUnit } from '../src/engine/position-engine.js?v=20260508-sprint-r1';
import { BATTLE_DATA } from '../src/data/battle-data.js?v=20260508-sprint-r1';
import { calibrationReport } from '../src/data/geo-calibration.js';
import { getHistoricalPlacementForUnit } from '../src/data/historical-map-data.js';

const MAX_CALIBRATION_RMS = 35;
const MAX_ROUTE_DEVIATION_ISSUES = 0;

function distance(a, b) {
    return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}

const calibration = calibrationReport();
const routeDeviationIssues = [];

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

console.log(JSON.stringify({
    ok: failures.length === 0,
    calibrationRms: calibration.rms,
    routeDeviationIssues: routeDeviationIssues.slice(0, 20),
    phaseCount: BATTLE_DATA.phases.length,
    unitCount: BATTLE_DATA.units.length,
    failures
}, null, 2));

if (failures.length) process.exit(1);

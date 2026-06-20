#!/usr/bin/env node
import { hydrateTimelineData, getPhaseIndexByIso, getUnitEntryPhaseIndex } from '../src/engine/phase-engine.js?v=20260620-combat-fx-r1';
import { resolveCampaignPhase } from '../src/engine/campaign-state-machine.js?v=20260620-combat-fx-r1';
import { expandUnitTrails, getNarrativeNavalPosition } from '../src/engine/position-engine.js?v=20260620-combat-fx-r1';
import { BATTLE_DATA } from '../src/data/battle-data.js?v=20260620-combat-fx-r1';
import { ENTITY_TYPES } from '../src/data/entity-types.js?v=20260620-combat-fx-r1';
import { isUnitOffMap } from '../src/data/canonical-positions.js?v=20260620-combat-fx-r1';

const MATRIX = [
    {
        iso: '1914-11-03',
        label: 'Initial bombardment',
        expectedVisibleCount: 6,
        campaignPhase: 'naval',
        mustShow: ['mustahkem-mevki', 'nusret'],
        mustHide: ['5-ordu', '29-div', 'anzac-1div']
    },
    {
        iso: '1915-03-08',
        label: 'Nusret mine line',
        expectedVisibleCount: 12,
        campaignPhase: 'naval',
        mustShow: ['nusret', 'allied-minesweepers', 'hms-queen-elizabeth'],
        mustHide: ['5-ordu', '29-div', 'anzac-1div']
    },
    {
        iso: '1915-03-18',
        label: 'Naval battle',
        expectedVisibleCount: 12,
        campaignPhase: 'naval',
        mustShow: ['nusret', 'bouvet', 'hms-irresistible', 'hms-ocean', 'mustahkem-mevki'],
        mustHide: ['5-ordu', '29-div', 'anzac-1div']
    },
    {
        iso: '1915-04-25',
        label: 'Landings',
        expectedVisibleCount: 15,
        campaignPhase: 'landing',
        mustShow: ['3-kolordu', '19-tumen', '57-alay', '29-div', 'ss-river-clyde', 'anzac-1div', 'fr-corps'],
        mustHide: ['5-ordu', 'ix-corps', 'bouvet']
    },
    {
        iso: '1915-08-06',
        label: 'August offensive',
        expectedVisibleCount: 13,
        campaignPhase: 'stalemate',
        mustShow: ['19-tumen', '57-alay', 'ix-corps', 'anzac-1div', 'nz-inf'],
        mustHide: ['5-ordu', 'hms-queen-elizabeth', 'bouvet']
    },
    {
        iso: '1915-12-20',
        label: 'Anzac/Suvla evacuation',
        expectedVisibleCount: 8,
        campaignPhase: 'evacuation',
        mustShow: ['mustahkem-mevki', 'ix-corps', '29-div', 'fr-corps'],
        mustHide: ['3-kolordu', '19-tumen', 'anzac-1div', 'nz-inf']
    },
    {
        iso: '1916-01-09',
        label: 'Helles evacuation',
        expectedVisibleCount: 7,
        campaignPhase: 'evacuation',
        mustShow: ['mustahkem-mevki', '29-div', 'fr-corps'],
        mustHide: ['ix-corps', 'anzac-1div', 'hms-ocean']
    }
];

function visibleUnitIdsFor(phase, phaseIndex, campaignPhase, unitEntryIndex) {
    const ids = [];
    const iso = String(phase.isoStart || '');

    for (const unit of BATTLE_DATA.units) {
        const entryIndex = unitEntryIndex[unit.id] ?? 0;
        if (phaseIndex < entryIndex) continue;
        if (isUnitOffMap(unit.id, iso)) continue;

        const typeDef = ENTITY_TYPES[unit.entityType];
        if (typeDef && !typeDef.allowedPhases.includes(campaignPhase.id)) continue;

        const phaseData = unit.phases?.[phase.id] || getNarrativeNavalPosition(unit, phaseIndex);
        if (!phaseData || phaseData.offMap) continue;
        ids.push(unit.id);
    }

    return ids;
}

function hasLeak(text) {
    return /Pause Roster|[·-]\s*Kayd[ıi]\b|23 Mart'ta 5|\bStamina\b/.test(String(text || ''));
}

await hydrateTimelineData({ loadBook: true, expandDaily: true });
expandUnitTrails();

const unitEntryIndex = getUnitEntryPhaseIndex();
const rows = [];
const issues = [];

for (const item of MATRIX) {
    const phaseIndex = getPhaseIndexByIso(item.iso);
    const phase = BATTLE_DATA.phases[phaseIndex];
    if (!phase) {
        issues.push(`${item.iso} (${item.label}) did not resolve to a phase.`);
        continue;
    }

    const campaignPhase = resolveCampaignPhase(item.iso);
    const visible = visibleUnitIdsFor(phase, phaseIndex, campaignPhase, unitEntryIndex);
    const visibleSet = new Set(visible);

    if (phase.isoStart !== item.iso) {
        issues.push(`${item.iso} resolved to ${phase.isoStart || '(missing isoStart)'} via ${phase.id}.`);
    }
    if (campaignPhase.id !== item.campaignPhase) {
        issues.push(`${item.iso} expected campaign phase ${item.campaignPhase}, got ${campaignPhase.id}.`);
    }
    if (visible.length !== item.expectedVisibleCount) {
        issues.push(`${item.iso} expected ${item.expectedVisibleCount} visible tokens, got ${visible.length}: ${visible.join(', ')}`);
    }

    for (const unitId of item.mustShow || []) {
        if (!visibleSet.has(unitId)) issues.push(`${item.iso} should show ${unitId}, but it is not visible.`);
    }
    for (const unitId of item.mustHide || []) {
        if (visibleSet.has(unitId)) issues.push(`${item.iso} should hide ${unitId}, but it is visible.`);
    }
    if (hasLeak(phase.title) || hasLeak(phase.narration)) {
        issues.push(`${item.iso} contains a blocked UI/source leak in title or narration.`);
    }

    rows.push({
        iso: item.iso,
        label: item.label,
        phaseId: phase.id,
        campaignPhase: campaignPhase.id,
        visibleCount: visible.length,
        visible
    });
}

console.log(JSON.stringify({ ok: issues.length === 0, rows, issues }, null, 2));
if (issues.length) process.exit(1);

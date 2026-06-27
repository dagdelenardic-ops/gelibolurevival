// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Savaş Efektleri Renderer
// Battery shot animasyonları, deniz dönemi efektleri
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js?v=20260622-hp-polish-r1';
import { MAP_FORTS } from '../data/geo-calibration.js?v=20260622-hp-polish-r1';
import { isNavalEraPhaseIndex, getUnitEntryPhaseIndex } from '../engine/phase-engine.js?v=20260622-hp-polish-r1';
import { getNarrativeNavalPosition, getNavalDisplayOffset, isDestroyedPhaseData } from '../engine/position-engine.js?v=20260622-hp-polish-r1';
import { snapToSeaWater } from '../data/terrain-zones.js?v=20260622-hp-polish-r1';

const BATTERY_FORT_IDS = ['fort-kilitbahir', 'fort-cimenlik', 'fort-hamidiye', 'fort-rumeli-mecidiye', 'fort-dardanos', 'fort-anadolu-hamidiye'];
const FORT_BY_ID = MAP_FORTS.reduce((acc, f) => { acc[f.id] = f; return acc; }, {});

function navalDisplayPoint(unit, point, phaseIndex) {
    const offset = getNavalDisplayOffset(unit, phaseIndex);
    // Gemi siluetiyle aynı su-kilidini uygula ki patlama/etiket gemiyle örtüşsün
    return snapToSeaWater(point.x + offset.x, point.y + offset.y);
}

function renderSalvoPath(battery, target, index, destroyed) {
    const mx = (battery.x + target.x) / 2;
    const my = Math.min(battery.y, target.y) - (82 + index * 16);
    const width = destroyed ? 2.1 : 1.45;
    const opacity = destroyed ? '.52' : '.34';
    return `<path class="battery-shot battery-shot-arc${index > 1 ? ' battery-shot-secondary' : ''}"
        style="--shot-delay:${(index * 0.11).toFixed(2)}s"
        d="M${battery.x} ${battery.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${target.x} ${target.y}"
        stroke-width="${width}" opacity="${opacity}"></path>`;
}

function renderNavalImpact(target, unit, index, destroyed) {
    const label = unit.name.replace(/^HMS\s+/i, '').replace('İtilaf ', '');
    const r = destroyed ? 28 : 16;
    const delay = `${(index * .18).toFixed(2)}s`;
    const mineBurst = destroyed
        ? `<circle class="naval-mine-shock" style="--mine-delay:${delay}" cx="${target.x}" cy="${target.y}" r="${r}"></circle>
           <path class="naval-water-column" style="--mine-delay:${delay}" d="M${target.x - 8} ${target.y - 4} C${target.x - 20} ${target.y - 34} ${target.x + 18} ${target.y - 42} ${target.x + 5} ${target.y - 68}"></path>`
        : '';
    return `<g class="naval-impact-group" aria-hidden="true">
        <circle class="battery-impact naval-impact${destroyed ? ' naval-impact-loss' : ''}" cx="${target.x}" cy="${target.y}" r="${destroyed ? 18 : 12}"></circle>
        ${mineBurst}
        ${destroyed ? `<text class="naval-hit-label" x="${target.x + 24}" y="${target.y - 22}">${label}</text>` : ''}
    </g>`;
}

/** Savaş efektlerini (battery shot) güncelle */
export function renderBattleEffects(phaseIndex) {
    const layer = document.getElementById('battleEffects');
    if (!layer) return;
    if (!isNavalEraPhaseIndex(phaseIndex)) {
        layer.innerHTML = '';
        return;
    }
    const phase = BATTLE_DATA.phases[phaseIndex];
    if (!phase) {
        layer.innerHTML = '';
        return;
    }

    const batteries = BATTERY_FORT_IDS.map(id => FORT_BY_ID[id]).filter(Boolean);
    const UNIT_ENTRY = getUnitEntryPhaseIndex();
    const iso = String(phase.isoStart || '');
    const primaryTargetOrder = iso === '1915-03-18'
        ? ['bouvet', 'hms-irresistible', 'hms-ocean', 'hms-queen-elizabeth']
        : ['hms-queen-elizabeth', 'suffren', 'bouvet', 'hms-irresistible', 'hms-ocean'];
    const maxTargets = iso === '1915-03-18' ? 5 : 3;
    const shipTargets = BATTLE_DATA.units
        .filter((u) => u.type === 'deniz' && u.faction !== 'ottoman')
        .filter((u) => (UNIT_ENTRY[u.id] ?? 0) <= phaseIndex)
        .map((u, idx) => {
            const phaseData = u.phases[phase.id];
            const target = phaseData || getNarrativeNavalPosition(u, phaseIndex);
            if (!target) return { unit: u, target: null, idx, destroyed: false };
            const destroyed = isDestroyedPhaseData(phaseData);
            return { unit: u, target: navalDisplayPoint(u, target, phaseIndex), idx, destroyed };
        })
        .filter((entry) => entry.target)
        .sort((a, b) => {
            const ai = primaryTargetOrder.indexOf(a.unit.id);
            const bi = primaryTargetOrder.indexOf(b.unit.id);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .slice(0, maxTargets);

    layer.innerHTML = shipTargets.map((entry, index) => {
        const battery = batteries[index % batteries.length];
        const secondaryBattery = batteries[(index + 2) % batteries.length];
        const d = entry.target;
        return `<g>
      ${renderSalvoPath(battery, d, index, entry.destroyed)}
      ${index < 2 ? renderSalvoPath(secondaryBattery, d, index + 3, entry.destroyed) : ''}
      ${renderNavalImpact(d, entry.unit, index, entry.destroyed)}
    </g>`;
    }).join('');
}

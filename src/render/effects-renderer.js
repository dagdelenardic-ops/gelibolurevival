// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Savaş Efektleri Renderer
// Battery shot animasyonları, deniz dönemi efektleri
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA } from '../data/battle-data.js';
import { isNavalEraPhaseIndex } from '../engine/phase-engine.js';
import { getUnitEntryPhaseIndex } from '../engine/phase-engine.js';
import { getNarrativeNavalPosition, isDestroyedPhaseData } from '../engine/position-engine.js';

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

    const batteries = [
        { x: 405, y: 340 },
        { x: 498, y: 345 },
        { x: 395, y: 385 },
        { x: 495, y: 365 }
    ];
    const UNIT_ENTRY = getUnitEntryPhaseIndex();
    const shipTargets = BATTLE_DATA.units
        .filter((u) => u.type === 'deniz' && u.faction !== 'ottoman')
        .filter((u) => (UNIT_ENTRY[u.id] ?? 0) <= phaseIndex)
        .map((u, idx) => {
            const phaseData = u.phases[phase.id];
            if (isDestroyedPhaseData(phaseData)) return { unit: u, target: null, idx };
            const target = phaseData || getNarrativeNavalPosition(u, phaseIndex);
            return { unit: u, target, idx };
        })
        .filter((entry) => entry.target);

    layer.innerHTML = shipTargets.map((entry) => {
        const battery = batteries[entry.idx % batteries.length];
        const d = entry.target;
        return `<g>
      <line class="battery-shot" style="--shot-delay:${(entry.idx * 0.09).toFixed(2)}s" x1="${battery.x}" y1="${battery.y}" x2="${d.x}" y2="${d.y}"></line>
      <circle class="battery-impact" cx="${d.x}" cy="${d.y}" r="4"></circle>
    </g>`;
    }).join('');
}

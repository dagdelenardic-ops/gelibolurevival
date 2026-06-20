#!/usr/bin/env node
import { BATTLE_DATA } from '../src/data/battle-data.js?v=20260620-combat-fx-r1';
import { CANONICAL_POSITIONS } from '../src/data/canonical-positions.js?v=20260620-combat-fx-r1';

const unitById = new Map(BATTLE_DATA.units.map((unit) => [unit.id, unit]));
const issues = [];

function unit(id) {
    const item = unitById.get(id);
    if (!item) issues.push(`Missing required unit: ${id}.`);
    return item || {};
}

function includes(value, needle, label) {
    if (!String(value || '').includes(needle)) issues.push(`${label} should include "${needle}".`);
}

function excludes(value, needle, label) {
    if (String(value || '').includes(needle)) issues.push(`${label} should not include "${needle}".`);
}

const nusret = unit('nusret');
includes(nusret.commander, 'Nazmi', 'Nusret commander');
excludes(nusret.commander, 'Tophaneli Hakkı', 'Nusret commander');
if ((nusret.strength || 0) < 70) issues.push(`Nusret strength should be at least 70, got ${nusret.strength}.`);
includes(nusret.description, '7/8 Mart 1915', 'Nusret description');
includes(nusret.description, '26', 'Nusret description');
includes(nusret.description, 'birden fazla mayın', 'Nusret description');

const mustahkem = unit('mustahkem-mevki');
includes(mustahkem.commander, 'Cevat Paşa', 'Müstahkem Mevki commander');
includes(mustahkem.description, '18 Mart', 'Müstahkem Mevki description');

const fifthArmy = unit('5-ordu');
includes(fifthArmy.commander, 'Liman von Sanders', '5. Ordu commander');
const fifthArmySegments = CANONICAL_POSITIONS['5-ordu'] || [];
if (fifthArmySegments[0]?.end !== '1915-03-23') {
    issues.push(`5. Ordu pre-formation segment should end on 1915-03-23, got ${fifthArmySegments[0]?.end}.`);
}
if (fifthArmySegments[1]?.start !== '1915-03-24') {
    issues.push(`5. Ordu formation segment should start on 1915-03-24, got ${fifthArmySegments[1]?.start}.`);
}

const irresistible = unit('hms-irresistible');
const ocean = unit('hms-ocean');
excludes(irresistible.commander, 'Yüzbaşı', 'HMS Irresistible commander');
excludes(ocean.commander, 'Yüzbaşı', 'HMS Ocean commander');
includes(irresistible.commander, 'Albay', 'HMS Irresistible commander');
includes(ocean.commander, 'Albay', 'HMS Ocean commander');

const queenElizabeth = unit('hms-queen-elizabeth');
includes(queenElizabeth.commander, 'Donanma Komutanı', 'HMS Queen Elizabeth commander label');
includes(queenElizabeth.description, 'gemi kaptanı değil', 'HMS Queen Elizabeth description');

const bouvet = unit('bouvet');
if ((bouvet.strength || 0) < 630) issues.push(`Bouvet strength should not use the old low crew count, got ${bouvet.strength}.`);
includes(bouvet.description, 'yaklaşık 640 kayıp', 'Bouvet description');
includes(bouvet.phases?.['naval-assault']?.outcome, 'yaklaşık 640 kayıp', 'Bouvet naval outcome');

const landings = BATTLE_DATA.phases.find((phase) => phase.id === 'april-landings') || {};
includes(landings.narration, 'V Beach', 'April landings narration');
includes(landings.narration, 'W Beach', 'April landings narration');
includes(landings.narration, 'SS River Clyde', 'April landings narration');

const august = BATTLE_DATA.phases.find((phase) => phase.id === 'august-offensive') || {};
includes(august.narration, 'Conkbayırı', 'August offensive narration');
includes(august.narration, 'Mustafa Kemal', 'August offensive narration');

console.log(JSON.stringify({
    ok: issues.length === 0,
    checked: {
        units: ['nusret', 'mustahkem-mevki', '5-ordu', 'hms-irresistible', 'hms-ocean', 'hms-queen-elizabeth', 'bouvet'],
        phases: ['april-landings', 'august-offensive']
    },
    issues
}, null, 2));

if (issues.length) process.exit(1);

// Doğrulama: unit-sectors.js + historical-map-data.js → kritik tarihler için
// reserve/locked sınıflandırması beklenen birimlere uyuyor mu?
//
// Çalıştırma:
//   node scripts/verify-sectors.mjs
//
// Loader hook ile `?v=...` query string'lerini soyar (kodun esas imports'unu
// dokunmadan test edebilmek için).

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Inline ES module loader hook: ?v=... query'lerini kaldır
const stripQueryLoader = `
export async function resolve(specifier, context, nextResolve) {
    const cleaned = specifier.replace(/\\?v=[^&]+/g, '');
    return nextResolve(cleaned, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(stripQueryLoader)}`, pathToFileURL('./'));

const { HISTORICAL_ANCHORS, HISTORICAL_ROUTES } = await import('../src/data/historical-map-data.js');
const {
    classifyUnitSector,
    isReserveAnchor,
    listReserveUnitsForIso
} = await import('../src/data/unit-sectors.js');

// Battle data normalde geo-calibration ve ona bağlı tüm zinciri çeker, ki
// onlar tarayıcı API'lerine bağımlı olabilir. Burada birim ID'leri manuel
// olarak listeliyoruz.
const LAND_UNITS = [
    { id: '5-ordu',          unitClass: 'army_hq',  faction: 'ottoman', name: '5. Ordu Karargâhı' },
    { id: '3-kolordu',       unitClass: 'corps',    faction: 'ottoman', name: '3. Kolordu' },
    { id: '19-tumen',        unitClass: 'division', faction: 'ottoman', name: '19. Tümen' },
    { id: '57-alay',         unitClass: 'regiment', faction: 'ottoman', name: '57. Alay' },
    { id: '27-alay',         unitClass: 'regiment', faction: 'ottoman', name: '27. Alay' },
    { id: '9-tumen',         unitClass: 'division', faction: 'ottoman', name: '9. Tümen' },
    { id: '5-tumen',         unitClass: 'division', faction: 'ottoman', name: '5. Tümen' },
    { id: '7-tumen',         unitClass: 'division', faction: 'ottoman', name: '7. Tümen' },
    { id: 'mustahkem-mevki', unitClass: 'battery',  faction: 'ottoman', name: 'Müstahkem Mevki' },
    { id: '29-div',          unitClass: 'division', faction: 'british', name: '29. Tümen' },
    { id: 'ix-corps',        unitClass: 'corps',    faction: 'british', name: 'IX Kolordu' },
    { id: 'anzac-1div',      unitClass: 'division', faction: 'anzac',   name: 'ANZAC 1. Tümen' },
    { id: 'nz-inf',          unitClass: 'brigade',  faction: 'anzac',   name: 'YZ Piyade Tugayı' },
    { id: 'fr-corps',        unitClass: 'corps',    faction: 'french',  name: 'Fransız Kolordusu' }
];

const KEY_DATES = [
    { iso: '1914-11-03', label: 'İlk bombardıman' },
    { iso: '1915-03-08', label: 'Nusret mayın hattı' },
    { iso: '1915-03-18', label: '18 Mart deniz muharebesi' },
    { iso: '1915-04-25', label: '25 Nisan çıkarmaları' },
    { iso: '1915-08-06', label: 'Ağustos Suvla/Conkbayırı' },
    { iso: '1915-12-20', label: 'Anzac/Suvla tahliyesi' },
    { iso: '1916-01-09', label: 'Helles tahliyesi (son gün)' }
];

console.log('\n══════════════════════════════════════════════════════════');
console.log(' GELIBOLU REVIVAL — Sektör Sınıflandırma Doğrulaması');
console.log('══════════════════════════════════════════════════════════\n');

// 1. Genel sayım: kaç anchor reserve, kaç locked
const reserveAnchors = HISTORICAL_ANCHORS.filter(isReserveAnchor);
const nonReserveAnchors = HISTORICAL_ANCHORS.filter(a => !isReserveAnchor(a));
console.log(`Toplam HISTORICAL_ANCHORS: ${HISTORICAL_ANCHORS.length}`);
console.log(`  → Reserve (off-map): ${reserveAnchors.length}`);
console.log(`  → Locked (on-map kaynaklı): ${nonReserveAnchors.length}`);
console.log(`Toplam HISTORICAL_ROUTES: ${HISTORICAL_ROUTES.length} (hepsi locked)\n`);

console.log('Reserve anchor örnekleri:');
reserveAnchors.slice(0, 8).forEach((a) => {
    console.log(`  ${a.id.padEnd(45)} unit=${a.unitId.padEnd(18)} kind=${a.kind}`);
});

// 2. Her kritik tarih için sınıflandırma
console.log('\n──────────────────────────────────────────────────────────');
console.log(' Tarih-bazlı sektör çözümleme');
console.log('──────────────────────────────────────────────────────────');

for (const { iso, label } of KEY_DATES) {
    console.log(`\n[${iso}] ${label}`);
    const onMap = [];
    const reserve = [];
    const unknown = [];

    for (const unit of LAND_UNITS) {
        const sector = classifyUnitSector(unit.id, iso);
        if (!sector) {
            unknown.push(unit);
        } else if (sector.kind === 'reserve') {
            reserve.push({ unit, sector });
        } else if (sector.kind === 'locked') {
            onMap.push({ unit, sector });
        }
    }

    console.log(`  Haritada (locked): ${onMap.length} birim`);
    onMap.forEach(({ unit, sector }) => {
        const conf = sector.confidence || '-';
        const src = sector.source || 'anchor';
        console.log(`    ✓ ${unit.name.padEnd(28)} [${src}, conf=${conf}]`);
    });

    if (reserve.length) {
        console.log(`  İhtiyatta (off-map): ${reserve.length} birim`);
        reserve.forEach(({ unit, sector }) => {
            console.log(`    ◆ ${unit.name.padEnd(28)} → ${sector.locationLabel}`);
        });
    }

    if (unknown.length) {
        console.log(`  ! Anchor bulunamadı: ${unknown.length} birim`);
        unknown.forEach((unit) => {
            console.log(`    ? ${unit.name}`);
        });
    }
}

// 3. listReserveUnitsForIso fonksiyonel test
console.log('\n──────────────────────────────────────────────────────────');
console.log(' listReserveUnitsForIso() roster panel testi');
console.log('──────────────────────────────────────────────────────────\n');
for (const { iso } of KEY_DATES.slice(0, 3)) {
    const list = listReserveUnitsForIso(LAND_UNITS, iso);
    console.log(`[${iso}] → ${list.length} reserve birim`);
    list.forEach((r) => {
        console.log(`  ${r.unitName.padEnd(30)} ${r.locationLabel}`);
    });
}

console.log('\n══════════════════════════════════════════════════════════');
console.log(' Doğrulama tamamlandı.');
console.log('══════════════════════════════════════════════════════════\n');

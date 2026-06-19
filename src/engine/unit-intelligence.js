// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Birlik Zekası
// Faz ve animasyon verisinden birlik niyeti/odağı türetir
// ══════════════════════════════════════════════════════════════

import { BATTLE_DATA, LOCATION_BY_ID, BASE_PHASE_ID } from '../data/battle-data.js?v=20260618-3d-spectacle-r2';

export const ACTION_META = {
    defending: { label: 'Savunma hattında', badge: 'SAV', color: '#cdb67a' },
    reserve: { label: 'İhtiyatta bekliyor', badge: 'IHT', color: '#97a3b0' },
    bombarding: { label: 'Bombardıman yapıyor', badge: 'BOM', color: '#c97a5b' },
    engaged: { label: 'Aktif temas halinde', badge: 'TEM', color: '#d1a46b' },
    landing: { label: 'Çıkarma yapıyor', badge: 'CIK', color: '#7eaec8' },
    advancing: { label: 'İlerliyor', badge: 'ILR', color: '#c9a84c' },
    retreating: { label: 'Geri çekiliyor', badge: 'GER', color: '#9b7b7b' },
    supporting: { label: 'Destek veriyor', badge: 'DST', color: '#a6a08f' },
    minelaying: { label: 'Mayın döşüyor', badge: 'MYN', color: '#8b3a3a' }
};

const FRONT_LOCATION_IDS = {
    deniz: 'bogaz',
    ariburnu: 'ariburnu',
    seddulbahir: 'seddulbahir',
    anafartalar: 'anafartalar',
    conkbayiri: 'conkbayiri',
    kirte: 'kirte',
    kumkale: 'kumkale',
    suvla: 'suvla'
};

const LOCATION_ALIASES = buildLocationAliasIndex();

function buildLocationAliasIndex() {
    const entries = [];
    const extras = {
        bogaz: ['canakkale bogazi', 'bogaz', 'narrows', 'dardanelles'],
        ariburnu: ['ariburnu', 'ariburnu', 'anzac koyu', 'anzac cove'],
        seddulbahir: ['seddulbahir', 'seddulbahir', 'helles'],
        conkbayiri: ['conkbayiri', 'conk bayiri', 'sari bair'],
        anafartalar: ['anafartalar', 'suvla ovasi'],
        'scimitar-hill': ['scimitar hill', 'yusufcuktepe', 'yusufcuk tepe'],
        'hill-60': ['hill 60', 'kaiajik aghala', 'kavak tepe'],
        alcitepe: ['alcitepe', 'achi baba'],
        kirte: ['kirte', 'krithia'],
        kumkale: ['kumkale'],
        bigali: ['bigali', 'bigali da'],
        kilitbahir: ['kilitbahir'],
        canakkale: ['canakkale'],
        'morto-koyu': ['morto koyu', 'morto'],
        kabatepe: ['kabatepe', 'gaba tepe'],
        kirectepe: ['kirectepe', 'kirectepe']
    };

    BATTLE_DATA.locations.forEach((location) => {
        const aliases = new Set([
            normalizeText(location.name),
            normalizeText(location.id),
            ...(extras[location.id] || [])
        ].map((value) => normalizeText(value)).filter(Boolean));

        aliases.forEach((alias) => {
            entries.push({ alias, id: location.id });
        });
    });

    return entries.sort((a, b) => b.alias.length - a.alias.length);
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function firstLocationId(value) {
    if (Array.isArray(value)) return value.find(Boolean) || null;
    if (typeof value === 'string' && value) return value;
    return null;
}

function matchAnimationUnit(unit, animData) {
    const wanted = normalizeText(unit.name);
    const units = Array.isArray(animData && animData.units) ? animData.units : [];
    return units.find((entry) => {
        const actual = normalizeText(entry && entry.name);
        return actual && wanted && (actual === wanted || actual.includes(wanted) || wanted.includes(actual));
    }) || null;
}

function matchLocationIdFromText(value) {
    const text = normalizeText(value);
    if (!text) return null;
    const match = LOCATION_ALIASES.find((entry) => text.includes(entry.alias));
    return match ? match.id : null;
}

function getPhaseField(phase, unit, phaseData, key) {
    if (phaseData && typeof phaseData[key] === 'string' && phaseData[key].trim()) return phaseData[key].trim();
    // Deniz birimleri faction-level kara metnini miras almaz; pişmemiş
    // phaseData gelse bile kendi naval-assault meta'sına düşer.
    if (unit.type === 'deniz') {
        const base = unit.phases && unit.phases[BASE_PHASE_ID];
        const value = base && base[key];
        return (typeof value === 'string' && value.trim()) ? value.trim() : '';
    }
    const factionField = phase && phase[`${key}ByFaction`];
    if (factionField && typeof factionField[unit.faction] === 'string' && factionField[unit.faction].trim()) {
        return factionField[unit.faction].trim();
    }
    return '';
}

function getCurrentLocationId(unit, phase) {
    const unitLocation = firstLocationId(phase && phase.locationByUnit && phase.locationByUnit[unit.id]);
    if (unitLocation) return unitLocation;
    const factionLocation = firstLocationId(phase && phase.locationByFaction && phase.locationByFaction[unit.faction]);
    if (factionLocation) return factionLocation;
    return unit.anchorRegion || null;
}

function deriveActionKey(unit, statusText, objectiveText, outcomeText, animUnit, animData) {
    const haystack = normalizeText([statusText, objectiveText, outcomeText].filter(Boolean).join(' '));
    const eventType = normalizeText(animData && animData.eventType);
    const animState = normalizeText(animUnit && animUnit.state);
    const isShip = unit.type === 'deniz';
    const isBattery = unit.entityType === 'artillery_battery';

    if (/tahliye|geri cekil|geri cek|cekil/.test(haystack)) return 'retreating';
    if (isShip && /mayin|döse|mine/.test(haystack)) return 'minelaying';
    if ((isShip || isBattery) && (eventType === 'bombardment' || animState === 'bombardment')) return 'bombarding';
    if (isShip && (/bombala|bombard|tabya|top atesi|yok et|sustur/.test(haystack) || animState === 'bombardment')) return 'bombarding';
    if (!isShip && !isBattery && /cikarma|karaya cik|sahile in/.test(haystack)) {
        return unit.faction === 'ottoman' ? 'defending' : 'landing';
    }
    if (/savun|hat tut|mevzi|koru/.test(haystack)) return 'defending';
    if (/hazir|bekle|ihtiyat|yedek|egitim/.test(haystack)) return 'reserve';
    if (/taarruz|hucum|ilerle|gec|saldir/.test(haystack)) return 'advancing';
    if (animState === 'fighting') return 'engaged';
    if (animState === 'bombardment') return isShip ? 'bombarding' : 'engaged';
    if (eventType === 'combat') return 'engaged';
    if (eventType === 'bombardment') return isShip ? 'bombarding' : 'supporting';
    return 'supporting';
}

function getTargetLocationId(unit, phase, objectiveText, animUnit, currentLocationId) {
    const fromObjective = matchLocationIdFromText(objectiveText);
    if (fromObjective) return fromObjective;

    const frontKey = normalizeText(animUnit && animUnit.front);
    if (frontKey && FRONT_LOCATION_IDS[frontKey]) return FRONT_LOCATION_IDS[frontKey];

    if (unit.type === 'deniz') return 'bogaz';
    return currentLocationId || unit.anchorRegion || null;
}

function buildContactLabel(intent, frontLabel) {
    if (intent.actionKey === 'engaged') return `${frontLabel} ekseninde aktif temas`;
    if (intent.actionKey === 'bombarding') return `${frontLabel} eksenine ateş baskısı`;
    if (intent.actionKey === 'landing') return `${frontLabel} kıyısında çıkarma baskısı`;
    if (intent.actionKey === 'advancing') return `${frontLabel} yönünde ilerleme`;
    if (intent.actionKey === 'defending') return `${frontLabel} çevresinde savunma hattı`;
    if (intent.actionKey === 'reserve') return `${frontLabel} çevresinde ihtiyat bekleyişi`;
    if (intent.actionKey === 'retreating') return `${frontLabel} ekseninden geri çekilme`;
    return `${frontLabel} çevresinde destek faaliyeti`;
}

export function deriveUnitIntent(unit, phase, phaseData = null, animData = null) {
    const animUnit = matchAnimationUnit(unit, animData);
    const statusText = getPhaseField(phase, unit, phaseData, 'status') || 'Durum belirsiz';
    const objectiveText = getPhaseField(phase, unit, phaseData, 'objective') || 'Hedef bilgisi sınırlı';
    const outcomeText = getPhaseField(phase, unit, phaseData, 'outcome') || 'Sonuç bilgisi sınırlı';
    const currentLocationId = getCurrentLocationId(unit, phase);
    const targetLocationId = getTargetLocationId(unit, phase, objectiveText, animUnit, currentLocationId);
    const actionKey = deriveActionKey(unit, statusText, objectiveText, outcomeText, animUnit, animData);
    const actionMeta = ACTION_META[actionKey] || ACTION_META.supporting;
    const currentLocationName = (currentLocationId && LOCATION_BY_ID[currentLocationId] && LOCATION_BY_ID[currentLocationId].name) || 'Belirsiz bölge';
    const targetLocationName = (targetLocationId && LOCATION_BY_ID[targetLocationId] && LOCATION_BY_ID[targetLocationId].name) || currentLocationName;
    const frontLabel = animUnit && animUnit.front ? animUnit.front : targetLocationName;

    return {
        actionKey,
        actionLabel: actionMeta.label,
        actionBadge: actionMeta.badge,
        actionColor: actionMeta.color,
        statusText,
        objectiveText,
        outcomeText,
        currentLocationId,
        currentLocationName,
        targetLocationId,
        targetLocationName,
        frontLabel,
        contactLabel: buildContactLabel({ actionKey }, frontLabel),
        focusLocationIds: [...new Set([currentLocationId, targetLocationId].filter(Boolean))]
    };
}

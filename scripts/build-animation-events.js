const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, '..', 'book', 'gallipoli-events.js');
const outputPath = process.argv[3] || path.join(__dirname, '..', 'book', 'animation-events.json');
const battleUiPath = path.join(__dirname, '..', 'canakkale-1915.html');

const EVENT_TYPES = [
  'BOMBARDMENT',
  'NAVAL_PATROL',
  'FORTIFICATION',
  'LOGISTICS',
  'POLITICAL',
  'RECON',
  'IDLE',
  'COMBAT'
];

const EVENT_TYPE_PRIORITY = [
  'POLITICAL',
  'BOMBARDMENT',
  'COMBAT',
  'NAVAL_PATROL',
  'FORTIFICATION',
  'LOGISTICS',
  'RECON',
  'IDLE'
];

const EVENT_BASE_INTENSITY = {
  BOMBARDMENT: 8,
  COMBAT: 7,
  POLITICAL: 6,
  LOGISTICS: 4,
  FORTIFICATION: 3,
  NAVAL_PATROL: 3,
  RECON: 3,
  IDLE: 2
};

const SPECIAL_INTENSITY = {
  '1914-11-03': 8,
  '1914-11-14': 6
};

const FRONTS = ['Arıburnu', 'Seddülbahir', 'Anafartalar', 'Deniz', 'Genel'];
const UNIT_STATE_VALUES = ['idle', 'fighting', 'building', 'marching', 'praying', 'patrolling', 'bombardment', 'retreating'];

const UNIT_CATALOG = {
  'Arıburnu': {
    ottoman: '19. Tümen',
    allied: '1. Avustralya Tümeni'
  },
  'Seddülbahir': {
    ottoman: '9. Tümen',
    allied: '29. Tümen'
  },
  'Anafartalar': {
    ottoman: '3. Kolordu',
    allied: 'Yeni Zelanda Tugayı'
  },
  'Deniz': {
    ottoman: 'Nusret Mayın Gemisi',
    allied: 'HMS Queen Elizabeth'
  },
  'Genel': {
    ottoman: '5. Ordu Karargâhı',
    allied: '29. Tümen'
  }
};

const SCENE_UNIT_CATALOG = {
  naval: [
    { name: 'Nusret Mayın Gemisi', side: 'ottoman', front: 'Deniz', state: 'fighting' },
    { name: 'HMS Queen Elizabeth', side: 'allied', front: 'Deniz', state: 'bombardment' },
    { name: 'HMS Irresistible', side: 'allied', front: 'Deniz', state: 'bombardment' },
    { name: 'HMS Ocean', side: 'allied', front: 'Deniz', state: 'bombardment' },
    { name: 'Bouvet', side: 'allied', front: 'Deniz', state: 'bombardment' },
    { name: 'Suffren', side: 'allied', front: 'Deniz', state: 'bombardment' }
  ],
  anzac: [
    { name: '19. Tümen', side: 'ottoman', front: 'Arıburnu', state: 'fighting' },
    { name: '57. Alay', side: 'ottoman', front: 'Arıburnu', state: 'fighting' },
    { name: '27. Alay', side: 'ottoman', front: 'Arıburnu', state: 'fighting' },
    { name: '1. Avustralya Tümeni', side: 'allied', front: 'Arıburnu', state: 'bombardment' },
    { name: 'Yeni Zelanda Tugayı', side: 'allied', front: 'Arıburnu', state: 'bombardment' }
  ],
  helles: [
    { name: '9. Tümen', side: 'ottoman', front: 'Seddülbahir', state: 'fighting' },
    { name: '5. Ordu Karargâhı', side: 'ottoman', front: 'Seddülbahir', state: 'marching' },
    { name: '29. Tümen', side: 'allied', front: 'Seddülbahir', state: 'bombardment' },
    { name: 'Fransız Sefer Kuvveti', side: 'allied', front: 'Seddülbahir', state: 'bombardment' }
  ]
};

const SPECIAL_SCENE_DATES = {
  '1915-03-18': 'naval',
  '1915-03-19': 'naval',
  '1915-04-25': 'anzac',
  '1915-04-26': 'helles',
  '1915-04-27': 'anzac',
  '1915-04-28': 'helles',
  '1915-04-30': 'anzac',
  '1915-05-01': 'helles',
  '1915-05-06': 'helles',
  '1915-05-19': 'anzac',
  '1915-06-04': 'helles'
};

const MONTH_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function extractJsonArray(source, variableName) {
  const assignRe = new RegExp(`(?:window\\.${variableName}|export\\s+const\\s+${variableName})\\s*=\\s*`);
  const assignMatch = assignRe.exec(source);
  if (!assignMatch) {
    throw new Error(`${variableName} dizisi bulunamadı.`);
  }
  let i = assignMatch.index + assignMatch[0].length;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== '[') {
    throw new Error(`${variableName} dizisi parse edilemedi.`);
  }

  const start = i;
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const jsonText = source.slice(start, i + 1);
        return JSON.parse(jsonText);
      }
    }
  }

  throw new Error(`${variableName} dizisi kapanışı bulunamadı.`);
}

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isoToTrDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return `${day} ${MONTH_TR[month - 1]} ${year}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function resolveGeneralAlliedNameFromUi() {
  try {
    const html = fs.readFileSync(battleUiPath, 'utf8');
    const re = /\{\s*id:"[^"]+"\s*,\s*name:"([^"]+)"\s*,\s*faction:"([^"]+)"\s*,\s*type:"([^"]+)"/g;
    let match;
    while ((match = re.exec(html))) {
      const name = match[1];
      const faction = match[2];
      const type = match[3];
      const isAllied = faction === 'british' || faction === 'french';
      const isHighLevel = type === 'kolordu' || type === 'ordu';
      if (isAllied && isHighLevel) return name;
    }
  } catch (_) {
    // fallback below
  }
  return '29. Tümen';
}

function validateCampaignGuide(weeklyGuide, phaseEvents) {
  const weeklyCount = weeklyGuide.length;
  const dailyCount = phaseEvents.length;
  const startDate = String(phaseEvents[0] && phaseEvents[0].isoStart || '');
  const endDate = String(phaseEvents[phaseEvents.length - 1] && phaseEvents[phaseEvents.length - 1].isoStart || '');

  let yearMismatch = 0;
  for (let i = 0; i < phaseEvents.length; i += 1) {
    const e = phaseEvents[i];
    const isoYear = String(e.isoStart || '').slice(0, 4);
    const dateYears = String(e.date || '').match(/\b\d{4}\b/g) || [];
    if (!isoYear || !dateYears.includes(isoYear)) yearMismatch += 1;
  }

  console.log(`weekly: ${weeklyCount}`);
  console.log(`daily: ${dailyCount}`);
  console.log(`range: ${startDate} -> ${endDate}`);
  console.log(`yearMismatch: ${yearMismatch}`);

  if (weeklyCount !== 62) throw new Error(`weekly beklenen 62, gelen ${weeklyCount}`);
  if (dailyCount !== 433) throw new Error(`daily beklenen 433, gelen ${dailyCount}`);
  if (startDate !== '1914-11-03' || endDate !== '1916-01-09') {
    throw new Error(`range beklenen 1914-11-03 -> 1916-01-09, gelen ${startDate} -> ${endDate}`);
  }
  if (yearMismatch !== 0) throw new Error(`yearMismatch beklenen 0, gelen ${yearMismatch}`);
}

function validateFirstLongIdleBlock(rows) {
  let runStart = -1;
  for (let i = 0; i <= rows.length; i += 1) {
    const isIdle = i < rows.length && rows[i].eventType === 'IDLE';
    if (isIdle) {
      if (runStart < 0) runStart = i;
      continue;
    }
    if (runStart >= 0) {
      const runLen = i - runStart;
      if (runLen >= 3) {
        for (let k = 0; k < runLen; k += 1) {
          const rowIndex = runStart + k;
          const expected = `[${k + 1}. gün]`;
          const actual = String(rows[rowIndex].sceneTransition || '');
          if (rowIndex === rows.length - 1 && actual === 'Kampanya kapanışına geçiliyor.') {
            continue;
          }
          if (!actual.startsWith(expected)) {
            throw new Error(`IDLE sayaç hatası: ${rows[rowIndex].date} için "${expected}" bekleniyordu.`);
          }
        }
        return;
      }
      runStart = -1;
    }
  }
  throw new Error('Kontrol için uzun IDLE bloğu bulunamadı.');
}

function detectEventType(day) {
  if (day.date === '1914-11-14') return 'POLITICAL';
  if (day.date === '1914-11-03') return 'BOMBARDMENT';

  const text = normalizeText([
    day.title,
    day.narration,
    day.source,
    day.type,
    day.detailParts && day.detailParts.explicit,
    day.detailParts && day.detailParts.state,
    day.detailParts && day.detailParts.weekly
  ].filter(Boolean).join(' '));

  const checks = {
    POLITICAL: ['cihat', 'ferman', 'savas ilani', 'siyasi', 'ilan edildi', 'konsey', 'hukumet'],
    BOMBARDMENT: ['bombardiman', 'bombal', 'batarya', 'zıhri', 'zirhli', 'top atesi', 'ates ac'],
    COMBAT: ['muharebe', 'taarruz', 'hucum', 'catisma', 'karsi taarruz', 'cephe'],
    NAVAL_PATROL: ['devriye', 'deniz', 'gemi', 'filo', 'bogaz', 'mayin tarama'],
    FORTIFICATION: ['tahkimat', 'tabya', 'siper', 'savunma hatti', 'mevzi guclendir'],
    LOGISTICS: ['ikmal', 'sevk', 'konuslan', 'tahliye hazirlik', 'lojistik', 'tasima'],
    RECON: ['kesif', 'istihbarat', 'gozlem', 'tarama']
  };

  for (const type of EVENT_TYPE_PRIORITY) {
    if (type === 'IDLE') continue;
    if (hasAny(text, checks[type] || [])) return type;
  }
  return 'IDLE';
}

function normalizeExplicitText(day) {
  return normalizeText(day.detailParts && day.detailParts.explicit);
}

function buildAnimationState(eventType) {
  switch (eventType) {
    case 'POLITICAL':
      return { ottoman: 'praying', allied: 'idle' };
    case 'FORTIFICATION':
      return { ottoman: 'building', allied: 'idle' };
    case 'BOMBARDMENT':
      return { ottoman: 'fighting', allied: 'bombardment' };
    case 'NAVAL_PATROL':
      return { ottoman: 'idle', allied: 'patrolling' };
    case 'COMBAT':
      return { ottoman: 'fighting', allied: 'bombardment' };
    case 'LOGISTICS':
      return { ottoman: 'marching', allied: 'patrolling' };
    case 'RECON':
      return { ottoman: 'marching', allied: 'patrolling' };
    case 'IDLE':
    default:
      return { ottoman: 'idle', allied: 'idle' };
  }
}

function inferFrontCandidates(day, eventType) {
  const text = normalizeText([
    day.title,
    day.narration,
    day.detailParts && day.detailParts.explicit,
    day.detailParts && day.detailParts.state,
    day.detailParts && day.detailParts.weekly,
    (day.locationIds || []).join(' ')
  ].filter(Boolean).join(' '));

  const fronts = new Set();
  if (hasAny(text, ['ariburnu', 'anzac'])) fronts.add('Arıburnu');
  if (hasAny(text, ['seddulbahir', 'helles', 'kirte', 'alcitepe', 'morto'])) fronts.add('Seddülbahir');
  if (hasAny(text, ['anafartalar', 'conkbayiri', 'suvla', 'bigali'])) fronts.add('Anafartalar');
  if (hasAny(text, ['bogaz', 'canakkale', 'kumkale', 'deniz', 'gemi', 'filo', 'mayin', 'zırhli', 'zirhli'])) fronts.add('Deniz');

  if (!fronts.size) {
    if (eventType === 'BOMBARDMENT' || eventType === 'NAVAL_PATROL') fronts.add('Deniz');
    else if (eventType === 'COMBAT') fronts.add('Arıburnu');
    else if (eventType === 'LOGISTICS' || eventType === 'FORTIFICATION') fronts.add('Genel');
    else fronts.add('Genel');
  }

  return [...fronts].filter((f) => FRONTS.includes(f));
}

function resolveSceneKey(day, date, eventType) {
  if (SPECIAL_SCENE_DATES[date]) return SPECIAL_SCENE_DATES[date];

  const text = normalizeText([
    day.title,
    day.titleEn,
    day.narration,
    day.detailParts && day.detailParts.explicit,
    day.detailParts && day.detailParts.state,
    day.detailParts && day.detailParts.weekly,
    (day.locationIds || []).join(' ')
  ].filter(Boolean).join(' '));

  if (date < '1915-04-25') return 'naval';
  if (date < '1915-08-06') {
    if (hasAny(text, ['anzac', 'ariburnu', 'kabatepe', 'conkbayiri', 'sari bair', 'mustafa kemal', '19 mayis'])) return 'anzac';
    if (hasAny(text, ['helles', 'seddulbahir', 'kirte', 'krithia', 'alcitepe', 'achi baba', 'v beach', 'w beach', 'x beach', 'y beach', 's beach'])) return 'helles';
  }
  return 'general';
}

function normalizeFrontsForScene(fronts, date, sceneKey) {
  const normalized = [...new Set(fronts)];
  const set = new Set(normalized);

  if (sceneKey === 'naval') return ['Deniz'];
  if (sceneKey === 'anzac') return ['Arıburnu'];
  if (sceneKey === 'helles') return ['Seddülbahir'];

  if (date < '1915-04-25') {
    set.delete('Arıburnu');
    set.delete('Anafartalar');
  }
  if (date < '1915-08-06') {
    set.delete('Anafartalar');
  }
  if (!set.size) set.add(date < '1915-04-25' ? 'Deniz' : 'Genel');
  return [...set];
}

function buildUnits(fronts, animationState, intensity) {
  if (intensity < 2) return [];
  const units = [];
  fronts.forEach((front) => {
    const cat = UNIT_CATALOG[front] || UNIT_CATALOG['Genel'];
    units.push({
      name: cat.ottoman,
      side: 'ottoman',
      front,
      state: animationState.ottoman
    });
    units.push({
      name: cat.allied,
      side: 'allied',
      front,
      state: animationState.allied
    });
  });
  return units;
}

function buildMovementVector(eventType, intensity, fronts) {
  if (intensity < 4) return undefined;
  if (eventType !== 'COMBAT' && eventType !== 'LOGISTICS') return undefined;
  const primary = fronts[0] || 'Genel';
  if (eventType === 'LOGISTICS') {
    return {
      side: 'both',
      from: 'Gelibolu Gerisi',
      to: primary,
      type: 'supply'
    };
  }
  if (primary === 'Deniz') {
    return {
      side: 'allied',
      from: 'Açık Deniz',
      to: 'Boğaz Girişi',
      type: 'advance'
    };
  }
  if (primary === 'Anafartalar') {
    return {
      side: 'both',
      from: 'Suvla',
      to: 'Anafartalar',
      type: 'flank'
    };
  }
  return {
    side: 'both',
    from: 'Kıyı Şeridi',
    to: primary,
    type: 'advance'
  };
}

function summarizeEventName(day, eventType) {
  const explicit = String(day.detailParts && day.detailParts.explicit || '').trim();
  if (explicit) return explicit.replace(/\.$/, '');
  const title = String(day.title || '').split('·')[0].trim();
  if (title) return title;
  return eventType;
}

function buildUnitActivity(date, eventType, fronts, intensity, dataQuality) {
  const mark = dataQuality === 'documented' ? '[✓]' : '[~]';
  const trDate = isoToTrDate(date);
  const frontLabel = fronts.join(', ');
  switch (eventType) {
    case 'BOMBARDMENT':
      return `${mark} ${trDate} günü Osmanlı bataryaları ${frontLabel} hattında karşı ateş düzeni alırken İtilaf deniz unsurları bombardıman temposunu ${intensity}/10 seviyesine taşıdı.`;
    case 'NAVAL_PATROL':
      return `${mark} ${trDate} günü İtilaf gemileri ${frontLabel} çevresinde devriye taraması yürütürken Osmanlı gözcüleri hedef tespit raporlarını komutaya aktardı.`;
    case 'FORTIFICATION':
      return `${mark} ${trDate} günü Osmanlı mühendisleri ${frontLabel} hattında siper ve tabya güçlendirmesi yaparak savunma derinliğini artırdı.`;
    case 'LOGISTICS':
      return `${mark} ${trDate} günü her iki taraf ${frontLabel} ekseninde mühimmat, iaşe ve birlik rotasyon sevkiyatını düzenli şekilde sürdürdü.`;
    case 'POLITICAL':
      return `${mark} ${trDate} günü siyasi emir ve beyanlar cephedeki birliklere okunarak komuta-moral hattı yeniden çerçevelendi.`;
    case 'RECON':
      return `${mark} ${trDate} günü keşif kolları ${frontLabel} doğrultusunda karşı mevzileri gözlemleyip yeni temas noktalarını raporladı.`;
    case 'COMBAT':
      return `${mark} ${trDate} günü ön hat birlikleri ${frontLabel} cephesinde taarruz-karşı taarruz döngüsüne girerek yakın temas yoğunluğunu yükseltti.`;
    case 'IDLE':
    default:
      return `${mark} ${trDate} günü ${frontLabel} hattında mevziler korunarak düşük tempolu bekleme ve nöbet düzeni sürdürüldü.`;
  }
}

function buildSceneAwareUnitActivity(date, sceneKey, fallback, intensity, dataQuality) {
  const mark = dataQuality === 'documented' ? '[✓]' : '[~]';
  const trDate = isoToTrDate(date);
  if (sceneKey === 'naval') {
    if (date === '1915-03-18') {
      return `${mark} ${trDate} günü İtilaf zırhlıları Boğaz narrows hattına yüklendi; Nusret mayınları ve kıyı bataryaları Bouvet, Irresistible ve Ocean kayıplarını doğurdu.`;
    }
    if (date === '1915-03-19') {
      return `${mark} ${trDate} günü de Robeck filosu geri çekilip denizden zorlama planını askıya alırken kara harekâtı hazırlıkları öne çıktı.`;
    }
  }
  if (sceneKey === 'anzac') {
    if (date === '1915-04-25') {
      return `${mark} ${trDate} sabahı ANZAC kuvvetleri Arıburnu'na planlananın kuzeyinde çıktı; sarp arazi ve yüksek Osmanlı mevzileri ilerlemeyi kıyı başında durdurdu.`;
    }
    if (date === '1915-04-27' || date === '1915-04-30' || date === '1915-05-19') {
      return `${mark} ${trDate} günü Arıburnu-Sarı Bayır hattında Osmanlı karşı taarruzları yüksek zayiat pahasına ANZAC köprübaşını denize itemeden durdu.`;
    }
    return `${mark} ${trDate} günü Arıburnu ve Sarı Bayır eteklerinde kıyıya sıkışmış ANZAC birlikleriyle Osmanlı savunması arasında yıpratma teması sürdü.`;
  }
  if (sceneKey === 'helles') {
    if (date === '1915-04-26') {
      return `${mark} ${trDate} günü Helles çıkarması S, V, W, X ve Y sahillerinde dağınık biçimde sürerken 29. Tümen emir ve koordinasyon eksikliğiyle avantajını kullanamadı.`;
    }
    if (date === '1915-04-28' || date === '1915-05-06' || date === '1915-06-04') {
      return `${mark} ${trDate} günü Seddülbahir-Krithia-Achi Baba hattında yoğun topçu hazırlığına rağmen İtilaf hücumu Osmanlı savunmasını yaramadı.`;
    }
    return `${mark} ${trDate} günü Helles cephesinde plaj başları, Krithia yaklaşmaları ve Achi Baba eteğinde ağır kayıplı yıpratma çatışmaları yaşandı.`;
  }
  return fallback;
}

function buildSceneTransition(date, sceneKey, currentRow, nextRow) {
  if (sceneKey === 'naval') {
    if (date === '1915-03-18') return 'Mayın hattında ağır kayıplar veren filo geri çekiliyor; denizden zorlama planı çözülüyor.';
    if (date === '1915-03-19') return 'Deniz yenilgisi kara çıkarması hazırlıklarına evriliyor.';
    return 'Boğaz eksenindeki deniz baskısı bir sonraki safhaya taşınıyor.';
  }
  if (sceneKey === 'anzac') {
    if (date === '1915-04-25') return 'Yanlış kıyıya çıkan birlikler Sarı Bayır hedefinden kopup kıyı şeridinde tutunmaya zorlanıyor.';
    if (date === '1915-04-27') return 'Osmanlı karşı taarruzu deniz topçu desteği altında duruyor; ANZAC köprübaşı kapanıyor.';
    if (date === '1915-04-30') return 'Arıburnu hattında hücumlar siper tutunmasına dönüşüyor.';
    if (date === '1915-05-19') return 'Büyük Osmanlı taarruzu başarısız kalıyor; cephe yıpratma savaşına kilitleniyor.';
    return 'Arıburnu köprübaşı dar kıyı şeridinde tutulmaya çalışılıyor.';
  }
  if (sceneKey === 'helles') {
    if (date === '1915-04-26') return 'Helles plajları birleşik bir ilerleme yerine dağınık sahil başlarına dönüşüyor.';
    if (date === '1915-04-28') return 'Krithia denemesi yarıda kesiliyor; Helles hattı siper savaşına sertçe geçiyor.';
    if (date === '1915-05-06') return 'Achi Baba ve Krithia için yeni hücum ağır kayıpla yavaşlıyor.';
    if (date === '1915-06-04') return 'Son büyük Helles saldırısı da kırılıyor; cephe yeniden siper dengesine dönüyor.';
    return 'Seddülbahir-Krithia hattında emir ve koordinasyon eksikliği ilerlemeyi törpülüyor.';
  }
  return currentRow.sceneTransition;
}

function buildSceneTransitions(rows) {
  let idleRun = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const cur = rows[i];
    const next = rows[i + 1];
    if (cur.eventType === 'IDLE') idleRun += 1;
    else idleRun = 0;

    if (!next) {
      cur.sceneTransition = 'Kampanya kapanışına geçiliyor.';
      continue;
    }
    if (cur.eventType === 'IDLE') {
      cur.sceneTransition = `[${idleRun}. gün] mevziler korunarak bekleme sürüyor.`;
      continue;
    }
    if (cur.eventType !== next.eventType) {
      cur.sceneTransition = `${cur.eventType} safhasından ${next.eventType} safhasına geçilirken birlik öncelikleri yeniden düzenleniyor.`;
      continue;
    }
    if (next.intensity > cur.intensity) {
      cur.sceneTransition = `Gerilim ${cur.intensity}'den ${next.intensity}'e yükseliyor; birlik temposu artıyor.`;
      continue;
    }
    if (next.intensity < cur.intensity) {
      cur.sceneTransition = `Gerilim ${cur.intensity}'den ${next.intensity}'e düşüyor; hatlar yeniden dengeleniyor.`;
      continue;
    }
    cur.sceneTransition = 'Mevcut temas düzeni korunarak bir sonraki güne aktarılıyor.';
  }
}

function main() {
  UNIT_CATALOG['Genel'].allied = resolveGeneralAlliedNameFromUi();
  const raw = fs.readFileSync(inputPath, 'utf8');
  const weeklyGuide = extractJsonArray(raw, 'BOOK_WEEKLY_GUIDE');
  const phaseEvents = extractJsonArray(raw, 'BOOK_PHASE_EVENTS')
    .map((e) => ({ ...e }))
    .sort((a, b) => String(a.isoStart).localeCompare(String(b.isoStart)));

  validateCampaignGuide(weeklyGuide, phaseEvents);

  const explicitFreq = {};
  phaseEvents.forEach((e) => {
    const k = normalizeExplicitText(e);
    if (!k) return;
    explicitFreq[k] = (explicitFreq[k] || 0) + 1;
  });

  const rows = phaseEvents.map((day) => {
    const date = String(day.isoStart || '');
    const eventType = detectEventType({
      date,
      title: day.title,
      narration: day.narration,
      detailParts: day.detailParts,
      source: day.source,
      type: day.type,
      locationIds: day.locationIds
    });
    const explicitNorm = normalizeExplicitText(day);
    const explicitRaw = String(day.detailParts && day.detailParts.explicit || '').trim();
    const stateRaw = String(day.detailParts && day.detailParts.state || '').trim();
    const documented = (
      day.type === 'explicit' &&
      (day.source === 'epub' || day.source === 'internet') &&
      explicitNorm &&
      explicitFreq[explicitNorm] === 1 &&
      normalizeText(explicitRaw) !== normalizeText(stateRaw)
    );
    const dataQuality = documented ? 'documented' : 'inferred';
    const baseIntensity = SPECIAL_INTENSITY[date] != null ? SPECIAL_INTENSITY[date] : (EVENT_BASE_INTENSITY[eventType] || 2);
    return {
      date,
      _sourceDay: day,
      eventType,
      dataQuality,
      _baseIntensity: baseIntensity,
      _isMajor: baseIntensity >= 6,
      _sceneKey: resolveSceneKey(day, date, eventType)
    };
  });

  const majorIndexes = rows.map((r, idx) => (r._isMajor ? idx : -1)).filter((idx) => idx >= 0);
  function findNextMajorIndex(i) {
    for (let k = 0; k < majorIndexes.length; k += 1) {
      if (majorIndexes[k] > i) return majorIndexes[k];
    }
    return -1;
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const nextMajorIdx = findNextMajorIndex(i);
    const daysToNextMajor = nextMajorIdx >= 0 ? (nextMajorIdx - i) : null;
    let intensity = row._baseIntensity;
    if (!row._isMajor && daysToNextMajor !== null && daysToNextMajor >= 1 && daysToNextMajor <= 5) {
      intensity = row._baseIntensity + (5 - daysToNextMajor);
    }
    intensity = clamp(intensity, 1, 10);

    const animationState = buildAnimationState(row.eventType);
    const frontCandidates = inferFrontCandidates({
      title: row._sourceDay.title,
      titleEn: row._sourceDay.titleEn,
      narration: row._sourceDay.narration,
      detailParts: row._sourceDay.detailParts,
      locationIds: row._sourceDay.locationIds
    }, row.eventType);
    const sceneFronts = normalizeFrontsForScene(frontCandidates, row.date, row._sceneKey);
    const units = SCENE_UNIT_CATALOG[row._sceneKey]
      ? SCENE_UNIT_CATALOG[row._sceneKey].map((unit) => ({ ...unit }))
      : buildUnits(sceneFronts, animationState, intensity);
    const fronts = intensity < 2
      ? ['Genel']
      : ((units.length ? [...new Set(units.map((u) => u.front))] : sceneFronts));

    const movementVector = buildMovementVector(row.eventType, intensity, fronts);
    const unitActivity = buildSceneAwareUnitActivity(
      row.date,
      row._sceneKey,
      buildUnitActivity(row.date, row.eventType, fronts, intensity, row.dataQuality),
      intensity,
      row.dataQuality
    );

    let nextEventCountdown;
    if (nextMajorIdx < 0) {
      nextEventCountdown = { days: null, event: 'Kampanya sona eriyor' };
    } else {
      nextEventCountdown = {
        days: nextMajorIdx - i,
        event: summarizeEventName(rows[nextMajorIdx]._sourceDay, rows[nextMajorIdx].eventType)
      };
    }

    row.intensity = intensity;
    row.animationState = animationState;
    row.fronts = fronts;
    row.units = units;
    row.unitActivity = unitActivity;
    row.nextEventCountdown = nextEventCountdown;
    if (movementVector) row.movementVector = movementVector;
  }

  buildSceneTransitions(rows);
  rows.forEach((row, idx) => {
    row.sceneTransition = buildSceneTransition(row.date, row._sceneKey, row, rows[idx + 1]);
  });
  validateFirstLongIdleBlock(rows);

  const out = rows.map((row) => {
    const item = {
      date: row.date,
      eventType: row.eventType,
      intensity: row.intensity,
      unitActivity: row.unitActivity,
      nextEventCountdown: row.nextEventCountdown,
      animationState: row.animationState,
      sceneTransition: row.sceneTransition,
      dataQuality: row.dataQuality,
      fronts: row.fronts,
      units: row.units
    };
    if (row.movementVector) item.movementVector = row.movementVector;
    return item;
  });

  fs.writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  const documentedCount = out.filter((x) => x.dataQuality === 'documented').length;
  const inferredCount = out.length - documentedCount;
  const uniqueActivity = new Set(out.map((x) => x.unitActivity)).size;

  const byDate = new Map(out.map((x) => [x.date, x]));
  const nov03 = byDate.get('1914-11-03');
  const nov14 = byDate.get('1914-11-14');
  if (!nov03 || nov03.eventType !== 'BOMBARDMENT' || nov03.intensity !== 8) {
    throw new Error('Spot-check fail: 1914-11-03 => BOMBARDMENT, intensity=8 bekleniyordu.');
  }
  if (!nov14 || nov14.eventType !== 'POLITICAL' || nov14.intensity !== 6) {
    throw new Error('Spot-check fail: 1914-11-14 => POLITICAL, intensity=6 bekleniyordu.');
  }

  console.log(`Yazıldı: ${outputPath}`);
  console.log(`Kayıt: ${out.length}, documented: ${documentedCount}, inferred: ${inferredCount}, uniqueUnitActivity: ${uniqueActivity}`);
  if (documentedCount < 65 || documentedCount > 85) {
    console.warn(`WARN documented aralık dışı: ${documentedCount} (beklenen 65-85)`);
  }
}

main();

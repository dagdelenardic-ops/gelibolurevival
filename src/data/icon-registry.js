// Icons8 Color-style icon registry for unit tokens, map elements, and UI panels
// Source: https://icons8.com/icons/set/military--style-color
// License: Free with attribution — "Icons by Icons8"

const UNIT_ICONS = {
  // Osmanlı birimleri
  '5-ordu':          { icon: 'army-star',           size: 12 },
  '3-kolordu':       { icon: 'army-star',           size: 10 },
  '19-tumen':        { icon: '',                    size: 0  },
  '57-alay':         { icon: '',                    size: 0  },
  '27-alay':         { icon: '',                    size: 0  },
  '7-tumen':         { icon: '',                    size: 0  },
  '9-tumen':         { icon: '',                    size: 0  },
  '5-tumen':         { icon: '',                    size: 0  },
  'mustahkem-mevki': { icon: 'cannon',              size: 9  },
  'nusret':          { icon: 'naval-mine',          size: 10 },
  // İngiliz birimleri
  '29-div':          { icon: 'wwi-tommy-helmet',    size: 9  },
  'hms-queen-elizabeth': { icon: 'battleship',      size: 12 },
  'hms-irresistible': { icon: 'battleship',         size: 10 },
  'hms-ocean':       { icon: 'battleship',          size: 10 },
  'allied-minesweepers': { icon: 'anchor',          size: 8  },
  'ss-river-clyde':  { icon: 'anchor',              size: 8  },
  // ANZAC birimleri
  'anzac-1div':      { icon: '',                    size: 0  },
  'nz-inf':          { icon: '',                    size: 0  },
  // Fransız birimleri
  'bouvet':          { icon: 'battleship',          size: 10 },
  'suffren':         { icon: 'battleship',          size: 10 },
  'fr-corps':        { icon: 'french-poilu-helmet', size: 9  },
};

const NARRATION_ICONS = {
  bombardment: 'explosion',
  naval:       'battleship',
  attack:      'sword',
  recon:       'binoculars',
  evacuation:  'smoke',
  landing:     'anchor',
  default:     'compass',
};

export function getUnitIcon(unitId) {
  return UNIT_ICONS[unitId] || { icon: '', size: 0 };
}

export function getNarrationIcon(title) {
  if (/bombardıman|ateş|fire|bomba/i.test(title)) return NARRATION_ICONS.bombardment;
  if (/deniz|naval|donanma|fleet/i.test(title)) return NARRATION_ICONS.naval;
  if (/taarruz|saldır|attack|hücum|muharebe|combat/i.test(title)) return NARRATION_ICONS.attack;
  if (/keşif|gözetleme|observation|recon/i.test(title)) return NARRATION_ICONS.recon;
  if (/tahliye|evacu|çekil|retreat/i.test(title)) return NARRATION_ICONS.evacuation;
  if (/çıkarma|landing|ihraç/i.test(title)) return NARRATION_ICONS.landing;
  return NARRATION_ICONS.default;
}

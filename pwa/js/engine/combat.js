// combat.js — Full attack resolution engine
// Consumes: attack_tables.json, critical_tables.json, fumble_tables.json
// Data is top-level arrays — indexed lazily into id-keyed maps at first use

import { getData } from './data-loader.js';

// ============================================================
// LAZY INDEXES — built once per session from raw arrays
// ============================================================

let _atkIdx = null, _critIdx = null, _fumIdx = null;

function getAtkIdx() {
  if (_atkIdx) return _atkIdx;
  _atkIdx = {};
  for (const t of getData().attack_tables || []) _atkIdx[t.id] = t;
  return _atkIdx;
}

function getCritIdx() {
  if (_critIdx) return _critIdx;
  _critIdx = {};
  for (const t of getData().critical_tables || []) _critIdx[t.id] = t;
  return _critIdx;
}

function getFumIdx() {
  if (_fumIdx) return _fumIdx;
  _fumIdx = {};
  for (const t of getData().fumble_tables || []) _fumIdx[t.id] = t;
  return _fumIdx;
}

// ============================================================
// ROW BAND PARSING
// ============================================================

// Parses row_band strings: "150+" → {min:150,max:Inf}, "56-57" → {min:56,max:57},
// "UM-41" → {min:-Inf,max:41}, "149" → {min:149,max:149}
function parseRowBand(band) {
  if (!band) return { min: -Infinity, max: Infinity };
  if (band.endsWith('+')) return { min: parseInt(band), max: Infinity };
  if (band.startsWith('UM-')) return { min: -Infinity, max: parseInt(band.slice(3)) };
  const dash = band.indexOf('-');
  if (dash > 0) {
    return { min: parseInt(band.slice(0, dash)), max: parseInt(band.slice(dash + 1)) };
  }
  const n = parseInt(band);
  return { min: n, max: n };
}

// Parse fumble_range string "01 - 05 UM" → max fumble roll = 5
function parseFumbleRange(str) {
  if (!str) return 2;
  const nums = (str.match(/\d+/g) || []).map(Number).filter(n => n > 0);
  return nums.length > 0 ? Math.max(...nums) : 2;
}

// ============================================================
// D100 OPEN-ENDED ROLL
// ============================================================

export function rollOpenEndedD100() {
  let roll = Math.floor(Math.random() * 100) + 1;
  let total = roll;
  while (roll >= 96) {
    roll = Math.floor(Math.random() * 100) + 1;
    total += roll;
  }
  if (total <= 5) {
    roll = Math.floor(Math.random() * 100) + 1;
    total -= roll;
  }
  return total;
}

// ============================================================
// WEAPON LISTING
// ============================================================

export function getAvailableWeapons() {
  return (getData().attack_tables || []).map(t => ({
    id: t.id,
    name_en: t.name_en,
    name_fr: t.name_fr,
    weapon_family: t.weapon_family,
    source: t.source?.primary_pdf,
  }));
}

// ============================================================
// ATTACK RESOLUTION
// ============================================================

export function resolveAttack({ weaponTable, ob, db, armorType, roll }) {
  const idx = getAtkIdx();
  const table = idx[weaponTable];
  if (!table) return { error: `Unknown weapon table: ${weaponTable}` };

  if (roll == null) roll = rollOpenEndedD100();
  const total = roll + ob - db;
  const at = String(armorType);

  // Fumble check on raw unmodified roll
  const fumbleMax = parseFumbleRange(table.fumble_range);
  if (roll <= fumbleMax) {
    return {
      total, hits: 0, critical: null, fumble: true,
      fumbleRoll: roll,
      breakdown: { roll, ob, db, armorType, weaponTable },
    };
  }

  // Row lookup — rows are sorted from highest to lowest
  let cell = { h: 0, c: null };
  for (const row of (table.rows || [])) {
    const { min, max } = parseRowBand(row.row_band);
    if (total >= min && total <= max) {
      cell = row.at?.[at] || { h: 0, c: null };
      break;
    }
  }

  return {
    total,
    hits: cell.h ?? 0,
    critical: cell.c ?? null,
    fumble: false,
    breakdown: { roll, ob, db, armorType, weaponTable },
  };
}

// ============================================================
// CRITICAL RESOLUTION
// ============================================================

export function getAvailableCriticalTypes() {
  return (getData().critical_tables || []).map(t => t.id);
}

// Find critical table by type suffix — prefer rmss5520, then al2003, then any
const CRIT_SOURCE_PREF = ['rmss5520', 'al2003', 'comp3'];

function findCritTable(type) {
  const idx = getCritIdx();
  for (const src of CRIT_SOURCE_PREF) {
    const key = `crit-${src}-${type}`;
    if (idx[key]) return idx[key];
  }
  return Object.values(idx).find(t => t.id.endsWith(`-${type}`)) || null;
}

/**
 * Resolve a critical strike.
 * @param {string} critCode — "B_slash" from attack result
 * @param {number} [roll]   — D100 1-100 (null = auto, NOT open-ended)
 */
export function resolveCritical(critCode, roll) {
  if (!critCode) return null;

  const parts = critCode.split('_');
  const severity = parts[0];               // "B"
  const type = parts.slice(1).join('_');   // "slash"

  const critTable = findCritTable(type);
  if (!critTable) return { error: `Unknown critical type: ${type}`, critCode };

  if (roll == null) roll = Math.floor(Math.random() * 100) + 1;

  // entries[] has one record per roll value (1-100)
  const entry = (critTable.entries || []).find(e => e.roll === roll);
  if (!entry)
    return { severity, type, roll, hitsBonus: 0, rawText: 'No effect.', parsedEffects: {} };

  const result = entry[severity];
  if (!result)
    return { severity, type, roll, hitsBonus: 0, rawText: 'No effect.', parsedEffects: {} };

  return {
    severity, type, roll,
    hitsBonus: result.parsed_effects?.bonus_hits ?? 0,
    rawText: result.raw_text || 'No additional effect.',
    parsedEffects: result.parsed_effects || {},
  };
}

// ============================================================
// FUMBLE RESOLUTION
// ============================================================

// Map weapon_family → column in the al2003-weapon-fumble-table
const FAMILY_TO_FUMBLE_COL = {
  one_handed_blade:     'one_handed_arms',
  dagger:               'one_handed_arms',
  club:                 'one_handed_arms',
  mace:                 'one_handed_arms',
  hammer:               'one_handed_arms',
  flail:                'one_handed_arms',
  chain_mace:           'one_handed_arms',
  flexible_weapon:      'one_handed_arms',
  whip:                 'one_handed_arms',
  japanese_blade:       'one_handed_arms',
  japanese_short_blade: 'one_handed_arms',
  martial_arts:         'one_handed_arms',
  martial_weapon:       'one_handed_arms',
  axe:                  'two_handed_arms',
  two_handed_blade:     'two_handed_arms',
  mattock:              'two_handed_arms',
  polearm:              'polearms_and_spears',
  spear:                'polearms_and_spears',
  lance:                'polearms_and_spears',
  staff:                'polearms_and_spears',
  javelin:              'thrown_arms',
  bola:                 'thrown_arms',
  weighted_net:         'thrown_arms',
  sling:                'missile_weapons',
  bow:                  'missile_weapons',
  crossbow:             'missile_weapons',
};

/**
 * Resolve a fumble from the al2003 weapon fumble table.
 * @param {string} weaponTable — weapon id
 * @param {number} [roll]      — D100 1-100 (null = auto)
 */
export function resolveFumble(weaponTable, roll) {
  if (roll == null) roll = Math.floor(Math.random() * 100) + 1;

  const weaponInfo = getAtkIdx()[weaponTable];
  const family = weaponInfo?.weapon_family || 'one_handed_blade';
  const col = FAMILY_TO_FUMBLE_COL[family] || 'one_handed_arms';

  const fumIdx = getFumIdx();
  const fumbleTable = fumIdx['fumble-al2003-weapon-fumble-table']
    || fumIdx['fumble-tmwtd-melee-and-missile-fumble-table']
    || Object.values(fumIdx)[0];

  if (!fumbleTable) return { roll, rawText: 'No fumble table loaded.', parsedEffects: {} };

  const entry = (fumbleTable.entries || []).find(e => {
    const { min, max } = parseRowBand(e.row_band);
    return roll >= min && roll <= max;
  });
  if (!entry) return { roll, rawText: 'No specific fumble result.', parsedEffects: {} };

  const cell = entry.cells?.[col] || entry;
  return {
    roll,
    rawText: cell.raw_text || cell.rawText || 'Fumble.',
    parsedEffects: cell.parsed_effects || {},
  };
}

// ============================================================
// FULL ATTACK (attack + auto-resolve critical + fumble)
// ============================================================

export function resolveFullAttack({ weaponTable, ob, db, armorType, attackRoll, critRoll }) {
  const attack = resolveAttack({ weaponTable, ob, db, armorType, roll: attackRoll });
  if (attack.error) return attack;

  let critical = null;
  if (attack.critical) {
    critical = resolveCritical(attack.critical, critRoll);
  }

  let fumbleResult = null;
  if (attack.fumble) {
    fumbleResult = resolveFumble(weaponTable, attack.fumbleRoll);
  }

  return {
    attack,
    critical,
    fumble: fumbleResult,
    totalHits: attack.hits + (critical?.hitsBonus || 0),
    summary: formatAttackSummary(attack, critical, fumbleResult),
  };
}

// ============================================================
// SUMMARY FORMATTER
// ============================================================

function formatAttackSummary(attack, critical, fumble) {
  if (fumble) return `FUMBLE! ${fumble.rawText}`;
  const parts = [`${attack.hits} hits`];
  if (critical) {
    parts.push(`+ Crit ${critical.severity} ${critical.type} (${critical.hitsBonus} bonus hits)`);
    parts.push(`→ ${critical.rawText}`);
  }
  return parts.join(' ');
}

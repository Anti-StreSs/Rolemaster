// Character state — holds all data for one character

import { getStatBonus, getBodyDev, getPowerPointsMult, getRankBonus, calcDevelopmentPoints } from './stats.js';
import { getBackgroundBonuses } from './background-effects.js';

// Development phases matching CPR093: adolescent → apprenti → level 1+
export const DEV_PHASES = ['adolescent', 'apprenti'];

/**
 * Create a new blank character.
 * Matches the original CPR093 data model.
 */
export function createCharacter() {
  return {
    version: 4,

    // --- Info tab ---
    name: '',
    raceIndex: -1,         // Index into monde.json races
    raceName: '',           // Display name
    height: '',
    weight: '',
    hair: '',
    eyes: '',
    age: '',
    sex: '',
    appearance: '',
    behavior: '',

    // Class & level
    classIndex: -1,
    level: 1,
    xp: '',

    // Realm (derived from class)
    realm: 'none',

    // Prime stats (derived from class, 0-based indices)
    primeStats: [],

    // Combat summary
    armorType: 1, // AT 1-20 (1=No Armor, 20=Full Plate + Full Helm)
    shieldType: 0, // 0=none, 1=buckler, 2=normal, 3=full, 4=wall
    defenseBonus: 0,
    dbItemBonus: 0, // Bonus BD from magical items (manual entry)

    // Weapon category priorities (CHOIXCAT screen)
    // Array of 6 weapon type IDs, index = priority slot (0=best cost, 5=worst)
    // null = not yet assigned
    weaponPriorities: [null, null, null, null, null, null],

    // --- Stats tab ---
    // 10 stats: Co, Ag, AD, Mé, Ra, Fo, Rp, Pr, Em, In
    stats: new Array(10).fill(0),        // Temporary values
    potentials: new Array(10).fill(0),    // Potential values
    raceBonuses: new Array(10).fill(0),   // Race bonuses (from monde.json)
    specialBonuses: new Array(10).fill(0),// Special bonuses

    // Raw rolls for stat potential recalculation (RM2 mechanism)
    // Array of 10: {tempRoll, potRoll} — stored so prime bonus can recalculate pot
    rawRolls: null,

    // Stat generation audit log — persists with saved character
    statLog: {
      method: 'rm2',        // 'rm2' or 'rmss'
      rerollCount: 0,       // Number of times "Retirer" was clicked
      rolls: [],            // History: [{timestamp, rollData, action}]
      validated: null,       // Final validated set: {timestamp, stats, potentials, assignments}
      editsAfterValidation: [], // Manual edits after validation: [{timestamp, statIndex, field, oldVal, newVal}]
    },

    // Body dev and XP factor from race
    raceBodyDevBonus: 0,
    raceExperienceFactor: 0,
    // Hit point rolls: one die roll per rank of Body Development
    bodyDevRolls: [],     // [7, 4, 8, ...] — persisted
    raceHitDie: '1-10',   // from race (e.g. "1-10", "1-8")
    raceMaxPC: 150,        // max racial HP

    // --- Languages tab ---
    languages: [],  // [{name, spoken, written}]

    // --- Spells tab ---
    // Learned spell lists: [{name, maxLevel, reference, type, realm}]
    spellLists: [],
    // Current spell study: one list at a time
    spellStudy: {
      listName: null,       // name of list being studied
      listType: null,       // 'base_own', 'open', 'closed', 'other'
      listRealm: null,      // realm name
      ranks: 0,             // accumulated ranks (each costs DP)
      sgrDone: false,       // SGR already attempted this phase?
      blockSize: 5,         // levels per block (5 or 10)
      nextBlockStart: 1,    // next block starts at this level
    },
    // Spell audit log: [{timestamp, action, listName, details}]
    spellLog: [],
    // Spell points spent per phase (separate pool, budget = DP total)
    // Legacy (kept for save compat) — spell points now share DP pool
    spellPointsSpentAdolescent: 0,
    spellPointsSpentApprenti: 0,
    spellPointsSpentLevel: 0,

    // Sub-skills chosen by the player for parent skills
    // Weapon: [{name, weaponType, weaponTypeId, cost: {first, second}}]
    weaponSkills: [],
    // Other parent sub-skills: [{parentIndex, name, cost: {first, second}}]
    subSkills: [],

    // --- History tab ---
    history: '',
    equipment: '',

    // --- Skills tab ---
    // Development phase: 'adolescent', 'apprenti', or 'level' (level 1+)
    devPhase: 'adolescent',
    // Phase validation state: false = development (can spend DP), true = validated (locked)
    phaseValidated: false,
    // Phase history: [{phase, dpTotal, dpSpent, skillRanks, spellInvestments, validatedAt}]
    phases: [],

    // Skill ranks per phase: { skillIndex: rankCount }
    // Adolescent and apprenti ranks accumulate into base ranks for level 1+
    skillRanksAdolescent: {},
    skillRanksApprenti: {},
    skillRanksLevel: {},       // Current level's new ranks

    // Accumulated ranks from all prior levels (for level 2+)
    skillRanksPrior: {},

    // DP tracking per phase
    devPointsSpentAdolescent: 0,
    devPointsSpentApprenti: 0,
    devPointsSpentLevel: 0,

    // Misc bonuses (manual adjustments)
    skillMiscBonuses: {},
    // Skill similarity bonuses (manual entry for now)
    skillSimilBonuses: {},
    // Skill formatting for print
    skillHighlights: {},  // {skillIndex: 'yellow'|'green'|...}
    skillBold: {},        // {skillIndex: true}
    skillTextColors: {},  // {skillIndex: 'red'|'blue'|'green'}
    // Print configuration
    printConfig: null,

    // Manual bonuses (items, background options, GM fiat)
    manualBonuses: {
      dbItem: 0,
      obItem: 0,
      ppBonus: 0,
      hpBonus: 0,
      rrEssence: 0,
      rrChanneling: 0,
      rrMentalism: 0,
      rrPoison: 0,
      rrDisease: 0,
      miscNotes: '',
    },

    // Background options (Character Law + Companions)
    backgroundOptions: {
      totalOptions: 0,
      options: [],
      companionIIITalents: [],
    },

    // Portrait (base64 data URL or external URL)
    portraitUrl: '',    // URL externe ou data:image/...;base64,...

    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get total accumulated ranks for a skill across all phases.
 */
export function getTotalRanks(character, skillIndex) {
  return (character.skillRanksAdolescent[skillIndex] || 0)
       + (character.skillRanksApprenti[skillIndex] || 0)
       + (character.skillRanksPrior[skillIndex] || 0)
       + (character.skillRanksLevel[skillIndex] || 0);
}

/**
 * Get ranks added in the current phase only.
 */
export function getCurrentPhaseRanks(character, skillIndex) {
  switch (character.devPhase) {
    case 'adolescent': return character.skillRanksAdolescent[skillIndex] || 0;
    case 'apprenti': return character.skillRanksApprenti[skillIndex] || 0;
    default: return character.skillRanksLevel[skillIndex] || 0;
  }
}

/**
 * Get the skill ranks object for the current phase.
 */
export function getCurrentPhaseRanksObj(character) {
  switch (character.devPhase) {
    case 'adolescent': return character.skillRanksAdolescent;
    case 'apprenti': return character.skillRanksApprenti;
    default: return character.skillRanksLevel;
  }
}

/**
 * Get DP spent in current phase.
 */
export function getDevPointsSpent(character) {
  switch (character.devPhase) {
    case 'adolescent': return character.devPointsSpentAdolescent;
    case 'apprenti': return character.devPointsSpentApprenti;
    default: return character.devPointsSpentLevel;
  }
}

/**
 * Set DP spent in current phase.
 */
export function setDevPointsSpent(character, value) {
  switch (character.devPhase) {
    case 'adolescent': character.devPointsSpentAdolescent = value; break;
    case 'apprenti': character.devPointsSpentApprenti = value; break;
    default: character.devPointsSpentLevel = value; break;
  }
}

/**
 * Get total development points available for current phase.
 * DP = sum of stat bonuses for Co, Ag, AD, Mé, Ra (indices 0-4).
 */
export function getDevPointsTotal(character) {
  return calcDevelopmentPoints(character.stats);
}

/**
 * Get spell points spent in current phase.
 * Spells share the SAME DP pool as skills — single budget.
 */
export function getSpellPointsSpent(character) {
  return getDevPointsSpent(character);
}

export function setSpellPointsSpent(character, value) {
  setDevPointsSpent(character, value);
}

/**
 * Get spell points budget (= DP total, same pool).
 */
export function getSpellPointsTotal(character) {
  return getDevPointsTotal(character);
}

/**
 * Get computed stat bonuses (normal bonuses) for all 10 stats.
 */
export function getStatBonuses(character) {
  return character.stats.map(v => getStatBonus(v));
}

/**
 * Get total bonus for a stat (normal + race + special).
 */
export function getTotalStatBonus(character, statIndex) {
  const normal = getStatBonus(character.stats[statIndex]);
  const race = character.raceBonuses[statIndex] || 0;
  const special = character.specialBonuses[statIndex] || 0;
  return normal + race + special;
}

/**
 * Get development value for a stat.
 * Indices 0-4 (Co, Ag, AD, Mé, Ra) → body dev table value (contributes to DP)
 * Realm stat → power points multiplier (shown as info)
 * Others → null
 */
export function getStatDev(character, statIndex) {
  // The 5 development stats (indices 0-4) all contribute to DP via bodyDev table
  if (statIndex >= 0 && statIndex <= 4) {
    return getBodyDev(character.stats[statIndex]);
  }
  // Show PP multiplier for realm stats
  const ppStats = character._ppStatIndices || [];
  if (ppStats.includes(statIndex)) {
    return getPowerPointsMult(character.stats[statIndex]);
  }
  return null;
}

/**
 * Calculate Hit Points (PdC / Concussion Hits) — RM2 formula.
 * Base = ceil(CO / 10) + sum of body dev die rolls
 * Cap = ceil(Base × (1 + totalCOBonus / 100))
 * @returns {{ base: number, cap: number, maxRacial: number, dieType: string }}
 */
export function calcHitPoints(character) {
  const co = character.stats[0];
  if (co <= 0) return { base: 0, cap: 0, maxRacial: character.raceMaxPC || 150, dieType: character.raceHitDie || '1-10' };

  const coBonus = getTotalStatBonus(character, 0);
  const baseFromCO = Math.ceil(co / 10);
  const rolls = character.bodyDevRolls || [];
  const rollsTotal = rolls.reduce((sum, r) => sum + r, 0);
  const bht = baseFromCO + rollsTotal;
  let cap = Math.ceil(bht * (1 + coBonus / 100));
  const maxRacial = character.raceMaxPC || 150;

  const bgBonuses = getBackgroundBonuses(character);
  if (bgBonuses.maxHpMultiplier !== 1) cap = Math.ceil(cap * bgBonuses.maxHpMultiplier);

  const hpBonus = character.manualBonuses?.hpBonus || 0;
  return {
    base: bht + hpBonus,
    cap: Math.min(cap + hpBonus, maxRacial),
    maxRacial,
    dieType: character.raceHitDie || '1-10',
  };
}

/**
 * Roll a hit die for a new rank of Body Development.
 * @returns {number} the roll result (added to character.bodyDevRolls)
 */
export function rollBodyDevHitDie(character) {
  const dieStr = character.raceHitDie || '1-10';
  const match = dieStr.match(/1-(\d+)/);
  const dieMax = match ? parseInt(match[1]) : 10;
  const roll = Math.floor(Math.random() * dieMax) + 1;
  if (!character.bodyDevRolls) character.bodyDevRolls = [];
  character.bodyDevRolls.push(roll);
  return roll;
}

/**
 * Get the global skill index for "Body Development" / "Développement Corporel".
 * This is a well-known skill in the Athletic category.
 */
let _bodyDevSkillIndex = -1;
export function getBodyDevSkillIndex() {
  if (_bodyDevSkillIndex >= 0) return _bodyDevSkillIndex;
  // Will be set by skills.js when data loads; fallback to level-based calc
  return _bodyDevSkillIndex;
}
export function setBodyDevSkillIndex(idx) {
  _bodyDevSkillIndex = idx;
}

/**
 * Calculate power points.
 * Single realm: PP = ppTable[realmStat] × level
 * Hybrid (2 realms): PP = ((ppTable[stat1] + ppTable[stat2]) / 2) × level
 * Verified: Sorcier niv.5, Em=101, In=101 → ((3.5+3.5)/2)×5 = 17.5 ✓
 */
export function calcPowerPoints(character) {
  if (character.realm === 'none') return 0;
  const ppStats = character._ppStatIndices;
  if (!ppStats || ppStats.length === 0) return 0;

  let mult = 0;
  for (const idx of ppStats) {
    mult += getPowerPointsMult(character.stats[idx] || 0);
  }
  mult /= ppStats.length; // Average for hybrids, identity for single realm
  const base = Math.ceil(mult * character.level); // Always round up
  const bgBonuses = getBackgroundBonuses(character);
  let pp = base;
  pp += bgBonuses.ppBonus;
  pp += bgBonuses.ppPerLevel * character.level;
  // spellAdder is NOT added to PP — it grants free-casting allowance (spells/day at no PP cost)
  if (bgBonuses.ppMultiplier !== 1) pp = Math.ceil(pp * bgBonuses.ppMultiplier);
  return pp + (character.manualBonuses?.ppBonus || 0);
}

/**
 * Apply race bonuses from monde.json race data to character.
 */
export function applyRace(character, race) {
  if (!race) {
    character.raceIndex = -1;
    character.raceName = '';
    character.raceBonuses = new Array(10).fill(0);
    character.raceBodyDevBonus = 0;
    character.raceExperienceFactor = 0;
    return;
  }
  character.raceName = race.name;
  character.raceBonuses = [...race.stat_bonuses];
  character.raceBodyDevBonus = race.body_dev_bonus || 0;
  character.raceExperienceFactor = race.experience_factor || 0;
  character.raceHitDie = race.hit_die || '1-10';
  character.raceMaxPC = race.max_pc || 150;
}

/**
 * Clone a character (deep copy).
 */
export function cloneCharacter(character) {
  return JSON.parse(JSON.stringify(character));
}

/**
 * Get the death threshold (negative HP at which the character dies).
 * RM2 rule: unconscious at 0 HP, dead at -CO temp.
 * @returns {number} negative value (e.g. CO=78 → -78)
 */
export function getDeathThreshold(character) {
  return -(character.stats[0] || 0);
}

/**
 * Armor Maneuver Penalties by AT (1-20) for moving skills.
 * Source: RM2 Character Law Table 15-8 / Arms Law armor chart.
 * These apply to Athletic, Gymnastic, and other movement-based skills.
 * Indexed 0-based: ARMOR_MANEUVER_PENALTIES[armorType - 1]
 */
export const ARMOR_MANEUVER_PENALTIES = [
//  AT1  AT2  AT3  AT4  AT5  AT6  AT7  AT8  AT9 AT10 AT11 AT12 AT13 AT14 AT15 AT16 AT17 AT18 AT19 AT20
      0,   0,   0,   0,  -5, -10, -15, -20,  -5, -10, -15, -20, -10, -15, -25, -30, -15, -25, -35, -50
];

// Shield types (RM2/Classic)
export const SHIELD_TYPES = [
  { id: 0, key: 'none',    fr: 'Sans',               en: 'None',          dbMelee: 0,  dbMissile: 0  },
  { id: 1, key: 'buckler', fr: 'Rondache (+10/+5)',   en: 'Buckler',       dbMelee: 10, dbMissile: 5  },
  { id: 2, key: 'normal',  fr: 'Bouclier (+20/+10)',  en: 'Normal Shield', dbMelee: 20, dbMissile: 10 },
  { id: 3, key: 'full',    fr: 'Grand (+25/+25)',     en: 'Full Shield',   dbMelee: 25, dbMissile: 25 },
  { id: 4, key: 'wall',    fr: 'Pavois (+30/+40)',    en: 'Wall Shield',   dbMelee: 30, dbMissile: 40 },
];

// Quickness penalties by armor type (RM2 table 07-05 simplified)
const ARMOR_QK_PENALTIES = [0, 0, 0, 0, 0, 0, 10, 15, 15, 0, 5, 15, 15, 5, 10, 20, 20, 10, 20, 30, 40];

/**
 * Calculate Defensive Bonus (DB).
 * DB = RP bonus (adjusted for armor penalty offset by strength) + shield/adrenal + items
 */
export function calculateDB(character) {
  const rpBonus = getTotalStatBonus(character, 6); // index 6 = Rapidité (Quickness)
  const strBonus = getTotalStatBonus(character, 5); // index 5 = Force (Strength)
  const armorPenalty = ARMOR_QK_PENALTIES[character.armorType] || 0;
  // Strength can offset armor penalty on quickness
  const effectivePenalty = Math.max(0, armorPenalty - Math.max(0, strBonus));
  const effectiveRP = Math.max(0, rpBonus - effectivePenalty);

  const shield = SHIELD_TYPES[character.shieldType || 0];

  // Adrenal Defense: only without armor (AT≤1), without shield, and only if positive
  let adrenalMelee = 0;
  let adrenalMissile = 0;
  if (character.armorType <= 1 && (character.shieldType || 0) === 0) {
    const adRanks = findAdrenalDefenseRanks(character);
    if (adRanks > 0) {
      const adBonus = getRankBonus(adRanks);
      if (adBonus > 0) {
        adrenalMelee = adBonus;
        adrenalMissile = Math.floor(adBonus / 2);
      }
    }
  }

  let itemBonus = (character.manualBonuses?.dbItem || 0) + (character.dbItemBonus || 0);
  const bgBonuses = getBackgroundBonuses(character);
  itemBonus += bgBonuses.dbBonus || 0;

  const dbMeleeNoShield = effectiveRP + adrenalMelee + itemBonus;
  const dbMeleeWithShield = effectiveRP + shield.dbMelee + itemBonus;
  const dbMissileNoShield = effectiveRP + adrenalMissile + itemBonus;
  const dbMissileWithShield = effectiveRP + shield.dbMissile + itemBonus;

  return {
    rpBonus: effectiveRP,
    shieldMelee: shield.dbMelee,
    shieldMissile: shield.dbMissile,
    adrenalMelee,
    adrenalMissile,
    itemBonus,
    meleeBD: character.shieldType > 0 ? dbMeleeWithShield : dbMeleeNoShield,
    missileBD: character.shieldType > 0 ? dbMissileWithShield : dbMissileNoShield,
    printDisplay: `${dbMeleeNoShield}(${dbMeleeWithShield})`,
  };
}

// Cache adrenal defense skill index (set from UI on first use)
let _adrenalDefenseIdx = -1;

export function setAdrenalDefenseIndex(idx) { _adrenalDefenseIdx = idx; }

function findAdrenalDefenseRanks(character) {
  if (_adrenalDefenseIdx >= 0) return getTotalRanks(character, _adrenalDefenseIdx);
  return 0;
}

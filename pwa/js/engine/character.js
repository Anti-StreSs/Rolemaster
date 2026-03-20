// Character state — holds all data for one character

import { getStatBonus, getBodyDev, getPowerPointsMult, getRankBonus, calcDevelopmentPoints } from './stats.js';

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
    armorType: 0,
    defenseBonus: 0,

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

    // --- Languages tab ---
    languages: [],  // [{name, spoken, written}]

    // --- Spells tab ---
    // Each spell list: {name, cost, palier, niveau, reference, realm}
    // cost = DP per tier point, palier = accumulated tier, niveau = spell levels gained
    spellLists: [],
    // Spell points spent per phase (separate pool, budget = DP total)
    spellPointsSpentAdolescent: 0,
    spellPointsSpentApprenti: 0,
    spellPointsSpentLevel: 0,

    // --- History tab ---
    history: '',
    equipment: '',

    // --- Skills tab ---
    // Development phase: 'adolescent', 'apprenti', or 'level' (level 1+)
    devPhase: 'adolescent',

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
 * Spell points are a SEPARATE pool from DP (same budget value).
 */
export function getSpellPointsSpent(character) {
  switch (character.devPhase) {
    case 'adolescent': return character.spellPointsSpentAdolescent || 0;
    case 'apprenti': return character.spellPointsSpentApprenti || 0;
    default: return character.spellPointsSpentLevel || 0;
  }
}

export function setSpellPointsSpent(character, value) {
  switch (character.devPhase) {
    case 'adolescent': character.spellPointsSpentAdolescent = value; break;
    case 'apprenti': character.spellPointsSpentApprenti = value; break;
    default: character.spellPointsSpentLevel = value; break;
  }
}

/**
 * Get spell points budget (= DP total, same value).
 */
export function getSpellPointsTotal(character) {
  return calcDevelopmentPoints(character.stats);
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
 * Constitution → body dev, realm stat → power points, others → null
 */
export function getStatDev(character, statIndex) {
  if (statIndex === 0) {
    return getBodyDev(character.stats[0]);
  }
  // Show PP multiplier for any stat used in PP calculation (single or hybrid)
  const ppStats = character._ppStatIndices || [];
  if (ppStats.includes(statIndex)) {
    return getPowerPointsMult(character.stats[statIndex]);
  }
  return null;
}

/**
 * Calculate total hit points from Body Development skill ranks.
 * HP = body_dev_table[CON] × ranks in Body Development
 */
export function calcHitPoints(character) {
  const devPerLevel = getBodyDev(character.stats[0]);
  const bodyDevRanks = getTotalRanks(character, getBodyDevSkillIndex());
  if (bodyDevRanks <= 0) return Math.floor(devPerLevel);
  return Math.floor(devPerLevel * bodyDevRanks);
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
  return mult * character.level;
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

// Character state — holds all data for one character

import { getStatBonus, getBodyDev, getPowerPointsMult } from './stats.js';

/**
 * Create a new blank character.
 * Matches the original CPR093 data model.
 */
export function createCharacter() {
  return {
    version: 3,

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

    // --- Stats tab ---
    // 10 stats: Co, Ag, AD, Mé, Ra, Fo, Rp, Pr, In, Em
    stats: new Array(10).fill(0),        // Temporary values
    potentials: new Array(10).fill(0),    // Potential values
    raceBonuses: new Array(10).fill(0),   // Race bonuses (from monde.json)
    specialBonuses: new Array(10).fill(0),// Special bonuses

    // Body dev and XP factor from race
    raceBodyDevBonus: 0,
    raceExperienceFactor: 0,

    // --- Languages tab ---
    languages: [],  // [{name, spoken, written}]

    // --- Spells tab ---
    spellLists: [],  // [{name, level, percent}]

    // --- History tab ---
    history: '',
    equipment: '',

    // --- Skills tab ---
    skillRanks: {},
    totalSkillRanks: {},
    categoryLevelBonuses: {},
    skillMiscBonuses: {},
    devPointsSpent: 0,

    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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
  const realmStatMap = { 'essence': 9, 'channeling': 8, 'mentalism': 7 };
  const realmStat = realmStatMap[character.realm];
  if (realmStat === statIndex) {
    return getPowerPointsMult(character.stats[statIndex]);
  }
  return null;
}

/**
 * Calculate total hit points.
 */
export function calcHitPoints(character) {
  const devPerLevel = getBodyDev(character.stats[0]);
  return Math.floor(devPerLevel * character.level);
}

/**
 * Calculate power points.
 */
export function calcPowerPoints(character) {
  if (character.realm === 'none') return 0;
  const realmStatMap = { 'essence': 9, 'channeling': 8, 'mentalism': 7 };
  const statIdx = realmStatMap[character.realm];
  if (statIdx === undefined) return 0;
  const mult = getPowerPointsMult(character.stats[statIdx]);
  return Math.floor(mult * character.level);
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
}

/**
 * Clone a character (deep copy).
 */
export function cloneCharacter(character) {
  return JSON.parse(JSON.stringify(character));
}

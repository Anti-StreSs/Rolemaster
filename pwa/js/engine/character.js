// Character state — holds all data for one character

import { getStatBonus, getBodyDev, getPowerPointsMult } from './stats.js';

/**
 * Create a new blank character.
 */
export function createCharacter() {
  return {
    version: 1,
    name: '',
    level: 1,
    // 10 stats (temp values), indexed 0-9
    stats: new Array(10).fill(0),
    // 10 stat potentials
    potentials: new Array(10).fill(0),
    // Class index
    classIndex: -1,
    // Realm (resolved from class): 'essence', 'channeling', 'mentalism', 'none'
    realm: 'none',
    // Prime stats (2 indices, 0-9)
    primeStats: [],
    // Weapon categories (array of category indices)
    weaponCategories: [],
    // Armor type (0-4)
    armorType: 0,
    // Skill ranks: { globalSkillIndex: ranksThisLevel }
    skillRanks: {},
    // Total skill ranks (across all levels): { globalSkillIndex: totalRanks }
    totalSkillRanks: {},
    // Spell lists chosen: array of { realmIndex, groupIndex, spellIndex }
    spellLists: [],
    // Development points spent this level
    devPointsSpent: 0,
    // Notes
    notes: '',
    // Timestamp
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get computed stat bonuses for all 10 stats.
 */
export function getStatBonuses(character) {
  return character.stats.map(v => getStatBonus(v));
}

/**
 * Calculate total hit points (body development).
 * HP = body_dev(Constitution) * level
 */
export function calcHitPoints(character) {
  const coStat = character.stats[0]; // Constitution is stat 0
  const devPerLevel = getBodyDev(coStat);
  return Math.floor(devPerLevel * character.level);
}

/**
 * Calculate power points (for spell users).
 * PP = power_point_mult(realm_stat) * level
 * Realm stat depends on realm: Essence=Empathy(9), Channeling=Intuition(8), Mentalism=Presence(7)
 */
export function calcPowerPoints(character) {
  if (character.realm === 'none') return 0;

  const realmStatMap = {
    'essence': 9,    // Empathy (index 9)
    'channeling': 8, // Intuition (index 8)
    'mentalism': 7,  // Presence (index 7)
  };

  const statIdx = realmStatMap[character.realm];
  if (statIdx === undefined) return 0;

  const statValue = character.stats[statIdx];
  const mult = getPowerPointsMult(statValue);
  return Math.floor(mult * character.level);
}

/**
 * Clone a character (deep copy).
 */
export function cloneCharacter(character) {
  return JSON.parse(JSON.stringify(character));
}

/**
 * Validate character completeness for a given step.
 */
export function isStepComplete(character, step) {
  switch (step) {
    case 0: return character.name.trim().length > 0;
    case 1: return character.stats.every(s => s > 0);
    case 2: return character.classIndex >= 0;
    case 3: return character.realm !== '' ;
    case 4: return character.primeStats.length === 2;
    case 5: return character.weaponCategories.length > 0;
    case 6: return true; // Armor can be 0 (none)
    case 7: return true; // Skills optional
    case 8: return true; // Spells optional
    case 9: return true; // Sheet view
    default: return false;
  }
}

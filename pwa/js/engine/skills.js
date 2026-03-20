// Skills engine — categories, skill costs, development

import { getData } from './data-loader.js';
import { getStatBonus, getRankBonus } from './stats.js';
import { setBodyDevSkillIndex } from './character.js';

/**
 * Get all skill categories with their skills.
 */
export function getAllCategories() {
  return getData().competences.categories;
}

/**
 * Get skill name in the specified language.
 */
export function getSkillName(skill, lang) {
  return lang === 'en' ? skill.name_en : skill.name_fr;
}

/**
 * Get the tertiary stat index for 3-stat skills.
 * Hidden in raw_params[3] (1-based), not exposed as a dedicated field.
 */
export function getTertiaryStat(skill) {
  if (skill.stat_count >= 3 && skill.raw_params && skill.raw_params.length > 3) {
    return skill.raw_params[3];
  }
  return 0;
}

/**
 * Get all stat indices for a skill (1-based).
 * Returns array of 1-3 stat indices.
 */
export function getSkillStatIndices(skill) {
  const stats = [];
  if (skill.primary_stat >= 1 && skill.primary_stat <= 10) stats.push(skill.primary_stat);
  if (skill.stat_count >= 2 && skill.secondary_stat >= 1 && skill.secondary_stat <= 10) stats.push(skill.secondary_stat);
  if (skill.stat_count >= 3) {
    const tert = getTertiaryStat(skill);
    if (tert >= 1 && tert <= 10) stats.push(tert);
  }
  return stats;
}

/**
 * Calculate the stat bonus for a skill based on character's stats.
 * Formula: floor(average of ALL stat bonuses) — works for 1, 2, or 3 stats.
 * When a stat appears twice (e.g. FO/FO/AG), it counts double in the average.
 */
export function calcSkillStatBonus(skill, statValues) {
  const statIndices = getSkillStatIndices(skill);
  if (statIndices.length === 0) return 0;
  if (statIndices.length === 1) return getStatBonus(statValues[statIndices[0] - 1]);

  let sum = 0;
  for (const idx of statIndices) {
    sum += getStatBonus(statValues[idx - 1]);
  }
  return Math.floor(sum / statIndices.length);
}

/**
 * Calculate total bonus for a skill.
 */
export function calcTotalSkillBonus(skill, statValues, ranks) {
  const statBonus = calcSkillStatBonus(skill, statValues);
  const rankBonus = getRankBonus(ranks);
  return statBonus + rankBonus;
}

// Mapping from classes.json index → couts.json index
// classes.json has 68 classes, couts.json has 65. 3 classes have no cost data.
const CLASS_TO_COUTS_MAP = [0,1,2,3,-1,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,64,22,23,24,25,26,27,28,29,30,31,-1,32,33,-1,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63];

/**
 * Get the couts.json index for a classes.json class index.
 */
export function getCoutsIndex(classIndex) {
  if (classIndex < 0 || classIndex >= CLASS_TO_COUTS_MAP.length) return -1;
  return CLASS_TO_COUTS_MAP[classIndex];
}

// Weapon Skill at global index 63 takes 12 cost values (6 priority slots × 2)
// instead of the normal 2, shifting all subsequent skill costs by +10.
const WEAPON_SKILL_INDEX = 63;
const WEAPON_COST_EXTRA = 10; // 12 values - 2 normal = 10 extra

/**
 * Get the cost array offset for a skill, accounting for the Weapon Skill
 * taking 12 values (6 weapon category priority slots × 2) instead of 2.
 */
function getCostOffset(skillGlobalIndex) {
  return skillGlobalIndex * 2 + (skillGlobalIndex > WEAPON_SKILL_INDEX ? WEAPON_COST_EXTRA : 0);
}

/**
 * Parse development cost for a skill.
 * Returns {first, second, maxRanks} or null if not developable.
 */
export function getSkillDevCost(classIndex, skillGlobalIndex) {
  const couts = getData().couts;
  const coutsIdx = getCoutsIndex(classIndex);
  if (coutsIdx < 0 || coutsIdx >= couts.classes.length) return null;

  const costs = couts.classes[coutsIdx].cost_values;
  const idx = getCostOffset(skillGlobalIndex);
  if (idx + 1 >= costs.length) return null;

  const first = costs[idx];
  const second = costs[idx + 1];
  if (first === 0 && second === 0) return null;

  // maxRanks per level: 2 if second cost exists, 1 if only first
  const maxRanks = second > 0 ? 2 : 1;
  return { first, second, maxRanks };
}

/**
 * Get weapon category priority costs for a class.
 * Returns array of 6 {first, second} pairs, one per priority slot.
 * The player assigns the 6 weapon types to these slots.
 */
export function getWeaponCategoryCosts(classIndex) {
  const couts = getData().couts;
  const coutsIdx = getCoutsIndex(classIndex);
  if (coutsIdx < 0 || coutsIdx >= couts.classes.length) return null;

  const costs = couts.classes[coutsIdx].cost_values;
  const basePos = WEAPON_SKILL_INDEX * 2; // Position 126
  const slots = [];
  for (let i = 0; i < 6; i++) {
    const pos = basePos + i * 2;
    if (pos + 1 >= costs.length) break;
    slots.push({ first: costs[pos], second: costs[pos + 1] });
  }
  return slots;
}

/**
 * Calculate how many DP it costs to buy N ranks in a skill this level.
 * 1st rank = cost.first, 2nd rank = cost.second. Max 2 per level.
 */
export function calcDevCostForRanks(cost, numRanks) {
  if (!cost || numRanks <= 0) return 0;
  let total = 0;
  if (numRanks >= 1) total += cost.first;
  if (numRanks >= 2 && cost.second > 0) total += cost.second;
  return total;
}

/**
 * Check if a skill is a parent/container (stat_count=0) that opens sub-skill selection.
 * These skills cannot receive ranks directly.
 */
export function isParentSkill(skill) {
  return skill.stat_count === 0;
}

// Global index of the "Weapon Skill" parent skill
export const WEAPON_SKILL_GLOBAL_INDEX = 63;

/**
 * Get weapon subcategories for a given weapon type (1-6).
 * Returns array of {name, weapons: string[]} from monde.json.
 */
export function getWeaponSubcategories(weaponTypeIndex) {
  const monde = getData().monde;
  if (!monde || !monde.weapon_categories) return [];
  return monde.weapon_categories.filter(wc => wc.type === weaponTypeIndex);
}

/**
 * Get the weapon priority cost for a weapon type based on character's weapon priorities.
 * @param {number} classIndex - class index
 * @param {string} weaponTypeId - weapon type ID (e.g. 'edged_1h')
 * @param {(string|null)[]} weaponPriorities - character.weaponPriorities array
 * @returns {{first: number, second: number}|null}
 */
export function getWeaponSkillCost(classIndex, weaponTypeId, weaponPriorities) {
  const slotIndex = weaponPriorities.indexOf(weaponTypeId);
  if (slotIndex < 0) return null;
  const wpnCosts = getWeaponCategoryCosts(classIndex);
  if (!wpnCosts || slotIndex >= wpnCosts.length) return null;
  return wpnCosts[slotIndex];
}

/**
 * Build a flat list of all skills with global indices.
 * Also registers the Body Development skill index.
 */
export function getAllSkillsFlat() {
  const categories = getAllCategories();
  const flat = [];
  let globalIndex = 0;
  for (const cat of categories) {
    for (const skill of cat.skills) {
      flat.push({ ...skill, globalIndex, categoryName: cat.name });
      // Detect Body Development skill
      if (skill.name_en === 'Body Development' || skill.name_fr === 'Développement Corporel') {
        setBodyDevSkillIndex(globalIndex);
      }
      globalIndex++;
    }
  }
  return flat;
}

/**
 * Find the global index of a skill by English name.
 */
export function findSkillIndex(nameEn) {
  const categories = getAllCategories();
  let globalIndex = 0;
  for (const cat of categories) {
    for (const skill of cat.skills) {
      if (skill.name_en === nameEn) return globalIndex;
      globalIndex++;
    }
  }
  return -1;
}

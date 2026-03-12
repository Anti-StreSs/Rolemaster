// Skills engine — categories, skill costs, development

import { getData } from './data-loader.js';
import { getStatBonus, getRankBonus } from './stats.js';

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
 * Calculate the stat bonus for a skill based on character's stats.
 * Skills have primary_stat and secondary_stat (1-indexed into the 10 stats).
 * @param {object} skill — skill data from competences.json
 * @param {number[]} statValues — array of 10 stat values (index 0 = stat 1)
 * @returns {number} combined stat bonus
 */
export function calcSkillStatBonus(skill, statValues) {
  const primary = skill.primary_stat;
  const secondary = skill.secondary_stat;

  let bonus = 0;
  if (primary >= 1 && primary <= 10) {
    bonus += getStatBonus(statValues[primary - 1]);
  }
  if (skill.stat_count >= 2 && secondary >= 1 && secondary <= 10) {
    bonus += getStatBonus(statValues[secondary - 1]);
  }
  // Average the bonuses if two stats
  if (skill.stat_count >= 2) {
    bonus = Math.floor(bonus / 2);
  }
  return bonus;
}

/**
 * Calculate total bonus for a skill.
 * totalBonus = statBonus + rankBonus + itemBonus + misc
 */
export function calcTotalSkillBonus(skill, statValues, ranks) {
  const statBonus = calcSkillStatBonus(skill, statValues);
  const rankBonus = getRankBonus(ranks);
  return statBonus + rankBonus;
}

/**
 * Parse development cost for a skill.
 * Cost values in couts.json are encoded as pairs:
 * [first_rank_cost, second_rank_cost] for each skill category.
 * A cost of 0 means "cannot develop this skill".
 *
 * The cost_values array maps to skills in order of categories.
 * Returns {first: number, second: number} or null if not developable.
 */
export function getSkillDevCost(classIndex, skillGlobalIndex) {
  const couts = getData().couts;
  if (classIndex < 0 || classIndex >= couts.classes.length) return null;

  const costs = couts.classes[classIndex].cost_values;
  // Each skill has 2 cost values (1st rank cost, 2nd rank cost per level)
  const idx = skillGlobalIndex * 2;
  if (idx + 1 >= costs.length) return null;

  const first = costs[idx];
  const second = costs[idx + 1];
  if (first === 0 && second === 0) return null; // Not developable

  return { first, second };
}

/**
 * Calculate how many dev points it costs to buy N ranks in a skill.
 * In RMSS: 1st rank costs `first`, 2nd rank costs `first + second`.
 * Max 2 ranks per level typically.
 */
export function calcDevCostForRanks(cost, numRanks) {
  if (!cost || numRanks <= 0) return 0;
  let total = 0;
  if (numRanks >= 1) total += cost.first;
  if (numRanks >= 2) total += cost.second;
  return total;
}

/**
 * Build a flat list of all skills with global indices.
 */
export function getAllSkillsFlat() {
  const categories = getAllCategories();
  const flat = [];
  let globalIndex = 0;
  for (const cat of categories) {
    for (const skill of cat.skills) {
      flat.push({ ...skill, globalIndex, categoryName: cat.name });
      globalIndex++;
    }
  }
  return flat;
}

/**
 * Get total development points for a character.
 * Base dev points in RMSS = 50 at level 1.
 * This is simplified — the actual formula may depend on class and stats.
 */
export function getBaseDevelopmentPoints() {
  return 50;
}

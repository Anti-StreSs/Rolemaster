// Stats engine — stat rolling, bonus calculation, power points

import { getData } from './data-loader.js';

// 10 stats indexed 1-10 in game data (0 unused)
export const STAT_COUNT = 10;

// Stat indices used in skill data (1-based)
export const STAT_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Roll a single stat using the stat_roll_table.
 * Each row in the table has 37 values for stat scores.
 * We pick a random column (0-36) to get a stat value.
 * @param {number} rollIndex — which roll (0-9), maps to table row
 * @returns {number} the stat value (25-101)
 */
export function rollStat(rollIndex) {
  const table = getData().carac_tables.stat_roll_table;
  // Use a wrapping approach: pick from higher rows first for better stats
  const row = table[rollIndex] || table[0];
  const col = Math.floor(Math.random() * row.length);
  // Skip 0 values (not achievable for that roll)
  let value = row[col];
  if (value === 0) {
    // Find the first non-zero value in this row
    for (let i = col; i < row.length; i++) {
      if (row[i] > 0) { value = row[i]; break; }
    }
    if (value === 0) {
      // Search backward
      for (let i = col; i >= 0; i--) {
        if (row[i] > 0) { value = row[i]; break; }
      }
    }
  }
  return value;
}

/**
 * Roll all 10 stats. Returns array of 10 values sorted descending.
 * Player then assigns them to stats of their choice.
 */
export function rollAllStats() {
  const rolls = [];
  for (let i = 0; i < STAT_COUNT; i++) {
    rolls.push(rollStat(i));
  }
  return rolls.sort((a, b) => b - a);
}

/**
 * Build the flat bonus table by concatenating all segments.
 * Index 0 is unused; index N gives the bonus for stat value N.
 */
function buildBonusTable() {
  const segments = getData().carac_tables.stat_bonus_table;
  const flat = [];
  for (const seg of segments) {
    flat.push(...seg);
  }
  return flat;
}

let _bonusTable = null;
function getBonusTable() {
  if (!_bonusTable) _bonusTable = buildBonusTable();
  return _bonusTable;
}

/**
 * Get the stat bonus for a given stat value.
 * @param {number} statValue — the temporary stat (1-102+)
 * @returns {number} bonus (can be negative)
 */
export function getStatBonus(statValue) {
  const table = getBonusTable();
  if (statValue <= 0) return table[1] || -25;
  if (statValue >= table.length) return table[table.length - 1];
  return table[statValue];
}

/**
 * Build flat power points table.
 */
function buildPowerPointsTable() {
  const segments = getData().carac_tables.power_points_table;
  const flat = [];
  for (const seg of segments) {
    flat.push(...seg);
  }
  return flat;
}

let _ppTable = null;
function getPPTable() {
  if (!_ppTable) _ppTable = buildPowerPointsTable();
  return _ppTable;
}

/**
 * Get power points multiplier for a given stat value.
 */
export function getPowerPointsMult(statValue) {
  const table = getPPTable();
  if (statValue <= 0) return 0;
  if (statValue >= table.length) return table[table.length - 1];
  return table[statValue];
}

/**
 * Build flat body development table.
 */
function buildBodyDevTable() {
  const segments = getData().carac_tables.body_development;
  const flat = [];
  for (const seg of segments) {
    flat.push(...seg);
  }
  return flat;
}

let _bodyDevTable = null;
function getBodyDevTable() {
  if (!_bodyDevTable) _bodyDevTable = buildBodyDevTable();
  return _bodyDevTable;
}

/**
 * Get body development hit points per level for a stat value.
 */
export function getBodyDev(statValue) {
  const table = getBodyDevTable();
  if (statValue <= 0) return 0;
  if (statValue >= table.length) return table[table.length - 1];
  return table[statValue];
}

/**
 * Calculate rank bonus for a number of skill ranks.
 * Rolemaster RMSS standard progression:
 * Ranks 1-10: +5 each (ranks 1=5, 2=10, ..., 10=50... wait no)
 * Actually the standard RM rank bonus:
 *   Rank 1: +5, 2: +5, 3: +5 (first 3 = +5 each)
 *   Ranks 4-10: +2 each
 *   Ranks 11-20: +1 each
 *   Ranks 21-30: +0.5 each
 *   Ranks 31+: +0 (no more bonus)
 */
export function getRankBonus(ranks) {
  if (ranks <= 0) return -25;
  let bonus = 0;
  const r = Math.floor(ranks);
  // Ranks 1-3: +5 each
  bonus += Math.min(r, 3) * 5;
  // Ranks 4-10: +2 each
  if (r > 3) bonus += Math.min(r - 3, 7) * 2;
  // Ranks 11-20: +1 each
  if (r > 10) bonus += Math.min(r - 10, 10) * 1;
  // Ranks 21-30: +0.5 each
  if (r > 20) bonus += Math.min(r - 20, 10) * 0.5;
  return bonus;
}

/**
 * Reset cached tables (call if data reloads).
 */
export function resetStatCaches() {
  _bonusTable = null;
  _ppTable = null;
  _bodyDevTable = null;
}

// Stats engine — stat rolling, bonus calculation, power points

import { getData } from './data-loader.js';

// 10 stats indexed 1-10 in game data (0 unused)
export const STAT_COUNT = 10;

/**
 * Roll a single stat using the stat_roll_table.
 * Each row has 38 values representing possible stat scores.
 * @param {number} rollIndex — which roll tier (0-9)
 * @returns {number} the stat value (25-101)
 */
export function rollStat(rollIndex) {
  const table = getData().carac_tables.stat_roll_table;
  const row = table[rollIndex] || table[0];
  const col = Math.floor(Math.random() * row.length);
  let value = row[col];
  if (value === 0) {
    // Find nearest non-zero value
    for (let i = col; i < row.length; i++) {
      if (row[i] > 0) { value = row[i]; break; }
    }
    if (value === 0) {
      for (let i = col; i >= 0; i--) {
        if (row[i] > 0) { value = row[i]; break; }
      }
    }
  }
  return value;
}

/**
 * Roll one set of 10 stat values (one per tier row).
 * Returns array of 10 values sorted descending.
 */
export function rollOneSet() {
  const rolls = [];
  for (let i = 0; i < STAT_COUNT; i++) {
    rolls.push(rollStat(i));
  }
  return rolls.sort((a, b) => b - a);
}

/**
 * Roll 3 sets of 10 stats (default RMSS method: Option 14).
 * "Lancer 3 tirages de 10. assigner 2 tirages à temp/pot"
 * Player picks 2 of 3 sets: one for Temp values, one for Pot values.
 * @returns {number[][]} array of 3 sets, each containing 10 sorted values
 */
export function rollThreeSets() {
  return [rollOneSet(), rollOneSet(), rollOneSet()];
}

/**
 * Apply prime stat "bump to 90" rule.
 * In RMSS, if a prime stat's temp or pot value is below 90,
 * it gets bumped to 90.
 * @param {number[]} stats — 10 temp or pot values
 * @param {number[]} primeIndices — 0-based indices of prime stats
 * @returns {number[]} adjusted stats
 */
export function applyPrimeStatBump(stats, primeIndices) {
  const result = [...stats];
  for (const idx of primeIndices) {
    if (idx >= 0 && idx < result.length && result[idx] < 90) {
      result[idx] = 90;
    }
  }
  return result;
}

// --- Bonus tables ---

function buildFlatTable(segments) {
  const flat = [];
  for (const seg of segments) flat.push(...seg);
  return flat;
}

let _bonusTable = null;
function getBonusTable() {
  if (!_bonusTable) _bonusTable = buildFlatTable(getData().carac_tables.stat_bonus_table);
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

let _ppTable = null;
function getPPTable() {
  if (!_ppTable) _ppTable = buildFlatTable(getData().carac_tables.power_points_table);
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

let _bodyDevTable = null;
function getBodyDevTable() {
  if (!_bodyDevTable) _bodyDevTable = buildFlatTable(getData().carac_tables.body_development);
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
 * RMSS standard: 1-3: +5 each, 4-10: +2 each, 11-20: +1 each, 21-30: +0.5 each
 */
export function getRankBonus(ranks) {
  if (ranks <= 0) return -25;
  let bonus = 0;
  const r = Math.floor(ranks);
  bonus += Math.min(r, 3) * 5;
  if (r > 3) bonus += Math.min(r - 3, 7) * 2;
  if (r > 10) bonus += Math.min(r - 10, 10) * 1;
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

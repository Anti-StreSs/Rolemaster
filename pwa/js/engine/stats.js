// Stats engine — stat rolling, bonus calculation, development points, power points

import { getData } from './data-loader.js';
export { generateStatRolls, getStatValues, statPotentialLookup, generateStatRollsHybrid, generateStatRollsAntiLose, getStatValuesHybrid } from './stat_potentials.js';

// 10 stats indexed 0-9
export const STAT_COUNT = 10;

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
 * Get body development / dev points value for a stat temp.
 * This table serves dual purpose in RM2:
 * - Body Development HP per rank (indexed by Constitution)
 * - Development points contribution per stat (indexed by any dev stat)
 */
export function getBodyDev(statValue) {
  const table = getBodyDevTable();
  if (statValue <= 0) return 0;
  if (statValue >= table.length) return table[table.length - 1];
  return table[statValue];
}

// RM Classic Skill Rank Bonus table 07-01 (verified: DM0=-25, DM1=+5, DM2=+10)
// Ranks 1-10: +5/rank, 11-20: +2/rank, 21-30: +1/rank, 30+: +1/rank
const RANK_BONUS_TABLE = [
  -25,                                          // rank 0
   5, 10, 15, 20, 25, 30, 35, 40, 45, 50,     // ranks 1-10
  52, 54, 56, 58, 60,                           // ranks 11-15
  62, 64, 66, 68, 70,                           // ranks 16-20
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80,     // ranks 21-30
];

/**
 * Calculate rank bonus for a number of skill ranks.
 * RM Classic table 07-01. For rank > 30: extrapolate +1/rank.
 */
export function getRankBonus(ranks) {
  const r = Math.floor(ranks);
  if (r < 0) return -25;
  if (r < RANK_BONUS_TABLE.length) return RANK_BONUS_TABLE[r];
  return 80 + (r - 30); // Extrapolate
}

/**
 * Calculate development points from stats.
 * RM2 formula (verified against CPR093): DP = floor(Σ devTable[stat_i]) + 4
 * Only the 5 development stats contribute: Co, Ag, AD, Mé, Ra (indices 0-4).
 * @param {number[]} stats — array of 10 stat temporary values
 * @returns {number} development points for this level
 */
export function calcDevelopmentPoints(stats) {
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += getBodyDev(stats[i] || 0);
  }
  return Math.max(Math.floor(sum) + 4, 0);
}

// --- RMSS Option 14 rolling ---

/**
 * Roll a single stat using the stat_roll_table (RMSS method).
 * Each row has 38 values — zeros are empty slots.
 * @param {number} rollIndex — which roll tier (0-9)
 * @returns {number} the stat value (25-101)
 */
export function rollStat(rollIndex) {
  const table = getData().carac_tables.stat_roll_table;
  const row = table[rollIndex] || table[0];
  const valid = row.filter(v => v > 0);
  if (valid.length === 0) return 50;
  return valid[Math.floor(Math.random() * valid.length)];
}

/**
 * Roll one set of 10 stat values (one per tier row).
 * Returns array of 10 values sorted descending.
 */
function rollOneSet() {
  const rolls = [];
  for (let i = 0; i < STAT_COUNT; i++) {
    rolls.push(rollStat(i));
  }
  return rolls.sort((a, b) => b - a);
}

/**
 * RMSS Option 14: Roll 2 sets of 10, pair weaker→temp / stronger→pot.
 * Returns array of 10 {temp, pot} pairs, sorted by pot descending.
 * Also includes raw set data for audit logging.
 * @returns {{pairs: {temp: number, pot: number}[], setA: number[], setB: number[]}}
 */
export function rollStatPairsRMSS() {
  const setA = rollOneSet();
  const setB = rollOneSet();
  const sumA = setA.reduce((s, v) => s + v, 0);
  const sumB = setB.reduce((s, v) => s + v, 0);
  const tempSet = sumA <= sumB ? setA : setB;
  const potSet = sumA <= sumB ? setB : setA;

  const pairs = [];
  for (let i = 0; i < STAT_COUNT; i++) {
    const t = Math.min(tempSet[i], potSet[i]);
    const p = Math.max(tempSet[i], potSet[i]);
    pairs.push({ temp: t, pot: p });
  }
  pairs.sort((x, y) => y.pot - x.pot);
  return { pairs, setA, setB };
}

/**
 * Reset cached tables (call if data reloads).
 */
export function resetStatCaches() {
  _bonusTable = null;
  _ppTable = null;
  _bodyDevTable = null;
}

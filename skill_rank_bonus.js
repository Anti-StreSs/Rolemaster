/**
 * skill_rank_bonus.js — Skill Rank Bonus Table (RM Classic Table 07-01)
 * 
 * Source: rolemaster-classic-character-law-tables.json, table 07-01
 * Verified against CPR093: ranks 0 (-25), 1 (+5), 2 (+10) ✅
 * Ranks 6+ may differ between RM2 and RM Classic — to be verified with CPR093.
 * 
 * Pattern:
 * - Ranks 0-5: -25, +5 per rank (+5 increment)
 * - Ranks 6-10: +30 to +50 (+5 per rank)
 * - Ranks 11-20: +52 to +70 (+2 per rank)
 * - Ranks 21-30: +71 to +80 (+1 per rank)
 */

const RANK_BONUS_TABLE = [
  -25,  // 0
   5,   // 1
  10,   // 2
  15,   // 3
  20,   // 4
  25,   // 5
  30,   // 6
  35,   // 7
  40,   // 8
  45,   // 9
  50,   // 10
  52,   // 11
  54,   // 12
  56,   // 13
  58,   // 14
  60,   // 15
  62,   // 16
  64,   // 17
  66,   // 18
  68,   // 19
  70,   // 20
  71,   // 21
  72,   // 22
  73,   // 23
  74,   // 24
  75,   // 25
  76,   // 26
  77,   // 27
  78,   // 28
  79,   // 29
  80,   // 30
];

/**
 * Get the skill rank bonus for a given number of ranks.
 * @param {number} ranks - Number of ranks (0+)
 * @returns {number} The bonus value
 */
function getRankBonus(ranks) {
  if (ranks < 0) return -25;
  if (ranks < RANK_BONUS_TABLE.length) return RANK_BONUS_TABLE[ranks];
  // Beyond rank 30: extrapolate +1 per rank
  return 80 + (ranks - 30);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RANK_BONUS_TABLE, getRankBonus };
}

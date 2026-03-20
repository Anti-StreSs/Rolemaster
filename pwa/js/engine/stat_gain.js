// Stat Gain Table 05-02 (RM2 Classic)
// Used when leveling up to determine stat improvements.
// Input: D100 roll + difference (pot - temp)
// Output: gain to add to temp (capped at pot)

// Diff columns: 0, 1, 2, 3, 4-5, 6-7, 8-9, 10-11, 12-14, 15+
const DIFF_BOUNDARIES = [0, 1, 2, 3, 5, 7, 9, 11, 14, Infinity];

function getDiffColumn(diff) {
  for (let i = 0; i < DIFF_BOUNDARIES.length; i++) {
    if (diff <= DIFF_BOUNDARIES[i]) return i;
  }
  return DIFF_BOUNDARIES.length - 1;
}

// [rollMin, rollMax, [gain per diff column]]
// '*' = special open-ended roll (reroll and add)
const STAT_GAIN_ROWS = [
  [1,   4,  ['*','*','*','*','*','*','*','*','*','*']],
  [5,  10,  [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]],
  [11, 15,  [0, 0, 0, 0, 0, 1, 1, 1, 2, 2]],
  [16, 20,  [0, 0, 0, 0, 0, 1, 1, 2, 3, 3]],
  [21, 25,  [0, 0, 0, 1, 1, 2, 2, 4, 4, 4]],
  [26, 30,  [0, 0, 1, 1, 1, 2, 2, 3, 5, 5]],
  [31, 35,  [0, 0, 1, 1, 1, 2, 3, 4, 5, 6]],
  [36, 40,  [0, 0, 1, 1, 1, 2, 3, 3, 4, 7]],
  [41, 45,  [0, 0, 1, 1, 2, 3, 3, 4, 6, 8]],
  [46, 50,  [0, 0, 1, 1, 2, 3, 3, 5, 7, 9]],
  [51, 55,  [0, 1, 1, 2, 2, 3, 4, 7, 7, 10]],
  [56, 60,  [0, 1, 1, 2, 2, 4, 4, 6, 8, 11]],
  [61, 65,  [0, 1, 1, 2, 3, 4, 4, 6, 8, 11]],
  [66, 70,  [0, 1, 2, 2, 3, 5, 5, 7, 9, 12]],
  [71, 75,  [0, 1, 2, 2, 3, 5, 5, 7, 9, 12]],
  [76, 80,  [0, 1, 2, 3, 3, 5, 6, 8, 10, 13]],
  [81, 85,  [0, 1, 2, 3, 4, 6, 6, 8, 10, 13]],
  [86, 90,  [0, 1, 2, 3, 4, 6, 7, 9, 11, 14]],
  [91, 95,  [0, 1, 2, 3, 4, 6, 7, 9, 11, 14]],
  [96, 99,  [0, 1, 2, 3, 4, 6, 8, 10, 12, 15]],
  [100,100, [0, 1, 2, 3, 4, 6, 8, 10, 12, 15]],
];

/**
 * Look up stat gain from the table.
 * @param {number} roll - D100 roll (1-100)
 * @param {number} diff - pot - temp (0+)
 * @returns {number|'*'} gain value, or '*' for open-ended reroll
 */
export function statGainLookup(roll, diff) {
  const col = getDiffColumn(Math.max(0, diff));
  for (const row of STAT_GAIN_ROWS) {
    if (roll >= row[0] && roll <= row[1]) {
      return row[2][col];
    }
  }
  return 0;
}

/**
 * Roll stat gain for one stat during level-up.
 * Handles the '*' open-ended case (reroll and add).
 * @param {number} temp - current temporary value
 * @param {number} pot - potential value
 * @returns {{roll: number, diff: number, gain: number, openEnded: boolean, newTemp: number}}
 */
export function rollStatGain(temp, pot) {
  const diff = pot - temp;
  if (diff <= 0) return { roll: 0, diff: 0, gain: 0, openEnded: false, newTemp: temp };

  let roll = Math.floor(Math.random() * 100) + 1;
  let result = statGainLookup(roll, diff);
  let openEnded = false;

  // Handle '*' open-ended: reroll and add (recursive, but typically only 1-2 extra rolls)
  if (result === '*') {
    openEnded = true;
    let total = roll;
    let extra = Math.floor(Math.random() * 100) + 1;
    total += extra;
    // For open-ended, gain = 1 + extra bonus based on total
    // RM2 rule: open-ended means the stat goes up by at least 1, potentially more
    result = Math.min(Math.ceil(total / 50), diff); // Simplified: ~1-4 gain
  }

  const gain = typeof result === 'number' ? result : 1;
  const newTemp = Math.min(temp + gain, pot);
  return { roll, diff, gain, openEnded, newTemp };
}

/**
 * Process stat gains for all 10 stats during level-up.
 * @param {number[]} stats - current temp values (10)
 * @param {number[]} potentials - potential values (10)
 * @returns {{statIndex: number, roll: number, diff: number, gain: number, openEnded: boolean, oldTemp: number, newTemp: number}[]}
 */
export function processLevelUpStatGains(stats, potentials) {
  const results = [];
  for (let i = 0; i < 10; i++) {
    const temp = stats[i] || 0;
    const pot = potentials[i] || temp;
    const gain = rollStatGain(temp, pot);
    results.push({
      statIndex: i,
      roll: gain.roll,
      diff: gain.diff,
      gain: gain.gain,
      openEnded: gain.openEnded,
      oldTemp: temp,
      newTemp: gain.newTemp,
    });
  }
  return results;
}

// Stat Potentials Table (RM2 Character Law Table 15.1.1 / 05-01)
// Verified against CPR093.exe screenshots (7/7 cases match perfectly).
//
// Algorithm:
// 1. For each of the 10 stats, roll temp_roll (1-100) and pot_roll (1-100)
// 2. temp = temp_roll
// 3. pot = statPotentialLookup(pot_roll, temp)
// 4. For prime stats: new_temp = max(temp_roll, 90), pot recalculated from raw pot_roll
//
// CPR093 stores RAW rolls internally. When assigned to a prime stat,
// pot is recalculated using the boosted temp — this can produce a LOWER pot.

const COLUMNS = [
  [1, 24],    // 0: Under 25
  [25, 39],   // 1: 25-39
  [40, 59],   // 2: 40-59
  [60, 74],   // 3: 60-74
  [75, 84],   // 4: 75-84
  [85, 89],   // 5: 85-89
  [90, 94],   // 6: 90-94
  [95, 97],   // 7: 95-97
  [98, 99],   // 8: 98-99
  [100, 100]  // 9: 100
];

// Each row: [roll_min, roll_max, [values per column]]
// null = potential equals the temp stat itself
const ROWS = [
  [1,  10,  [25,   null, null, null, null, null, null, null, null, null]],
  [11, 20,  [30,   null, null, null, null, null, null, null, null, null]],
  [21, 30,  [35,   39,   null, null, null, null, null, null, null, null]],
  [31, 35,  [38,   42,   59,   null, null, null, null, null, null, null]],
  [36, 40,  [40,   45,   62,   null, null, null, null, null, null, null]],
  [41, 45,  [42,   47,   64,   null, null, null, null, null, null, null]],
  [46, 49,  [44,   49,   66,   null, null, null, null, null, null, null]],
  [50, 51,  [46,   51,   68,   null, null, null, null, null, null, null]],
  [52, 53,  [48,   53,   70,   null, null, null, null, null, null, null]],
  [54, 55,  [50,   55,   71,   null, null, null, null, null, null, null]],
  [56, 57,  [52,   57,   72,   74,   84,   null, null, null, null, null]],
  [58, 59,  [54,   59,   73,   75,   85,   null, null, null, null, null]],
  [60, 61,  [56,   61,   74,   76,   86,   null, null, null, null, null]],
  [62, 63,  [58,   63,   75,   77,   87,   null, null, null, null, null]],
  [64, 65,  [60,   65,   76,   78,   88,   null, null, null, null, null]],
  [66, 67,  [62,   67,   77,   79,   88,   89,   null, null, null, null]],
  [68, 69,  [64,   69,   78,   80,   89,   89,   null, null, null, null]],
  [70, 71,  [66,   71,   79,   81,   89,   90,   null, null, null, null]],
  [72, 73,  [68,   73,   80,   82,   90,   90,   null, null, null, null]],
  [74, 75,  [70,   75,   81,   83,   90,   91,   null, null, null, null]],
  [76, 77,  [72,   77,   82,   84,   91,   91,   null, null, null, null]],
  [78, 79,  [74,   79,   83,   85,   91,   92,   null, null, null, null]],
  [80, 81,  [76,   81,   84,   86,   92,   92,   null, null, null, null]],
  [82, 83,  [78,   83,   85,   87,   92,   93,   null, null, null, null]],
  [84, 85,  [80,   85,   86,   88,   93,   93,   94,   null, null, null]],
  [86, 87,  [82,   86,   87,   89,   93,   94,   94,   null, null, null]],
  [88, 89,  [84,   87,   88,   90,   94,   94,   95,   null, null, null]],
  [90, 90,  [86,   88,   89,   91,   94,   95,   95,   97,   null, null]],
  [91, 91,  [88,   89,   90,   92,   95,   95,   96,   97,   null, null]],
  [92, 92,  [90,   90,   91,   93,   95,   96,   96,   97,   null, null]],
  [93, 93,  [91,   91,   92,   94,   96,   96,   97,   98,   null, null]],
  [94, 94,  [92,   92,   93,   95,   96,   97,   97,   98,   99,   null]],
  [95, 95,  [93,   93,   94,   96,   97,   97,   98,   98,   99,   null]],
  [96, 96,  [94,   94,   95,   97,   97,   98,   98,   99,   99,   null]],
  [97, 97,  [95,   95,   96,   97,   98,   98,   99,   99,   99,   null]],
  [98, 98,  [96,   96,   97,   98,   98,   99,   99,   99,   100,  null]],
  [99, 99,  [97,   97,   98,   98,   99,   99,   100,  100,  100,  null]],
  [100,100, [98,   98,   99,   99,   99,   100,  100,  100,  100,  101]]
];

function getColumnIndex(temp) {
  for (let i = 0; i < COLUMNS.length; i++) {
    if (temp >= COLUMNS[i][0] && temp <= COLUMNS[i][1]) return i;
  }
  if (temp > 100) return 9;
  return 0;
}

/**
 * Look up stat potential from the table.
 * @param {number} potRoll - raw d100 roll (1-100)
 * @param {number} temp - temporary stat value
 * @returns {number} the potential value
 */
export function statPotentialLookup(potRoll, temp) {
  const colIdx = getColumnIndex(temp);
  for (const row of ROWS) {
    if (potRoll >= row[0] && potRoll <= row[1]) {
      const val = row[2][colIdx];
      return val === null ? temp : val;
    }
  }
  return temp;
}

/**
 * Generate 10 stat rolls (2×d100 each).
 * @returns {Array<{tempRoll: number, potRoll: number, temp: number, pot: number}>}
 */
export function generateStatRolls() {
  const rolls = [];
  for (let i = 0; i < 10; i++) {
    const tempRoll = Math.floor(Math.random() * 100) + 1;
    const potRoll = Math.floor(Math.random() * 100) + 1;
    const temp = tempRoll;
    const pot = statPotentialLookup(potRoll, temp);
    rolls.push({ tempRoll, potRoll, temp, pot });
  }
  return rolls;
}

/**
 * Hybrid method: RM2 Table 15.1.1 with +5 bonus on pot rolls.
 * Rule: if no resulting pot exceeds 91, the first pair gets pot forced to 100.
 * @returns {Array<{tempRoll: number, potRoll: number, potRollBoosted: number, temp: number, pot: number, forced100: boolean}>}
 */
export function generateStatRollsHybrid() {
  const rolls = [];
  for (let i = 0; i < 10; i++) {
    const tempRoll = Math.floor(Math.random() * 100) + 1;
    const potRoll = Math.floor(Math.random() * 100) + 1;
    const potRollBoosted = Math.min(potRoll + 5, 100);
    const temp = tempRoll;
    const pot = statPotentialLookup(potRollBoosted, temp);
    rolls.push({ tempRoll, potRoll, potRollBoosted, temp, pot, forced100: false });
  }
  // Safety net: if no pot > 91, force first pair's pot to 100
  const hasHigh = rolls.some(r => r.pot > 91);
  if (!hasHigh) {
    rolls[0].pot = 100;
    rolls[0].forced100 = true;
  }
  return rolls;
}

/**
 * Anti-Lose method: RM2 Table 15.1.1 with +10 bonus on pot rolls.
 * The weakest pot is always replaced by 100.
 * @returns {Array<{tempRoll: number, potRoll: number, potRollBoosted: number, temp: number, pot: number, forced100: boolean}>}
 */
export function generateStatRollsAntiLose() {
  const rolls = [];
  for (let i = 0; i < 10; i++) {
    const tempRoll = Math.floor(Math.random() * 100) + 1;
    const potRoll = Math.floor(Math.random() * 100) + 1;
    const potRollBoosted = Math.min(potRoll + 10, 100);
    const temp = tempRoll;
    const pot = statPotentialLookup(potRollBoosted, temp);
    rolls.push({ tempRoll, potRoll, potRollBoosted, temp, pot, forced100: false });
  }
  // Always force the weakest pot to 100
  let minIdx = 0;
  for (let i = 1; i < rolls.length; i++) {
    if (rolls[i].pot < rolls[minIdx].pot) minIdx = i;
  }
  rolls[minIdx].pot = 100;
  rolls[minIdx].forced100 = true;
  return rolls;
}

/**
 * Get displayed values for a hybrid/anti-lose roll, applying prime bonus if needed.
 * Prime stats: temp boosted to max(roll, 90), pot recalculated from boosted potRoll.
 * If the roll was forced to 100, prime recalc won't lower it below 100.
 */
export function getStatValuesHybrid(roll, isPrime) {
  if (isPrime) {
    const newTemp = Math.max(roll.tempRoll, 90);
    const newPot = statPotentialLookup(roll.potRollBoosted, newTemp);
    const basePot = roll.forced100 ? 100 : Math.max(newPot, newTemp);
    return { temp: newTemp, pot: Math.max(basePot, newTemp) };
  }
  return {
    temp: roll.tempRoll,
    pot: roll.forced100 ? 100 : statPotentialLookup(roll.potRollBoosted, roll.tempRoll)
  };
}

/**
 * Get displayed values for a roll, applying prime bonus if needed.
 * Prime stats get temp boosted to at least 90, pot recalculated from raw potRoll.
 * @param {{tempRoll: number, potRoll: number}} roll
 * @param {boolean} isPrime
 * @returns {{temp: number, pot: number}}
 */
export function getStatValues(roll, isPrime) {
  if (isPrime) {
    const newTemp = Math.max(roll.tempRoll, 90);
    const newPot = statPotentialLookup(roll.potRoll, newTemp);
    return { temp: newTemp, pot: Math.max(newPot, newTemp) };
  }
  return {
    temp: roll.tempRoll,
    pot: statPotentialLookup(roll.potRoll, roll.tempRoll)
  };
}

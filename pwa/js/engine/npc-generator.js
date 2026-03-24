// npc-generator.js — Quick NPC generation for GMs
// Creates a playable NPC in one call using the existing engine

import { createCharacter, calcHitPoints, calcPowerPoints, applyRace,
         getDevPointsTotal, getTotalRanks, getBodyDevSkillIndex } from './character.js';
import { generateStatRolls, getStatValues } from './stats.js';
import { getAllClasses, getRealmInfo,
         getClassPrimeStats, getPPStatIndices } from './classes.js';
import { getSkillDevCost, getAllSkillsFlat } from './skills.js';
import { generateBackground } from './background.js';
import { saveCharacter } from './db.js';
import { getData } from './data-loader.js';

// NPC strategy: which skills to auto-invest in (by name_fr fragments)
// These are common skills that make sense for any NPC.
const COMMON_SKILL_KEYWORDS = [
  'Développement Corporel', // always first priority
  'Premiers Soins',
  'Perception Générale',
  'Lecture des Traces',
  'Escalade',
  'Natation',
  'Course',
  'Saut',
  'Dissimulation',
  'Pistage',
];

/**
 * Spend available DP optimally on skills.
 * Strategy: body dev first, then cheapest class skills.
 * @param {Object} char - character state
 * @param {Object} ranksStore - one of skillRanksAdolescent/Apprenti/Level
 * @param {number} dpBudget - total DP available for this phase
 * @param {number} maxBodyDevRanks - max body dev ranks for this phase (1 or 2)
 */
function autoSpendDP(char, ranksStore, dpBudget, maxBodyDevRanks) {
  let dpLeft = dpBudget;
  const bodyDevIdx = getBodyDevSkillIndex();

  // Step 1: Body Development — up to maxBodyDevRanks
  if (bodyDevIdx >= 0) {
    const cost = getSkillDevCost(char.classIndex, bodyDevIdx);
    if (cost) {
      let ranksSpent = 0;
      while (ranksSpent < maxBodyDevRanks && dpLeft >= cost.first) {
        dpLeft -= cost.first;
        ranksSpent++;
      }
      if (ranksSpent > 0) {
        ranksStore[bodyDevIdx] = (ranksStore[bodyDevIdx] || 0) + ranksSpent;
      }
    }
  }

  // Step 2: Collect all developable skills, sorted by cost (cheapest first)
  const skills = getAllSkillsFlat();
  const affordable = [];
  for (const skill of skills) {
    if (skill.globalIndex === bodyDevIdx) continue; // already handled
    const cost = getSkillDevCost(char.classIndex, skill.globalIndex);
    if (!cost || cost.first <= 0) continue;
    affordable.push({ idx: skill.globalIndex, name: skill.name_fr || '', cost: cost.first });
  }
  affordable.sort((a, b) => a.cost - b.cost);

  // Step 3: Prioritize common skills first, then fill with cheapest
  const prioritized = [];
  const rest = [];
  for (const sk of affordable) {
    const isCommon = COMMON_SKILL_KEYWORDS.some(kw => sk.name.includes(kw));
    if (isCommon) prioritized.push(sk);
    else rest.push(sk);
  }
  const ordered = [...prioritized, ...rest];

  // Step 4: Spend 1 rank per skill until DP is exhausted
  let pass = 0;
  while (dpLeft > 0 && pass < 3) {
    let anySpent = false;
    for (const sk of ordered) {
      if (dpLeft < sk.cost) continue;
      const currentRanks = ranksStore[sk.idx] || 0;
      if (currentRanks >= 2 && pass === 0) continue; // max 2 ranks per skill in first pass
      dpLeft -= sk.cost;
      ranksStore[sk.idx] = currentRanks + 1;
      anySpent = true;
      if (dpLeft <= 0) break;
    }
    if (!anySpent) break;
    pass++;
  }
}

/**
 * Generate a complete NPC.
 * @param {Object} params
 * @param {string} params.name
 * @param {number} params.raceIndex — index in monde.json
 * @param {number} params.classIndex — index in classes.json
 * @param {number} params.level — target level (1-20)
 * @param {boolean} params.save — save to IndexedDB (default true)
 * @returns {Object} character — fully populated character object
 */
export async function generateNPC(params) {
  const { name, raceIndex = 0, classIndex = 0, level = 1, save = true } = params;
  const data = getData();

  // 1. Create blank character
  const char = createCharacter();
  char.name = name || `PNJ_${Date.now()}`;
  char.raceIndex = raceIndex;
  char.classIndex = classIndex;
  char.level = 1;
  char.isNPC = true;
  char.language = 'fr';

  // 2. Apply race
  const races = data.monde?.races || [];
  const race = races[raceIndex];
  if (race) applyRace(char, race);

  // 3. Roll and assign stats
  const classes = getAllClasses();
  const cls = classes[classIndex];
  const primeStatIndices = cls ? getClassPrimeStats(cls) : [0, 5];
  const primeSet = new Set(primeStatIndices);

  const rolls = generateStatRolls();
  // Sort rolls by tempRoll descending so best rolls go to prime stats
  const sortedRolls = [...rolls].sort((a, b) => b.tempRoll - a.tempRoll);

  // Assign: prime stats indices get the highest rolls
  const assignment = new Array(10).fill(null);
  let rollIdx = 0;
  for (const statIdx of primeStatIndices) {
    assignment[statIdx] = rollIdx++;
  }
  for (let i = 0; i < 10; i++) {
    if (assignment[i] === null) assignment[i] = rollIdx++;
  }

  for (let i = 0; i < 10; i++) {
    const roll = sortedRolls[assignment[i]];
    const { temp, pot } = getStatValues(roll, primeSet.has(i));
    char.stats[i] = temp;
    char.potentials[i] = pot;
  }

  // Apply race bonuses
  for (let i = 0; i < 10; i++) {
    char.stats[i] += char.raceBonuses[i] || 0;
  }

  // Set PP stat indices
  if (cls) {
    char.realm = getRealmInfo(cls).key || 'none';
    char._ppStatIndices = getPPStatIndices(cls);
  }

  // 4. Generate background (appearance)
  const sex = Math.random() > 0.5 ? 'M' : 'F';
  const bg = generateBackground(char.raceName, sex);
  Object.assign(char, bg);

  // 5. Adolescent phase
  char.devPhase = 'adolescent';
  const dpAdolescent = getDevPointsTotal(char);
  autoSpendDP(char, char.skillRanksAdolescent, dpAdolescent, 1);

  // 6. Apprenti phase
  char.devPhase = 'apprenti';
  const dpApprenti = getDevPointsTotal(char);
  autoSpendDP(char, char.skillRanksApprenti, dpApprenti, 2);

  // 7. Level 1 development
  char.devPhase = 'level';
  const dpLevel = getDevPointsTotal(char);
  autoSpendDP(char, char.skillRanksLevel, dpLevel, 2);

  // 8. Level up to target (level 2 → target)
  for (let l = 2; l <= level; l++) {
    // Consolidate current level into prior
    for (const [idx, ranks] of Object.entries(char.skillRanksLevel)) {
      char.skillRanksPrior[idx] = (char.skillRanksPrior[idx] || 0) + ranks;
    }
    char.skillRanksLevel = {};
    char.level = l;
    const dp = getDevPointsTotal(char);
    autoSpendDP(char, char.skillRanksLevel, dp, 2);
  }

  // 9. Roll body development hit points
  const bodyDevIdx = getBodyDevSkillIndex();
  if (bodyDevIdx >= 0) {
    const totalBodyDevRanks = getTotalRanks(char, bodyDevIdx);
    const dieStr = char.raceHitDie || '1-10';
    const match = dieStr.match(/1-(\d+)/);
    const dieMax = match ? parseInt(match[1]) : 10;
    char.bodyDevRolls = [];
    for (let r = 0; r < totalBodyDevRanks; r++) {
      char.bodyDevRolls.push(Math.floor(Math.random() * dieMax) + 1);
    }
  }

  // 10. Calculated derived values
  char.hp = calcHitPoints(char);
  char.pp = calcPowerPoints(char);

  // 11. Save if requested
  if (save) await saveCharacter(char);

  return char;
}

/**
 * Get top N skills by total bonus for display in summaries.
 */
export function getTopSkills(char, n = 5) {
  const skills = getAllSkillsFlat();
  const results = [];
  for (const sk of skills) {
    const ranks = getTotalRanks(char, sk.globalIndex);
    if (ranks > 0) {
      results.push({ name: sk.name_fr, ranks });
    }
  }
  results.sort((a, b) => b.ranks - a.ranks);
  return results.slice(0, n);
}

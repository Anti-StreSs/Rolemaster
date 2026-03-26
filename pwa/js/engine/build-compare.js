// build-compare.js — Compare characters and project progression

import { loadCharacter, getAllCharacters } from './db.js';
import { calcHitPoints, calcPowerPoints, calculateDB, getTotalRanks,
         getDevPointsTotal, getBodyDevSkillIndex, rollBodyDevHitDie } from './character.js';
import { getStatBonus, getRankBonus } from './stats.js';
import { getSkillName, getSkillDevCost, getAllSkillsFlat } from './skills.js';
import { getBackgroundBonuses } from './background-effects.js';
import { getAllClasses, getClassName } from './classes.js';

const STAT_ABBREVS = ['CO', 'AG', 'AD', 'Mé', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];

// --- Compare ---

/**
 * Compare 2+ characters side by side.
 * @param {string[]} names — character names
 * @returns {Object} comparison data
 */
export async function compareBuilds(names) {
  const chars = [];
  for (const n of names) {
    const c = await loadCharacter(n);
    if (c) chars.push(c);
  }
  if (chars.length < 2) return { error: 'Need at least 2 characters' };

  const classes = getAllClasses();
  const skills = getAllSkillsFlat();

  return {
    characters: chars.map(c => {
      const bg = getBackgroundBonuses(c);
      const cls = c.classIndex >= 0 ? classes[c.classIndex] : null;

      const skillTotals = [];
      for (const sk of skills) {
        const ranks = getTotalRanks(c, sk.globalIndex);
        if (ranks > 0) {
          skillTotals.push({
            index: sk.globalIndex,
            name: getSkillName(sk, 'fr'),
            ranks,
            rankBonus: getRankBonus(ranks),
          });
        }
      }
      skillTotals.sort((a, b) => b.rankBonus - a.rankBonus);

      return {
        name: c.name,
        race: c.raceName,
        class: cls ? getClassName(cls, 'fr') : '?',
        level: c.level,
        isNPC: c.isNPC || false,
        stats: STAT_ABBREVS.map((a, i) => ({
          abbrev: a,
          value: c.stats[i] || 0,
          bonus: (getStatBonus(c.stats[i] || 0)) + (bg.statBonusMods[i] || 0),
        })),
        hp: calcHitPoints(c),
        pp: calcPowerPoints(c),
        db: calculateDB(c),
        topSkills: skillTotals.slice(0, 10),
        totalDevelopedSkills: skillTotals.length,
      };
    }),
  };
}

// --- Projection ---

/**
 * Spend DP proportionally to existing skill distribution.
 * Skills with more ranks get proportionally more DP.
 */
function proportionalSpend(sim, ranksStore, dpBudget) {
  const skills = getAllSkillsFlat();

  // Build distribution from all existing ranks
  const existing = [];
  let totalExistingRanks = 0;
  for (const sk of skills) {
    const ranks = getTotalRanks(sim, sk.globalIndex);
    if (ranks > 0) {
      const cost = getSkillDevCost(sim.classIndex, sk.globalIndex);
      if (cost && cost.first > 0) {
        existing.push({ idx: sk.globalIndex, ranks, cost: cost.first });
        totalExistingRanks += ranks;
      }
    }
  }

  if (existing.length === 0 || totalExistingRanks === 0) {
    // Fallback: body dev only
    const bdIdx = getBodyDevSkillIndex();
    if (bdIdx >= 0) {
      const cost = getSkillDevCost(sim.classIndex, bdIdx);
      if (cost && dpBudget >= cost.first) {
        ranksStore[bdIdx] = (ranksStore[bdIdx] || 0) + 1;
      }
    }
    return;
  }

  // Sort by priority (most developed first) for spending
  existing.sort((a, b) => b.ranks - a.ranks);

  let dpLeft = dpBudget;
  // Always spend on body dev first if affordable
  const bdIdx = getBodyDevSkillIndex();
  const bdEntry = existing.find(e => e.idx === bdIdx);
  if (bdEntry && dpLeft >= bdEntry.cost) {
    dpLeft -= bdEntry.cost;
    ranksStore[bdIdx] = (ranksStore[bdIdx] || 0) + 1;
  }

  // Distribute remaining DP proportionally to top skills
  for (const sk of existing) {
    if (sk.idx === bdIdx) continue;
    if (dpLeft < sk.cost) continue;
    dpLeft -= sk.cost;
    ranksStore[sk.idx] = (ranksStore[sk.idx] || 0) + 1;
    if (dpLeft <= 0) break;
  }
}

/**
 * Project a character's progression over N levels.
 * Creates a deep clone and simulates level-ups WITHOUT modifying the real character.
 * @param {string} name — character name
 * @param {number} targetLevel — project to this level
 * @returns {Object} result with snapshots per level
 */
export async function projectProgression(name, targetLevel) {
  const original = await loadCharacter(name);
  if (!original) return { error: 'Character not found' };
  if (targetLevel <= original.level) return { error: 'Target level must be > current level' };
  if (targetLevel > 30) return { error: 'Target level max is 30' };

  // Deep clone — never modifies the real character
  const sim = JSON.parse(JSON.stringify(original));
  const snapshots = [];

  for (let lvl = original.level + 1; lvl <= targetLevel; lvl++) {
    sim.level = lvl;

    // Auto-spend DP proportionally
    const dp = getDevPointsTotal(sim);
    proportionalSpend(sim, sim.skillRanksLevel, dp);

    // Add one body dev HP roll for each new body dev rank gained
    const bdIdx = getBodyDevSkillIndex();
    if (bdIdx >= 0) {
      const newBDRanks = sim.skillRanksLevel[bdIdx] || 0;
      if (newBDRanks > 0 && (!sim.bodyDevRolls || sim.bodyDevRolls.length < 200)) {
        const dieStr = sim.raceHitDie || '1-10';
        const match = dieStr.match(/1-(\d+)/);
        const dieMax = match ? parseInt(match[1]) : 10;
        if (!sim.bodyDevRolls) sim.bodyDevRolls = [];
        sim.bodyDevRolls.push(Math.floor(Math.random() * dieMax) + 1);
      }
    }

    // Top skills at this level
    const skills = getAllSkillsFlat();
    const topSkills = [];
    for (const sk of skills) {
      const ranks = getTotalRanks(sim, sk.globalIndex);
      if (ranks > 0) topSkills.push({ name: sk.name_fr, ranks, bonus: getRankBonus(ranks) });
    }
    topSkills.sort((a, b) => b.bonus - a.bonus);

    snapshots.push({
      level: lvl,
      dp,
      hp: calcHitPoints(sim).cap,
      pp: calcPowerPoints(sim),
      db: calculateDB(sim),
      topSkills: topSkills.slice(0, 5),
    });

    // Merge current level ranks into prior for next iteration
    for (const [idx, r] of Object.entries(sim.skillRanksLevel)) {
      sim.skillRanksPrior[idx] = (sim.skillRanksPrior[idx] || 0) + r;
    }
    sim.skillRanksLevel = {};
  }

  return {
    name: original.name,
    startLevel: original.level,
    targetLevel,
    note: 'Simulation only — original character unchanged. Stat gains not simulated.',
    snapshots,
  };
}

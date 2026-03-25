// npc-generator.js — Quick NPC generation for GMs
// Creates a playable NPC in one call using the existing engine

import { createCharacter, calcHitPoints, calcPowerPoints, applyRace,
         getDevPointsTotal, getTotalRanks, getBodyDevSkillIndex } from './character.js';
import { generateStatRolls, getStatValues } from './stats.js';
import { getAllClasses, getRealmInfo,
         getClassPrimeStats, getPPStatIndices } from './classes.js';

export const WEAPON_TYPE_MAP = {
  'edged_1h': 1, 'blunt_1h': 2, 'two_handed': 3,
  'polearm': 4, 'ranged': 5, 'thrown': 6,
};

const ARCHETYPE_BASE_ORDERS = {
  heavy_fighter: ['two_handed', 'blunt_1h', 'edged_1h', 'polearm', 'thrown', 'ranged'],
  cavalry:       ['polearm', 'two_handed', 'edged_1h', 'blunt_1h', 'thrown', 'ranged'],
  rogue:         ['edged_1h', 'thrown', 'ranged', 'blunt_1h', 'two_handed', 'polearm'],
  ranger:        ['ranged', 'edged_1h', 'thrown', 'blunt_1h', 'two_handed', 'polearm'],
  duelist:       ['edged_1h', 'ranged', 'thrown', 'blunt_1h', 'two_handed', 'polearm'],
  monk:          ['edged_1h', 'blunt_1h', 'thrown', 'ranged', 'two_handed', 'polearm'],
  semi_fighter:  ['edged_1h', 'ranged', 'blunt_1h', 'two_handed', 'thrown', 'polearm'],
  caster_staff:  ['two_handed', 'blunt_1h', 'thrown', 'edged_1h', 'ranged', 'polearm'],
  caster:        ['blunt_1h', 'two_handed', 'thrown', 'edged_1h', 'ranged', 'polearm'],
  other:         ['edged_1h', 'blunt_1h', 'two_handed', 'ranged', 'thrown', 'polearm'],
};

export function getClassArchetype(cls) {
  const name = (cls.name_fr || '').toLowerCase();
  if (/cavalier/.test(name)) return 'cavalry';
  if (/voleur|assassin|monte-en-l|larron|sicaire|danseur|escroc|boh[eé]mien|houri/.test(name)) return 'rogue';
  if (/ranger|compagnon|chasseur de prime/.test(name)) return 'ranger';
  if (/duelliste/.test(name)) return 'duelist';
  if (/moine|guerrier-moine|monastique/.test(name)) return 'monk';
  if (/paladin|guerrier-mage|derviche|limier|bestiaire/.test(name)) return 'semi_fighter';
  if (/druide|animiste|shamane|seigneur du chaos/.test(name)) return 'caster_staff';
  if (/guerrier|barbare|bashkar|combattant|marin|fermier/.test(name)) return 'heavy_fighter';
  const realmInfo = getRealmInfo(cls);
  if (realmInfo && realmInfo.hasSpells) {
    if (/druide|animiste|shamane|seigneur du chaos/.test(name)) return 'caster_staff';
    return 'caster';
  }
  return 'heavy_fighter';
}

export function getWeaponPriorityOrder(cls, stats) {
  const archetype = getClassArchetype(cls);
  const order = [...(ARCHETYPE_BASE_ORDERS[archetype] || ARCHETYPE_BASE_ORDERS.other)];
  const fo = stats[5] || 0;
  const ag = stats[1] || 0;
  if (fo >= 75 && ['heavy_fighter', 'cavalry', 'monk', 'semi_fighter'].includes(archetype)) {
    const idx = order.indexOf('two_handed');
    if (idx > 0) { order.splice(idx, 1); order.unshift('two_handed'); }
  }
  if (ag >= 75 && ['rogue', 'ranger', 'duelist'].includes(archetype)) {
    const idx = order.indexOf('ranged');
    if (idx > 1) { order.splice(idx, 1); order.splice(1, 0, 'ranged'); }
  }
  return order;
}

function getRaceClassAffinity(race, cls) {
  const archetype = getClassArchetype(cls);
  const bonuses = race.stat_bonuses || [];
  const co = bonuses[0] || 0;
  const ag = bonuses[1] || 0;
  const fo = bonuses[5] || 0;
  const rp = bonuses[6] || 0;
  const pr = bonuses[7] || 0;
  const em = bonuses[8] || 0;
  const inStat = bonuses[9] || 0;
  let score = 50;
  if (archetype === 'heavy_fighter') score += (fo * 3 + co * 1.5 - em * 2 - inStat * 2) / 10;
  else if (archetype === 'cavalry')  score += (fo * 2.5 + co * 1.5 - em * 2) / 10;
  else if (archetype === 'rogue')    score += (ag * 3 + rp * 1.5 - fo * 1) / 10;
  else if (archetype === 'ranger')   score += (ag * 2 + rp * 1.5 + co * 0.5) / 10;
  else if (archetype === 'duelist')  score += (ag * 2.5 + fo * 1 - em * 1) / 10;
  else if (archetype === 'monk')     score += (ag * 2 + (bonuses[2] || 0) * 1.5 + rp * 1) / 10;
  else if (archetype === 'semi_fighter') score += (fo * 1.5 + ag * 1 + em * 0.5) / 10;
  else if (archetype === 'caster_staff' || archetype === 'caster') score += (em * 2.5 + inStat * 2.5 + pr * 1.5 - fo * 2 - co * 1) / 10;
  else score += (ag * 1 + fo * 1) / 10;
  return Math.max(1, Math.min(100, score));
}

function pickWeightedRandom(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickCoherentRace(classIdx, races, classes) {
  const cls = classes[classIdx];
  if (!cls || !races || races.length === 0) return Math.floor(Math.random() * (races ? races.length : 1));
  const picked = pickWeightedRandom(races, r => getRaceClassAffinity(r, cls));
  return races.indexOf(picked);
}

export function pickCoherentClass(raceIdx, races, classes) {
  const race = races[raceIdx];
  if (!race || !classes || classes.length === 0) return Math.floor(Math.random() * (classes ? classes.length : 1));
  const picked = pickWeightedRandom(classes, c => getRaceClassAffinity(race, c));
  return classes.indexOf(picked);
}

function spendWeaponSkillDP(char, ranksStore, dpBudget, archetype) {
  const isCaster = archetype === 'caster' || archetype === 'caster_staff';
  let dpSpent = 0;
  if (!char.weaponSkills || char.weaponSkills.length === 0) return 0;
  for (let wi = 0; wi < char.weaponSkills.length; wi++) {
    const wpn = char.weaponSkills[wi];
    const key = 'wpn_' + wi;
    const cost = wpn.cost;
    if (!cost || cost.first <= 0) continue;
    if (isCaster) {
      const prior = char.skillRanksPrior[key] || 0;
      if (prior > 0) continue;
      if (dpBudget - dpSpent >= cost.first) {
        ranksStore[key] = (ranksStore[key] || 0) + 1;
        dpSpent += cost.first;
      }
    } else {
      const maxRanks = cost.second > 0 ? 2 : 1;
      for (let r = 0; r < maxRanks; r++) {
        if (dpBudget - dpSpent >= cost.first) {
          ranksStore[key] = (ranksStore[key] || 0) + 1;
          dpSpent += cost.first;
        }
      }
    }
  }
  return dpSpent;
}

function autoAssignWeaponPriorities(char, cls) {
  const order = getWeaponPriorityOrder(cls, char.stats);
  char.weaponPriorities = order.slice(0, 6);
  while (char.weaponPriorities.length < 6) char.weaponPriorities.push(null);
}

function autoAddWeaponSkills(char, data, n = 2) {
  const monde = data.monde;
  if (!monde || !monde.weapon_categories) return;
  const priorities = char.weaponPriorities || [];
  let added = 0;
  for (let s = 0; s < priorities.length && added < n; s++) {
    const typeId = priorities[s];
    if (!typeId) continue;
    const typeNum = WEAPON_TYPE_MAP[typeId];
    const subcats = monde.weapon_categories.filter(wc => wc.type === typeNum);
    if (subcats.length === 0) continue;
    const subcat = subcats[Math.floor(Math.random() * subcats.length)];
    const weapons = subcat.weapons || [];
    if (weapons.length === 0) continue;
    const existingNames = (char.weaponSkills || []).map(w => w.name);
    const available = weapons.filter(w => !existingNames.includes(w));
    if (available.length === 0) continue;
    const weaponName = available[Math.floor(Math.random() * available.length)];
    const cost = getWeaponSkillCost(char.classIndex, typeNum, char.weaponPriorities);
    if (!char.weaponSkills) char.weaponSkills = [];
    char.weaponSkills.push({ name: weaponName, weaponType: typeNum, weaponTypeId: typeId, cost });
    added++;
  }
}
import { getSkillDevCost, getAllSkillsFlat, getWeaponSkillCost } from './skills.js';
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
  const { name, raceIndex: raceParam = -1, classIndex: classParam = -1, level = 1, save = true } = params;
  const data = getData();

  // 1. Create blank character
  const char = createCharacter();
  char.name = name || `PNJ_${Date.now()}`;
  char.level = 1;
  char.isNPC = true;
  char.language = 'fr';

  // 2. Resolve race and class coherently
  const races = data.monde?.races || [];
  const classes = getAllClasses();

  let resolvedClassIndex, resolvedRaceIndex;
  if (classParam === -1 && raceParam === -1) {
    resolvedClassIndex = Math.floor(Math.random() * classes.length);
    resolvedRaceIndex = pickCoherentRace(resolvedClassIndex, races, classes);
  } else if (classParam === -1) {
    resolvedRaceIndex = raceParam;
    resolvedClassIndex = pickCoherentClass(raceParam, races, classes);
  } else if (raceParam === -1) {
    resolvedClassIndex = classParam;
    resolvedRaceIndex = pickCoherentRace(classParam, races, classes);
  } else {
    resolvedClassIndex = classParam;
    resolvedRaceIndex = raceParam;
  }

  char.raceIndex = resolvedRaceIndex;
  char.classIndex = resolvedClassIndex;

  // 3. Apply race
  const race = races[resolvedRaceIndex];
  if (race) applyRace(char, race);

  // 4. Roll and assign stats
  const cls = classes[resolvedClassIndex];
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

  // Set PP stat indices
  if (cls) {
    char.realm = getRealmInfo(cls).key || 'none';
    char._ppStatIndices = getPPStatIndices(cls);
  }

  // 5. Generate background (appearance)
  const sex = Math.random() > 0.5 ? 'M' : 'F';
  const bg = generateBackground(char.raceName, sex);
  Object.assign(char, bg);

  // Assign weapon categories and weapon skills
  if (cls) {
    autoAssignWeaponPriorities(char, cls);
    autoAddWeaponSkills(char, data, 2);
  }

  const archetype = cls ? getClassArchetype(cls) : 'other';

  // 6. Adolescent phase
  char.devPhase = 'adolescent';
  {
    const dpAdolescent = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksAdolescent, dpAdolescent, archetype);
    autoSpendDP(char, char.skillRanksAdolescent, dpAdolescent - wpnDp, 1);
  }

  // 7. Apprenti phase
  char.devPhase = 'apprenti';
  {
    const dpApprenti = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksApprenti, dpApprenti, archetype);
    autoSpendDP(char, char.skillRanksApprenti, dpApprenti - wpnDp, 2);
  }

  // 8. Level 1 development
  char.devPhase = 'level';
  {
    const dpLevel = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksLevel, dpLevel, archetype);
    autoSpendDP(char, char.skillRanksLevel, dpLevel - wpnDp, 2);
  }

  // 9. Level up to target (level 2 → target)
  for (let l = 2; l <= level; l++) {
    for (const [idx, ranks] of Object.entries(char.skillRanksLevel)) {
      char.skillRanksPrior[idx] = (char.skillRanksPrior[idx] || 0) + ranks;
    }
    char.skillRanksLevel = {};
    char.level = l;
    const dp = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksLevel, dp, archetype);
    autoSpendDP(char, char.skillRanksLevel, dp - wpnDp, 2);
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

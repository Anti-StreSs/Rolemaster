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

const WEAPON_TYPE_REVERSE = { 1: 'edged_1h', 2: 'blunt_1h', 3: 'two_handed', 4: 'polearm', 5: 'ranged', 6: 'thrown' };

const ARCHETYPE_WEAPON_PICKS = {
  heavy_fighter: [
    { type: 3, preferred: ['Épée à deux mains', 'Claymore', 'Épée bâtarde'] },
    { type: 1, preferred: ['Épée large', 'Épée longue'] },
  ],
  cavalry: [
    { type: 4, preferred: ['Lance'] },
    { type: 1, preferred: ['Épée longue', 'Épée large'] },
  ],
  rogue: [
    { type: 1, preferred: ['Dague', 'Épée courte', 'Rapière'] },
    { type: 5, preferred: ['Arc court'] },
  ],
  ranger: [
    { type: 5, preferred: ['Arc long', 'Arc composite'] },
    { type: 1, preferred: ['Épée large', 'Épée longue'] },
  ],
  duelist: [
    { type: 1, preferred: ['Rapière', 'Fleuret'] },
    { type: 1, preferred: ['Dague', 'Main Gauche'] },
  ],
  monk: [
    { type: 2, preferred: ['Bâton', 'Bâton de combat'] },
    { type: 1, preferred: ['Dague'] },
  ],
  semi_fighter: [
    { type: 1, preferred: ['Épée large', 'Cimeterre'] },
    { type: 5, preferred: ['Arc court', 'Arc composite'] },
  ],
  caster_staff: [
    { type: 3, preferred: ['Bâton', 'Bâton de combat'] },
    { type: 1, preferred: ['Dague'] },
  ],
  caster: [
    { type: 2, preferred: ['Bâton', 'Masse'] },
    { type: 1, preferred: ['Dague'] },
  ],
  other: [
    { type: 1, preferred: ['Épée large'] },
    { type: 2, preferred: ['Masse'] },
  ],
};

const ARCHETYPE_SKILL_PRIORITIES = {
  heavy_fighter: ['Développement Corporel', 'Perception Générale', 'Premiers Soins', 'Course', 'Escalade', 'Natation'],
  cavalry:       ['Développement Corporel', 'Équitation', 'Perception Générale', 'Premiers Soins', 'Course'],
  rogue:         ['Développement Corporel', 'Crochetage', 'Désamorçage', 'Dissimulation', 'Pistage', 'Acrobatie', 'Perception Générale', 'Pickpocket'],
  ranger:        ['Développement Corporel', 'Pistage', 'Perception Générale', 'Dissimulation', 'Escalade', 'Course', 'Natation', 'Lecture des Traces', 'Premiers Soins'],
  duelist:       ['Développement Corporel', 'Acrobatie', 'Esquive', 'Perception Générale', 'Premiers Soins'],
  monk:          ['Développement Corporel', 'Acrobatie', 'Méditation', 'Perception Générale', 'Contrôle Corporel'],
  semi_fighter:  ['Développement Corporel', 'Perception Générale', 'Premiers Soins', 'Escalade', 'Course'],
  caster_staff:  ['Développement Corporel', 'Lecture des Runes', 'Méditation', 'Perception Générale', 'Premiers Soins'],
  caster:        ['Développement Corporel', 'Lecture des Runes', 'Méditation', 'Perception Générale', 'Premiers Soins'],
  other:         ['Développement Corporel', 'Perception Générale', 'Premiers Soins', 'Escalade', 'Course'],
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

function autoAddWeaponSkills(char, data, n = 2, archetype = 'other') {
  const monde = data.monde;
  if (!monde || !monde.weapon_categories) return;
  const picks = ARCHETYPE_WEAPON_PICKS[archetype] || ARCHETYPE_WEAPON_PICKS.other;
  let added = 0;

  for (let p = 0; p < picks.length && added < n; p++) {
    const pick = picks[p];
    const typeId = WEAPON_TYPE_REVERSE[pick.type];
    if (!typeId) continue;
    const existingNames = (char.weaponSkills || []).map(w => w.name);
    const allWeapons = monde.weapon_categories
      .filter(wc => wc.type === pick.type)
      .flatMap(wc => wc.weapons || [])
      .filter(w => !existingNames.includes(w));
    if (allWeapons.length === 0) continue;

    const preferred = allWeapons.filter(w =>
      pick.preferred.some(p2 => w.toLowerCase().includes(p2.toLowerCase()))
    );
    const weaponName = preferred.length > 0
      ? preferred[Math.floor(Math.random() * preferred.length)]
      : allWeapons[Math.floor(Math.random() * allWeapons.length)];

    const cost = getWeaponSkillCost(char.classIndex, typeId, char.weaponPriorities);
    if (!char.weaponSkills) char.weaponSkills = [];
    char.weaponSkills.push({ name: weaponName, weaponType: pick.type, weaponTypeId: typeId, cost });
    added++;
  }
}
import { getSkillDevCost, getAllSkillsFlat, getWeaponSkillCost } from './skills.js';
import { getClassBaseSpellLists } from './spells.js';
import { generateBackground } from './background.js';
import { saveCharacter } from './db.js';
import { getData } from './data-loader.js';


/**
 * Spend available DP optimally on skills.
 * Strategy: body dev first, then cheapest class skills.
 * @param {Object} char - character state
 * @param {Object} ranksStore - one of skillRanksAdolescent/Apprenti/Level
 * @param {number} dpBudget - total DP available for this phase
 * @param {number} maxBodyDevRanks - max body dev ranks for this phase (1 or 2)
 */
function autoSpendDP(char, ranksStore, dpBudget, maxBodyDevRanks, archetype = 'other') {
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
    const keywords = ARCHETYPE_SKILL_PRIORITIES[archetype] || ARCHETYPE_SKILL_PRIORITIES.other;
    const isCommon = keywords.some(kw => sk.name.includes(kw));
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

  // 4. Roll and assign stats — match wizard.js autoAssignRolls: best rolls → dev stats, worst → prime
  const cls = classes[resolvedClassIndex];
  const primeStatIndices = cls ? getClassPrimeStats(cls) : [0, 5];
  const primeSet = new Set(primeStatIndices);
  char.primeStats = primeStatIndices; // Bug 3 fix: was never assigned

  const devStatIndices = [0, 1, 2, 3, 4]; // CO, AG, AD, ME, RE → maximize DP
  const realmKey = cls ? (getRealmInfo(cls).key || 'none') : 'none';
  const realmStatMap = { essence: 8, channeling: 9, mentalism: 7 };
  const realmStat = realmStatMap[realmKey];

  const tierA = [], tierB = [], tierC = [], tierD = [];
  for (let i = 0; i < 10; i++) {
    if (primeSet.has(i))                    tierD.push(i); // worst → prime boost compensates
    else if (devStatIndices.includes(i))    tierA.push(i); // best → maximize DP
    else if (realmStat === i)               tierB.push(i); // good → maximize PP
    else                                    tierC.push(i);
  }
  const statPriority = [...tierA, ...tierB, ...tierC, ...tierD];

  const rolls = generateStatRolls();
  const sortedRolls = [...rolls].sort((a, b) => b.tempRoll - a.tempRoll); // best first
  for (let i = 0; i < statPriority.length; i++) {
    const { temp, pot } = getStatValues(sortedRolls[i], primeSet.has(statPriority[i]));
    char.stats[statPriority[i]] = temp;
    char.potentials[statPriority[i]] = pot;
  }

  // Set realm and PP stat indices
  if (cls) {
    char.realm = realmKey;
    char._ppStatIndices = getPPStatIndices(cls);
  }

  // 5. Generate background (appearance)
  const sex = Math.random() > 0.5 ? 'M' : 'F';
  const bg = generateBackground(char.raceName, sex);
  Object.assign(char, bg);

  // Assign weapon categories and weapon skills
  const archetype = cls ? getClassArchetype(cls) : 'other';
  if (cls) {
    autoAssignWeaponPriorities(char, cls);
    autoAddWeaponSkills(char, data, 2, archetype);
  }

  // 6. Adolescent phase
  char.devPhase = 'adolescent';
  {
    const dpAdolescent = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksAdolescent, dpAdolescent, archetype);
    autoSpendDP(char, char.skillRanksAdolescent, dpAdolescent - wpnDp, 1, archetype);
  }

  // 7. Apprenti phase
  char.devPhase = 'apprenti';
  {
    const dpApprenti = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksApprenti, dpApprenti, archetype);
    autoSpendDP(char, char.skillRanksApprenti, dpApprenti - wpnDp, 2, archetype);
  }

  // 8. Level 1 development
  char.devPhase = 'level';
  {
    const dpLevel = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksLevel, dpLevel, archetype);
    autoSpendDP(char, char.skillRanksLevel, dpLevel - wpnDp, 2, archetype);
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
    autoSpendDP(char, char.skillRanksLevel, dp - wpnDp, 2, archetype);
  }

  // 10. Roll body development hit points
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

  // 11. Auto-assign base spell lists for caster archetypes
  if (['caster', 'caster_staff', 'semi_fighter'].includes(archetype)) {
    const baseLists = getClassBaseSpellLists(resolvedClassIndex);
    if (baseLists.length > 0) {
      const maxSpellLevel = level <= 3 ? 5 : level <= 7 ? 10 : Math.min(20, level * 2);
      char.spellLists = baseLists.map(listIdx => ({ listIndex: listIdx, maxLevel: maxSpellLevel }));
    }
  }

  // 12. Calculated derived values
  char.hp = calcHitPoints(char);
  char.pp = calcPowerPoints(char);

  // 13. Save if requested
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

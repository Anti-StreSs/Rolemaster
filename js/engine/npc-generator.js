// npc-generator.js — Quick NPC generation for GMs
// Creates a playable NPC in one call using the existing engine

import { createCharacter, normalizeCharacter, applyRace,
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

const ARCHETYPE_SKILL_TIERS = {
  heavy_fighter: {
    tier1: ['Développement Corporel', 'Manœuvre sous Armure', 'Armure Lourde'],
    tier2: ['Perception', 'Escalade', 'Endurance', 'Course'],
    tier3: ['Premiers Soins', 'Navigation'],
  },
  cavalry: {
    tier1: ['Développement Corporel', 'Équitation', 'Manœuvre sous Armure'],
    tier2: ['Perception', 'Course', 'Premiers Soins'],
    tier3: ['Escalade', 'Navigation'],
  },
  rogue: {
    tier1: ['Développement Corporel', 'Embuscade', 'Discrétion', 'Crochetage'],
    tier2: ['Perception', 'Désamorçage', 'Pickpocket', 'Escalade'],
    tier3: ['Acrobatie', 'Déguisement', 'Orientation'],
  },
  ranger: {
    tier1: ['Développement Corporel', 'Perception', 'Pistage', 'Embuscade'],
    tier2: ['Orientation', 'Herboristerie', 'Discrétion', 'Natation'],
    tier3: ['Escalade', 'Premiers Soins', 'Navigation'],
  },
  duelist: {
    tier1: ['Développement Corporel', 'Acrobatie', 'Esquive'],
    tier2: ['Perception', 'Désarmement', 'Premiers Soins'],
    tier3: ['Discrétion', 'Orientation'],
  },
  monk: {
    tier1: ['Développement Corporel', 'Acrobatie', 'Contrôle Corporel', 'Méditation'],
    tier2: ['Perception', 'Course', 'Escalade'],
    tier3: ['Premiers Soins', 'Orientation'],
  },
  semi_fighter: {
    tier1: ['Développement Corporel', 'Perception', 'Premiers Soins'],
    tier2: ['Escalade', 'Course', 'Dissimulation'],
    tier3: ['Orientation', 'Herboristerie'],
  },
  caster_staff: {
    tier1: ['Développement Corporel', 'Perception', 'Lecture des Runes', 'Méditation'],
    tier2: ['Herboristerie', 'Premiers Soins', 'Orientation'],
    tier3: ['Linguistique', 'Philosophie'],
  },
  caster: {
    tier1: ['Développement Corporel', 'Perception', 'Incantation'],
    tier2: ['Herboristerie', 'Premiers Soins', 'Orientation'],
    tier3: ['Linguistique', 'Philosophie'],
  },
  other: {
    tier1: ['Développement Corporel', 'Perception'],
    tier2: ['Premiers Soins', 'Escalade', 'Course'],
    tier3: ['Orientation', 'Navigation'],
  },
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

export function detectArchetype(cls) { return getClassArchetype(cls); }

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

export function spendWeaponSkillDP(char, ranksStore, dpBudget, archetype) {
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
  char.weaponPriorities = order.slice(0, 6).map(key => WEAPON_TYPE_MAP[key] || null);
  while (char.weaponPriorities.length < 6) char.weaponPriorities.push(null);
}

export function autoAddWeaponSkills(char, data, n = 2, archetype = 'other') {
  const monde = data.monde;
  if (!monde || !monde.weapon_categories) return;
  const picks = ARCHETYPE_WEAPON_PICKS[archetype] || ARCHETYPE_WEAPON_PICKS.other;
  let added = 0;

  for (let p = 0; p < picks.length && added < n; p++) {
    const pick = picks[p];
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

    const cost = getWeaponSkillCost(char.classIndex, pick.type, char.weaponPriorities);
    if (!cost) continue; // skip weapon types with no cost for this class
    if (!char.weaponSkills) char.weaponSkills = [];
    char.weaponSkills.push({ name: weaponName, weaponType: pick.type, weaponTypeId: pick.type, cost });
    added++;
  }
}
import { getSkillDevCost, getAllSkillsFlat, getWeaponSkillCost } from './skills.js';
import { getClassBaseSpellLists, getSpellRankCost } from './spells.js';
import { generateBackground } from './background.js';
import { saveCharacter } from './db.js';
import { getData } from './data-loader.js';
import { logStatRoll, logPhaseValidate, logLevelUp, logHpRoll } from './event-log.js';
import { getComputedSkills } from './skill-compute.js';


/**
 * Spend available DP optimally on skills.
 * Strategy: body dev first, spell investment for casters, then tiered archetype priorities.
 * Pass 1: 1 rank per any skill. Pass 2: tier1+tier2 only. Pass 3: tier1 only.
 */
export function autoSpendDP(char, ranksStore, dpBudget, maxBodyDevRanks, archetype = 'other') {
  let dpLeft = dpBudget;
  const bodyDevIdx = getBodyDevSkillIndex();
  const isCaster = archetype === 'caster' || archetype === 'caster_staff';

  // Step 1: Body Development — up to maxBodyDevRanks
  if (bodyDevIdx >= 0) {
    const cost = getSkillDevCost(char.classIndex, bodyDevIdx);
    if (cost) {
      let ranksSpent = 0;
      const existingRanks = ranksStore[bodyDevIdx] || 0;
      while (ranksSpent < maxBodyDevRanks && existingRanks + ranksSpent < (cost.maxRanks || 2) && dpLeft >= cost.first) {
        dpLeft -= cost.first;
        ranksSpent++;
      }
      if (ranksSpent > 0) ranksStore[bodyDevIdx] = existingRanks + ranksSpent;
    }
  }

  // Step 2b: Spell investment for casters (only if spell lists already assigned)
  if (char.spellLists && char.spellLists.length > 0) {
    const cls = char.classIndex >= 0 ? getAllClasses()[char.classIndex] : null;
    const spellRankCost = getSpellRankCost(cls);
    const spellBudget = Math.floor(dpLeft * (isCaster ? 0.4 : 0.2));
    let spellSpent = 0;
    for (const sl of char.spellLists) {
      while (spellSpent < spellBudget && dpLeft > spellRankCost) {
        dpLeft -= spellRankCost;
        spellSpent += spellRankCost;
      }
    }
  }

  // Step 2: Collect all developable skills, sorted by cost (cheapest first)
  const skills = getAllSkillsFlat();
  const affordable = [];
  for (const skill of skills) {
    if (skill.globalIndex === bodyDevIdx) continue;
    const cost = getSkillDevCost(char.classIndex, skill.globalIndex);
    if (!cost || cost.first <= 0) continue;
    affordable.push({ idx: skill.globalIndex, name: skill.name_fr || '', cost, first: cost.first });
  }
  affordable.sort((a, b) => a.first - b.first);

  // Step 3: Tiered priorities — tier1 gets 3 passes, tier2 gets 2, others get 1
  const tiers = ARCHETYPE_SKILL_TIERS[archetype] || ARCHETYPE_SKILL_TIERS.other;
  const tier1 = affordable.filter(sk => tiers.tier1?.some(kw => sk.name.includes(kw)));
  const tier2 = affordable.filter(sk => !tier1.includes(sk) && tiers.tier2?.some(kw => sk.name.includes(kw)));
  const tier3 = affordable.filter(sk => !tier1.includes(sk) && !tier2.includes(sk) && tiers.tier3?.some(kw => sk.name.includes(kw)));
  const other = affordable.filter(sk => !tier1.includes(sk) && !tier2.includes(sk) && !tier3.includes(sk));
  const ordered = [...tier1, ...tier2, ...tier3, ...other];

  // Step 4: Diminishing returns — pass 0: all, pass 1: tier1+tier2, pass 2: tier1 only
  const eligiblePerPass = [ordered, [...tier1, ...tier2], tier1];
  for (let pass = 0; pass < 3 && dpLeft > 0; pass++) {
    let anySpent = false;
    for (const sk of eligiblePerPass[pass]) {
      const currentRanks = ranksStore[sk.idx] || 0;
      const maxR = sk.cost.maxRanks || 2;
      if (currentRanks >= maxR) continue;
      const rankCost = currentRanks === 0 ? sk.cost.first : (sk.cost.second > 0 ? sk.cost.second : sk.cost.first);
      if (dpLeft < rankCost) continue;
      dpLeft -= rankCost;
      ranksStore[sk.idx] = currentRanks + 1;
      anySpent = true;
      if (dpLeft <= 0) break;
    }
    if (!anySpent) break;
  }

  // Return DP actually spent (caller needs this!)
  return dpBudget - dpLeft;
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
  normalizeCharacter(char); // ensure all v5 fields (eventLog, bgOptionsLocked, phases, etc.)
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

  logStatRoll(char, {
    method: 'npc_auto', phase: 'creation',
    stats: [...char.stats], potentials: [...char.potentials],
  });

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
    char.phases.push({
      phase: 'adolescent',
      dpTotal: dpAdolescent,
      dpSpent: dpAdolescent,
      skillRanks: { ...char.skillRanksAdolescent },
      weaponRanks: Object.fromEntries(
        Object.entries(char.skillRanksAdolescent).filter(([k]) => k.startsWith('wpn_'))
      ),
      validatedAt: new Date().toISOString(),
    });
    logPhaseValidate(char, {
      phase: 'adolescent', dpSpent: dpAdolescent, dpTotal: dpAdolescent,
      skillSnapshot: { ...char.skillRanksAdolescent },
    });
  }

  // 7. Apprenti phase
  char.devPhase = 'apprenti';
  {
    const dpApprenti = getDevPointsTotal(char);
    const wpnDp = spendWeaponSkillDP(char, char.skillRanksApprenti, dpApprenti, archetype);
    autoSpendDP(char, char.skillRanksApprenti, dpApprenti - wpnDp, 2, archetype);
    char.phases.push({
      phase: 'apprenti',
      dpTotal: dpApprenti,
      dpSpent: dpApprenti,
      skillRanks: { ...char.skillRanksApprenti },
      weaponRanks: Object.fromEntries(
        Object.entries(char.skillRanksApprenti).filter(([k]) => k.startsWith('wpn_'))
      ),
      validatedAt: new Date().toISOString(),
    });
    logPhaseValidate(char, {
      phase: 'apprenti', dpSpent: dpApprenti, dpTotal: dpApprenti,
      skillSnapshot: { ...char.skillRanksApprenti },
    });
    char.bgOptionsLocked = true;
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
    logLevelUp(char, { oldLevel: l - 1, newLevel: l });
  }

  // 9b. Validate last level's development — consolidate into prior ranks so wizard shows 0 remaining DP
  for (const [idx, ranks] of Object.entries(char.skillRanksLevel)) {
    char.skillRanksPrior[idx] = (char.skillRanksPrior[idx] || 0) + ranks;
  }
  char.skillRanksLevel = {};
  char.devPhaseValidated = true;

  // 10. Roll body development hit points
  const bodyDevIdx = getBodyDevSkillIndex();
  if (bodyDevIdx >= 0) {
    const totalBodyDevRanks = getTotalRanks(char, bodyDevIdx);
    const dieStr = char.raceHitDie || '1-10';
    const match = dieStr.match(/1-(\d+)/);
    const dieMax = match ? parseInt(match[1]) : 10;
    char.bodyDevRolls = [];
    for (let r = 0; r < totalBodyDevRanks; r++) {
      const roll = Math.floor(Math.random() * dieMax) + 1;
      char.bodyDevRolls.push(roll);
      logHpRoll(char, { rank: r + 1, dieRoll: roll, dieType: dieMax });
    }
  }

  // 11. Auto-assign base spell lists for caster archetypes
  if (['caster', 'caster_staff', 'semi_fighter'].includes(archetype)) {
    const baseLists = getClassBaseSpellLists(resolvedClassIndex); // returns string names
    if (baseLists.length > 0) {
      const maxSpellLevel = level <= 3 ? 5 : level <= 7 ? 10 : Math.min(20, level * 2);
      const realms = (data.sorts && data.sorts.realms) ? data.sorts.realms : [];
      char.spellLists = baseLists.map(listName => {
        let realm = '';
        for (const r of realms) {
          for (const group of r.groups || []) {
            for (const spell of group) {
              if (spell.name_fr === listName || spell.name_fr?.includes(listName) || listName.includes(spell.name_fr)) {
                realm = r.name;
              }
            }
          }
        }
        return {
          name: listName,
          maxLevel: maxSpellLevel,
          reference: realm,
          type: 'base_own',
          realm: realm,
        };
      });
    }
  }

  // 12. Final normalize — ensure all v5 fields present before save
  normalizeCharacter(char);

  // 13. Save if requested
  if (save) await saveCharacter(char);

  return char;
}

/**
 * Get top N skills by total bonus (rank + stat + misc + bg) for display in summaries.
 */
export function getTopSkills(char, n = 5) {
  const computed = getComputedSkills(char, 'fr');
  return computed
    .filter(sk => !sk.isCategory && !sk.isParent && sk.totalRanks > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .map(sk => ({ name: sk.name, ranks: sk.totalRanks, total: sk.total }));
}

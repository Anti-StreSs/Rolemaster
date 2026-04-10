// Skills engine — categories, skill costs, development

import { getData } from './data-loader.js';
import { getStatBonus, getRankBonus } from './stats.js';
import { setBodyDevSkillIndex, getTotalStatBonus } from './character.js';

/**
 * Get all skill categories with their skills.
 */
export function getAllCategories() {
  return getData().competences.categories;
}

/**
 * Get skill name in the specified language.
 */
export function getSkillName(skill, lang) {
  return lang === 'en' ? skill.name_en : skill.name_fr;
}

/**
 * Get the tertiary stat index for 3-stat skills.
 * Hidden in raw_params[3] (1-based), not exposed as a dedicated field.
 */
export function getTertiaryStat(skill) {
  if (skill.stat_count >= 3 && skill.raw_params && skill.raw_params.length > 3) {
    return skill.raw_params[3];
  }
  return 0;
}

/**
 * Get all stat indices for a skill (1-based).
 * Returns array of 1-3 stat indices.
 */
export function getSkillStatIndices(skill) {
  const stats = [];
  if (skill.primary_stat >= 1 && skill.primary_stat <= 10) stats.push(skill.primary_stat);
  // stat_count=0 is a known parsing artefact for some skills (e.g. Martial Arts)
  // that have a valid secondary_stat. Include it whenever present and valid.
  if (skill.secondary_stat >= 1 && skill.secondary_stat <= 10) stats.push(skill.secondary_stat);
  if (skill.stat_count >= 3) {
    const tert = getTertiaryStat(skill);
    if (tert >= 1 && tert <= 10) stats.push(tert);
  }
  return stats;
}

/**
 * Calculate the stat bonus for a skill based on character's stats.
 * Formula: floor(average of ALL stat bonuses) — works for 1, 2, or 3 stats.
 * When a stat appears twice (e.g. FO/FO/AG), it counts double in the average.
 */
export function calcSkillStatBonus(skill, statValues) {
  const statIndices = getSkillStatIndices(skill);
  if (statIndices.length === 0) return 0;
  if (statIndices.length === 1) return getStatBonus(statValues[statIndices[0] - 1]);

  let sum = 0;
  for (const idx of statIndices) {
    sum += getStatBonus(statValues[idx - 1]);
  }
  return Math.floor(sum / statIndices.length);
}

/**
 * Calculate total bonus for a skill.
 */
export function calcTotalSkillBonus(skill, statValues, ranks) {
  const statBonus = calcSkillStatBonus(skill, statValues);
  const rankBonus = getRankBonus(ranks);
  return statBonus + rankBonus;
}

// Mapping from classes.json index → couts.json index
// classes.json has 68 classes, couts.json has 65. 3 classes have no cost data.
const CLASS_TO_COUTS_MAP = [0,1,2,3,-1,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,64,22,23,24,25,26,27,28,29,30,31,-1,32,33,-1,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63];

/**
 * Get the couts.json index for a classes.json class index.
 */
export function getCoutsIndex(classIndex) {
  if (classIndex < 0 || classIndex >= CLASS_TO_COUTS_MAP.length) return -1;
  return CLASS_TO_COUTS_MAP[classIndex];
}

// Weapon Skill at global index 63 takes 12 cost values (6 priority slots × 2)
// instead of the normal 2, shifting all subsequent skill costs by +10.
const WEAPON_SKILL_INDEX = 63;
const WEAPON_COST_EXTRA = 10; // 12 values - 2 normal = 10 extra

/**
 * Get the cost array offset for a skill, accounting for the Weapon Skill
 * taking 12 values (6 weapon category priority slots × 2) instead of 2.
 */
function getCostOffset(skillGlobalIndex) {
  return skillGlobalIndex * 2 + (skillGlobalIndex > WEAPON_SKILL_INDEX ? WEAPON_COST_EXTRA : 0);
}

/**
 * Parse development cost for a skill.
 * Returns {first, second, maxRanks} or null if not developable.
 */
export function getSkillDevCost(classIndex, skillGlobalIndex) {
  const couts = getData().couts;
  const coutsIdx = getCoutsIndex(classIndex);
  if (coutsIdx < 0 || coutsIdx >= couts.classes.length) return null;

  if (isNaN(skillGlobalIndex) || skillGlobalIndex < 0) return null;

  const costs = couts.classes[coutsIdx].cost_values;
  const idx = getCostOffset(skillGlobalIndex);
  if (isNaN(idx) || idx + 1 >= costs.length) return null;

  const first = costs[idx];
  const second = costs[idx + 1];
  if (first == null || second == null || (first === 0 && second === 0)) return null;

  // maxRanks per level: 2 if second cost exists, 1 if only first
  const maxRanks = second > 0 ? 2 : 1;
  return { first, second, maxRanks };
}

/**
 * Get weapon category priority costs for a class.
 * Returns array of 6 {first, second} pairs, one per priority slot.
 * The player assigns the 6 weapon types to these slots.
 */
export function getWeaponCategoryCosts(classIndex) {
  const couts = getData().couts;
  const coutsIdx = getCoutsIndex(classIndex);
  if (coutsIdx < 0 || coutsIdx >= couts.classes.length) return null;

  const costs = couts.classes[coutsIdx].cost_values;
  const basePos = WEAPON_SKILL_INDEX * 2; // Position 126
  const slots = [];
  for (let i = 0; i < 6; i++) {
    const pos = basePos + i * 2;
    if (pos + 1 >= costs.length) break;
    slots.push({ first: costs[pos], second: costs[pos + 1] });
  }
  return slots;
}

/**
 * Calculate how many DP it costs to buy N ranks in a skill this level.
 * 1st rank = cost.first, 2nd rank = cost.second. Max 2 per level.
 */
export function calcDevCostForRanks(cost, numRanks) {
  if (!cost || numRanks <= 0) return 0;
  let total = 0;
  if (numRanks >= 1) total += cost.first;
  if (numRanks >= 2 && cost.second > 0) total += cost.second;
  return total;
}

// Explicit list of parent skills that open sub-skill selection menus.
// These cannot receive ranks directly — you pick a specific sub-skill instead.
// Determined by RM2 rules, NOT by subskill_data (which is general metadata on most skills).
const PARENT_SKILL_INDICES = new Set([
  63,  // Compétence aux armes (Weapon Skill) — choose specific weapon
  61,  // Arts Martiaux (Martial Arts) — choose martial arts style
  136, // Linguistique (Language) — choose a language
  147, // Langages Magiques (Magical Languages) — choose a magical language
  148, // Maitrise de Sort (Spell Mastery) — choose which spell list to master
  145, // Direction de Sorts (Directed Spells) — choose directed spell type
  173, // Perception Générale (General Perception) — choose sense type
]);

// Skills that are normal (developable) but can ALSO have specializations.
// Determined by non-trivial subskill_data in competences.json (raw binary metadata).
const SPECIALIZABLE_INDICES = new Set([
  // Academic
  0,   // Administration
  1,   // Alchimie
  2,   // Anthropologie
  3,   // Architecture
  4,   // Astronomie
  5,   // Biochimie
  8,   // Doctrine Philosophique/Religieuse
  9,   // Exploitation Minière
  10,  // Héraldique
  11,  // Histoire de la race
  12,  // Ingéneurie
  13,  // Maths Avancées
  14,  // Maths de base
  15,  // Mécanique
  17,  // Navigation
  18,  // Organisation Militaire
  19,  // Physique
  20,  // Pilote de Bateau
  21,  // Planétologie
  22,  // Repérage aux Etoiles
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, // Savoirs
  35,  // Sièges
  36,  // Tactique
  37,  // Xéno-Savoir
  // Animal
  38,  // Animalerie
  39,  // Chargement
  40,  // Conduite
  41,  // Contrôle Animalier
  42,  // Dressage
  43,  // Equitation
  // Athletic
  49,  // Expression Corporelle
  56,  // Sport
  59,  // Vol
  // Combat
  60,  // Artillerie
  61,  // Arts Martiaux
  66,  // Désarmement avec Arme
  67,  // Désarmement sans Arme
  70,  // Inconscience
  77,  // Revers
  78,  // Yado
  // Deadly
  79,  // Contrôle Lycantropique
  91,  // Mouvement Adrénal Dégainer
  // General
  101, // Estimation
  102, // Evaluation des Armes
  103, // Evaluation des Armures
  104, // Evaluation des Métaux
  105, // Evaluation des Pierres
  // Gymnastic
  106, // Alimentation
  107, // Artisanat
  108, // Artisanat de la Pierre
  109, // Artisanat du Bois
  112, // Forge
  113, // Horticulture
  114, // Instrument
  115, // Jeux Tactiques
  119, // Publicité
  121, // Travail du Cuir
  // Medical
  146, // Divination
  152, // Rituel Magique
  154, 155, 156, // Savoirs spécialisés
  // Perception
  159, // Accouchement
  160, // Chirurgie
  161, // Diagnostique
  163, // Premiers Soins
  164, // Résistance aux Drogues
  165, // Secours
  // Social
  170, // Lecture des Traces
  // Subterfuge
  173, // Perception Générale
  180, // Diplomatie
  182, // Jeu
  // Survival
  189, // Corruption
  193, // Falsification
  201, // Environnement Hostile
  202, // Récupération
  // Category_15
  200, // Contacts
  203, // Savoir Régional
  205, // Survie dans la Nature
]);

/**
 * Check if a skill is a parent/container that opens sub-skill selection.
 */
export function isParentSkill(skill, globalIndex) {
  return PARENT_SKILL_INDICES.has(globalIndex);
}

/**
 * Check if a skill can have specializations (but is also developable itself).
 */
export function isSpecializableSkill(globalIndex) {
  return SPECIALIZABLE_INDICES.has(globalIndex);
}

/**
 * Suggested specialization examples per skill global index (FR).
 * Used as hint text in the specialization input prompt.
 */
const SPECIALIZATION_SUGGESTIONS_FR = {
  // Academic
  0:   'guilde, armée, temple, commerce',       // Administration
  1:   'potions, métaux, explosifs',             // Alchimie
  2:   'elfes, nains, humains, orques',          // Anthropologie
  3:   'fortifications, ponts, temples',         // Architecture
  4:   'étoiles, planètes, comètes',             // Astronomie
  5:   'plantes, poisons, animaux',              // Biochimie
  8:   'Iluvatar, Seigneur des Ténèbres, Tolaris', // Doctrine Philosophique/Religieuse
  9:   'fer, or, gemmes',                        // Exploitation Minière
  10:  'royaume de Gondor, maison Atreide',      // Héraldique
  11:  'elfes, nains, humains',                  // Histoire de la race
  12:  'hydraulique, militaire, civile',         // Ingénieurie
  13:  'algèbre, géométrie, calcul',             // Maths Avancées
  15:  'horlogerie, hydraulique, trébuchet',     // Mécanique
  17:  'fluviale, côtière, hauturière',          // Navigation
  18:  'infanterie, cavalerie, marine',          // Organisation Militaire
  19:  'mécanique, thermique, optique',          // Physique
  20:  'galère, voilier, barque',                // Pilote de Bateau
  35:  'catapulte, bélier, tour de siège',       // Sièges
  36:  'navale, siège, infanterie, cavalerie',   // Tactique
  // Animal
  38:  'chevaux, faucons, chiens de guerre',     // Animalerie
  40:  'chariot, traîneau, charrette',           // Conduite
  41:  'ours, loups, félins',                    // Contrôle Animalier
  42:  'chevaux, faucons, chiens',               // Dressage
  43:  'chevaux, destriers, griffons',           // Equitation
  // Athletic
  49:  'danse, pantomime, acrobatie',            // Expression Corporelle
  56:  'natation, lutte, course, escalade',      // Sport
  // Combat
  60:  'catapulte, baliste, trébuchet',          // Artillerie
  61:  'kara-jitsu, hrop-quen, ke-tso-fu',      // Arts Martiaux
  91:  'épée, dague, hache',                     // Mouvement Adrénal Dégainer
  // General
  101: 'bijoux, animaux, marchandises',          // Estimation
  102: 'épées, arcs, haches',                   // Evaluation des Armes
  103: 'plates, mailles, cuir',                 // Evaluation des Armures
  104: 'or, argent, fer, mithril',              // Evaluation des Métaux
  105: 'rubis, émeraudes, diamants',            // Evaluation des Pierres
  // Gymnastic / Crafts
  106: 'pâtisserie, brasserie, cuisine exotique', // Alimentation
  107: 'poterie, broderie, joaillerie',          // Artisanat
  108: 'maçonnerie, sculpture, taille',         // Artisanat de la Pierre
  109: 'menuiserie, sculpture, ébénisterie',    // Artisanat du Bois
  112: 'épées, armures, outils',                // Forge
  113: 'légumes, fleurs, herbes médicinales',   // Horticulture
  114: 'luth, flûte, harpe, tambour, violon',   // Instrument
  115: 'échecs, stratégo, go',                  // Jeux Tactiques
  121: 'selles, armures, ceintures',            // Travail du Cuir
  // Medical / Magical
  146: 'tarot, cristal, os',                    // Divination
  152: 'invocation, purification, protection',  // Rituel Magique
  160: 'amputation, trépanation, suture',       // Chirurgie
  161: 'maladies, blessures, poisons',          // Diagnostique
  163: 'blessures, brûlures, fractures',        // Premiers Soins
  // Perception / Social
  170: 'humains, animaux, monstres',            // Lecture des Traces
  180: 'commerce, traités, alliances',          // Diplomatie
  182: 'dés, cartes, dames, osselets',          // Jeu
  // Subterfuge / Survival
  193: 'documents, sceaux, pièces de monnaie', // Falsification
  200: 'marchands, guerriers, mages',           // Contacts
  201: 'Arctique, Désertique, Marécages, Montagne, Jungle', // Environnement Hostile
  202: 'blessures, empoisonnement, maladies',  // Récupération
  203: 'Gondor, Rohan, Harad, Terre du Milieu', // Savoir Régional
  205: 'Forêt, Montagne, Désert, Toundra, Jungle', // Survie dans la Nature
};

const SPECIALIZATION_SUGGESTIONS_EN = {
  0:   'guild, army, temple, commerce',
  1:   'potions, metals, explosives',
  2:   'elves, dwarves, humans, orcs',
  3:   'fortifications, bridges, temples',
  4:   'stars, planets, comets',
  5:   'plants, poisons, animals',
  8:   'Iluvatar, Lord of Darkness, Tolaris',
  9:   'iron, gold, gems',
  10:  'kingdom of Gondor, House Atreide',
  11:  'elves, dwarves, humans',
  12:  'hydraulic, military, civil',
  13:  'algebra, geometry, calculus',
  15:  'clockwork, hydraulics, trebuchet',
  17:  'river, coastal, ocean',
  18:  'infantry, cavalry, navy',
  19:  'mechanics, thermics, optics',
  20:  'galley, sailboat, rowboat',
  35:  'catapult, ram, siege tower',
  36:  'naval, siege, infantry, cavalry',
  38:  'horses, falcons, war dogs',
  40:  'cart, sled, wagon',
  41:  'bears, wolves, felines',
  42:  'horses, falcons, dogs',
  43:  'horses, destriers, griffins',
  49:  'dance, pantomime, acrobatics',
  56:  'swimming, wrestling, running, climbing',
  60:  'catapult, ballista, trebuchet',
  61:  'kara-jitsu, hrop-quen, ke-tso-fu',
  91:  'sword, dagger, axe',
  101: 'jewels, animals, goods',
  102: 'swords, bows, axes',
  103: 'plate, mail, leather',
  104: 'gold, silver, iron, mithril',
  105: 'rubies, emeralds, diamonds',
  106: 'pastry, brewing, exotic cooking',
  107: 'pottery, embroidery, jewellery',
  108: 'masonry, sculpture, cutting',
  109: 'carpentry, sculpture, cabinetmaking',
  112: 'swords, armors, tools',
  113: 'vegetables, flowers, medicinal herbs',
  114: 'lute, flute, harp, drum, violin',
  115: 'chess, stratego, go',
  121: 'saddles, armors, belts',
  146: 'tarot, crystal, bones',
  152: 'invocation, purification, protection',
  160: 'amputation, trepanation, suture',
  161: 'diseases, wounds, poisons',
  163: 'wounds, burns, fractures',
  170: 'humans, animals, monsters',
  180: 'trade, treaties, alliances',
  182: 'dice, cards, checkers, knucklebones',
  193: 'documents, seals, coins',
  200: 'merchants, warriors, mages',
  201: 'Arctic, Desert, Swamp, Mountain, Jungle',
  202: 'wounds, poisoning, disease',
  203: 'Gondor, Rohan, Harad, Middle Earth',
  205: 'Forest, Mountain, Desert, Tundra, Jungle',
};

/**
 * Get suggested specialization examples for a skill index.
 * Returns a string like "Arctique, Désertique, Marécages" or null.
 */
export function getSpecializationSuggestion(globalIndex, lang = 'fr') {
  const map = lang === 'en' ? SPECIALIZATION_SUGGESTIONS_EN : SPECIALIZATION_SUGGESTIONS_FR;
  return map[globalIndex] || null;
}

// Global index of the "Weapon Skill" parent skill
export const WEAPON_SKILL_GLOBAL_INDEX = 63;

/**
 * Get weapon subcategories for a given weapon type (1-6).
 * Returns array of {name, weapons: string[]} from monde.json.
 */
export function getWeaponSubcategories(weaponTypeIndex) {
  const monde = getData().monde;
  if (!monde || !monde.weapon_categories) return [];
  return monde.weapon_categories.filter(wc => wc.type === weaponTypeIndex);
}

/**
 * Get the weapon priority cost for a weapon type based on character's weapon priorities.
 * @param {number} classIndex - class index
 * @param {string} weaponTypeId - weapon type ID (e.g. 'edged_1h')
 * @param {(string|null)[]} weaponPriorities - character.weaponPriorities array
 * @returns {{first: number, second: number}|null}
 */
export function getWeaponSkillCost(classIndex, weaponTypeId, weaponPriorities) {
  const slotIndex = weaponPriorities.indexOf(weaponTypeId);
  if (slotIndex < 0) return null;
  const wpnCosts = getWeaponCategoryCosts(classIndex);
  if (!wpnCosts || slotIndex >= wpnCosts.length) return null;
  return wpnCosts[slotIndex];
}

/**
 * Get sub-skill options for a parent skill.
 * Returns array of {name} items the player can choose from.
 */
export function getParentSubSkillOptions(globalIndex) {
  const monde = getData().monde;
  if (!monde) return [];
  const ws = monde.world_sections || [];

  switch (globalIndex) {
    case 61: // Arts Martiaux — martial arts styles from section 56
      return (ws[56] || []).filter(s => s && s.length > 0).map(name => ({ name }));
    case 136: // Linguistique — languages from section 43
      return (ws[43] || []).map(name => ({ name: name + ' (parlé)' }))
        .concat((ws[43] || []).map(name => ({ name: name + ' (écrit)' })));
    case 147: // Langages Magiques — magical languages from section 45
      return (ws[45] || []).filter(s => s && s.length > 1).map(name => ({ name }));
    case 145: // Direction de Sorts — directed spell types from section 57
      return (ws[57] || []).map(name => ({ name }));
    case 148: // Maitrise de Sort — depends on character's known spell lists (dynamic)
      return []; // Handled in UI from character.spellLists
    case 173: // Perception Générale — 5 sens
      return [
        { name: 'Vue' },
        { name: 'Ouïe' },
        { name: 'Odorat' },
        { name: 'Toucher' },
        { name: 'Goût' },
      ];
    default:
      return [];
  }
}

/**
 * Build a flat list of all skills with global indices.
 * Also registers the Body Development skill index.
 */
export function getAllSkillsFlat() {
  const categories = getAllCategories();
  const flat = [];
  let globalIndex = 0;
  for (const cat of categories) {
    for (const skill of cat.skills) {
      flat.push({ ...skill, globalIndex, categoryName: cat.name });
      // Detect Body Development skill
      if (skill.name_en === 'Body Development' || skill.name_fr === 'Développement Corporel') {
        setBodyDevSkillIndex(globalIndex);
      }
      globalIndex++;
    }
  }
  return flat;
}

/**
 * Find the global index of a skill by English name.
 */
export function findSkillIndex(nameEn) {
  const categories = getAllCategories();
  let globalIndex = 0;
  for (const cat of categories) {
    for (const skill of cat.skills) {
      if (skill.name_en === nameEn) return globalIndex;
      globalIndex++;
    }
  }
  return -1;
}

/**
 * Get own developed ranks for a skill (all phases, NO similarity).
 * Used internally to avoid circular dependency in calcSimilarityRanks.
 */
export function getOwnDevelopedRanks(globalIndex, character) {
  return (character.skillRanksAdolescent?.[globalIndex] || 0)
       + (character.skillRanksApprenti?.[globalIndex] || 0)
       + (character.skillRanksPrior?.[globalIndex] || 0)
       + (character.skillRanksLevel?.[globalIndex] || 0);
}

/**
 * Calculate auto-granted ranks from similar skills (RM2 rule 14.1.5).
 * CPR093 graduated formula: autoRanks = floor(sourceRanks × coeff / 16)
 * coeff 8 = most similar → half ranks (RM2 standard)
 * coeff 4 = quarter ranks, coeff 2 = eighth, etc.
 *
 * Returns only the EXTRA ranks above own dev (MAX across sources, not cumulative sum).
 */
export function calcSimilarityRanks(globalIndex, character) {
  const similData = getData().skill_similarity_pairs;
  if (!similData || !similData.pairs) return 0;

  const pairs = similData.pairs.filter(p => p.from_global === globalIndex);
  if (pairs.length === 0) return 0;

  const ownRanks = getOwnDevelopedRanks(globalIndex, character);
  let bestAutoRanks = 0;

  for (const pair of pairs) {
    const sourceRanks = getOwnDevelopedRanks(pair.to_global, character);
    if (sourceRanks <= 0) continue;
    const autoRanks = Math.floor(sourceRanks * pair.coefficient / 16);
    if (autoRanks > bestAutoRanks) bestAutoRanks = autoRanks;
  }

  return Math.max(0, bestAutoRanks - ownRanks);
}

/**
 * Calculate auto-granted ranks for a weapon skill from similar weapons
 * (same weaponTypeId = same category group).
 * Rule: floor(best similar weapon's own ranks / 2), capped to not exceed own dev.
 * Non-cumulative: takes the single best source, not the sum.
 */
export function calcWeaponSimilarityRanks(wsIndex, character) {
  const weapons = character.weaponSkills || [];
  if (!weapons[wsIndex]) return 0;
  const thisWeapon = weapons[wsIndex];

  const ownRanks = (character.skillRanksAdolescent?.['wpn_' + wsIndex] || 0)
                 + (character.skillRanksApprenti?.['wpn_' + wsIndex] || 0)
                 + (character.skillRanksPrior?.['wpn_' + wsIndex] || 0)
                 + (character.skillRanksLevel?.['wpn_' + wsIndex] || 0);

  let bestSourceRanks = 0;
  for (let i = 0; i < weapons.length; i++) {
    if (i === wsIndex) continue;
    if (weapons[i].weaponTypeId !== thisWeapon.weaponTypeId) continue;
    const srcRanks = (character.skillRanksAdolescent?.['wpn_' + i] || 0)
                   + (character.skillRanksApprenti?.['wpn_' + i] || 0)
                   + (character.skillRanksPrior?.['wpn_' + i] || 0)
                   + (character.skillRanksLevel?.['wpn_' + i] || 0);
    if (srcRanks > bestSourceRanks) bestSourceRanks = srcRanks;
  }

  if (bestSourceRanks === 0) return 0;
  return Math.max(0, Math.floor(bestSourceRanks / 2) - ownRanks);
}

// === Level Bonus (Table 09-07, RM2 Option) ===
// Bonus per level by profession and skill category. Cap at level 20.

const LEVEL_BONUS_TABLE = {
  'Fighter':     { combat: 3, academic: 0, outdoor: 1, subterfuge: 0, item: 0, perception: 0, baseSpells: 0, directedSpells: 0, bodyDev: 3 },
  'Thief':       { combat: 2, academic: 0, outdoor: 1, subterfuge: 3, item: 0, perception: 1, baseSpells: 0, directedSpells: 0, bodyDev: 0 },
  'Rogue':       { combat: 3, academic: 0, outdoor: 1, subterfuge: 2, item: 0, perception: 0, baseSpells: 0, directedSpells: 0, bodyDev: 1 },
  'WarriorMonk': { combat: 2, academic: 0, outdoor: 2, subterfuge: 0, item: 0, perception: 1, baseSpells: 0, directedSpells: 0, bodyDev: 2 },
  'Magician':    { combat: 0, academic: 2, outdoor: 0, subterfuge: 0, item: 2, perception: 0, baseSpells: 1, directedSpells: 3, bodyDev: 0 },
  'Illusionist': { combat: 0, academic: 1, outdoor: 0, subterfuge: 0, item: 2, perception: 1, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Alchemist':   { combat: 0, academic: 2, outdoor: 0, subterfuge: 1, item: 3, perception: 0, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Cleric':      { combat: 1, academic: 1, outdoor: 1, subterfuge: 0, item: 1, perception: 1, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Animist':     { combat: 0, academic: 1, outdoor: 2, subterfuge: 0, item: 1, perception: 1, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Healer':      { combat: 0, academic: 1, outdoor: 0, subterfuge: 0, item: 0, perception: 1, baseSpells: 1, directedSpells: 1, bodyDev: 3 },
  'Mentalist':   { combat: 0, academic: 1, outdoor: 0, subterfuge: 0, item: 1, perception: 1, baseSpells: 2, directedSpells: 1, bodyDev: 1 },
  'LayHealer':   { combat: 0, academic: 1, outdoor: 0, subterfuge: 0, item: 1, perception: 1, baseSpells: 1, directedSpells: 1, bodyDev: 2 },
  'Seer':        { combat: 0, academic: 2, outdoor: 0, subterfuge: 0, item: 1, perception: 3, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Sorcerer':    { combat: 0, academic: 1, outdoor: 0, subterfuge: 0, item: 2, perception: 0, baseSpells: 2, directedSpells: 2, bodyDev: 0 },
  'Mystic':      { combat: 0, academic: 1, outdoor: 0, subterfuge: 1, item: 1, perception: 1, baseSpells: 2, directedSpells: 1, bodyDev: 0 },
  'Astrologer':  { combat: 0, academic: 2, outdoor: 0, subterfuge: 0, item: 2, perception: 2, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Monk':        { combat: 1, academic: 0, outdoor: 1, subterfuge: 0, item: 0, perception: 1, baseSpells: 0, directedSpells: 0, bodyDev: 2 },
  'Ranger':      { combat: 1, academic: 0, outdoor: 2, subterfuge: 1, item: 0, perception: 1, baseSpells: 0, directedSpells: 0, bodyDev: 0 },
  'Bard':        { combat: 1, academic: 1, outdoor: 0, subterfuge: 1, item: 2, perception: 1, baseSpells: 0, directedSpells: 0, bodyDev: 0 },
  'Scholar':     { combat: 0, academic: 2, outdoor: 0, subterfuge: 0, item: 1, perception: 2, baseSpells: 1, directedSpells: 1, bodyDev: 0 },
  'Civilian':    { combat: 0, academic: 2, outdoor: 1, subterfuge: 0, item: 0, perception: 1, baseSpells: 0, directedSpells: 0, bodyDev: 0 },
  'default':     { combat: 0, academic: 0, outdoor: 0, subterfuge: 0, item: 0, perception: 0, baseSpells: 0, directedSpells: 0, bodyDev: 0 },
};

const SKILL_CATEGORY_TO_BONUS_TYPE = {
  'Combat': 'combat',
  'Athletic': null,
  'Academic': 'academic',
  'Animal': 'outdoor',
  'General': null,
  'Gymnastic': null,
  'Medical': null,
  'Perception': 'perception',
  'Social': null,
  'Subterfuge': 'subterfuge',
  'Survival': 'outdoor',
  'Deadly': null,
  'Evaluation': null,
  'Linguistic': null,
  'Magical': 'item',
  'Category_15': 'outdoor',
};

function getLevelBonusProfile(cls) {
  if (!cls) return LEVEL_BONUS_TABLE['default'];

  // 1. Cas nommés prioritaires (noms composés ambigus, détection par nom)
  const lc = (cls.name_en || '').toLowerCase();
  if (lc.includes('warrior monk') || lc.includes('high warrior monk') ||
      (lc.includes('warrior') && lc.includes('monk'))) return LEVEL_BONUS_TABLE['WarriorMonk'];
  if (lc.includes('ranger') || lc.includes('rôdeur') || lc.includes('rodeur'))
    return LEVEL_BONUS_TABLE['Ranger'];
  if (lc.includes('bard') || lc.includes('barde'))
    return LEVEL_BONUS_TABLE['Bard'];

  // 2. Dispatch principal par spell_user_code (champ fiable dans classes.json)
  // spell_user_code: 1=combattant, 2=semi-combat, 3=semi-mage mental,
  //   4=semi-mage théurgie, 5=mage pur, 6=hybride combat/magie,
  //   7=hybride spécial, 8=mage avancé, 9=mage noir, 11=civil non-mage
  const suc = cls.spell_user_code || 0;
  // realm_code: 3,10=Théurgie, 5,9=Essence, 7,8=Mentalisme/Essence/Mental
  const realm = cls.realm_code || 0;
  const isChanneling = (realm === 3 || realm === 10);
  const isEssence    = (realm === 5 || realm === 9);
  const isMentalism  = (realm === 7 || realm === 8);

  switch (suc) {
    case 1:  // Combattants purs
      return LEVEL_BONUS_TABLE['Fighter'];
    case 2:  // Semi-combattants (Thief, Rogue, Sailor, Burglar…)
      return LEVEL_BONUS_TABLE['Thief'];
    case 3:  // Semi-mages (Monk, Mentalist, LayHealer, Seer)
      if (isMentalism) return LEVEL_BONUS_TABLE['Mentalist'];
      return LEVEL_BONUS_TABLE['Monk'];
    case 4:  // Semi-mages théurgie/channeling (Cleric, Animist, Shaman, Druid)
      if (isChanneling) return LEVEL_BONUS_TABLE['Animist'];
      return LEVEL_BONUS_TABLE['Cleric'];
    case 5:  // Mages purs (Magician, Alchemist, Scholar/Erudit, Conjuror…)
      // Scholar/Erudit a realm_code=10 (Théurgie) → profil Scholar enrichi
      if (isChanneling) return LEVEL_BONUS_TABLE['Scholar'];
      if (isEssence)    return LEVEL_BONUS_TABLE['Magician'];
      if (isMentalism)  return LEVEL_BONUS_TABLE['Mentalist'];
      return LEVEL_BONUS_TABLE['Magician'];
    case 6:  // Hybrides combat/magie (WarriorMage, Beastmaster, Paladin, Noble…)
      return LEVEL_BONUS_TABLE['Cleric'];
    case 7:  // Hybrides spéciaux (rares)
      return LEVEL_BONUS_TABLE['Bard'];
    case 8:  // Mages avancés (Enchanter, Mystic, Warlock, DreamLord…)
      return LEVEL_BONUS_TABLE['Mystic'];
    case 9:  // Mages noirs/chaos (Sorcerer, Necromancer, Witch…)
      return LEVEL_BONUS_TABLE['Sorcerer'];
    case 10: // Hybride magique avancé (rare)
      return LEVEL_BONUS_TABLE['Mystic'];
    case 11: // Non-mages civils (Craftsman, Professional, No Profession)
      return LEVEL_BONUS_TABLE['Civilian'];
    default:
      return LEVEL_BONUS_TABLE['default'];
  }
}

let _bodyDevIdx = -1;

/**
 * Get level bonus for a skill.
 * @param {object} cls - class object
 * @param {number} level - character level (capped at 20)
 * @param {string} categoryName - skill category name (e.g. 'Combat')
 * @param {number} skillIndex - global skill index
 * @returns {number} level bonus
 */
export function getLevelBonus(cls, level, categoryName, skillIndex) {
  const profile = getLevelBonusProfile(cls);
  const cappedLevel = Math.min(level, 20);

  // Special case: Body Development
  if (_bodyDevIdx < 0) { _bodyDevIdx = findSkillIndex('Body Development'); }
  if (skillIndex === _bodyDevIdx) return (profile.bodyDev || 0) * cappedLevel;

  // Determine bonus type from category
  const bonusType = SKILL_CATEGORY_TO_BONUS_TYPE[categoryName];
  if (!bonusType || !profile[bonusType]) return 0;
  return profile[bonusType] * cappedLevel;
}

// ============================================================
// WEAPON STAT BONUS — par weaponType (RM2 table 12-1)
// Exporté pour wizard.js qui ne peut pas appeler skill-compute.js
// ============================================================

const _WEAPON_TYPE_STAT_INDICES = {
  1: [2, 6],    // AG / FO  — 1 main tranchant/estoc
  2: [6, 2],    // FO / AG  — 1 main contondant/chaînes
  3: [6, 6, 2], // FO/FO/AG — 2 mains
  4: [6, 6, 2], // FO/FO/AG — armes d'hast
  5: [2, 6],    // AG / FO  — missiles / arcs
  6: [2, 6],    // AG / FO  — de jet / divers
};

/**
 * Calcule le bonus de stat d'une arme selon son weaponType.
 * Remplace calcSkillStatBonusTotal(parentSkill, char) pour les armes dans wizard.js.
 * @param {Object} wpn — character.weaponSkills[ws] : { weaponType, ... }
 * @param {Object} character
 * @returns {number}
 */
export function calcWeaponStatBonus(wpn, character) {
  const indices = _WEAPON_TYPE_STAT_INDICES[wpn?.weaponType] || [2, 6]; // fallback AG/FO
  if (indices.length === 1) return getTotalStatBonus(character, indices[0] - 1);
  let sum = 0;
  for (const i of indices) sum += getTotalStatBonus(character, i - 1);
  return Math.floor(sum / indices.length);
}

/**
 * Retourne le label stat d'une arme selon son weaponType (ex: "Ag/Fo", "Fo/Fo/Ag").
 */
export function getWeaponStatLabel(wpn) {
  const ABBREVS = ['Co','Ag','AD','Mé','Ra','Fo','Rp','Pr','Em','In'];
  const indices = _WEAPON_TYPE_STAT_INDICES[wpn?.weaponType] || [2, 6];
  return indices.map(i => ABBREVS[i - 1]).join('/');
}
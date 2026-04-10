// skill-compute.js — Single authoritative skill computation
// All bonus calculations happen HERE. Print, PDF, wizard consume the result.

import { getAllCategories, getSkillName, getSkillDevCost, getSkillStatIndices,
         getLevelBonus, isParentSkill, WEAPON_SKILL_GLOBAL_INDEX } from './skills.js';
import { getRankBonus } from './stats.js';
import { getTotalRanks, getTotalStatBonus, ARMOR_MANEUVER_PENALTIES,
         isMovingSkill, getBodyDevSkillIndex } from './character.js';
import { getAllClasses } from './classes.js';
import { getBackgroundBonuses, getSkillBackgroundBonus,
         applyBgCostModifiers } from './background-effects.js';

const STAT_ABBREVS = ['Co','Ag','AD','Mé','Ra','Fo','Rp','Pr','Em','In'];

const CAT_NAMES_FR = {
  'Academic': 'Savoir', 'Animal': 'Animaux', 'Athletic': 'Athlétique',
  'Combat': 'Combat', 'Deadly': 'Contrôle de Soi', 'Evaluation': 'Attaques Spéciales',
  'General': 'Évaluation', 'Gymnastic': 'Artisanat', 'Linguistic': 'Gymnastique',
  'Magical': 'Communication', 'Medical': 'Magie', 'Perception': 'Médecine',
  'Social': 'Perception', 'Subterfuge': 'Influence', 'Survival': 'Subterfuge',
  'Category_15': 'Survie/Extérieur',
};

/**
 * Compute stat bonus for a skill given its stat indices.
 * Uses getTotalStatBonus which includes normal + race + special + bg mods.
 * This is THE canonical skill stat bonus calculation.
 */
function calcStatBonus(statIndices, character) {
  if (!statIndices || statIndices.length === 0) return 0;
  if (statIndices.length === 1) return getTotalStatBonus(character, statIndices[0] - 1);
  let sum = 0;
  for (const idx of statIndices) sum += getTotalStatBonus(character, idx - 1);
  return Math.floor(sum / statIndices.length);
}

/**
 * Stat indices (1-based) par type d'arme RM2.
 * Source : Character Law table 12-1, Arms Law.
 *   1 = 1 main tranchant/estoc  → AG/FO       = [2, 6]
 *   2 = 1 main contondant       → FO/AG        = [6, 2]
 *   3 = 2 mains                 → FO/FO/AG     = [6, 6, 2]
 *   4 = Armes d'hast            → FO/FO/AG     = [6, 6, 2]
 *   5 = Missiles / Arcs         → AG/FO        = [2, 6]
 *   6 = De jet / Divers         → AG/FO        = [2, 6]
 */
const WEAPON_TYPE_STAT_INDICES = {
  1: [2, 6],
  2: [6, 2],
  3: [6, 6, 2],
  4: [6, 6, 2],
  5: [2, 6],
  6: [2, 6],
};
const WEAPON_STAT_FALLBACK = [2, 6];

function getWeaponStatIndices(wpn) {
  return WEAPON_TYPE_STAT_INDICES[wpn?.weaponType] || WEAPON_STAT_FALLBACK;
}

function getWeaponStatLabel(wpn) {
  return getWeaponStatIndices(wpn).map(i => STAT_ABBREVS[i - 1]).join('/');
}

/**
 * Get ALL computed skills with full bonus breakdown.
 * This is the single authoritative function. Print, PDF, and wizard consume this.
 *
 * @param {Object} character
 * @param {string} lang - 'fr' or 'en'
 * @returns {Object[]} array of skill rows, each with:
 *   { name, categoryName, isCategory, isParent, isSubSkill, isWeapon,
 *     globalIndex, totalRanks, rankBonus, statBonus, lvlBonus,
 *     miscBonus, armorPenalty, similRanks, total,
 *     costStr, highlight, textColor, bold }
 */
export function getComputedSkills(character, lang = 'fr', includeAll = false) {
  const categories = getAllCategories();
  const classes = getAllClasses();
  const cls = character.classIndex >= 0 ? classes[character.classIndex] : null;
  const bgBonuses = getBackgroundBonuses(character);
  const result = [];
  let globalIndex = 0;

  for (const cat of categories) {
    const catName = lang === 'en' ? cat.name : (CAT_NAMES_FR[cat.name] || cat.name);
    let catPushed = false;

    for (const skill of cat.skills) {
      const isParent_ = isParentSkill(skill, globalIndex);
      const statIndices = getSkillStatIndices(skill);
      const totalRanks = getTotalRanks(character, globalIndex);
      const rankBonus = getRankBonus(totalRanks);
      const statBonus = calcStatBonus(statIndices, character);
      // Elven AD rule: for elves with negative racial AD (raceBonuses[2] < 0),
      // flip that malus to a bonus in Combat & Survival categories where AD (idx 3) is a modifier.
      const adRacial = character.raceBonuses[2] || 0;
      const elvenAdBonus = (adRacial < 0 && statIndices.includes(3) &&
        (cat.name === 'Combat' || cat.name === 'Survival'))
        ? Math.floor(-2 * adRacial / statIndices.length) : 0;
      const lvlBonus = getLevelBonus(cls, character.level, cat.name, globalIndex);
      const miscManual = character.skillMiscBonuses[globalIndex] || 0;
      const bgSkillBonus = getSkillBackgroundBonus(bgBonuses,
        skill.name_fr || skill.name, skill.name_en);
      const armorMM = ARMOR_MANEUVER_PENALTIES[(character.armorType || 1) - 1] || 0;
      const armorMagic = character.armorMagicBonus || 0;
      const armorPenalty = isMovingSkill(skill) ? Math.min(0, armorMM + armorMagic) : 0;
      const similRanks = character.skillRanksSimil?.[globalIndex] || 0;
      const total = rankBonus + statBonus + elvenAdBonus + lvlBonus + miscManual + bgSkillBonus + armorPenalty;
      let cost = getSkillDevCost(character.classIndex, globalIndex);
      cost = applyBgCostModifiers(bgBonuses, cost, globalIndex, skill, getBodyDevSkillIndex(), cat.name);
      const costStr = cost ? (cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`) : '—';

      // Push category header on first included skill
      if (!catPushed && (includeAll || totalRanks > 0 || total > 0 || isParent_)) {
        result.push({ isCategory: true, name: catName, categoryName: catName });
        catPushed = true;
      }

      // Push the skill itself
      if (includeAll || totalRanks > 0 || total > 0 || isParent_) {
        result.push({
          name: getSkillName(skill, lang), categoryName: catName,
          globalIndex, isParent: isParent_, isSubSkill: false,
          totalRanks, rankBonus, statBonus: statBonus + elvenAdBonus, lvlBonus,
          miscBonus: miscManual + bgSkillBonus, armorPenalty, similRanks,
          total, costStr,
          statLabel: statIndices.map(i => STAT_ABBREVS[i - 1]).join('/'),
          highlight: (character.skillHighlights || {})[globalIndex] || null,
          textColor: (character.skillTextColors || {})[globalIndex] || null,
          bold: (character.skillBold || {})[globalIndex] || false,
        });
      }

      // === WEAPONS — use parent skill's stat indices ===
      if (globalIndex === WEAPON_SKILL_GLOBAL_INDEX) {
        for (let ws = 0; ws < (character.weaponSkills || []).length; ws++) {
          const wpn = character.weaponSkills[ws];
          const wsKey = 'wpn_' + ws;
          let wRanks = getTotalRanks(character, wsKey);
          // Weapon mastery 3-per-2: chosen weapon gains 1 bonus rank per 2 bought
          if (bgBonuses.weaponMastery && bgBonuses.weaponMastery.mode === '3_per_2'
              && bgBonuses.weaponMastery.weaponIndex === ws) {
            const bonusRanks = Math.floor(wRanks / 2);
            wRanks += bonusRanks;
          }
          const wRankB = getRankBonus(wRanks);
          // Each weapon uses its OWN stat indices based on weaponType (RM2 rule)
          const wStatIndices = getWeaponStatIndices(wpn);
          const wStatB = calcStatBonus(wStatIndices, character);
          const wMisc = character.skillMiscBonuses[wsKey] || 0;
          const wBgB = getSkillBackgroundBonus(bgBonuses, wpn.name, wpn.name);
          // Elven AD rule: applies only if AD (index 3) is in this weapon's stat indices
          const wElvenAdBonus = (adRacial < 0 && wStatIndices.includes(3))
            ? Math.floor(-2 * adRacial / wStatIndices.length) : 0;
          const wTotal = wRankB + wStatB + wElvenAdBonus + lvlBonus + wMisc + wBgB;
          // Other-weapon cost multiplier: non-mastery weapons cost more
          let wCost = wpn.cost;
          if (bgBonuses.otherWeaponCostMultiplier !== 1 && bgBonuses.weaponMastery
              && bgBonuses.weaponMastery.weaponIndex !== null && ws !== bgBonuses.weaponMastery.weaponIndex) {
            wCost = wCost ? {
              first: Math.ceil(wCost.first * bgBonuses.otherWeaponCostMultiplier),
              second: wCost.second > 0 ? Math.ceil(wCost.second * bgBonuses.otherWeaponCostMultiplier) : 0,
            } : null;
          }
          if (wRanks > 0 || wTotal > 0) {
            result.push({
              name: '  ↳ ' + wpn.name, categoryName: catName,
              globalIndex: wsKey, isParent: false, isSubSkill: true,
              isWeapon: true, weaponIndex: ws,
              totalRanks: wRanks, rankBonus: wRankB, statBonus: wStatB + wElvenAdBonus,
              lvlBonus, miscBonus: wMisc + wBgB, armorPenalty: 0,
              similRanks: 0, total: wTotal,
              costStr: wCost ? `${wCost.first}/${wCost.second}` : '—',
              statLabel: getWeaponStatLabel(wpn),
              highlight: (character.skillHighlights || {})[wsKey] || null,
              textColor: (character.skillTextColors || {})[wsKey] || null,
              bold: (character.skillBold || {})[wsKey] || false,
            });
          }
        }
      }

      // === GENERIC SUB-SKILLS — custom stats or inherit parent ===
      const parentSubs = (character.subSkills || []).filter(s => s.parentIndex === globalIndex);
      for (let si = 0; si < parentSubs.length; si++) {
        const sub = parentSubs[si];
        const subKey = 'sub_' + globalIndex + '_' + si;
        const sRanks = getTotalRanks(character, subKey);
        const sRankB = getRankBonus(sRanks);
        // Use sub's own statIndices if defined, otherwise inherit from parent skill.
        // Note: sub.statIndices uses 1-based indices like skill statIndices.
        const sStatIndices = (sub.statIndices && sub.statIndices.length > 0)
          ? sub.statIndices
          : statIndices; // statIndices already computed for parent skill above
        const sStatB = calcStatBonus(sStatIndices, character);
        const sMisc = character.skillMiscBonuses[subKey] || 0;
        const sTotal = sRankB + sStatB + lvlBonus + sMisc;
        // includeAll: always include sub-skills so buildComputedMap has full coverage
        if (includeAll || sRanks > 0 || sTotal > 0) {
          result.push({
            name: '  ↳ ' + sub.name, categoryName: catName,
            globalIndex: subKey, isParent: false, isSubSkill: true,
            totalRanks: sRanks, rankBonus: sRankB, statBonus: sStatB,
            lvlBonus, miscBonus: sMisc, armorPenalty: 0,
            similRanks: 0, total: sTotal,
            costStr: sub.cost ? `${sub.cost.first}/${sub.cost.second || ''}` : '—',
            statLabel: sStatIndices.map(i => STAT_ABBREVS[i - 1]).join('/'),
            highlight: (character.skillHighlights || {})[subKey] || null,
            textColor: (character.skillTextColors || {})[subKey] || null,
            bold: (character.skillBold || {})[subKey] || false,
          });
        }
      }

      globalIndex++;
    } // end skill loop
  } // end category loop

  return result;
}

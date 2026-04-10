// background-effects.js — Applies background option effects to character
// No UI dependency — pure engine logic
// Created: Batch 19

import { getStatBonus } from './stats.js';

/**
 * Stat abbreviation mapping: effect key → character.stats index (0-based)
 * CPR093 order: CO(0), AG(1), AD(2), ME(3), RS(4), FO(5), RP(6), PR(7), EM(8), IN(9)
 * RM2 standard: CO, AG, SD, ME, RE, ST, QU, PR, EM, IN
 */
const STAT_KEY_TO_INDEX = {
  'CO': 0, 'AG': 1, 'SD': 2, 'AD': 2, 'ME': 3,
  'RE': 4, 'RS': 4, 'ST': 5, 'FO': 5, 'QU': 6, 'RP': 6,
  'PR': 7, 'EM': 8, 'IN': 9,
};

/**
 * Skill effect key → possible PWA skill names (FR/EN)
 * Used to match effect keys like "stalk_hide" to actual skill names in competences.json
 */
export const SKILL_EFFECT_MAP = {
  'stalk_hide': ['Pistage/Camouflage', 'Stalk/Hide', 'Pistage', 'Camouflage'],
  'riding': ['Équitation', 'Riding', 'Equitation'],
  'adrenal_moves': ['Contrôle Adrénalin', 'Adrenal Moves', 'Mouvements Adrenalin'],
  'singing': ['Chant', 'Singing'],
  'leadership': ['Commandement', 'Leadership'],
  'navigation': ['Navigation'],
  'meditation': ['Méditation', 'Meditation'],
  'staves_wands': ['Baguettes/Bâtons', 'Staves & Wands', 'Baguettes'],
  'runes': ['Runes'],
  'ambush': ['Embuscade', 'Ambush'],
  'perception': ['Perception', 'Perception Générale'],
};

/**
 * Compute aggregated background bonuses from all chosen options.
 * Called on every render — keep it fast.
 *
 * @param {Object} character
 * @returns {Object} bonuses
 */
export function getBackgroundBonuses(character) {
  const opts = character.backgroundOptions?.options || [];
  const talents = character.backgroundOptions?.companionIIITalents || [];

  const bonuses = {
    statBonusMods: [0,0,0,0,0,0,0,0,0,0],
    skillBonuses: {},       // { effectKey: value }
    perceptionBonuses: {},  // { sense: value }
    bgSkillRanks: {},       // { globalIndex: bonusRanks }
    skillCostOverrides: {}, // { globalIndex: multiplier }
    languageCostMultiplier: 1,
    experienceMultiplier: 1,
    // Weapon mastery (Batch 40)
    weaponMastery: null,
    otherWeaponCostMultiplier: 1,
    weaponCategoryMastery: false,
    ambidextrous: false,
    // PP / Spell
    ppBonus: 0,
    ppPerLevel: 0,
    ppMultiplier: 1,
    spellAdder: 0,
    // Combat derived
    dbBonus: 0,
    obBonus: 0,
    obPenalty: 0,
    rrBonus: 0,
    rrBonusVsMind: 0,
    maxHpMultiplier: 1,
    bodyDevCostMultiplier: 1,
    armorCostMultiplier: 1,
    ambushCostMultiplier: 1,
    // Combat multipliers (Batch 41 Group 2)
    bleedingMultiplier: 1,
    healingMultiplier: 1,
    fumbleRangeMultiplier: 1,
    unconsciousThresholdMultiplier: 1,
    critSeverityReduction: 0,
    critSeverityBonus: 0,
    meleeConcussionMultiplier: 1,
    missileConcussionMultiplier: 1,
    naturalArmorType: 0,
    movementMultiplier: 1,
    encumbranceMultiplier: 1,
    bowRangeMultiplier: 1,
    missileRangeMultiplier: 1,
    parryBonus: 0,
    // Combat behavior flags (Batch 41 Group 3)
    actsOnePhaseEarlier: false,
    fspPenalty: 0,
    surpriseRoundNegation: 0,
    antiFlankThreshold: 0,
    weaponReadyBonus: 0,
    weaponKataPenaltyMultiplier: 1,
    multipleAttackPenaltyMultiplier: 1,
    // Spell effects (Batch 42)
    spellFailurePenalty: 0,
    spellAttackBonus: 0,
    noArmorSpellPenalty: false,
    castingTimeReduction: 0,
    spellHpCost: 0,
    spellLevelThreshold: Infinity,
    friendlyFire: false,
    concentrationPersist: false,
    learnAnyListMaxLvl: 0,
    learnEvilListMaxLvl: 0,
    arcaneAsBase: false,
    noFailureLists: 0,
    psionicPP: false,
    // Wealth / misc
    gold: 0,
    gems: [],
    incomeMonthly: 0,
    initiativeBonus: 0,
    stunReduction: 0,
    specialAbilities: [],
    narrativeFlags: [],
    unresolvedChoices: [],
    innateTalents: [],
  };

  opts.forEach((opt, idx) => {
    if (!opt || !opt.effects) return;
    const eff = opt.effects;
    const resolved = opt.resolved || {};

    // --- Stat bonuses (modify derived bonus, NOT raw stat) ---
    if (eff.stat_bonus && typeof eff.stat_bonus === 'object') {
      if ('choice' in eff.stat_bonus) {
        if (resolved.stat_choice) {
          const si = STAT_KEY_TO_INDEX[resolved.stat_choice];
          if (si !== undefined) bonuses.statBonusMods[si] += eff.stat_bonus.choice;
        } else {
          bonuses.unresolvedChoices.push({
            optionIndex: idx, choiceType: 'stat',
            effectKey: 'stat_bonus', value: eff.stat_bonus.choice,
          });
        }
      } else {
        for (const [key, val] of Object.entries(eff.stat_bonus)) {
          const si = STAT_KEY_TO_INDEX[key];
          if (si !== undefined) bonuses.statBonusMods[si] += val;
        }
      }
    }

    // --- Skill bonuses ---
    if (eff.skill_bonus !== undefined) {
      if (typeof eff.skill_bonus === 'object') {
        for (const [skill, val] of Object.entries(eff.skill_bonus)) {
          bonuses.skillBonuses[skill] = (bonuses.skillBonuses[skill] || 0) + val;
        }
      } else if (typeof eff.skill_bonus === 'number') {
        if (resolved.skill_choice) {
          const key = resolved.skill_choice;
          bonuses.skillBonuses[key] = (bonuses.skillBonuses[key] || 0) + eff.skill_bonus;
        } else {
          bonuses.unresolvedChoices.push({
            optionIndex: idx, choiceType: 'skill',
            effectKey: 'skill_bonus', value: eff.skill_bonus,
            skillType: eff.skill_type,
          });
        }
      }
    }

    // --- Perception sub-bonuses ---
    if (eff.perception_bonus) {
      for (const [sense, val] of Object.entries(eff.perception_bonus)) {
        bonuses.perceptionBonuses[sense] = (bonuses.perceptionBonuses[sense] || 0) + val;
      }
    }

    // --- Power Points ---
    if (eff.spell_adder) bonuses.spellAdder += eff.spell_adder;
    if (eff.pp_bonus) bonuses.ppBonus += eff.pp_bonus;
    if (eff.pp_per_level) bonuses.ppPerLevel += eff.pp_per_level;
    if (eff.pp_multiplier) bonuses.ppMultiplier *= eff.pp_multiplier;

    // --- DB / OB ---
    if (eff.db_bonus) bonuses.dbBonus += eff.db_bonus;
    if (eff.ob_bonus) bonuses.obBonus += eff.ob_bonus;
    if (eff.ob_penalty) bonuses.obPenalty += eff.ob_penalty;
    if (eff.ob_db_bonus) {
      bonuses.dbBonus += eff.ob_db_bonus;
      bonuses.obBonus += eff.ob_db_bonus;
    }

    // --- Resistance Rolls ---
    if (eff.rr_bonus) bonuses.rrBonus += eff.rr_bonus;
    if (eff.rr_bonus_vs_mind) bonuses.rrBonusVsMind += eff.rr_bonus_vs_mind;

    // --- Hit Points ---
    if (eff.max_hp_multiplier) bonuses.maxHpMultiplier *= eff.max_hp_multiplier;
    if (eff.body_dev_cost_multiplier)
      bonuses.bodyDevCostMultiplier = Math.min(bonuses.bodyDevCostMultiplier, eff.body_dev_cost_multiplier);

    // --- Dev Cost modifiers ---
    if (eff.armor_cost_multiplier)
      bonuses.armorCostMultiplier = Math.min(bonuses.armorCostMultiplier, eff.armor_cost_multiplier);
    if (eff.ambush_cost_multiplier)
      bonuses.ambushCostMultiplier = Math.min(bonuses.ambushCostMultiplier, eff.ambush_cost_multiplier);
    if (eff.language_cost_multiplier)
      bonuses.languageCostMultiplier = Math.min(bonuses.languageCostMultiplier, eff.language_cost_multiplier);
    if (eff.experience_multiplier)
      bonuses.experienceMultiplier *= eff.experience_multiplier;

    // --- Per-skill cost overrides (Mémoire Procédurale) ---
    if (eff.skill_cost_multiplier_choice) {
      const count = eff.skill_choice_count || 1;
      const targets = resolved.skill_cost_targets || [];
      if (targets.length >= count) {
        for (const t of targets) {
          bonuses.skillCostOverrides[t] = Math.min(
            bonuses.skillCostOverrides[t] || 1,
            eff.skill_cost_multiplier_choice
          );
        }
      } else {
        bonuses.unresolvedChoices.push({
          optionIndex: idx, choiceType: 'skill_cost',
          effectKey: 'skill_cost_multiplier_choice',
          value: eff.skill_cost_multiplier_choice,
          count,
        });
      }
    }

    // --- Wealth ---
    if (eff.gold) bonuses.gold += eff.gold;
    if (eff.gems) bonuses.gems.push(eff.gems);
    if (eff.income_monthly) bonuses.incomeMonthly += eff.income_monthly;

    // --- Initiative & Stun ---
    if (eff.initiative_bonus) bonuses.initiativeBonus += eff.initiative_bonus;
    if (eff.stun_resistance) bonuses.stunReduction += eff.stun_resistance;
    if (eff.stun_reduction) bonuses.stunReduction += eff.stun_reduction;

    // --- Special abilities (flags) ---
    if (eff.special_ability) bonuses.specialAbilities.push(eff.special_ability);

    // --- Weapon mastery (Batch 40) ---
    if (eff.weapon_rank_bonus) {
      bonuses.weaponMastery = {
        mode: eff.weapon_rank_bonus,
        weaponIndex: resolved.weapon_mastery_choice ?? null,
      };
      if (resolved.weapon_mastery_choice === undefined || resolved.weapon_mastery_choice === null) {
        bonuses.unresolvedChoices.push({
          optionIndex: idx, choiceType: 'weapon_mastery',
          effectKey: 'weapon_rank_bonus',
        });
      }
    }
    if (eff.other_weapon_cost_multiplier)
      bonuses.otherWeaponCostMultiplier = eff.other_weapon_cost_multiplier;
    if (eff.weapon_category_mastery) bonuses.weaponCategoryMastery = true;
    if (eff.ambidextrous) bonuses.ambidextrous = true;

    // --- Combat multipliers (Batch 41 Group 2) ---
    if (eff.bleeding_multiplier) bonuses.bleedingMultiplier *= eff.bleeding_multiplier;
    if (eff.healing_multiplier) bonuses.healingMultiplier = Math.max(bonuses.healingMultiplier, eff.healing_multiplier);
    if (eff.fumble_range_multiplier) bonuses.fumbleRangeMultiplier *= eff.fumble_range_multiplier;
    if (eff.unconscious_threshold_multiplier) bonuses.unconsciousThresholdMultiplier *= eff.unconscious_threshold_multiplier;
    if (eff.critical_severity_reduction) bonuses.critSeverityReduction += eff.critical_severity_reduction;
    if (eff.critical_severity_bonus) bonuses.critSeverityBonus += eff.critical_severity_bonus;
    if (eff.melee_concussion_multiplier) bonuses.meleeConcussionMultiplier = Math.max(bonuses.meleeConcussionMultiplier, eff.melee_concussion_multiplier);
    if (eff.missile_concussion_multiplier) bonuses.missileConcussionMultiplier = Math.max(bonuses.missileConcussionMultiplier, eff.missile_concussion_multiplier);
    if (eff.natural_armor_type) bonuses.naturalArmorType = Math.max(bonuses.naturalArmorType, eff.natural_armor_type);
    if (eff.movement_multiplier) bonuses.movementMultiplier = Math.max(bonuses.movementMultiplier, eff.movement_multiplier);
    if (eff.encumbrance_multiplier) bonuses.encumbranceMultiplier = Math.min(bonuses.encumbranceMultiplier, eff.encumbrance_multiplier);
    if (eff.bow_range_multiplier) bonuses.bowRangeMultiplier *= eff.bow_range_multiplier;
    if (eff.missile_range_multiplier) bonuses.missileRangeMultiplier *= eff.missile_range_multiplier;
    if (eff.parry_bonus) bonuses.parryBonus += eff.parry_bonus;

    // --- Combat behavior flags (Batch 41 Group 3) ---
    if (eff.acts_one_phase_earlier) { bonuses.actsOnePhaseEarlier = true; bonuses.fspPenalty += (eff.fsp_penalty || -30); }
    if (eff.surprise_round_negation) bonuses.surpriseRoundNegation += eff.surprise_round_negation;
    if (eff.anti_flank_under_opponents) bonuses.antiFlankThreshold = Math.max(bonuses.antiFlankThreshold, eff.anti_flank_under_opponents);
    if (eff.weapon_ready_bonus) bonuses.weaponReadyBonus += eff.weapon_ready_bonus;
    if (eff.weapon_kata_penalty_multiplier !== undefined) bonuses.weaponKataPenaltyMultiplier = Math.min(bonuses.weaponKataPenaltyMultiplier, eff.weapon_kata_penalty_multiplier);
    if (eff.multiple_attack_penalty_multiplier) bonuses.multipleAttackPenaltyMultiplier = Math.min(bonuses.multipleAttackPenaltyMultiplier, eff.multiple_attack_penalty_multiplier);

    // --- Spell effects (Batch 42) ---
    if (eff.spell_failure_penalty) bonuses.spellFailurePenalty += eff.spell_failure_penalty;
    if (eff.spell_attack_bonus) bonuses.spellAttackBonus += eff.spell_attack_bonus;
    if (eff.no_armor_spell_penalty) bonuses.noArmorSpellPenalty = true;
    if (eff.casting_time_reduction) bonuses.castingTimeReduction += eff.casting_time_reduction;
    if (eff.spell_hp_cost) { bonuses.spellHpCost = eff.spell_hp_cost; bonuses.spellLevelThreshold = eff.spell_level_threshold || 8; }
    if (eff.friendly_fire) bonuses.friendlyFire = true;
    if (eff.concentration_persist) bonuses.concentrationPersist = true;
    if (eff.learn_any_list) bonuses.learnAnyListMaxLvl = Math.max(bonuses.learnAnyListMaxLvl, eff.learn_any_list);
    if (eff.learn_evil_list) bonuses.learnEvilListMaxLvl = Math.max(bonuses.learnEvilListMaxLvl, eff.learn_evil_list);
    if (eff.arcane_as_base) bonuses.arcaneAsBase = true;
    if (eff.no_spell_failure_on_list) bonuses.noFailureLists += eff.no_spell_failure_on_list;
    if (eff.psionic_pp) bonuses.psionicPP = true;

    // --- Narrative flags ---
    if (eff.social)
      bonuses.narrativeFlags.push({ type: 'social', value: eff.social, source: opt.name_fr || opt.name });
    if (eff.restriction)
      bonuses.narrativeFlags.push({ type: 'restriction', value: eff.restriction, source: opt.name_fr || opt.name });
    if (eff.immunity)
      bonuses.narrativeFlags.push({ type: 'immunity', value: eff.immunity, source: opt.name_fr || opt.name });
    if (eff.status)
      bonuses.narrativeFlags.push({ type: 'status', value: eff.status, source: opt.name_fr || opt.name });

    // --- Stat increase: Set Option #5 (+2/1 or +1/3) ---
    // This is the ONLY effect that modifies raw stat values
    if (eff.stat_increase === '2_or_1x3') {
      if (!resolved.stat_increase_mode || !resolved.stat_increase_targets) {
        bonuses.unresolvedChoices.push({
          optionIndex: idx, choiceType: 'stat_increase',
          effectKey: 'stat_increase',
        });
      }
      // Actual stat modification is done in resolveStatIncrease()
    }

    // --- Language rank ---
    if (eff.language_rank) {
      if (resolved.language_name) {
        bonuses.skillBonuses[`lang_${resolved.language_name}`] = eff.language_rank;
      } else {
        bonuses.unresolvedChoices.push({
          optionIndex: idx, choiceType: 'language',
          effectKey: 'language_rank', value: eff.language_rank,
        });
      }
    }

    // --- Skill ranks (Set Option #6) ---
    if (eff.skill_ranks) {
      if (resolved.skill_ranks_target !== undefined && resolved.skill_ranks_target !== null) {
        const targetIdx = resolved.skill_ranks_target;
        bonuses.bgSkillRanks[targetIdx] = (bonuses.bgSkillRanks[targetIdx] || 0) + eff.skill_ranks;
      } else {
        bonuses.unresolvedChoices.push({
          optionIndex: idx, choiceType: 'skill_ranks',
          effectKey: 'skill_ranks', value: eff.skill_ranks,
          skillType: eff.skill_type,
        });
      }
    }
  }); // end opts.forEach

  // --- Companion III talents ---
  talents.forEach(t => {
    bonuses.innateTalents.push({
      name: t.name, tier: t.pickTier, stat: t.statIndex,
    });
  });

  return bonuses;
}

/**
 * Resolve a pending choice for a background option.
 * Stores the resolution in opt.resolved and returns true if successful.
 *
 * @param {Object} character
 * @param {number} optionIndex - index in backgroundOptions.options[]
 * @param {Object} resolution - e.g. { stat_choice: 'AG' } or { skill_choice: 'stalk_hide' }
 * @returns {boolean}
 */
export function resolveBackgroundChoice(character, optionIndex, resolution) {
  const opt = character.backgroundOptions?.options?.[optionIndex];
  if (!opt) return false;
  if (!opt.resolved) opt.resolved = {};
  Object.assign(opt.resolved, resolution);
  return true;
}

/**
 * Apply stat increase (Set Option #5): +2 to one stat OR +1 to three stats.
 * This is the ONLY background effect that modifies raw stat values (temp + pot).
 * All other stat_bonus effects modify the derived bonus, not the stat itself.
 *
 * @param {Object} character
 * @param {number} optionIndex
 * @param {string} mode - '2' or '1x3'
 * @param {number[]} statIndices - [idx] for mode '2', [idx1,idx2,idx3] for mode '1x3'
 * @returns {boolean}
 */
export function resolveStatIncrease(character, optionIndex, mode, statIndices) {
  const opt = character.backgroundOptions?.options?.[optionIndex];
  if (!opt) return false;
  if (!opt.resolved) opt.resolved = {};

  if (mode === '2' && statIndices.length >= 1) {
    const i = statIndices[0];
    character.stats[i] = Math.min(101, (character.stats[i] || 0) + 2);
    character.pots[i] = Math.min(101, (character.pots[i] || 0) + 2);
  } else if (mode === '1x3' && statIndices.length >= 3) {
    for (let k = 0; k < 3; k++) {
      const i = statIndices[k];
      character.stats[i] = Math.min(101, (character.stats[i] || 0) + 1);
      character.pots[i] = Math.min(101, (character.pots[i] || 0) + 1);
    }
  } else {
    return false;
  }

  opt.resolved.stat_increase_mode = mode;
  opt.resolved.stat_increase_targets = statIndices;
  return true;
}

/**
 * Rollback a stat_increase effect applied by a background option.
 * Only reverts if the option has resolved.stat_increase_mode set.
 * @returns {boolean} true if rollback was performed
 */
export function rollbackStatIncrease(character, optionIndex) {
  const opt = character.backgroundOptions?.options?.[optionIndex];
  if (!opt?.resolved?.stat_increase_mode) return false;
  const mode = opt.resolved.stat_increase_mode;
  const targets = opt.resolved.stat_increase_targets || [];
  if (mode === '2' && targets.length >= 1) {
    const i = targets[0];
    character.stats[i] = Math.max(1, (character.stats[i] || 0) - 2);
    character.potentials[i] = Math.max(1, (character.potentials[i] || 0) - 2);
  } else if (mode === '1x3' && targets.length >= 3) {
    for (let k = 0; k < 3; k++) {
      const i = targets[k];
      character.stats[i] = Math.max(1, (character.stats[i] || 0) - 1);
      character.potentials[i] = Math.max(1, (character.potentials[i] || 0) - 1);
    }
  }
  delete opt.resolved.stat_increase_mode;
  delete opt.resolved.stat_increase_targets;
  return true;
}

/**
 * Remove a background option with automatic rollback of reversible effects.
 * Only allowed before bgOptionsLocked.
 * @returns {{ success: boolean, rollbacks: string[], reason?: string }}
 */
export function removeBackgroundOption(character, optionIndex) {
  const opt = character.backgroundOptions?.options?.[optionIndex];
  if (!opt) return { success: false, reason: 'Option not found' };
  if (character.bgOptionsLocked) return { success: false, reason: 'Options locked after level 1' };
  const rollbacks = [];
  // Only stat_increase modifies raw stats — all other bonuses are computed on-the-fly
  if (opt.effects?.stat_increase) {
    if (rollbackStatIncrease(character, optionIndex)) rollbacks.push('stat_increase reverted');
  }
  character.backgroundOptions.options[optionIndex] = null;
  return { success: true, rollbacks };
}

/**
 * Get the background skill bonus for a given skill.
 * Matches skill names (FR/EN) against the SKILL_EFFECT_MAP.
 *
 * @param {Object} bgBonuses - result of getBackgroundBonuses()
 * @param {string} skillNameFr - French skill name from competences.json
 * @param {string} skillNameEn - English skill name (optional)
 * @returns {number} bonus to add to Misc column
 */
export function getSkillBackgroundBonus(bgBonuses, skillNameFr, skillNameEn) {
  if (!bgBonuses || !bgBonuses.skillBonuses) return 0;
  let total = 0;

  for (const [effectKey, bonus] of Object.entries(bgBonuses.skillBonuses)) {
    // Direct match on effect key (e.g. resolved skill_choice stored as FR name)
    if (effectKey === skillNameFr || effectKey === skillNameEn) {
      total += bonus;
      continue;
    }

    // Match via SKILL_EFFECT_MAP
    const aliases = SKILL_EFFECT_MAP[effectKey];
    if (aliases) {
      const frLower = (skillNameFr || '').toLowerCase();
      const enLower = (skillNameEn || '').toLowerCase();
      if (aliases.some(a => a.toLowerCase() === frLower || a.toLowerCase() === enLower)) {
        total += bonus;
      }
    }
  }

  return total;
}

/**
 * Apply background cost modifiers to a skill's DP cost.
 * @param {Object} bgBonuses - result of getBackgroundBonuses()
 * @param {Object} cost - { first, second, maxRanks }
 * @param {number} globalIndex - skill global index
 * @param {Object} skill - skill object from competences.json
 * @param {number} bodyDevIndex - from getBodyDevSkillIndex()
 * @returns {Object} modified cost (or original if no modifier applies)
 */
export function applyBgCostModifiers(bgBonuses, cost, globalIndex, skill, bodyDevIndex, categoryName) {
  if (!cost) return cost;
  let mult = 1;
  if (globalIndex === bodyDevIndex && bgBonuses.bodyDevCostMultiplier !== 1)
    mult = Math.min(mult, bgBonuses.bodyDevCostMultiplier);
  const name = ((skill.name_fr || skill.name_en || '')).toLowerCase();
  if ((name.includes('armure') || name.includes('armor')) && bgBonuses.armorCostMultiplier !== 1)
    mult = Math.min(mult, bgBonuses.armorCostMultiplier);
  if ((name.includes('embuscade') || name.includes('ambush')) && bgBonuses.ambushCostMultiplier !== 1)
    mult = Math.min(mult, bgBonuses.ambushCostMultiplier);
  if (bgBonuses.languageCostMultiplier !== 1 && categoryName === 'Linguistic')
    mult = Math.min(mult, bgBonuses.languageCostMultiplier);
  if (bgBonuses.skillCostOverrides[globalIndex])
    mult = Math.min(mult, bgBonuses.skillCostOverrides[globalIndex]);
  if (mult === 1) return cost;
  return {
    first: Math.max(1, Math.ceil(cost.first * mult)),
    second: cost.second > 0 ? Math.max(1, Math.ceil(cost.second * mult)) : 0,
    maxRanks: cost.maxRanks,
  };
}

/**
 * Generate wealth summary text from background bonuses.
 * Used to auto-populate equipment field.
 *
 * @param {Object} bgBonuses
 * @returns {string} formatted wealth text, or empty string if no wealth
 */
export function generateWealthText(bgBonuses) {
  const lines = [];
  if (bgBonuses.gold > 0)
    lines.push(`${bgBonuses.gold} pièces d'or`);
  for (const g of bgBonuses.gems) {
    if (g.count && g.value)
      lines.push(`${g.count} gemme${g.count > 1 ? 's' : ''} (valeur: ${g.value} po chacune)`);
  }
  if (bgBonuses.incomeMonthly > 0)
    lines.push(`Revenu: ${bgBonuses.incomeMonthly} po/mois`);
  if (lines.length === 0) return '';
  return '--- Richesse d\'historique ---\n' + lines.join('\n');
}

/**
 * Generate a human-readable summary of all active background bonuses.
 *
 * @param {Object} bgBonuses
 * @param {string} lang - 'fr' or 'en'
 * @returns {string[]} array of summary lines
 */
export function summarizeBackgroundBonuses(bgBonuses, lang = 'fr') {
  const STAT_ABBREVS = ['CO','AG','AD','Mé','RS','FO','RP','PR','EM','IN'];
  const lines = [];

  // Stat bonuses
  const statParts = bgBonuses.statBonusMods
    .map((v, i) => v !== 0 ? `${STAT_ABBREVS[i]} ${v > 0 ? '+' : ''}${v}` : null)
    .filter(Boolean);
  if (statParts.length > 0)
    lines.push((lang === 'fr' ? 'Stats: ' : 'Stats: ') + statParts.join(', '));

  // Skill bonuses
  const skillParts = Object.entries(bgBonuses.skillBonuses)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`);
  if (skillParts.length > 0)
    lines.push((lang === 'fr' ? 'Compétences: ' : 'Skills: ') + skillParts.join(', '));

  // PP
  const ppParts = [];
  if (bgBonuses.ppBonus) ppParts.push(`+${bgBonuses.ppBonus} PP`);
  if (bgBonuses.ppPerLevel) ppParts.push(`+${bgBonuses.ppPerLevel} PP/niv`);
  if (bgBonuses.ppMultiplier !== 1) ppParts.push(`×${bgBonuses.ppMultiplier} PP`);
  if (ppParts.length > 0)
    lines.push((lang === 'fr' ? 'Pouvoir: ' : 'Power: ') + ppParts.join(', '));

  // Spell Adder — free spells per day (no PP cost), distinct from PP pool
  if (bgBonuses.spellAdder) {
    const saLabel = lang === 'fr'
      ? `Ajouteur de sorts: ${bgBonuses.spellAdder} sort(s)/jour sans coût en PM`
      : `Spell Adder: ${bgBonuses.spellAdder} spell(s)/day at no PP cost`;
    lines.push(saLabel);
  }

  // BD/BO
  const _db = lang === 'fr' ? 'BD' : 'DB';
  const _ob = lang === 'fr' ? 'BO' : 'OB';
  const _rr = lang === 'fr' ? 'JR' : 'RR';
  if (bgBonuses.dbBonus) lines.push(`${_db} ${bgBonuses.dbBonus > 0 ? '+' : ''}${bgBonuses.dbBonus}`);
  if (bgBonuses.obBonus) lines.push(`${_ob} ${bgBonuses.obBonus > 0 ? '+' : ''}${bgBonuses.obBonus}`);
  if (bgBonuses.obPenalty) lines.push(`${_ob} ${bgBonuses.obPenalty}`);

  // JR/RR
  if (bgBonuses.rrBonus) lines.push(`${_rr} +${bgBonuses.rrBonus}`);
  if (bgBonuses.rrBonusVsMind) lines.push(`${_rr} vs Mental +${bgBonuses.rrBonusVsMind}`);

  // Initiative
  if (bgBonuses.initiativeBonus) lines.push(`Initiative +${bgBonuses.initiativeBonus}`);

  // Stun
  if (bgBonuses.stunReduction) lines.push(
    lang === 'fr' ? `Réduction stun: -${bgBonuses.stunReduction} rd/coup`
                   : `Stun reduction: -${bgBonuses.stunReduction} rd/hit`
  );

  // Special abilities
  if (bgBonuses.specialAbilities.length > 0)
    lines.push((lang === 'fr' ? 'Capacités: ' : 'Abilities: ')
      + bgBonuses.specialAbilities.join(', '));

  // Narrative flags
  for (const f of bgBonuses.narrativeFlags) {
    lines.push(`[${f.type}] ${f.value} (${f.source})`);
  }

  // Experience multiplier
  if (bgBonuses.experienceMultiplier && bgBonuses.experienceMultiplier !== 1) {
    const pct = Math.round((bgBonuses.experienceMultiplier - 1) * 100);
    lines.push(`XP +${pct}%`);
  }

  // Weapon mastery (Batch 40)
  if (bgBonuses.weaponMastery) {
    const wpnName = bgBonuses.weaponMastery.weaponIndex !== null
      ? `Arme #${bgBonuses.weaponMastery.weaponIndex + 1}` : '(non choisi)';
    lines.push(lang === 'fr'
      ? `Maître d'arme: ${wpnName} (3 rangs/2 achetés, autres ×${bgBonuses.otherWeaponCostMultiplier})`
      : `Weapon master: ${wpnName} (3/2 ranks, others ×${bgBonuses.otherWeaponCostMultiplier})`);
  }
  if (bgBonuses.weaponCategoryMastery) lines.push(lang === 'fr' ? 'Maître d\'armes naturel' : 'Natural weapon master');
  if (bgBonuses.ambidextrous) lines.push(lang === 'fr' ? 'Ambidextre (pas de malus main secondaire)' : 'Ambidextrous');

  // Combat multipliers (Batch 41)
  if (bgBonuses.bleedingMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Saignement' : 'Bleeding'} ×${bgBonuses.bleedingMultiplier}`);
  if (bgBonuses.healingMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Guérison' : 'Healing'} ×${bgBonuses.healingMultiplier}`);
  if (bgBonuses.fumbleRangeMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Maladresses' : 'Fumbles'} ×${bgBonuses.fumbleRangeMultiplier}`);
  if (bgBonuses.unconsciousThresholdMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Inconscient ×' : 'Unconscious ×'}${bgBonuses.unconsciousThresholdMultiplier}`);
  if (bgBonuses.critSeverityReduction) lines.push(`${lang === 'fr' ? 'Critique sévérité' : 'Crit severity'} ${bgBonuses.critSeverityReduction}`);
  if (bgBonuses.critSeverityBonus) lines.push(`${lang === 'fr' ? 'Critique sévérité +' : 'Crit severity +'}${bgBonuses.critSeverityBonus}`);
  if (bgBonuses.meleeConcussionMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Contusions mêlée' : 'Melee hits'} ×${bgBonuses.meleeConcussionMultiplier}`);
  if (bgBonuses.missileConcussionMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Contusions missile' : 'Missile hits'} ×${bgBonuses.missileConcussionMultiplier}`);
  if (bgBonuses.naturalArmorType) lines.push(`${lang === 'fr' ? 'Armure naturelle AT' : 'Natural armor AT'} ${bgBonuses.naturalArmorType}`);
  if (bgBonuses.movementMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Mouvement' : 'Movement'} ×${bgBonuses.movementMultiplier}`);
  if (bgBonuses.encumbranceMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Encombrement' : 'Encumbrance'} ×${bgBonuses.encumbranceMultiplier}`);
  if (bgBonuses.bowRangeMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Portée arc' : 'Bow range'} ×${bgBonuses.bowRangeMultiplier}`);
  if (bgBonuses.missileRangeMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Portée missile' : 'Missile range'} ×${bgBonuses.missileRangeMultiplier}`);
  if (bgBonuses.parryBonus) lines.push(`${lang === 'fr' ? 'Parade' : 'Parry'} +${bgBonuses.parryBonus}`);
  if (bgBonuses.actsOnePhaseEarlier) lines.push(lang === 'fr' ? `Agit 1 phase tôt (${bgBonuses.fspPenalty} FSP)` : `Acts 1 phase earlier (${bgBonuses.fspPenalty} FSP)`);
  if (bgBonuses.surpriseRoundNegation) lines.push(`${lang === 'fr' ? 'Surprise négée' : 'Surprise negated'} ×${bgBonuses.surpriseRoundNegation}`);
  if (bgBonuses.weaponReadyBonus) lines.push(`${lang === 'fr' ? 'Armement rapide' : 'Weapon ready'} -${bgBonuses.weaponReadyBonus} rd`);
  if (bgBonuses.multipleAttackPenaltyMultiplier !== 1) lines.push(`${lang === 'fr' ? 'Attaques multiples' : 'Multi-attack penalty'} ×${bgBonuses.multipleAttackPenaltyMultiplier}`);

  // Spell effects (Batch 42)
  if (bgBonuses.spellFailurePenalty) lines.push(`${lang === 'fr' ? 'Échec sorts' : 'Spell failure'}: +${bgBonuses.spellFailurePenalty}%`);
  if (bgBonuses.spellAttackBonus) lines.push(`${lang === 'fr' ? 'Attaque sorts' : 'Spell attack'}: +${bgBonuses.spellAttackBonus}`);
  if (bgBonuses.noArmorSpellPenalty) lines.push(lang === 'fr' ? 'Pas de malus armure pour sorts' : 'No armor spell penalty');
  if (bgBonuses.castingTimeReduction) lines.push(`${lang === 'fr' ? 'Incantation' : 'Casting time'}: -${bgBonuses.castingTimeReduction} rd`);
  if (bgBonuses.spellHpCost) lines.push(`${lang === 'fr' ? `Sorts niv>${bgBonuses.spellLevelThreshold}: coût ${bgBonuses.spellHpCost} PdC` : `Spells lvl>${bgBonuses.spellLevelThreshold}: cost ${bgBonuses.spellHpCost} HP`}`);
  if (bgBonuses.friendlyFire) lines.push(lang === 'fr' ? 'Sorts de zone: peuvent toucher les alliés' : 'Area spells can hit allies');
  if (bgBonuses.concentrationPersist) lines.push(lang === 'fr' ? 'Sorts persistent sans concentration' : 'Spells persist without concentration');
  if (bgBonuses.learnAnyListMaxLvl) lines.push(lang === 'fr' ? `Apprend n'importe quel royaume (niv max ${bgBonuses.learnAnyListMaxLvl})` : `Learn any realm (max lvl ${bgBonuses.learnAnyListMaxLvl})`);
  if (bgBonuses.learnEvilListMaxLvl) lines.push(lang === 'fr' ? `Apprend listes maléfiques (niv max ${bgBonuses.learnEvilListMaxLvl})` : `Learn evil lists (max lvl ${bgBonuses.learnEvilListMaxLvl})`);
  if (bgBonuses.arcaneAsBase) lines.push(lang === 'fr' ? 'Listes arcaniques = listes de base' : 'Arcane lists as base lists');
  if (bgBonuses.noFailureLists) lines.push(`${bgBonuses.noFailureLists} ${lang === 'fr' ? 'liste(s) sans échec' : 'list(s) no failure'}`);
  if (bgBonuses.psionicPP) lines.push(lang === 'fr' ? 'Points de pouvoir psioniques séparés' : 'Separate psionic PP');

  // Innate talents
  if (bgBonuses.innateTalents.length > 0)
    lines.push((lang === 'fr' ? 'Talents innés: ' : 'Innate talents: ')
      + bgBonuses.innateTalents.map(t => `${t.name} (${t.tier})`).join(', '));

  return lines;
}

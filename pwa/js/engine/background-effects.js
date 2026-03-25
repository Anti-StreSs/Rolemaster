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
    ppBonus: 0,
    ppPerLevel: 0,
    ppMultiplier: 1,
    spellAdder: 0,
    dbBonus: 0,
    obBonus: 0,
    obPenalty: 0,
    rrBonus: 0,
    rrBonusVsMind: 0,
    maxHpMultiplier: 1,
    bodyDevCostMultiplier: 1,
    armorCostMultiplier: 1,
    ambushCostMultiplier: 1,
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
      if (!resolved.skill_ranks_target) {
        bonuses.unresolvedChoices.push({
          optionIndex: idx, choiceType: 'skill',
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

  // DB/OB
  if (bgBonuses.dbBonus) lines.push(`DB ${bgBonuses.dbBonus > 0 ? '+' : ''}${bgBonuses.dbBonus}`);
  if (bgBonuses.obBonus) lines.push(`OB ${bgBonuses.obBonus > 0 ? '+' : ''}${bgBonuses.obBonus}`);
  if (bgBonuses.obPenalty) lines.push(`OB ${bgBonuses.obPenalty}`);

  // RR
  if (bgBonuses.rrBonus) lines.push(`RR +${bgBonuses.rrBonus}`);
  if (bgBonuses.rrBonusVsMind) lines.push(`RR vs Mental +${bgBonuses.rrBonusVsMind}`);

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

  // Innate talents
  if (bgBonuses.innateTalents.length > 0)
    lines.push((lang === 'fr' ? 'Talents innés: ' : 'Innate talents: ')
      + bgBonuses.innateTalents.map(t => `${t.name} (${t.tier})`).join(', '));

  return lines;
}

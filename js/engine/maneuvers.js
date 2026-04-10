// maneuvers.js — Universal resolution engine (non-attack)
// Covers: static maneuvers, moving maneuvers, resistance rolls
// Uses open-ended D100 + modifiers vs difficulty thresholds

import { getStatBonus } from './stats.js';
import { getData } from './data-loader.js';

// ============================================================
// OPEN-ENDED D100 (shared with combat.js when it exists)
// ============================================================

export function rollOpenEndedD100() {
  let roll = Math.floor(Math.random() * 100) + 1;
  let total = roll;
  while (roll >= 96) {
    roll = Math.floor(Math.random() * 100) + 1;
    total += roll;
  }
  if (total <= 5) {
    roll = Math.floor(Math.random() * 100) + 1;
    total -= roll;
  }
  return total;
}

// ============================================================
// STATIC MANEUVER TABLE
// ============================================================

const DIFFICULTIES = [
  'routine', 'easy', 'light', 'medium', 'hard',
  'very_hard', 'extremely_hard', 'sheer_folly', 'absurd'
];

const DIFFICULTY_LABELS = {
  routine:        { en: 'Routine',           fr: 'Routine' },
  easy:           { en: 'Easy',              fr: 'Facile' },
  light:          { en: 'Light',             fr: 'Légère' },
  medium:         { en: 'Medium',            fr: 'Moyenne' },
  hard:           { en: 'Hard',              fr: 'Difficile' },
  very_hard:      { en: 'Very Hard',         fr: 'Très Difficile' },
  extremely_hard: { en: 'Extremely Hard',    fr: 'Extrêmement Difficile' },
  sheer_folly:    { en: 'Sheer Folly',       fr: 'Pure Folie' },
  absurd:         { en: 'Absurd',            fr: 'Absurde' },
};

export { DIFFICULTIES, DIFFICULTY_LABELS };

// Cleaner encoding: partial range start, success start
// Below partial = fail, ≤-26 = spectacular fail
const SM_TABLE = {
  routine:        { partial: -25, success: -25 },  // always succeeds (partial at -25)
  easy:           { partial:   6, success:  37 },
  light:          { partial:  37, success:  57 },
  medium:         { partial:  57, success:  77 },
  hard:           { partial:  77, success:  97 },
  very_hard:      { partial:  97, success: 112 },
  extremely_hard: { partial: 112, success: 127 },
  sheer_folly:    { partial: 127, success: 142 },
  absurd:         { partial: 142, success: 176 },
};

/**
 * Resolve a static maneuver.
 * @param {Object} params
 * @param {string} params.difficulty — one of DIFFICULTIES
 * @param {number} params.bonus — total skill + stat + modifiers
 * @param {number} [params.roll] — D100 open-ended (null = auto)
 * @returns {Object} { roll, total, result, difficulty, description }
 */
export function resolveStaticManeuver({ difficulty, bonus, roll }) {
  if (!SM_TABLE[difficulty])
    return { error: `Unknown difficulty: ${difficulty}` };

  if (roll == null) roll = rollOpenEndedD100();
  const total = roll + bonus;
  const thresholds = SM_TABLE[difficulty];

  let result, description;
  if (total <= -26) {
    result = 'spectacular_failure';
    description = 'Spectacular failure — injury or serious consequence.';
  } else if (total < thresholds.partial) {
    result = 'failure';
    description = 'Failure.';
  } else if (total < thresholds.success) {
    result = 'partial';
    description = 'Partial success — GM determines extent.';
  } else {
    result = 'success';
    description = 'Success.';
  }

  return {
    roll, total, bonus, difficulty, result, description,
    difficultyLabel: DIFFICULTY_LABELS[difficulty],
  };
}

// ============================================================
// RESISTANCE ROLLS (RR)
// ============================================================

const RR_STAT_MAP = {
  essence:    8,  // EM index
  channeling: 9,  // IN index
  mentalism:  7,  // PR index
  poison:     0,  // CO index
  disease:    0,  // CO index
  fear:       2,  // AD (SD) index
};

/**
 * Resolve a Resistance Roll.
 * @param {Object} params
 * @param {number} params.defenderLevel
 * @param {number} params.attackerLevel
 * @param {number} params.statBonus — stat bonus for the relevant stat
 * @param {number} [params.racialMod] — racial RR modifier (default 0)
 * @param {number} [params.itemMod] — item RR modifier (default 0)
 * @param {number} [params.bgRRBonus] — background RR bonus (default 0)
 * @param {string} [params.realm] — 'essence','channeling','mentalism','poison','disease','fear'
 * @param {number} [params.roll] — D100 open-ended (null = auto)
 * @returns {Object} { roll, total, threshold, success, margin, realm }
 */
export function resolveResistanceRoll({
  defenderLevel, attackerLevel, statBonus,
  racialMod = 0, itemMod = 0, bgRRBonus = 0,
  realm = 'essence', roll
}) {
  if (roll == null) roll = rollOpenEndedD100();

  const levelDiff = defenderLevel - attackerLevel;
  const total = roll + levelDiff + statBonus + racialMod + itemMod + bgRRBonus;
  const threshold = 50;
  const success = total >= threshold;
  const margin = total - threshold; // positive = success margin, negative = failure degree

  return {
    roll, total, threshold, success, margin, realm,
    breakdown: {
      roll, levelDiff, statBonus, racialMod, itemMod, bgRRBonus,
      defenderLevel, attackerLevel,
    },
    description: success
      ? `RR Success (margin +${margin})`
      : `RR Failure (by ${Math.abs(margin)})`,
  };
}

/**
 * Get the stat index used for a given RR realm.
 */
export function getRRStatIndex(realm) {
  return RR_STAT_MAP[realm] ?? 8; // default EM
}

// ============================================================
// MANEUVER TABLES — lookup depuis maneuver_tables.json (ICE 5808)
// ============================================================

/**
 * Cherche une compétence par id exact ou par recherche souple sur name_en/name_fr.
 * @param {string} query — id (ex: 'skill-climbing') ou nom partiel EN/FR
 * @returns {Object|null}
 */
export function findSkillManeuver(query) {
  const skills = getData().maneuver_tables?.skills;
  if (!skills) return null;
  const q = query.toLowerCase().trim();
  return skills.find(s => s.id === q)
    || skills.find(s => s.name_en.toLowerCase() === q)
    || skills.find(s => s.name_en.toLowerCase().includes(q))
    || null;
}

/**
 * Retourne les condition_modifiers d'une compétence.
 * @param {string} skillId
 * @param {boolean} showUncertain — inclure les entrées ocr_uncertain (défaut: false)
 * @returns {Array}
 */
export function getSkillConditionModifiers(skillId, showUncertain = false) {
  const skill = findSkillManeuver(skillId);
  if (!skill) return [];
  const mods = skill.condition_modifiers || [];
  return showUncertain ? mods : mods.filter(m => m.modifier !== null);
}

/**
 * Retourne les exemples de difficulté d'une compétence.
 * @param {string} skillId
 * @param {string} lang — 'fr' ou 'en'
 * @returns {Object}
 */
export function getSkillDifficulties(skillId, lang = 'fr') {
  const skill = findSkillManeuver(skillId);
  if (!skill) return {};
  const diffs = skill.difficulties || {};
  const levels = ['routine','easy','light','medium','hard','very_hard','extremely_hard','sheer_folly','absurd'];
  const result = {};
  for (const lvl of levels) {
    const entry = diffs[lvl];
    if (!entry) { result[lvl] = null; continue; }
    result[lvl] = (lang === 'fr' && entry.fr) ? entry.fr : (entry.en || null);
  }
  return result;
}

/**
 * Recherche multi-champs, retourne les N premières compétences matchant query.
 * @param {string} query
 * @param {number} limit
 * @returns {Array}
 */
export function searchSkillManeuvers(query, limit = 10) {
  const skills = getData().maneuver_tables?.skills;
  if (!skills) return [];
  if (!query) return skills.slice(0, limit);
  const q = query.toLowerCase().trim();
  return skills
    .filter(s =>
      s.name_en.toLowerCase().includes(q) ||
      (s.name_fr && s.name_fr.toLowerCase().includes(q)) ||
      (s.category_en && s.category_en.toLowerCase().includes(q)) ||
      (s.description_en && s.description_en.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

/**
 * Retourne les métadonnées du fichier source.
 */
export function getManeuverTablesMeta() {
  return getData().maneuver_tables?._metadata || null;
}

// event-log.js — Unified event journal
// Wraps db.js appendEvent/getEvents with typed helpers

import { appendEvent, getEvents } from './db.js';

/**
 * Log any game event.
 * @param {string} characterName
 * @param {string} type — one of the types listed below
 * @param {Object} data — payload specific to the type
 * @param {string} summary — human-readable one-liner
 */
export async function logEvent(characterName, type, data, summary) {
  return appendEvent({
    characterName,
    type,
    data,
    summary: summary || `${type}: ${JSON.stringify(data).slice(0, 100)}`,
    phase: data.phase || null,
    level: data.level || null,
  });
}

// --- Typed convenience helpers ---

export const logStatRoll = (name, data) =>
  logEvent(name, 'stat_roll', data, `Tirage stats ${data.method}`);

export const logStatValidate = (name, data) =>
  logEvent(name, 'stat_validate', data, 'Stats validées');

export const logSkillDevelop = (name, data) =>
  logEvent(name, 'skill_develop', data,
    `${data.skillName}: +${data.ranksAdded} rang(s), ${data.dpCost} DP`);

export const logSpellSGR = (name, data) =>
  logEvent(name, 'spell_sgr', data,
    `SGR ${data.listName}: D100=${data.d100}+${data.bonus}=${data.total} vs ${data.threshold} → ${data.success ? 'SUCCÈS' : 'échec'}`);

export const logPhaseValidate = (name, data) =>
  logEvent(name, 'phase_validate', data,
    `Phase ${data.phase} validée: ${data.dpSpent}/${data.dpTotal} DP`);

export const logLevelUp = (name, data) =>
  logEvent(name, 'level_up', data,
    `Niveau ${data.oldLevel} → ${data.newLevel}`);

export const logBgOption = (name, data) =>
  logEvent(name, 'bg_option_roll', data,
    `Option: ${data.resultName} (D100=${data.d100})`);

export const logHpRoll = (name, data) =>
  logEvent(name, 'hp_roll', data,
    `PdC rang ${data.rank}: D${data.dieType}=${data.dieRoll}`);

export const logNote = (name, text) =>
  logEvent(name, 'note', { text }, text);

/** Get full event history for a character. */
export async function getCharacterHistory(characterName, options) {
  return getEvents(characterName, options);
}

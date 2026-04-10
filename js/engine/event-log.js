// event-log.js — Unified event journal
// Dual-write: character.eventLog[] (JSON-portable) + IndexedDB (fast queries)

import { appendEvent, getEvents } from './db.js';

/**
 * Log any game event. Writes to both character.eventLog and IndexedDB.
 * @param {Object} character — the character object (mutated in-place)
 * @param {string} type — event type
 * @param {Object} data — payload specific to the type
 * @param {string} summary — human-readable one-liner
 */
export async function logEvent(character, type, data, summary) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    data,
    summary: summary || `${type}: ${JSON.stringify(data).slice(0, 100)}`,
    phase: data.phase || null,
    level: data.level || null,
  };
  // In-memory write (portable with saved JSON)
  if (!character.eventLog) character.eventLog = [];
  character.eventLog.push(entry);
  // IndexedDB write (async, non-blocking)
  return appendEvent({ characterName: character.name, ...entry });
}

// --- Typed convenience helpers ---

export const logStatRoll = (character, data) =>
  logEvent(character, 'stat_roll', data, `Tirage stats ${data.method}`);

export const logStatValidate = (character, data) =>
  logEvent(character, 'stat_validate', data, 'Stats validées');

export const logSkillDevelop = (character, data) =>
  logEvent(character, 'skill_develop', data,
    `${data.skillName}: +${data.ranksAdded} rang(s), ${data.dpCost} DP`);

export const logSpellSGR = (character, data) =>
  logEvent(character, 'spell_sgr', data,
    `SGR ${data.listName}: D100=${data.d100}+${data.bonus}=${data.total} vs ${data.threshold} → ${data.success ? 'SUCCÈS' : 'échec'}`);

export const logPhaseValidate = (character, data) =>
  logEvent(character, 'phase_validate', data,
    `Phase ${data.phase} validée: ${data.dpSpent}/${data.dpTotal} DP`);

export const logLevelUp = (character, data) =>
  logEvent(character, 'level_up', data,
    `Niveau ${data.oldLevel} → ${data.newLevel}`);

export const logBgOption = (character, data) =>
  logEvent(character, 'bg_option_roll', data,
    `Option: ${data.resultName} (D100=${data.d100})`);

export const logHpRoll = (character, data) =>
  logEvent(character, 'hp_roll', data,
    `PdC rang ${data.rank}: D${data.dieType}=${data.dieRoll}`);

export const logStatGain = (character, data) =>
  logEvent(character, 'stat_gain', data, `Niv.${data.level} gains: ${data.summary}`);

export const logNote = (character, text) =>
  logEvent(character, 'note', { text }, text);

// --- New helpers (Batch 43) ---

export const logStatManualEdit = (character, data) =>
  logEvent(character, 'stat_manual_edit', data,
    `Stat ${data.statName} éditée manuellement: ${data.oldVal} → ${data.newVal}`);

export const logBgOptionAdd = (character, data) =>
  logEvent(character, 'bg_option_add', data,
    `Option d'historique ajoutée: ${data.optionName}`);

export const logBgOptionRemove = (character, data) =>
  logEvent(character, 'bg_option_remove', data,
    `Option d'historique retirée: ${data.optionName}`);

export const logBgOptionResolve = (character, data) =>
  logEvent(character, 'bg_option_resolve', data,
    `Option résolue: ${data.optionName} → ${data.choiceLabel}`);

export const logSpellListAdd = (character, data) =>
  logEvent(character, 'spell_list_add', data,
    `Liste de sorts ajoutée: ${data.listName}`);

export const logSpellListRemove = (character, data) =>
  logEvent(character, 'spell_list_remove', data,
    `Liste de sorts retirée: ${data.listName}`);

export const logSpellLearn = (character, data) =>
  logEvent(character, 'spell_learn', data,
    `Sort appris: ${data.listName} niv.${data.spellLevel}`);

export const logSpellManual = (character, data) =>
  logEvent(character, 'spell_manual', data,
    `Sort manuel: ${data.spellName}`);

export const logSkillManualEdit = (character, data) =>
  logEvent(character, 'skill_manual_edit', data,
    `Bonus manuel modifié: ${data.skillName} → ${data.newVal}`);

/** Get full event history for a character from IndexedDB. */
export async function getCharacterHistory(characterName, options) {
  return getEvents(characterName, options);
}

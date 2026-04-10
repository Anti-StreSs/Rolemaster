// optional-rules.js — Manage optional rules from options.json
// Rules are stored in IndexedDB settings store, keyed 'optional_rules'
// Defaults come from options.json default_value field

import { getData } from './data-loader.js';

// IndexedDB helpers (settings store already exists from Batch 20)
async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rolemaster_cpr', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadSetting(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveSetting(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key, value });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all optional rules with current values.
 * Merges defaults from options.json with saved overrides from IndexedDB.
 * @returns {Object[]} array of { index, description_fr, description_en,
 *                     type, defaultValue, currentValue, groupHeader }
 */
export async function getOptionalRules() {
  const data = getData();
  const allOptions = data.options?.options || [];
  const saved = (await loadSetting('optional_rules')) || {};

  let currentGroup = null;
  return allOptions.map(opt => {
    if (opt.type === 4) currentGroup = opt.description_fr || opt.description_en;
    return {
      index: opt.index,
      reference: opt.reference,
      description_fr: opt.description_fr,
      description_en: opt.description_en,
      type: opt.type,
      defaultValue: opt.default_value,
      currentValue: saved[opt.index] ?? opt.default_value,
      groupHeader: currentGroup,
      isHeader: opt.type === 4,
      isDisabled: opt.type === 6,
    };
  });
}

/**
 * Set a single optional rule value.
 */
export async function setOptionalRule(index, value) {
  const saved = (await loadSetting('optional_rules')) || {};
  saved[index] = value;
  await saveSetting('optional_rules', saved);
}

/**
 * Reset all optional rules to defaults.
 */
export async function resetOptionalRules() {
  await saveSetting('optional_rules', {});
}

/**
 * Check if a specific rule is active.
 * Useful for engine code that needs to branch on optional rules.
 * @param {number} index — rule index
 * @returns {boolean|number} — true/false for checkboxes, value for radios/numeric
 */
export async function isRuleActive(index) {
  const saved = (await loadSetting('optional_rules')) || {};
  const data = getData();
  const opt = data.options?.options?.find(o => o.index === index);
  if (!opt) return false;
  const val = saved[index] ?? opt.default_value;
  if (opt.type === 1) return val > 0; // checkbox
  if (opt.type === 2) return val >= 0; // radio (active if not -1)
  return val;
}

// Classes (professions) engine

import { getData } from './data-loader.js';

// Caster type from raw_params[0]
// 1 = Non-Spell User, 2 = Spell/Semi-Spell User, 3 = Hybrid
export const CASTER_TYPES = {
  1: 'nonSpell',
  2: 'spellUser',
  3: 'hybrid',
};

// Realm codes from raw_params[2] — full mapping from dat_parser.py
// Determines which magical realm the class uses
export const REALM_MAP = {
  1: { key: 'none', label_fr: 'Aucun', label_en: 'None', hasSpells: false },
  2: { key: 'channeling_partial', label_fr: 'Théisme (partiel)', label_en: 'Channeling (partial)', hasSpells: false, baseRealm: 'channeling' },
  3: { key: 'channeling', label_fr: 'Théisme', label_en: 'Channeling', hasSpells: true, baseRealm: 'channeling' },
  4: { key: 'essence_partial', label_fr: 'Essence (partiel)', label_en: 'Essence (partial)', hasSpells: false, baseRealm: 'essence' },
  5: { key: 'essence', label_fr: 'Essence', label_en: 'Essence', hasSpells: true, baseRealm: 'essence' },
  6: { key: 'arms', label_fr: 'Armes', label_en: 'Arms', hasSpells: false },
  7: { key: 'mentalism_essence', label_fr: 'Mentalisme/Essence', label_en: 'Mentalism/Essence', hasSpells: true, baseRealm: 'mentalism' },
  8: { key: 'mentalism', label_fr: 'Mentalisme', label_en: 'Mentalism', hasSpells: true, baseRealm: 'mentalism' },
  9: { key: 'essence', label_fr: 'Essence', label_en: 'Essence', hasSpells: true, baseRealm: 'essence' },
  10: { key: 'channeling', label_fr: 'Théisme', label_en: 'Channeling', hasSpells: true, baseRealm: 'channeling' },
  11: { key: 'variable', label_fr: 'Variable', label_en: 'Variable', hasSpells: false },
};

/**
 * Get all classes with their metadata.
 */
export function getAllClasses() {
  return getData().classes.classes;
}

/**
 * Get a class by index.
 */
export function getClassByIndex(index) {
  return getData().classes.classes[index];
}

/**
 * Get class name in the specified language.
 */
export function getClassName(cls, lang) {
  return lang === 'en' ? cls.name_en : cls.name_fr;
}

/**
 * Get human-readable caster type key.
 */
export function getCasterTypeKey(cls) {
  return CASTER_TYPES[cls.caster_type] || 'nonSpell';
}

/**
 * Get realm info object for a class.
 */
export function getRealmInfo(cls) {
  return REALM_MAP[cls.realm_code] || REALM_MAP[1];
}

/**
 * Get realm key for a class (simplified: essence, channeling, mentalism, or none).
 */
export function getRealmKey(cls) {
  const info = getRealmInfo(cls);
  return info.baseRealm || 'none';
}

/**
 * Get realm label for display.
 */
export function getRealmLabel(cls, lang) {
  const info = getRealmInfo(cls);
  return lang === 'en' ? info.label_en : info.label_fr;
}

/**
 * Check if class is a spell user (has access to spell lists).
 * Uses realm_code to determine: codes with hasSpells=true are spell users.
 */
export function isSpellUser(cls) {
  const info = getRealmInfo(cls);
  return info.hasSpells;
}

/**
 * Check if class is a semi-spell user (has some magical ability but not full caster).
 * Semi-casters have caster_type=2 but realm codes 2, 4, 6 (partial/arms).
 */
export function isSemiSpellUser(cls) {
  if (cls.caster_type !== 2) return false;
  const info = getRealmInfo(cls);
  return !info.hasSpells && cls.realm_code !== 1;
}

/**
 * Extract prime stat indices (0-based) from class raw_params.
 * raw_params[3] and raw_params[4] are the 2 prime stat indices (1-based in data).
 * Returns array of 2 zero-based indices.
 */
export function getClassPrimeStats(cls) {
  const params = cls.raw_params;
  if (!params || params.length < 5) return [];
  const prime1 = params[3]; // 1-based
  const prime2 = params[4]; // 1-based
  const result = [];
  if (prime1 >= 1 && prime1 <= 10) result.push(prime1 - 1);
  if (prime2 >= 1 && prime2 <= 10 && prime2 !== prime1) result.push(prime2 - 1);
  else if (prime2 >= 1 && prime2 <= 10) result.push(prime2 - 1); // Allow duplicate
  return result;
}

/**
 * Filter classes by caster type and search text.
 */
export function filterClasses(typeFilter, searchText) {
  let classes = getAllClasses();

  if (typeFilter) {
    classes = classes.filter(c => getCasterTypeKey(c) === typeFilter);
  }

  if (searchText) {
    const q = searchText.toLowerCase();
    classes = classes.filter(c =>
      c.name_fr.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q)
    );
  }

  return classes;
}

/**
 * Get development costs for a class.
 */
export function getClassCosts(classIndex) {
  const couts = getData().couts;
  if (classIndex >= 0 && classIndex < couts.classes.length) {
    return couts.classes[classIndex].cost_values;
  }
  return null;
}

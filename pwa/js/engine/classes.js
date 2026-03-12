// Classes (professions) engine

import { getData } from './data-loader.js';

// Caster type codes from the data
export const CASTER_TYPES = {
  1: 'nonSpell',     // Non Spell User
  2: 'spellUser',    // Spell User (pure caster)
  3: 'hybrid',       // Hybrid
  4: 'semiSpell',    // Semi Spell User
};

// Realm codes from class data — mapped from raw_params
// realm_code 9 = Essence, 10 = Channeling, 11 = Mentalism
// For hybrid/multi-realm: codes like 9+10, encoded differently
export const REALM_CODES = {
  9: 'essence',
  10: 'channeling',
  11: 'mentalism',
  0: 'none',
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
 * Get human-readable caster type.
 */
export function getCasterTypeKey(cls) {
  return CASTER_TYPES[cls.caster_type] || 'nonSpell';
}

/**
 * Get realm name key for a class.
 */
export function getRealmKey(cls) {
  return REALM_CODES[cls.realm_code] || 'none';
}

/**
 * Check if class is a spell user (can cast spells).
 */
export function isSpellUser(cls) {
  return cls.caster_type >= 2;
}

/**
 * Filter classes by caster type.
 * @param {string|null} typeFilter — 'spellUser', 'semiSpell', 'nonSpell', 'hybrid', or null for all
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
 * Returns the cost_values array from couts.json.
 */
export function getClassCosts(classIndex) {
  const couts = getData().couts;
  if (classIndex >= 0 && classIndex < couts.classes.length) {
    return couts.classes[classIndex].cost_values;
  }
  return null;
}

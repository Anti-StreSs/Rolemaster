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

// Stat indices for power point calculation per realm
// Em=8 (Essence), In=9 (Channeling/Théurgie), Pr=7 (Mentalism)
const PP_STAT_MAP = { 'essence': 8, 'channeling': 9, 'mentalism': 7 };

// Known RM2 hybrid professions: use average of two realm stats for PP
// Sorcerer = Essence+Channeling, Mystic = Essence+Mentalism, Astrologer = Channeling+Mentalism
const HYBRID_PP_NAMES = {
  'Sorcier':     [8, 9], // Em + In (Essence + Channeling)
  'Mystique':    [8, 7], // Em + Pr (Essence + Mentalism)
  'Astrologue':  [9, 7], // In + Pr (Channeling + Mentalism)
};

/**
 * Get the stat index(es) used for power point calculation.
 * Returns array of 1-2 stat indices (0-based). Hybrids return 2 (averaged).
 */
export function getPPStatIndices(cls) {
  // Check known hybrid professions by name
  const hybridStats = HYBRID_PP_NAMES[cls.name_fr];
  if (hybridStats) return hybridStats;

  // Also check caster_type=3 (marked hybrid in data) — realm_code 7 = mentalism_essence
  if (cls.realm_code === 7) return [8, 7]; // Em + Pr (Essence + Mentalism)

  // Single realm
  const realmKey = getRealmKey(cls);
  const statIdx = PP_STAT_MAP[realmKey];
  return statIdx !== undefined ? [statIdx] : [];
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

// Prime stats per class (0-based indices into CO,AG,AD,ME,RS,FO,RP,PR,EM,IN)
// Source: RM2/Classic profession descriptions. raw_params encoding was unreliable.
// CO=0, AG=1, AD=2, ME=3, RS=4, FO=5, RP=6, PR=7, EM=8, IN=9
const CLASS_PRIME_STATS = {
  // Pure Arms (ST/CO → FO/CO)
  'Guerrier': [0, 5], 'Barbare': [0, 5], 'Bashkar': [0, 5], 'Combattant': [0, 5],
  'Cavalier': [0, 5], 'Larron': [1, 5], 'Marin': [0, 5],
  // Semi-Arms (mixed)
  'Assassin': [1, 6], 'Voleur': [1, 6], 'Monte-en-l\'air': [1, 6],
  'Duelliste': [1, 5], 'Danseur': [1, 6], 'Escroc': [1, 7],
  'Sicaire': [1, 6], 'Bohémien': [1, 9],
  // Essence casters (EM primary)
  'Magicien': [8, 1], 'Alchimiste': [8, 3], 'Illusioniste': [8, 3],
  'Enchanteur': [8, 1], 'Evocateur': [8, 3], 'Runiste': [8, 3],
  'Force Mage': [8, 2], 'Mage cristal': [8, 3], 'Mage du chaos': [8, 9],
  // Channeling casters (IN primary)
  'Clerc': [9, 7], 'Animiste': [9, 8], 'Guérisseur': [9, 8],
  'Druide': [9, 8], 'Séléniste': [9, 7], 'Shamane': [9, 8],
  'Necromancien': [9, 7], 'Macabre': [9, 7], 'Envoûteur': [9, 7],
  'Prophète': [9, 7], 'Paladin': [9, 7],
  // Mentalism casters (PR primary)
  'Mentaliste': [7, 2], 'Barde': [7, 8], 'Sage': [7, 3],
  'Soigneur': [7, 8], 'Lige': [7, 2], 'Limier': [7, 9],
  // Hybrids
  'Sorcier': [8, 9], 'Mystique': [8, 7], 'Astrologue': [9, 7],
  'Archmage': [8, 9], 'Achiste': [8, 9],
  // Monks / Martial
  'Moine': [1, 2], 'Guerrier-moine': [1, 2], 'Monastique': [1, 2],
  'Guerrier-mage': [5, 8], 'Magus': [8, 1],
  // Semi / Special
  'Ranger': [1, 0], 'Compagnon': [1, 0], 'Analyseur': [8, 3],
  'Bestiaire': [8, 7], 'Commerçant': [7, 3], 'Derviche': [9, 2],
  'Erudit': [9, 3], 'Oniromancien illusioniste': [8, 3], 'Oniromancien shamane': [9, 8],
  'Seigneur du chaos': [9, 8],
  // Non-spell / Craft
  'Artisan': [1, 3], 'Fermier': [0, 5], 'Professionnel': [3, 4],
  'Sans-profession': [0, 1], 'Leader': [7, 0],
  'Chasseur de prime': [1, 6], 'Houri': [7, 8],
};

/**
 * Get prime stat indices (0-based) for a class.
 * Uses hardcoded RM2 profession primes — raw_params encoding was unreliable.
 */
export function getClassPrimeStats(cls) {
  return CLASS_PRIME_STATS[cls.name_fr] || [0, 5]; // Default: CO/FO
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

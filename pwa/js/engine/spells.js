// Spells engine — spell lists, realms, costs

import { getData } from './data-loader.js';

/**
 * Get all spell realms with their lists.
 */
export function getAllRealms() {
  return getData().sorts.realms;
}

/**
 * Get spell list name in the specified language.
 */
export function getSpellListName(spellList, lang) {
  return lang === 'en' ? spellList.name_en : spellList.name_fr;
}

/**
 * Get realm spell cost data from carac_tables.
 * realm_id: 1=non-caster, 2=channeling, 3=essence, 4=mentalism
 */
export function getSpellCostByRealm(realmId) {
  const data = getData().carac_tables.spell_cost_by_realm;
  return data.find(r => r.realm_id === realmId) || null;
}

/**
 * Map class realm_code to spell cost realm_id.
 * Class realm_code: 9=essence, 10=channeling, 11=mentalism
 * Spell cost realm_id: 3=essence, 4=mentalism, 2=channeling, 1=non-caster
 */
export function classRealmToSpellRealmId(realmCode) {
  const map = { 9: 3, 10: 2, 11: 4 };
  return map[realmCode] || 1;
}

/**
 * Get available spell lists for a class based on its realm.
 * Returns realm objects that the class can access.
 */
export function getAvailableSpellLists(cls) {
  if (cls.caster_type <= 1) return []; // Non-casters

  const allRealms = getAllRealms();
  const realmCode = cls.realm_code;

  // Map realm_code to realm names for filtering
  // Open lists are available to all casters of the matching realm
  // Closed lists are profession-specific
  return allRealms;
}

/**
 * Flatten all spell lists from all realms into a searchable array.
 */
export function getAllSpellListsFlat() {
  const realms = getAllRealms();
  const flat = [];
  for (const realm of realms) {
    for (let groupIdx = 0; groupIdx < realm.groups.length; groupIdx++) {
      const group = realm.groups[groupIdx];
      for (const spell of group) {
        flat.push({
          ...spell,
          realmIndex: realm.index,
          realmName: realm.name,
          groupIndex: groupIdx,
        });
      }
    }
  }
  return flat;
}

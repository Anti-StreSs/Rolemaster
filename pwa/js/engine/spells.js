// Spells engine — spell lists, realms, costs

import { getData } from './data-loader.js';
import { getCoutsIndex } from './skills.js';

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
 * Determine spell list cost based on class, list name, and realm.
 * Returns { cost, type } where type is 'Base', 'Libre', 'Réservée', 'Autre'.
 *
 * @param {object} cls - class object with realm_code, caster_type
 * @param {string} classRealm - realm key ('essence', 'channeling', 'mentalism', 'none')
 * @param {string} listName - name of the spell list (FR)
 * @param {string} realmName - realm name from sorts.json (e.g. "Mentalism (Open)")
 */
export function getSpellListCost(cls, classRealm, listName, realmName) {
  if (!cls || classRealm === 'none') return { cost: 10, type: 'Autre' };

  const rn = realmName.toLowerCase();
  const isPure = cls.caster_type >= 3; // Pure spell casters (type 3+)

  // Map class realm to sorts.json realm keywords
  const realmKeywords = {
    essence: 'essence',
    channeling: 'channeling',
    mentalism: 'mentalism',
  };
  const classRealmKw = realmKeywords[classRealm] || '';

  // Check if realm matches class realm
  const realmMatchesClass = classRealmKw && rn.includes(classRealmKw);

  // Open lists of matching realm → Libre
  if (realmMatchesClass && rn.includes('open')) {
    return { cost: isPure ? 2 : 4, type: 'Libre' };
  }

  // Closed lists of matching realm → Réservée (or Base for some classes)
  if (realmMatchesClass && rn.includes('closed')) {
    return { cost: isPure ? 3 : 6, type: 'Réservée' };
  }

  // Evil lists of matching realm
  if (realmMatchesClass && rn.includes('evil')) {
    return { cost: isPure ? 6 : 10, type: 'Autre' };
  }

  // Arcane lists
  if (rn.includes('arcane') || rn.includes('other')) {
    return { cost: isPure ? 4 : 8, type: 'Autre' };
  }

  // Different realm entirely
  return { cost: isPure ? 8 : 12, type: 'Autre' };
}

// Realm codes where hasSpells=true (avoids circular import with classes.js)
const REALM_HAS_SPELLS = { 3: true, 5: true, 7: true, 8: true, 9: true, 10: true };

/**
 * Is this class a pure/hybrid spell caster?
 */
export function isPureCaster(cls) {
  if (!cls) return false;
  if (cls.caster_type >= 3) return true; // Hybrid
  return cls.caster_type === 2 && !!REALM_HAS_SPELLS[cls.realm_code]; // Pure
}

/**
 * Get DP cost per spell rank: 1 for pure/hybrid, 4 for semi, 20 for non-caster.
 */
export function getSpellRankCost(cls) {
  if (!cls) return 20;
  if (isPureCaster(cls)) return 1;
  if (cls.caster_type === 2) return 4; // Semi-caster
  return 20;
}

/**
 * Get the spell block size (levels learned per successful SGR).
 * Pure/Hybrid with base_own lists get 10, everything else gets 5.
 */
export function getSpellBlockSize(cls, listType) {
  if (!cls) return 5;
  const isPure = cls.caster_type >= 3 || (cls.caster_type === 2 && REALM_HAS_SPELLS[cls.realm_code]);
  if (isPure && listType === 'base_own') return 10;
  return 5;
}

/**
 * Determine list type key for spell mechanics.
 * Maps from getSpellListCost().type to internal type keys.
 */
export function getListTypeKey(costType, isBaseOwn) {
  if (isBaseOwn) return 'base_own';
  switch (costType) {
    case 'Libre': return 'open';
    case 'Réservée': return 'closed';
    default: return 'other';
  }
}

/**
 * Extract base spell list names for a class from couts.json.
 * Parses the $ marker section in cost_values.
 * @param {number} classIndex — index into classes.json (mapped to couts via CLASS_TO_COUTS_MAP)
 * @returns {string[]} — array of base spell list names (FR)
 */
export function getClassBaseSpellLists(classIndex) {
  const couts = getData().couts;
  if (!couts || !couts.classes) return [];
  // Map classes.json index to couts.json index
  const coutsIndex = getCoutsIndex(classIndex);
  if (coutsIndex < 0 || coutsIndex >= couts.classes.length) return [];

  const costValues = couts.classes[coutsIndex].cost_values;

  // Find $ marker
  let dIdx = -1;
  for (let i = 0; i < costValues.length; i++) {
    if (String(costValues[i]).includes('$') && !String(costValues[i]).includes('[')) { dIdx = i; break; }
  }
  if (dIdx === -1) return [];

  // Find * end marker
  let sIdx = -1;
  for (let i = dIdx + 1; i < costValues.length; i++) {
    const v = String(costValues[i]);
    if (v.includes('*') && v.length <= 4) { sIdx = i; break; }
  }
  if (sIdx === -1 || sIdx === dIdx + 1) return [];

  // Collect tokens, reconstruct quoted strings
  const tokens = costValues.slice(dIdx + 1, sIdx).map(v => String(v));
  const strings = [];
  let current = '';
  for (const tok of tokens) {
    const s = tok.startsWith('"');
    const e = tok.endsWith('"');
    if (s && e) {
      strings.push(tok.replace(/^"|"$/g, ''));
    } else if (s) {
      current = tok.replace(/^"/g, '');
    } else if (e) {
      current += ' ' + tok.replace(/"$/g, '');
      strings.push(current);
      current = '';
    } else {
      current += (current ? ' ' : '') + tok;
    }
  }

  // Pattern: name_fr, ref, name_en, ref — repeated
  // Refs are short codes: MS, SL, RMC1-4
  const REFS = new Set(['MS', 'SL', 'RMC1', 'RMC2', 'RMC3', 'RMC4']);
  const names = [];
  let i = 0;
  while (i < strings.length) {
    const val = strings[i];
    if (REFS.has(val) || val === '&') { i++; continue; }
    // Skip entries that look like class references (e.g. "Magician MS", "Evil Cleric SL")
    if (/^[A-Z][a-z]+ (MS|SL|RMC\d)$/.test(val) || /^(Evil |Closed |Arcane )/.test(val)) { i++; continue; }
    names.push(val);
    i += 4; // name_fr, ref, name_en, ref
  }
  return names;
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

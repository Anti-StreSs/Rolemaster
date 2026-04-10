// spell-compendium.js — Spell Compendium engine
// Lazy-loads spells_detail.json, provides filtering, matching, and formatting

import { getData } from './data-loader.js';

let spellData = null;
let listIndex = null;   // Map<listId, listObj>
let listByName = null;  // Map<name_en_lower, listObj>
let spellsByList = null; // Map<listId, spell[]>

/**
 * Lazy-load spells_detail.json (called on first compendium open).
 * Returns { lists, spells, _metadata }.
 */
export async function loadSpellData() {
  if (spellData) return spellData;
  const resp = await fetch('./data/spells_detail.json');
  if (!resp.ok) throw new Error('Failed to load spells_detail.json: ' + resp.status);
  spellData = await resp.json();

  // Build indices
  listIndex = new Map();
  listByName = new Map();
  spellsByList = new Map();

  for (const list of spellData.lists) {
    listIndex.set(list.id, list);
    listByName.set((list.name_en_clean || list.name_en).toLowerCase(), list);
    if (list.name_fr) listByName.set(list.name_fr.toLowerCase(), list);
  }
  for (const sp of spellData.spells) {
    if (!spellsByList.has(sp.list_id)) spellsByList.set(sp.list_id, []);
    spellsByList.get(sp.list_id).push(sp);
  }

  buildBridgeMap();
  extractSourceRefs();

  // Load optional FR translation patch (pwa/data/spell_translations_fr.json)
  try {
    const patchResp = await fetch('./data/spell_translations_fr.json');
    if (patchResp.ok) {
      const patch = await patchResp.json();
      if (patch.list_translations) {
        for (const [id, fr] of Object.entries(patch.list_translations)) {
          const list = listIndex.get(id);
          if (list && fr) { list.name_fr = fr; listByName.set(fr.toLowerCase(), list); }
        }
      }
      if (patch.spell_translations) {
        for (const sp of spellData.spells) {
          if (patch.spell_translations[sp.id]) sp.name_fr = patch.spell_translations[sp.id];
        }
      }
      console.log(`Spell translations loaded: ${Object.keys(patch.list_translations || {}).length} lists, ${Object.keys(patch.spell_translations || {}).length} spells`);
    }
  } catch (e) { /* optional patch — silent if missing */ }

  return spellData;
}

/** Check if data is loaded. */
export function isSpellDataLoaded() { return !!spellData; }

/** Get metadata. */
export function getSpellMetadata() { return spellData?._metadata || null; }

/** Get all lists. */
export function getAllSpellLists() { return spellData?.lists || []; }

/** Get list by ID. */
export function getListById(id) { return listIndex?.get(id) || null; }

/** Get spells for a specific list ID, sorted by level. */
export function getSpellsForList(listId) {
  return (spellsByList?.get(listId) || []).sort((a, b) => a.level - b.level);
}

/**
 * Build a FR↔EN bridge map from sorts.json (authoritative bilingual source).
 * Enriches listByName so FR character spell names find their spells_detail entry.
 */
function buildBridgeMap() {
  const sorts = getData().sorts;
  if (!sorts?.realms) return;
  for (const realm of sorts.realms) {
    for (const group of realm.groups) {
      for (const list of group) {
        const fr = (list.name_fr || '').toLowerCase().trim();
        const en = (list.name_en || '').toLowerCase().trim();
        if (!fr || !en) continue;
        const detailList = findDetailListByEnName(en);
        if (detailList) {
          listByName.set(fr, detailList);
          if (!detailList.name_fr) detailList.name_fr = list.name_fr;
        }
      }
    }
  }
}

function findDetailListByEnName(enLower) {
  if (listByName.has(enLower)) return listByName.get(enLower);
  for (const [, list] of listIndex) {
    const clean = (list.name_en_clean || list.name_en || '').toLowerCase();
    if (clean === enLower) return list;
  }
  for (const [, list] of listIndex) {
    const clean = (list.name_en_clean || list.name_en || '').toLowerCase();
    if (clean.includes(enLower) || enLower.includes(clean)) return list;
  }
  return null;
}

/**
 * Match a character spell list name to a spells_detail list.
 * After bridge map, direct FR keys work; falls back to scan + fuzzy.
 */
export function matchCharacterList(charListName) {
  if (!listByName) return null;
  const key = charListName.toLowerCase().trim();
  // 1. Direct (works for EN and FR after bridge map)
  if (listByName.has(key)) return listByName.get(key);
  // 2. Exact scan on name_en_clean or name_fr
  for (const [, list] of listIndex) {
    const en = (list.name_en_clean || list.name_en || '').toLowerCase();
    const fr = (list.name_fr || '').toLowerCase();
    if (en === key || fr === key) return list;
  }
  // 3. Fuzzy substring (both directions)
  for (const [, list] of listIndex) {
    const en = (list.name_en_clean || list.name_en || '').toLowerCase();
    const fr = (list.name_fr || '').toLowerCase();
    if ((en && (en.includes(key) || key.includes(en))) ||
        (fr && (fr.includes(key) || key.includes(fr)))) return list;
  }
  return null;
}

/**
 * Get the full character spellbook: for each learned list, return
 * the list metadata + spells up to maxLevel.
 */
export function getCharacterSpellbook(character) {
  if (!character?.spellLists || !spellData) return [];
  return character.spellLists.map(cl => {
    const matched = matchCharacterList(cl.name);
    if (!matched) return { charList: cl, list: null, spells: [], matched: false };
    const allSpells = getSpellsForList(matched.id);
    const known = allSpells.filter(s => s.level <= (cl.maxLevel || 0));
    const beyond = allSpells.filter(s => s.level > (cl.maxLevel || 0));
    return { charList: cl, list: matched, spells: known, beyondSpells: beyond, matched: true };
  }).sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    return (a.charList.name || '').localeCompare(b.charList.name || '');
  });
}

/**
 * Filter lists by criteria.
 * @param {object} filters - { realm, listType, keyword, characterOnly }
 * @param {object} character - optional, for characterOnly filtering
 */
export function filterLists(filters = {}, character = null) {
  let lists = getAllSpellLists();
  const { realm, listType, keyword, characterOnly } = filters;

  if (realm) {
    const r = realm.toLowerCase();
    lists = lists.filter(l => l.realm.toLowerCase().includes(r));
  }
  if (listType && listType !== 'all') {
    lists = lists.filter(l => l.list_type === listType);
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    lists = lists.filter(l =>
      (l.name_en || '').toLowerCase().includes(kw) ||
      (l.name_fr || '').toLowerCase().includes(kw) ||
      (l.class_or_category || '').toLowerCase().includes(kw)
    );
  }
  if (characterOnly && character?.spellLists) {
    lists = lists.filter(l => {
      return character.spellLists.some(cl => {
        const matched = matchCharacterList(cl.name);
        return matched && matched.id === l.id;
      });
    });
  }
  return lists;
}

/**
 * Search spells by name across all lists.
 */
export function searchSpells(query, maxResults = 20) {
  if (!spellData?.spells) return [];
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const results = [];
  for (const sp of spellData.spells) {
    if ((sp.name_en || '').toLowerCase().includes(q) ||
        (sp.name_fr || '').toLowerCase().includes(q)) {
      const list = listIndex?.get(sp.list_id);
      results.push({ ...sp, listName: list?.name_en || sp.list_id, listNameFr: list?.name_fr });
      if (results.length >= maxResults) break;
    }
  }
  return results;
}

/**
 * Group lists by realm for display.
 */
export function groupListsByRealm(lists) {
  const groups = {};
  for (const l of lists) {
    const r = l.realm || 'Other';
    if (!groups[r]) groups[r] = [];
    groups[r].push(l);
  }
  // Sort within each realm by list_type then name
  const typeOrder = { base: 0, open: 1, closed: 2, training_package: 3 };
  for (const r of Object.keys(groups)) {
    groups[r].sort((a, b) => {
      const ta = typeOrder[a.list_type] ?? 9;
      const tb = typeOrder[b.list_type] ?? 9;
      if (ta !== tb) return ta - tb;
      return (a.name_en || '').localeCompare(b.name_en || '');
    });
  }
  return groups;
}

/** Realm display config: color + icon. */
export const REALM_COLORS = {
  'Essence':    { bg: '#faeeda', border: '#ba7517', text: '#633806', badge: 'Ess' },
  'Channeling': { bg: '#e1f5ee', border: '#0f6e56', text: '#04342c', badge: 'Cha' },
  'Mentalism':  { bg: '#eeedfe', border: '#534ab7', text: '#26215c', badge: 'Men' },
  'Arcane':     { bg: '#faece7', border: '#993c1d', text: '#4a1b0c', badge: 'Arc' },
  'Alchemy':    { bg: '#eaf3de', border: '#3b6d11', text: '#173404', badge: 'Alc' },
  'Other':      { bg: '#f1efe8', border: '#5f5e5a', text: '#2c2c2a', badge: '...' },
};

export function getRealmColor(realm) {
  return REALM_COLORS[realm] || REALM_COLORS['Other'];
}

/** List type labels FR/EN. */
export const LIST_TYPE_LABELS = {
  base:     { fr: 'Base', en: 'Base' },
  open:     { fr: 'Libre', en: 'Open' },
  closed:   { fr: 'Réservée', en: 'Closed' },
  training_package: { fr: 'Formation', en: 'Training' },
};

export function getListTypeLabel(type, lang) {
  return LIST_TYPE_LABELS[type]?.[lang] || type;
}

// ── Source reference extraction ─────────────────────────────────────────────

const BOOK_MAP = {
  'ESSENCE.xlsx':           'Spell Law (Essence)',
  'CHANNELING.xlsx':        'Spell Law (Channeling)',
  'MENTALISM.xlsx':         'Spell Law (Mentalism)',
  'ARCANE.xlsx':            'Arcane Companion',
  'ALCHEMY.xlsx':           'Alchemy Companion',
  'POWERS LIGHT DARK.xlsx': 'Powers of Light & Darkness',
};

function mapSourceToBook(file, sheet, ref) {
  let book = BOOK_MAP[file] || file || '';
  if (ref) {
    if (ref.includes('Essence Comp'))    book = 'Essence Companion';
    else if (ref.includes('Mentalism Comp'))  book = 'Mentalism Companion';
    else if (ref.includes('Channeling Comp')) book = 'Channeling Companion';
    else if (ref.includes('Elemental Comp'))  book = 'Elemental Companion';
    else if (ref.includes('Fire & Ice'))      book = 'Fire & Ice Companion';
    else if (ref.includes('Arcane Comp'))     book = 'Arcane Companion';
    else if (ref.includes('Construct'))       book = 'Construct Companion';
  }
  if (!ref && sheet && !['Open','Closed','TP'].includes(sheet)) {
    book = `Spell Law — ${sheet}`;
  }
  return book;
}

function extractSourceRefs() {
  for (const list of spellData.lists) {
    const match = (list.name_en || '').match(/\(([^)]+)\)/);
    if (match) list.source_ref = match[1].trim();
    list.source_book = mapSourceToBook(list.source_file, list.source_sheet, list.source_ref);
  }
}

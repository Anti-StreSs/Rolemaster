// spell-compendium.js — Spell Compendium engine
// Hybrid loader: tiny lists index for first paint, lazy params, per-realm description shards.

import { getData } from './data-loader.js';
import { getShard, putShard } from './db.js';
import { getAllClasses, getClassName } from './classes.js';

let spellData = null;           // full spells_detail payload (loaded lazily via ensureParams)
let listIndex = null;           // Map<listId, listObj>
let listByName = null;          // Map<name_en_lower, listObj>
let spellsByList = null;        // Map<listId, spell[]>
let listsLoaded = false;        // true after loadListsIndex()
let paramsLoaded = false;       // true after ensureParams()
let loadIndexPromise = null;    // dedup concurrent loadListsIndex() calls
let loadParamsPromise = null;   // dedup concurrent ensureParams() calls
const loadedShards = new Set(); // buckets already merged into spell objects
let manifestVersion; // cached spell_effects.manifest.json version — for IDB shard cache invalidation

/**
 * Fast first paint: fetch spell_lists_index.json (the 510 list records only).
 * Builds listIndex, listByName, runs buildBridgeMap.
 * source_book is already in the index (computed by build_spell_shards.py).
 * Idempotent; subsequent calls return immediately.
 */
export function loadListsIndex() {
  if (listsLoaded) return Promise.resolve();
  if (loadIndexPromise) return loadIndexPromise;
  loadIndexPromise = (async () => {
  const resp = await fetch('./data/spell_lists_index.json');
  if (!resp.ok) throw new Error('Failed to load spell_lists_index.json: ' + resp.status);
  const data = await resp.json();

  listIndex = new Map();
  listByName = new Map();

  for (const list of data.lists) {
    listIndex.set(list.id, list);
    listByName.set((list.name_en_clean || list.name_en).toLowerCase(), list);
    if (list.name_fr) listByName.set(list.name_fr.toLowerCase(), list);
  }

  buildBridgeMap();
  listsLoaded = true;
  })();
  return loadIndexPromise;
}

/**
 * Lazy-load spells_detail.json once (per-spell params: level, aoe, duration, range…).
 * Called automatically by getSpellsForList and openBook. Idempotent.
 */
export function ensureParams() {
  if (paramsLoaded) return Promise.resolve();
  if (loadParamsPromise) return loadParamsPromise;
  loadParamsPromise = (async () => {
  if (!listsLoaded) await loadListsIndex();

  const resp = await fetch('./data/spells_detail.json');
  if (!resp.ok) throw new Error('Failed to load spells_detail.json: ' + resp.status);
  spellData = await resp.json();

  spellsByList = new Map();
  for (const sp of spellData.spells) {
    if (!spellsByList.has(sp.list_id)) spellsByList.set(sp.list_id, []);
    spellsByList.get(sp.list_id).push(sp);
  }

  // Merge list metadata already fetched via index into spellData.lists
  for (const list of spellData.lists) {
    const indexed = listIndex.get(list.id);
    if (indexed?.described !== undefined) list.described = indexed.described;
  }

  // Rebuild indices from the full dataset (covers any name_fr added by bridge)
  for (const list of spellData.lists) {
    listIndex.set(list.id, list);
    listByName.set((list.name_en_clean || list.name_en).toLowerCase(), list);
    if (list.name_fr) listByName.set(list.name_fr.toLowerCase(), list);
  }

  buildBridgeMap();
  extractSourceRefs();

  // Optional FR translation patch
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
    }
  } catch (e) { /* optional */ }

  paramsLoaded = true;
  })();
  return loadParamsPromise;
}

/**
 * Load descriptions for a realm bucket: check IDB cache first, else fetch shard.
 * Merges description_en/description_fr onto spell objects already in spellsByList.
 * Idempotent — calling twice for the same bucket is a no-op.
 */
export async function loadDescriptionsForRealm(bucket) {
  if (loadedShards.has(bucket)) return;
  if (!paramsLoaded) await ensureParams();
  loadedShards.add(bucket); // mark early to prevent concurrent double-loads

  let effects = null;

  // Resolve current manifest version once (used to invalidate stale IDB shard caches)
  if (manifestVersion === undefined) {
    manifestVersion = null;
    try {
      const mf = await fetch('./data/spell_effects.manifest.json');
      if (mf.ok) { const m = await mf.json(); manifestVersion = m.version || null; }
    } catch (e) { /* manifest optional */ }
  }

  // Try IDB cache first — but only if its version matches the current manifest
  const cached = await getShard(bucket);
  if (cached?.effects && cached.version === manifestVersion) {
    effects = cached.effects;
  } else {
    try {
      const resp = await fetch(`./data/spell_effects.${bucket}.json`);
      if (resp.ok) {
        const data = await resp.json();
        effects = data.spell_effects || {};
        await putShard(bucket, effects, manifestVersion || 'unknown');
        console.log(`Spell shard loaded: ${bucket} (${Object.keys(effects).length} spells)`);
      }
    } catch (e) { /* shard optional */ }
  }

  if (!effects || !spellData?.spells) return;

  let n = 0;
  for (const sp of spellData.spells) {
    const e = effects[sp.id];
    if (!e) continue;
    if (e.description_en) sp.description_en = e.description_en;
    if (e.description_fr) sp.description_fr = e.description_fr;
    n++;
  }
  if (n > 0) console.log(`Shard ${bucket}: ${n} spells enriched`);
}

/** Convenience: resolve the list's realm bucket and load descriptions for it. */
export async function loadDescriptionsForList(listId) {
  const list = listIndex?.get(listId);
  if (!list) return;
  const { key } = resolveRealm(list.realm);
  await loadDescriptionsForRealm(key);
}

/**
 * Compatibility wrapper — preserves the existing single-call pattern.
 * Now: loads index + params (descriptions stream in per-realm on demand).
 */
export async function loadSpellData() {
  await loadListsIndex();
  await ensureParams();
  return spellData;
}

/** Get a spell by its id (across all lists). */
export function getSpellById(id) {
  if (!spellData?.spells) return null;
  return spellData.spells.find(s => s.id === id) || null;
}

/** True if a spell has any description text. */
export function spellHasDescription(sp) {
  return !!(sp && (sp.description_fr || sp.description_en));
}

/** Check if params are loaded (spells_detail.json). */
export function isSpellDataLoaded() { return paramsLoaded; }

/** True after loadListsIndex() returns. */
export function isIndexLoaded() { return listsLoaded; }

/** Get metadata. */
export function getSpellMetadata() { return spellData?._metadata || null; }

/** Get all lists (available after loadListsIndex). */
export function getAllSpellLists() {
  if (listsLoaded) return Array.from(listIndex?.values() || []);
  return spellData?.lists || [];
}

/** Get list by ID (available after loadListsIndex). */
export function getListById(id) { return listIndex?.get(id) || null; }

/** Get spells for a specific list ID, sorted by level. Loads params if needed. */
export async function getSpellsForList(listId) {
  await ensureParams();
  return (spellsByList?.get(listId) || []).slice().sort((a, b) => a.level - b.level);
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
export async function getCharacterSpellbook(character) {
  if (!character?.spellLists) return [];
  await ensureParams();
  const entries = await Promise.all(character.spellLists.map(async cl => {
    const matched = matchCharacterList(cl.name);
    if (!matched) return { charList: cl, list: null, spells: [], matched: false };
    const allSpells = await getSpellsForList(matched.id);
    const known = allSpells.filter(s => s.level <= (cl.maxLevel || 0));
    const beyond = allSpells.filter(s => s.level > (cl.maxLevel || 0));
    return { charList: cl, list: matched, spells: known, beyondSpells: beyond, matched: true };
  }));
  return entries.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    return (a.charList.name || '').localeCompare(b.charList.name || '');
  });
}

/**
/**
 * Build profession list from classes.js × distinct "Base" class_or_category values.
 * Returns [{value, label}] sorted; excludes generic TP/Open/Closed buckets.
 */
export function getProfessions(lang) {
  if (!listsLoaded) return [];
  const categories = new Set();
  for (const list of listIndex.values()) {
    if (list.list_type === 'base' && list.class_or_category) {
      categories.add(list.class_or_category);
    }
  }
  const allClasses = getAllClasses();
  const classMap = new Map();
  for (const cls of allClasses) {
    const en = getClassName(cls, 'en');
    const fr = getClassName(cls, 'fr');
    classMap.set(en, fr || en);
    if (fr) classMap.set(fr, fr);
  }

  const result = [];
  for (const cat of categories) {
    if (['TP', 'Open', 'Closed'].includes(cat)) continue;
    const base = cat.replace(/\s*Base\s*$/, '').trim();
    const label = (lang === 'fr' ? (classMap.get(base) || base) : base) + ' Base';
    result.push({ value: cat, label });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Filter lists by criteria.
 * @param {object} filters - { realm, listType, keyword, characterOnly }
 * @param {object} character - optional, for characterOnly filtering
 */
export function filterLists(filters = {}, character = null) {
  let lists = getAllSpellLists();
  const { realm, listType, keyword, characterOnly, profession } = filters;

  if (realm) {
    const r = realm.toLowerCase();
    lists = lists.filter(l => l.realm.toLowerCase().includes(r));
  }
  if (listType && listType !== 'all') {
    lists = lists.filter(l => l.list_type === listType);
  }
  if (profession) {
    lists = lists.filter(l => l.class_or_category === profession);
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

/** Realm display config. */
export const REALM_COLORS = {
  'Essence':    { bg: '#faeeda', border: '#ba7517', light: '#e8a23e', text: '#633806', badge: 'Ess', glyph: '❋', label_fr: 'Essence',      label_en: 'Essence' },
  'Channeling': { bg: '#e1f5ee', border: '#0f6e56', light: '#46c39f', text: '#04342c', badge: 'Cha', glyph: '☩', label_fr: 'Canalisation',  label_en: 'Channeling' },
  'Mentalism':  { bg: '#eeedfe', border: '#534ab7', light: '#9b92f2', text: '#26215c', badge: 'Men', glyph: '☉', label_fr: 'Mentalisme',    label_en: 'Mentalism' },
  'Arcane':     { bg: '#faece7', border: '#993c1d', light: '#e3804f', text: '#4a1b0c', badge: 'Arc', glyph: '✦', label_fr: 'Arcanes',       label_en: 'Arcane' },
  'Alchemy':    { bg: '#eaf3de', border: '#3b6d11', light: '#8fc451', text: '#173404', badge: 'Alc', glyph: '⚗', label_fr: 'Alchimie',      label_en: 'Alchemy' },
  'Other':      { bg: '#f1efe8', border: '#7a5a18', light: '#d8b765', text: '#3a2a0a', badge: '...',  glyph: '✶', label_fr: 'Autre',         label_en: 'Other' },
};

/**
 * Resolve any realm string (incl. compound "Channeling/Essence",
 * "Channeling (Unlife)", "Multi-Realm") to a full REALM_COLORS entry
 * plus { key, multi, raw } fields.
 */
export function resolveRealm(realm) {
  if (REALM_COLORS[realm]) return { ...REALM_COLORS[realm], key: realm.toLowerCase(), multi: false, raw: realm };
  const base = (realm || '').replace(/\s*\([^)]*\)\s*/g, '').split('/')[0].trim();
  if (REALM_COLORS[base]) {
    return { ...REALM_COLORS[base], key: base.toLowerCase(), multi: (realm || '').includes('/') || /multi/i.test(realm), raw: realm };
  }
  if (/multi/i.test(realm || '')) {
    return { ...REALM_COLORS['Arcane'], key: 'other', multi: true, raw: realm, glyph: '✸' };
  }
  return { ...REALM_COLORS['Other'], key: 'other', multi: false, raw: realm };
}

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

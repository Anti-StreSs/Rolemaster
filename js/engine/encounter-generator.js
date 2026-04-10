// encounter-generator.js — Pure logic, zero DOM dependency.
// Generates random encounters from bestiary.json using terrain-weighted pools.
// External PDF tables can be injected via injectEncounterTables() for future enrichment.

import {
  loadBestiaryData, isBestiaryLoaded, getAllCreatures, filterCreatures,
} from './bestiary.js';

// ── External table injection ────────────────────────────────────────────────
// Tables injected here take priority when useExternal=true.
// Expected shape: { terrain_id: [ { d100_min, d100_max, creature_id?, subcategory?, count_dice } ] }
let _externalTables = null;

export function injectEncounterTables(tables) {
  _externalTables = tables;
}

export function hasExternalTable(terrain) {
  return !!(_externalTables && _externalTables[terrain]);
}

// ── Terrain definitions ─────────────────────────────────────────────────────
// Rules: subcategory / category substring match → weight.
// Creatures not matching any rule get weight 0 and are excluded.

export const TERRAIN_DEFINITIONS = {
  forest: {
    name_fr: 'Forêt', name_en: 'Forest', icon: '🌲',
    rules: [
      { match: 'Herbivores',   weight: 25 },
      { match: 'Carnivores',   weight: 30 },
      { match: 'Insects',      weight: 15 },
      { match: 'Birds',        weight: 15 },
      { match: 'Reptile',      weight: 10 },
      { match: 'Humanoid',     weight: 20, category: 'races' },
      { match: 'Undead',       weight:  5, category: 'monsters' },
      { match: 'Lesser Demon', weight:  3 },
      { match: 'Fey',          weight: 10 },
      { match: 'Dragon',       weight:  2 },
    ],
  },
  plains: {
    name_fr: 'Plaines', name_en: 'Plains', icon: '🌾',
    rules: [
      { match: 'Herbivores',   weight: 40 },
      { match: 'Carnivores',   weight: 25 },
      { match: 'Birds',        weight: 20 },
      { match: 'Insects',      weight: 10 },
      { match: 'Humanoid',     weight: 25, category: 'races' },
      { match: 'Undead',       weight:  3 },
      { match: 'Lesser Demon', weight:  2 },
      { match: 'Dragon',       weight:  1 },
    ],
  },
  mountains: {
    name_fr: 'Montagnes', name_en: 'Mountains', icon: '⛰️',
    rules: [
      { match: 'Herbivores',   weight: 15 },
      { match: 'Carnivores',   weight: 20 },
      { match: 'Birds',        weight: 25 },
      { match: 'Reptile',      weight: 20 },
      { match: 'Giant',        weight: 15 },
      { match: 'Dragon',       weight: 10 },
      { match: 'Humanoid',     weight: 10, category: 'races' },
      { match: 'Undead',       weight:  5 },
    ],
  },
  underground: {
    name_fr: 'Souterrain', name_en: 'Underground', icon: '🕳️',
    rules: [
      { match: 'Insects',      weight: 25 },
      { match: 'Reptile',      weight: 20 },
      { match: 'Undead',       weight: 25 },
      { match: 'Demon',        weight: 15 },
      { match: 'Humanoid',     weight: 20, category: 'races' },
      { match: 'Giant',        weight: 10 },
      { match: 'Dragon',       weight:  8 },
      { match: 'Fungus',       weight: 10 },
    ],
  },
  aquatic: {
    name_fr: 'Aquatique', name_en: 'Aquatic', icon: '🌊',
    rules: [
      { match: 'Aquatic',      weight: 50 },
      { match: 'Fish',         weight: 30 },
      { match: 'Amphibian',    weight: 20 },
      { match: 'Reptile',      weight: 10 },
      { match: 'Undead',       weight:  5 },
      { match: 'Humanoid',     weight:  5, category: 'races' },
    ],
  },
  swamp: {
    name_fr: 'Marécage', name_en: 'Swamp', icon: '🐸',
    rules: [
      { match: 'Amphibian',    weight: 30 },
      { match: 'Reptile',      weight: 30 },
      { match: 'Insects',      weight: 25 },
      { match: 'Undead',       weight: 20 },
      { match: 'Carnivores',   weight: 15 },
      { match: 'Fey',          weight:  8 },
      { match: 'Demon',        weight:  5 },
    ],
  },
  urban: {
    name_fr: 'Urbain', name_en: 'Urban', icon: '🏙️',
    rules: [
      { match: 'Humanoid',     weight: 60, category: 'races' },
      { match: 'Rodent',       weight: 20 },
      { match: 'Undead',       weight: 10 },
      { match: 'Insects',      weight:  5 },
      { match: 'Lesser Demon', weight:  5 },
    ],
  },
  desert: {
    name_fr: 'Désert', name_en: 'Desert', icon: '🏜️',
    rules: [
      { match: 'Reptile',      weight: 35 },
      { match: 'Insects',      weight: 25 },
      { match: 'Carnivores',   weight: 15 },
      { match: 'Undead',       weight: 15 },
      { match: 'Humanoid',     weight: 10, category: 'races' },
      { match: 'Dragon',       weight:  5 },
    ],
  },
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Ensure bestiary data is loaded before generating.
 */
export async function ensureBestiaryLoaded() {
  if (!isBestiaryLoaded()) await loadBestiaryData();
}

/**
 * Generate a random encounter.
 * @param {Object} params
 * @param {string}  params.terrain      — key of TERRAIN_DEFINITIONS
 * @param {number}  params.levelMin
 * @param {number}  params.levelMax
 * @param {string}  params.category     — '' | 'animals' | 'monsters' | 'races'
 * @param {number}  params.groupSize    — number of distinct creatures to draw (1–5)
 * @param {boolean} params.useExternal  — use injected PDF tables if available
 * @returns {EncounterResult}
 */
export function generateEncounter({ terrain, levelMin, levelMax, category, groupSize, useExternal }) {
  if (useExternal && _externalTables?.[terrain]) {
    return _generateFromExternalTable(terrain, levelMin, levelMax, groupSize);
  }
  return _generateFromBestiary({ terrain, levelMin, levelMax, category, groupSize });
}

// ── Internal logic ──────────────────────────────────────────────────────────

function _generateFromBestiary({ terrain, levelMin, levelMax, category, groupSize }) {
  const terrainDef = TERRAIN_DEFINITIONS[terrain];
  if (!terrainDef) throw new Error(`Unknown terrain: ${terrain}`);

  let pool = filterCreatures({
    levelMin: levelMin ?? 0,
    levelMax: levelMax ?? 99,
    category: category || '',
  });

  const weighted = [];
  for (const c of pool) {
    const w = _computeWeight(c, terrainDef.rules);
    if (w > 0) weighted.push({ creature: c, weight: w });
  }

  if (weighted.length === 0) {
    const fallback = pool.slice(0, 20);
    if (!fallback.length) return { encounters: [], terrain, source: 'empty' };
    weighted.push(...fallback.map(c => ({ creature: c, weight: 1 })));
  }

  const results = [];
  const remaining = [...weighted];
  const n = Math.min(groupSize, remaining.length);
  for (let i = 0; i < n; i++) {
    const pick = _weightedRandom(remaining);
    if (!pick) break;
    remaining.splice(remaining.indexOf(pick), 1);
    results.push({
      creature: pick.creature,
      count: _rollCount(pick.creature),
      roll: Math.floor(Math.random() * 100) + 1,
    });
  }

  return { encounters: results, terrain, source: 'bestiary' };
}

function _generateFromExternalTable(terrain, levelMin, levelMax, groupSize) {
  const table = _externalTables[terrain];
  const roll = Math.floor(Math.random() * 100) + 1;
  const entry = table.find(e => roll >= e.d100_min && roll <= e.d100_max);
  if (!entry) return { encounters: [], terrain, source: 'external', roll };

  let creature = null;
  if (entry.creature_id) {
    creature = getAllCreatures().find(c => c.id === entry.creature_id) || null;
  } else if (entry.subcategory) {
    const pool = filterCreatures({ levelMin, levelMax }).filter(c =>
      (c.subcategory || '').toLowerCase().includes(entry.subcategory.toLowerCase())
    );
    creature = pool[Math.floor(Math.random() * pool.length)] || null;
  }

  if (!creature) return { encounters: [], terrain, source: 'external', roll };
  return {
    encounters: [{ creature, count: _rollCount(creature, entry.count_dice), roll }],
    terrain,
    source: 'external',
    tableRoll: roll,
  };
}

function _computeWeight(creature, rules) {
  let total = 0;
  const subcat = (creature.subcategory || '').toLowerCase();
  const cat = (creature.category || '').toLowerCase();
  for (const rule of rules) {
    const ms = rule.match.toLowerCase();
    if (!subcat.includes(ms) && !cat.includes(ms)) continue;
    if (rule.category && cat !== rule.category.toLowerCase()) continue;
    total += rule.weight;
  }
  return total;
}

function _weightedRandom(weighted) {
  const total = weighted.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return weighted[Math.floor(Math.random() * weighted.length)] || null;
  let r = Math.random() * total;
  for (const e of weighted) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return weighted[weighted.length - 1];
}

function _rollCount(creature, diceDef) {
  if (diceDef) return _evalDice(diceDef);
  const enc = creature.encounter?.number;
  if (enc && typeof enc === 'string' && enc.includes('-')) {
    const [lo, hi] = enc.split('-').map(Number);
    if (!isNaN(lo) && !isNaN(hi)) return lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  if (enc && !isNaN(parseInt(enc))) return parseInt(enc);
  const size = creature.size || 'M';
  if (['H', 'L'].includes(size)) return 1;
  if (size === 'M') return creature.level <= 5 ? Math.ceil(Math.random() * 4) : Math.ceil(Math.random() * 2);
  return Math.ceil(Math.random() * 6);
}

function _evalDice(def) {
  if (typeof def === 'number') return def;
  const m = String(def).match(/^(\d+)d(\d+)(?:\+(\d+))?$/i);
  if (!m) return 1;
  let r = 0;
  for (let i = 0; i < parseInt(m[1]); i++) r += Math.floor(Math.random() * parseInt(m[2])) + 1;
  return r + (parseInt(m[3]) || 0);
}

export function getOutlookLabel(outlook, lang) {
  const map = {
    A: { fr: 'Agressif', en: 'Aggressive' },
    N: { fr: 'Neutre',   en: 'Neutral'    },
    T: { fr: 'Timide',   en: 'Timid'      },
    F: { fr: 'Fuyant',   en: 'Fleeing'    },
  };
  return map[outlook]?.[lang] || map[outlook]?.fr || outlook || '—';
}

// Bestiary engine — lazy-load + filter/search/group for 449 creatures from C&T
import { BESTIARY_FR_PATCH } from './bestiary-translations.js';

let bestiaryData = null;
let creatureIndex = null;   // Map<id, creature>
let creaturesBySubcat = null; // Map<subcategory, creature[]>

export const CATEGORY_LABELS = {
  animals:  { fr: 'Animaux',  en: 'Animals',  icon: '🐾' },
  monsters: { fr: 'Monstres', en: 'Monsters', icon: '🐉' },
  races:    { fr: 'Races',    en: 'Races',    icon: '👤' },
};

export const SIZE_ORDER = ['T', 'S', 'M', 'L', 'H'];
export const SIZE_LABELS = {
  T: { fr: 'Minuscule', en: 'Tiny'   },
  S: { fr: 'Petit',     en: 'Small'  },
  M: { fr: 'Moyen',     en: 'Medium' },
  L: { fr: 'Grand',     en: 'Large'  },
  H: { fr: 'Énorme',    en: 'Huge'   },
};

export const CATEGORY_COLORS = {
  animals:  { bg: '#eaf3de', border: '#3b6d11', text: '#173404' },
  monsters: { bg: '#fcebeb', border: '#a32d2d', text: '#501313' },
  races:    { bg: '#e6f1fb', border: '#185fa5', text: '#042c53' },
};

export const ATTACK_TYPE_LABELS = {
  Ba:     { fr: 'Coup',          en: 'Bash'     },
  Bi:     { fr: 'Morsure',       en: 'Bite'     },
  Cl:     { fr: 'Griffe',        en: 'Claw'     },
  Cr:     { fr: 'Écrasement',    en: 'Crush'    },
  Gr:     { fr: 'Saisie',        en: 'Grapple'  },
  Ho:     { fr: 'Corne',         en: 'Horn'     },
  Pi:     { fr: 'Pince',         en: 'Pincer'   },
  St:     { fr: 'Dard',          en: 'Stinger'  },
  Ts:     { fr: 'Défense',       en: 'Tusk'     },
  Ti:     { fr: 'Minuscule',     en: 'Tiny'     },
  Ram:    { fr: 'Charge',        en: 'Ram'      },
  Sw:     { fr: 'Avaler',        en: 'Swallow'  },
  Tr:     { fr: 'Piétinement',   en: 'Trample'  },
  We:     { fr: 'Arme',          en: 'Weapon'   },
  Tail:   { fr: 'Queue',         en: 'Tail'     },
  Breath: { fr: 'Souffle',       en: 'Breath'   },
};

export async function loadBestiaryData() {
  if (bestiaryData) return bestiaryData;
  const resp = await fetch('./data/bestiary.json');
  if (!resp.ok) throw new Error('Failed to load bestiary.json: ' + resp.status);
  bestiaryData = await resp.json();
  creatureIndex = new Map();
  creaturesBySubcat = new Map();
  for (const c of bestiaryData.creatures) {
    creatureIndex.set(c.id, c);
    const sub = c.subcategory || 'Other';
    if (!creaturesBySubcat.has(sub)) creaturesBySubcat.set(sub, []);
    creaturesBySubcat.get(sub).push(c);
  }

  // 0. Apply FR description patch for creatures missing description_fr
  for (const creature of bestiaryData.creatures) {
    const patch = BESTIARY_FR_PATCH.get(creature.name_en);
    if (patch) {
      if (patch.description_fr && !creature.description_fr) {
        creature.description_fr = patch.description_fr;
      }
      if (patch.name_fr && creature.name_fr === creature.name_en) {
        creature.name_fr = patch.name_fr;
      }
    }
  }

  // 1. FR overlay (names, subcategories) — optional
  try {
    const frResp = await fetch('./data/bestiary-fr-overlay.json');
    if (frResp.ok) {
      const frData = await frResp.json();
      for (const entry of frData.creatures || []) {
        const creature = creatureIndex.get(entry.id);
        if (!creature) continue;
        if (entry.name_fr) creature.name_fr = entry.name_fr;
        if (entry.subcategory_fr) creature.subcategory_fr = entry.subcategory_fr;
        if (entry.table_parent_group_fr) creature.group_fr = entry.table_parent_group_fr;
      }
    }
  } catch (e) { /* optional */ }

  // 2. Encyclopedia — lore corpus with popup descriptions and lot4 notes
  try {
    const encResp = await fetch('./data/bestiary-encyclopedia.json');
    if (encResp.ok) {
      const encData = await encResp.json();
      if (encData.creatures) {
        for (const entry of encData.creatures) {
          const creature = creatureIndex.get(entry.creature_id);
          if (!creature) continue;
          creature._lore = {
            popup_en: entry.resolved_popup_en || null,
            popup_fr: entry.resolved_popup_fr || null,
            popup_source_en: entry.resolved_popup_en_source || null,
            popup_source_fr: entry.resolved_popup_fr_source || null,
            section_en: entry.section_description_en || null,
            section_fr: entry.section_description_fr || null,
            category_en: entry.category_description_en || null,
            category_fr: entry.category_description_fr || null,
            ecology_notes_en: entry.ecology_notes_en || null,
            ecology_notes_fr: entry.ecology_notes_fr || null,
            behavior_notes_en: entry.behavior_notes_en || null,
            behavior_notes_fr: entry.behavior_notes_fr || null,
            gm_notes_en: entry.gm_notes_en || null,
            gm_notes_fr: entry.gm_notes_fr || null,
            lore_card: entry.lore_card || null,
          };
        }
      }
      bestiaryData._encyclopedia = {
        categories: encData.categories || [],
        sections: encData.sections || [],
        groups: encData.groups || [],
      };
    }
  } catch (e) { /* optional */ }

  return bestiaryData;
}

export function getCreatureLore(creatureId, lang) {
  const creature = creatureIndex?.get(creatureId);
  if (!creature?._lore) return null;
  const lore = creature._lore;
  const fr = lang === 'fr';
  return {
    popup: fr ? (lore.popup_fr || lore.popup_en) : (lore.popup_en || lore.popup_fr),
    popupSource: fr ? lore.popup_source_fr : lore.popup_source_en,
    section: fr ? (lore.section_fr || lore.section_en) : lore.section_en,
    category: fr ? (lore.category_fr || lore.category_en) : lore.category_en,
    ecology: fr ? (lore.ecology_notes_fr || lore.ecology_notes_en) : (lore.ecology_notes_en || lore.ecology_notes_fr) || null,
    behavior: fr ? (lore.behavior_notes_fr || lore.behavior_notes_en) : (lore.behavior_notes_en || lore.behavior_notes_fr) || null,
    gmNotes: fr ? (lore.gm_notes_fr || lore.gm_notes_en) : (lore.gm_notes_en || lore.gm_notes_fr) || null,
    loreCard: lore.lore_card || null,
    hasLore: true,
  };
}

export function getSectionLore(sectionName, lang) {
  const enc = bestiaryData?._encyclopedia;
  if (!enc) return null;
  const section = enc.sections.find(s => s.title_en === sectionName || s.section_key === sectionName);
  if (!section) return null;
  return lang === 'fr' ? (section.description_fr || section.description_en) : section.description_en;
}

export function isBestiaryLoaded() {
  return bestiaryData !== null;
}

export function getBestiaryMetadata() {
  return bestiaryData?._metadata ?? null;
}

export function getAllCreatures() {
  return bestiaryData?.creatures ?? [];
}

export function getCreatureById(id) {
  return creatureIndex?.get(id) ?? null;
}

export function getCreaturesBySubcategory(subcat) {
  return creaturesBySubcat?.get(subcat) ?? [];
}

export function getUniqueSubcategories() {
  if (!bestiaryData) return [];
  return [...new Set(bestiaryData.creatures.map(c => c.subcategory || 'Other'))].sort();
}

export function filterCreatures(filters = {}) {
  if (!bestiaryData) return [];
  const { category = '', subcategory = '', keyword = '', levelMin = 0, levelMax = 99, sizeMin = '', sizeMax = '' } = filters;
  const kw = keyword.trim().toLowerCase();
  const sizeMinIdx = sizeMin ? SIZE_ORDER.indexOf(sizeMin) : 0;
  const sizeMaxIdx = sizeMax ? SIZE_ORDER.indexOf(sizeMax) : SIZE_ORDER.length - 1;

  return bestiaryData.creatures.filter(c => {
    if (category && c.category !== category) return false;
    if (subcategory && c.subcategory !== subcategory) return false;
    if (c.level != null && (c.level < levelMin || c.level > levelMax)) return false;
    if (sizeMin || sizeMax) {
      const idx = SIZE_ORDER.indexOf(c.size);
      if (idx < sizeMinIdx || idx > sizeMaxIdx) return false;
    }
    if (kw) {
      const haystack = [c.name_en, c.name_fr, c.subcategory, c.subcategory_fr, c.table_parent_group, c.table_parent_group_fr, c.description_en, c.physical].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });
}

export function searchCreatures(query, maxResults = 20) {
  if (!bestiaryData || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  return bestiaryData.creatures
    .filter(c => {
      const hay = [c.name_en, c.name_fr, c.subcategory, c.subcategory_fr, c.table_parent_group_fr].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    })
    .slice(0, maxResults);
}

export function groupCreaturesByCategory(creatures) {
  const groups = {};
  for (const c of creatures) {
    const cat = c.category || 'monsters';
    if (!groups[cat]) groups[cat] = { subcats: {} };
    const sub = c.subcategory || 'Other';
    if (!groups[cat].subcats[sub]) groups[cat].subcats[sub] = [];
    groups[cat].subcats[sub].push(c);
  }
  return groups;
}

export function formatAttacks(creature, lang) {
  if (!creature.attacks || creature.attacks.length === 0) {
    let raw = creature.attacks_raw || '';
    if (raw && lang === 'fr') {
      // Translate common attack type names in raw text
      for (const [code, labels] of Object.entries(ATTACK_TYPE_LABELS)) {
        if (labels.en && labels.fr) {
          raw = raw.replace(new RegExp(labels.en, 'gi'), labels.fr);
        }
      }
    }
    return raw || '\u2014';
  }
  return creature.attacks.map(atk => {
    if (atk.raw) return atk.raw; // unparsed spell/special
    const typeName = ATTACK_TYPE_LABELS[atk.type]?.[lang] || atk.type_en || atk.type;
    const pct = atk.percent != null ? ` ${atk.percent}%` : '';
    return `${atk.ob ?? '?'} ${typeName} (${atk.size || '?'})${pct}`;
  }).join(' / ');
}

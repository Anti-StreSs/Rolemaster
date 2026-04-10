/**
 * herbs.js — Herbs & Poisons engine (lazy-load)
 * Source: Herbs and Poisons.xlsx (RMSS / RMC / Shadow World)
 */

let _data = null;

export async function loadHerbs() {
  if (_data) return;
  const res = await fetch('./data/herbs.json');
  _data = await res.json();
}

function _requireLoaded() {
  if (!_data) throw new Error('herbs.js: call loadHerbs() first');
}

export function getCategories() {
  _requireLoaded();
  return _data.categories;
}

export function getAll() {
  _requireLoaded();
  return _data.herbs;
}

export function getByCategory(category_id) {
  _requireLoaded();
  return _data.herbs.filter(h => h.category === category_id);
}

export function getByMaxAF(max_af) {
  _requireLoaded();
  return _data.herbs.filter(h => h.af !== null && h.af <= max_af);
}

export function getByLocale(locale_code) {
  _requireLoaded();
  return _data.herbs.filter(h => h.codes && h.codes.locale_code === locale_code);
}

/** Full-text search on name + effect */
export function searchByEffect(query) {
  _requireLoaded();
  if (!query) return [];
  const q = query.toLowerCase();
  return _data.herbs.filter(h =>
    (h.effect_en && h.effect_en.toLowerCase().includes(q)) ||
    (h.name_en   && h.name_en.toLowerCase().includes(q))
  );
}

/** Antidotes whose effect mentions the given poison category keyword */
export function getAntidoteFor(poison_category) {
  _requireLoaded();
  const keyword = poison_category.replace('poison_', '');
  return _data.herbs.filter(h =>
    h.category === 'antidotes' &&
    h.effect_en &&
    h.effect_en.toLowerCase().includes(keyword)
  );
}

/** Herbs matching both climate and locale strings */
export function getRegionalHerbs(climate, locale) {
  _requireLoaded();
  const cl = climate ? climate.toLowerCase() : null;
  const lo = locale  ? locale.toLowerCase()  : null;
  return _data.herbs.filter(h => {
    const matchC = !cl || (h.climate && h.climate.toLowerCase().includes(cl));
    const matchL = !lo || (h.locale  && h.locale.toLowerCase().includes(lo));
    return matchC && matchL;
  });
}

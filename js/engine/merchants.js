/**
 * merchants.js — Treasure, Equipment & Merchants engine
 * Sources: tresor2.xlsm + RMSS Market Program.xlsx
 */

let _treasure = null;
let _equipment = null;

async function _loadTreasure() {
  if (_treasure) return;
  const res = await fetch('./data/treasure.json');
  _treasure = await res.json();
}

async function _loadEquipment() {
  if (_equipment) return;
  const res = await fetch('./data/equipment.json');
  _equipment = await res.json();
}

export async function loadAll() {
  await Promise.all([_loadTreasure(), _loadEquipment()]);
}

// ── Equipment ──────────────────────────────────────────────────────────────

export async function getEquipment() {
  await _loadEquipment();
  return _equipment;
}

export async function getItemsByCategory(category) {
  await _loadEquipment();
  return _equipment.items.filter(i => i.category === category);
}

export async function searchItems(query) {
  await _loadEquipment();
  const q = query.toLowerCase();
  return _equipment.items.filter(i =>
    i.name_en.toLowerCase().includes(q) ||
    (i.notes_en && i.notes_en.toLowerCase().includes(q))
  );
}

// ── Market pricing ─────────────────────────────────────────────────────────

const MARKET_STATS = {
  "Northern Silaar": { supply: { W: 1.1,  L: 1.0,  M: 0.95, G: 0.95, J: 0.9  }, skill: { W: 1, L: 1, M: 1, G: 0 } },
  "Iron Hold":       { supply: { W: 0.9,  L: 0.95, M: 1.05, G: 1.05, J: 1.05 }, skill: { W: 1, L: 1, M: 2, G: 1 } },
  "Port City":       { supply: { W: 1.0,  L: 1.0,  M: 1.0,  G: 1.0,  J: 1.0  }, skill: { W: 2, L: 2, M: 2, G: 0 } },
  "Dwarven Mine":    { supply: { W: 0.85, L: 0.9,  M: 1.1,  G: 1.1,  J: 1.1  }, skill: { W: 1, L: 1, M: 3, G: 2 } },
  "Barbarian Village": { supply: { W: 0.9, L: 0.9, M: 0.8,  G: 0.75, J: 0.75 }, skill: { W: 1, L: 1, M: 0, G: 0 } },
  "Soldier's Outpost": { supply: { W: 1.0, L: 0.95,M: 0.85, G: 0.75, J: 0.75 }, skill: { W: 1, L: 1, M: 1, G: 0 } },
  "Shelton":         { supply: { W: 0.95, L: 1.05, M: 1.0,  G: 1.0,  J: 1.0  }, skill: { W: 1, L: 1, M: 1, G: 0 } },
  "Gaalus":          { supply: { W: 0.8,  L: 0.9,  M: 0.9,  G: 0.75, J: 0.75 }, skill: { W: 2, L: 2, M: 2, G: 0 } },
};

export function getMarkets() {
  return Object.keys(MARKET_STATS).map(name => ({ id: name, name, ...MARKET_STATS[name] }));
}

/**
 * Calculate buy/sell price for an item in a given market.
 * @param {object} item — equipment item object
 * @param {string} market_name
 * @param {boolean} is_buying — true=buy price, false=sell price
 */
export function getMarketPrice(item, market_name, is_buying = true) {
  const market = MARKET_STATS[market_name];
  const base_sp = item.cost_base_sp;
  if (base_sp == null || !market) {
    return { price: base_sp, unit: 'sp', quality: 1 };
  }
  const resource   = item.resource || 'M';
  const supply_mod = market.supply[resource] ?? 1.0;
  const skill_lvl  = market.skill[resource] ?? 1;
  const skill_mod  = 1 + (skill_lvl - 1) * 0.1;  // each extra skill level = +10%
  const buy_price  = base_sp * supply_mod * skill_mod;
  const price = is_buying ? buy_price : buy_price * 0.75;
  return { price: Math.round(price * 100) / 100, unit: 'sp', quality: skill_lvl };
}

// ── Merchant inventory generator ───────────────────────────────────────────

const POOL_SIZES = {
  village: { min: 15, max: 25 },
  town:    { min: 30, max: 50 },
  city:    { min: 60, max: 100 },
};

function _d100() { return Math.floor(Math.random() * 100) + 1; }
function _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export async function getMerchantInventory({ town_size = 'town', speciality = null, market = 'Port City' } = {}) {
  await _loadEquipment();
  const pool_cfg = POOL_SIZES[town_size] || POOL_SIZES.town;
  const pool_size = _rand(pool_cfg.min, pool_cfg.max);

  let candidates = [..._equipment.items];
  if (speciality) {
    const pref = candidates.filter(i => i.category.toLowerCase() === speciality.toLowerCase());
    const rest = candidates.filter(i => i.category.toLowerCase() !== speciality.toLowerCase());
    // 70% from speciality category, 30% from others
    candidates = pref.length ? [...pref, ...rest.slice(0, Math.floor(pool_size * 0.3))] : rest;
  }

  const selected = [];
  const used_ids = new Set();
  const shuffled = candidates.sort(() => Math.random() - 0.5);

  for (const item of shuffled) {
    if (selected.length >= pool_size) break;
    if (used_ids.has(item.id)) continue;
    const availability = Math.max(5, 100 - (item.difficulty || 0) * 15);
    if (_d100() > availability) continue;
    used_ids.add(item.id);
    const quality = (() => { const d6 = _rand(1, 6); return d6 <= 2 ? 1 : d6 <= 5 ? 2 : 3; })();
    const price_info = getMarketPrice(item, market, true);
    selected.push({ ...item, quality, price_info });
  }

  return { items: selected, market, town_size };
}

// ── Treasure rolling ──────────────────────────────────────────────────────

export async function rollTreasure(type_code) {
  await _loadTreasure();

  const type = _treasure.treasure_types.find(t => t.code === type_code.toUpperCase());
  if (!type) return { error: `Unknown treasure type: ${type_code}` };

  const wealth = [];
  for (let i = 0; i < type.num_item_rolls; i++) {
    const roll = _d100();
    const row  = _treasure.wealth_amounts_table.rows.find(r => roll >= r.min && roll <= r.max);
    const lvl  = (type.wealth_level || 1) - 1;  // 0-indexed for array
    if (row && row.amounts[lvl]) {
      wealth.push({ roll, label_fr: row.amounts[lvl] });
    }
  }

  const items = [];
  const nb_items = type.num_item_rolls || 1;
  for (let i = 0; i < nb_items; i++) {
    const roll = _d100();
    const row  = _treasure.item_rolls_table.rows.find(r => roll >= r.min && roll <= r.max);
    if (row) {
      const nb = row.nb[Math.min((type.wealth_level || 1) - 1, 4)] || 0;
      if (nb > 0) {
        // Pick random item category
        const cats = _treasure.item_categories;
        const cat  = cats[Math.floor(Math.random() * cats.length)];
        items.push({ roll, category_fr: cat.label_fr, nb_items: nb });
      }
    }
  }

  return { type: type_code, wealth_label: type.wealth_label_fr, wealth, items };
}

export async function getTreasureTypes() {
  await _loadTreasure();
  return _treasure.treasure_types;
}

/**
 * merchants-ui.js — Marchands, Trésor & Équipement
 */
import {
  loadAll, getEquipment,
  getMerchantInventory, getMarkets, getMarketPrice,
  rollTreasure, getTreasureTypes,
} from '../engine/merchants.js';

let _app;

export function resetMerchants() {
  // nothing to clean on re-render
}

export async function renderMerchants(app) {
  _app = app;
  const main = document.getElementById('app-main');
  const lang = app.state?.lang || 'fr';
  const t = (fr, en) => lang === 'en' ? en : fr;

  main.innerHTML = `<div class="merch-loading"><div class="merch-spinner"></div></div>`;

  try {
    await loadAll();
  } catch (e) {
    main.innerHTML = `<p style="color:#a32d2d;padding:1rem">Erreur chargement données marchands: ${e.message}</p>`;
    return;
  }

  const [markets, types, eq] = await Promise.all([
    Promise.resolve(getMarkets()),
    getTreasureTypes(),
    getEquipment(),
  ]);

  main.innerHTML = `
<div class="merch-root">
  <!-- Tabs: Marchands | Trésor | Équipement -->
  <div class="merch-tabs">
    <button class="merch-tab is-active" data-tab="shop">${t('Marchands', 'Shop')}</button>
    <button class="merch-tab" data-tab="treasure">
      <img src="assets/ui/decorations/footer/footer_treasure_chest.webp" alt="" style="width:1.1rem;height:1.1rem;object-fit:contain;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">
      ${t('Trésor', 'Treasure')}
    </button>
    <button class="merch-tab" data-tab="equipment">${t('Équipement', 'Equipment')}</button>
  </div>

  <!-- Shop generator -->
  <div class="merch-panel" id="merch-panel-shop">
    <div class="merch-toolbar">
      <select class="merch-select" id="merch-town-size">
        <option value="village">Village (15–25)</option>
        <option value="town" selected>Bourg (30–50)</option>
        <option value="city">${t('Ville (60–100)', 'City (60–100)')}</option>
      </select>
      <select class="merch-select" id="merch-speciality">
        <option value="">${t('Généraliste', 'General')}</option>
        <option value="Weapons">${t('Armes', 'Weapons')}</option>
        <option value="Armor">${t('Armures', 'Armor')}</option>
        <option value="Misc">${t('Divers', 'Misc')}</option>
        <option value="Foods">${t('Vivres', 'Foods')}</option>
      </select>
      <select class="merch-select" id="merch-market">
        ${markets.map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
      </select>
      <button class="merch-btn merch-btn-primary" id="merch-gen-shop">${t('Générer', 'Generate')}</button>
    </div>
    <p class="merch-hint">${t('Génère un inventaire procédural selon la taille du bourg, la spécialité et le marché régional.', 'Generates a procedural inventory based on town size, speciality, and regional market.')}</p>
    <div id="merch-shop-result" class="merch-item-grid"></div>
  </div>

  <!-- Treasure roller -->
  <div class="merch-panel merch-panel-hidden" id="merch-panel-treasure">
    <div class="merch-treasure-selector">
      <label class="merch-label">${t('Type de trésor :', 'Treasure type:')}</label>
      <select class="merch-select" id="merch-treasure-type">
        ${types.map(tt => `<option value="${tt.code}">Type ${tt.code} — ${tt.wealth_label_fr} (${tt.num_item_rolls} objet${tt.num_item_rolls > 1 ? 's' : ''})</option>`).join('')}
      </select>
      <button class="merch-btn merch-btn-primary" id="merch-roll-treasure">${t('Tirer le trésor', 'Roll Treasure')}</button>
    </div>
    <div id="merch-treasure-result"></div>
  </div>

  <!-- Equipment browser -->
  <div class="merch-panel merch-panel-hidden" id="merch-panel-equipment">
    <div class="merch-toolbar">
      <input class="merch-search" id="merch-eq-search" type="search" placeholder="${t('Rechercher…', 'Search…')}">
      <select class="merch-select" id="merch-eq-cat">
        <option value="">${t('Toutes catégories', 'All categories')}</option>
        ${eq.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <label class="merch-label">${t('Prix :', 'Price:')}</label>
      <select class="merch-select merch-select-sm" id="merch-currency">
        <option value="sp">SP (RMSS)</option>
        <option value="gp_rm2">PO (RM2)</option>
      </select>
    </div>
    <div id="merch-eq-list" class="merch-item-grid"></div>
  </div>
</div>`;

  _renderEquipmentList(eq, '', '', 'sp');
  _bindEvents(eq);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _formatPrice(item, currency) {
  if (item.cost_base_sp == null) return '—';
  if (currency === 'gp_rm2') {
    const po = item.cost_base_sp / 10;
    return po < 0.1 ? `${Math.round(item.cost_base_sp * 10)} pa` : `${po.toFixed(po < 1 ? 2 : 0)} po`;
  }
  const v = item.cost_value, u = item.cost_unit;
  if (v && u) return `${v} ${u}`;
  return `${item.cost_base_sp} sp`;
}

function _renderEquipmentList(eq, query, cat, currency) {
  const container = document.getElementById('merch-eq-list');
  if (!container) return;
  let items = eq.items;
  if (cat)   items = items.filter(i => i.category === cat);
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(i =>
      i.name_en.toLowerCase().includes(q) ||
      (i.notes_en && i.notes_en.toLowerCase().includes(q))
    );
  }
  if (!items.length) {
    container.innerHTML = `<p class="merch-empty">Aucun résultat</p>`;
    return;
  }
  container.innerHTML = items.map(item => `
<div class="merch-item-card">
  <div class="merch-item-top">
    <span class="merch-item-name">${item.name_en}</span>
    <span class="merch-price-badge">${_formatPrice(item, currency)}</span>
  </div>
  <div class="merch-item-meta">
    <span class="merch-cat-tag">${item.category}</span>
    ${item.resource ? `<span class="merch-res-tag">${item.resource}</span>` : ''}
    ${item.weight_min_lbs != null ? `<span class="merch-weight">${item.weight_min_lbs}${item.weight_max_lbs !== item.weight_min_lbs ? '–' + item.weight_max_lbs : ''} lbs</span>` : ''}
  </div>
  ${item.notes_en ? `<div class="merch-item-notes">${item.notes_en}</div>` : ''}
</div>`).join('');
}

function _renderShopResult(result) {
  const container = document.getElementById('merch-shop-result');
  if (!container) return;
  const currency = document.getElementById('merch-currency')?.value || 'sp';
  if (!result.items.length) {
    container.innerHTML = `<p class="merch-empty">Aucun article disponible.</p>`;
    return;
  }
  const qual_labels = ['', 'Usé', 'Standard', 'Qualité'];
  container.innerHTML = result.items.map(item => {
    const pi = item.price_info;
    const price_str = pi ? `${pi.price.toFixed(2)} sp` : _formatPrice(item, currency);
    return `
<div class="merch-item-card merch-shop-card">
  <div class="merch-item-top">
    <span class="merch-item-name">${item.name_en}</span>
    <span class="merch-price-badge">${price_str}</span>
  </div>
  <div class="merch-item-meta">
    <span class="merch-cat-tag">${item.category}</span>
    ${item.quality ? `<span class="merch-quality-badge merch-q${item.quality}">${qual_labels[item.quality] || ''}</span>` : ''}
  </div>
  ${item.notes_en ? `<div class="merch-item-notes">${item.notes_en}</div>` : ''}
</div>`;
  }).join('');
}

function _renderTreasureResult(result) {
  const container = document.getElementById('merch-treasure-result');
  if (!container) return;
  if (result.error) {
    container.innerHTML = `<p style="color:#a32d2d;font-size:0.82rem">${result.error}</p>`;
    return;
  }
  const wealthHtml = result.wealth.length
    ? result.wealth.map(w => `<li>${w.label_fr} <small class="merch-roll-ref">(d100=${w.roll})</small></li>`).join('')
    : '<li><em>Aucune richesse</em></li>';
  const itemsHtml = result.items.length
    ? result.items.map(i => `<li>${i.nb_items}× ${i.category_fr} <small class="merch-roll-ref">(d100=${i.roll})</small></li>`).join('')
    : "<li><em>Pas d'objets</em></li>";
  container.innerHTML = `
<div class="merch-treasure-result">
  <div class="merch-treasure-header">Type ${result.type} — ${result.wealth_label}</div>
  <div class="merch-treasure-body">
    <div class="merch-treasure-section">
      <div class="merch-treasure-label">Richesses</div>
      <ul class="merch-treasure-list">${wealthHtml}</ul>
    </div>
    <div class="merch-treasure-section">
      <div class="merch-treasure-label">Objets</div>
      <ul class="merch-treasure-list">${itemsHtml}</ul>
    </div>
  </div>
</div>`;
}

function _bindEvents(eq) {
  // Tab switching
  document.querySelectorAll('.merch-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.merch-tab').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.merch-panel').forEach(p => p.classList.add('merch-panel-hidden'));
      btn.classList.add('is-active');
      const panel = document.getElementById(`merch-panel-${btn.dataset.tab}`);
      if (panel) panel.classList.remove('merch-panel-hidden');
    });
  });

  // Equipment search/filter
  const searchEl = document.getElementById('merch-eq-search');
  const catEl    = document.getElementById('merch-eq-cat');
  const currEl   = document.getElementById('merch-currency');
  const rerender = () => _renderEquipmentList(eq, searchEl?.value || '', catEl?.value || '', currEl?.value || 'sp');
  searchEl?.addEventListener('input',  rerender);
  catEl?.addEventListener('change',    rerender);
  currEl?.addEventListener('change',   rerender);

  // Shop generator
  document.getElementById('merch-gen-shop')?.addEventListener('click', async () => {
    const town_size  = document.getElementById('merch-town-size')?.value  || 'town';
    const speciality = document.getElementById('merch-speciality')?.value || null;
    const market     = document.getElementById('merch-market')?.value     || 'Port City';
    const result = await getMerchantInventory({ town_size, speciality, market });
    _renderShopResult(result);
  });

  // Treasure roller
  document.getElementById('merch-roll-treasure')?.addEventListener('click', async () => {
    const type = document.getElementById('merch-treasure-type')?.value || 'C';
    const result = await rollTreasure(type);
    _renderTreasureResult(result);
  });
}

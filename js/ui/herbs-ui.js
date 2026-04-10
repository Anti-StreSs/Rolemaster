/**
 * herbs-ui.js — Vue Herbes & Poisons
 */
import {
  loadHerbs, getAll, getCategories, getByCategory, searchByEffect,
  getByMaxAF, getRegionalHerbs,
} from '../engine/herbs.js';

let _app;

const CATEGORY_GROUPS = {
  'Soins':            ['concussion','bone','burns','circulatory','muscle','nerve','organ','stun'],
  'Antidotes & Vie':  ['antidotes','life'],
  'Amélioration':     ['general','mystical','physical','stats','breads','intoxicants'],
  'Poisons':          ['poison_circ','poison_conv','poison_muscle','poison_nerve','poison_reduct','poison_resp'],
};

const CLIMATES = [
  'Mild Temperature','Cool Temperature','Hot Temperature',
  'Arid','Frigid','Semi Arid','Everlasting Cold',
];

let _state = {
  tab: 'herbs',       // 'herbs' | 'poisons'
  query: '',
  category: '',
  af_max: '',
  climate: '',
};

export function resetHerbs() {
  _state = { tab: 'herbs', query: '', category: '', af_max: '', climate: '' };
}

export async function renderHerbs(app) {
  _app = app;
  const main = document.getElementById('app-main');
  const lang = app.state?.lang || 'fr';
  const t = (fr, en) => lang === 'en' ? en : fr;

  main.innerHTML = `<div class="herb-loading"><div class="herb-spinner"></div></div>`;

  try {
    await loadHerbs();
  } catch (e) {
    main.innerHTML = `<p style="color:#a32d2d;padding:1rem">Erreur chargement herbes: ${e.message}</p>`;
    return;
  }

  const cats = getCategories();

  main.innerHTML = `
<div class="herb-root">
  <div class="herb-header">
    <h2 class="herb-title">${t('Herbes & Poisons', 'Herbs & Poisons')}</h2>
    <p class="herb-subtitle">${t('321 entrées — RMSS / RMC / Shadow World', '321 entries — RMSS / RMC / Shadow World')}</p>
  </div>

  <!-- Main tabs: Herbes / Poisons -->
  <div class="herb-tabs">
    <button class="herb-tab ${_state.tab === 'herbs' ? 'is-active' : ''}" data-htab="herbs">${t('Herbes', 'Herbs')}</button>
    <button class="herb-tab ${_state.tab === 'poisons' ? 'is-active' : ''}" data-htab="poisons">${t('Poisons', 'Poisons')}</button>
  </div>

  <!-- Filters -->
  <div class="herb-filters">
    <input class="herb-search" type="search" id="herb-search" placeholder="${t('Rechercher nom ou effet…', 'Search name or effect…')}" value="${_state.query}">
    <select class="herb-select" id="herb-cat">
      <option value="">${t('Toutes catégories', 'All categories')}</option>
      ${Object.entries(CATEGORY_GROUPS).map(([group, ids]) => `
        <optgroup label="${group}">
          ${ids.map(id => {
            const cat = cats.find(c => c.id === id);
            if (!cat) return '';
            return `<option value="${id}" ${_state.category === id ? 'selected' : ''}>${cat.label_fr}</option>`;
          }).join('')}
        </optgroup>`).join('')}
    </select>
    <select class="herb-select" id="herb-climate">
      <option value="">${t('Tout terrain', 'All climates')}</option>
      ${CLIMATES.map(c => `<option value="${c}" ${_state.climate === c ? 'selected' : ''}>${c}</option>`).join('')}
    </select>
    <div class="herb-af-row">
      <label class="herb-af-label">AF ≤ <span id="herb-af-val">${_state.af_max !== '' ? _state.af_max : '∞'}</span></label>
      <input type="range" id="herb-af" class="herb-af-slider" min="0" max="50" step="1"
        value="${_state.af_max !== '' ? _state.af_max : 50}">
      <button class="herb-af-reset" id="herb-af-reset" title="${t('Réinitialiser', 'Reset')}">×</button>
    </div>
  </div>

  <div id="herb-count" class="herb-count"></div>
  <div id="herb-grid" class="herb-card-grid"></div>
</div>`;

  _renderGrid();
  _bindEvents();
}

function _getFiltered() {
  const isPoisons = _state.tab === 'poisons';
  let results;

  if (_state.query) {
    results = searchByEffect(_state.query);
  } else if (_state.category) {
    results = getByCategory(_state.category);
  } else {
    results = getAll();
  }

  // Tab filter: poisons vs herbs
  results = results.filter(h => h.is_poison === isPoisons);

  // Category filter (if query active and category selected too)
  if (_state.category && _state.query) {
    results = results.filter(h => h.category === _state.category);
  }

  // AF filter
  if (_state.af_max !== '') {
    results = results.filter(h => h.af !== null && h.af <= parseInt(_state.af_max));
  }

  // Climate filter
  if (_state.climate) {
    results = results.filter(h => h.climate && h.climate.includes(_state.climate));
  }

  return results;
}

function _buildCard(h) {
  const catLabel = h.category ? h.category.replace('poison_', '').replace(/_/g, ' ') : '';
  const metaParts = [catLabel, h.form, h.preparation, h.climate, h.locale].filter(Boolean);

  return `<div class="herb-card ${h.is_poison ? 'herb-card-poison' : ''}">
  <div class="herb-card-header">
    <span class="herb-name">${h.name_en}</span>
    <div class="herb-badges">
      ${h.af !== null ? `<span class="herb-af-badge">AF ${h.af}</span>` : ''}
      ${h.is_poison ? `<span class="herb-poison-badge">Poison</span>` : ''}
    </div>
  </div>
  ${metaParts.length ? `<div class="herb-meta">${metaParts.join(' · ')}</div>` : ''}
  ${h.effect_en ? `<div class="herb-effect">${h.effect_en}</div>` : ''}
  <div class="herb-footer">
    ${h.cost_sp != null ? `<span class="herb-cost">${h.cost_sp} sp</span>` : ''}
    ${h.difficulty ? `<span class="herb-difficulty">${h.difficulty}</span>` : ''}
    ${h.source_ref ? `<span class="herb-source">${h.source_ref}</span>` : ''}
  </div>
</div>`;
}

function _renderGrid() {
  const grid  = document.getElementById('herb-grid');
  const count = document.getElementById('herb-count');
  if (!grid) return;

  const results = _getFiltered();
  if (count) count.textContent = `${results.length} résultat${results.length !== 1 ? 's' : ''}`;

  if (!results.length) {
    grid.innerHTML = `<p class="herb-empty">Aucun résultat pour ces critères.</p>`;
    return;
  }
  grid.innerHTML = results.map(_buildCard).join('');
}

function _bindEvents() {
  // Tab switching
  document.querySelectorAll('.herb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.tab = btn.dataset.htab;
      _state.category = '';
      document.querySelectorAll('.herb-tab').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      // Reset category select to show relevant options
      document.getElementById('herb-cat').value = '';
      _renderGrid();
    });
  });

  document.getElementById('herb-search')?.addEventListener('input', e => {
    _state.query = e.target.value.trim();
    _renderGrid();
  });

  document.getElementById('herb-cat')?.addEventListener('change', e => {
    _state.category = e.target.value;
    _renderGrid();
  });

  document.getElementById('herb-climate')?.addEventListener('change', e => {
    _state.climate = e.target.value;
    _renderGrid();
  });

  const slider = document.getElementById('herb-af');
  const afVal  = document.getElementById('herb-af-val');
  slider?.addEventListener('input', () => {
    _state.af_max = slider.value === '50' ? '' : slider.value;
    afVal.textContent = _state.af_max !== '' ? _state.af_max : '∞';
    _renderGrid();
  });

  document.getElementById('herb-af-reset')?.addEventListener('click', () => {
    _state.af_max = '';
    if (slider) slider.value = 50;
    if (afVal) afVal.textContent = '∞';
    _renderGrid();
  });
}

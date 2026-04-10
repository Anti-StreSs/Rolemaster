// Bestiary UI — browser + creature detail view

import {
  loadBestiaryData, isBestiaryLoaded, getBestiaryMetadata, getAllCreatures,
  getCreatureById, filterCreatures, groupCreaturesByCategory,
  getUniqueSubcategories, formatAttacks, getCreatureLore, getSectionLore,
  CATEGORY_LABELS, CATEGORY_COLORS, SIZE_LABELS, SIZE_ORDER, ATTACK_TYPE_LABELS,
} from '../engine/bestiary.js';
import { pushNPCFromCreature } from '../engine/session-state.js';
import { showToast } from './components.js';

let currentFilters = { category: '', subcategory: '', keyword: '', levelMin: 0, levelMax: 99 };
let currentCreatureId = null;
let currentSort = 'name';
let bestiaryApp = null;
let searchDebounce = null;

export function resetBestiary() {
  currentFilters = { category: '', subcategory: '', keyword: '', levelMin: 0, levelMax: 99 };
  currentCreatureId = null;
  currentSort = 'name';
  bestiaryApp = null;
}

export async function renderBestiary(app) {
  bestiaryApp = app;
  const main = document.getElementById('app-main');
  const lang = app.lang || 'fr';

  main.innerHTML = `<div style="text-align:center;padding:3rem 0">
    <div class="bestiary-loading-sigil"></div>
    <div style="margin-top:1rem;font-size:0.85rem;color:#8b6914">${lang === 'fr' ? 'Chargement du Bestiaire…' : 'Loading Bestiary…'}</div>
  </div>`;

  try {
    await loadBestiaryData();
  } catch (e) {
    main.innerHTML = `<div style="padding:2rem;color:#dc2626">Erreur de chargement : ${e.message}</div>`;
    return;
  }

  _render();
}

function _render() {
  if (currentCreatureId) {
    _renderDetail(currentCreatureId);
  } else {
    _renderBrowser();
  }
}

// ─── Browser ─────────────────────────────────────────────────────────────────

function _renderBrowser() {
  const main = document.getElementById('app-main');
  const lang = bestiaryApp.lang || 'fr';
  const meta = getBestiaryMetadata();
  const allCount = getAllCreatures().length;
  const subcats = getUniqueSubcategories();

  const catCounts = { animals: 0, monsters: 0, races: 0 };
  for (const c of getAllCreatures()) catCounts[c.category] = (catCounts[c.category] || 0) + 1;

  const catChips = ['', 'animals', 'monsters', 'races'].map(cat => {
    const isActive = currentFilters.category === cat;
    const label = cat === ''
      ? (lang === 'fr' ? `Tous (${allCount})` : `All (${allCount})`)
      : `${CATEGORY_LABELS[cat].icon} ${CATEGORY_LABELS[cat][lang]} (${catCounts[cat] || 0})`;
    const colorCls = cat ? `beast-cat-chip-${cat}` : '';
    return `<button class="beast-cat-chip ${colorCls} ${isActive ? 'is-active' : ''}" data-cat="${cat}">${label}</button>`;
  }).join('');

  // Build subcategory label map (EN key → FR label) from creature data
  const subcatFrMap = {};
  for (const c of getAllCreatures()) {
    if (c.subcategory && c.subcategory_fr) subcatFrMap[c.subcategory] = c.subcategory_fr;
  }
  const subcatOptions = subcats.map(s => {
    const label = lang === 'fr' ? (subcatFrMap[s] || s) : s;
    return `<option value="${s}" ${currentFilters.subcategory === s ? 'selected' : ''}>${label}</option>`;
  }).join('');

  const sortBtns = [
    { key: 'name',        label: lang === 'fr' ? 'Nom A-Z' : 'Name A-Z' },
    { key: 'level-asc',   label: lang === 'fr' ? 'Niveau ↑' : 'Level ↑' },
    { key: 'level-desc',  label: lang === 'fr' ? 'Niveau ↓' : 'Level ↓' },
    { key: 'size',        label: lang === 'fr' ? 'Taille' : 'Size' },
  ].map(s => `<button class="beast-sort-btn ${currentSort === s.key ? 'is-active' : ''}" data-sort="${s.key}">${s.label}</button>`).join('');

  main.innerHTML = `<div class="beast-root">
    <div class="beast-header">
      <div class="beast-title-row">
        <span style="font-size:2rem">🐉</span>
        <div>
          <h1 class="beast-title">${lang === 'fr' ? 'Bestiaire' : 'Bestiary'}</h1>
          <div class="beast-subtitle">${allCount} ${lang === 'fr' ? 'cr\u00e9atures' : 'creatures'} \u00b7 ${subcats.length} ${lang === 'fr' ? 'sous-cat\u00e9gories' : 'subcategories'}${meta?.sources ? ' \u00b7 ' + meta.sources.join(', ') : (meta?.source ? ' \u00b7 ' + meta.source : '')}</div>
        </div>
      </div>
      <div class="beast-search-row">
        <input class="beast-search" id="beast-search" type="search"
          placeholder="${lang === 'fr' ? 'Rechercher…' : 'Search…'}"
          value="${currentFilters.keyword}">
        <input class="beast-level-input" id="beast-lvl-min" type="number" min="0" max="66" value="${currentFilters.levelMin}" title="Niveau min">
        <span class="beast-level-sep">–</span>
        <input class="beast-level-input" id="beast-lvl-max" type="number" min="0" max="99" value="${currentFilters.levelMax}" title="Niveau max">
      </div>
      <div class="beast-filter-row">
        ${catChips}
        <select class="beast-subcat-select" id="beast-subcat">
          <option value="">${lang === 'fr' ? 'Toutes sous-catégories' : 'All subcategories'}</option>
          ${subcatOptions}
        </select>
      </div>
      <div class="beast-sort-row">${sortBtns}</div>
    </div>
    <div class="beast-results-count" id="beast-count"></div>
    <div class="beast-card-grid" id="beast-grid"></div>
  </div>`;

  _renderCards();
  _bindBrowserEvents();
}

function _sortedCreatures(creatures, lang) {
  const list = [...creatures];
  if (currentSort === 'name') {
    const nameKey = lang === 'fr' ? 'name_fr' : 'name_en';
    list.sort((a, b) => (a[nameKey] || a.name_en || '').localeCompare(b[nameKey] || b.name_en || '', lang));
  } else if (currentSort === 'level-asc') {
    list.sort((a, b) => a.level - b.level);
  } else if (currentSort === 'level-desc') {
    list.sort((a, b) => b.level - a.level);
  } else if (currentSort === 'size') {
    list.sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
  }
  return list;
}

function _levelClass(level) {
  if (level <= 5) return 'beast-level-safe';
  if (level <= 15) return 'beast-level-danger';
  return 'beast-level-deadly';
}

function _buildCard(c, lang) {
  const col = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.monsters;
  const catIcon = CATEGORY_LABELS[c.category]?.icon || '?';
  const lvlCls = _levelClass(c.level);
  const atkStr = formatAttacks(c, lang);
  const atkShort = atkStr.length > 40 ? atkStr.slice(0, 38) + '…' : atkStr;
  return `<button class="beast-card beast-card-${c.category}" data-id="${c.id}" style="border-left-color:${col.border}">
    <div class="beast-card-top">
      <div class="beast-card-badges">
        <span class="beast-level-badge ${lvlCls}">${c.level}</span>
        <span class="beast-size-badge">${c.size}</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        ${c._lore ? '<span class="beast-card-lore-badge" title="Encyclopédie">📖</span>' : ''}
        <span class="beast-cat-icon">${catIcon}</span>
      </div>
    </div>
    <div class="beast-card-name">${lang === 'fr' ? (c.name_fr || c.name_en) : c.name_en}</div>
    <div class="beast-card-subcat">${(lang === 'fr' ? (c.subcategory_fr || c.subcategory) : c.subcategory) || ''}</div>
    <div class="beast-card-stats">${c.hits_base ?? '?'} PdC · TA ${c.armor_type ?? '?'} (BD ${c.db ?? '?'})</div>
    <div class="beast-card-atk">${atkShort}</div>
  </button>`;
}

function _renderCards() {
  const lang = bestiaryApp.lang || 'fr';
  const grid = document.getElementById('beast-grid');
  const countEl = document.getElementById('beast-count');
  if (!grid) return;

  const filtered = filterCreatures(currentFilters);
  const sorted = _sortedCreatures(filtered, lang);

  countEl.textContent = lang === 'fr'
    ? `${sorted.length} créature${sorted.length !== 1 ? 's' : ''} affichée${sorted.length !== 1 ? 's' : ''}`
    : `${sorted.length} creature${sorted.length !== 1 ? 's' : ''} shown`;

  // Group by subcategory when no keyword search is active and sort is by name
  // (keyword search shows a flat list for speed; sorting disrupts grouping)
  const useGroups = !currentFilters.keyword && currentSort === 'name';

  if (!useGroups) {
    grid.innerHTML = sorted.map(c => _buildCard(c, lang)).join('');
    return;
  }

  // Build ordered subcategory groups
  const groups = [];
  const groupIndex = {};
  for (const c of sorted) {
    const key = c.subcategory || '__none__';
    if (!groupIndex[key]) {
      const label = lang === 'fr' ? (c.subcategory_fr || c.subcategory || '—') : (c.subcategory || '—');
      groupIndex[key] = { key, label, creatures: [] };
      groups.push(groupIndex[key]);
    }
    groupIndex[key].creatures.push(c);
  }

  grid.innerHTML = groups.map(g => {
    const loreDesc = getSectionLore(g.key, lang);
    const descHtml = loreDesc
      ? `<p class="beast-section-desc">${loreDesc}</p>`
      : '';
    const cards = g.creatures.map(c => _buildCard(c, lang)).join('');
    return `<details class="beast-section-lore" open>
      <summary class="beast-section-header">${g.label} <span class="beast-section-count">(${g.creatures.length})</span></summary>
      ${descHtml}
      <div class="beast-section-grid">${cards}</div>
    </details>`;
  }).join('');
}

function _bindBrowserEvents() {
  const main = document.getElementById('app-main');

  main.addEventListener('input', e => {
    if (e.target.id === 'beast-search') {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        currentFilters.keyword = e.target.value;
        _renderCards();
      }, 280);
    } else if (e.target.id === 'beast-lvl-min') {
      currentFilters.levelMin = parseInt(e.target.value) || 0;
      _renderCards();
    } else if (e.target.id === 'beast-lvl-max') {
      currentFilters.levelMax = parseInt(e.target.value) || 99;
      _renderCards();
    }
  });

  main.addEventListener('change', e => {
    if (e.target.id === 'beast-subcat') {
      currentFilters.subcategory = e.target.value;
      _renderCards();
    }
  });

  main.addEventListener('click', e => {
    const catBtn = e.target.closest('[data-cat]');
    if (catBtn) {
      currentFilters.category = catBtn.dataset.cat;
      currentFilters.subcategory = '';
      _renderBrowser();
      return;
    }
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) {
      currentSort = sortBtn.dataset.sort;
      document.querySelectorAll('.beast-sort-btn').forEach(b => b.classList.toggle('is-active', b.dataset.sort === currentSort));
      _renderCards();
      return;
    }
    const card = e.target.closest('[data-id]');
    if (card && card.classList.contains('beast-card')) {
      openCreaturePanel(card.dataset.id, bestiaryApp.lang || 'fr');
    }
  });
}

// ─── Sliding lore panel ───────────────────────────────────────────────────────

function openCreaturePanel(creatureId, lang) {
  const creature = getCreatureById(creatureId);
  if (!creature) return;
  const lore = getCreatureLore(creatureId, lang);

  let panel = document.querySelector('.beast-lore-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'beast-lore-panel';
    document.body.appendChild(panel);
  }
  panel.classList.remove('is-open');

  const name = lang === 'fr' && creature.name_fr ? creature.name_fr : creature.name_en;
  const subcat = lang === 'fr' && creature.subcategory_fr ? creature.subcategory_fr : creature.subcategory;
  const catLabel = CATEGORY_LABELS[creature.category]?.[lang] || creature.category;

  panel.innerHTML = buildPanelHTML(creature, lore, name, subcat, catLabel, lang);
  requestAnimationFrame(() => panel.classList.add('is-open'));

  panel.querySelector('.beast-panel-close')?.addEventListener('click', () => {
    panel.classList.remove('is-open');
    setTimeout(() => panel.remove(), 280);
  });

  panel.querySelector('.beast-add-combat')?.addEventListener('click', () => {
    try {
      pushNPCFromCreature(creature);
      showToast(lang === 'en' ? `${name} added to combat tracker` : `${name} ajouté au Combat Tracker`);
    } catch (e) {
      showToast(lang === 'en' ? 'Error adding to combat' : 'Erreur lors de l\'ajout au combat', true);
    }
  });

  panel.querySelector('.beast-panel-detail-btn')?.addEventListener('click', () => {
    panel.classList.remove('is-open');
    setTimeout(() => panel.remove(), 280);
    currentCreatureId = creatureId;
    _renderDetail(creatureId);
  });
}

function buildPanelHTML(c, lore, name, subcat, catLabel, lang) {
  const lvlCls = _levelClass(c.level);
  const sizeLbl = SIZE_LABELS[c.size]?.[lang] || c.size || '—';
  const mv = c.movement || {};
  const mvStr = [
    mv.base_rate ? `${lang === 'fr' ? 'Mvt' : 'Move'} ${mv.base_rate_raw || mv.base_rate}'` : null,
    mv.max_pace ? `Max ${mv.max_pace}` : null,
    mv.mn_bonus ? `MN +${mv.mn_bonus}` : null,
  ].filter(Boolean).join(' · ');
  const atkStr = formatAttacks(c, lang);
  const source = c.page ? `C&T p.${c.page}` : '';

  return `
    <button class="beast-panel-close" aria-label="Fermer">✕</button>
    <div class="beast-panel-header">
      <h3 class="beast-panel-title">${name}</h3>
      <div class="beast-panel-subtitle">
        <span class="beast-level-badge ${lvlCls}">${c.level}</span>
        ${sizeLbl} · ${catLabel}${subcat ? ` · ${subcat}` : ''}
      </div>
    </div>
    <div class="beast-panel-stats">
      <div><strong>${lang === 'fr' ? 'PdC' : 'HP'}</strong> ${c.hits_base ?? '?'} (${c.constitution_factor ?? '?'})&ensp;<strong>TA</strong> ${c.armor_type ?? '?'}&ensp;<strong>BD</strong> ${c.db ?? '?'}</div>
      ${mvStr ? `<div style="margin-top:3px">${mvStr}</div>` : ''}
      <div style="margin-top:3px"><strong>${lang === 'fr' ? 'Atk' : 'Atk'}</strong> ${atkStr}</div>
    </div>
    ${buildLoreHTML(c, lore, lang)}
    ${source ? `<div class="beast-panel-source">📖 ${source}</div>` : ''}
    <div class="beast-panel-actions">
      <button class="beast-add-combat btn-secondary text-xs">⚔️ ${lang === 'fr' ? 'Ajouter au combat' : 'Add to combat'}</button>
      <button class="beast-panel-detail-btn btn-secondary text-xs">${lang === 'fr' ? 'Fiche complète' : 'Full detail'}</button>
    </div>
  `;
}

function buildLoreHTML(c, lore, lang) {
  const parts = [];

  const desc = lore?.popup || (lang === 'fr' ? (c.description_fr || c.physical || c.description_en) : (c.description_en || c.physical));
  if (desc) {
    parts.push(`<div class="beast-panel-section">
      <div class="beast-panel-section-title">${lang === 'fr' ? 'Description' : 'Description'}</div>
      <p>${desc}</p>
    </div>`);
  }

  if (lore?.ecology) {
    parts.push(`<div class="beast-panel-section">
      <div class="beast-panel-section-title">${lang === 'fr' ? 'Écologie' : 'Ecology'}</div>
      <p>${lore.ecology}</p>
    </div>`);
  }

  if (lore?.behavior) {
    parts.push(`<div class="beast-panel-section">
      <div class="beast-panel-section-title">${lang === 'fr' ? 'Comportement' : 'Behavior'}</div>
      <p>${lore.behavior}</p>
    </div>`);
  }

  if (lore?.gmNotes) {
    parts.push(`<div class="beast-panel-section">
      <div class="beast-panel-section-title">${lang === 'fr' ? 'Notes MJ' : 'GM Notes'}</div>
      <p>${lore.gmNotes}</p>
    </div>`);
  }

  return parts.join('');
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function _renderDetail(id) {
  const main = document.getElementById('app-main');
  const lang = bestiaryApp.lang || 'fr';
  const c = getCreatureById(id);
  if (!c) { currentCreatureId = null; _renderBrowser(); return; }

  const col = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.monsters;
  const catIcon = CATEGORY_LABELS[c.category]?.icon || '?';
  const catLbl = CATEGORY_LABELS[c.category]?.[lang] || c.category;
  const sizeLbl = SIZE_LABELS[c.size]?.[lang] || c.size || '—';
  const lvlCls = _levelClass(c.level);

  // Attacks
  let atkHtml;
  if (c.attacks && c.attacks.length > 0) {
    atkHtml = `<div class="beast-atk-list">` + c.attacks.map(atk => {
      const typeName = ATTACK_TYPE_LABELS[atk.type]?.[lang] || atk.type_en || atk.type;
      return `<div class="beast-atk-line">
        <span class="beast-atk-ob">${atk.ob}</span>
        <span class="beast-atk-type">${typeName} (${atk.size})</span>
        <span class="beast-atk-pct">${atk.percent}%</span>
        ${atk.special ? `<span style="font-size:0.68rem;color:#8b6914">[${atk.special}]</span>` : ''}
      </div>`;
    }).join('') + `</div>`;
  } else {
    atkHtml = `<div class="beast-atk-raw">${c.attacks_raw || '—'}</div>`;
  }

  // Movement
  const mv = c.movement || {};
  const mvStr = [
    mv.base_rate ? `Base ${mv.base_rate_raw || mv.base_rate}'` : null,
    mv.max_pace ? `Max ${mv.max_pace}` : null,
    mv.mn_bonus ? `MN +${mv.mn_bonus}` : null,
    mv.speed_ms ? `VF ${mv.speed_ms}` : null,
  ].filter(Boolean).join(' · ');

  // Encounter
  const enc = c.encounter || {};
  const encStr = [
    enc.number ? `Nb ${enc.number}` : null,
    enc.treasure ? `Trésor ${enc.treasure}` : null,
    enc.outlook ? (lang === 'fr' ? `Comportement ${enc.outlook}` : `Outlook ${enc.outlook}`) : null,
    enc.ep_code ? `EP ${enc.ep_code}` : null,
  ].filter(Boolean).join(' · ');

  // Raw data toggle
  const rawLines = [
    c.attacks_raw ? `<div class="beast-raw-line"><span class="beast-raw-key">attacks_raw:</span> ${c.attacks_raw}</div>` : '',
    c.hits_raw    ? `<div class="beast-raw-line"><span class="beast-raw-key">hits_raw:</span> ${c.hits_raw}</div>` : '',
    c.armor_raw   ? `<div class="beast-raw-line"><span class="beast-raw-key">armor_raw:</span> ${c.armor_raw}</div>` : '',
    c.description_codes ? `<div class="beast-raw-line"><span class="beast-raw-key">codes:</span> ${c.description_codes}</div>` : '',
  ].filter(Boolean).join('');

  main.innerHTML = `<div class="beast-root">
    <div class="beast-detail-nav">
      <button class="beast-back-btn" id="beast-back">← ${lang === 'fr' ? 'Retour' : 'Back'}</button>
      <button class="beast-print-btn" id="beast-print">${lang === 'fr' ? 'Imprimer' : 'Print'}</button>
    </div>

    <div class="beast-detail-header beast-detail-header-${c.category}">
      <h2 class="beast-detail-title">${catIcon} ${lang === 'fr' ? (c.name_fr || c.name_en) : c.name_en}</h2>
      <div class="beast-detail-badges">
        <span class="beast-level-badge ${lvlCls}">${c.level}</span>
        <span class="beast-size-badge">${c.size} — ${sizeLbl}</span>
        <span class="beast-detail-subcat">${catLbl}</span>
        ${c.subcategory ? `<span class="beast-detail-subcat">· ${lang === 'fr' ? (c.subcategory_fr || c.subcategory) : c.subcategory}</span>` : ''}
      </div>
    </div>

    <div class="beast-statblock">
      ${mvStr ? `<div class="beast-sb-section">
        <div class="beast-sb-title">${lang === 'fr' ? 'Mouvement' : 'Movement'}</div>
        <div class="beast-sb-row">${mvStr}</div>
      </div>` : ''}

      <div class="beast-sb-section">
        <div class="beast-sb-title">${lang === 'fr' ? 'Combat' : 'Combat'}</div>
        <div class="beast-sb-row" style="margin-bottom:6px">
          <div class="beast-sb-kv"><span class="beast-sb-key">PdC</span><span class="beast-sb-val">${c.hits_base ?? '?'} (${c.constitution_factor ?? '?'})</span></div>
          <div class="beast-sb-kv"><span class="beast-sb-key">TA</span><span class="beast-sb-val">${c.armor_type ?? '?'}</span></div>
          <div class="beast-sb-kv"><span class="beast-sb-key">BD</span><span class="beast-sb-val">${c.db ?? '?'}</span></div>
          ${c.critical_size ? `<div class="beast-sb-kv"><span class="beast-sb-key">Crit</span><span class="beast-sb-val">${c.critical_size}</span></div>` : ''}
        </div>
        <div class="beast-sb-key" style="margin-bottom:3px">${lang === 'fr' ? 'Attaques' : 'Attacks'}</div>
        ${atkHtml}
      </div>

      ${encStr ? `<div class="beast-sb-section">
        <div class="beast-sb-title">${lang === 'fr' ? 'Rencontre' : 'Encounter'}</div>
        <div class="beast-sb-row">${encStr}</div>
      </div>` : ''}

      ${c.physical || c.description_en ? `<div class="beast-sb-section">
        <div class="beast-sb-title">${lang === 'fr' ? 'Description' : 'Description'}</div>
        <div style="font-size:0.78rem;color:#4a3520">${lang === 'fr' ? (c.description_fr || c.physical || c.description_en || '') : (c.description_en || c.physical || '')}</div>
      </div>` : ''}
    </div>

    ${rawLines ? `<details class="beast-raw-details">
      <summary>${lang === 'fr' ? 'Données brutes' : 'Raw data'}</summary>
      <div class="beast-raw-body">${rawLines}</div>
    </details>` : ''}

    ${c.page ? `<div class="beast-source">C&T p.${c.page}</div>` : ''}
  </div>`;

  document.getElementById('beast-back').addEventListener('click', () => {
    currentCreatureId = null;
    _renderBrowser();
  });

  document.getElementById('beast-print').addEventListener('click', () => _printCreature(c, lang));
}

// ─── Print ────────────────────────────────────────────────────────────────────

function _printCreature(c, lang) {
  const catIcon = CATEGORY_LABELS[c.category]?.icon || '';
  const atksText = formatAttacks(c, lang);
  const mv = c.movement || {};
  const win = window.open('', '_blank', 'width=750,height=900');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${lang === 'fr' ? (c.name_fr || c.name_en) : c.name_en}</title>
  <style>
    body { font-family: 'Palatino Linotype', Palatino, serif; margin: 20mm; font-size: 10pt; color: #2a1a04; }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .meta { font-size: 8pt; color: #6b5030; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td { padding: 3px 6px; border: 0.5px solid #c49a20; font-size: 9pt; }
    th { background: #f5e8c0; font-size: 8pt; text-align: left; padding: 3px 6px; border: 0.5px solid #c49a20; }
    .section-title { font-variant: small-caps; font-weight: bold; color: #6b5030; margin: 8px 0 3px; font-size: 9pt; }
    @media print { body { margin: 10mm 15mm; } }
  </style></head><body>
  <h1>${catIcon} ${lang === 'fr' ? (c.name_fr || c.name_en) : c.name_en}</h1>
  <div class="meta">Niveau ${c.level} · Taille ${c.size} · ${(lang === 'fr' ? (c.subcategory_fr || c.subcategory) : c.subcategory) || c.category}${c.page ? ' · C&T p.' + c.page : ''}</div>
  <div class="section-title">Combat</div>
  <table><tr>
    <th>PdC</th><th>TA</th><th>BD</th><th>Attaques</th>
  </tr><tr>
    <td>${c.hits_base ?? '?'} (${c.constitution_factor ?? '?'})</td>
    <td>${c.armor_type ?? '?'}</td>
    <td>${c.db ?? '?'}</td>
    <td>${atksText}</td>
  </tr></table>
  ${mv.base_rate ? `<div class="section-title">Mouvement</div>
  <div style="font-size:9pt">Base ${mv.base_rate_raw || mv.base_rate}' · Max ${mv.max_pace || '—'} · MN +${mv.mn_bonus || 0}</div>` : ''}
  ${(c.description_fr || c.physical || c.description_en) ? `<div class="section-title">${lang === 'fr' ? 'Description' : 'Description'}</div><div style="font-size:9pt">${lang === 'fr' ? (c.description_fr || c.physical || c.description_en || '') : (c.description_en || c.physical || '')}</div>` : ''}
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

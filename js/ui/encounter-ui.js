// encounter-ui.js — Encounter Generator view (route: encounters)

import {
  ensureBestiaryLoaded,
  generateEncounter,
  TERRAIN_DEFINITIONS,
  getOutlookLabel,
  hasExternalTable,
} from '../engine/encounter-generator.js';
import {
  formatAttacks, CATEGORY_COLORS,
} from '../engine/bestiary.js';
import { pushNPCFromCreature, logEncounter } from '../engine/session-state.js';
import { showToast } from './components.js';

let _app = null;
let _lastResult = null;
let _history = [];   // max 20 entries

const HISTORY_MAX = 20;

// ── State ───────────────────────────────────────────────────────────────────

let _state = {
  terrain: 'forest',
  levelMin: 1,
  levelMax: 10,
  category: '',
  groupSize: 1,
  useExternal: false,
};

export function resetEncounters() {
  // Ne pas réinitialiser _lastResult ni _history — préservés entre navigations
  // L'historique des rencontres est dans session-state.encounterLog
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function renderEncounters(app) {
  _app = app;
  const main = document.getElementById('app-main');
  const lang = app.lang || 'fr';
  const t = (fr, en) => lang === 'en' ? en : fr;

  _injectStyles();

  main.innerHTML = `<div style="text-align:center;padding:3rem 0;color:#6b5030">${t('Chargement du bestiaire…', 'Loading bestiary…')}</div>`;

  try {
    await ensureBestiaryLoaded();
  } catch (e) {
    main.innerHTML = `<p style="color:#a32d2d;padding:1rem">${t('Erreur chargement bestiaire', 'Bestiary load error')}: ${e.message}</p>`;
    return;
  }

  _renderLayout(main, lang, t);
}

// ── Layout ──────────────────────────────────────────────────────────────────

function _renderLayout(main, lang, t) {
  main.innerHTML = `
<div class="enc-root">
  <div class="enc-header">
    <h2 class="enc-title">⚔ ${t('Générateur de Rencontres', 'Encounter Generator')}</h2>
    <p class="enc-subtitle">${t('449 créatures — Bestiaire C&T', '449 creatures — C&T Bestiary')}</p>
  </div>
  <div class="enc-layout">
    <aside class="enc-filters" id="enc-filters-panel">
      ${_buildFiltersHTML(lang, t)}
    </aside>
    <div class="enc-result-panel" id="enc-result-panel">
      ${_buildResultHTML(lang, t)}
    </div>
  </div>
</div>`;

  _bindFilterEvents(lang, t);
}

function _buildFiltersHTML(lang, t) {
  const terrains = Object.entries(TERRAIN_DEFINITIONS);

  const terrainBtns = terrains.map(([key, def]) => {
    const active = key === _state.terrain ? ' is-active' : '';
    const name = lang === 'en' ? def.name_en : def.name_fr;
    return `<button class="enc-terrain-btn${active}" data-terrain="${key}" title="${name}">${def.icon}<br><span style="font-size:0.65rem">${name}</span></button>`;
  }).join('');

  const categories = [
    { key: '', fr: 'Tous', en: 'All' },
    { key: 'animals',  fr: '🐾 Animaux',  en: '🐾 Animals'  },
    { key: 'monsters', fr: '🐉 Monstres', en: '🐉 Monsters' },
    { key: 'races',    fr: '👤 Races',    en: '👤 Races'    },
  ];

  const catChips = categories.map(c => {
    const active = c.key === _state.category ? ' is-active' : '';
    return `<button class="enc-terrain-btn${active}" data-cat="${c.key}" style="font-size:0.7rem;padding:5px 4px">${lang === 'en' ? c.en : c.fr}</button>`;
  }).join('');

  const externalBanner = hasExternalTable(_state.terrain)
    ? `<div class="enc-external-banner">📜 ${t('Table officielle disponible', 'Official table available')} — <label><input type="checkbox" id="enc-use-external"${_state.useExternal ? ' checked' : ''}> ${t('Utiliser tables PDF', 'Use PDF tables')}</label></div>`
    : '';

  return `
    <div style="font-size:0.8rem;font-weight:bold;color:#4a3520;margin-bottom:0.4rem">${t('Terrain', 'Terrain')}</div>
    <div class="enc-terrain-grid">${terrainBtns}</div>

    <div style="font-size:0.8rem;font-weight:bold;color:#4a3520;margin-bottom:0.4rem">${t('Niveau des créatures', 'Creature level')}</div>
    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem">
      <label style="font-size:0.75rem;color:#6b5030">${t('Min', 'Min')}
        <input type="number" id="enc-lvl-min" min="0" max="99" value="${_state.levelMin}" style="width:48px;margin-left:4px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;padding:2px 4px;background:rgba(255,250,240,0.7);color:#3a1a08">
      </label>
      <label style="font-size:0.75rem;color:#6b5030">${t('Max', 'Max')}
        <input type="number" id="enc-lvl-max" min="0" max="99" value="${_state.levelMax}" style="width:48px;margin-left:4px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;padding:2px 4px;background:rgba(255,250,240,0.7);color:#3a1a08">
      </label>
    </div>

    <div style="font-size:0.8rem;font-weight:bold;color:#4a3520;margin-bottom:0.4rem">${t('Catégorie', 'Category')}</div>
    <div class="enc-terrain-grid" id="enc-cat-grid" style="grid-template-columns:repeat(2,1fr)">${catChips}</div>

    <div style="font-size:0.8rem;font-weight:bold;color:#4a3520;margin:0.75rem 0 0.4rem">${t('Créatures distinctes', 'Distinct creatures')}</div>
    <div style="display:flex;gap:4px;margin-bottom:0.75rem" id="enc-group-btns">
      ${[1,2,3,4,5].map(n => `<button class="enc-terrain-btn${n === _state.groupSize ? ' is-active' : ''}" data-group="${n}" style="flex:1">${n}</button>`).join('')}
    </div>

    ${externalBanner}

    <button class="rm-action-btn" id="enc-generate-btn" style="width:100%;margin-top:0.75rem;font-size:1rem">
      🎲 ${t('Générer', 'Generate')}
    </button>`;
}

function _buildResultHTML(lang, t) {
  if (!_lastResult || !_lastResult.encounters.length) {
    const empty = `<div style="text-align:center;padding:1.5rem 1rem;color:#8b6914;">
      <div class="rm-crystal-ball">
        <div class="rm-crystal-ball-container">
          <video muted loop playsinline autoplay
            src="assets/IntroSmall.mp4"
            onerror="this.style.display='none'"></video>
          <div class="rm-crystal-overlay"></div>
        </div>
      </div>
      <div style="font-size:0.9rem;margin-top:0.5rem;opacity:0.8">
        ${lang === 'en' ? 'Choose a terrain and click Generate' : 'Choisissez un terrain et cliquez sur Générer'}
      </div>
    </div>`;
    return empty + _buildHistoryHTML(lang, t);
  }

  const cards = _lastResult.encounters.map(e => _buildCreatureCard(e, lang, t)).join('');
  const srcLabel = _lastResult.source === 'external'
    ? `<div style="font-size:0.7rem;color:#6b5030;margin-bottom:0.5rem">📜 ${t('Table officielle', 'Official table')} (d100: ${_lastResult.tableRoll})</div>`
    : '';

  return `<div id="enc-cards-area">${srcLabel}${cards}</div>` + _buildHistoryHTML(lang, t);
}

function _buildCreatureCard(enc, lang, t) {
  const c = enc.creature;
  const name = (lang === 'fr' && c.name_fr) ? c.name_fr : c.name_en;
  const subcat = (lang === 'fr' && c.subcategory_fr) ? c.subcategory_fr : c.subcategory;
  const colors = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.monsters;
  const outlook = getOutlookLabel(c.encounter?.outlook, lang);
  const treasure = c.encounter?.treasure || '—';
  const attacks = formatAttacks ? formatAttacks(c, lang) : (c.attacks_raw || '—');
  const hitsLabel = c.hits_base ? `${c.hits_base} (${c.hits_type || 'E'})` : '—';
  const atLabel = c.armor_type ? `${t('TA', 'AT')} ${c.armor_type}` : '—';
  const bd = c.bd ?? '—';

  return `
<div class="enc-creature-card" style="border-left-color:${colors.border}" data-creature-id="${c.id}">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div class="enc-creature-name">${name}</div>
    <div style="font-size:0.75rem;color:#6b5030">${t('Niv.', 'Lv.')} ${c.level} · ${c.size || 'M'}</div>
  </div>
  <div style="font-size:0.75rem;color:#8b6914;margin-bottom:4px">${subcat || '—'}</div>
  <div class="enc-count-badge">× ${enc.count} ${enc.count > 1 ? t('spécimens', 'specimens') : t('spécimen', 'specimen')}</div>
  <div class="enc-creature-meta">
    ${t('PdC', 'Hits')}: ${hitsLabel} · ${atLabel} (${t('BD', 'DB')} ${bd}) · ${t('Outlook', 'Outlook')}: ${outlook}
  </div>
  ${attacks ? `<div class="enc-creature-meta">${t('Attaques', 'Attacks')}: ${attacks}</div>` : ''}
  <div class="enc-creature-meta">${t('Trésor', 'Treasure')}: ${treasure}</div>
  <button class="enc-add-combat-btn rm-action-btn" data-creature-id="${c.id}" data-count="${enc.count}" data-name="${name.replace(/"/g, '&quot;')}"
    style="font-size:0.75rem;padding:4px 10px;margin-top:6px">
    ⚔ ${t('Ajouter au Combat Tracker', 'Add to Combat Tracker')}
  </button>
</div>`;
}

function _buildHistoryHTML(lang, t) {
  if (!_history.length) return '';
  const items = _history.slice().reverse().map((h, i) => {
    const tDef = TERRAIN_DEFINITIONS[h.terrain];
    const icon = tDef?.icon || '?';
    const summary = h.encounters.map(e => {
      const name = (lang === 'fr' && e.creature.name_fr) ? e.creature.name_fr : e.creature.name_en;
      return `${name} ×${e.count}`;
    }).join(', ');
    const level = h.encounters[0]?.creature.level ?? '?';
    return `<div class="enc-history-item" data-history-idx="${_history.length - 1 - i}">${icon} ${summary} · ${t('Niv.', 'Lv.')} ${level}</div>`;
  }).join('');

  return `<div class="enc-history">
    <div style="font-size:0.75rem;font-weight:bold;color:#4a3520;margin-bottom:4px">${t('Historique', 'History')}</div>
    <div style="max-height:160px;overflow-y:auto">${items}</div>
  </div>`;
}

// ── Events ──────────────────────────────────────────────────────────────────

function _bindFilterEvents(lang, t) {
  const root = document.querySelector('.enc-root');
  if (!root) return;

  // Terrain buttons
  root.querySelectorAll('[data-terrain]').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.terrain = btn.dataset.terrain;
      _refreshFilters(lang, t);
    });
  });

  // Category chips
  root.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.category = btn.dataset.cat;
      _refreshFilters(lang, t);
    });
  });

  // Group size buttons
  root.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.groupSize = parseInt(btn.dataset.group);
      _refreshFilters(lang, t);
    });
  });

  // Level inputs — live update state
  root.querySelector('#enc-lvl-min')?.addEventListener('change', e => {
    _state.levelMin = Math.max(0, parseInt(e.target.value) || 0);
  });
  root.querySelector('#enc-lvl-max')?.addEventListener('change', e => {
    _state.levelMax = Math.min(99, parseInt(e.target.value) || 99);
  });

  // External toggle
  root.querySelector('#enc-use-external')?.addEventListener('change', e => {
    _state.useExternal = e.target.checked;
  });

  // Generate button
  root.querySelector('#enc-generate-btn')?.addEventListener('click', () => {
    _generate(lang, t);
  });

  // Combat tracker buttons (delegated)
  const resultPanel = document.getElementById('enc-result-panel');
  if (resultPanel) {
    resultPanel.addEventListener('click', e => {
      const addBtn = e.target.closest('.enc-add-combat-btn');
      if (addBtn) {
        _addToCombat(addBtn, lang, t);
        return;
      }
      const histItem = e.target.closest('.enc-history-item');
      if (histItem) {
        const idx = parseInt(histItem.dataset.historyIdx);
        _restoreHistory(idx, lang, t);
      }
    });
  }
}

function _refreshFilters(lang, t) {
  const panel = document.getElementById('enc-filters-panel');
  if (panel) panel.innerHTML = _buildFiltersHTML(lang, t);
  // Re-bind filter events — scoped to enc-filters-panel to avoid conflict with bestiary [data-cat]
  const root = document.getElementById('enc-filters-panel') || document;
  root.querySelectorAll('[data-terrain]').forEach(btn => {
    btn.addEventListener('click', () => { _state.terrain = btn.dataset.terrain; _refreshFilters(lang, t); });
  });
  root.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => { _state.category = btn.dataset.cat; _refreshFilters(lang, t); });
  });
  root.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => { _state.groupSize = parseInt(btn.dataset.group); _refreshFilters(lang, t); });
  });
  root.querySelector('#enc-lvl-min')?.addEventListener('change', e => {
    _state.levelMin = Math.max(0, parseInt(e.target.value) || 0);
  });
  root.querySelector('#enc-lvl-max')?.addEventListener('change', e => {
    _state.levelMax = Math.min(99, parseInt(e.target.value) || 99);
  });
  root.querySelector('#enc-use-external')?.addEventListener('change', e => {
    _state.useExternal = e.target.checked;
  });
  root.querySelector('#enc-generate-btn')?.addEventListener('click', () => _generate(lang, t));
}

function _generate(lang, t) {
  try {
    const result = generateEncounter({
      terrain: _state.terrain,
      levelMin: _state.levelMin,
      levelMax: _state.levelMax,
      category: _state.category,
      groupSize: _state.groupSize,
      useExternal: _state.useExternal,
    });
    _lastResult = result;
    if (result.encounters.length) {
      _history.push(result);
      if (_history.length > HISTORY_MAX) _history.shift();
      logEncounter(_state.terrain, result.encounters);
    }
  } catch (e) {
    showToast((lang === 'en' ? 'Error: ' : 'Erreur : ') + e.message, true);
    return;
  }
  const panel = document.getElementById('enc-result-panel');
  if (panel) panel.innerHTML = _buildResultHTML(lang, t);
}

function _addToCombat(btn, lang, t) {
  const cid   = btn.dataset.creatureId;
  const count = parseInt(btn.dataset.count) || 1;
  const name  = btn.dataset.name;
  const enc   = _lastResult?.encounters.find(e => e.creature.id === cid);
  if (!enc) return;
  for (let i = 0; i < count; i++) {
    pushNPCFromCreature(enc.creature);
  }
  showToast(lang === 'en'
    ? `${name} ×${count} added to combat tracker`
    : `${name} ×${count} ajouté${count > 1 ? 's' : ''} au Combat Tracker`);
  // Note : Party Manager se met à jour via subscribeSession('npc:added')
}

function _restoreHistory(idx, lang, t) {
  _lastResult = _history[idx] || null;
  const panel = document.getElementById('enc-result-panel');
  if (panel) panel.innerHTML = _buildResultHTML(lang, t);
}

// ── Styles ──────────────────────────────────────────────────────────────────

function _injectStyles() {
  if (document.getElementById('encounter-styles')) return;
  const style = document.createElement('style');
  style.id = 'encounter-styles';
  style.textContent = `
.enc-root { max-width: 960px; margin: 0 auto; padding: 1rem; }
.enc-header { margin-bottom: 1rem; }
.enc-title { font-family: var(--font-title, serif); font-size: 1.4rem; color: #c49a20; margin: 0 0 0.2rem; }
.enc-subtitle { font-size: 0.8rem; color: #6b5030; margin: 0; }
.enc-layout { display: grid; grid-template-columns: 280px 1fr; gap: 1rem; align-items: start; }
@media (max-width: 620px) { .enc-layout { grid-template-columns: 1fr; } }
.enc-filters { background: rgba(255,250,240,0.4); border: 1px solid rgba(139,92,20,0.2); border-radius: 8px; padding: 1rem; }
.enc-terrain-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 4px; margin-bottom: 0.75rem; }
.enc-terrain-btn { padding: 6px 4px; border-radius: 6px; border: 1px solid rgba(139,92,20,0.3);
  background: rgba(255,250,240,0.5); cursor: pointer; font-size: 0.72rem; color: #4a3520;
  text-align: center; transition: background 0.15s; line-height: 1.3; }
.enc-terrain-btn:hover { background: rgba(196,154,32,0.15); }
.enc-terrain-btn.is-active { background: rgba(196,154,32,0.25); border-color: #c49a20; font-weight: bold; }
.enc-result-panel { min-height: 200px; }
.enc-creature-card { border-left: 4px solid #8b6914; border-radius: 6px;
  background: rgba(255,250,240,0.4); padding: 0.75rem; margin-bottom: 0.75rem; }
.enc-creature-name { font-size: 1rem; font-weight: bold; color: #3a1a08; margin-bottom: 4px; }
.enc-creature-meta { font-size: 0.78rem; color: #6b5030; margin-bottom: 4px; }
.enc-count-badge { display: inline-block; background: rgba(196,154,32,0.2);
  border: 1px solid #c49a20; border-radius: 4px; padding: 2px 8px;
  font-weight: bold; color: #3a1a08; margin-bottom: 6px; }
.enc-history { margin-top: 1rem; border-top: 1px solid rgba(139,92,20,0.2); padding-top: 0.5rem; }
.enc-history-item { font-size: 0.75rem; color: #6b5030; padding: 4px 6px; cursor: pointer; border-radius: 4px; }
.enc-history-item:hover { background: rgba(196,154,32,0.1); }
.enc-external-banner { font-size: 0.75rem; background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.3); border-radius: 4px;
  padding: 4px 8px; margin-top: 0.5rem; color: #2563eb; }
`;
  document.head.appendChild(style);
}

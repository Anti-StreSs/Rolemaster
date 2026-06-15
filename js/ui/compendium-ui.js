// compendium-ui.js — Grimoire UI v2: Library view + router
// Shell renders once; only #grim-cards re-renders on filter changes.
// Book/Spell views delegate to compendium-book.js.

import { loadListsIndex, ensureParams, isIndexLoaded,
  filterLists, searchSpells, groupListsByRealm, getListById, getSpellById,
  getCharacterSpellbook, getProfessions, resolveRealm, getListTypeLabel,
  getRealmColor, spellHasDescription, REALM_COLORS } from '../engine/spell-compendium.js';
import { openBook, renderSpellFocus } from './compendium-book.js';
import { getCharacter } from './wizard.js';
import { showToast } from './components.js';
import { getAllClasses, getClassName } from '../engine/classes.js';

const REALM_ORDER = ['Essence', 'Channeling', 'Mentalism', 'Arcane', 'Alchemy'];

const DEFAULT_FILTERS = { realm: '', type: 'all', prof: '', charOnly: false, q: '' };
let state = { lang: 'fr', view: 'library', ...structuredClone(DEFAULT_FILTERS), listId: null, spread: 0, spellId: null };
let compendiumApp = null;
let shellBuilt = false;
let cardObserver = null;

// ── Entry point ─────────────────────────────────────────────────────────────

export async function renderCompendium(app) {
  compendiumApp = app;
  state.lang = app.lang || 'fr';
  const main = document.getElementById('app-main');
  if (!main) return;

  if (!isIndexLoaded()) {
    main.innerHTML = `<div style="text-align:center;padding:3rem">
      <div class="compendium-loading-sigil"></div>
      <p style="color:#b29a73;margin-top:1rem;font-family:var(--font-title)">${state.lang === 'en' ? 'Loading Grimoire…' : 'Chargement du Grimoire…'}</p>
    </div>`;
    try { await loadListsIndex(); } catch (e) {
      main.innerHTML = `<div style="text-align:center;padding:3rem;color:#993c1d">
        <p>${state.lang === 'en' ? 'Failed to load spell data.' : 'Erreur de chargement.'}</p></div>`;
      return;
    }
  }

  readHash();
  go(main);
}

export function resetCompendium() {
  state = { ...state, view: 'library', ...structuredClone(DEFAULT_FILTERS), listId: null, spread: 0, spellId: null };
  shellBuilt = false;
}

// ── Router ───────────────────────────────────────────────────────────────────

function go(main) {
  if (!main) main = document.getElementById('app-main');
  if (!main) return;
  writeHash();
  if (state.view === 'list') {
    shellBuilt = false; // book takes full main
    openBook(state.listId, compendiumApp, main, onBackToLibrary);
  } else if (state.view === 'spell') {
    shellBuilt = false;
    renderSpellFocus(state.spellId, compendiumApp, main, onBackFromSpell);
  } else {
    renderLibrary(main);
  }
}

function onBackToLibrary() {
  state.view = 'library'; state.listId = null; state.spread = 0;
  shellBuilt = false;
  go();
}

function onBackFromSpell(listId) {
  if (listId) { state.view = 'list'; state.listId = listId; state.spread = 0; }
  else { state.view = 'library'; }
  shellBuilt = false;
  go();
}

function openList(id) {
  state.view = 'list'; state.listId = id; state.spread = 0; state.spellId = null;
  go(); window.scrollTo(0, 0);
}

function openSpell(id) {
  state.view = 'spell'; state.spellId = id;
  go(); window.scrollTo(0, 0);
}

// ── Hash + localStorage ──────────────────────────────────────────────────────

function writeHash() {
  let h = '#/' + state.view;
  if (state.view === 'library') {
    const p = new URLSearchParams();
    if (state.realm) p.set('realm', state.realm);
    if (state.type !== 'all') p.set('type', state.type);
    if (state.prof) p.set('prof', state.prof);
    if (state.charOnly) p.set('char', '1');
    if (state.q) p.set('q', state.q);
    const s = p.toString(); if (s) h += '?' + s;
  } else if (state.view === 'list') {
    h += '/' + state.listId + (state.spread ? ('?p=' + state.spread) : '');
  } else if (state.view === 'spell') {
    h += '/' + state.spellId;
  }
  history.replaceState(null, '', h);
  try {
    localStorage.setItem('grimoire.filters', JSON.stringify(
      { realm: state.realm, type: state.type, prof: state.prof, charOnly: state.charOnly, lang: state.lang }));
  } catch (e) { /* storage optional */ }
}

function readHash() {
  const h = location.hash.replace(/^#\//, '');
  if (!h) { restoreFilters(); return; }
  const [path, query] = h.split('?');
  const parts = path.split('/');
  const p = new URLSearchParams(query || '');
  if (parts[0] === 'list' && parts[1]) {
    state.view = 'list'; state.listId = parts[1]; state.spread = +(p.get('p') || 0);
  } else if (parts[0] === 'spell' && parts[1]) {
    state.view = 'spell'; state.spellId = parts[1];
  } else {
    state.view = 'library';
    state.realm = p.get('realm') || ''; state.type = p.get('type') || 'all';
    state.prof = p.get('prof') || ''; state.charOnly = p.get('char') === '1';
    state.q = p.get('q') || '';
  }
}

function restoreFilters() {
  try {
    const f = JSON.parse(localStorage.getItem('grimoire.filters') || '{}');
    if (f.realm) state.realm = f.realm; if (f.type) state.type = f.type;
    if (f.prof) state.prof = f.prof; if (f.charOnly) state.charOnly = f.charOnly;
    if (f.lang) state.lang = f.lang;
  } catch (e) { /* storage optional */ }
}

// ── Library — shell (rendered once per library session) ─────────────────────

function renderLibrary(main) {
  const L = i18n();
  if (!shellBuilt) {
    buildShell(main, L);
    shellBuilt = true;
  }
  // Sync lang toggle buttons
  main.querySelector('#gl-fr')?.classList.toggle('on', state.lang === 'fr');
  main.querySelector('#gl-en')?.classList.toggle('on', state.lang === 'en');
  // Sync search field
  const qi = main.querySelector('#gl-q');
  if (qi && document.activeElement !== qi) qi.value = state.q || '';
  renderCards(main, L);
}

function buildShell(main, L) {
  if (cardObserver) { cardObserver.disconnect(); cardObserver = null; }
  const char = getCharacter();
  const profOpts = [`<option value="">${esc(L.allProf)}</option>`].concat(
    getProfessions(state.lang).map(p =>
      `<option value="${esc(p.value)}" ${state.prof === p.value ? 'selected' : ''}>${esc(p.label.replace(/ Base$/, ''))}</option>`
    )).join('');
  const charToggle = char
    ? `<label class="char-toggle"><input type="checkbox" id="gl-char" ${state.charOnly ? 'checked' : ''}>
        <span>${esc(L.mySpells)} (${esc(char.name)})</span></label>` : '';

  main.innerHTML = `
  <div class="grim-shell">
    <div class="grim-topbar">
      <div class="brand"><span class="sigil">✶</span>
        <div><h1>${esc(L.title)}</h1><p class="brand-sub" id="gl-sub"></p></div>
      </div>
      <div class="grim-search"><span class="ic">⚲</span>
        <input type="search" id="gl-q" placeholder="${esc(L.searchPH)}" value="${esc(state.q || '')}">
      </div>
      <div class="langtoggle">
        <button id="gl-fr" class="${state.lang === 'fr' ? 'on' : ''}">FR</button>
        <button id="gl-en" class="${state.lang === 'en' ? 'on' : ''}">EN</button>
      </div>
    </div>
    <div class="grim-filters">
      <div class="filt-row"><span class="filt-label">${esc(L.realm)}</span><span id="gl-realm-chips"></span></div>
      <div class="filt-row"><span class="filt-label">${esc(L.type)}</span><span id="gl-type-chips"></span></div>
      <div class="filt-row"><span class="filt-label">${esc(L.prof)}</span>
        <select class="prof-select" id="gl-prof">${profOpts}</select>
        ${charToggle}
        <button class="btn-reset" id="gl-reset">${esc(L.reset)}</button>
      </div>
    </div>
    <div id="grim-cards"></div>
    <div id="gl-measure" class="measure" aria-hidden="true"></div>
  </div>`;
  bindShellEvents(main, L);
}

function bindShellEvents(main, L) {
  // Lang toggle
  main.querySelector('#gl-fr').onclick = () => { state.lang = 'fr'; compendiumApp && (compendiumApp.lang = 'fr'); shellBuilt = false; go(main); };
  main.querySelector('#gl-en').onclick = () => { state.lang = 'en'; compendiumApp && (compendiumApp.lang = 'en'); shellBuilt = false; go(main); };
  // Search
  let deb;
  main.querySelector('#gl-q').addEventListener('input', e => {
    clearTimeout(deb);
    deb = setTimeout(() => { state.q = e.target.value.trim(); if (state.view !== 'library') state.view = 'library'; renderCards(main, i18n()); writeHash(); }, 220);
  });
  // Realm chips (re-rendered inside renderCards, delegated via main)
  main.addEventListener('click', e => {
    const chip = e.target.closest('[data-realm]');
    if (chip) { const v = chip.dataset.realm; state.realm = v === state.realm ? '' : v; renderCards(main, i18n()); writeHash(); return; }
    const typechip = e.target.closest('[data-type]');
    if (typechip) { state.type = typechip.dataset.type; renderCards(main, i18n()); writeHash(); return; }
    const listcard = e.target.closest('[data-list]');
    if (listcard) { openList(listcard.dataset.list); return; }
    const spellhit = e.target.closest('[data-spell]');
    if (spellhit) { openSpell(spellhit.dataset.spell); return; }
    const ribbon = e.target.closest('[data-jump]');
    if (ribbon) {
      const el = document.getElementById('realm-' + ribbon.dataset.jump.replace(/\W/g, '_'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    const printbooklet = e.target.closest('#gl-printbooklet');
    if (printbooklet) { doPrintCharacterSpellbook(); return; }
  });
  // Prof select
  main.querySelector('#gl-prof').addEventListener('change', e => { state.prof = e.target.value; renderCards(main, i18n()); writeHash(); });
  // Char toggle
  const co = main.querySelector('#gl-char');
  if (co) co.addEventListener('change', e => { state.charOnly = e.target.checked; renderCards(main, i18n()); writeHash(); });
  // Reset
  main.querySelector('#gl-reset').onclick = () => {
    Object.assign(state, structuredClone(DEFAULT_FILTERS));
    const qi = main.querySelector('#gl-q'); if (qi) qi.value = '';
    renderCards(main, i18n()); writeHash();
  };
}

// ── Library — cards (diff-rendered on every filter change) ───────────────────

function renderCards(main, L) {
  const char = getCharacter();
  const filtered = filterLists({ realm: state.realm, listType: state.type, keyword: state.q, characterOnly: state.charOnly, profession: state.prof }, char);
  const grouped = groupListsByRealm(filtered);

  // Update subtitle
  const subEl = main.querySelector('#gl-sub');
  if (subEl) subEl.textContent = `${filtered.length} / 510 ${L.lists}`;

  // Sync filter chips
  buildRealmChips(main, L);
  buildTypeChips(main, L);

  // Spell search hits
  let hits = '';
  if (state.q && state.q.length >= 2) {
    const results = searchSpells(state.q, 40);
    if (results.length) {
      hits = `<section class="spellhits"><h3 class="section-title">${L.spells} <span class="n">(${results.length})</span></h3><div class="hit-grid">` +
        results.map(sp => {
          const l = getListById(sp.list_id);
          const rc = resolveRealm(l ? l.realm : 'Other');
          const nm = sp.name_fr && state.lang === 'fr' ? sp.name_fr : sp.name_en;
          const enBadge = state.lang === 'fr' && !sp.name_fr ? ' <span class="en-badge">EN</span>' : '';
          const listNm = l ? (state.lang === 'fr' && l.name_fr ? l.name_fr : (l.name_en_clean || l.name_en)) : sp.list_id;
          return `<button class="hit" data-spell="${sp.id}" style="--realm:${rc.border}">
            <span class="nm">${esc(nm)}${enBadge}${spellHasDescription(sp) ? ' 📖' : ''}</span>
            <span class="mt"><span class="badge" style="--realm:${rc.border};--realm-text:${rc.text};background:${rc.bg}">${esc(rc['label_' + state.lang])}</span>
              ${L.lvl} ${sp.level} · ${esc(listNm)}</span>
          </button>`;
        }).join('') + '</div></section>';
    }
  }

  // Realm ribbons
  const presentRealms = REALM_ORDER.filter(r => filtered.some(l => l.realm.toLowerCase().includes(r.toLowerCase())));
  const ribbons = presentRealms.length ? `<div class="realm-ribbon-bar">` +
    presentRealms.map(r => { const rc = resolveRealm(r); return `<button class="ribbon" data-jump="${r}" style="--realm:${rc.border}">${rc.glyph} ${esc(rc['label_' + state.lang])}</button>`; }).join('') + `</div>` : '';

  // Character print bar
  const printBar = state.charOnly && char ? `<div class="comp-print-booklet-bar">
    <button id="gl-printbooklet" class="comp-print-booklet-btn">🖨 ${esc(state.lang === 'en' ? 'Print spellbook' : 'Imprimer le grimoire')}</button>
    <span class="comp-print-booklet-info">${esc(char.name)} — ${filtered.length} ${esc(L.lists)}</span>
  </div>` : '';

  // Group cards by realm
  const realmKeys = Object.keys(grouped).sort((a, b) => {
    const ia = REALM_ORDER.indexOf(a), ib = REALM_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });

  let sectionsHtml = '';
  if (!filtered.length) {
    sectionsHtml = `<div class="empty">${esc(L.noLists)}</div>`;
  } else {
    for (const realm of realmKeys) {
      const rc = resolveRealm(realm);
      const cards = grouped[realm].map(l => cardHTML(l, rc, L)).join('');
      sectionsHtml += `<section class="realm-section" id="realm-${realm.replace(/\W/g, '_')}"
        style="--realm:${rc.border};--realm-text:${rc.text};--realm-light:${rc.light}">
        <div class="realm-head">
          <span class="glyph">${rc.glyph}</span>
          <h3>${esc(rc.multi ? realm : rc['label_' + state.lang])}</h3>
          <span class="n">(${grouped[realm].length})</span>
        </div>
        <div class="card-grid">${cards}</div>
      </section>`;
    }
  }

  const grimCards = main.querySelector('#grim-cards');
  if (grimCards) grimCards.innerHTML = printBar + hits + ribbons + sectionsHtml;
}

function cardHTML(l, rc, L) {
  const hasFR = !!l.name_fr;
  const primary = state.lang === 'fr' ? (hasFR ? l.name_fr : (l.name_en_clean || l.name_en)) : (l.name_en_clean || l.name_en);
  const sub = state.lang === 'fr' && hasFR ? (l.name_en_clean || l.name_en) : '';
  const enOnly = state.lang === 'fr' && !hasFR;
  const cov = l.spell_count ? Math.round(100 * (l.described || 0) / l.spell_count) : 0;
  return `<button class="lcard parch" data-list="${l.id}" style="--realm:${rc.border};--realm-text:${rc.text}">
    <span class="ribbon-top"></span>
    <span class="body">
      <span class="top">
        <span class="badge type">${esc(getListTypeLabel(l.list_type, state.lang))}</span>
        <span class="cnt">${enOnly ? '<span class="en-badge">EN</span> ' : ''}${l.spell_count || '?'}</span>
      </span>
      <span class="name">${esc(primary)}</span>
      ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
      ${l.class_or_category && l.list_type === 'base' ? `<span class="cls">${esc(l.class_or_category)}</span>` : ''}
      <span class="cov ${cov >= 100 ? 'full' : ''}"><i style="width:${cov}%"></i></span>
      <span class="cov-label">${l.described || 0}/${l.spell_count || 0} ${L.described}</span>
      ${l.source_book ? `<span class="src">📖 ${esc(l.source_book)}</span>` : ''}
    </span>
  </button>`;
}

function buildRealmChips(main, L) {
  const el = main.querySelector('#gl-realm-chips');
  if (!el) return;
  el.innerHTML = ['', ...REALM_ORDER, 'Multi'].map(r => {
    const on = state.realm === r || (r === '' && !state.realm);
    const rc = r ? resolveRealm(r === 'Multi' ? 'Multi-Realm' : r) : null;
    const lbl = r === '' ? L.all : (r === 'Multi' ? 'Multi' : rc['label_' + state.lang]);
    const style = rc
      ? `--realm:${rc.border};${on ? `background:${rc.bg};color:${rc.text};border-color:${rc.border};` : ''}`
      : (on ? 'background:var(--gold);color:#241402;' : '');
    return `<button class="chip ${on ? 'on' : ''}" data-realm="${r === 'Multi' ? 'Multi' : r}" style="${style}">${rc ? '<span class="dot"></span>' : ''}${esc(lbl)}</button>`;
  }).join('');
}

function buildTypeChips(main, L) {
  const el = main.querySelector('#gl-type-chips');
  if (!el) return;
  el.innerHTML = ['all', 'base', 'open', 'closed', 'training_package'].map(ty => {
    const on = state.type === ty;
    const lbl = ty === 'all' ? L.allTypes : L.types[ty];
    return `<button class="chip ${on ? 'on' : ''}" data-type="${ty}" style="${on ? 'background:var(--gold);color:#241402;border-color:var(--gold-bright);' : ''}">${esc(lbl)}</button>`;
  }).join('');
}

// ── Print functions ──────────────────────────────────────────────────────────

async function doPrintCharacterSpellbook() {
  const char = getCharacter();
  if (!char) return;
  await ensureParams();
  const spellbook = await getCharacterSpellbook(char);
  const matched = spellbook.filter(e => e.matched);
  if (!matched.length) {
    showToast(state.lang === 'en' ? 'No spell lists matched.' : 'Aucune liste trouvée.', true);
    return;
  }
  const lang = state.lang;
  const classes = getAllClasses();
  const cls = classes[char.classIndex];
  const className = cls ? getClassName(cls, lang) : '?';
  const totalSpells = matched.reduce((acc, e) => acc + e.spells.length, 0);
  const headers = lang === 'en'
    ? ['Lvl', 'Spell', 'AoE', 'Dur.', 'Range', 'Type']
    : ['Niv', 'Sort', 'Zone', 'Dur.', 'Portée', 'Type'];

  const sections = matched.map(entry => {
    const list = entry.list;
    const rc = getRealmColor(list.realm);
    const listName = lang === 'fr' && list.name_fr ? list.name_fr : (list.name_en_clean || list.name_en);
    const altName = lang === 'fr' ? (list.name_en_clean || list.name_en) : (list.name_fr || '');
    const typeLabel = getListTypeLabel(list.list_type, lang);
    const sourceRef = list.source_book ? `${list.source_book}` : '';
    const maxLvl = entry.charList.maxLevel || 0;
    const rows = (entry.spells.concat(entry.beyondSpells || [])).map(sp => {
      const known = sp.level <= maxLvl;
      const spName = lang === 'fr' && sp.name_fr ? sp.name_fr : sp.name_en;
      const aoe = lang === 'fr' ? (sp.aoe_fr || sp.aoe_en || '') : (sp.aoe_en || '');
      const dur = lang === 'fr' ? (sp.duration_fr || sp.duration_en || '') : (sp.duration_en || '');
      const rng = lang === 'fr' ? (sp.range_fr || sp.range_en || '') : (sp.range_en || '');
      const stype = lang === 'fr' ? (sp.spell_type_fr || sp.spell_type || '') : (sp.spell_type || '');
      return `<tr${known ? ' class="known"' : ''}>
        <td>${sp.level}</td><td>${spName}${known ? ' <span class="km">✓</span>' : ''}</td>
        <td>${aoe}</td><td>${dur}</td><td>${rng}</td><td>${stype}</td>
      </tr>`;
    }).join('');
    return `<div class="spell-section">
      <div class="section-header" style="color:${rc.text};border-color:${rc.border}">${listName}</div>
      <div class="section-meta">${list.realm} · ${typeLabel}${altName ? ' — ' + altName : ''} · ${lang === 'en' ? 'Known to' : 'Connu jusqu\'au'} niv.${maxLvl}</div>
      ${sourceRef ? `<div class="section-ref">📖 ${sourceRef}</div>` : ''}
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${char.name} — ${lang === 'en' ? 'Spellbook' : 'Grimoire'}</title>
<style>
@page{size:A4;margin:10mm 8mm}
body{font-family:'Palatino','Georgia',serif;font-size:8pt;color:#1a0e04;column-count:2;column-gap:6mm}
.spell-section{break-inside:avoid-column;margin-bottom:8pt}
.section-header{font-size:10pt;font-weight:bold;border-bottom:1.5pt solid;padding-bottom:2pt;margin-bottom:3pt}
.section-meta{font-size:7pt;color:#6b5030;margin-bottom:2pt}
.section-ref{font-size:6.5pt;color:#8b6914;font-style:italic;margin-bottom:3pt}
table{width:100%;border-collapse:collapse;font-size:7.5pt}
th{text-align:left;padding:1pt 3pt;font-size:6.5pt;font-weight:bold;border-bottom:.5pt solid rgba(0,0,0,.3)}
td{padding:1pt 3pt;border-bottom:.25pt solid rgba(0,0,0,.1)}
td:first-child{width:16pt;text-align:center;font-weight:bold;color:#8b6914}
tr.known{background:rgba(22,163,74,.06)}.km{color:#16a34a;font-size:6pt}
.title-page{text-align:center;padding:20mm 0;break-after:column}
.title-page h1{font-size:18pt;color:#c49a20;margin:0 0 4pt}
.title-page h2{font-size:12pt;color:#3a1a08;margin:0 0 8pt}
.title-page p{font-size:8pt;color:#6b5030}
</style></head><body>
<div class="title-page"><h1>${char.name}</h1>
<h2>${className} — ${lang === 'en' ? 'Level' : 'Niveau'} ${char.level}</h2>
<p>${matched.length} ${lang === 'en' ? 'spell lists' : 'listes'} · ${totalSpells} ${lang === 'en' ? 'spells' : 'sorts'}</p></div>
${sections}</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
  else showToast(lang === 'en' ? 'Popup blocked.' : 'Popup bloqué.', true);
}

// ── i18n ─────────────────────────────────────────────────────────────────────

function i18n() {
  const fr = {
    title: 'Grimoire', searchPH: 'Rechercher sorts ou listes…', all: 'Tous', allTypes: 'Tous types',
    realm: 'Royaume', type: 'Type', prof: 'Profession', allProf: 'Toutes professions',
    mySpells: 'Mes sorts', reset: 'réinitialiser', spells: 'Sorts', lists: 'listes',
    noLists: 'Aucune liste ne correspond aux filtres.', described: 'décrits', lvl: 'Niv',
    types: { base: 'Base', open: 'Libre', closed: 'Réservée', training_package: 'Formation' },
  };
  const en = {
    title: 'Grimoire', searchPH: 'Search spells or lists…', all: 'All', allTypes: 'All types',
    realm: 'Realm', type: 'Type', prof: 'Profession', allProf: 'All professions',
    mySpells: 'My spells', reset: 'reset', spells: 'Spells', lists: 'lists',
    noLists: 'No list matches your filters.', described: 'described', lvl: 'Lv',
    types: { base: 'Base', open: 'Open', closed: 'Closed', training_package: 'Training' },
  };
  return state.lang === 'en' ? en : fr;
}

// ── utils ────────────────────────────────────────────────────────────────────

function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ── Global keyboard & hash ────────────────────────────────────────────────────

window.addEventListener('hashchange', () => { readHash(); go(); });

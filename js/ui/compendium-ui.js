// compendium-ui.js — Spell Compendium UI renderer
// Full-page view inside the parchment frame

import { loadSpellData, isSpellDataLoaded, getSpellMetadata, getAllSpellLists,
  getSpellsForList, getListById, getCharacterSpellbook, matchCharacterList, filterLists,
  searchSpells, groupListsByRealm, getRealmColor, getListTypeLabel,
  REALM_COLORS } from '../engine/spell-compendium.js';
import { getCharacter } from './wizard.js';
import { showToast } from './components.js';
import { getAllClasses, getClassName } from '../engine/classes.js';

let currentFilters = { realm: '', listType: 'all', keyword: '', characterOnly: false };
let currentListId = null; // detail view
let compendiumApp = null;

/**
 * Render the compendium into #app-main.
 */
export async function renderCompendium(app) {
  compendiumApp = app;
  const main = document.getElementById('app-main');
  const lang = app.lang || 'fr';

  // Show loading state
  if (!isSpellDataLoaded()) {
    main.innerHTML = `<div style="text-align:center;padding:3rem">
      <div class="compendium-loading-sigil"></div>
      <p style="color:#6b5030;margin-top:1rem;font-family:var(--font-title)">${lang === 'en' ? 'Loading spell compendium…' : 'Chargement du grimoire…'}</p>
    </div>`;
    try {
      await loadSpellData();
    } catch (e) {
      main.innerHTML = `<div style="text-align:center;padding:3rem;color:#993c1d">
        <p>${lang === 'en' ? 'Failed to load spell data.' : 'Erreur de chargement des sorts.'}</p>
        <p style="font-size:0.8rem">${e.message}</p>
      </div>`;
      return;
    }
  }

  if (currentListId) {
    renderListDetail(main, lang);
  } else {
    renderBrowser(main, lang);
  }
}

function renderBrowser(main, lang) {
  const meta = getSpellMetadata();
  const char = getCharacter();
  const charName = char?.name || '';
  const filteredLists = filterLists(currentFilters, char);
  const grouped = groupListsByRealm(filteredLists);
  const realmOrder = ['Essence', 'Channeling', 'Mentalism', 'Arcane', 'Alchemy', 'Other'];

  // Realm filter chips
  const realmChips = ['', ...Object.keys(REALM_COLORS)].map(r => {
    const active = currentFilters.realm === r;
    const label = r || (lang === 'en' ? 'All' : 'Tous');
    const col = r ? getRealmColor(r) : { bg: 'transparent', border: '#8b5c14', text: '#3a1a08' };
    return `<button class="comp-realm-chip ${active ? 'is-active' : ''}" data-realm="${r}"
      style="background:${active ? col.bg : 'transparent'};border-color:${col.border};color:${col.text}">${label}</button>`;
  }).join('');

  // Type filter chips
  const typeChips = ['all', 'base', 'open', 'closed', 'training_package'].map(t => {
    const active = currentFilters.listType === t;
    const label = t === 'all' ? (lang === 'en' ? 'All types' : 'Tous types') : getListTypeLabel(t, lang);
    return `<button class="comp-type-chip ${active ? 'is-active' : ''}" data-type="${t}">${label}</button>`;
  }).join('');

  // Character toggle
  const charToggle = charName
    ? `<label class="comp-char-toggle" title="${charName}">
        <input type="checkbox" id="comp-char-only" ${currentFilters.characterOnly ? 'checked' : ''}>
        <span>${lang === 'en' ? 'My spells' : 'Mes sorts'} (${charName})</span>
      </label>` : '';

  // Build list cards grouped by realm
  let listsHtml = '';
  for (const realm of realmOrder) {
    const lists = grouped[realm];
    if (!lists || lists.length === 0) continue;
    const col = getRealmColor(realm);
    listsHtml += `<div class="comp-realm-section">
      <h3 class="comp-realm-header" style="color:${col.text};border-bottom-color:${col.border}">${realm} <span class="comp-realm-count">(${lists.length})</span></h3>
      <div class="comp-list-grid">`;
    for (const l of lists) {
      const rc = getRealmColor(l.realm);
      const hasFR = !!l.name_fr;
      const primaryName = hasFR ? l.name_fr : (l.name_en_clean || l.name_en);
      const sub = hasFR ? (l.name_en_clean || l.name_en) : '';
      const typeBadge = getListTypeLabel(l.list_type, lang);
      const enBadge = lang === 'fr' && !hasFR ? `<span class="comp-badge-en" title="Pas de traduction française">EN</span>` : '';
      listsHtml += `<button class="comp-list-card" data-list-id="${l.id}" style="border-left-color:${rc.border}">
        <div class="comp-card-top">
          <span class="comp-badge" style="background:${rc.bg};color:${rc.text};border-color:${rc.border}">${typeBadge}</span>
          <span style="display:flex;align-items:center;gap:4px">${enBadge}<span class="comp-spell-count">${l.spell_count || '?'}</span></span>
        </div>
        <div class="comp-card-name">${primaryName}</div>
        ${sub ? `<div class="comp-card-sub">${sub}</div>` : ''}
        ${l.class_or_category && l.list_type === 'base' ? `<div class="comp-card-class">${l.class_or_category}</div>` : ''}
        ${l.source_book ? `<div class="comp-card-source">${l.source_book}</div>` : ''}
      </button>`;
    }
    listsHtml += `</div></div>`;
  }
  // Handle realms not in the predefined order
  for (const realm of Object.keys(grouped)) {
    if (!realmOrder.includes(realm)) {
      const lists = grouped[realm]; const col = getRealmColor(realm);
      listsHtml += `<div class="comp-realm-section">
        <h3 class="comp-realm-header" style="color:${col.text};border-bottom-color:${col.border}">${realm} <span class="comp-realm-count">(${lists.length})</span></h3>
        <div class="comp-list-grid">`;
      for (const l of lists) {
        const hasFR2 = !!l.name_fr;
        const primaryName2 = hasFR2 ? l.name_fr : (l.name_en_clean || l.name_en);
        const sub2 = hasFR2 ? (l.name_en_clean || l.name_en) : '';
        const enBadge2 = lang === 'fr' && !hasFR2 ? `<span class="comp-badge-en" title="Pas de traduction française">EN</span>` : '';
        listsHtml += `<button class="comp-list-card" data-list-id="${l.id}" style="border-left-color:${col.border}">
          <div class="comp-card-top">
            <span class="comp-badge">${getListTypeLabel(l.list_type, lang)}</span>
            <span style="display:flex;align-items:center;gap:4px">${enBadge2}<span class="comp-spell-count">${l.spell_count || '?'}</span></span>
          </div>
          <div class="comp-card-name">${primaryName2}</div>
          ${sub2 ? `<div class="comp-card-sub">${sub2}</div>` : ''}
        </button>`;
      }
      listsHtml += `</div></div>`;
    }
  }

  if (filteredLists.length === 0) {
    listsHtml = `<div style="text-align:center;padding:2rem;color:#6b5030">
      ${lang === 'en' ? 'No spell lists match your filters.' : 'Aucune liste de sorts ne correspond aux filtres.'}
    </div>`;
  }

  main.innerHTML = `
    <div class="comp-header">
      <div class="comp-title-row">
        <img src="assets/ui/icons/tab_spells_book.webp" alt="" width="40" height="40" class="comp-title-icon">
        <div>
          <h2 class="comp-title">${lang === 'en' ? 'Spell Compendium' : 'Grimoire'}</h2>
          <p class="comp-subtitle">${meta.total_spells.toLocaleString()} ${lang === 'en' ? 'spells' : 'sorts'} · ${meta.total_lists} ${lang === 'en' ? 'lists' : 'listes'}</p>
        </div>
      </div>
      <div class="comp-search-row">
        <input type="search" id="comp-search" class="comp-search" placeholder="${lang === 'en' ? 'Search spells or lists…' : 'Rechercher sorts ou listes…'}" value="${currentFilters.keyword || ''}">
        ${charToggle}
      </div>
      <div class="comp-filters">
        <div class="comp-chip-row">${realmChips}</div>
        <div class="comp-chip-row">${typeChips}</div>
      </div>
    </div>
    ${currentFilters.characterOnly && charName ? `
      <div class="comp-print-booklet-bar">
        <button class="comp-print-booklet-btn" id="comp-print-booklet">
          🖨️ ${lang === 'en' ? 'Print my spellbook' : 'Imprimer mon grimoire'}
        </button>
        <span class="comp-print-booklet-info">
          ${charName} — ${filteredLists.length} ${lang === 'en' ? 'lists' : 'listes'}
        </span>
      </div>` : ''}
    <div class="comp-body">${listsHtml}</div>
  `;
  bindBrowserEvents(main, lang);
}

function bindBrowserEvents(main, lang) {
  // Realm chips
  main.querySelectorAll('.comp-realm-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilters.realm = btn.dataset.realm;
      renderCompendium(compendiumApp);
    });
  });
  // Type chips
  main.querySelectorAll('.comp-type-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilters.listType = btn.dataset.type;
      renderCompendium(compendiumApp);
    });
  });
  // Character toggle
  const charCheck = main.querySelector('#comp-char-only');
  if (charCheck) {
    charCheck.addEventListener('change', () => {
      currentFilters.characterOnly = charCheck.checked;
      renderCompendium(compendiumApp);
    });
  }
  // Search
  const searchEl = main.querySelector('#comp-search');
  if (searchEl) {
    let debounce;
    searchEl.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentFilters.keyword = searchEl.value.trim();
        renderCompendium(compendiumApp);
      }, 300);
    });
  }
  // Print booklet button
  const bookletBtn = main.querySelector('#comp-print-booklet');
  if (bookletBtn) {
    bookletBtn.addEventListener('click', () => {
      const char = getCharacter();
      if (!char) return;
      printCharacterSpellbook(char, lang);
    });
  }
  // List card click → detail
  main.querySelectorAll('.comp-list-card').forEach(card => {
    card.addEventListener('click', () => {
      currentListId = card.dataset.listId;
      renderCompendium(compendiumApp);
    });
  });
}

function renderListDetail(main, lang) {
  const list = getListById(currentListId);
  if (!list) { currentListId = null; renderBrowser(main, lang); return; }

  const spells = getSpellsForList(currentListId);
  const rc = getRealmColor(list.realm);
  const name = lang === 'fr' && list.name_fr ? list.name_fr : (list.name_en_clean || list.name_en);
  const altName = lang === 'fr' ? (list.name_en_clean || list.name_en) : (list.name_fr || '');

  // Check character knowledge
  const char = getCharacter();
  let charMaxLvl = 0;
  if (char?.spellLists) {
    const matched = char.spellLists.find(cl => {
      const n = cl.name.toLowerCase().trim();
      return n === (list.name_fr || '').toLowerCase() || n === (list.name_en_clean || list.name_en).toLowerCase();
    });
    if (matched) charMaxLvl = matched.maxLevel || 0;
  }

  const headers = lang === 'en'
    ? ['Lvl', 'Spell', 'AoE', 'Dur.', 'Range', 'Type']
    : ['Niv', 'Sort', 'Zone', 'Dur.', 'Portée', 'Type'];

  let rows = '';
  for (const sp of spells) {
    const known = charMaxLvl > 0 && sp.level <= charMaxLvl;
    const dimmed = charMaxLvl > 0 && sp.level > charMaxLvl;
    const cls = known ? 'comp-spell-known' : (dimmed ? 'comp-spell-dim' : '');
    const spName = lang === 'fr' && sp.name_fr ? sp.name_fr : sp.name_en;
    const aoe = lang === 'fr' ? (sp.aoe_fr || sp.aoe_en || '') : (sp.aoe_en || '');
    const dur = lang === 'fr' ? (sp.duration_fr || sp.duration_en || '') : (sp.duration_en || '');
    const rng = lang === 'fr' ? (sp.range_fr || sp.range_en || '') : (sp.range_en || '');
    const stype = lang === 'fr' ? (sp.spell_type_fr || sp.spell_type || '') : (sp.spell_type || '');
    rows += `<tr class="${cls}">
      <td class="comp-td-lvl">${sp.level}</td>
      <td class="comp-td-name">${spName}</td>
      <td class="comp-td-aoe">${aoe}</td>
      <td class="comp-td-dur">${dur}</td>
      <td class="comp-td-rng">${rng}</td>
      <td class="comp-td-type">${stype}</td>
    </tr>`;
  }

  const charInfo = charMaxLvl > 0
    ? `<span class="comp-detail-char">${lang === 'en' ? 'Known up to level' : 'Connu jusqu\'au niveau'} ${charMaxLvl}</span>` : '';
  const noFRNote = lang === 'fr' && !list.name_fr
    ? `<span class="comp-badge-en" title="Liste non traduite en français">EN only</span>` : '';

  main.innerHTML = `
    <div class="comp-detail">
      <div class="comp-detail-nav">
        <button class="comp-back-btn" id="comp-back">← ${lang === 'en' ? 'Back' : 'Retour'}</button>
        <button class="comp-print-btn" id="comp-print-list">${lang === 'en' ? 'Print' : 'Imprimer'}</button>
      </div>
      <div class="comp-detail-header" style="border-left-color:${rc.border}">
        <div>
          <h2 class="comp-detail-title">${name}</h2>
          ${altName ? `<p class="comp-detail-alt">${altName}</p>` : ''}
          <div class="comp-detail-meta">
            <span class="comp-badge" style="background:${rc.bg};color:${rc.text};border-color:${rc.border}">${list.realm}</span>
            <span class="comp-badge-type">${getListTypeLabel(list.list_type, lang)}</span>
            ${list.class_or_category && list.list_type === 'base' ? `<span class="comp-detail-class">${list.class_or_category}</span>` : ''}
            <span class="comp-detail-count">${spells.length} ${lang === 'en' ? 'spells' : 'sorts'}</span>
            ${noFRNote}
            ${charInfo}
          </div>
          ${list.source_book ? `<span class="comp-detail-source">📖 ${list.source_book}${list.source_ref ? ' — ' + list.source_ref : ''}</span>` : ''}
        </div>
      </div>
      <div class="comp-table-wrap">
        <table class="comp-spell-table">
          <thead><tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  // Bind detail events
  main.querySelector('#comp-back')?.addEventListener('click', () => {
    currentListId = null;
    renderCompendium(compendiumApp);
  });
  main.querySelector('#comp-print-list')?.addEventListener('click', () => {
    printSpellList(list, spells, lang);
  });
}

/** Reset compendium state (called when navigating away). */
export function resetCompendium() {
  currentListId = null;
  currentFilters = { realm: '', listType: 'all', keyword: '', characterOnly: false };
}

/** Print a single spell list (improved layout). */
function printSpellList(list, spells, lang) {
  const name = lang === 'fr' && list.name_fr ? list.name_fr : (list.name_en_clean || list.name_en);
  const rc = getRealmColor(list.realm);
  const sourceRef = list.source_book ? `${list.source_book}${list.source_ref ? ' — ' + list.source_ref : ''}` : '';
  const headers = lang === 'en'
    ? ['Lvl', 'Spell', 'AoE', 'Dur.', 'Range', 'Type']
    : ['Niv', 'Sort', 'Zone', 'Dur.', 'Portée', 'Type'];

  const rows = spells.map(sp => {
    const spName = lang === 'fr' && sp.name_fr ? sp.name_fr : sp.name_en;
    const aoe = lang === 'fr' ? (sp.aoe_fr || sp.aoe_en || '') : (sp.aoe_en || '');
    const dur = lang === 'fr' ? (sp.duration_fr || sp.duration_en || '') : (sp.duration_en || '');
    const rng = lang === 'fr' ? (sp.range_fr || sp.range_en || '') : (sp.range_en || '');
    const stype = lang === 'fr' ? (sp.spell_type_fr || sp.spell_type || '') : (sp.spell_type || '');
    return `<tr><td>${sp.level}</td><td>${spName}</td><td>${aoe}</td><td>${dur}</td><td>${rng}</td><td>${stype}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${name}</title>
<style>
  @page { size: A4; margin: 10mm 8mm; }
  body { font-family: 'Palatino','Georgia',serif; font-size: 8pt; color: #1a0e04; }
  h1 { font-size: 13pt; margin: 0 0 2pt; color: ${rc.text}; border-bottom: 1.5pt solid ${rc.border}; padding-bottom: 2pt; }
  .meta { font-size: 7pt; color: #6b5030; margin-bottom: 2pt; }
  .ref  { font-size: 6.5pt; color: #8b6914; font-style: italic; margin-bottom: 6pt; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${rc.bg}; color: ${rc.text}; font-size: 6.5pt; text-align: left; padding: 2pt 3pt; border-bottom: 1pt solid ${rc.border}; font-weight: bold; }
  td { padding: 1pt 3pt; border-bottom: 0.25pt solid rgba(139,92,20,0.12); font-size: 7.5pt; }
  td:first-child { width: 16pt; text-align: center; font-weight: bold; color: #8b6914; }
  tr:nth-child(5n) td { border-bottom: 0.75pt solid rgba(139,92,20,0.25); }
</style></head><body>
<h1>${name}</h1>
<div class="meta">${list.realm} · ${getListTypeLabel(list.list_type, lang)}${list.class_or_category ? ' · ' + list.class_or_category : ''} · ${spells.length} ${lang === 'en' ? 'spells' : 'sorts'}</div>
${sourceRef ? `<div class="ref">📖 ${sourceRef}</div>` : ''}
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
  else { showToast(lang === 'en' ? 'Popup blocked — allow popups for this site.' : 'Popup bloqué — autorisez les popups.', true); }
}

/** Print a full character spellbook (all known lists, multi-column A4). */
function printCharacterSpellbook(char, lang) {
  const spellbook = getCharacterSpellbook(char);
  const matched = spellbook.filter(e => e.matched);
  if (!matched.length) {
    showToast(lang === 'en' ? 'No spell lists matched.' : 'Aucune liste de sorts trouvée.', true);
    return;
  }

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
    const sourceRef = list.source_book ? `${list.source_book}${list.source_ref ? ' — ' + list.source_ref : ''}` : '';

    const allSpells = getSpellsForList(list.id);
    const maxLvl = entry.charList.maxLevel || 0;
    const rows = allSpells.map(sp => {
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
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${char.name} — ${lang === 'en' ? 'Spellbook' : 'Grimoire'}</title>
<style>
  @page { size: A4; margin: 10mm 8mm; }
  body { font-family: 'Palatino','Georgia',serif; font-size: 8pt; color: #1a0e04; column-count: 2; column-gap: 6mm; }
  .spell-section { break-inside: avoid-column; margin-bottom: 8pt; }
  .section-header { font-size: 10pt; font-weight: bold; border-bottom: 1.5pt solid; padding-bottom: 2pt; margin-bottom: 3pt; }
  .section-meta { font-size: 7pt; color: #6b5030; margin-bottom: 2pt; }
  .section-ref { font-size: 6.5pt; color: #8b6914; font-style: italic; margin-bottom: 3pt; }
  table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
  th { text-align: left; padding: 1pt 3pt; font-size: 6.5pt; font-weight: bold; border-bottom: 0.5pt solid rgba(0,0,0,0.3); }
  td { padding: 1pt 3pt; border-bottom: 0.25pt solid rgba(0,0,0,0.1); }
  td:first-child { width: 16pt; text-align: center; font-weight: bold; color: #8b6914; }
  tr:nth-child(5n) td { border-bottom: 0.5pt solid rgba(0,0,0,0.2); }
  tr.known { background: rgba(22,163,74,0.06); }
  .km { color: #16a34a; font-size: 6pt; }
  .title-page { text-align: center; padding: 20mm 0; break-after: column; }
  .title-page h1 { font-size: 18pt; color: #c49a20; margin: 0 0 4pt; }
  .title-page h2 { font-size: 12pt; color: #3a1a08; margin: 0 0 8pt; }
  .title-page p { font-size: 8pt; color: #6b5030; }
</style></head><body>
<div class="title-page">
  <h1>${char.name}</h1>
  <h2>${className} — ${lang === 'en' ? 'Level' : 'Niveau'} ${char.level}</h2>
  <p>${matched.length} ${lang === 'en' ? 'spell lists' : 'listes de sorts'} · ${totalSpells} ${lang === 'en' ? 'spells known' : 'sorts connus'}</p>
</div>
${sections}
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
  else { showToast(lang === 'en' ? 'Popup blocked — allow popups for this site.' : 'Popup bloqué — autorisez les popups.', true); }
}

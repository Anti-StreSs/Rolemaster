// App — main entry point, router, global state

import { loadAllData, getData } from './engine/data-loader.js';
import { startWizard, loadIntoWizard, getCharacter } from './ui/wizard.js';
import { renderLoadView, bindLoadEvents } from './ui/settings.js';
import { panel, showToast } from './ui/components.js';
import { getLocalSaves, uploadCharacter, loadFromLocalStorage, deleteLocalSave, migrateFromLocalStorage } from './engine/export.js';
import { getAllClasses, getClassName } from './engine/classes.js';
import { generateNPC } from './engine/npc-generator.js';
import { compareBuilds } from './engine/build-compare.js';
import frLabels from './i18n/fr.js';
import enLabels from './i18n/en.js';

const LANGS = { fr: frLabels, en: enLabels };

const app = {
  lang: 'fr',
  t: frLabels,
  currentView: 'home',

  navigate(view) {
    this.currentView = view;
    render();
    window.location.hash = view;
  },

  loadCharacter(character) {
    this.currentView = 'create';
    loadIntoWizard(this, character);
    showToast(this.t.save.loaded);
  },
};

let editorStarted = false;

async function render() {
  const main = document.getElementById('app-main');

  switch (app.currentView) {
    case 'home':
      editorStarted = false;
      await renderHome(main);
      break;
    case 'create':
      startWizard(app, !editorStarted);
      editorStarted = true;
      break;
    case 'load':
      main.innerHTML = renderLoadView(app);
      bindLoadEvents(app);
      break;
    default:
      renderHome(main);
  }

  updateNav();
}

async function renderHome(main) {
  const t = app.t;
  const data = getData();
  const nav = document.getElementById('main-nav');
  const footerActions = document.getElementById('app-footer-actions');

  // Hide nav and footer actions on home
  if (nav) nav.innerHTML = '';
  if (footerActions) footerActions.innerHTML = '';

  const classCount = data.classes.total_classes;
  const skillCount = data.competences.total_skills;
  const spellCount = data.sorts.total_spell_lists;

  const statsLine = t.home.stats
    .replace('{classes}', classCount)
    .replace('{skills}', skillCount)
    .replace('{spells}', spellCount);

  // Local saves list
  const saves = await getLocalSaves();
  const saveNames = Object.keys(saves);
  let savesHtml = '';
  if (saveNames.length > 0) {
    const cmpLabel = app.lang === 'en' ? 'Compare selected' : 'Comparer la sélection';
    savesHtml = `<div style="margin-top:2rem;text-align:left;max-width:28rem;margin-left:auto;margin-right:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">
        <div style="font-size:0.9rem;color:#4a3520;font-weight:bold">${t.save.localStorage}</div>
        <button class="btn-secondary" id="btn-compare-builds" style="font-size:0.75rem;padding:2px 10px;display:none">${cmpLabel}</button>
      </div>`;
    for (const name of saveNames) {
      const save = saves[name];
      const date = save.updatedAt ? new Date(save.updatedAt).toLocaleDateString() : '';
      const cls = save.classIndex >= 0 ? (save.raceName || '') : '';
      const lvl = save.level || 1;
      const npcTag = save.isNPC ? ` <span style="font-size:0.65rem;color:#9ca3af;background:#374151;padding:1px 4px;border-radius:2px">PNJ</span>` : '';
      savesHtml += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.6rem;border-bottom:1px solid rgba(139,92,20,0.15)">
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;flex:1">
            <input type="checkbox" class="compare-check" data-name="${name}" style="accent-color:#c49a20">
            <span>
              <span style="font-weight:bold;color:#3a1a08">${name}</span>${npcTag}
              <span style="font-size:0.75rem;color:#6b5030;margin-left:0.5rem">${cls} Niv.${lvl} — ${date}</span>
            </span>
          </label>
          <div style="display:flex;gap:0.3rem;flex-shrink:0">
            <button class="btn-primary load-local-btn" style="font-size:0.75rem;padding:2px 10px" data-name="${name}">${t.save.load || 'Charger'}</button>
            <button class="btn-secondary delete-local-btn" style="font-size:0.75rem;padding:2px 6px" data-name="${name}">✕</button>
          </div>
        </div>`;
    }
    savesHtml += `</div>`;
  }

  // File upload section
  const uploadHtml = `<div style="margin-top:1.5rem;text-align:center">
    <label style="cursor:pointer;font-size:0.85rem;color:#6b5030;border:1px dashed rgba(139,92,20,0.3);border-radius:6px;padding:0.5rem 1.5rem;display:inline-block">
      ${t.save.upload || 'Charger un fichier JSON'}
      <input type="file" id="home-file-upload" accept=".json" style="display:none">
    </label>
  </div>`;

  main.innerHTML = `
    <div class="home-hero" style="text-align:center;padding:2.5rem 1rem 1rem">
      <h2 style="font-family:var(--font-title);font-size:2rem;color:#c49a20;margin-bottom:0.5rem;text-shadow:1px 1px 0 #1a0e04, -1px -1px 0 #1a0e04, 1px -1px 0 #1a0e04, -1px 1px 0 #1a0e04, 0 2px 4px rgba(0,0,0,0.4)">${t.home.title}</h2>
      <p style="margin-bottom:1rem;color:#4a3520;font-size:1.05rem">${t.home.subtitle}</p>
      <p style="font-size:0.85rem;color:#6b5030;margin-bottom:1.5rem">${statsLine}</p>
      <button class="btn-primary" style="font-size:1.1rem;padding:0.75rem 2rem" id="btn-create">
        ${t.home.createBtn}
      </button>
      <button class="btn-secondary" style="font-size:0.95rem;padding:0.5rem 1.5rem;margin-left:0.75rem" id="btn-gen-npc">
        ${app.lang === 'en' ? 'Generate NPC' : 'Générer un PNJ'}
      </button>
      ${savesHtml}
      ${uploadHtml}
    </div>
  `;

  document.getElementById('btn-create').addEventListener('click', () => {
    editorStarted = false;
    app.navigate('create');
  });

  document.getElementById('btn-gen-npc')?.addEventListener('click', () => openNPCGeneratorPopup());

  // Compare checkboxes — show/hide compare button
  const btnCompare = document.getElementById('btn-compare-builds');
  if (btnCompare) {
    function updateCompareBtn() {
      const checked = document.querySelectorAll('.compare-check:checked');
      btnCompare.style.display = checked.length >= 2 ? '' : 'none';
    }
    document.querySelectorAll('.compare-check').forEach(cb => {
      cb.addEventListener('change', updateCompareBtn);
    });
    btnCompare.addEventListener('click', () => {
      const names = [...document.querySelectorAll('.compare-check:checked')].map(cb => cb.dataset.name);
      if (names.length >= 2) openCompareView(names);
    });
  }


  // Load from local saves
  document.querySelectorAll('.load-local-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const character = await loadFromLocalStorage(btn.dataset.name);
      if (character) app.loadCharacter(character);
    });
  });

  // Delete local saves
  document.querySelectorAll('.delete-local-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm(t.save.confirmDelete || 'Supprimer cette sauvegarde ?')) {
        await deleteLocalSave(btn.dataset.name);
        render();
      }
    });
  });

  // File upload
  const fileInput = document.getElementById('home-file-upload');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const character = await uploadCharacter(file);
        app.loadCharacter(character);
      } catch (err) {
        showToast('Fichier invalide: ' + err.message, true);
      }
    });
  }
}

async function openCompareView(names) {
  const lang = app.lang;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;overflow:auto;padding:1.5rem';

  overlay.innerHTML = `<div style="max-width:900px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <h3 style="color:#c49a20;font-size:1.2rem;font-weight:bold">${lang === 'en' ? 'Build Comparison' : 'Comparaison de personnages'}</h3>
      <button id="compare-close" style="color:#9ca3af;font-size:1.2rem;cursor:pointer">✕</button>
    </div>
    <div id="compare-body" style="color:#9ca3af;text-align:center;padding:2rem">${lang === 'en' ? 'Loading...' : 'Chargement...'}</div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#compare-close').addEventListener('click', () => overlay.remove());

  try {
    const result = await compareBuilds(names);
    if (result.error) {
      overlay.querySelector('#compare-body').textContent = result.error;
      return;
    }
    const chars = result.characters;
    const STAT_ABBREVS = ['CO', 'AG', 'AD', 'Mé', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];

    // Helper: highlight max value in a set
    function highlight(val, vals) {
      const max = Math.max(...vals);
      return val === max ? 'style="color:#c49a20;font-weight:bold"' : '';
    }

    // Header row
    let table = `<table style="width:100%;border-collapse:collapse;font-size:0.85rem">
      <thead>
        <tr style="border-bottom:1px solid rgba(180,130,20,0.4)">
          <th style="text-align:left;padding:4px 8px;color:#6b5030">${lang === 'en' ? 'Field' : 'Champ'}</th>
          ${chars.map(c => `<th style="text-align:center;padding:4px 8px;color:#c49a20">${c.name}${c.isNPC ? ' <span style="font-size:0.7rem;color:#9ca3af">[PNJ]</span>' : ''}</th>`).join('')}
        </tr>
      </thead><tbody>`;

    // Identity rows
    const addRow = (label, vals, isNum = false) => {
      const numVals = isNum ? vals.map(Number) : [];
      table += `<tr style="border-bottom:1px solid rgba(80,60,20,0.2)">
        <td style="padding:3px 8px;color:#6b5030;font-size:0.8rem">${label}</td>
        ${vals.map((v, i) => `<td style="text-align:center;padding:3px 8px" ${isNum ? highlight(numVals[i], numVals) : ''}>${v}</td>`).join('')}
      </tr>`;
    };

    addRow(lang === 'en' ? 'Race' : 'Race', chars.map(c => c.race));
    addRow(lang === 'en' ? 'Class' : 'Classe', chars.map(c => c.class));
    addRow(lang === 'en' ? 'Level' : 'Niveau', chars.map(c => c.level), true);
    addRow('HP / PdC', chars.map(c => c.hp.base ?? c.hp), true);
    addRow('PP', chars.map(c => c.pp), true);
    addRow('DB / BD', chars.map(c => c.db), true);

    // Separator
    table += `<tr><td colspan="${chars.length + 1}" style="padding:4px 8px;color:#6b5030;font-size:0.75rem;font-weight:bold;background:rgba(20,15,5,0.4)">${lang === 'en' ? 'STATISTICS' : 'CARACTÉRISTIQUES'}</td></tr>`;

    for (let si = 0; si < 10; si++) {
      addRow(STAT_ABBREVS[si], chars.map(c => `${c.stats[si].value} (${c.stats[si].bonus >= 0 ? '+' : ''}${c.stats[si].bonus})`), false);
    }

    // Top skills separator
    table += `<tr><td colspan="${chars.length + 1}" style="padding:4px 8px;color:#6b5030;font-size:0.75rem;font-weight:bold;background:rgba(20,15,5,0.4)">${lang === 'en' ? 'TOP 5 SKILLS' : 'TOP 5 COMPÉTENCES'}</td></tr>`;

    for (let si = 0; si < 5; si++) {
      addRow(`#${si + 1}`, chars.map(c => {
        const sk = c.topSkills[si];
        return sk ? `${sk.name} (+${sk.rankBonus})` : '—';
      }));
    }

    addRow(lang === 'en' ? 'Total developed' : 'Total développées', chars.map(c => c.totalDevelopedSkills), true);

    table += `</tbody></table>`;
    overlay.querySelector('#compare-body').innerHTML = table;
  } catch (e) {
    overlay.querySelector('#compare-body').textContent = 'Erreur: ' + e.message;
  }
}

function openNPCGeneratorPopup() {
  const data = getData();
  const lang = app.lang;
  const races = data.monde?.races || [];
  const classes = getAllClasses();

  const raceOptions = races.map((r, i) =>
    `<option value="${i}">${r.name || 'Race ' + i}</option>`
  ).join('');
  const classOptions = classes.map((c, i) =>
    `<option value="${i}">${getClassName(c, lang)}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'npc-gen-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#1a1208;border:1px solid rgba(180,130,20,0.4);border-radius:8px;padding:1.5rem;width:340px;max-width:90vw">
      <h3 style="color:#c49a20;font-size:1.1rem;font-weight:bold;margin-bottom:1rem">
        ${lang === 'en' ? 'Generate NPC' : 'Générer un PNJ'}
      </h3>
      <div style="display:grid;gap:0.75rem;font-size:0.9rem">
        <div>
          <label style="color:#8b7040;font-size:0.8rem">${lang === 'en' ? 'Name' : 'Nom'}</label>
          <input type="text" id="npc-name" class="field" style="width:100%" placeholder="${lang === 'en' ? 'NPC name...' : 'Nom du PNJ...'}">
        </div>
        <div>
          <label style="color:#8b7040;font-size:0.8rem">${lang === 'en' ? 'Race' : 'Race'}</label>
          <select id="npc-race" class="field" style="width:100%">${raceOptions}</select>
        </div>
        <div>
          <label style="color:#8b7040;font-size:0.8rem">${lang === 'en' ? 'Class' : 'Classe'}</label>
          <select id="npc-class" class="field" style="width:100%">${classOptions}</select>
        </div>
        <div>
          <label style="color:#8b7040;font-size:0.8rem">${lang === 'en' ? 'Level' : 'Niveau'}</label>
          <input type="number" id="npc-level" class="field" value="1" min="1" max="20" style="width:100%">
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1.25rem;justify-content:flex-end">
        <button class="btn-secondary" id="npc-cancel">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
        <button class="btn-primary" id="npc-generate">${lang === 'en' ? 'Generate' : 'Générer'}</button>
      </div>
      <div id="npc-gen-status" style="margin-top:0.5rem;font-size:0.8rem;color:#8b7040;min-height:1rem"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#npc-cancel').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#npc-generate').addEventListener('click', async () => {
    const name = overlay.querySelector('#npc-name').value.trim() || `PNJ_${Date.now()}`;
    const raceIndex = parseInt(overlay.querySelector('#npc-race').value);
    const classIndex = parseInt(overlay.querySelector('#npc-class').value);
    const level = Math.max(1, Math.min(20, parseInt(overlay.querySelector('#npc-level').value) || 1));
    const status = overlay.querySelector('#npc-gen-status');

    status.textContent = lang === 'en' ? 'Generating...' : 'Génération en cours...';
    overlay.querySelector('#npc-generate').disabled = true;

    try {
      const npc = await generateNPC({ name, raceIndex, classIndex, level, save: true });
      overlay.remove();
      showToast(lang === 'en' ? `NPC "${npc.name}" generated!` : `PNJ "${npc.name}" généré !`);
      app.loadCharacter(npc);
    } catch (e) {
      status.style.color = '#e57373';
      status.textContent = 'Erreur: ' + e.message;
      overlay.querySelector('#npc-generate').disabled = false;
    }
  });
}

function updateNav() {
  // Nav is now handled by wizard.js tab rendering
}

function setupLangToggle() {
  // Flag buttons for language toggle
  const btnFr = document.getElementById('btn-lang-fr');
  const btnEn = document.getElementById('btn-lang-en');
  function updateFlags() {
    if (btnFr) btnFr.classList.toggle('active', app.lang === 'fr');
    if (btnEn) btnEn.classList.toggle('active', app.lang === 'en');
  }
  if (btnFr) btnFr.addEventListener('click', () => {
    app.lang = 'fr'; app.t = LANGS.fr; updateFlags(); render();
  });
  if (btnEn) btnEn.addEventListener('click', () => {
    app.lang = 'en'; app.t = LANGS.en; updateFlags(); render();
  });
  updateFlags();
}

function handleHash() {
  const hash = window.location.hash.replace('#', '') || 'home';
  app.currentView = hash;
  render();
}

async function init() {
  const main = document.getElementById('app-main');
  main.innerHTML = `
    <div class="text-center py-16">
      <div class="text-4xl mb-4">⚔</div>
      <p class="text-gray-400">${app.t.app.loading}</p>
    </div>
  `;

  try {
    await loadAllData();

    // Migrate any existing localStorage saves to IndexedDB
    const migrated = await migrateFromLocalStorage();
    if (migrated > 0) console.log(`Migrated ${migrated} character(s) to IndexedDB`);

    setupLangToggle();
    // Banner click → home
    const banner = document.getElementById('rm-header-banner');
    if (banner) banner.addEventListener('click', (e) => {
      if (e.target.closest('.rm-lang-toggle')) return; // don't trigger on flag buttons
      app.navigate('home');
    });
    handleHash();

    window.addEventListener('hashchange', handleHash);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  } catch (err) {
    main.innerHTML = `
      <div class="text-center py-16">
        <p class="text-red-400 text-xl">Erreur de chargement</p>
        <p class="text-gray-500 mt-2">${err.message}</p>
      </div>
    `;
  }
}

init();

// App — main entry point, router, global state

import { loadAllData, getData } from './engine/data-loader.js';
import { startWizard, loadIntoWizard, getCharacter } from './ui/wizard.js';
import { renderLoadView, bindLoadEvents } from './ui/settings.js';
import { panel, showToast } from './ui/components.js';
import { getLocalSaves, uploadCharacter, loadFromLocalStorage, deleteLocalSave, migrateFromLocalStorage } from './engine/export.js';
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
    savesHtml = `<div style="margin-top:2rem;text-align:left;max-width:28rem;margin-left:auto;margin-right:auto">
      <div style="font-size:0.9rem;color:#4a3520;font-weight:bold;margin-bottom:0.5rem">${t.save.localStorage}</div>`;
    for (const name of saveNames) {
      const save = saves[name];
      const date = save.updatedAt ? new Date(save.updatedAt).toLocaleDateString() : '';
      const cls = save.classIndex >= 0 ? (save.raceName || '') : '';
      const lvl = save.level || 1;
      savesHtml += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.6rem;border-bottom:1px solid rgba(139,92,20,0.15)">
          <div>
            <span style="font-weight:bold;color:#3a1a08">${name}</span>
            <span style="font-size:0.75rem;color:#6b5030;margin-left:0.5rem">${cls} Niv.${lvl} — ${date}</span>
          </div>
          <div style="display:flex;gap:0.3rem">
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
      ${savesHtml}
      ${uploadHtml}
    </div>
  `;

  document.getElementById('btn-create').addEventListener('click', () => {
    editorStarted = false;
    app.navigate('create');
  });

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

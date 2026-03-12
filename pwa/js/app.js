// App — main entry point, router, global state

import { loadAllData, getData } from './engine/data-loader.js';
import { startWizard, loadIntoWizard, getCharacter } from './ui/wizard.js';
import { renderLoadView, bindLoadEvents } from './ui/settings.js';
import { panel, showToast } from './ui/components.js';
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

function render() {
  const main = document.getElementById('app-main');

  switch (app.currentView) {
    case 'home':
      editorStarted = false;
      renderHome(main);
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

function renderHome(main) {
  const t = app.t;
  const data = getData();

  const classCount = data.classes.total_classes;
  const skillCount = data.competences.total_skills;
  const spellCount = data.sorts.total_spell_lists;

  const statsLine = t.home.stats
    .replace('{classes}', classCount)
    .replace('{skills}', skillCount)
    .replace('{spells}', spellCount);

  main.innerHTML = `
    <div class="home-hero">
      <h2>${t.home.title}</h2>
      <p>${t.home.subtitle}</p>
      <p class="text-sm text-gray-500 mb-6">${statsLine}</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button class="btn-primary text-lg px-8 py-3" id="btn-create">
          ⚔ ${t.home.createBtn}
        </button>
        <button class="btn-secondary text-lg px-8 py-3" id="btn-load">
          📂 ${t.home.loadBtn}
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-create').addEventListener('click', () => {
    editorStarted = false;
    app.navigate('create');
  });
  document.getElementById('btn-load').addEventListener('click', () => app.navigate('load'));
}

function updateNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    const view = link.dataset.view;
    if (view === app.currentView) {
      link.classList.add('text-amber-400');
      link.classList.remove('text-gray-400');
    } else {
      link.classList.remove('text-amber-400');
      link.classList.add('text-gray-400');
    }
  });
}

function setupLangToggle() {
  const btn = document.getElementById('btn-lang');
  if (btn) {
    btn.addEventListener('click', () => {
      app.lang = app.lang === 'fr' ? 'en' : 'fr';
      app.t = LANGS[app.lang];
      btn.textContent = app.lang === 'fr' ? 'FR/EN' : 'EN/FR';
      render();
    });
  }
}

function setupMobileMenu() {
  const btn = document.getElementById('btn-menu');
  if (btn) {
    btn.addEventListener('click', () => {
      const nav = document.getElementById('app-nav');
      nav.classList.toggle('hidden');
    });
  }
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

    setupLangToggle();
    setupMobileMenu();
    handleHash();

    window.addEventListener('hashchange', handleHash);

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        app.navigate(link.dataset.view);
      });
    });

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

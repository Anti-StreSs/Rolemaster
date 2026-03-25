// App — main entry point, router, global state

import { loadAllData, getData } from './engine/data-loader.js';
import { startWizard, loadIntoWizard, getCharacter } from './ui/wizard.js';
import { renderLoadView, bindLoadEvents } from './ui/settings.js';
import { panel, showToast } from './ui/components.js';
import { getLocalSaves, uploadCharacter, loadFromLocalStorage, deleteLocalSave, migrateFromLocalStorage } from './engine/export.js';
import { getAllClasses, getClassName } from './engine/classes.js';
import { generateNPC } from './engine/npc-generator.js';
import { compareBuilds } from './engine/build-compare.js';
import { rollOpenEndedD100, getAvailableWeapons, resolveFullAttack } from './engine/combat.js';
import { resolveStaticManeuver, resolveResistanceRoll, DIFFICULTIES, DIFFICULTY_LABELS } from './engine/maneuvers.js';
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
      const npcTag = save.isNPC ? ` <span class="rm-npc-badge" aria-label="PNJ" style="position:relative;top:auto;right:auto;display:inline-flex;margin-left:0.4rem;font-size:0.65rem;padding:0.15rem 0.45rem;clip-path:none;border-radius:3px">PNJ</span>` : '';
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
  overlay.className = 'rm-overlay-shell';
  overlay.innerHTML = `
    <section class="rm-compare-shell" role="dialog" aria-modal="true" aria-labelledby="compare-modal-title">
      <header class="rm-compare-toolbar">
        <div>
          <h2 class="rm-sheet-title" id="compare-modal-title">${lang === 'en' ? 'Build Comparator' : 'Comparaison de personnages'}</h2>
          <p class="rm-sheet-subtitle">${lang === 'en' ? 'Best values highlighted in gold.' : 'Meilleures valeurs surlignées en or.'}</p>
        </div>
        <div class="rm-action-row">
          <span class="rm-score-pill">${lang === 'en' ? 'Best values glow in gold' : 'Meilleures valeurs en or'}</span>
          <button type="button" class="rm-icon-btn" id="compare-close" aria-label="${lang === 'en' ? 'Close' : 'Fermer'}">✕</button>
        </div>
      </header>
      <div class="rm-compare-grid" id="compare-grid">
        <div style="grid-column:1/-1;padding:2rem;text-align:center;color:#6b5030">
          ${lang === 'en' ? 'Loading…' : 'Chargement…'}
        </div>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  const closeOverlay = () => overlay.remove();
  overlay.querySelector('#compare-close').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

  try {
    const result = await compareBuilds(names);
    if (result.error) {
      overlay.querySelector('#compare-grid').textContent = result.error;
      return;
    }
    const chars = result.characters;
    const STAT_ABBREVS = ['CO', 'AG', 'AD', 'Mé', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];
    const STAT_KEYS = ['CO', 'AG', 'AD', 'ME', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];

    // Find max value across chars for a numeric extractor
    function maxOf(extractor) { return Math.max(...chars.map(extractor)); }

    function meterPct(val, max) { return max > 0 ? Math.round((val / max) * 100) : 0; }

    function statRows(char) {
      return STAT_ABBREVS.map((abbr, si) => {
        const sv = char.stats[si];
        const val = sv?.value ?? 0;
        const bonus = sv?.bonus ?? 0;
        const maxVal = maxOf(c => c.stats[si]?.value ?? 0);
        const isBest = val === maxVal && maxVal > 0;
        const pct = meterPct(val, 101);
        return `<div class="rm-stat-row">
          <span class="rm-stat-key">${abbr}</span>
          <div class="rm-stat-meter${isBest ? ' is-best' : ''}" aria-hidden="true" style="--meter:${pct}%"><span></span></div>
          <span class="rm-stat-value${isBest ? '" style="color:var(--rm-warning-bright)' : ''}">${val}${bonus >= 0 ? '+' : ''}${bonus}</span>
        </div>`;
      }).join('');
    }

    const maxHp = maxOf(c => c.hp?.base ?? c.hp ?? 0);
    const maxPp = maxOf(c => c.pp ?? 0);
    const maxDb = maxOf(c => c.db ?? 0);

    const cards = chars.map((c, ci) => {
      const hp = c.hp?.base ?? c.hp ?? 0;
      const pp = c.pp ?? 0;
      const db = c.db ?? 0;
      const topSkillsHtml = (c.topSkills || []).slice(0, 5).map((sk, si) =>
        sk ? `<div style="font-size:0.8rem;padding:0.3rem 0;border-bottom:1px solid rgba(138,92,20,0.12)">#${si+1} ${sk.name} <span style="color:var(--rm-warning)">+${sk.rankBonus}</span></div>` : ''
      ).join('');

      return `<article class="rm-compare-card${ci === 0 ? ' is-best-overall' : ''}">
        <div class="rm-compare-head">
          <div>
            <h3 class="rm-card-title">${c.name}${c.isNPC ? ' <span style="font-size:0.7rem;color:#9ca3af">[PNJ]</span>' : ''}</h3>
            <p class="rm-card-meta">${c.race || '?'} · ${c.class || '?'} · ${lang === 'en' ? 'Level' : 'Niveau'} ${c.level}</p>
          </div>
          <span class="rm-score-pill">${lang === 'en' ? 'Skills: ' : 'Compétences: '}${c.totalDevelopedSkills}</span>
        </div>
        <div class="rm-compare-section">
          <h4>${lang === 'en' ? 'Combat' : 'Combat'}</h4>
          <div class="rm-stat-row">
            <span class="rm-stat-key">HP</span>
            <div class="rm-stat-meter${hp === maxHp && maxHp > 0 ? ' is-best' : ''}" aria-hidden="true" style="--meter:${meterPct(hp, Math.max(maxHp, 1))}%"><span></span></div>
            <span class="rm-stat-value${hp === maxHp && maxHp > 0 ? '" style="color:var(--rm-warning-bright)' : ''}">${hp}</span>
          </div>
          <div class="rm-stat-row">
            <span class="rm-stat-key">PP</span>
            <div class="rm-stat-meter${pp === maxPp && maxPp > 0 ? ' is-best' : ''}" aria-hidden="true" style="--meter:${meterPct(pp, Math.max(maxPp, 1))}%"><span></span></div>
            <span class="rm-stat-value${pp === maxPp && maxPp > 0 ? '" style="color:var(--rm-warning-bright)' : ''}">${pp}</span>
          </div>
          <div class="rm-stat-row">
            <span class="rm-stat-key">DB</span>
            <div class="rm-stat-meter${db === maxDb && maxDb > 0 ? ' is-best' : ''}" aria-hidden="true" style="--meter:${meterPct(db, Math.max(maxDb, 1))}%"><span></span></div>
            <span class="rm-stat-value${db === maxDb && maxDb > 0 ? '" style="color:var(--rm-warning-bright)' : ''}">${db}</span>
          </div>
        </div>
        <div class="rm-compare-section">
          <h4>${lang === 'en' ? 'Stats' : 'Caractéristiques'}</h4>
          ${statRows(c)}
        </div>
        ${topSkillsHtml ? `<div class="rm-compare-section"><h4>${lang === 'en' ? 'Top Skills' : 'Top Compétences'}</h4>${topSkillsHtml}</div>` : ''}
      </article>`;
    }).join('');

    overlay.querySelector('#compare-grid').innerHTML = cards;
  } catch (e) {
    overlay.querySelector('#compare-grid').textContent = 'Erreur: ' + e.message;
  }
}

function openNPCGeneratorPopup() {
  const data = getData();
  const lang = app.lang;
  const races = data.monde?.races || [];
  const classes = getAllClasses();

  const raceOptions = `<option value="">${lang === 'en' ? 'Random' : 'Aléatoire'}</option>` +
    races.map((r, i) => `<option value="${i}">${r.name || 'Race ' + i}</option>`).join('');
  const classOptions = `<option value="">${lang === 'en' ? 'Random' : 'Aléatoire'}</option>` +
    classes.map((c, i) => `<option value="${i}">${getClassName(c, lang)}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'rm-overlay-shell';
  overlay.innerHTML = `
    <section class="rm-modal-panel" role="dialog" aria-modal="true" aria-labelledby="npc-modal-title">
      <header class="rm-modal-header">
        <div>
          <h2 class="rm-modal-title" id="npc-modal-title">${lang === 'en' ? 'Generate NPC' : 'Générer un PNJ'}</h2>
          <p class="rm-modal-subtitle">${lang === 'en' ? 'Quick generation with race, class and level.' : 'Génération rapide avec race, classe et niveau.'}</p>
        </div>
        <button type="button" class="rm-icon-btn" id="npc-cancel" aria-label="${lang === 'en' ? 'Close' : 'Fermer'}">✕</button>
      </header>
      <div class="rm-npc-layout">
        <div class="rm-form-grid">
          <div class="rm-field-group">
            <label class="rm-field-label" for="npc-name">${lang === 'en' ? 'Name' : 'Nom'}</label>
            <input class="rm-field" type="text" id="npc-name" placeholder="${lang === 'en' ? 'NPC name…' : 'Nom du PNJ…'}">
          </div>
          <div class="rm-field-group">
            <label class="rm-field-label" for="npc-race">${lang === 'en' ? 'Race' : 'Race'}</label>
            <select class="rm-field" id="npc-race">${raceOptions}</select>
          </div>
          <div class="rm-field-group">
            <label class="rm-field-label" for="npc-class">${lang === 'en' ? 'Class' : 'Classe'}</label>
            <select class="rm-field" id="npc-class">${classOptions}</select>
          </div>
          <div class="rm-field-group">
            <label class="rm-field-label" for="npc-level">${lang === 'en' ? 'Level' : 'Niveau'}</label>
            <input class="rm-field rm-inline-input" type="number" id="npc-level" value="1" min="1" max="20" inputmode="numeric">
          </div>
          <div class="rm-field-group is-span-2">
            <div class="rm-action-row">
              <button class="rm-action-btn" type="button" id="npc-generate">
                <span aria-hidden="true">⚔</span>${lang === 'en' ? 'Generate' : 'Générer'}
              </button>
              <button class="rm-action-btn is-secondary" type="button" id="npc-cancel2">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
            </div>
            <div id="npc-gen-status" style="margin-top:0.5rem;font-size:0.8rem;color:#6b5030;min-height:1rem"></div>
          </div>
        </div>
        <aside class="rm-preview-card" aria-live="polite">
          <div class="rm-preview-crest">
            <img class="rm-preview-icon" src="assets/ui/icons/tab_race_face.webp" alt="" onerror="this.style.display='none'">
            <div>
              <h3 class="rm-preview-name" id="npc-preview-name">${lang === 'en' ? 'Unnamed Wanderer' : 'Voyageur Inconnu'}</h3>
              <p class="rm-preview-meta" id="npc-preview-meta">${lang === 'en' ? 'Race · Class · Level 1' : 'Race · Classe · Niveau 1'}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  // Live preview as user types
  function updatePreview() {
    const name = overlay.querySelector('#npc-name').value.trim();
    const raceVal = overlay.querySelector('#npc-race').value;
    const classVal = overlay.querySelector('#npc-class').value;
    const level = overlay.querySelector('#npc-level').value;
    const raceName = raceVal !== '' ? (races[parseInt(raceVal)]?.name || '?') : (lang === 'en' ? 'Random' : 'Aléatoire');
    const className = classVal !== '' ? getClassName(classes[parseInt(classVal)], lang) : (lang === 'en' ? 'Random' : 'Aléatoire');
    overlay.querySelector('#npc-preview-name').textContent = name || (lang === 'en' ? 'Unnamed Wanderer' : 'Voyageur Inconnu');
    overlay.querySelector('#npc-preview-meta').textContent = `${raceName} · ${className} · ${lang === 'en' ? 'Level' : 'Niveau'} ${level}`;
  }
  overlay.querySelector('#npc-name').addEventListener('input', updatePreview);
  overlay.querySelector('#npc-race').addEventListener('change', updatePreview);
  overlay.querySelector('#npc-class').addEventListener('change', updatePreview);
  overlay.querySelector('#npc-level').addEventListener('input', updatePreview);

  const closeOverlay = () => overlay.remove();
  overlay.querySelector('#npc-cancel').addEventListener('click', closeOverlay);
  overlay.querySelector('#npc-cancel2').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

  overlay.querySelector('#npc-generate').addEventListener('click', async () => {
    const name = overlay.querySelector('#npc-name').value.trim() || `PNJ_${Date.now()}`;
    const raceVal = overlay.querySelector('#npc-race').value;
    const classVal = overlay.querySelector('#npc-class').value;
    const raceIndex = raceVal !== '' ? parseInt(raceVal) : -1;
    const classIndex = classVal !== '' ? parseInt(classVal) : -1;
    const level = Math.max(1, Math.min(20, parseInt(overlay.querySelector('#npc-level').value) || 1));
    const status = overlay.querySelector('#npc-gen-status');
    const genBtn = overlay.querySelector('#npc-generate');

    status.textContent = lang === 'en' ? 'Generating…' : 'Génération en cours…';
    genBtn.setAttribute('aria-busy', 'true');
    genBtn.disabled = true;

    try {
      const npc = await generateNPC({ name, raceIndex, classIndex, level, save: true });
      overlay.remove();
      showToast(lang === 'en' ? `NPC "${npc.name}" generated!` : `PNJ "${npc.name}" généré !`);
      app.loadCharacter(npc);
    } catch (e) {
      status.style.color = '#8b2500';
      status.textContent = 'Erreur: ' + e.message;
      genBtn.removeAttribute('aria-busy');
      genBtn.disabled = false;
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

function initSessionToolbox() {
  const lang = app.lang;
  const resultHistory = [];

  // Floating trigger button
  const fab = document.createElement('button');
  fab.id = 'session-toolbox-fab';
  fab.setAttribute('aria-label', lang === 'en' ? 'Open Session Toolbox' : 'Ouvrir la boîte à outils');
  fab.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:124;width:3.25rem;height:3.25rem;border-radius:999px;border:1px solid #946a1e;cursor:pointer;box-shadow:0 8px 24px rgba(60,36,10,0.35);background:linear-gradient(135deg,#7b5418,#b07c22 48%,#6a4310);display:flex;align-items:center;justify-content:center;color:#fff5d6;font-size:1.3rem';
  fab.innerHTML = '<img src="assets/ui/icons/session_toolbox_satchel.webp" alt="" style="width:1.6rem;height:1.6rem;object-fit:contain;filter:brightness(1.15)" onerror="this.outerHTML=\'🎲\'">';
  document.body.appendChild(fab);

  // Toolbox shell
  const shell = document.createElement('div');
  shell.className = 'rm-session-shell';
  shell.id = 'session-toolbox';
  shell.setAttribute('hidden', '');

  const diffOptions = DIFFICULTIES.map(d =>
    `<option value="${d}">${DIFFICULTY_LABELS[d][lang] || d}</option>`
  ).join('');

  shell.innerHTML = `
    <button class="rm-session-backdrop" type="button" aria-label="${lang === 'en' ? 'Close' : 'Fermer'}"></button>
    <aside class="rm-session-panel" role="dialog" aria-modal="true" aria-labelledby="session-toolbox-title">
      <header class="rm-session-top">
        <div class="rm-action-row" style="justify-content:space-between">
          <div>
            <h2 class="rm-session-title" id="session-toolbox-title">${lang === 'en' ? 'Session Toolbox' : 'Boîte à outils'}</h2>
            <p class="rm-session-subtitle">${lang === 'en' ? 'Quick rollers & resolution tools.' : 'Jets rapides & résolution.'}</p>
          </div>
          <button class="rm-icon-btn" type="button" id="session-close" aria-label="${lang === 'en' ? 'Close' : 'Fermer'}">✕</button>
        </div>
      </header>
      <nav class="rm-tool-tabs" aria-label="${lang === 'en' ? 'Session tools' : 'Outils de session'}">
        <button class="rm-tabbed-chip is-active" type="button" data-tool="quick">${lang === 'en' ? 'Quick D100' : 'D100'}</button>
        <button class="rm-tabbed-chip" type="button" data-tool="maneuver">${lang === 'en' ? 'Maneuver' : 'Manœuvre'}</button>
        <button class="rm-tabbed-chip" type="button" data-tool="attack">${lang === 'en' ? 'Attack' : 'Attaque'}</button>
        <button class="rm-tabbed-chip" type="button" data-tool="rr">RR</button>
        <button class="rm-tabbed-chip" type="button" data-tool="history">${lang === 'en' ? 'History' : 'Historique'}</button>
      </nav>
      <div class="rm-session-content">
        <!-- Quick D100 -->
        <section class="rm-tool-pane is-active" data-pane="quick">
          <article class="rm-tool-card">
            <h4>${lang === 'en' ? 'Open-ended D100' : 'D100 ouvert'}</h4>
            <div class="rm-roller-big">
              <output class="rm-roller-value" id="quick-roll-output" aria-live="polite">—</output>
            </div>
            <div class="rm-action-row">
              <button class="rm-action-btn" type="button" id="btn-quick-d100">
                <img src="assets/ui/icons/session_quick_d100.webp" alt="" style="width:1.1rem;height:1.1rem;object-fit:contain" onerror="this.style.display='none'">
                ${lang === 'en' ? 'Roll D100' : 'Lancer D100'}
              </button>
              <button class="rm-action-btn is-subtle" type="button" id="btn-clear-history">${lang === 'en' ? 'Clear history' : 'Effacer'}</button>
            </div>
          </article>
        </section>
        <!-- Maneuver -->
        <section class="rm-tool-pane" data-pane="maneuver">
          <article class="rm-tool-card">
            <h4>${lang === 'en' ? 'Static Maneuver' : 'Manœuvre statique'}</h4>
            <div class="rm-tool-inline" style="margin-bottom:0.65rem">
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Difficulty' : 'Difficulté'}</label>
                <select class="rm-field" id="man-difficulty">${diffOptions}</select>
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Bonus' : 'Bonus'}</label>
                <input class="rm-field rm-inline-input" type="number" id="man-bonus" value="0" inputmode="numeric">
              </div>
            </div>
            <button class="rm-action-btn" type="button" id="btn-resolve-maneuver">
              <img src="assets/ui/icons/session_maneuver_scroll.webp" alt="" style="width:1.1rem;height:1.1rem;object-fit:contain" onerror="this.style.display='none'">
              ${lang === 'en' ? 'Resolve' : 'Résoudre'}
            </button>
            <div id="maneuver-result" style="margin-top:0.75rem"></div>
          </article>
        </section>
        <!-- Attack -->
        <section class="rm-tool-pane" data-pane="attack">
          <article class="rm-tool-card">
            <h4>${lang === 'en' ? 'Attack Resolution' : 'Résolution d\'attaque'}</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.65rem">
              <div class="rm-field-group" style="grid-column:1/-1">
                <label class="rm-field-label">${lang === 'en' ? 'Weapon' : 'Arme'}</label>
                <select class="rm-field" id="atk-weapon"><option value="">${lang === 'en' ? 'Select weapon…' : 'Choisir une arme…'}</option></select>
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">OB</label>
                <input class="rm-field rm-inline-input" type="number" id="atk-ob" value="0" inputmode="numeric">
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">DB</label>
                <input class="rm-field rm-inline-input" type="number" id="atk-db" value="0" inputmode="numeric">
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Armor Type' : 'Type armure'} (1-20)</label>
                <input class="rm-field rm-inline-input" type="number" id="atk-at" value="1" min="1" max="20" inputmode="numeric">
              </div>
            </div>
            <button class="rm-action-btn" type="button" id="btn-resolve-attack">
              <img src="assets/ui/icons/session_attack_crossed_swords.webp" alt="" style="width:1.1rem;height:1.1rem;object-fit:contain" onerror="this.style.display='none'">
              ${lang === 'en' ? 'Roll & Resolve' : 'Lancer & Résoudre'}
            </button>
            <div id="attack-result" style="margin-top:0.75rem"></div>
          </article>
        </section>
        <!-- RR -->
        <section class="rm-tool-pane" data-pane="rr">
          <article class="rm-tool-card">
            <h4>${lang === 'en' ? 'Resistance Roll' : 'Jet de résistance'}</h4>
            <div class="rm-tool-inline" style="margin-bottom:0.65rem">
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Realm' : 'Domaine'}</label>
                <select class="rm-field" id="rr-realm">
                  <option value="essence">${lang === 'en' ? 'Essence' : 'Essence'}</option>
                  <option value="channeling">${lang === 'en' ? 'Channeling' : 'Canalisation'}</option>
                  <option value="mentalism">${lang === 'en' ? 'Mentalism' : 'Mentalisme'}</option>
                  <option value="poison">${lang === 'en' ? 'Poison' : 'Poison'}</option>
                  <option value="disease">${lang === 'en' ? 'Disease' : 'Maladie'}</option>
                  <option value="fear">${lang === 'en' ? 'Fear' : 'Peur'}</option>
                </select>
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Stat bonus' : 'Bonus stat'}</label>
                <input class="rm-field rm-inline-input" type="number" id="rr-statbonus" value="0" inputmode="numeric">
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Def. level' : 'Niv. déf.'}</label>
                <input class="rm-field rm-inline-input" type="number" id="rr-deflevel" value="1" min="1" inputmode="numeric">
              </div>
              <div class="rm-field-group">
                <label class="rm-field-label">${lang === 'en' ? 'Att. level' : 'Niv. att.'}</label>
                <input class="rm-field rm-inline-input" type="number" id="rr-attlevel" value="1" min="1" inputmode="numeric">
              </div>
            </div>
            <button class="rm-action-btn" type="button" id="btn-resolve-rr">
              <img src="assets/ui/icons/session_rr_shield_rune.webp" alt="" style="width:1.1rem;height:1.1rem;object-fit:contain" onerror="this.style.display='none'">
              ${lang === 'en' ? 'Resolve RR' : 'Résoudre RR'}
            </button>
            <div id="rr-result" style="margin-top:0.75rem"></div>
          </article>
        </section>
        <!-- History -->
        <section class="rm-tool-pane" data-pane="history">
          <div class="rm-history-stack" id="session-result-history">
            <p style="color:#6b5030;font-size:0.85rem;text-align:center;padding:1rem">${lang === 'en' ? 'No rolls yet.' : 'Aucun jet pour l\'instant.'}</p>
          </div>
        </section>
      </div>
    </aside>`;
  document.body.appendChild(shell);

  // Populate attack weapon list after data loads
  try {
    const weapons = getAvailableWeapons();
    const sel = shell.querySelector('#atk-weapon');
    weapons.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = lang === 'en' ? (w.name_en || w.id) : (w.name_fr || w.name_en || w.id);
      sel.appendChild(opt);
    });
  } catch (_) { /* combat data not available */ }

  // Open / close
  function openToolbox() {
    shell.removeAttribute('hidden');
    requestAnimationFrame(() => shell.classList.add('is-open'));
  }
  function closeToolbox() {
    shell.classList.remove('is-open');
    setTimeout(() => shell.setAttribute('hidden', ''), 280);
  }
  fab.addEventListener('click', openToolbox);
  shell.querySelector('.rm-session-backdrop').addEventListener('click', closeToolbox);
  shell.querySelector('#session-close').addEventListener('click', closeToolbox);

  // Tab switching
  shell.querySelectorAll('.rm-tabbed-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      shell.querySelectorAll('.rm-tabbed-chip').forEach(c => c.classList.remove('is-active'));
      shell.querySelectorAll('.rm-tool-pane').forEach(p => p.classList.remove('is-active'));
      chip.classList.add('is-active');
      shell.querySelector(`.rm-tool-pane[data-pane="${chip.dataset.tool}"]`)?.classList.add('is-active');
    });
  });

  // Add result card to history
  function addToHistory(card) {
    resultHistory.unshift(card);
    renderHistory();
  }
  function renderHistory() {
    const stack = shell.querySelector('#session-result-history');
    if (resultHistory.length === 0) {
      stack.innerHTML = `<p style="color:#6b5030;font-size:0.85rem;text-align:center;padding:1rem">${lang === 'en' ? 'No rolls yet.' : 'Aucun jet pour l\'instant.'}</p>`;
      return;
    }
    stack.innerHTML = resultHistory.slice(0, 20).map(h => h.html).join('');
  }

  function makeResultCard({ stateClass, iconSrc, title, meta, cells, details, stateLabel }) {
    const icon = iconSrc ? `<img class="rm-result-icon" src="${iconSrc}" alt="" onerror="this.style.display='none'">` : '';
    const cellsHtml = cells.map(c => `<div class="rm-result-cell"><span class="rm-result-key">${c.key}</span><span class="rm-result-val">${c.val}</span></div>`).join('');
    return `<article class="rm-result-card ${stateClass}">
      <div class="rm-result-head">
        <div class="rm-result-type">${icon}<div><h3 class="rm-result-title">${title}</h3>${meta ? `<p class="rm-result-meta">${meta}</p>` : ''}</div></div>
        ${stateLabel ? `<span class="rm-result-state ${stateClass}">${stateLabel}</span>` : ''}
      </div>
      ${cells.length ? `<div class="rm-result-grid">${cellsHtml}</div>` : ''}
      ${details ? `<div class="rm-result-details" style="color:#5c4528;font-size:0.85rem;margin-top:0.5rem">${details}</div>` : ''}
    </article>`;
  }

  // Quick D100
  const rollOutput = shell.querySelector('#quick-roll-output');
  shell.querySelector('#btn-quick-d100').addEventListener('click', () => {
    rollOutput.classList.remove('is-rolling');
    void rollOutput.offsetWidth; // reflow to restart animation
    rollOutput.classList.add('is-rolling');
    const result = rollOpenEndedD100();
    setTimeout(() => { rollOutput.textContent = result; }, 100);
    const stateClass = result >= 90 ? 'is-success' : result >= 50 ? 'is-partial' : result <= 5 ? 'is-failure' : '';
    const stateLabel = result >= 90 ? (lang === 'en' ? 'High' : 'Élevé') : result <= 5 ? (lang === 'en' ? 'Low' : 'Bas') : '';
    const html = makeResultCard({
      stateClass, iconSrc: 'assets/ui/icons/session_quick_d100.webp',
      title: 'Open-ended D100', meta: new Date().toLocaleTimeString(),
      cells: [{ key: lang === 'en' ? 'Result' : 'Résultat', val: result }],
      details: '', stateLabel,
    });
    addToHistory({ html });
  });

  shell.querySelector('#btn-clear-history').addEventListener('click', () => {
    resultHistory.length = 0; renderHistory();
  });

  // Maneuver
  shell.querySelector('#btn-resolve-maneuver').addEventListener('click', () => {
    const difficulty = shell.querySelector('#man-difficulty').value;
    const bonus = parseInt(shell.querySelector('#man-bonus').value) || 0;
    const res = resolveStaticManeuver({ difficulty, bonus });
    const stateClass = res.result === 'success' ? 'is-success' : res.result === 'partial' ? 'is-partial' : 'is-failure';
    const stateLabel = res.result === 'success' ? (lang === 'en' ? 'Success' : 'Succès') : res.result === 'partial' ? (lang === 'en' ? 'Partial' : 'Partiel') : (lang === 'en' ? 'Failure' : 'Échec');
    const html = makeResultCard({
      stateClass, iconSrc: 'assets/ui/icons/session_maneuver_scroll.webp',
      title: lang === 'en' ? 'Maneuver' : 'Manœuvre',
      meta: `${res.difficultyLabel?.[lang] || difficulty}`,
      cells: [
        { key: 'Roll', val: res.roll },
        { key: 'Bonus', val: `+${bonus}` },
        { key: 'Total', val: res.total },
      ],
      details: res.description, stateLabel,
    });
    shell.querySelector('#maneuver-result').innerHTML = html;
    addToHistory({ html });
  });

  // Attack
  shell.querySelector('#btn-resolve-attack').addEventListener('click', () => {
    const weaponTable = shell.querySelector('#atk-weapon').value;
    if (!weaponTable) { showToast(lang === 'en' ? 'Select a weapon first' : 'Choisissez une arme', true); return; }
    const ob = parseInt(shell.querySelector('#atk-ob').value) || 0;
    const db = parseInt(shell.querySelector('#atk-db').value) || 0;
    const armorType = parseInt(shell.querySelector('#atk-at').value) || 1;
    try {
      const res = resolveFullAttack({ weaponTable, ob, db, armorType });
      const isFumble = res.fumble;
      const isCrit = !isFumble && res.critical;
      const stateClass = isFumble ? 'is-fumble is-failure' : isCrit ? 'is-critical is-success' : res.hits > 0 ? 'is-partial' : 'is-failure';
      const stateLabel = isFumble ? (lang === 'en' ? 'Fumble!' : 'Fumble!') : isCrit ? (lang === 'en' ? 'Critical!' : 'Critique!') : res.hits > 0 ? `${res.hits} hits` : (lang === 'en' ? 'Miss' : 'Raté');
      const details = [
        isFumble ? (lang === 'en' ? '⚠ Fumble!' : '⚠ Fumble!') : '',
        res.critical ? `${lang === 'en' ? 'Critical' : 'Critique'}: ${res.critical}` : '',
        res.critResult?.text ? res.critResult.text : '',
      ].filter(Boolean).join(' — ');
      const html = makeResultCard({
        stateClass, iconSrc: 'assets/ui/icons/session_attack_crossed_swords.webp',
        title: lang === 'en' ? 'Attack' : 'Attaque', meta: `OB${ob >= 0 ? '+' : ''}${ob} vs DB${db >= 0 ? '+' : ''}${db} AT${armorType}`,
        cells: [
          { key: 'Roll', val: res.breakdown?.roll ?? '?' },
          { key: lang === 'en' ? 'Total' : 'Total', val: res.total ?? '?' },
          { key: 'Hits', val: res.hits ?? 0 },
        ],
        details, stateLabel,
      });
      shell.querySelector('#attack-result').innerHTML = html;
      addToHistory({ html });
    } catch (e) {
      shell.querySelector('#attack-result').textContent = 'Erreur: ' + e.message;
    }
  });

  // RR
  shell.querySelector('#btn-resolve-rr').addEventListener('click', () => {
    const realm = shell.querySelector('#rr-realm').value;
    const statBonus = parseInt(shell.querySelector('#rr-statbonus').value) || 0;
    const defenderLevel = parseInt(shell.querySelector('#rr-deflevel').value) || 1;
    const attackerLevel = parseInt(shell.querySelector('#rr-attlevel').value) || 1;
    const res = resolveResistanceRoll({ defenderLevel, attackerLevel, statBonus, realm });
    const stateClass = res.success ? 'is-success' : 'is-failure';
    const stateLabel = res.success ? (lang === 'en' ? 'Resisted' : 'Résisté') : (lang === 'en' ? 'Failed' : 'Échec');
    const html = makeResultCard({
      stateClass, iconSrc: 'assets/ui/icons/session_rr_shield_rune.webp',
      title: `RR — ${realm}`,
      meta: `${lang === 'en' ? 'Def' : 'Déf'} ${defenderLevel} vs ${lang === 'en' ? 'Att' : 'Att'} ${attackerLevel}`,
      cells: [
        { key: 'Roll', val: res.roll },
        { key: 'Total', val: res.total },
        { key: lang === 'en' ? 'Margin' : 'Marge', val: (res.margin >= 0 ? '+' : '') + res.margin },
      ],
      details: res.description, stateLabel,
    });
    shell.querySelector('#rr-result').innerHTML = html;
    addToHistory({ html });
  });
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
    initSessionToolbox();
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

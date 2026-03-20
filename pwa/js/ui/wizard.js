// Tabbed character editor — all tabs accessible simultaneously
// Profession chosen first, then stats (temp/pot pairs), then everything else

import { panel, showToast } from './components.js';
import { createCharacter, getTotalStatBonus, getStatDev, calcHitPoints, calcPowerPoints, applyRace, DEV_PHASES, getTotalRanks, getCurrentPhaseRanks, getCurrentPhaseRanksObj, getDevPointsSpent, setDevPointsSpent, getDevPointsTotal, getSpellPointsSpent, setSpellPointsSpent, getSpellPointsTotal } from '../engine/character.js';
import { generateStatRolls, getStatValues, statPotentialLookup, rollStatPairsRMSS, getStatBonus, getRankBonus, STAT_COUNT } from '../engine/stats.js';
import { getAllClasses, getClassName, getRealmInfo, getRealmKey, getRealmLabel, isSpellUser, getClassPrimeStats, getPPStatIndices } from '../engine/classes.js';
import { getAllCategories, getSkillName, getSkillDevCost, getSkillStatIndices, getWeaponCategoryCosts } from '../engine/skills.js';
import { getAllRealms } from '../engine/spells.js';
import { downloadCharacter, saveToLocalStorage } from '../engine/export.js';
import { processLevelUpStatGains } from '../engine/stat_gain.js';
import { getData } from '../engine/data-loader.js';

// --- Category translations ---
const CAT_NAMES_FR = {
  'Academic': 'Savoir',
  'Animal': 'Animaux',
  'Athletic': 'Athlétique',
  'Combat': 'Combat',
  'Deadly': 'Contrôle de Soi',
  'Evaluation': 'Attaques Spéciales',
  'General': 'Évaluation',
  'Gymnastic': 'Artisanat',
  'Linguistic': 'Gymnastique',
  'Magical': 'Communication',
  'Medical': 'Magie',
  'Perception': 'Médecine',
  'Social': 'Perception',
  'Subterfuge': 'Influence',
  'Survival': 'Subterfuge',
  'Category_15': 'Survie/Extérieur',
};

const TABS = [
  { id: 'infos', label_fr: 'Infos', label_en: 'Info' },
  { id: 'stats', label_fr: 'Caractéristiques', label_en: 'Stats' },
  { id: 'race', label_fr: 'Race', label_en: 'Race' },
  { id: 'weapons', label_fr: 'Armes', label_en: 'Weapons' },
  { id: 'languages', label_fr: 'Langages', label_en: 'Languages' },
  { id: 'spells', label_fr: 'Listes de Sorts', label_en: 'Spell Lists' },
  { id: 'history', label_fr: 'Historique', label_en: 'History' },
  { id: 'skills', label_fr: 'Compétences', label_en: 'Skills' },
];

// 6 fixed weapon categories (from CPR093 CHOIXCAT screen)
const WEAPON_CATEGORIES = [
  { id: 'edged_1h',   fr: 'Tranchantes à une main',   en: 'Edged Weapons',      stats: 'FO/FO/AG' },
  { id: 'blunt_1h',   fr: 'Contondantes à une main',  en: 'Crushing Weapons',   stats: 'FO/FO/AG' },
  { id: 'two_handed', fr: 'Armes à deux mains',       en: 'Two-Handed Weapons', stats: 'FO/FO/AG' },
  { id: 'polearm',    fr: 'Armes d\'Hast',            en: 'Pole Arms',          stats: 'FO/FO/AG' },
  { id: 'ranged',     fr: 'Arcs et Arbalètes',        en: 'Missile & Bows',     stats: 'AG/AG/FO' },
  { id: 'thrown',     fr: 'Armes de jet',              en: 'Thrown Weapons',     stats: 'FO/AG' },
];

const STAT_NAMES_FR = ['Constitution', 'Agilité', 'Auto-discipline', 'Mémoire', 'Raisonnement', 'Force', 'Rapidité', 'Présence', 'Empathie', 'Intuition'];
const STAT_NAMES_EN = ['Constitution', 'Agility', 'Self Discipline', 'Memory', 'Reasoning', 'Strength', 'Quickness', 'Presence', 'Empathy', 'Intuition'];
const STAT_ABBREVS = ['Co', 'Ag', 'AD', 'Mé', 'Ra', 'Fo', 'Rp', 'Pr', 'Em', 'In'];

let character = null;
let currentTab = 'infos';

// Rolling state
let rolledStats = [];   // RM2: [{tempRoll, potRoll, temp, pot}], RMSS: [{temp, pot}]
let rollAssignments = new Array(10).fill(-1);
let selectedRoll = -1;
let editMode = false;
let rollingMethod = 'rm2'; // 'rm2' or 'rmss' — persists per character via statLog
let statsValidated = false; // True once "Valider" is clicked

export function startWizard(app, forceNew = true) {
  if (forceNew || !character) {
    character = createCharacter();
    rolledStats = [];
    rollAssignments = new Array(10).fill(-1);
    selectedRoll = -1;
    editMode = false;
    rollingMethod = 'rm2';
    statsValidated = false;
  }
  renderEditor(app);
}

export function loadIntoWizard(app, loadedCharacter) {
  character = loadedCharacter;
  // Ensure statLog exists (for characters saved before this feature)
  if (!character.statLog) {
    character.statLog = { method: 'rm2', rerollCount: 0, rolls: [], validated: null, editsAfterValidation: [] };
  }
  rollingMethod = character.statLog.method || 'rm2';
  statsValidated = !!character.statLog.validated;

  // Restore rolling state from saved rawRolls if available
  if (character.rawRolls && character.rawRolls.length === STAT_COUNT && rollingMethod === 'rm2') {
    rolledStats = character.rawRolls.map(r => {
      const temp = r.tempRoll;
      const pot = statPotentialLookup(r.potRoll, temp);
      return { tempRoll: r.tempRoll, potRoll: r.potRoll, temp, pot };
    });
  } else {
    rolledStats = [];
  }
  // If validated, reconstruct assignments in order
  rollAssignments = new Array(STAT_COUNT).fill(-1);
  if (character.stats.some(s => s > 0) && rolledStats.length === STAT_COUNT) {
    for (let r = 0; r < STAT_COUNT; r++) rollAssignments[r] = r;
  }
  selectedRoll = -1;
  editMode = false;
  currentTab = 'infos';
  renderEditor(app);
}

export function getCharacter() {
  return character;
}

// --- Helpers ---
function getRaces() {
  const monde = getData().monde;
  return monde ? monde.races : [];
}

function getRaceByIndex(index) {
  const races = getRaces();
  return index >= 0 && index < races.length ? races[index] : null;
}

// --- Main render ---
function renderEditor(app) {
  const main = document.getElementById('app-main');
  const lang = app.lang;

  // Preserve scroll position of skill list across re-renders
  const scrollEl = main.querySelector('.scroll-container');
  const savedScroll = scrollEl ? scrollEl.scrollTop : 0;

  let tabBar = `<div class="tab-bar">`;
  for (const tab of TABS) {
    const label = lang === 'en' ? tab.label_en : tab.label_fr;
    const active = tab.id === currentTab ? 'active' : '';
    tabBar += `<button class="tab-btn ${active}" data-tab="${tab.id}">${label}</button>`;
  }
  tabBar += `</div>`;

  const actions = `
    <div class="flex gap-2 mb-3 no-print flex-wrap">
      <button class="btn-primary text-sm" id="btn-save-json">Télécharger JSON</button>
      <button class="btn-secondary text-sm" id="btn-save-local">Sauvegarde locale</button>
      <button class="btn-secondary text-sm" id="btn-print">Imprimer</button>
    </div>
  `;

  const content = renderTab(app);
  main.innerHTML = actions + tabBar + `<div id="tab-content">${content}</div>`;
  bindTabEvents(app);
  bindActionEvents();
  bindContentEvents(app);

  // Restore scroll position
  if (savedScroll > 0) {
    const newScrollEl = main.querySelector('.scroll-container');
    if (newScrollEl) newScrollEl.scrollTop = savedScroll;
  }
}

function renderTab(app) {
  switch (currentTab) {
    case 'infos': return renderInfosTab(app.lang);
    case 'stats': return renderStatsTab(app.lang);
    case 'race': return renderRaceTab(app.lang);
    case 'weapons': return renderWeaponsTab(app.lang);
    case 'languages': return renderLanguagesTab(app.lang);
    case 'spells': return renderSpellsTab(app.lang);
    case 'history': return renderHistoryTab(app.lang);
    case 'skills': return renderSkillsTab(app.lang);
    default: return '';
  }
}

// === Tab: Infos ===
function renderInfosTab(lang) {
  const hp = calcHitPoints(character);
  const pp = calcPowerPoints(character);

  // Profession selector
  const classes = getAllClasses();
  let classOptions = `<option value="-1">— Choisir profession —</option>`;
  for (const c of classes) {
    const name = getClassName(c, lang);
    const realmInfo = getRealmInfo(c);
    const realmTag = realmInfo.key !== 'none' ? ` [${lang === 'en' ? realmInfo.label_en : realmInfo.label_fr}]` : '';
    const sel = c.index === character.classIndex ? 'selected' : '';
    classOptions += `<option value="${c.index}" ${sel}>${name}${realmTag}</option>`;
  }

  // Race selector from monde.json
  const races = getRaces();
  let raceOptions = `<option value="-1">— Choisir race —</option>`;
  for (let i = 0; i < races.length; i++) {
    const sel = i === character.raceIndex ? 'selected' : '';
    raceOptions += `<option value="${i}" ${sel}>${races[i].name}</option>`;
  }

  // Realm display
  const cls = character.classIndex >= 0 ? getAllClasses()[character.classIndex] : null;
  const realmLabel = cls ? getRealmLabel(cls, lang) : '—';

  // Prime stats display
  const primeDisplay = character.primeStats.length > 0
    ? character.primeStats.map(i => STAT_ABBREVS[i]).join(', ')
    : '—';

  // Armor labels
  const armorLabels = lang === 'en'
    ? ['No Armor', 'Soft Leather', 'Rigid Leather', 'Chain', 'Plate']
    : ['Sans armure', 'Cuir souple', 'Cuir rigide', 'Cotte de mailles', 'Plates'];

  return `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      ${panel(lang === 'en' ? 'Profession (choose first!)' : 'Profession (à choisir en premier !)', `
        <div class="info-grid">
          <label>Profession</label>
          <select id="f-class" class="field">${classOptions}</select>

          <label>Niveau</label>
          <input type="number" id="f-level" value="${character.level}" min="1" max="50" class="field field-sm">

          <label>Pts d'Exp</label>
          <input type="text" id="f-xp" value="${esc(character.xp)}" class="field field-sm">

          <label>Royaume</label>
          <span class="text-purple-400 font-bold self-center">${realmLabel}</span>

          <label>Carac. primordiales</label>
          <span class="text-amber-400 font-bold self-center">${primeDisplay}</span>
        </div>

        <div class="mt-4 flex gap-6 text-center">
          <div>
            <div class="text-2xl font-bold text-red-400">${hp}</div>
            <div class="text-xs text-gray-500">PdeC Base</div>
          </div>
          ${character.realm !== 'none' ? `
          <div>
            <div class="text-2xl font-bold text-blue-400">${pp}</div>
            <div class="text-xs text-gray-500">Pts de Pouvoir</div>
          </div>` : ''}
        </div>

        <div class="mt-4 no-print border-t border-gray-700 pt-3">
          <button class="btn-primary text-sm" id="btn-level-up">${lang === 'en' ? 'Level Up' : 'Monter de niveau'}</button>
          <span class="text-xs text-gray-500 ml-2">${getPhaseLabel(character, lang)}</span>
          ${character._lastStatGains ? renderStatGainsResult(lang) : ''}
        </div>
      `)}

      ${panel(lang === 'en' ? 'Identity' : 'Identité', `
        <div class="info-grid">
          <label>Nom</label>
          <input type="text" id="f-name" value="${esc(character.name)}" class="field" placeholder="Nom du personnage">

          <label>Race</label>
          <select id="f-race" class="field">${raceOptions}</select>

          <label>Taille</label>
          <input type="text" id="f-height" value="${esc(character.height)}" class="field field-sm" placeholder="1.80m">

          <label>Poids</label>
          <input type="text" id="f-weight" value="${esc(character.weight)}" class="field field-sm" placeholder="75kg">

          <label>Cheveux</label>
          <input type="text" id="f-hair" value="${esc(character.hair)}" class="field field-sm">

          <label>Yeux</label>
          <input type="text" id="f-eyes" value="${esc(character.eyes)}" class="field field-sm">

          <label>Âge</label>
          <input type="text" id="f-age" value="${esc(character.age)}" class="field field-sm">

          <label>Sexe</label>
          <input type="text" id="f-sex" value="${esc(character.sex)}" class="field field-sm">

          <label>Apparence</label>
          <input type="text" id="f-appearance" value="${esc(character.appearance)}" class="field">

          <label>Comportement</label>
          <input type="text" id="f-behavior" value="${esc(character.behavior)}" class="field">
        </div>
      `)}

      ${panel(lang === 'en' ? 'Armor' : 'Armure', `
        <div class="info-grid">
          <label>Type d'Armure</label>
          <select id="f-armor" class="field">
            ${armorLabels.map((l, i) => `<option value="${i}" ${i === character.armorType ? 'selected' : ''}>${i}: ${l}</option>`).join('')}
          </select>

          <label>Bonus Déf.</label>
          <input type="number" id="f-defbonus" value="${character.defenseBonus}" class="field field-sm">
        </div>
      `)}
    </div>
  `;
}

// === Tab: Stats ===
function renderStatsTab(lang) {
  const statNames = lang === 'en' ? STAT_NAMES_EN : STAT_NAMES_FR;
  const hasRolls = rolledStats.length === STAT_COUNT;
  const allAssigned = hasRolls && rollAssignments.every(a => a >= 0);
  const log = character.statLog;
  const canChangeMethod = !hasRolls && !statsValidated;

  // Method selector (locked once rolls are generated or stats validated)
  let methodHtml = `
    <div class="flex items-center gap-3 mb-3 no-print">
      <span class="text-gray-500 text-sm">${lang === 'en' ? 'Method:' : 'Méthode :'}</span>
      <label class="text-sm cursor-pointer ${canChangeMethod ? '' : 'opacity-50'}">
        <input type="radio" name="roll-method" value="rm2" ${rollingMethod === 'rm2' ? 'checked' : ''} ${canChangeMethod ? '' : 'disabled'}> RM2 (Table 15.1.1)
      </label>
      <label class="text-sm cursor-pointer ${canChangeMethod ? '' : 'opacity-50'}">
        <input type="radio" name="roll-method" value="rmss" ${rollingMethod === 'rmss' ? 'checked' : ''} ${canChangeMethod ? '' : 'disabled'}> RMSS (Option 14)
      </label>
      ${!canChangeMethod && !statsValidated ? `<span class="text-xs text-gray-600">(${lang === 'en' ? 'reset to change' : 'réinitialiser pour changer'})</span>` : ''}
      ${statsValidated ? `<span class="text-xs text-green-500 font-bold">${lang === 'en' ? 'VALIDATED' : 'VALIDÉ'}</span>` : ''}
    </div>
  `;

  // Rolling section — buttons
  let rollHtml = `<div class="mb-4 no-print flex flex-wrap gap-2">`;
  if (!statsValidated) {
    rollHtml += `<button class="btn-primary" id="btn-roll-stats">${hasRolls ? 'Retirer' : (lang === 'en' ? 'Roll stats' : 'Tirer les caractéristiques')}</button>`;
    if (hasRolls && !allAssigned) rollHtml += `<button class="btn-secondary" id="btn-auto-assign">${lang === 'en' ? 'Auto-assign' : 'Assigner auto'}</button>`;
    if (hasRolls && rollAssignments.some(a => a >= 0)) rollHtml += `<button class="btn-secondary" id="btn-clear-assign">${lang === 'en' ? 'Reset' : 'Réinitialiser'}</button>`;
    if (allAssigned) rollHtml += `<button class="btn-primary" id="btn-validate-stats" style="background:#16a34a">${lang === 'en' ? 'Validate stats' : 'Valider les stats'}</button>`;
  }
  rollHtml += `<button class="btn-secondary ${editMode ? 'active' : ''}" id="btn-edit-mode">${lang === 'en' ? 'Edit' : 'Editer'}</button>`;
  rollHtml += `</div>`;

  // Rolled results display
  if (hasRolls && !editMode && !statsValidated) {
    const assignedCount = rollAssignments.filter(a => a >= 0).length;
    rollHtml += `<p class="text-xs text-green-400 mb-2">${lang === 'en' ? 'Select a result, and choose a stat.' : 'Sélectionnez un résultat, puis choisissez une caractéristique.'} (${assignedCount}/${STAT_COUNT})</p>`;
    rollHtml += `<div class="flex flex-wrap gap-2 mb-4" id="roll-pool">`;
    for (let r = 0; r < rolledStats.length; r++) {
      const roll = rolledStats[r];
      const assigned = rollAssignments[r] >= 0;
      const isSelected = selectedRoll === r;
      const assignedTo = assigned ? STAT_ABBREVS[rollAssignments[r]] : '';

      let chipClass = 'pair-chip';
      if (assigned) chipClass += ' assigned';
      if (isSelected) chipClass += ' selected';

      // RM2: show temp(pot), RMSS: show temp/pot
      const sep1 = rollingMethod === 'rm2' ? '(' : '/';
      const sep2 = rollingMethod === 'rm2' ? ')' : '';

      rollHtml += `
        <button class="${chipClass}" data-roll="${r}" ${assigned ? 'title="→ ' + assignedTo + '"' : ''}>
          <span class="pair-temp">${roll.temp}</span>
          <span class="pair-sep">${sep1}</span>
          <span class="pair-pot">${roll.pot}</span>
          ${sep2 ? `<span class="pair-sep">${sep2}</span>` : ''}
          ${assigned ? `<span class="pair-assigned-label">${assignedTo}</span>` : ''}
        </button>
      `;
    }
    rollHtml += `</div>`;
  }

  // Stats table
  const canClickRows = hasRolls && selectedRoll >= 0 && !editMode && !statsValidated;

  let table = `
    <div class="overflow-x-auto">
    <table class="skill-table ${canClickRows ? 'stat-assign-mode' : ''}">
      <thead>
        <tr>
          <th></th>
          <th>CARAC</th>
          <th class="text-center">Temp</th>
          <th class="text-center">Pot</th>
          <th class="text-center">Dév</th>
          <th class="text-center">Norm</th>
          <th class="text-center">Race</th>
          <th class="text-center">Spéc</th>
          <th class="text-center font-bold">Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let i = 0; i < STAT_COUNT; i++) {
    const temp = character.stats[i];
    const pot = character.potentials[i] || temp;
    const dev = getStatDev(character, i);
    const devStr = dev !== null ? dev.toFixed(1) : '—';
    const norm = temp > 0 ? getStatBonus(temp) : 0;
    const race = character.raceBonuses[i] || 0;
    const spec = character.specialBonuses[i] || 0;
    const total = norm + race + spec;
    const isPrime = character.primeStats.includes(i);

    const normClass = norm > 0 ? 'positive' : norm < 0 ? 'negative' : 'zero';
    const totalClass = total > 0 ? 'positive' : total < 0 ? 'negative' : 'zero';

    const assignedRollIdx = rollAssignments.indexOf(i);
    const hasAssignment = assignedRollIdx >= 0;
    const rowClickable = canClickRows && !hasAssignment;

    // In edit mode, show editable inputs; otherwise show readonly values
    const tempCell = editMode
      ? `<input type="number" class="field-inline stat-input" data-stat="${i}" data-field="temp" value="${temp || ''}" min="1" max="102">`
      : `<span class="${temp > 0 ? '' : 'text-gray-600'}">${temp || '—'}</span>`;
    const potCell = editMode
      ? `<input type="number" class="field-inline stat-input" data-stat="${i}" data-field="pot" value="${pot || ''}" min="1" max="102">`
      : `<span class="${pot > 0 ? '' : 'text-gray-600'}">${pot || '—'}</span>`;

    table += `
      <tr class="stat-row ${rowClickable ? 'stat-row-clickable' : ''} ${hasAssignment ? 'stat-row-assigned' : ''}" data-stat-idx="${i}">
        <td class="text-center font-bold ${isPrime ? 'text-amber-400' : 'text-gray-500'}">${STAT_ABBREVS[i]}${isPrime ? ' ★' : ''}</td>
        <td class="${isPrime ? 'text-amber-300 font-bold' : 'text-gray-300'}">${statNames[i]}</td>
        <td class="text-center">${tempCell}</td>
        <td class="text-center">${potCell}</td>
        <td class="text-center text-gray-500">${devStr}</td>
        <td class="text-center stat-bonus ${normClass}">${norm >= 0 ? '+' + norm : norm}</td>
        <td class="text-center stat-bonus ${race > 0 ? 'positive' : race < 0 ? 'negative' : 'zero'}">${race !== 0 ? (race >= 0 ? '+' + race : race) : '0'}</td>
        <td class="text-center"><input type="number" class="field-inline stat-input" data-stat="${i}" data-field="spec" value="${spec}" style="width:3.5rem"></td>
        <td class="text-center font-bold stat-bonus ${totalClass}">${total >= 0 ? '+' + total : total}</td>
      </tr>
    `;
  }
  table += `</tbody></table></div>`;

  // Audit log display (collapsible)
  let logHtml = '';
  if (log.rolls.length > 0 || log.validated || log.editsAfterValidation.length > 0) {
    logHtml = renderStatLog(lang);
  }

  return panel(
    lang === 'en' ? 'Characteristics — Temp / Pot / Bonuses' : 'Caractéristiques — Temp / Pot / Bonus',
    methodHtml + rollHtml + table + logHtml
  );
}

/**
 * Render the audit log as a collapsible section.
 */
function renderStatLog(lang) {
  const log = character.statLog;
  const methodLabel = log.method === 'rm2' ? 'RM2 (Table 15.1.1)' : 'RMSS (Option 14)';
  const rerolls = log.rerollCount;
  const edits = log.editsAfterValidation.length;

  let html = `<details class="mt-4 stat-log"><summary class="text-xs text-gray-500 cursor-pointer hover:text-amber-300">`;
  html += lang === 'en'
    ? `Audit log — ${methodLabel}, ${rerolls} reroll${rerolls !== 1 ? 's' : ''}${log.validated ? ', validated' : ''}${edits > 0 ? `, ${edits} edit${edits !== 1 ? 's' : ''} after validation` : ''}`
    : `Journal d'audit — ${methodLabel}, ${rerolls} relance${rerolls !== 1 ? 's' : ''}${log.validated ? ', validé' : ''}${edits > 0 ? `, ${edits} modif${edits !== 1 ? 's' : ''} après validation` : ''}`;
  html += `</summary><div class="mt-2 text-xs text-gray-500 space-y-2 max-h-60 overflow-y-auto">`;

  // Roll history
  for (const entry of log.rolls) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const label = entry.action === 'roll' ? (lang === 'en' ? 'Initial roll' : 'Tirage initial') : (lang === 'en' ? 'Reroll' : 'Relance');
    html += `<div><span class="text-gray-600">[${time}]</span> <span class="text-amber-400">${label}</span>`;
    if (entry.rollData) {
      html += `<div class="ml-4 font-mono">`;
      if (log.method === 'rm2') {
        html += entry.rollData.map((r, i) => `${i + 1}: d100=${r.tempRoll},${r.potRoll} → ${r.temp}(${r.pot})`).join(' | ');
      } else {
        html += entry.rollData.map((r, i) => `${i + 1}: ${r.temp}/${r.pot}`).join(' | ');
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Validation snapshot
  if (log.validated) {
    const time = new Date(log.validated.timestamp).toLocaleTimeString();
    html += `<div class="border-t border-gray-700 pt-2"><span class="text-gray-600">[${time}]</span> <span class="text-green-400 font-bold">${lang === 'en' ? 'VALIDATED' : 'VALIDÉ'}</span>`;
    html += `<div class="ml-4 font-mono">`;
    for (let i = 0; i < STAT_COUNT; i++) {
      const s = log.validated.stats[i];
      const p = log.validated.potentials[i];
      html += `${STAT_ABBREVS[i]}=${s}(${p}) `;
    }
    html += `</div></div>`;
  }

  // Post-validation edits
  if (log.editsAfterValidation.length > 0) {
    html += `<div class="border-t border-gray-700 pt-2 text-red-400">`;
    html += lang === 'en' ? 'Manual edits after validation:' : 'Modifications manuelles après validation :';
    for (const edit of log.editsAfterValidation) {
      const time = new Date(edit.timestamp).toLocaleTimeString();
      html += `<div class="ml-4"><span class="text-gray-600">[${time}]</span> ${STAT_ABBREVS[edit.statIndex]}.${edit.field}: ${edit.oldVal} → ${edit.newVal}</div>`;
    }
    html += `</div>`;
  }

  html += `</div></details>`;
  return html;
}

// === Tab: Race ===
let selectedRaceGroup = 0; // Index into race_groups

function renderRaceTab(lang) {
  const monde = getData().monde;
  if (!monde || !monde.race_groups) {
    return panel(lang === 'en' ? 'Race' : 'Race', `<p class="text-gray-500">No race data available.</p>`);
  }

  const groups = monde.race_groups;
  const races = monde.races;
  const currentRaceIdx = character.raceIndex;

  // Group sub-tabs
  let groupTabs = `<div class="flex flex-wrap gap-1 mb-3">`;
  for (let g = 0; g < groups.length; g++) {
    const active = g === selectedRaceGroup ? 'active' : '';
    groupTabs += `<button class="phase-btn ${active}" data-race-group="${g}">${groups[g].name}</button>`;
  }
  groupTabs += `</div>`;

  // Race table for selected group
  const group = groups[selectedRaceGroup];
  const groupRaces = group.races.map(name => {
    const idx = races.findIndex(r => r.name === name);
    return idx >= 0 ? { ...races[idx], index: idx } : null;
  }).filter(Boolean);

  let table = `<div class="overflow-x-auto"><table class="skill-table"><thead><tr>
    <th>${lang === 'en' ? 'Race' : 'Race'}</th>`;
  for (const abbr of STAT_ABBREVS) table += `<th class="text-center w-8">${abbr}</th>`;
  table += `<th class="text-center">Dév</th><th class="text-center">XP</th>
  </tr></thead><tbody>`;

  for (const race of groupRaces) {
    const isCurrent = race.index === currentRaceIdx;
    const bonuses = race.stat_bonuses || [];
    table += `<tr class="race-row ${isCurrent ? 'stat-row-assigned' : 'stat-row-clickable'}" data-race-idx="${race.index}" style="cursor:pointer">
      <td class="${isCurrent ? 'text-amber-300 font-bold' : 'text-gray-300'}">${race.name}${isCurrent ? ' ★' : ''}</td>`;
    for (let s = 0; s < 10; s++) {
      const b = bonuses[s] || 0;
      const cls = b > 0 ? 'text-green-400' : b < 0 ? 'text-red-400' : 'text-gray-600';
      table += `<td class="text-center text-xs ${cls}">${b !== 0 ? (b > 0 ? '+' + b : b) : '·'}</td>`;
    }
    table += `<td class="text-center text-xs">${race.body_dev_bonus || '—'}</td>`;
    table += `<td class="text-center text-xs">${race.experience_factor || '—'}</td>`;
    table += `</tr>`;
  }
  table += `</tbody></table></div>`;

  // Current race summary
  let summary = '';
  if (currentRaceIdx >= 0) {
    const race = races[currentRaceIdx];
    summary = `<div class="mt-3 text-sm text-amber-300">${lang === 'en' ? 'Selected' : 'Sélectionné'}: <strong>${race.name}</strong>
      <button class="btn-secondary text-xs ml-2" id="btn-clear-race">${lang === 'en' ? 'Remove' : 'Retirer'}</button></div>`;
  }

  return panel(lang === 'en' ? 'Race Selection' : 'Choix de la Race', groupTabs + table + summary);
}

function bindRaceEvents(app) {
  // Group sub-tabs
  document.querySelectorAll('[data-race-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRaceGroup = parseInt(btn.dataset.raceGroup);
      renderEditor(app);
    });
  });

  // Race row click
  document.querySelectorAll('.race-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.raceIdx);
      character.raceIndex = idx;
      const race = getRaceByIndex(idx);
      applyRace(character, race);
      renderEditor(app);
    });
  });

  // Clear race
  const btnClear = document.getElementById('btn-clear-race');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      character.raceIndex = -1;
      applyRace(character, null);
      renderEditor(app);
    });
  }
}

// === Tab: Weapons (CHOIXCAT) ===
let selectedWeaponType = -1; // Index into WEAPON_CATEGORIES for click-to-assign

function renderWeaponsTab(lang) {
  if (character.classIndex < 0) {
    return panel(lang === 'en' ? 'Weapon Categories' : 'Catégories d\'armes', `
      <p class="text-gray-500">${lang === 'en' ? 'Choose a profession first (Info tab).' : 'Choisissez d\'abord une profession (onglet Infos).'}</p>
    `);
  }

  const wpnCosts = getWeaponCategoryCosts(character.classIndex);
  if (!wpnCosts) {
    return panel(lang === 'en' ? 'Weapon Categories' : 'Catégories d\'armes', `
      <p class="text-gray-500">${lang === 'en' ? 'No cost data for this class.' : 'Pas de données de coûts pour cette classe.'}</p>
    `);
  }

  const priorities = character.weaponPriorities;
  const allAssigned = priorities.every(p => p !== null);

  // Left: weapon types available
  let typesHtml = `<div class="mb-2 text-xs text-green-400">${lang === 'en' ? 'Click a weapon type, then click a priority slot to assign it.' : 'Cliquez sur un type d\'arme, puis sur un slot de priorité.'}</div>`;
  typesHtml += `<div class="flex flex-wrap gap-2 mb-4">`;
  for (let w = 0; w < WEAPON_CATEGORIES.length; w++) {
    const wc = WEAPON_CATEGORIES[w];
    const name = lang === 'en' ? wc.en : wc.fr;
    const assigned = priorities.includes(wc.id);
    const isSelected = selectedWeaponType === w;
    let cls = 'pair-chip';
    if (assigned) cls += ' assigned';
    if (isSelected) cls += ' selected';
    typesHtml += `<button class="${cls}" data-wpn-type="${w}" style="min-width:8rem" ${assigned ? 'title="Slot ' + (priorities.indexOf(wc.id) + 1) + '"' : ''}>
      <span class="text-sm">${name}</span>
      <span class="text-xs text-gray-500 ml-1">(${wc.stats})</span>
      ${assigned ? `<span class="pair-assigned-label">${priorities.indexOf(wc.id) + 1}</span>` : ''}
    </button>`;
  }
  typesHtml += `</div>`;

  // Right: priority slots with costs
  let slotsHtml = `<table class="skill-table"><thead><tr>
    <th class="text-center w-10">#</th>
    <th>${lang === 'en' ? 'Priority Slot' : 'Slot de priorité'}</th>
    <th class="text-center">${lang === 'en' ? 'Cost' : 'Coût'}</th>
    <th>${lang === 'en' ? 'Assigned Weapon' : 'Arme assignée'}</th>
  </tr></thead><tbody>`;

  for (let s = 0; s < 6; s++) {
    const cost = wpnCosts[s];
    const costStr = cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`;
    const assignedId = priorities[s];
    const assignedWpn = assignedId ? WEAPON_CATEGORIES.find(w => w.id === assignedId) : null;
    const assignedName = assignedWpn ? (lang === 'en' ? assignedWpn.en : assignedWpn.fr) : '';
    const canClick = selectedWeaponType >= 0 && !assignedId;
    const rowCls = canClick ? 'stat-row-clickable' : '';

    slotsHtml += `<tr class="wpn-slot ${rowCls} ${assignedId ? 'stat-row-assigned' : ''}" data-slot="${s}">
      <td class="text-center font-bold text-amber-400">${s + 1}</td>
      <td class="text-gray-400">${s === 0 ? (lang === 'en' ? 'Best' : 'Meilleur') : s === 5 ? (lang === 'en' ? 'Worst' : 'Pire') : ''}</td>
      <td class="text-center font-mono ${s < 2 ? 'text-green-400' : s >= 4 ? 'text-red-400' : ''}">${costStr}</td>
      <td class="${assignedId ? 'text-amber-300 font-bold' : 'text-gray-600'}">
        ${assignedName || (lang === 'en' ? '— empty —' : '— vide —')}
      </td>
    </tr>`;
  }

  slotsHtml += `</tbody></table>`;

  // Buttons
  let btns = `<div class="flex gap-2 mt-3 no-print">`;
  if (priorities.some(p => p !== null)) {
    btns += `<button class="btn-secondary" id="btn-wpn-clear">${lang === 'en' ? 'Reset' : 'Réinitialiser'}</button>`;
  }
  if (!allAssigned) {
    btns += `<button class="btn-secondary" id="btn-wpn-auto">${lang === 'en' ? 'Auto-assign' : 'Assigner auto'}</button>`;
  }
  btns += `</div>`;

  return panel(lang === 'en' ? 'Weapon Category Priorities' : 'Priorité des catégories d\'armes', typesHtml + slotsHtml + btns);
}

function bindWeaponsEvents(app) {
  // Weapon type chip click
  document.querySelectorAll('[data-wpn-type]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const w = parseInt(chip.dataset.wpnType);
      const wc = WEAPON_CATEGORIES[w];
      const assigned = character.weaponPriorities.includes(wc.id);

      if (assigned) {
        // Unassign: remove from slot
        const slot = character.weaponPriorities.indexOf(wc.id);
        character.weaponPriorities[slot] = null;
        selectedWeaponType = -1;
        renderEditor(app);
        return;
      }

      selectedWeaponType = selectedWeaponType === w ? -1 : w;
      renderEditor(app);
    });
  });

  // Priority slot click
  document.querySelectorAll('.wpn-slot').forEach(row => {
    row.addEventListener('click', () => {
      const slot = parseInt(row.dataset.slot);
      if (selectedWeaponType < 0) return;
      if (character.weaponPriorities[slot] !== null) return;

      const wc = WEAPON_CATEGORIES[selectedWeaponType];
      if (character.weaponPriorities.includes(wc.id)) return;

      character.weaponPriorities[slot] = wc.id;

      // Auto-advance to next unassigned weapon type
      const nextType = WEAPON_CATEGORIES.findIndex(w => !character.weaponPriorities.includes(w.id));
      selectedWeaponType = nextType >= 0 ? nextType : -1;

      renderEditor(app);
    });
  });

  // Clear
  const btnClear = document.getElementById('btn-wpn-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      character.weaponPriorities = [null, null, null, null, null, null];
      selectedWeaponType = -1;
      renderEditor(app);
    });
  }

  // Auto-assign (default order)
  const btnAuto = document.getElementById('btn-wpn-auto');
  if (btnAuto) {
    btnAuto.addEventListener('click', () => {
      const remaining = WEAPON_CATEGORIES.filter(w => !character.weaponPriorities.includes(w.id));
      for (let s = 0; s < 6; s++) {
        if (character.weaponPriorities[s] === null && remaining.length > 0) {
          character.weaponPriorities[s] = remaining.shift().id;
        }
      }
      selectedWeaponType = -1;
      renderEditor(app);
    });
  }
}

// === Tab: Languages ===
function renderLanguagesTab(lang) {
  let rows = '';
  character.languages.forEach((l, i) => {
    rows += `
      <tr>
        <td><input type="text" class="field-inline lang-input" data-lang="${i}" data-field="name" value="${esc(l.name)}" style="width:12rem" placeholder="Langue..."></td>
        <td class="text-center"><input type="number" class="field-inline lang-input" data-lang="${i}" data-field="spoken" value="${l.spoken}" min="0" max="10" style="width:3rem"></td>
        <td class="text-center"><input type="number" class="field-inline lang-input" data-lang="${i}" data-field="written" value="${l.written}" min="0" max="10" style="width:3rem"></td>
        <td><button class="text-red-400 hover:text-red-300 text-sm lang-remove" data-lang="${i}">✕</button></td>
      </tr>
    `;
  });

  return panel(lang === 'en' ? 'Languages' : 'Langages', `
    <table class="skill-table">
      <thead>
        <tr>
          <th>${lang === 'en' ? 'Language' : 'Langage'}</th>
          <th class="text-center">${lang === 'en' ? 'Spoken' : 'Parlé'}</th>
          <th class="text-center">${lang === 'en' ? 'Written' : 'Écrit'}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <button class="btn-secondary text-sm mt-3" id="btn-add-lang">+ ${lang === 'en' ? 'Add Language' : 'Ajouter un langage'}</button>
  `);
}

// === Tab: Spells ===
function renderSpellsTab(lang) {
  const cls = character.classIndex >= 0 ? getAllClasses()[character.classIndex] : null;
  const spellBudget = getSpellPointsTotal(character);
  const spellSpent = getSpellPointsSpent(character);
  const spellRemaining = spellBudget - spellSpent;

  if (cls && !isSpellUser(cls)) {
    return panel(lang === 'en' ? `Spell Lists (0 pts)` : `Listes de Sorts (0 pts)`, `
      <p class="text-gray-500">${lang === 'en' ? 'This character is not a spell user.' : 'Ce personnage n\'est pas un lanceur de sorts.'} (${getRealmLabel(cls, lang)})</p>
    `);
  }

  // Spell point counter
  let header = `<div class="flex justify-between items-center mb-3">
    <span class="text-gray-400 text-sm">${lang === 'en' ? 'Spell Points:' : 'Points de sorts :'} </span>
    <span>
      <span class="text-purple-300 font-bold text-lg">${spellRemaining}</span>
      <span class="text-gray-500"> / ${spellBudget}</span>
      ${spellRemaining < 0 ? '<span class="text-red-400 text-xs ml-2">!</span>' : ''}
    </span>
  </div>`;

  // Spell lists table with tier mechanism
  let rows = '';
  character.spellLists.forEach((sl, i) => {
    const palier = sl.palier || 0;
    const niveau = sl.niveau || 0;
    const cost = sl.cost || 4;
    const canInvest = spellRemaining >= cost;

    rows += `<tr>
      <td class="text-gray-300">${esc(sl.name)}</td>
      <td class="text-center text-xs text-gray-500">${cost}/*</td>
      <td class="text-center">
        <span class="skill-pm">
          <button class="pm-btn pm-minus spell-palier-minus" data-spell="${i}" ${palier <= 0 ? 'disabled' : ''}>−</button>
          <span class="text-purple-300 font-bold mx-1">${palier}</span>
          <button class="pm-btn pm-plus spell-palier-plus" data-spell="${i}" ${!canInvest ? 'disabled' : ''}>+</button>
        </span>
      </td>
      <td class="text-center ${niveau > 0 ? 'text-green-400 font-bold' : 'text-gray-600'}">${niveau > 0 ? niveau : '—'}</td>
      <td class="text-center text-xs text-gray-500">${esc(sl.reference || '')}</td>
      <td>
        ${palier > 0 && niveau === 0 ? `<button class="text-xs text-purple-400 hover:text-purple-300 spell-roll" data-spell="${i}">D100</button>` : ''}
        <button class="text-red-400 hover:text-red-300 text-xs spell-remove" data-spell="${i}">✕</button>
      </td>
    </tr>`;
  });

  let table = `<table class="skill-table"><thead><tr>
    <th>${lang === 'en' ? 'List' : 'Liste'}</th>
    <th class="text-center w-12">${lang === 'en' ? 'Cost' : 'Coût'}</th>
    <th class="text-center" style="min-width:5rem">${lang === 'en' ? 'Tier' : 'Palier'}</th>
    <th class="text-center w-12">${lang === 'en' ? 'Lvl' : 'Niv'}</th>
    <th class="text-center w-16">Réf</th>
    <th></th>
  </tr></thead><tbody>${rows}</tbody></table>`;

  // Available lists from data (collapsible by realm)
  const realms = getAllRealms();
  let availableHtml = `<div class="mt-4"><details><summary class="text-sm text-gray-400 cursor-pointer hover:text-amber-300">${lang === 'en' ? 'Available spell lists (click to add)' : 'Listes disponibles (cliquez pour ajouter)'}</summary>`;
  availableHtml += `<div class="mt-2 scroll-container" style="max-height:40vh">`;
  for (const realm of realms) {
    let realmLists = '';
    for (const group of realm.groups) {
      for (const spell of group) {
        const name = lang === 'en' ? spell.name_en : spell.name_fr;
        realmLists += `<button class="text-xs text-gray-400 hover:text-amber-300 block py-0.5 add-spell-list" data-spell-name="${esc(name)}" data-spell-realm="${esc(realm.name)}">${name}</button>`;
      }
    }
    if (realmLists) {
      availableHtml += `<div class="text-xs text-purple-400 font-bold mt-2">${realm.name}</div>${realmLists}`;
    }
  }
  availableHtml += `</div></details></div>`;

  return panel(
    lang === 'en' ? `Spell Lists (${spellBudget} pts)` : `Listes de Sorts (${spellBudget} pts)`,
    header + table + `<button class="btn-secondary text-sm mt-3" id="btn-add-spell">+ ${lang === 'en' ? 'Add List' : 'Ajouter une liste'}</button>` + availableHtml
  );
}

// === Tab: History ===
function renderHistoryTab(lang) {
  return `
    ${panel(lang === 'en' ? 'Equipment' : 'Équipement', `
      <textarea id="f-equipment" class="field w-full" rows="8" placeholder="- 1 épée longue (1.5kg)\n- 1 armure de cuir souple\n- ...">${esc(character.equipment)}</textarea>
    `)}
    ${panel(lang === 'en' ? 'Background & Notes' : 'Historique & Notes', `
      <textarea id="f-history" class="field w-full" rows="10" placeholder="Historique du personnage...">${esc(character.history)}</textarea>
    `)}
  `;
}

// === Tab: Skills ===
function renderSkillsTab(lang) {
  const categories = getAllCategories();
  const devPts = getDevPointsTotal(character);
  const spent = getDevPointsSpent(character);
  const remaining = devPts - spent;

  const phaseLabels = {
    adolescent: { fr: 'Adolescent', en: 'Adolescent' },
    apprenti: { fr: 'Apprenti', en: 'Apprentice' },
    level: { fr: `Niveau ${character.level}`, en: `Level ${character.level}` },
  };
  const phaseName = phaseLabels[character.devPhase] || phaseLabels.level;

  // Phase selector + DP counter
  let header = `
    <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
      <div class="flex items-center gap-2">
        <span class="text-gray-500 text-sm">${lang === 'en' ? 'Phase:' : 'Phase :'}</span>
        <button class="phase-btn ${character.devPhase === 'adolescent' ? 'active' : ''}" data-phase="adolescent">
          ${lang === 'en' ? 'Adolescent' : 'Adolescent'}
        </button>
        <button class="phase-btn ${character.devPhase === 'apprenti' ? 'active' : ''}" data-phase="apprenti">
          ${lang === 'en' ? 'Apprentice' : 'Apprenti'}
        </button>
        <button class="phase-btn ${character.devPhase === 'level' ? 'active' : ''}" data-phase="level">
          ${lang === 'en' ? `Level ${character.level}` : `Niveau ${character.level}`}
        </button>
      </div>
      <div class="text-right">
        <span class="text-gray-400 text-sm">${lang === 'en' ? 'Dev Points:' : 'Points de dév :'} </span>
        <span class="text-amber-300 font-bold text-lg">${remaining}</span>
        <span class="text-gray-500"> / ${devPts}</span>
        ${remaining < 0 ? '<span class="text-red-400 text-xs ml-2">Dépassement !</span>' : ''}
      </div>
    </div>
  `;

  // Warning if no stats assigned
  if (devPts <= 0 && character.stats.every(s => s === 0)) {
    header += `<p class="text-red-400 text-sm mb-3">${lang === 'en' ? 'Assign stats first to get development points!' : 'Assignez d\'abord les caractéristiques pour obtenir des points de développement !'}</p>`;
  }

  let table = `
    <div class="scroll-container" style="max-height:70vh">
    <table class="skill-table skill-table-compact">
      <thead>
        <tr>
          <th class="sticky-col">${lang === 'en' ? 'Skill' : 'Compétence'}</th>
          <th class="text-center w-14">${lang === 'en' ? 'Cost' : 'Coût'}</th>
          <th class="text-center" style="min-width:5rem">${lang === 'en' ? 'Ranks' : 'Degrés'}</th>
          <th class="text-center w-10"></th>
          <th class="text-center w-14">${lang === 'en' ? 'Rank' : 'Rang'}</th>
          <th class="text-center w-14">${lang === 'en' ? 'Stat' : 'Carac'}</th>
          <th class="text-center w-14">${lang === 'en' ? 'Misc' : 'Div'}</th>
          <th class="text-center w-16 font-bold">Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  let globalIndex = 0;
  for (const cat of categories) {
    const catNameFr = CAT_NAMES_FR[cat.name] || cat.name;
    const catName = lang === 'en' ? cat.name : catNameFr;
    table += `<tr><td colspan="8" class="skill-category-header">${catName}</td></tr>`;

    for (const skill of cat.skills) {
      const name = getSkillName(skill, lang);
      const phaseRanks = getCurrentPhaseRanks(character, globalIndex);
      const totalRanks = getTotalRanks(character, globalIndex);

      // Cost
      const cost = getSkillDevCost(character.classIndex, globalIndex);
      let costStr = '—';
      let maxRanks = 0;
      if (cost) {
        costStr = cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`;
        maxRanks = cost.maxRanks;
      }

      // Can add/remove?
      const canAdd = cost && phaseRanks < maxRanks && remaining > 0;
      const nextRankCost = phaseRanks === 0 ? (cost ? cost.first : 0) : (cost ? cost.second : 0);
      const canAfford = remaining >= nextRankCost;
      const canRemove = phaseRanks > 0;

      // Bonuses
      const rankBonus = getRankBonus(totalRanks);
      const statTotalBonus = calcSkillStatBonusTotal(skill, character);
      const miscBonus = character.skillMiscBonuses[globalIndex] || 0;
      const total = rankBonus + statTotalBonus + miscBonus;

      // Rank boxes — visual representation of total ranks (like RM character sheet)
      let rankBoxes = renderRankBoxes(totalRanks, phaseRanks);

      // +/- buttons
      const addDisabled = !canAdd || !canAfford ? 'disabled' : '';
      const removeDisabled = !canRemove ? 'disabled' : '';
      const plusMinus = cost ? `
        <span class="skill-pm">
          <button class="pm-btn pm-minus" data-skill="${globalIndex}" ${removeDisabled}>−</button>
          <button class="pm-btn pm-plus" data-skill="${globalIndex}" ${addDisabled}>+</button>
        </span>
      ` : '';

      table += `
        <tr class="${totalRanks > 0 ? '' : 'text-gray-600'}">
          <td class="sticky-col text-gray-300">${name}</td>
          <td class="text-center text-gray-500 text-xs">${costStr}</td>
          <td class="text-center">
            ${rankBoxes}
            <span class="text-xs text-amber-300 ml-1">${totalRanks > 0 ? totalRanks : ''}</span>
          </td>
          <td class="text-center">${plusMinus}</td>
          <td class="text-center stat-bonus ${rankBonus >= 0 ? 'positive' : 'negative'}">${rankBonus >= 0 ? '+' + rankBonus : rankBonus}</td>
          <td class="text-center stat-bonus ${statTotalBonus >= 0 ? 'positive' : 'negative'}">${statTotalBonus >= 0 ? '+' + statTotalBonus : statTotalBonus}</td>
          <td class="text-center"><input type="number" class="field-inline skill-misc-input" data-skill="${globalIndex}" value="${miscBonus || ''}" style="width:2.5rem" title="Bonus divers"></td>
          <td class="text-center font-bold stat-bonus ${total >= 0 ? 'positive' : 'negative'}">${total >= 0 ? '+' + total : total}</td>
        </tr>
      `;
      globalIndex++;
    }
  }

  table += `</tbody></table></div>`;
  return panel(lang === 'en' ? 'Skills — ' + phaseName.en : 'Compétences — ' + phaseName.fr, header + table);
}

/**
 * Render rank boxes ■□ style (iconic RM character sheet look).
 * Shows up to 10 boxes for the first tier, condensed display after that.
 */
function renderRankBoxes(totalRanks, phaseRanks) {
  const maxDisplay = Math.max(totalRanks + 2, 5);
  const capped = Math.min(maxDisplay, 10);
  let html = '<span class="rank-boxes">';
  for (let r = 0; r < capped; r++) {
    const isFilled = r < totalRanks;
    const isNewThisPhase = r >= (totalRanks - phaseRanks) && r < totalRanks;
    const cls = isFilled ? (isNewThisPhase ? 'filled new-rank' : 'filled') : '';
    html += `<span class="rank-box ${cls}">${isFilled ? '■' : '□'}</span>`;
  }
  if (totalRanks > 10) {
    html += `<span class="text-xs text-gray-500">+${totalRanks - 10}</span>`;
  }
  html += '</span>';
  return html;
}

/**
 * Calculate stat bonus using total bonuses (normal + race + special).
 * Handles 1, 2, or 3 stats: floor(average of all stat bonuses).
 */
function calcSkillStatBonusTotal(skill, char) {
  const statIndices = getSkillStatIndices(skill);
  if (statIndices.length === 0) return 0;
  if (statIndices.length === 1) return getTotalStatBonus(char, statIndices[0] - 1);

  let sum = 0;
  for (const idx of statIndices) {
    sum += getTotalStatBonus(char, idx - 1);
  }
  return Math.floor(sum / statIndices.length);
}

// === Event bindings ===

function bindTabEvents(app) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveCurrentTabData();
      currentTab = btn.dataset.tab;
      renderEditor(app);
    });
  });
}

function bindActionEvents() {
  const btnSaveJson = document.getElementById('btn-save-json');
  const btnSaveLocal = document.getElementById('btn-save-local');
  const btnPrint = document.getElementById('btn-print');

  if (btnSaveJson) btnSaveJson.addEventListener('click', () => {
    saveCurrentTabData();
    character.updatedAt = new Date().toISOString();
    downloadCharacter(character);
    showToast('Personnage téléchargé !');
  });
  if (btnSaveLocal) btnSaveLocal.addEventListener('click', () => {
    saveCurrentTabData();
    character.updatedAt = new Date().toISOString();
    saveToLocalStorage(character);
    showToast('Personnage sauvegardé !');
  });
  if (btnPrint) btnPrint.addEventListener('click', () => window.print());
}

function bindContentEvents(app) {
  switch (currentTab) {
    case 'infos': bindInfosEvents(app); break;
    case 'stats': bindStatsEvents(app); break;
    case 'race': bindRaceEvents(app); break;
    case 'weapons': bindWeaponsEvents(app); break;
    case 'languages': bindLanguagesEvents(app); break;
    case 'spells': bindSpellsEvents(app); break;
    case 'history': bindHistoryEvents(); break;
    case 'skills': bindSkillsEvents(app); break;
  }
}

function getPhaseLabel(char, lang) {
  if (char.devPhase === 'adolescent') return lang === 'en' ? 'Adolescent phase' : 'Phase adolescent';
  if (char.devPhase === 'apprenti') return lang === 'en' ? 'Apprentice phase' : 'Phase apprenti';
  return (lang === 'en' ? 'Level ' : 'Niveau ') + char.level;
}

function renderStatGainsResult(lang) {
  const gains = character._lastStatGains;
  if (!gains) return '';
  let html = `<div class="mt-2 text-xs"><table class="skill-table"><thead><tr>
    <th>Stat</th><th class="text-center">D100</th><th class="text-center">Diff</th>
    <th class="text-center">${lang === 'en' ? 'Gain' : 'Gain'}</th>
    <th class="text-center">${lang === 'en' ? 'Result' : 'Résultat'}</th>
  </tr></thead><tbody>`;
  for (const g of gains) {
    const gained = g.gain > 0;
    html += `<tr class="${gained ? '' : 'text-gray-600'}">
      <td class="font-bold">${STAT_ABBREVS[g.statIndex]}</td>
      <td class="text-center">${g.roll || '—'}</td>
      <td class="text-center">${g.diff}</td>
      <td class="text-center ${gained ? 'text-green-400 font-bold' : ''}">${gained ? '+' + g.gain : '0'}${g.openEnded ? '*' : ''}</td>
      <td class="text-center">${g.oldTemp} → ${g.newTemp}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;
  return html;
}

/**
 * Process level-up: advance phase/level, roll stat gains, reset DP.
 */
function performLevelUp(app) {
  // Advance phase: adolescent → apprenti → level 1 → level 2 → ...
  if (character.devPhase === 'adolescent') {
    character.devPhase = 'apprenti';
  } else if (character.devPhase === 'apprenti') {
    character.devPhase = 'level';
    character.level = 1;
  } else {
    character.level++;
  }

  // Roll stat gains (only for level 1+ phases, not adolescent/apprenti)
  if (character.devPhase === 'level' && character.stats.some(s => s > 0)) {
    const gains = processLevelUpStatGains(character.stats, character.potentials);
    character._lastStatGains = gains;

    // Apply gains
    for (const g of gains) {
      character.stats[g.statIndex] = g.newTemp;
    }
  } else {
    character._lastStatGains = null;
  }

  // Reset current level DP spending
  setDevPointsSpent(character, 0);

  showToast(character.devPhase === 'level'
    ? `Niveau ${character.level} !`
    : character.devPhase === 'apprenti' ? 'Phase Apprenti !' : 'Phase Adolescent !');

  renderEditor(app);
}

function bindInfosEvents(app) {
  const fields = {
    'f-name': 'name', 'f-height': 'height',
    'f-weight': 'weight', 'f-hair': 'hair', 'f-eyes': 'eyes',
    'f-age': 'age', 'f-sex': 'sex', 'f-appearance': 'appearance',
    'f-behavior': 'behavior', 'f-xp': 'xp',
  };

  for (const [id, field] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { character[field] = el.value; });
  }

  // Level up button
  const btnLevelUp = document.getElementById('btn-level-up');
  if (btnLevelUp) {
    btnLevelUp.addEventListener('click', () => performLevelUp(app));
  }

  // Class selector — sets realm and prime stats automatically
  const classEl = document.getElementById('f-class');
  if (classEl) {
    classEl.addEventListener('change', () => {
      character.classIndex = parseInt(classEl.value);
      if (character.classIndex >= 0) {
        const cls = getAllClasses()[character.classIndex];
        character.realm = getRealmKey(cls);
        character.primeStats = getClassPrimeStats(cls);
        character._ppStatIndices = getPPStatIndices(cls);
        // Recalculate assigned stats with new prime stat info
        reapplyAssignments();
      } else {
        character.realm = 'none';
        character.primeStats = [];
        character._ppStatIndices = [];
        reapplyAssignments();
      }
      renderEditor(app);
    });
  }

  // Race selector — applies stat bonuses from monde.json
  const raceEl = document.getElementById('f-race');
  if (raceEl) {
    raceEl.addEventListener('change', () => {
      const idx = parseInt(raceEl.value);
      character.raceIndex = idx;
      const race = getRaceByIndex(idx);
      applyRace(character, race);
      renderEditor(app);
    });
  }

  // Level
  const levelEl = document.getElementById('f-level');
  if (levelEl) levelEl.addEventListener('change', () => {
    character.level = parseInt(levelEl.value) || 1;
    renderEditor(app);
  });

  // Armor
  const armorEl = document.getElementById('f-armor');
  if (armorEl) armorEl.addEventListener('change', () => {
    character.armorType = parseInt(armorEl.value);
  });

  // Defense bonus
  const defEl = document.getElementById('f-defbonus');
  if (defEl) defEl.addEventListener('change', () => {
    character.defenseBonus = parseInt(defEl.value) || 0;
  });
}

function bindStatsEvents(app) {
  // Method selector radio buttons
  document.querySelectorAll('input[name="roll-method"]').forEach(radio => {
    radio.addEventListener('change', () => {
      rollingMethod = radio.value;
      character.statLog.method = rollingMethod;
      renderEditor(app);
    });
  });

  // Roll / Reroll button ("Retirer" = reroll all)
  const btnRoll = document.getElementById('btn-roll-stats');
  if (btnRoll) {
    btnRoll.addEventListener('click', () => {
      const isReroll = rolledStats.length === STAT_COUNT;
      const log = character.statLog;
      log.method = rollingMethod;

      if (rollingMethod === 'rm2') {
        rolledStats = generateStatRolls();
        character.rawRolls = rolledStats.map(r => ({ tempRoll: r.tempRoll, potRoll: r.potRoll }));
      } else {
        const result = rollStatPairsRMSS();
        rolledStats = result.pairs;
        character.rawRolls = null; // RMSS doesn't use raw rolls for recalculation
      }

      // Log the roll
      log.rolls.push({
        timestamp: new Date().toISOString(),
        rollData: rolledStats.map(r => ({ ...r })),
        action: isReroll ? 'reroll' : 'roll',
      });
      if (isReroll) log.rerollCount++;

      rollAssignments = new Array(STAT_COUNT).fill(-1);
      selectedRoll = -1;
      editMode = false;
      character.stats = new Array(STAT_COUNT).fill(0);
      character.potentials = new Array(STAT_COUNT).fill(0);
      renderEditor(app);
    });
  }

  // Auto-assign button
  const btnAuto = document.getElementById('btn-auto-assign');
  if (btnAuto) {
    btnAuto.addEventListener('click', () => {
      autoAssignRolls();
      selectedRoll = -1;
      renderEditor(app);
    });
  }

  // Clear assignments (does NOT count as reroll, just clears assignment)
  const btnClear = document.getElementById('btn-clear-assign');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      rollAssignments = new Array(STAT_COUNT).fill(-1);
      selectedRoll = -1;
      character.stats = new Array(STAT_COUNT).fill(0);
      character.potentials = new Array(STAT_COUNT).fill(0);
      renderEditor(app);
    });
  }

  // Validate stats — locks the roll and creates audit snapshot
  const btnValidate = document.getElementById('btn-validate-stats');
  if (btnValidate) {
    btnValidate.addEventListener('click', () => {
      character.statLog.validated = {
        timestamp: new Date().toISOString(),
        stats: [...character.stats],
        potentials: [...character.potentials],
        assignments: [...rollAssignments],
      };
      statsValidated = true;
      showToast('Stats validées !');
      renderEditor(app);
    });
  }

  // Edit mode toggle (manual entry)
  const btnEdit = document.getElementById('btn-edit-mode');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      editMode = !editMode;
      selectedRoll = -1;
      renderEditor(app);
    });
  }

  // Roll chip click — select/deselect a roll (only before validation)
  document.querySelectorAll('.pair-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      if (statsValidated) return;
      const r = parseInt(chip.dataset.roll);
      if (isNaN(r)) return;
      const assigned = rollAssignments[r] >= 0;

      if (assigned) {
        const statIdx = rollAssignments[r];
        character.stats[statIdx] = 0;
        character.potentials[statIdx] = 0;
        rollAssignments[r] = -1;
        selectedRoll = -1;
        renderEditor(app);
        return;
      }

      selectedRoll = selectedRoll === r ? -1 : r;
      renderEditor(app);
    });
  });

  // Stat row click — assign selected roll to this stat
  document.querySelectorAll('.stat-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (editMode || statsValidated) return;

      const statIdx = parseInt(row.dataset.statIdx);
      if (selectedRoll < 0) return;
      if (rollAssignments[selectedRoll] >= 0) return;

      const existingRoll = rollAssignments.indexOf(statIdx);
      if (existingRoll >= 0) rollAssignments[existingRoll] = -1;

      assignRollToStat(selectedRoll, statIdx);
      const nextRoll = rollAssignments.findIndex(a => a < 0);
      selectedRoll = nextRoll >= 0 ? nextRoll : -1;
      renderEditor(app);
    });
  });

  // Manual stat inputs (edit mode) — logs edits if stats already validated
  document.querySelectorAll('.stat-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.stat);
      const field = input.dataset.field;
      const val = parseInt(input.value) || 0;

      // Record edit if stats were validated
      if (statsValidated && (field === 'temp' || field === 'pot')) {
        const oldVal = field === 'temp' ? character.stats[idx] : character.potentials[idx];
        if (oldVal !== val) {
          character.statLog.editsAfterValidation.push({
            timestamp: new Date().toISOString(),
            statIndex: idx,
            field,
            oldVal,
            newVal: val,
          });
        }
      }

      switch (field) {
        case 'temp':
          character.stats[idx] = val;
          if (!character.potentials[idx] || character.potentials[idx] < val) {
            character.potentials[idx] = val;
          }
          break;
        case 'pot': character.potentials[idx] = val; break;
        case 'spec': character.specialBonuses[idx] = val; break;
      }
      renderEditor(app);
    });
  });
}

/**
 * Assign a roll to a stat.
 * RM2: prime stats get temp boosted to max(roll, 90) and pot recalculated.
 * RMSS: prime stats get temp and pot bumped to at least 90.
 */
function assignRollToStat(rollIdx, statIdx) {
  const roll = rolledStats[rollIdx];
  const isPrime = character.primeStats.includes(statIdx);

  if (rollingMethod === 'rm2') {
    const values = getStatValues(roll, isPrime);
    character.stats[statIdx] = values.temp;
    character.potentials[statIdx] = values.pot;
  } else {
    // RMSS: simple bump to 90 for prime stats
    let temp = roll.temp;
    let pot = roll.pot;
    if (isPrime) {
      if (temp < 90) temp = 90;
      if (pot < 90) pot = 90;
    }
    if (temp > pot) pot = temp;
    character.stats[statIdx] = temp;
    character.potentials[statIdx] = pot;
  }
  rollAssignments[rollIdx] = statIdx;
}

/**
 * Smart auto-assign: best rolls → most useful stats for the chosen class.
 *
 * Strategy:
 *   - Prime stats get the LOWEST rolls (prime boost raises temp to 90 anyway)
 *   - Non-prime dev stats (Co,Ag,AD,Mé,Ra) get the HIGHEST rolls (maximize DP)
 *   - Realm stat (for casters) gets the next best roll (maximize power points)
 *   - Remaining stats fill with whatever's left
 */
function autoAssignRolls() {
  const primeSet = new Set(character.primeStats);
  const devStatIndices = [0, 1, 2, 3, 4]; // Co, Ag, AD, Mé, Ra
  const realmStatMap = { 'essence': 8, 'channeling': 9, 'mentalism': 7 };
  const realmStat = realmStatMap[character.realm]; // undefined if no realm

  // Categorize unassigned stats into priority tiers
  const tierA = []; // Non-prime dev stats → best rolls (maximize DP)
  const tierB = []; // Realm stat (if not in A) → good roll (maximize PP)
  const tierC = []; // Other non-prime, non-dev stats → medium rolls
  const tierD = []; // Prime stats → worst rolls (prime boost compensates)

  for (let i = 0; i < STAT_COUNT; i++) {
    if (rollAssignments.includes(i)) continue; // Already assigned
    const isPrime = primeSet.has(i);
    const isDev = devStatIndices.includes(i);

    if (isPrime) {
      tierD.push(i);
    } else if (isDev) {
      tierA.push(i);
    } else if (realmStat === i) {
      tierB.push(i);
    } else {
      tierC.push(i);
    }
  }

  // Stats ordered: best rolls first → A, B, C, then worst rolls → D
  const statPriority = [...tierA, ...tierB, ...tierC, ...tierD];

  // Sort unassigned rolls by quality (best first)
  const unassignedRolls = [];
  for (let r = 0; r < STAT_COUNT; r++) {
    if (rollAssignments[r] >= 0) continue;
    const quality = rollingMethod === 'rm2' ? rolledStats[r].tempRoll : rolledStats[r].temp;
    unassignedRolls.push({ rollIdx: r, quality });
  }
  unassignedRolls.sort((a, b) => b.quality - a.quality); // Best first

  // Assign: best roll → highest priority stat
  for (let i = 0; i < Math.min(statPriority.length, unassignedRolls.length); i++) {
    assignRollToStat(unassignedRolls[i].rollIdx, statPriority[i]);
  }
}

/**
 * Reapply all current roll assignments (e.g., after class change affects prime stats).
 * Recalculates temp/pot for each assigned roll using current prime stat info.
 */
function reapplyAssignments() {
  if (rolledStats.length !== STAT_COUNT) return;
  for (let r = 0; r < STAT_COUNT; r++) {
    const statIdx = rollAssignments[r];
    if (statIdx < 0) continue;
    // Re-use assignRollToStat which handles both RM2/RMSS prime logic
    assignRollToStat(r, statIdx);
  }
}

function bindLanguagesEvents(app) {
  document.querySelectorAll('.lang-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.lang);
      const field = input.dataset.field;
      if (field === 'name') character.languages[idx].name = input.value;
      else character.languages[idx][field] = parseInt(input.value) || 0;
    });
  });

  document.querySelectorAll('.lang-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      character.languages.splice(parseInt(btn.dataset.lang), 1);
      renderEditor(app);
    });
  });

  const addBtn = document.getElementById('btn-add-lang');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      character.languages.push({ name: '', spoken: 0, written: 0 });
      renderEditor(app);
    });
  }
}

function bindSpellsEvents(app) {
  // Palier + (invest spell points into a list's tier)
  document.querySelectorAll('.spell-palier-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.spell);
      const sl = character.spellLists[idx];
      const cost = sl.cost || 4;
      const spent = getSpellPointsSpent(character);
      const budget = getSpellPointsTotal(character);
      if (spent + cost > budget) { showToast('Pas assez de points de sorts !', true); return; }
      sl.palier = (sl.palier || 0) + cost;
      setSpellPointsSpent(character, spent + cost);
      renderEditor(app);
    });
  });

  // Palier - (refund spell points from tier)
  document.querySelectorAll('.spell-palier-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.spell);
      const sl = character.spellLists[idx];
      const cost = sl.cost || 4;
      if ((sl.palier || 0) < cost) return;
      sl.palier -= cost;
      const spent = getSpellPointsSpent(character);
      setSpellPointsSpent(character, Math.max(0, spent - cost));
      renderEditor(app);
    });
  });

  // D100 roll to resolve tier (D100 ≤ palier → gain spell levels)
  document.querySelectorAll('.spell-roll').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.spell);
      const sl = character.spellLists[idx];
      const palier = sl.palier || 0;
      const roll = Math.floor(Math.random() * 100) + 1;
      if (roll <= palier) {
        // Success: gain next 5 levels
        sl.niveau = (sl.niveau || 0) + 5;
        sl.palier = 0; // Reset tier after success
        showToast(`D100=${roll} ≤ ${palier} → Niveaux ${sl.niveau - 4}-${sl.niveau} acquis !`);
      } else {
        showToast(`D100=${roll} > ${palier} — Echec. Continuez à investir.`, true);
      }
      renderEditor(app);
    });
  });

  // Remove spell list
  document.querySelectorAll('.spell-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.spell);
      // Refund palier points
      const sl = character.spellLists[idx];
      if (sl.palier > 0) {
        const spent = getSpellPointsSpent(character);
        setSpellPointsSpent(character, Math.max(0, spent - sl.palier));
      }
      character.spellLists.splice(idx, 1);
      renderEditor(app);
    });
  });

  // Add spell list (manual)
  const addBtn = document.getElementById('btn-add-spell');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      character.spellLists.push({ name: '', cost: 4, palier: 0, niveau: 0, reference: '' });
      renderEditor(app);
    });
  }

  // Add from available lists
  document.querySelectorAll('.add-spell-list').forEach(btn => {
    btn.addEventListener('click', () => {
      character.spellLists.push({
        name: btn.dataset.spellName,
        cost: 4, // Default cost, should be looked up from class data
        palier: 0,
        niveau: 0,
        reference: btn.dataset.spellRealm || '',
      });
      renderEditor(app);
    });
  });
}

function bindHistoryEvents() {
  const eqEl = document.getElementById('f-equipment');
  if (eqEl) eqEl.addEventListener('input', () => { character.equipment = eqEl.value; });
  const histEl = document.getElementById('f-history');
  if (histEl) histEl.addEventListener('input', () => { character.history = histEl.value; });
}

function bindSkillsEvents(app) {
  // Phase selector buttons
  document.querySelectorAll('.phase-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      character.devPhase = btn.dataset.phase;
      renderEditor(app);
    });
  });

  // + buttons (add rank)
  document.querySelectorAll('.pm-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillIdx = parseInt(btn.dataset.skill);
      const cost = getSkillDevCost(character.classIndex, skillIdx);
      if (!cost) return;

      const phaseRanks = getCurrentPhaseRanks(character, skillIdx);
      if (phaseRanks >= cost.maxRanks) return;

      const rankCost = phaseRanks === 0 ? cost.first : cost.second;
      const devPts = getDevPointsTotal(character);
      const spent = getDevPointsSpent(character);
      if (spent + rankCost > devPts) {
        showToast('Pas assez de points de développement !', true);
        return;
      }

      const ranksObj = getCurrentPhaseRanksObj(character);
      ranksObj[skillIdx] = phaseRanks + 1;
      setDevPointsSpent(character, spent + rankCost);
      renderEditor(app);
    });
  });

  // - buttons (remove rank)
  document.querySelectorAll('.pm-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillIdx = parseInt(btn.dataset.skill);
      const cost = getSkillDevCost(character.classIndex, skillIdx);
      if (!cost) return;

      const phaseRanks = getCurrentPhaseRanks(character, skillIdx);
      if (phaseRanks <= 0) return;

      // Refund the last rank's cost
      const refund = phaseRanks === 2 ? cost.second : cost.first;
      const ranksObj = getCurrentPhaseRanksObj(character);
      ranksObj[skillIdx] = phaseRanks - 1;
      if (ranksObj[skillIdx] === 0) delete ranksObj[skillIdx];

      const spent = getDevPointsSpent(character);
      setDevPointsSpent(character, Math.max(0, spent - refund));
      renderEditor(app);
    });
  });

  // Misc bonus inputs
  document.querySelectorAll('.skill-misc-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.skill);
      character.skillMiscBonuses[idx] = parseInt(input.value) || 0;
    });
  });
}

function saveCurrentTabData() {
  if (currentTab === 'history') {
    const eqEl = document.getElementById('f-equipment');
    const histEl = document.getElementById('f-history');
    if (eqEl) character.equipment = eqEl.value;
    if (histEl) character.history = histEl.value;
  }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

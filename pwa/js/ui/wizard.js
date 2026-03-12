// Tabbed character editor — all tabs accessible simultaneously
// Profession chosen first, then stats (temp/pot pairs), then everything else

import { panel, showToast } from './components.js';
import { createCharacter, getTotalStatBonus, getStatDev, calcHitPoints, calcPowerPoints, applyRace } from '../engine/character.js';
import { rollThreeSets, applyPrimeStatBump, getStatBonus, getRankBonus, STAT_COUNT } from '../engine/stats.js';
import { getAllClasses, getClassName, getRealmInfo, getRealmKey, getRealmLabel, isSpellUser, getClassPrimeStats } from '../engine/classes.js';
import { getAllCategories, getSkillName, getSkillDevCost, getBaseDevelopmentPoints } from '../engine/skills.js';
import { getAllRealms } from '../engine/spells.js';
import { downloadCharacter, saveToLocalStorage } from '../engine/export.js';
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
  { id: 'languages', label_fr: 'Langages', label_en: 'Languages' },
  { id: 'spells', label_fr: 'Listes de Sorts', label_en: 'Spell Lists' },
  { id: 'history', label_fr: 'Historique', label_en: 'History' },
  { id: 'skills', label_fr: 'Compétences', label_en: 'Skills' },
];

const STAT_NAMES_FR = ['Constitution', 'Agilité', 'Auto-discipline', 'Mémoire', 'Raisonnement', 'Force', 'Rapidité', 'Présence', 'Intuition', 'Empathie'];
const STAT_NAMES_EN = ['Constitution', 'Agility', 'Self Discipline', 'Memory', 'Reasoning', 'Strength', 'Quickness', 'Presence', 'Intuition', 'Empathy'];
const STAT_ABBREVS = ['Co', 'Ag', 'AD', 'Mé', 'Ra', 'Fo', 'Rp', 'Pr', 'In', 'Em'];

let character = null;
let currentTab = 'infos';

// Rolling state: 3 sets of 10 values
let rolledSets = []; // [[10 values], [10 values], [10 values]]
let selectedTempSet = -1; // Which set (0-2) for temp
let selectedPotSet = -1;  // Which set (0-2) for pot

export function startWizard(app, forceNew = true) {
  if (forceNew || !character) {
    character = createCharacter();
    rolledSets = [];
    selectedTempSet = -1;
    selectedPotSet = -1;
  }
  renderEditor(app);
}

export function loadIntoWizard(app, loadedCharacter) {
  character = loadedCharacter;
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
}

function renderTab(app) {
  switch (currentTab) {
    case 'infos': return renderInfosTab(app.lang);
    case 'stats': return renderStatsTab(app.lang);
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

  // Rolling section: 3 sets
  const hasSets = rolledSets.length === 3;
  let rollHtml = `
    <div class="mb-4 no-print">
      <button class="btn-primary" id="btn-roll-stats">${hasSets ? 'Relancer 3 tirages' : 'Lancer 3 tirages de 10'}</button>
      ${character.classIndex < 0 ? `<span class="ml-3 text-red-400 text-sm">Choisissez d'abord une profession !</span>` : ''}
    </div>
  `;

  if (hasSets) {
    rollHtml += `<div class="mb-4">`;
    rollHtml += `<p class="text-xs text-gray-400 mb-2">Choisissez 2 tirages: un pour les valeurs Temporaires, un pour les Potentielles.</p>`;
    for (let s = 0; s < 3; s++) {
      const isTempSel = selectedTempSet === s;
      const isPotSel = selectedPotSet === s;
      const label = isTempSel ? 'TEMP' : isPotSel ? 'POT' : '';
      const borderClass = isTempSel ? 'border-amber-500' : isPotSel ? 'border-blue-500' : 'border-gray-600';
      rollHtml += `
        <div class="flex items-center gap-2 mb-1 p-2 rounded border ${borderClass} bg-gray-800">
          <span class="text-xs text-gray-500 w-12">Set ${s + 1}:</span>
          <span class="flex-1 font-mono text-sm">
            ${rolledSets[s].map(v => `<span class="inline-block w-8 text-center text-amber-300">${v}</span>`).join('')}
          </span>
          <button class="btn-secondary text-xs py-0.5 px-2 set-temp-btn" data-set="${s}" ${isTempSel ? 'disabled' : ''}>
            ${isTempSel ? '✓ Temp' : 'Temp'}
          </button>
          <button class="btn-secondary text-xs py-0.5 px-2 set-pot-btn" data-set="${s}" ${isPotSel ? 'disabled' : ''}>
            ${isPotSel ? '✓ Pot' : 'Pot'}
          </button>
          ${label ? `<span class="text-xs font-bold ${isTempSel ? 'text-amber-400' : 'text-blue-400'}">${label}</span>` : ''}
        </div>
      `;
    }
    rollHtml += `</div>`;

    if (selectedTempSet >= 0 && selectedPotSet >= 0) {
      rollHtml += `<p class="text-xs text-gray-400 mb-2">Glissez les valeurs dans le tableau ci-dessous ou saisissez-les manuellement.</p>`;
    }
  }

  // Stats table
  let table = `
    <div class="overflow-x-auto">
    <table class="skill-table">
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

    table += `
      <tr>
        <td class="text-center font-bold ${isPrime ? 'text-amber-400' : 'text-gray-500'}">${STAT_ABBREVS[i]}${isPrime ? ' ★' : ''}</td>
        <td class="${isPrime ? 'text-amber-300 font-bold' : 'text-gray-300'}">${statNames[i]}</td>
        <td class="text-center"><input type="number" class="field-inline stat-input" data-stat="${i}" data-field="temp" value="${temp || ''}" min="1" max="102"></td>
        <td class="text-center"><input type="number" class="field-inline stat-input" data-stat="${i}" data-field="pot" value="${pot || ''}" min="1" max="102"></td>
        <td class="text-center text-gray-500">${devStr}</td>
        <td class="text-center stat-bonus ${normClass}">${norm >= 0 ? '+' + norm : norm}</td>
        <td class="text-center stat-bonus ${race > 0 ? 'positive' : race < 0 ? 'negative' : 'zero'}">${race !== 0 ? (race >= 0 ? '+' + race : race) : '0'}</td>
        <td class="text-center"><input type="number" class="field-inline stat-input" data-stat="${i}" data-field="spec" value="${spec}" style="width:3.5rem"></td>
        <td class="text-center font-bold stat-bonus ${totalClass}">${total >= 0 ? '+' + total : total}</td>
      </tr>
    `;
  }

  table += `</tbody></table></div>`;
  return panel(lang === 'en' ? 'Characteristics — Temp / Pot / Bonuses' : 'Caractéristiques — Temp / Pot / Bonus', rollHtml + table);
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
  if (cls && !isSpellUser(cls)) {
    return panel(lang === 'en' ? 'Spell Lists' : 'Listes de Sorts', `
      <p class="text-gray-500">Ce personnage n'est pas un lanceur de sorts (${getRealmLabel(cls, lang)}).</p>
    `);
  }

  let rows = '';
  character.spellLists.forEach((sl, i) => {
    rows += `
      <tr>
        <td class="text-center text-gray-500">${i + 1}</td>
        <td><input type="text" class="field-inline spell-input" data-spell="${i}" data-field="name" value="${esc(sl.name)}" style="width:16rem" placeholder="Nom de la liste..."></td>
        <td class="text-center"><input type="number" class="field-inline spell-input" data-spell="${i}" data-field="level" value="${sl.level}" min="0" max="50" style="width:3rem"></td>
        <td class="text-center"><input type="text" class="field-inline spell-input" data-spell="${i}" data-field="percent" value="${esc(sl.percent || '')}" style="width:3rem"></td>
        <td><button class="text-red-400 hover:text-red-300 text-sm spell-remove" data-spell="${i}">✕</button></td>
      </tr>
    `;
  });

  // Available lists from data
  const realms = getAllRealms();
  let availableHtml = `<div class="mt-4"><details><summary class="text-sm text-gray-400 cursor-pointer hover:text-amber-300">Listes disponibles (cliquez pour ajouter)</summary>`;
  availableHtml += `<div class="mt-2 scroll-container" style="max-height:40vh">`;
  for (const realm of realms) {
    for (let g = 0; g < realm.groups.length; g++) {
      const group = realm.groups[g];
      if (group.length === 0) continue;
      availableHtml += `<div class="text-xs text-purple-400 font-bold mt-2">${realm.name}</div>`;
      for (const spell of group) {
        const name = lang === 'en' ? spell.name_en : spell.name_fr;
        availableHtml += `<button class="text-xs text-gray-400 hover:text-amber-300 block py-0.5 add-spell-list" data-spell-name="${esc(name)}">${name}</button>`;
      }
    }
  }
  availableHtml += `</div></details></div>`;

  return panel(lang === 'en' ? 'Spell Lists' : 'Listes de Sorts', `
    <table class="skill-table">
      <thead>
        <tr>
          <th class="w-8">#</th>
          <th>${lang === 'en' ? 'List' : 'Liste'}</th>
          <th class="text-center">Niv</th>
          <th class="text-center">%</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <button class="btn-secondary text-sm mt-3" id="btn-add-spell">+ ${lang === 'en' ? 'Add List' : 'Ajouter une liste'}</button>
    ${availableHtml}
  `);
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
  const devPts = getBaseDevelopmentPoints();
  const spent = character.devPointsSpent;
  const remaining = devPts - spent;

  let header = `
    <div class="flex justify-between items-center mb-3">
      <span class="text-gray-400">Points de dév: <span class="text-amber-300 font-bold text-lg">${remaining}</span> / ${devPts}</span>
    </div>
  `;

  let table = `
    <div class="scroll-container" style="max-height:70vh">
    <table class="skill-table skill-table-compact">
      <thead>
        <tr>
          <th class="sticky-col">${lang === 'en' ? 'Skill' : 'Compétence'}</th>
          <th class="text-center w-14">${lang === 'en' ? 'Cost' : 'Coût'}</th>
          <th class="text-center w-16">DM</th>
          <th class="text-center w-14">Bonus</th>
          <th class="text-center w-14">Carac</th>
          <th class="text-center w-14">Niv</th>
          <th class="text-center w-14">Div</th>
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

    const catIdx = categories.indexOf(cat);
    for (const skill of cat.skills) {
      const name = getSkillName(skill, lang);
      const ranks = character.skillRanks[globalIndex] || 0;
      const prevRanks = character.totalSkillRanks[globalIndex] || 0;
      const totalRanks = prevRanks + ranks;

      // Cost
      const cost = getSkillDevCost(character.classIndex, globalIndex);
      let costStr = '—';
      if (cost) {
        costStr = cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}/*`;
      }

      // Bonuses
      const rankBonus = getRankBonus(totalRanks);
      const statTotalBonus = calcSkillStatBonusTotal(skill, character);
      const lvlBonus = (character.categoryLevelBonuses[catIdx] || 0) * character.level;
      const miscBonus = character.skillMiscBonuses[globalIndex] || 0;
      const total = rankBonus + statTotalBonus + lvlBonus + miscBonus;

      // Rank checkboxes (0, 1, or 2 this level)
      const maxRanks = cost ? (cost.second > 0 ? 2 : 1) : 0;
      let rankBoxes = '';
      for (let r = 0; r < Math.max(maxRanks, 2); r++) {
        if (r < maxRanks) {
          const filled = r < ranks;
          rankBoxes += `<span class="rank-box ${filled ? 'filled' : ''}" data-skill="${globalIndex}" data-rank="${r + 1}">${filled ? '■' : '□'}</span>`;
        } else {
          rankBoxes += `<span class="rank-box disabled">·</span>`;
        }
      }

      table += `
        <tr class="${totalRanks > 0 ? '' : 'text-gray-600'}">
          <td class="sticky-col text-gray-300">${name}</td>
          <td class="text-center text-gray-500 text-xs">${costStr}</td>
          <td class="text-center">
            <span class="rank-boxes">${rankBoxes}</span>
            <span class="text-xs text-amber-300 ml-1">${totalRanks > 0 ? totalRanks : ''}</span>
          </td>
          <td class="text-center stat-bonus ${rankBonus >= 0 ? 'positive' : 'negative'}">${rankBonus >= 0 ? '+' + rankBonus : rankBonus}</td>
          <td class="text-center stat-bonus ${statTotalBonus >= 0 ? 'positive' : 'negative'}">${statTotalBonus >= 0 ? '+' + statTotalBonus : statTotalBonus}</td>
          <td class="text-center"><input type="number" class="field-inline skill-lvl-input" data-cat="${catIdx}" value="${lvlBonus || ''}" style="width:2.5rem" title="Bonus de niveau"></td>
          <td class="text-center"><input type="number" class="field-inline skill-misc-input" data-skill="${globalIndex}" value="${miscBonus || ''}" style="width:2.5rem" title="Bonus divers"></td>
          <td class="text-center font-bold stat-bonus ${total >= 0 ? 'positive' : 'negative'}">${total >= 0 ? '+' + total : total}</td>
        </tr>
      `;
      globalIndex++;
    }
  }

  table += `</tbody></table></div>`;
  return panel(lang === 'en' ? 'Skills' : 'Compétences', header + table);
}

/**
 * Calculate stat bonus using total bonuses (normal + race + special).
 */
function calcSkillStatBonusTotal(skill, char) {
  const primary = skill.primary_stat;
  const secondary = skill.secondary_stat;
  let bonus = 0;
  if (primary >= 1 && primary <= 10) {
    bonus += getTotalStatBonus(char, primary - 1);
  }
  if (skill.stat_count >= 2 && secondary >= 1 && secondary <= 10) {
    bonus += getTotalStatBonus(char, secondary - 1);
  }
  if (skill.stat_count >= 2) {
    bonus = Math.floor(bonus / 2);
  }
  return bonus;
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
    case 'languages': bindLanguagesEvents(app); break;
    case 'spells': bindSpellsEvents(app); break;
    case 'history': bindHistoryEvents(); break;
    case 'skills': bindSkillsEvents(app); break;
  }
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

  // Class selector — sets realm and prime stats automatically
  const classEl = document.getElementById('f-class');
  if (classEl) {
    classEl.addEventListener('change', () => {
      character.classIndex = parseInt(classEl.value);
      if (character.classIndex >= 0) {
        const cls = getAllClasses()[character.classIndex];
        character.realm = getRealmKey(cls);
        character.primeStats = getClassPrimeStats(cls);
        // Apply prime stat bump if stats already assigned
        if (character.stats.some(s => s > 0) && character.primeStats.length > 0) {
          character.stats = applyPrimeStatBump(character.stats, character.primeStats);
          character.potentials = applyPrimeStatBump(character.potentials, character.primeStats);
        }
      } else {
        character.realm = 'none';
        character.primeStats = [];
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
  // Roll button
  const btnRoll = document.getElementById('btn-roll-stats');
  if (btnRoll) {
    btnRoll.addEventListener('click', () => {
      rolledSets = rollThreeSets();
      selectedTempSet = -1;
      selectedPotSet = -1;
      renderEditor(app);
    });
  }

  // Set assignment buttons (Temp / Pot)
  document.querySelectorAll('.set-temp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = parseInt(btn.dataset.set);
      selectedTempSet = s;
      if (selectedPotSet === s) selectedPotSet = -1; // Can't use same set twice
      applyRolledSets();
      renderEditor(app);
    });
  });

  document.querySelectorAll('.set-pot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = parseInt(btn.dataset.set);
      selectedPotSet = s;
      if (selectedTempSet === s) selectedTempSet = -1;
      applyRolledSets();
      renderEditor(app);
    });
  });

  // Manual stat inputs
  document.querySelectorAll('.stat-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.stat);
      const field = input.dataset.field;
      const val = parseInt(input.value) || 0;
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
 * Apply the selected rolled sets to character stats.
 */
function applyRolledSets() {
  if (selectedTempSet >= 0 && rolledSets[selectedTempSet]) {
    let tempVals = [...rolledSets[selectedTempSet]];
    // Apply prime stat bump
    if (character.primeStats.length > 0) {
      tempVals = applyPrimeStatBump(tempVals, character.primeStats);
    }
    character.stats = tempVals;
  }
  if (selectedPotSet >= 0 && rolledSets[selectedPotSet]) {
    let potVals = [...rolledSets[selectedPotSet]];
    if (character.primeStats.length > 0) {
      potVals = applyPrimeStatBump(potVals, character.primeStats);
    }
    character.potentials = potVals;
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
  document.querySelectorAll('.spell-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.spell);
      const field = input.dataset.field;
      if (field === 'level') character.spellLists[idx].level = parseInt(input.value) || 0;
      else character.spellLists[idx][field] = input.value;
    });
  });

  document.querySelectorAll('.spell-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      character.spellLists.splice(parseInt(btn.dataset.spell), 1);
      renderEditor(app);
    });
  });

  const addBtn = document.getElementById('btn-add-spell');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      character.spellLists.push({ name: '', level: 0, percent: '' });
      renderEditor(app);
    });
  }

  document.querySelectorAll('.add-spell-list').forEach(btn => {
    btn.addEventListener('click', () => {
      character.spellLists.push({ name: btn.dataset.spellName, level: 0, percent: '' });
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
  // Rank checkboxes
  document.querySelectorAll('.rank-box:not(.disabled)').forEach(box => {
    box.addEventListener('click', () => {
      const skillIdx = parseInt(box.dataset.skill);
      const targetRank = parseInt(box.dataset.rank);
      const currentRanks = character.skillRanks[skillIdx] || 0;
      const cost = getSkillDevCost(character.classIndex, skillIdx);
      if (!cost) return;

      if (targetRank <= currentRanks) {
        let refund = 0;
        for (let r = currentRanks; r >= targetRank; r--) {
          refund += (r === 2) ? cost.second : cost.first;
        }
        character.skillRanks[skillIdx] = targetRank - 1;
        character.devPointsSpent -= refund;
      } else {
        let addCost = 0;
        for (let r = currentRanks + 1; r <= targetRank; r++) {
          addCost += (r === 2) ? cost.second : cost.first;
        }
        const devPts = getBaseDevelopmentPoints();
        if (character.devPointsSpent + addCost > devPts) {
          showToast('Pas assez de points de développement !', true);
          return;
        }
        character.skillRanks[skillIdx] = targetRank;
        character.devPointsSpent += addCost;
      }
      if (character.devPointsSpent < 0) character.devPointsSpent = 0;
      renderEditor(app);
    });
    box.style.cursor = 'pointer';
  });

  // Misc bonus inputs
  document.querySelectorAll('.skill-misc-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.skill);
      character.skillMiscBonuses[idx] = parseInt(input.value) || 0;
    });
  });

  // Level bonus inputs (per category)
  document.querySelectorAll('.skill-lvl-input').forEach(input => {
    input.addEventListener('change', () => {
      const catIdx = parseInt(input.dataset.cat);
      const val = parseInt(input.value) || 0;
      character.categoryLevelBonuses[catIdx] = Math.round(val / character.level) || 0;
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

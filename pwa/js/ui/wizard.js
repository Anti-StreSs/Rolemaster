// Wizard — step-by-step character creation UI

import { panel, stepIndicator, wizardNav, searchInput, showToast } from './components.js';
import { createCharacter, isStepComplete, getStatBonuses, calcHitPoints, calcPowerPoints } from '../engine/character.js';
import { rollAllStats, getStatBonus, STAT_COUNT } from '../engine/stats.js';
import { getAllClasses, getClassName, getCasterTypeKey, getRealmKey, isSpellUser, filterClasses } from '../engine/classes.js';
import { getAllCategories, getSkillName, calcSkillStatBonus, getSkillDevCost, calcDevCostForRanks, getAllSkillsFlat, getBaseDevelopmentPoints } from '../engine/skills.js';
import { getAllRealms, getSpellListName } from '../engine/spells.js';
import { ARMOR_TYPES, getArmorPenalties } from '../engine/equipment.js';
import { renderSheet } from './sheet.js';

const STEP_KEYS = ['name', 'stats', 'class', 'realm', 'primeStats', 'weaponCats', 'armor', 'skills', 'spells', 'sheet'];
const TOTAL_STEPS = STEP_KEYS.length;

let character = null;
let currentStep = 0;
let rolledStats = [];
let assignedStats = new Array(STAT_COUNT).fill(null); // which rolled stat is assigned where

export function startWizard(app, forceNew = true) {
  if (forceNew || !character) {
    character = createCharacter();
    currentStep = 0;
    rolledStats = [];
    assignedStats = new Array(STAT_COUNT).fill(null);
  }
  renderWizard(app);
}

export function loadIntoWizard(app, loadedCharacter) {
  character = loadedCharacter;
  currentStep = 9; // Go to sheet view
  renderWizard(app);
}

function renderWizard(app) {
  const t = app.t;
  const main = document.getElementById('app-main');
  const stepLabels = STEP_KEYS.map(k => t.steps[k]);

  let html = stepIndicator(currentStep, TOTAL_STEPS, stepLabels);
  html += `<div id="wizard-content">`;
  html += renderStep(app);
  html += `</div>`;
  html += wizardNav(currentStep, TOTAL_STEPS, t);

  main.innerHTML = html;
  bindStepEvents(app);
  bindNavEvents(app);
}

function renderStep(app) {
  const t = app.t;
  const lang = app.lang;

  switch (currentStep) {
    case 0: return renderNameStep(t);
    case 1: return renderStatsStep(t);
    case 2: return renderClassStep(t, lang);
    case 3: return renderRealmStep(t);
    case 4: return renderPrimeStatsStep(t);
    case 5: return renderWeaponCatsStep(t);
    case 6: return renderArmorStep(t);
    case 7: return renderSkillsStep(t, lang);
    case 8: return renderSpellsStep(t, lang);
    case 9: return renderSheet(character, app);
    default: return '';
  }
}

// Step 0: Name
function renderNameStep(t) {
  return panel(t.steps.name, `
    <div class="max-w-md">
      <label class="block text-sm text-gray-400 mb-2">${t.sheet.name}</label>
      <input type="text" id="char-name" value="${character.name}"
        class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded text-lg text-amber-300 focus:border-amber-500 focus:outline-none"
        placeholder="Entrez un nom..." autofocus>
    </div>
  `);
}

// Step 1: Stats
function renderStatsStep(t) {
  const hasRolls = rolledStats.length > 0;
  const unassigned = hasRolls ? rolledStats.filter((_, i) => !assignedStats.includes(i)) : [];

  let rollSection = '';
  if (!hasRolls) {
    rollSection = `
      <div class="text-center py-8">
        <button class="btn-primary text-lg px-8 py-3" id="btn-roll-stats">
          🎲 ${t.stats.rollAll}
        </button>
        <p class="text-gray-500 text-sm mt-2">10 caractéristiques seront tirées aléatoirement</p>
      </div>
    `;
  } else {
    // Show unassigned rolls
    rollSection = `
      <div class="mb-4">
        <div class="text-sm text-gray-400 mb-2">Valeurs à assigner :</div>
        <div class="flex flex-wrap gap-2" id="unassigned-rolls">
          ${rolledStats.map((val, i) => {
            const isUsed = assignedStats.includes(i);
            return `<span class="px-3 py-1 rounded font-bold text-lg ${isUsed ? 'bg-gray-700 text-gray-500 line-through' : 'bg-amber-900 text-amber-300 cursor-pointer hover:bg-amber-800'}"
              data-roll-idx="${i}" ${isUsed ? '' : 'data-available="true"'}>${val}</span>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Stat assignment table
  let statsTable = `<div class="mt-4">`;
  for (let i = 0; i < STAT_COUNT; i++) {
    const statName = t.stats.names[i];
    const abbrev = t.stats.abbrevs[i];
    const value = character.stats[i];
    const bonus = value > 0 ? getStatBonus(value) : '—';
    const bonusClass = typeof bonus === 'number' ? (bonus > 0 ? 'positive' : bonus < 0 ? 'negative' : 'zero') : '';

    const assignedRollIdx = assignedStats.findIndex((si, idx) => {
      // Find which rolled stat index maps to this stat position
      return false; // We'll rebuild this
    });

    statsTable += `
      <div class="stat-row" data-stat="${i}">
        <span class="text-sm">
          <span class="text-amber-400 font-bold">${abbrev}</span>
          <span class="text-gray-400 ml-1">${statName}</span>
        </span>
        <span class="stat-value text-amber-300">${value || '—'}</span>
        <span class="stat-bonus ${bonusClass}">${typeof bonus === 'number' ? (bonus >= 0 ? '+' + bonus : bonus) : bonus}</span>
        ${hasRolls ? `<button class="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 assign-stat-btn" data-stat="${i}">
          ${value > 0 ? '↻' : t.stats.assign}
        </button>` : ''}
      </div>
    `;
  }
  statsTable += `</div>`;

  if (hasRolls) {
    statsTable += `
      <div class="mt-4 text-center">
        <button class="btn-secondary text-sm" id="btn-reroll">${t.stats.rollAll}</button>
      </div>
    `;
  }

  return panel(t.steps.stats, rollSection + statsTable);
}

// Step 2: Class selection
function renderClassStep(t, lang) {
  const classes = getAllClasses();
  const selectedIdx = character.classIndex;

  const typeFilters = ['filterAll', 'spellUser', 'semiSpell', 'nonSpell', 'hybrid'];
  const filterBtns = typeFilters.map(f => {
    const label = f === 'filterAll' ? t.classes.filterAll : t.classes[f];
    return `<button class="px-3 py-1 rounded text-sm class-filter ${f === 'filterAll' ? 'bg-amber-800 text-amber-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}" data-filter="${f === 'filterAll' ? '' : f}">${label}</button>`;
  }).join('');

  let classCards = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 scroll-container" id="class-grid">`;
  for (const cls of classes) {
    const name = getClassName(cls, lang);
    const typeKey = getCasterTypeKey(cls);
    const typeLabel = t.classes[typeKey] || typeKey;
    const isSelected = cls.index === selectedIdx;
    classCards += `
      <div class="class-card ${isSelected ? 'selected' : ''}" data-class-idx="${cls.index}">
        <div class="font-bold text-amber-300">${name}</div>
        <div class="text-xs text-gray-400">${typeLabel}</div>
      </div>
    `;
  }
  classCards += `</div>`;

  return panel(t.steps.class, `
    ${searchInput(t.classes.search, 'class-search')}
    <div class="flex gap-2 mb-4 flex-wrap">${filterBtns}</div>
    ${classCards}
  `);
}

// Step 3: Realm
function renderRealmStep(t) {
  if (character.classIndex < 0) {
    return panel(t.steps.realm, `<p class="text-gray-500">Veuillez d'abord choisir une profession.</p>`);
  }

  const cls = getAllClasses()[character.classIndex];
  if (!isSpellUser(cls)) {
    character.realm = 'none';
    return panel(t.steps.realm, `
      <p class="text-gray-400">La profession <span class="text-amber-300 font-bold">${getClassName(cls, 'fr')}</span>
      n'est pas un lanceur de sorts.</p>
      <p class="text-gray-500 mt-2">Royaume automatiquement défini sur : <span class="text-gray-300">Aucun</span></p>
    `);
  }

  const realmKey = getRealmKey(cls);
  const realms = ['essence', 'channeling', 'mentalism'];

  // Some classes have a fixed realm
  if (realmKey !== 'none' && realms.includes(realmKey)) {
    character.realm = realmKey;
    return panel(t.steps.realm, `
      <p class="text-gray-400">La profession <span class="text-amber-300 font-bold">${getClassName(cls, 'fr')}</span>
      utilise le royaume :</p>
      <div class="text-2xl text-purple-400 font-bold mt-4 text-center">${t.realms[realmKey]}</div>
    `);
  }

  // Let user choose
  const realmCards = realms.map(r => `
    <div class="class-card ${character.realm === r ? 'selected' : ''} text-center py-6" data-realm="${r}">
      <div class="text-xl font-bold ${r === 'essence' ? 'text-blue-400' : r === 'channeling' ? 'text-green-400' : 'text-purple-400'}">${t.realms[r]}</div>
    </div>
  `).join('');

  return panel(t.realms.chooseRealm, `
    <div class="grid grid-cols-3 gap-4">${realmCards}</div>
  `);
}

// Step 4: Prime Stats
function renderPrimeStatsStep(t) {
  const selected = character.primeStats;
  let html = `<p class="text-gray-400 mb-4">Choisissez 2 caractéristiques primaires pour votre profession :</p>`;
  html += `<div class="grid grid-cols-2 gap-2">`;
  for (let i = 0; i < STAT_COUNT; i++) {
    const isSelected = selected.includes(i);
    html += `
      <div class="class-card ${isSelected ? 'selected' : ''}" data-prime-stat="${i}">
        <span class="font-bold text-amber-300">${t.stats.abbrevs[i]}</span>
        <span class="text-gray-300 ml-2">${t.stats.names[i]}</span>
        <span class="text-gray-500 ml-2">(${character.stats[i]})</span>
      </div>
    `;
  }
  html += `</div>`;
  return panel(t.steps.primeStats, html);
}

// Step 5: Weapon Categories
function renderWeaponCatsStep(t) {
  let html = `<p class="text-gray-400 mb-4">Choisissez vos catégories d'armes (cliquez pour sélectionner) :</p>`;
  const weaponCats = [
    'Lames courtes', 'Lames longues', 'Lames d\'estoc', 'Haches courtes',
    'Pointes courtes', 'Haches longues', 'Pointes longues', 'Grandes lames',
    'Armes d\'Hast', 'Arcs', 'Arbalètes', 'Armes de jet',
    'Arts martiaux Frappes', 'Arts martiaux Balayages',
  ];
  html += `<div class="grid grid-cols-2 gap-2">`;
  weaponCats.forEach((cat, i) => {
    const isSelected = character.weaponCategories.includes(i);
    html += `
      <div class="class-card ${isSelected ? 'selected' : ''}" data-weapon-cat="${i}">
        ${cat}
      </div>
    `;
  });
  html += `</div>`;
  return panel(t.steps.weaponCats, html);
}

// Step 6: Armor
function renderArmorStep(t) {
  const armorLabels = ['none', 'leather', 'rigid', 'chain', 'plate'];
  let html = `<div class="grid grid-cols-1 gap-3 max-w-md">`;
  ARMOR_TYPES.forEach(armor => {
    const isSelected = character.armorType === armor.id;
    const penalties = getArmorPenalties(armor.id);
    html += `
      <div class="class-card ${isSelected ? 'selected' : ''}" data-armor="${armor.id}">
        <div class="font-bold text-amber-300">${t.armor[armor.key]}</div>
        <div class="text-xs text-gray-500">
          ${penalties.slice(0, 4).map(p => p > 0 ? `-${p}` : '0').join(' / ')}
        </div>
      </div>
    `;
  });
  html += `</div>`;
  return panel(t.armor.choose, html);
}

// Step 7: Skills
function renderSkillsStep(t, lang) {
  const categories = getAllCategories();
  const devPts = getBaseDevelopmentPoints();
  const spent = character.devPointsSpent;
  const remaining = devPts - spent;

  let html = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-gray-400">${t.skills.devPoints}: <span class="text-amber-300 font-bold">${remaining}</span> ${t.skills.remaining}</span>
      <span class="text-xs text-gray-500">${t.skills.devPoints}: ${devPts}</span>
    </div>
    <div class="scroll-container">
    <table class="skill-table">
      <thead>
        <tr>
          <th>${t.skills.skill}</th>
          <th class="text-center w-16">${t.skills.ranks}</th>
          <th class="text-center w-16">${t.skills.cost}</th>
          <th class="text-center w-16">${t.skills.statBonus}</th>
          <th class="text-center w-16">${t.skills.totalBonus}</th>
        </tr>
      </thead>
      <tbody>
  `;

  let globalIndex = 0;
  for (const cat of categories) {
    html += `<tr><td colspan="5" class="skill-category-header">${cat.name}</td></tr>`;
    for (const skill of cat.skills) {
      const name = getSkillName(skill, lang);
      const ranks = character.skillRanks[globalIndex] || 0;
      const totalRanks = (character.totalSkillRanks[globalIndex] || 0) + ranks;
      const cost = getSkillDevCost(character.classIndex, globalIndex);
      const costStr = cost ? `${cost.first}/${cost.second}` : '—';
      const statBonus = calcSkillStatBonus(skill, character.stats);
      const statBonusClass = statBonus > 0 ? 'positive' : statBonus < 0 ? 'negative' : 'zero';

      html += `
        <tr data-skill="${globalIndex}">
          <td class="text-gray-300">${name}</td>
          <td class="text-center">
            <div class="flex items-center justify-center gap-1">
              <button class="text-xs px-1 bg-gray-700 rounded hover:bg-gray-600 skill-minus" data-skill="${globalIndex}" ${ranks <= 0 ? 'disabled' : ''}>−</button>
              <span class="w-6 text-center text-amber-300">${ranks}</span>
              <button class="text-xs px-1 bg-gray-700 rounded hover:bg-gray-600 skill-plus" data-skill="${globalIndex}" ${!cost || ranks >= 2 ? 'disabled' : ''}>+</button>
            </div>
          </td>
          <td class="text-center text-gray-500">${costStr}</td>
          <td class="text-center stat-bonus ${statBonusClass}">${statBonus >= 0 ? '+' + statBonus : statBonus}</td>
          <td class="text-center text-gray-300">${totalRanks > 0 ? statBonus + Math.floor(totalRanks * 3) : statBonus}</td>
        </tr>
      `;
      globalIndex++;
    }
  }

  html += `</tbody></table></div>`;
  return panel(t.skills.develop, html);
}

// Step 8: Spells
function renderSpellsStep(t, lang) {
  if (character.realm === 'none') {
    return panel(t.spells.chooseLists, `
      <p class="text-gray-500">Votre personnage n'est pas un lanceur de sorts.</p>
    `);
  }

  const realms = getAllRealms();
  let html = `<div class="scroll-container">`;

  for (const realm of realms) {
    const groupLabels = ['Open', 'Closed', 'Base', 'Training', 'Other'];
    for (let g = 0; g < realm.groups.length; g++) {
      const group = realm.groups[g];
      if (group.length === 0) continue;

      html += `<div class="realm-section">`;
      html += `<div class="realm-title">${realm.name} — ${groupLabels[g] || 'Group ' + g}</div>`;
      html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-1">`;

      for (let s = 0; s < group.length; s++) {
        const spell = group[s];
        const name = lang === 'en' ? spell.name_en : spell.name_fr;
        const isChosen = character.spellLists.some(
          sl => sl.realmIndex === realm.index && sl.groupIndex === g && sl.spellIndex === s
        );
        html += `
          <div class="class-card text-sm py-1 ${isChosen ? 'selected' : ''}"
            data-spell-realm="${realm.index}" data-spell-group="${g}" data-spell-idx="${s}">
            ${name}
          </div>
        `;
      }
      html += `</div></div>`;
    }
  }

  html += `</div>`;
  return panel(t.spells.chooseLists, html);
}

// Event bindings
function bindNavEvents(app) {
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const btnFinish = document.getElementById('btn-finish');

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep < TOTAL_STEPS - 1) {
        currentStep++;
        renderWizard(app);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        renderWizard(app);
      }
    });
  }

  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      currentStep = TOTAL_STEPS - 1;
      renderWizard(app);
    });
  }

  // Step dots clickable for completed steps
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      if (step <= currentStep) {
        currentStep = step;
        renderWizard(app);
      }
    });
    dot.style.cursor = 'pointer';
  });
}

function bindStepEvents(app) {
  switch (currentStep) {
    case 0: bindNameEvents(app); break;
    case 1: bindStatsEvents(app); break;
    case 2: bindClassEvents(app); break;
    case 3: bindRealmEvents(app); break;
    case 4: bindPrimeStatsEvents(app); break;
    case 5: bindWeaponCatsEvents(app); break;
    case 6: bindArmorEvents(app); break;
    case 7: bindSkillsEvents(app); break;
    case 8: bindSpellsEvents(app); break;
  }
}

function bindNameEvents(app) {
  const input = document.getElementById('char-name');
  if (input) {
    input.addEventListener('input', () => {
      character.name = input.value;
    });
    input.focus();
  }
}

let _selectedRollIdx = null;

function bindStatsEvents(app) {
  const btnRoll = document.getElementById('btn-roll-stats');
  if (btnRoll) {
    btnRoll.addEventListener('click', () => {
      rolledStats = rollAllStats();
      assignedStats = new Array(STAT_COUNT).fill(null);
      renderWizard(app);
    });
  }

  const btnReroll = document.getElementById('btn-reroll');
  if (btnReroll) {
    btnReroll.addEventListener('click', () => {
      rolledStats = rollAllStats();
      assignedStats = new Array(STAT_COUNT).fill(null);
      character.stats = new Array(STAT_COUNT).fill(0);
      renderWizard(app);
    });
  }

  // Click on available roll value to select it
  document.querySelectorAll('[data-available="true"]').forEach(el => {
    el.addEventListener('click', () => {
      _selectedRollIdx = parseInt(el.dataset.rollIdx);
      // Highlight selection
      document.querySelectorAll('[data-available="true"]').forEach(e => e.classList.remove('ring-2', 'ring-white'));
      el.classList.add('ring-2', 'ring-white');
    });
  });

  // Click on stat row to assign selected roll
  document.querySelectorAll('.assign-stat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const statIdx = parseInt(btn.dataset.stat);

      if (_selectedRollIdx === null) {
        // Auto-pick first available roll
        const firstAvail = rolledStats.findIndex((_, i) => !assignedStats.includes(i));
        if (firstAvail === -1) return;
        _selectedRollIdx = firstAvail;
      }

      // Unassign previous value at this stat position
      const prevRollIdx = assignedStats.indexOf(statIdx);
      // Actually, assignedStats[statIdx] = rollIdx
      // Let's fix the mapping: assignedStats[statIdx] = rollIdx

      // If stat already has a value, free its roll
      for (let i = 0; i < assignedStats.length; i++) {
        if (assignedStats[i] === statIdx) {
          assignedStats[i] = null;
        }
      }

      // If this roll was assigned elsewhere, clear it
      const existingStatForRoll = assignedStats[_selectedRollIdx];
      if (existingStatForRoll !== null) {
        character.stats[existingStatForRoll] = 0;
      }

      assignedStats[_selectedRollIdx] = statIdx;
      character.stats[statIdx] = rolledStats[_selectedRollIdx];
      _selectedRollIdx = null;
      renderWizard(app);
    });
  });
}

function bindClassEvents(app) {
  const lang = app.lang;
  const t = app.t;

  document.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', () => {
      character.classIndex = parseInt(card.dataset.classIdx);
      // Reset realm when class changes
      character.realm = 'none';
      renderWizard(app);
    });
  });

  // Search
  const searchEl = document.getElementById('class-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      const q = searchEl.value.toLowerCase();
      document.querySelectorAll('.class-card').forEach(card => {
        const name = card.querySelector('.font-bold').textContent.toLowerCase();
        card.style.display = name.includes(q) ? '' : 'none';
      });
    });
  }

  // Filter buttons
  document.querySelectorAll('.class-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      document.querySelectorAll('.class-filter').forEach(b => {
        b.classList.remove('bg-amber-800', 'text-amber-200');
        b.classList.add('bg-gray-700', 'text-gray-300');
      });
      btn.classList.remove('bg-gray-700', 'text-gray-300');
      btn.classList.add('bg-amber-800', 'text-amber-200');

      document.querySelectorAll('.class-card').forEach(card => {
        if (!filter) {
          card.style.display = '';
          return;
        }
        const typeText = card.querySelector('.text-xs').textContent;
        const typeLabel = t.classes[filter];
        card.style.display = typeText === typeLabel ? '' : 'none';
      });
    });
  });
}

function bindRealmEvents(app) {
  document.querySelectorAll('[data-realm]').forEach(card => {
    card.addEventListener('click', () => {
      character.realm = card.dataset.realm;
      renderWizard(app);
    });
  });
}

function bindPrimeStatsEvents(app) {
  document.querySelectorAll('[data-prime-stat]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.primeStat);
      const pos = character.primeStats.indexOf(idx);
      if (pos >= 0) {
        character.primeStats.splice(pos, 1);
      } else if (character.primeStats.length < 2) {
        character.primeStats.push(idx);
      } else {
        // Replace oldest
        character.primeStats.shift();
        character.primeStats.push(idx);
      }
      renderWizard(app);
    });
  });
}

function bindWeaponCatsEvents(app) {
  document.querySelectorAll('[data-weapon-cat]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.weaponCat);
      const pos = character.weaponCategories.indexOf(idx);
      if (pos >= 0) {
        character.weaponCategories.splice(pos, 1);
      } else {
        character.weaponCategories.push(idx);
      }
      renderWizard(app);
    });
  });
}

function bindArmorEvents(app) {
  document.querySelectorAll('[data-armor]').forEach(card => {
    card.addEventListener('click', () => {
      character.armorType = parseInt(card.dataset.armor);
      renderWizard(app);
    });
  });
}

function bindSkillsEvents(app) {
  document.querySelectorAll('.skill-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.skill);
      const current = character.skillRanks[idx] || 0;
      if (current >= 2) return;

      const cost = getSkillDevCost(character.classIndex, idx);
      if (!cost) return;

      const addCost = current === 0 ? cost.first : cost.second;
      const devPts = getBaseDevelopmentPoints();
      if (character.devPointsSpent + addCost > devPts) {
        showToast('Pas assez de points de développement !', true);
        return;
      }

      character.skillRanks[idx] = current + 1;
      character.devPointsSpent += addCost;
      renderWizard(app);
    });
  });

  document.querySelectorAll('.skill-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.skill);
      const current = character.skillRanks[idx] || 0;
      if (current <= 0) return;

      const cost = getSkillDevCost(character.classIndex, idx);
      if (!cost) return;

      const removeCost = current === 2 ? cost.second : cost.first;
      character.skillRanks[idx] = current - 1;
      character.devPointsSpent -= removeCost;
      if (character.devPointsSpent < 0) character.devPointsSpent = 0;
      renderWizard(app);
    });
  });
}

function bindSpellsEvents(app) {
  document.querySelectorAll('[data-spell-realm]').forEach(card => {
    card.addEventListener('click', () => {
      const realmIndex = parseInt(card.dataset.spellRealm);
      const groupIndex = parseInt(card.dataset.spellGroup);
      const spellIndex = parseInt(card.dataset.spellIdx);

      const existing = character.spellLists.findIndex(
        sl => sl.realmIndex === realmIndex && sl.groupIndex === groupIndex && sl.spellIndex === spellIndex
      );

      if (existing >= 0) {
        character.spellLists.splice(existing, 1);
      } else {
        character.spellLists.push({ realmIndex, groupIndex, spellIndex });
      }
      renderWizard(app);
    });
  });
}

export function getCharacter() {
  return character;
}

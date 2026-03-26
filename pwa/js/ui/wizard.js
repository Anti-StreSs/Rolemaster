// Tabbed character editor — all tabs accessible simultaneously
// Profession chosen first, then stats (temp/pot pairs), then everything else

import { panel, showToast } from './components.js';
import { createCharacter, getTotalStatBonus, getStatDev, calcHitPoints, calcPowerPoints, applyRace, DEV_PHASES, getTotalRanks, getCurrentPhaseRanks, getCurrentPhaseRanksObj, getDevPointsSpent, setDevPointsSpent, getDevPointsTotal, getSpellPointsSpent, setSpellPointsSpent, getSpellPointsTotal, SHIELD_TYPES, calculateDB, setAdrenalDefenseIndex, rollBodyDevHitDie, getBodyDevSkillIndex, getDeathThreshold, ARMOR_MANEUVER_PENALTIES, isMovingSkill } from '../engine/character.js';
import { generateStatRolls, getStatValues, statPotentialLookup, generateStatRollsHybrid, generateStatRollsAntiLose, getStatValuesHybrid, rollStatPairsRMSS, getStatBonus, getRankBonus, STAT_COUNT } from '../engine/stats.js';
import { getAllClasses, getClassName, getRealmInfo, getRealmKey, getRealmLabel, isSpellUser, getClassPrimeStats, getPPStatIndices } from '../engine/classes.js';
import { getAllCategories, getSkillName, getSkillDevCost, getSkillStatIndices, getWeaponCategoryCosts, isParentSkill, isSpecializableSkill, getWeaponSubcategories, getWeaponSkillCost, getParentSubSkillOptions, WEAPON_SKILL_GLOBAL_INDEX, getAllSkillsFlat, getLevelBonus, calcSimilarityBonus, getSpecializationSuggestion } from '../engine/skills.js';
import { getAllRealms, getSpellListCost, getSpellRankCost, getSpellBlockSize, getListTypeKey, isPureCaster, getClassBaseSpellLists } from '../engine/spells.js';
import { downloadCharacter, saveToLocalStorage } from '../engine/export.js';
import { generateCharacterPDF } from '../engine/pdf-export.js';
import { logStatRoll, logStatValidate, logSkillDevelop, logSpellSGR,
         logPhaseValidate, logLevelUp, logBgOption, logHpRoll, logStatGain,
         getCharacterHistory } from '../engine/event-log.js';
import { processLevelUpStatGains, statGainLookup } from '../engine/stat_gain.js';
import { generateBackground, getRacialLanguages } from '../engine/background.js';
import { getData } from '../engine/data-loader.js';
import { getBackgroundBonuses, getSkillBackgroundBonus, resolveBackgroundChoice, resolveStatIncrease, summarizeBackgroundBonuses, generateWealthText } from '../engine/background-effects.js';
import { showPrintPreview } from './print-sheet.js';
import { projectProgression } from '../engine/build-compare.js';
import { getOptionalRules, setOptionalRule, resetOptionalRules } from '../engine/optional-rules.js';
import { getWeaponPriorityOrder, WEAPON_TYPE_MAP as WEAPON_TYPE_MAP_ENGINE } from '../engine/npc-generator.js';

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
  { id: 'options', label_fr: 'Règles opt.', label_en: 'Options' },
];

const TAB_ICONS = {
  infos:     'assets/ui/icons/tab_infos_shield.webp',
  stats:     'assets/ui/icons/tab_stats_dice.webp',
  race:      'assets/ui/icons/tab_race_face.webp',
  weapons:   'assets/ui/icons/tab_weapons_sword.webp',
  skills:    'assets/ui/icons/tab_skills_scroll.webp',
  spells:    'assets/ui/icons/tab_spells_book.webp',
  languages: 'assets/ui/icons/tab_languages_globe.webp',
  history:   'assets/ui/icons/tab_history_quill.webp',
  options:   'assets/ui/icons/tab_options_gear.webp',
};

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

function initAdrenalDefense() {
  const cats = getAllCategories();
  let idx = 0;
  for (const cat of cats) {
    for (const skill of cat.skills) {
      if (skill.name_fr && (skill.name_fr.includes('Défense Adrénale') || skill.name_fr.includes('Defense Adrenale'))) {
        setAdrenalDefenseIndex(idx);
        return;
      }
      idx++;
    }
  }
}

export function startWizard(app, forceNew = true) {
  // Initialize skill index caches (body dev, adrenal defense)
  getAllSkillsFlat();
  initAdrenalDefense();

  if (forceNew || !character) {
    character = createCharacter();
    rolledStats = [];
    rollAssignments = new Array(10).fill(-1);
    selectedRoll = -1;
    editMode = false;
    rollingMethod = 'rm2';
    statsValidated = false;
  }
  // Ensure PP stat indices are set from class
  if (character.classIndex >= 0) {
    const cls = getAllClasses()[character.classIndex];
    if (cls) character._ppStatIndices = getPPStatIndices(cls);
  }
  renderEditor(app);
}

export function loadIntoWizard(app, loadedCharacter) {
  character = loadedCharacter;
  // Ensure statLog exists (for characters saved before this feature)
  if (!character.statLog) {
    character.statLog = { method: 'rm2', rerollCount: 0, rolls: [], validated: null, editsAfterValidation: [] };
  }
  // Ensure new fields exist for backward compatibility
  if (!character.spellLog) character.spellLog = [];
  if (!character.spellStudy) character.spellStudy = { listName: null, listType: null, listRealm: null, ranks: 0, sgrDone: false, blockSize: 5, nextBlockStart: 1 };
  if (!character.phases) character.phases = [];
  if (character.phaseValidated === undefined) character.phaseValidated = false;
  rollingMethod = character.statLog.method || 'rm2';
  statsValidated = !!character.statLog.validated;

  // Restore rolling state from saved rawRolls if available
  if (character.rawRolls && character.rawRolls.length === STAT_COUNT && rollingMethod === 'rm2') {
    rolledStats = character.rawRolls.map(r => {
      const temp = r.tempRoll;
      const pot = statPotentialLookup(r.potRoll, temp);
      return { tempRoll: r.tempRoll, potRoll: r.potRoll, temp, pot };
    });
  } else if (character.rawRolls && character.rawRolls.length === STAT_COUNT && (rollingMethod === 'hybrid' || rollingMethod === 'antilose')) {
    const bonus = rollingMethod === 'antilose' ? 10 : 5;
    rolledStats = character.rawRolls.map(r => {
      const temp = r.tempRoll;
      const potRollBoosted = r.potRollBoosted !== undefined ? r.potRollBoosted : Math.min(r.potRoll + bonus, 100);
      const pot = r.forced100 ? 100 : statPotentialLookup(potRollBoosted, temp);
      return { tempRoll: r.tempRoll, potRoll: r.potRoll, potRollBoosted, temp, pot, forced100: !!r.forced100 };
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

  // Initialize caches
  getAllSkillsFlat(); // sets _bodyDevSkillIndex
  initAdrenalDefense();
  if (character.classIndex >= 0) {
    const cls = getAllClasses()[character.classIndex];
    if (cls) character._ppStatIndices = getPPStatIndices(cls);
  }

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
  const nav = document.getElementById('main-nav');
  const footerActions = document.getElementById('app-footer-actions');
  const lang = app.lang;

  // Preserve scroll position of skill list across re-renders
  const scrollEl = main.querySelector('.scroll-container');
  const savedScroll = scrollEl ? scrollEl.scrollTop : 0;

  // Render tab bar with icons into nav
  if (nav) {
    let tabBar = '';
    for (const tab of TABS) {
      const label = lang === 'en' ? tab.label_en : tab.label_fr;
      const active = tab.id === currentTab ? 'active' : '';
      const icon = TAB_ICONS[tab.id] || '';
      tabBar += `<button class="rm-tab-icon ${active}" data-tab="${tab.id}">
        ${icon ? `<img src="${icon}" alt="${label}">` : ''}
        <span>${label}</span>
      </button>`;
    }
    nav.innerHTML = tabBar;
  }

  // Render footer action buttons
  if (footerActions) {
    footerActions.innerHTML = `
      <button class="btn-primary text-sm" id="btn-save-json">${lang === 'en' ? 'Download JSON' : 'Télécharger JSON'}</button>
      <button class="btn-secondary text-sm" id="btn-save-local">${lang === 'en' ? 'Local Save' : 'Sauvegarde locale'}</button>
      <button class="btn-secondary text-sm" id="btn-print">${lang === 'en' ? 'Print' : 'Imprimer'}</button>
      <button class="rm-btn-scroll" id="btn-export-pdf" style="font-size:0.8rem;min-height:2.2rem">
        <img class="rm-btn-icon" src="assets/ui/icons/session_export_scroll.webp" alt="" onerror="this.style.display='none'">
        <span class="rm-spinner" id="pdf-spinner" style="display:none"></span>
        ${lang === 'en' ? 'Export PDF' : 'Export PDF'}
      </button>
    `;
  }

  const content = renderTab(app);
  main.innerHTML = content;
  bindTabEvents(app);
  bindActionEvents();
  bindContentEvents(app);

  // Restore scroll position
  if (savedScroll > 0) {
    const newScrollEl = main.querySelector('.scroll-container');
    if (newScrollEl) newScrollEl.scrollTop = savedScroll;
  }

  // Accordion: only one <details> open at a time
  const allDetails = main.querySelectorAll('details');
  allDetails.forEach(det => {
    det.addEventListener('toggle', () => {
      if (det.open) {
        allDetails.forEach(other => { if (other !== det && other.open) other.open = false; });
      }
    });
  });
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
    case 'options': return renderOptionsTab(app.lang);
    default: return '';
  }
}

// === Tab: Options ===
function renderOptionsTab(lang) {
  return `
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">${lang === 'en' ? 'Optional Rules' : 'Règles optionnelles'}</h2>
        <button class="btn-secondary text-sm" id="btn-reset-options">${lang === 'en' ? 'Reset to defaults' : 'Réinitialiser les défauts'}</button>
      </div>
      <p class="text-xs text-gray-500 mb-3">${lang === 'en' ? 'These settings are global and persist across all characters.' : 'Ces paramètres sont globaux et persistent pour tous les personnages.'}</p>
      <div id="options-content">
        <div class="text-gray-500 text-sm">${lang === 'en' ? 'Loading…' : 'Chargement…'}</div>
      </div>
    </div>
  `;
}

async function bindOptionsEvents(app) {
  const lang = app.lang;
  const container = document.getElementById('options-content');
  if (!container) return;

  // Load and render rules
  const rules = await getOptionalRules();
  let html = '';
  let currentGroup = null;

  for (const rule of rules) {
    if (rule.isHeader) {
      if (currentGroup !== null) html += '</div></details>';
      currentGroup = rule.description_fr;
      const title = lang === 'en' ? (rule.description_en || rule.description_fr) : (rule.description_fr || rule.description_en);
      html += `<details class="panel" style="cursor:pointer;margin-bottom:0.5rem">
        <summary class="panel-title" style="list-style:none">▸ ${title}</summary>
        <div style="margin-top:0.5rem;padding-left:1rem">`;
      continue;
    }

    if (rule.isDisabled) {
      html += `<div class="text-xs text-gray-500" style="margin-bottom:4px;opacity:0.4">${lang === 'en' ? (rule.description_en || rule.description_fr) : (rule.description_fr || rule.description_en)} <span class="text-xs">(non implémenté)</span></div>`;
      continue;
    }

    const desc = lang === 'en' ? (rule.description_en || rule.description_fr) : (rule.description_fr || rule.description_en);
    const ref = rule.reference ? `<span class="text-xs text-gray-500 ml-2">[${rule.reference}]</span>` : '';

    if (rule.type === 1) {
      html += `<div style="margin-bottom:4px"><label class="text-sm" style="cursor:pointer"><input type="checkbox" class="opt-rule-checkbox" data-idx="${rule.index}" ${rule.currentValue > 0 ? 'checked' : ''}> ${desc}${ref}</label></div>`;
    } else if (rule.type === 2) {
      html += `<div style="margin-bottom:4px"><label class="text-sm" style="cursor:pointer;${rule.currentValue >= 0 ? 'font-weight:bold' : 'opacity:0.7'}"><input type="radio" name="opt-group-${encodeURIComponent(rule.groupHeader || 'default')}" class="opt-rule-radio" data-idx="${rule.index}" ${rule.currentValue >= 0 ? 'checked' : ''}> ${desc}${ref}</label></div>`;
    } else if (rule.type === 3) {
      html += `<div style="margin-bottom:4px"><label class="text-sm" style="cursor:pointer"><input type="checkbox" class="opt-rule-checkbox" data-idx="${rule.index}" ${rule.currentValue >= 0 ? 'checked' : ''}> ${desc}${ref}</label></div>`;
    } else if (rule.type === 8 || rule.type === 9) {
      html += `<div style="margin-bottom:4px;display:flex;align-items:center;gap:0.5rem"><span class="text-sm">${desc}${ref}</span><input type="number" class="field field-sm opt-rule-numeric" data-idx="${rule.index}" value="${rule.currentValue >= 0 ? rule.currentValue : ''}" style="width:4rem;text-align:center"></div>`;
    }
  }

  if (currentGroup !== null) html += '</div></details>';
  container.innerHTML = html;

  // Checkboxes
  container.querySelectorAll('.opt-rule-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      await setOptionalRule(parseInt(cb.dataset.idx), cb.checked ? 1 : -1);
    });
  });

  // Radio buttons — deactivate siblings, activate selected
  container.querySelectorAll('.opt-rule-radio').forEach(rb => {
    rb.addEventListener('change', async () => {
      const groupName = rb.name;
      const siblings = container.querySelectorAll(`input[name="${groupName}"]`);
      for (const other of siblings) {
        if (other !== rb) await setOptionalRule(parseInt(other.dataset.idx), -1);
      }
      await setOptionalRule(parseInt(rb.dataset.idx), 1);
    });
  });

  // Numeric inputs
  container.querySelectorAll('.opt-rule-numeric').forEach(input => {
    input.addEventListener('change', async () => {
      const val = parseInt(input.value);
      await setOptionalRule(parseInt(input.dataset.idx), isNaN(val) ? -1 : val);
    });
  });

  // Reset button
  document.getElementById('btn-reset-options')?.addEventListener('click', async () => {
    if (confirm(lang === 'en' ? 'Reset all rules to defaults?' : 'Réinitialiser toutes les règles ?')) {
      await resetOptionalRules();
      renderEditor(app);
    }
  });
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

  // RM 20 Armor Types (AT 1-20) from price chart + RM2 text
  // AT 1-4: No Armor (skin/clothing/natural hide)
  // AT 5-8: Soft Leather, AT 9-12: Rigid Leather, AT 13-16: Chain, AT 17-20: Plate
  const AT = lang === 'en' ? [
    /*1*/ 'Skin / No Armor',            /*2*/ 'Normal Clothing / Robes',   /*3*/ 'Light Hide',          /*4*/ 'Heavy Hide / Scales',
    /*5*/ 'Leather Jerkin',             /*6*/ 'Leather Coat',              /*7*/ 'Reinforced Leather Coat', /*8*/ 'Full Reinforced Leather',
    /*9*/ 'Leather Breastplate',        /*10*/ 'Cuirbouilli / Studded',    /*11*/ 'Brigandine / Lamellar',  /*12*/ 'Laminated Leather',
    /*13*/ 'Chain Shirt',               /*14*/ 'Chain Shirt + Greaves',    /*15*/ 'Full Chain',             /*16*/ 'Chain Hauberk',
    /*17*/ 'Metal Breastplate',         /*18*/ 'Breastplate + Greaves',    /*19*/ 'Half Plate',             /*20*/ 'Full Plate',
  ] : [
    /*1*/ 'Peau / Sans armure',         /*2*/ 'Vêtements / Robes',         /*3*/ 'Peau légère (animal)',    /*4*/ 'Peau lourde / Écailles',
    /*5*/ 'Pourpoint de cuir',          /*6*/ 'Manteau de cuir',           /*7*/ 'Manteau de cuir renforcé', /*8*/ 'Cuir renforcé complet',
    /*9*/ 'Plastron de cuir rigide',    /*10*/ 'Cuir bouilli / Clouté',    /*11*/ 'Brigandine / Lamellaire', /*12*/ 'Cuir laminé',
    /*13*/ 'Chemise de mailles',        /*14*/ 'Mailles + Jambières',      /*15*/ 'Cotte de mailles',       /*16*/ 'Haubert de mailles',
    /*17*/ 'Plastron métallique',       /*18*/ 'Plastron + Jambières',     /*19*/ 'Demi-plates',            /*20*/ 'Plates complètes',
  ];
  const atCatStart = { 1: lang === 'en' ? '── No Armor ──' : '── Sans armure ──', 5: lang === 'en' ? '── Soft Leather ──' : '── Cuir souple ──', 9: lang === 'en' ? '── Rigid Leather ──' : '── Cuir rigide ──', 13: lang === 'en' ? '── Chain ──' : '── Mailles ──', 17: lang === 'en' ? '── Plate ──' : '── Plates ──' };
  let armorOptions = '';
  for (let at = 1; at <= 20; at++) {
    if (atCatStart[at]) armorOptions += `<option disabled class="text-gray-600">${atCatStart[at]}</option>`;
    const sel = at === character.armorType ? 'selected' : '';
    armorOptions += `<option value="${at}" ${sel}>AT ${at}: ${AT[at - 1]}</option>`;
  }

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

        <div class="mt-4 flex gap-6 text-center flex-wrap">
          <div>
            <div class="text-2xl font-bold text-red-400">${hp.base}</div>
            <div class="text-xs text-gray-500">${lang === 'en' ? 'HP Base' : 'PdC Base'}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-red-400">${hp.cap}</div>
            <div class="text-xs text-gray-500">${lang === 'en' ? 'HP Max' : 'PdC Max'}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-500" style="border-bottom:1px solid #8b6914;min-width:3rem">___</div>
            <div class="text-xs text-gray-500">${lang === 'en' ? 'Current HP' : 'PdC Actuels'}</div>
          </div>
          <div title="${lang === 'en' ? 'RM2: character dies at negative HP equal to CO temp' : 'RM2 : le personnage meurt quand ses PdC atteignent ce seuil négatif'}">
            <div class="text-2xl font-bold text-red-700">${getDeathThreshold(character)}</div>
            <div class="text-xs text-gray-500">${lang === 'en' ? 'Death at' : 'Mort à'}</div>
          </div>
          ${character.realm !== 'none' ? `
          <div>
            <div class="text-2xl font-bold text-blue-400">${pp}</div>
            <div class="text-xs text-gray-500">${lang === 'en' ? 'Power Points' : 'Pts de Pouvoir'}</div>
          </div>` : ''}
        </div>

        <div class="mt-4 no-print border-t border-gray-700 pt-3">
          <button class="btn-primary text-sm" id="btn-level-up" ${!character.phaseValidated ? 'disabled title="' + (lang === 'en' ? 'Validate current phase first' : 'Validez d\'abord la phase en cours') + '"' : ''}>${lang === 'en' ? 'Level Up' : 'Monter de niveau'}</button>
          <span class="text-xs text-gray-500 ml-2">${getPhaseLabel(character, lang)}${character.phaseValidated ? ` — <span class="text-green-500">${lang === 'en' ? 'validated' : 'validé'}</span>` : ''}</span>
          ${character._lastStatGains ? renderStatGainsResult(lang) : ''}
        </div>
      `)}

      ${panel(lang === 'en' ? 'Identity' : 'Identité', `
        <div class="info-grid">
          <label>Nom</label>
          <input type="text" id="f-name" value="${esc(character.name)}" class="field" placeholder="Nom du personnage">

          <label>Race</label>
          <select id="f-race" class="field">${raceOptions}</select>
        </div>
        <p class="text-xs text-gray-600 mt-2">${lang === 'en' ? 'Physical description in History tab' : 'Description physique dans l\'onglet Historique'}</p>
      `)}

      ${(() => {
        const shieldOptions = SHIELD_TYPES.map(s =>
          `<option value="${s.id}" ${character.shieldType === s.id ? 'selected' : ''}>${lang === 'en' ? s.en : s.fr}</option>`
        ).join('');
        const db = calculateDB(character);
        return panel(lang === 'en' ? 'Armor & Defense' : 'Armure & Défense', `
          <div class="info-grid">
            <label>${lang === 'en' ? 'Armor Type (AT)' : 'Type d\'Armure (TA)'}</label>
            <select id="f-armor" class="field">${armorOptions}</select>

            <label>${lang === 'en' ? 'Shield' : 'Bouclier'}</label>
            <select id="f-shield" class="field">${shieldOptions}</select>

            <label>${lang === 'en' ? 'Item DB bonus' : 'BD objets'}</label>
            <input type="number" id="f-db-item-bonus" value="${character.dbItemBonus || 0}" class="field field-sm" title="${lang === 'en' ? 'DB bonus from magical items' : 'Bonus BD objets magiques'}">

            <label title="${lang === 'en' ? 'Reduces armor maneuver penalties on moving skills (positive = better)' : 'Réduit les malus de manœuvre armure sur les compétences de mouvement (positif = meilleur)'}">${lang === 'en' ? 'Armor magic bonus' : 'Bonus magique armure'}</label>
            <input type="number" id="f-armor-magic" value="${character.armorMagicBonus || 0}" class="field field-sm" title="${lang === 'en' ? 'Reduces armor maneuver penalties on moving skills' : 'Réduit les malus armure sur compétences de mouvement'}">

            <label>${lang === 'en' ? 'DB Melee' : 'BD Mélée'}</label>
            <span class="text-sm"><b>${db.meleeBD}</b> <span class="text-xs text-gray-500">(RP:${db.rpBonus}${db.shieldMelee ? ' +Bcl:' + db.shieldMelee : ''}${db.adrenalMelee ? ' +Adr:' + db.adrenalMelee : ''}${db.itemBonus ? ' +Obj:' + db.itemBonus : ''})</span></span>

            <label>${lang === 'en' ? 'DB Missile' : 'BD Projectiles'}</label>
            <span class="text-sm"><b>${db.missileBD}</b> <span class="text-xs text-gray-500">(RP:${db.rpBonus}${db.shieldMissile ? ' +Bcl:' + db.shieldMissile : ''}${db.adrenalMissile ? ' +Adr:' + db.adrenalMissile : ''}${db.itemBonus ? ' +Obj:' + db.itemBonus : ''})</span></span>
          </div>
        `);
      })()}

      ${panel(lang === 'en' ? 'Portrait' : 'Portrait', `
        <div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <label style="font-size:0.8rem;color:#6b5030">${lang === 'en' ? 'Upload image or paste URL' : 'Télécharger une image ou coller un lien'}</label>
            <input type="file" id="portrait-upload" accept="image/*" style="display:block;margin:0.5rem 0;font-size:0.8rem">
            <input type="text" id="portrait-url" class="field" value="${esc(character.portraitUrl && !character.portraitUrl.startsWith('data:') ? character.portraitUrl : '')}" placeholder="https://..." style="font-size:0.8rem">
            ${character.portraitUrl ? `<button class="btn-secondary text-xs" id="portrait-clear" style="margin-top:0.5rem">${lang === 'en' ? 'Remove' : 'Supprimer'}</button>` : ''}
          </div>
          ${character.portraitUrl ? `<div style="flex-shrink:0"><img src="${esc(character.portraitUrl)}" alt="Portrait" style="max-width:120px;max-height:160px;border-radius:4px;border:1px solid rgba(139,92,20,0.3)"></div>` : ''}
        </div>
      `)}

      ${(() => {
        const mb = character.manualBonuses || {};
        const fields = [
          ['dbItem', lang === 'en' ? 'DB (items)' : 'BD (objets)'],
          ['obItem', lang === 'en' ? 'OB (items)' : 'BO (objets)'],
          ['ppBonus', lang === 'en' ? 'PP bonus' : 'PP (bonus)'],
          ['hpBonus', lang === 'en' ? 'HP bonus' : 'PdC (bonus)'],
          ['rrEssence', lang === 'en' ? 'RR Essence' : 'JR Essence'],
          ['rrChanneling', lang === 'en' ? 'RR Channeling' : 'JR Théurgie'],
          ['rrMentalism', lang === 'en' ? 'RR Mentalism' : 'JR Mentalisme'],
          ['rrPoison', lang === 'en' ? 'RR Poison' : 'JR Poison'],
          ['rrDisease', lang === 'en' ? 'RR Disease' : 'JR Maladie'],
        ];
        let grid = '<div style="display:grid;grid-template-columns:repeat(2,auto 4rem);gap:0.3rem 0.75rem;align-items:center">';
        for (const [key, label] of fields) {
          grid += `<label style="font-size:0.8rem;text-align:right">${label}</label>
            <input type="number" class="field-inline manual-bonus-input" data-mb-key="${key}" value="${mb[key] || ''}" style="width:3.5rem">`;
        }
        grid += '</div>';
        grid += `<div style="margin-top:0.5rem"><label style="font-size:0.8rem">Notes</label>
          <input type="text" id="mb-notes" class="field" value="${esc(mb.miscNotes || '')}" placeholder="${lang === 'en' ? 'Ring +10 DB, Boots +5...' : 'Anneau +10 BD, Bottes +5...'}" style="font-size:0.8rem;width:100%"></div>`;
        return `<details class="panel" style="cursor:pointer"><summary class="panel-title" style="list-style:none">${lang === 'en' ? '▸ Manual bonuses (items / background / GM)' : '▸ Bonus manuels (objets / historique / MJ)'}</summary><div style="margin-top:0.75rem">${grid}</div></details>`;
      })()}

      ${(() => {
        const bgBonuses = getBackgroundBonuses(character);
        const bgSummaryLines = summarizeBackgroundBonuses(bgBonuses, lang === 'en' ? 'en' : 'fr');
        if (bgSummaryLines.length === 0) return '';
        return `<details class="panel" style="cursor:pointer">
          <summary class="panel-title" style="list-style:none">${lang === 'en' ? '▸ Background bonuses' : '▸ Bonus d\'historique'}</summary>
          <div style="margin-top:0.75rem">
            ${bgSummaryLines.map(l => `<div class="text-xs" style="margin-bottom:2px">${l}</div>`).join('')}
            ${bgBonuses.unresolvedChoices.length > 0 ? `<div class="text-xs text-amber-400 mt-2">⚠ ${bgBonuses.unresolvedChoices.length} choix non résolus — allez dans l'onglet Historique</div>` : ''}
          </div>
        </details>`;
      })()}

      <details class="panel no-print" id="projection-panel" style="cursor:pointer">
        <summary class="panel-title" style="list-style:none">${lang === 'en' ? '▸ Progression projection' : '▸ Projection de progression'}</summary>
        <div style="margin-top:0.75rem">
          <p class="text-xs text-amber-400 font-bold mb-2">⚠ ${lang === 'en' ? 'SIMULATION — does not modify the character' : 'SIMULATION — ne modifie pas le personnage'}</p>
          <div class="flex items-center gap-3 mb-3">
            <label class="text-sm">${lang === 'en' ? 'Target level:' : 'Niveau cible :'}</label>
            <input type="number" id="proj-target-level" min="${character.level + 1}" max="20" value="${Math.min(character.level + 5, 20)}" class="field field-sm" style="width:4rem">
            <button class="btn-secondary text-sm" id="btn-project">${lang === 'en' ? 'Simulate' : 'Simuler'}</button>
          </div>
          <div id="proj-result" class="text-xs font-mono" style="max-height:200px;overflow-y:auto"></div>
        </div>
      </details>
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
    <div class="flex flex-wrap items-center gap-3 mb-3 no-print">
      <span class="text-gray-500 text-sm">${lang === 'en' ? 'Method:' : 'Méthode :'}</span>
      <label class="text-sm cursor-pointer ${canChangeMethod ? '' : 'opacity-50'}">
        <input type="radio" name="roll-method" value="rm2" ${rollingMethod === 'rm2' ? 'checked' : ''} ${canChangeMethod ? '' : 'disabled'}> RM2 (Roots)
      </label>
      <label class="text-sm cursor-pointer ${canChangeMethod ? '' : 'opacity-50'}">
        <input type="radio" name="roll-method" value="rmss" ${rollingMethod === 'rmss' ? 'checked' : ''} ${canChangeMethod ? '' : 'disabled'}> RMSS (Heroes)
      </label>
      <label class="text-sm cursor-pointer ${canChangeMethod ? '' : 'opacity-50'}" title="${lang === 'en' ? 'RM2 table + pot roll +5 bonus. If no pot > 91, first pair gets pot=100' : 'Table RM2 + bonus +5 au tirage POT. Si aucun POT > 91, le 1er couple reçoit POT=100'}">
        <input type="radio" name="roll-method" value="hybrid" ${rollingMethod === 'hybrid' ? 'checked' : ''} ${canChangeMethod ? '' : 'disabled'}> Hybride (Real)
      </label>
      <label class="text-sm cursor-pointer ${canChangeMethod ? '' : 'opacity-50'}" title="${lang === 'en' ? 'RM2 table + pot roll +10 bonus. Weakest pot is always set to 100' : 'Table RM2 + bonus +10 au tirage POT. Le POT le plus faible est toujours remplacé par 100'}">
        <input type="radio" name="roll-method" value="antilose" ${rollingMethod === 'antilose' ? 'checked' : ''} ${canChangeMethod ? '' : 'disabled'}> Anti-Lose
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

      // RM2/Hybrid: show temp(pot), RMSS: show temp/pot
      const isRM2Style = rollingMethod !== 'rmss';
      const sep1 = isRM2Style ? '(' : '/';
      const sep2 = isRM2Style ? ')' : '';
      const forced = (rollingMethod === 'hybrid' || rollingMethod === 'antilose') && roll.forced100 ? ' ★' : '';

      rollHtml += `
        <button class="${chipClass}" data-roll="${r}" ${assigned ? 'title="→ ' + assignedTo + '"' : ''}>
          <span class="pair-temp">${roll.temp}</span>
          <span class="pair-sep">${sep1}</span>
          <span class="pair-pot">${roll.pot}</span>
          ${sep2 ? `<span class="pair-sep">${sep2}</span>` : ''}${forced}
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

  const projHtml = renderProjectionSection(lang);
  return panel(
    lang === 'en' ? 'Characteristics — Temp / Pot / Bonuses' : 'Caractéristiques — Temp / Pot / Bonus',
    methodHtml + rollHtml + table + logHtml + projHtml
  );
}

/**
 * Render the audit log as a collapsible section.
 */
function renderStatLog(lang) {
  const log = character.statLog;
  const methodLabels = { rm2: 'RM2 (Roots)', rmss: 'RMSS (Heroes)', hybrid: 'Hybride (Real)', antilose: 'Anti-Lose' };
  const methodLabel = methodLabels[log.method] || log.method;
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
      } else if (log.method === 'hybrid' || log.method === 'antilose') {
        const bonus = log.method === 'antilose' ? 10 : 5;
        html += entry.rollData.map((r, i) => {
          const boosted = r.potRollBoosted !== undefined ? r.potRollBoosted : Math.min((r.potRoll || 0) + bonus, 100);
          const f = r.forced100 ? ' ★' : '';
          return `${i + 1}: d100=${r.tempRoll},${r.potRoll}+${bonus}=${boosted} → ${r.temp}(${r.pot})${f}`;
        }).join(' | ');
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

  html += `<div class="mt-3 no-print">
    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.85rem;color:#9ca3af">
      <input type="checkbox" id="chk-manual-stat-gain" ${character.manualStatGains ? 'checked' : ''}>
      ${lang === 'en' ? 'Roll stat gains manually at level-up (Table 05-02)' : 'Lancer les gains de caractéristiques manuellement à la montée de niveau (Table 05-02)'}
    </label>
  </div>`;

  return html;
}

// === Progression projection helpers ===

/**
 * Compute projected HP/PP/DB curves from level 1 to targetLevel.
 * HP uses actual bodyDevRolls for current levels, average rolls for future.
 * PP scales linearly via calcPowerPoints with level override.
 * DB is flat (QU-bonus based, not level-based).
 */
function buildProjectionCurves(targetLevel) {
  if (!character.stats || character.stats[0] <= 0) return null;
  const dieStr = character.raceHitDie || '1-10';
  const match = dieStr.match(/1-(\d+)/);
  const dieMax = match ? parseInt(match[1]) : 10;
  const avgRoll = (dieMax + 1) / 2;
  const currentLevel = character.level || 1;
  const currentRolls = character.bodyDevRolls || [];
  const dbResult = calculateDB(character);
  const flatDB = dbResult.meleeBD || 0;

  const hpPoints = [], ppPoints = [], dbPoints = [];
  for (let L = 1; L <= targetLevel; L++) {
    // Simulate body dev rolls: actual for past/current levels, avg for future
    let projectedRolls;
    if (L <= currentLevel) {
      // Keep only a proportional slice of current rolls for earlier levels
      const fraction = Math.floor(currentRolls.length * L / currentLevel);
      projectedRolls = currentRolls.slice(0, fraction);
    } else {
      projectedRolls = [...currentRolls, ...Array(L - currentLevel).fill(avgRoll)];
    }
    const projChar = { ...character, level: L, bodyDevRolls: projectedRolls };
    hpPoints.push(calcHitPoints(projChar).base);
    ppPoints.push(calcPowerPoints(projChar));
    dbPoints.push(flatDB);
  }
  return { hpPoints, ppPoints, dbPoints };
}

/** Build SVG polyline content for the sparkline card. */
function buildSparklineSVG(curves) {
  const W = 480, H = 120, PAD = 6;
  const maxVal = Math.max(...curves.hpPoints, ...curves.ppPoints, 10);
  const n = curves.hpPoints.length;
  function toPoints(arr) {
    return arr.map((v, i) => {
      const x = n <= 1 ? W / 2 : (i / (n - 1)) * W;
      const y = H - PAD - Math.max(0, v / maxVal) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
  let svg = `<polyline class="rm-line-hp" points="${toPoints(curves.hpPoints)}"/>`;
  if (curves.ppPoints.some(v => v > 0)) {
    svg += `<polyline class="rm-line-pp" points="${toPoints(curves.ppPoints)}"/>`;
  }
  if (curves.dbPoints[0] > 0) {
    svg += `<polyline class="rm-line-db" points="${toPoints(curves.dbPoints)}"/>`;
  }
  return svg;
}

/** Render the projection section for the Stats tab (no-print). */
function renderProjectionSection(lang) {
  const hasStats = character.stats && character.stats[0] > 0;
  if (!hasStats) {
    return `<section class="rm-projection-box mt-4 no-print">
      <p style="color:#9ca3af;font-size:0.8rem">${lang === 'en' ? 'Roll and validate stats to see projections.' : 'Lancez et validez les caractéristiques pour voir les projections.'}</p>
    </section>`;
  }
  const currentLvl = character.level || 1;
  const defaultTarget = Math.min(Math.max(currentLvl + 10, 15), 50);
  const curves = buildProjectionCurves(defaultTarget);
  const svgContent = buildSparklineSVG(curves);
  const hp = curves.hpPoints[curves.hpPoints.length - 1].toFixed(0);
  const pp = curves.ppPoints[curves.ppPoints.length - 1].toFixed(0);
  const db = curves.dbPoints[curves.dbPoints.length - 1];
  const hasRealm = character.realm && character.realm !== 'none';

  return `
    <section class="rm-projection-box mt-4 no-print" id="projection-section">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
        <div>
          <h3 class="rm-sheet-title" style="font-size:0.95rem">${lang === 'en' ? 'Progression Projection' : 'Projection de progression'}</h3>
          <p style="color:#6b5030;font-size:0.72rem;margin:0">${lang === 'en' ? 'Estimated values — simulation only.' : 'Valeurs estimées — simulation uniquement.'}</p>
        </div>
        <span class="rm-sim-badge">${lang === 'en' ? 'Simulation' : 'Simulation'}</span>
      </div>
      <div class="rm-projection-controls">
        <div style="display:flex;flex-direction:column;gap:0.2rem">
          <label class="rm-field-label" for="projection-level" style="font-size:0.72rem">${lang === 'en' ? 'Target level' : 'Niveau cible'}</label>
          <input id="projection-level" type="range" min="${currentLvl}" max="50" value="${defaultTarget}" style="width:100%;accent-color:#8b6914">
        </div>
        <output id="projection-level-out" style="font-family:'Cinzel',serif;font-weight:700;color:#4f3113;font-size:0.9rem;white-space:nowrap">${lang === 'en' ? 'Lv.' : 'Niv.'} ${defaultTarget}</output>
      </div>
      <div class="rm-sparkline-card">
        <svg class="rm-sparkline" viewBox="0 0 480 120" role="img" id="projection-svg" aria-label="${lang === 'en' ? 'HP, PP and DB progression' : 'Progression PdC, PM et DB'}">
          ${svgContent}
        </svg>
        <div style="display:flex;gap:1.25rem;margin-top:0.5rem;font-size:0.75rem;flex-wrap:wrap">
          <span style="color:#8b2500">&#9679; ${lang === 'en' ? 'HP' : 'PdC'}: <strong id="proj-hp">${hp}</strong></span>
          ${hasRealm ? `<span style="color:#5b3aa6">&#9679; ${lang === 'en' ? 'PP' : 'PM'}: <strong id="proj-pp">${pp}</strong></span>` : ''}
          <span style="color:#355f23">&#9679; DB: <strong id="proj-db">${db}</strong></span>
        </div>
      </div>
    </section>`;
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
  table += `<th class="text-center">${lang === 'en' ? 'Hit Die' : 'Dé vie'}</th><th class="text-center">Max PC</th>
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
    table += `<td class="text-center text-xs">${race.hit_die || '—'}</td>`;
    table += `<td class="text-center text-xs">${race.max_pc || '—'}</td>`;
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
      autoFillBackground(race);
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

/**
 * Auto-fill background fields when a race is selected.
 * Generates size, appearance, age based on race and current sex.
 * Also sets racial languages.
 */
function autoFillBackground(race) {
  if (!race) return;
  const sex = character.sex === 'Féminin' || character.sex === 'F' ? 'F' : 'M';
  const bg = generateBackground(race.name, sex);
  character.height = bg.height;
  character.weight = bg.weight;
  character.hair = bg.hair;
  character.eyes = bg.eyes;
  character.appearance = String(bg.appearance);
  character.age = bg.age;
  if (!character.sex) character.sex = bg.sex;

  // Set racial languages (free ranks)
  const racialLangs = getRacialLanguages(race.name);
  // Only auto-fill if languages are empty (don't overwrite manual entries)
  if (character.languages.length === 0) {
    character.languages = racialLangs;
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
      const cls = getAllClasses()[character.classIndex];
      const order = cls ? getWeaponPriorityOrder(cls, character.stats) : WEAPON_CATEGORIES.map(w => w.id);
      const remaining = order.filter(id => !character.weaponPriorities.includes(id));
      for (let s = 0; s < 6; s++) {
        if (character.weaponPriorities[s] === null && remaining.length > 0) {
          character.weaponPriorities[s] = remaining.shift();
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
  const dpTotal = getDevPointsTotal(character);
  const dpSpent = getDevPointsSpent(character);
  const dpRemaining = dpTotal - dpSpent;
  const spellLocked = !!character.phaseValidated;

  if (cls && !isSpellUser(cls)) {
    return panel(lang === 'en' ? 'Spell Lists' : 'Listes de Sorts', `
      <p class="text-gray-500">${lang === 'en' ? 'This character is not a spell user.' : 'Ce personnage n\'est pas un lanceur de sorts.'} (${getRealmLabel(cls, lang)})</p>
    `);
  }

  // Ensure spellStudy exists
  if (!character.spellStudy) character.spellStudy = { listName: null, listType: null, listRealm: null, ranks: 0, sgrDone: false, blockSize: 5, nextBlockStart: 1 };
  const study = character.spellStudy;
  const rankCost = getSpellRankCost(cls);

  // DP header
  let header = `<div class="flex justify-between items-center mb-3">
    <span class="text-gray-400 text-sm">${lang === 'en' ? 'Dev Points remaining:' : 'Points de dév restants :'} </span>
    <span>
      <span class="${dpRemaining <= 0 ? 'text-red-400' : 'text-amber-300'} font-bold text-lg">${dpRemaining}</span>
      <span class="text-gray-500"> / ${dpTotal}</span>
      <span class="text-xs text-gray-600 ml-2">(${lang === 'en' ? 'rank cost' : 'coût/rang'}: ${rankCost})</span>
    </span>
  </div>`;

  // === CURRENT STUDY SECTION ===
  let studyHtml = '';
  if (study.listName) {
    const sgrBonus = study.ranks * 5;
    const sgrChance = Math.min(100, sgrBonus); // D100 + bonus ≥ 101
    const blockEnd = study.nextBlockStart + study.blockSize - 1;
    const autoLearn = study.ranks >= 20;

    // Rank boxes display (20 max)
    let rankBoxes = '<span class="rank-boxes">';
    for (let r = 0; r < 20; r++) {
      rankBoxes += `<span class="rank-box ${r < study.ranks ? 'filled' : ''}">${r < study.ranks ? '■' : '□'}</span>`;
    }
    rankBoxes += '</span>';

    const typeColors = { base_own: 'text-green-400', open: 'text-blue-400', closed: 'text-yellow-400', other: 'text-gray-400' };
    const typeLabels = { base_own: 'Base', open: 'Libre', closed: 'Réservée', other: 'Autre' };
    const tColor = typeColors[study.listType] || 'text-gray-400';
    const tLabel = typeLabels[study.listType] || study.listType;

    studyHtml = `<div class="panel mb-4" style="border-left-color: var(--color-purple)">
      <div class="text-purple-300 font-bold mb-2">${lang === 'en' ? 'Studying' : 'Étude en cours'} : ${esc(study.listName)} <span class="text-xs ${tColor}">[${tLabel}]</span></div>
      <div class="text-xs text-gray-600 mb-2" title="Spell Gain Roll — Character Law 7.4">SGR = Spell Gain Roll</div>
      <div class="mb-2">${rankBoxes} <span class="text-xs text-gray-400 ml-1">${study.ranks}/20</span></div>
      ${autoLearn
        ? `<div class="text-green-400 font-bold mb-2">${lang === 'en' ? 'Auto-learned!' : 'Appris automatiquement !'} ${lang === 'en' ? 'Levels' : 'Niveaux'} ${study.nextBlockStart}-${blockEnd}</div>`
        : `<div class="text-xs text-gray-400 mb-2"><span class="text-purple-400" title="Spell Gain Roll">SGR</span> = D100 + ${sgrBonus} → ${lang === 'en' ? 'success if' : 'succès si'} ≥ 101 (${lang === 'en' ? 'chance' : 'chance'}: ${sgrChance}%) — ${lang === 'en' ? 'Next block' : 'Bloc suivant'}: ${lang === 'en' ? 'levels' : 'niveaux'} ${study.nextBlockStart}-${blockEnd}</div>`
      }
      <div class="flex gap-2 flex-wrap no-print">
        ${!spellLocked && !autoLearn ? `<button class="btn-primary text-xs" id="btn-spell-rank" ${dpRemaining < rankCost || study.ranks >= 20 ? 'disabled' : ''}>+ ${lang === 'en' ? 'Rank' : 'Rang'} (${rankCost} PD)</button>` : ''}
        ${!spellLocked && study.ranks > 0 && !autoLearn && !study.sgrDone ? `<button class="btn-primary text-xs" id="btn-spell-sgr" style="background:linear-gradient(135deg,#5b21b6,#7c3aed)" title="Spell Gain Roll">SGR (D100+${sgrBonus})</button>` : ''}
        ${!spellLocked && study.ranks > 0 && study.sgrDone && !autoLearn ? `<button class="btn-secondary text-xs" id="btn-spell-sgr-table" title="${lang === 'en' ? 'Re-roll (table roll) — logged as extra roll' : 'Relancer (jet sur table) — journalisé comme jet supplémentaire'}">🎲 ${lang === 'en' ? 'Table roll' : 'Jet sur table'} (D100+${sgrBonus})</button>` : ''}
        ${autoLearn ? `<button class="btn-primary text-xs" id="btn-spell-confirm-auto" style="background:#16a34a">${lang === 'en' ? 'Confirm learning' : 'Confirmer l\'apprentissage'}</button>` : ''}
        ${!spellLocked ? `<button class="btn-secondary text-xs" id="btn-spell-abandon">${lang === 'en' ? 'Abandon' : 'Abandonner'}</button>` : ''}
      </div>
    </div>`;
  }

  // === SPELL LISTS (learned + added but not yet learned) ===
  const isPure = isPureCaster(cls);
  let learnedHtml = '';
  if (character.spellLists.length > 0) {
    const tColors = { base_own: 'text-green-400', open: 'text-blue-400', closed: 'text-yellow-400', other: 'text-gray-400' };
    const tLabels = { base_own: 'Base', open: 'Libre', closed: 'Réservée', other: 'Autre' };
    let learnedRows = '';
    character.spellLists.forEach((sl, i) => {
      const isStudying = study.listName === sl.name;
      const canStudy = !spellLocked && !study.listName;
      const hasLevels = sl.maxLevel > 0;
      const slBlockSize = getSpellBlockSize(cls, sl.type || 'other');
      const nextStart = (sl.maxLevel || 0) + 1;
      const nextEnd = nextStart + slBlockSize - 1;
      learnedRows += `<tr class="${isStudying ? 'text-purple-300' : ''}">
        <td class="text-gray-300">${esc(sl.name)} <span class="text-xs ${tColors[sl.type] || 'text-gray-500'}">[${tLabels[sl.type] || sl.type || ''}]</span></td>
        <td class="text-center text-xs text-gray-500">${rankCost}</td>
        <td class="text-center text-xs text-gray-500">${slBlockSize}</td>
        <td class="text-center ${hasLevels ? 'text-green-400 font-bold' : 'text-gray-600'}">${hasLevels ? `1-${sl.maxLevel}` : '—'}</td>
        <td class="text-center text-xs text-purple-400">${nextStart}-${nextEnd}</td>
        <td>
          ${isStudying ? `<span class="text-xs text-purple-400">◆ ${lang === 'en' ? 'studying' : 'en étude'}</span>` : ''}
          ${canStudy ? `<button class="text-xs text-purple-400 hover:text-purple-300 spell-study-list" data-idx="${i}">${hasLevels ? (lang === 'en' ? 'Next block' : 'Bloc suivant') : (lang === 'en' ? 'Study' : 'Étudier')}</button>` : ''}
          ${!spellLocked && !isStudying ? `<button class="text-xs ${sl.type === 'base_own' ? 'text-green-400' : 'text-gray-600 hover:text-green-400'} ml-1 spell-toggle-base" data-idx="${i}" title="${lang === 'en' ? 'Toggle base list (10 lvl blocks for pure casters)' : 'Basculer liste de base (blocs de 10 niv pour lanceurs purs)'}">♦</button>` : ''}
          ${!spellLocked && !isStudying ? `<button class="text-red-400 hover:text-red-300 text-xs ml-1 spell-remove-list" data-idx="${i}">✕</button>` : ''}
        </td>
      </tr>`;
    });
    learnedHtml = `<div class="mb-4">
      <div class="text-sm text-gray-400 mb-1">${lang === 'en' ? 'Spell lists' : 'Listes de sorts'}</div>
      <table class="skill-table"><thead><tr>
        <th>${lang === 'en' ? 'List' : 'Liste'}</th>
        <th class="text-center w-10" title="${lang === 'en' ? 'DP per rank' : 'PD par rang'}">${lang === 'en' ? '$/rk' : 'PD/rg'}</th>
        <th class="text-center w-10" title="${lang === 'en' ? 'Levels per block' : 'Niveaux par bloc'}">${lang === 'en' ? 'Blk' : 'Bloc'}</th>
        <th class="text-center w-16">${lang === 'en' ? 'Learned' : 'Appris'}</th>
        <th class="text-center w-16" title="${lang === 'en' ? 'Next block to study' : 'Prochain bloc à étudier'}">${lang === 'en' ? 'Next' : 'Suiv.'}</th>
        <th></th>
      </tr></thead><tbody>${learnedRows}</tbody></table>
    </div>`;
  }

  // === AVAILABLE LISTS — tabbed by realm, sub-grouped by type ===
  const REALM_NAMES_FR = {
    'Mentalism (Open)': 'Mentalisme (Libres)',
    'Mentalism (Closed)': 'Mentalisme (Réservées)',
    'Mentalism (Evil)': 'Mentalisme (Maléfiques)',
    'Essence (Open)': 'Essence (Libres)',
    'Essence (Closed)': 'Essence (Réservées)',
    'Essence (Evil)': 'Essence (Maléfiques)',
    'Channeling (Open)': 'Théurgie (Libres)',
    'Channeling (Closed)': 'Théurgie (Réservées)',
    'Channeling (Evil)': 'Théurgie (Maléfiques)',
    'Arcane/Other': 'Arcanes / Autres',
  };
  const REALM_GROUPS = [
    { key: 'Mentalism', label_fr: 'Mentalisme', label_en: 'Mentalism' },
    { key: 'Essence', label_fr: 'Essence', label_en: 'Essence' },
    { key: 'Channeling', label_fr: 'Théurgie', label_en: 'Channeling' },
    { key: 'Arcane', label_fr: 'Arcanes', label_en: 'Arcane' },
  ];
  const realms = getAllRealms();
  const classRealm = cls ? getRealmKey(cls) : 'none';
  const canAdd = !spellLocked;
  const realmSortKey = { essence: 'Essence', channeling: 'Channeling', mentalism: 'Mentalism' }[classRealm] || '';
  const classBaseLists = character.classIndex >= 0 ? getClassBaseSpellLists(character.classIndex) : [];

  // Build realm tabs
  let realmTabsHtml = `<div class="flex gap-1 flex-wrap mb-2">`;
  // Sort: class realm first
  const sortedGroups = [...REALM_GROUPS].sort((a, b) => {
    if (a.key === realmSortKey) return -1;
    if (b.key === realmSortKey) return 1;
    return 0;
  });

  // Add "Base" tab first if class has base lists
  if (classBaseLists.length > 0) {
    realmTabsHtml += `<button class="spell-realm-tab phase-btn text-xs" data-realm-tab="base" style="border-color:var(--color-success);color:var(--color-success)">Base (${classBaseLists.length})</button>`;
  }
  for (const rg of sortedGroups) {
    const isActive = rg.key === realmSortKey;
    const label = lang === 'en' ? rg.label_en : rg.label_fr;
    realmTabsHtml += `<button class="spell-realm-tab phase-btn text-xs ${isActive ? '' : ''}" data-realm-tab="${rg.key}">${label}${isActive ? ' ★' : ''}</button>`;
  }
  realmTabsHtml += `</div>`;

  // Build content for each realm tab (hidden by default, shown via JS)
  let realmPanels = '';

  // Base panel — class base lists
  if (classBaseLists.length > 0) {
    let baseItems = '';
    for (const blName of classBaseLists) {
      // Find matching spell in sorts.json
      const already = character.spellLists.some(sl => sl.name === blName || sl.name.includes(blName) || blName.includes(sl.name));
      const studying = study.listName === blName;
      // Try to find the realm for this list
      let foundRealm = '';
      for (const realm of realms) {
        for (const group of realm.groups) {
          for (const spell of group) {
            if (spell.name_fr === blName || spell.name_fr.includes(blName) || blName.includes(spell.name_fr)) {
              foundRealm = realm.name;
            }
          }
        }
      }
      baseItems += `<button class="text-xs ${already || studying ? 'text-gray-600' : 'text-green-400 hover:text-amber-300'} block py-0.5 add-spell-list" data-spell-name="${esc(blName)}" data-spell-realm="${esc(foundRealm)}" ${already || studying || !canAdd ? 'disabled' : ''}>${blName}${already ? ' ✓' : studying ? ' ◆' : ''}</button>`;
    }
    const baseBlockSize = getSpellBlockSize(cls, 'base_own');
    const baseCostHeader = `<div class="text-xs text-gray-500 mb-1 p-1 rounded" style="background:rgba(52,211,153,0.08)">
      ${lang === 'en' ? 'Cost' : 'Coût'}: <span class="text-amber-300 font-bold">${rankCost} PD/${lang === 'en' ? 'rank' : 'rang'}</span> —
      ${lang === 'en' ? 'Block' : 'Bloc'}: <span class="text-green-400 font-bold">${baseBlockSize} ${lang === 'en' ? 'levels' : 'niveaux'}</span> —
      SGR: D100 + (${lang === 'en' ? 'ranks' : 'rangs'}×5) ≥ 101
    </div>`;
    realmPanels += `<div class="spell-realm-panel hidden" data-realm-panel="base">${baseCostHeader}${baseItems}</div>`;
  }

  // Per-realm panels
  for (const rg of sortedGroups) {
    let panelContent = '';
    const matchingRealms = realms.filter(r => r.name.includes(rg.key));
    for (const realm of matchingRealms) {
      const realmLabel = lang === 'en' ? realm.name : (REALM_NAMES_FR[realm.name] || realm.name);
      let items = '';
      for (const group of realm.groups) {
        for (const spell of group) {
          const name = lang === 'en' ? spell.name_en : spell.name_fr;
          const already = character.spellLists.some(sl => sl.name === name);
          const studying = study.listName === name;
          items += `<button class="text-xs ${already || studying ? 'text-gray-600' : 'text-gray-400 hover:text-amber-300'} block py-0.5 add-spell-list" data-spell-name="${esc(name)}" data-spell-realm="${esc(realm.name)}" ${already || studying || !canAdd ? 'disabled' : ''}>${name}${already ? ' ✓' : studying ? ' ◆' : ''}</button>`;
        }
      }
      if (items) {
        // Determine cost info for this realm sub-category
        const rn = realm.name.toLowerCase();
        const classRealmKw2 = realmSortKey.toLowerCase();
        const realmMatches = classRealmKw2 && rn.includes(classRealmKw2);
        let subType = 'other';
        if (realmMatches && rn.includes('open')) subType = 'open';
        else if (realmMatches && rn.includes('closed')) subType = 'closed';
        else if (rn.includes('evil')) subType = 'other';
        const subBlockSize = getSpellBlockSize(cls, subType);
        const costHint = `<span class="text-gray-600 font-normal ml-2">[${rankCost} PD/${lang === 'en' ? 'rk' : 'rg'}, ${lang === 'en' ? 'block' : 'bloc'} ${subBlockSize} ${lang === 'en' ? 'lvl' : 'niv'}]</span>`;
        panelContent += `<div class="text-xs text-purple-400 font-bold mt-2">${realmLabel}${costHint}</div>${items}`;
      }
    }
    if (!panelContent) panelContent = `<div class="text-xs text-gray-600">${lang === 'en' ? 'No lists available' : 'Aucune liste disponible'}</div>`;
    realmPanels += `<div class="spell-realm-panel hidden" data-realm-panel="${rg.key}">${panelContent}</div>`;
  }

  let availableHtml = `<div class="mt-4"><details><summary class="text-sm text-gray-400 cursor-pointer hover:text-amber-300">${lang === 'en' ? 'Available spell lists (click to add)' : 'Listes disponibles (cliquez pour ajouter)'}</summary>
    <div class="mt-2">
      ${realmTabsHtml}
      <div class="scroll-container" style="max-height:40vh">${realmPanels}</div>
    </div>
  </details></div>`;

  // Spell audit log
  let logHtml = '';
  if (character.spellLog && character.spellLog.length > 0) {
    logHtml = renderSpellLog(lang);
  }

  return panel(
    lang === 'en' ? 'Spell Lists' : 'Listes de Sorts',
    header + studyHtml + learnedHtml + availableHtml + logHtml
  );
}

function renderSpellLog(lang) {
  const log = character.spellLog;
  const sgrCount = log.filter(e => e.action === 'sgr').length;
  const sgrSuccess = log.filter(e => e.action === 'sgr' && e.details.success).length;

  let html = `<details class="mt-4 stat-log"><summary class="text-xs text-gray-500 cursor-pointer hover:text-purple-300">`;
  html += lang === 'en'
    ? `Spell log — ${log.length} actions, ${sgrSuccess}/${sgrCount} SGR success`
    : `Journal des sorts — ${log.length} actions, ${sgrSuccess}/${sgrCount} SGR réussis`;
  html += `</summary><div class="mt-2 text-xs text-gray-500 space-y-1 max-h-60 overflow-y-auto">`;

  const actionLabels = {
    invest:  { fr: '+ Rang', en: '+ Rank' },
    sgr:     { fr: 'SGR', en: 'SGR' },
    auto:    { fr: 'Auto', en: 'Auto' },
    start:   { fr: 'Début étude', en: 'Start study' },
    abandon: { fr: 'Abandon', en: 'Abandon' },
    add:     { fr: 'Ajout', en: 'Add' },
  };

  for (const entry of log) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const label = (actionLabels[entry.action] || {})[lang === 'en' ? 'en' : 'fr'] || entry.action;
    let detail = '';
    const d = entry.details || {};

    if (entry.action === 'invest') {
      detail = `${d.cost} PD → rang ${d.newRanks}`;
    } else if (entry.action === 'sgr') {
      const resultCls = d.success ? 'text-green-400' : 'text-red-400';
      const resultText = d.success
        ? (lang === 'en' ? `SUCCESS → lvl ${d.block}` : `RÉUSSI → niv ${d.block}`)
        : (lang === 'en' ? 'FAIL' : 'ÉCHEC');
      const extraTag = d.extraRoll ? ` <span class="text-yellow-400">[${lang === 'en' ? 'extra' : 'suppl'}${d.sgrNumber ? ' #' + d.sgrNumber : ''}]</span>` : '';
      const manualTag = d.manualEntry ? ` <span class="text-blue-400">[${lang === 'en' ? 'table' : 'table'}]</span>` : '';
      detail = `D100=${d.roll}+${d.bonus}=${d.total} vs 101 — <span class="${resultCls} font-bold">${resultText}</span>${extraTag}${manualTag}`;
    } else if (entry.action === 'auto') {
      detail = `<span class="text-green-400 font-bold">20 rangs → niv ${d.block}</span>`;
    } else if (entry.action === 'start') {
      detail = `[${d.type}] bloc ${d.blockSize} niv`;
    } else if (entry.action === 'abandon') {
      detail = `<span class="text-red-400">${d.ranksLost} rang${d.ranksLost > 1 ? 's' : ''} perdus</span>`;
    }

    html += `<div><span class="text-gray-600">[${time}]</span> <span class="text-purple-400">${label}</span> <span class="text-amber-300">${esc(entry.listName || '')}</span> ${detail}</div>`;
  }

  html += `</div></details>`;
  return html;
}

// === Tab: History ===
function renderHistoryTab(lang) {
  const hasRace = character.raceIndex >= 0;

  // === Section A: Background Options ===
  const bgData = getData().background_options_merged;
  if (!character.backgroundOptions) character.backgroundOptions = { totalOptions: 0, options: [], companionIIITalents: [] };
  const bgOpts = character.backgroundOptions;

  // Determine total options from race
  let totalOpts = bgOpts.totalOptions;
  if (totalOpts <= 0 && hasRace && bgData) {
    const raceSection = bgData.sources[0]?.sections?.[0];
    if (raceSection) {
      const raceMatch = raceSection.entries.find(e =>
        (character.raceName || '').toLowerCase().includes(e.race.toLowerCase()) ||
        e.race.toLowerCase().includes((character.raceName || '').toLowerCase().split(' ')[0])
      );
      totalOpts = raceMatch ? parseInt(raceMatch.background_options) || 4 : 4;
      bgOpts.totalOptions = totalOpts;
    }
  }

  // Build category options for dropdown
  const categories = [];
  if (bgData) {
    const s0 = bgData.sources[0]; // Character Law
    if (s0) {
      for (let si = 1; si < (s0.sections || []).length; si++) {
        const sec = s0.sections[si];
        categories.push({ source: 'character_law', sectionIdx: si, label: sec.name_fr || sec.name_en || sec.name || `Section ${si}`, needsRoll: si > 1 });
      }
    }
    const s1 = bgData.sources[1]; // Companion I
    if (s1) {
      for (let si = 0; si < (s1.sections || []).length; si++) {
        const sec = s1.sections[si];
        categories.push({ source: 'companion_1', sectionIdx: si, label: `${sec.name_fr || sec.name_en || sec.name} (C1)`, needsRoll: true });
      }
    }
  }

  let optionsHtml = '';
  for (let i = 0; i < totalOpts; i++) {
    const opt = bgOpts.options[i];
    if (opt) {
      // Filled option
      const typeColor = opt.type === 'flaw' ? 'text-red-400' : opt.type === 'talent' ? 'text-green-400' : 'text-amber-300';
      optionsHtml += `<div class="panel" style="padding:0.5rem 0.75rem;margin-bottom:0.5rem">
        <div class="text-xs text-gray-500">Option ${i + 1}/${totalOpts}</div>
        <div class="font-bold ${typeColor}">${esc(opt.name_fr || opt.name)}</div>
        ${opt.roll ? `<div class="text-xs text-gray-500">D100: ${opt.roll}</div>` : ''}
        <div class="text-xs" style="margin-top:2px">${esc(opt.description || '').slice(0, 200)}</div>
        <input type="text" class="field bg-opt-notes" data-bg-idx="${i}" value="${esc(opt.playerNotes || '')}" placeholder="Notes..." style="font-size:0.75rem;margin-top:4px;width:100%">
        ${(() => {
          const BG_STAT_FR = { AG:'AG', CO:'CO', EM:'EM', IN:'IN', ME:'Mé', PR:'PR', QU:'RP', RE:'RS', SD:'AD', ST:'FO', choice:'au choix' };
          const BG_SKILL_FR = { adrenal_moves:'Mvts Adrénaline', leadership:'Leadership', meditation:'Méditation', navigation:'Navigation', riding:'Équitation', runes:'Runes', singing:'Chant', spatial_location_awareness:'Conscience spatiale', stalk_hide:'Pistage/Dissimulation', staves_wands:'Bâtons/Baguettes' };
          const BG_ABILITY_FR = { acute_hearing:'Ouïe aiguisée', acute_smell:'Odorat aiguisé', charismatic:'Charisme naturel', empathy:'Empathie naturelle', exceptional_tone:'Tonalité exceptionnelle', exceptional_voice:'Voix exceptionnelle', exceptionally_enchanted:'Très enchanté', good_tendons:'Bons tendons', great_strength:'Grande force', high_pain_threshold:'Tolérance à la douleur', highly_resistant:'Très résistant', infravision:'Infravision', lightning_reactions:'Réflexes foudroyants', lung_capacity:'Capacité pulmonaire accrue', lycanthropy:'Lycanthropie', neutral_odor:'Odeur neutre', nimble:'Agilité naturelle', quick_thinker:'Esprit vif', silent_mover:'Déplacement silencieux', spatial_judgment:'Jugement spatial', unusual_agility:'Agilité inhabituelle', unusually_enchanted:'Légèrement enchanté' };
          const effKeys = Object.keys(opt.effects || {});
          const isResolved = !opt.requires_choice || (opt.resolved && Object.keys(opt.resolved).length > 0);
          if (effKeys.length === 0) return '';
          if (isResolved || !opt.requires_choice) {
            const parts = [];
            if (opt.effects.stat_bonus) {
              const sb = opt.effects.stat_bonus;
              if (typeof sb === 'object') parts.push(Object.entries(sb).map(([k,v]) => `${BG_STAT_FR[k]||k} +${v}`).join(', '));
            }
            if (opt.effects.skill_bonus && typeof opt.effects.skill_bonus === 'object')
              parts.push(Object.entries(opt.effects.skill_bonus).map(([k,v]) => `${BG_SKILL_FR[k]||k} +${v}`).join(', '));
            if (opt.effects.spell_adder) parts.push(lang === 'en'
              ? `Spell Adder: ${opt.effects.spell_adder} spell(s)/day free`
              : `Ajouteur: ${opt.effects.spell_adder} sort(s)/jour sans PM`);
            if (opt.effects.pp_bonus) parts.push(`+${opt.effects.pp_bonus} ${lang === 'en' ? 'PP' : 'PM'}`);
            if (opt.effects.gold) parts.push(`${opt.effects.gold} po`);
            if (opt.effects.rr_bonus) parts.push(`JR +${opt.effects.rr_bonus}`);
            if (opt.effects.special_ability) parts.push(lang === 'en' ? opt.effects.special_ability : (BG_ABILITY_FR[opt.effects.special_ability] || opt.effects.special_ability));
            return parts.length > 0 ? `<div class="text-xs text-green-400 mt-1">✓ ${parts.join(' | ')}</div>` : '';
          } else {
            return `<div class="text-xs text-amber-400 mt-1">⚠ ${lang === 'en' ? 'Choice required' : 'Choix requis'} <button class="btn-primary text-xs bg-opt-resolve" data-bg-idx="${i}" style="padding:1px 6px;margin-left:4px">${lang === 'en' ? 'Choose' : 'Choisir'}</button></div>`;
          }
        })()}
        <button class="text-red-400 text-xs mt-1 bg-opt-remove" data-bg-idx="${i}">✕ ${lang === 'en' ? 'Remove' : 'Retirer'}</button>
      </div>`;
    } else {
      // Empty slot — show category selector
      let catOptions = categories.map((c, ci) =>
        `<option value="${ci}">${esc(c.label)}</option>`
      ).join('');
      optionsHtml += `<div class="panel" style="padding:0.5rem 0.75rem;margin-bottom:0.5rem">
        <div class="text-xs text-gray-500">Option ${i + 1}/${totalOpts}</div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
          <select class="field bg-opt-category" data-bg-idx="${i}" style="font-size:0.8rem;flex:1">
            <option value="">— ${lang === 'en' ? 'Choose category' : 'Choisir catégorie'} —</option>
            ${catOptions}
          </select>
          <button class="btn-primary text-xs bg-opt-roll" data-bg-idx="${i}" style="padding:2px 10px">🎲 ${lang === 'en' ? 'Roll' : 'Jet'}</button>
        </div>
      </div>`;
    }
  }

  const bgPanel = totalOpts > 0 ? panel(
    `${lang === 'en' ? 'Background Options' : 'Options d\'Historique'} (${bgOpts.options.filter(Boolean).length}/${totalOpts})`,
    optionsHtml
  ) : '';

  // === Section B: Innate Talents (Companion III) ===
  let talentsHtml = '';
  if (bgData) {
    const c3 = bgData.sources.find(s => s.id === 'companion_3');
    if (c3) {
      const STAT_NAMES_EN = ['Constitution', 'Agility', 'Self-Discipline', 'Memory', 'Reasoning', 'Strength', 'Quickness', 'Presence', 'Empathy', 'Intuition'];
      let hasTalents = false;
      let talentRows = '';
      for (let i = 0; i < 10; i++) {
        const val = character.stats[i];
        if (val < 102) continue;
        hasTalents = true;
        const section = c3.sections.find(s => (s.name_en || s.name || '').toLowerCase() === STAT_NAMES_EN[i].toLowerCase());
        let picksDesc = '';
        if (val >= 110) picksDesc = '1C ou 1B+2A';
        else if (val >= 105) picksDesc = '1B ou 2A';
        else picksDesc = '1A';

        // Show existing picks
        const existing = (bgOpts.companionIIITalents || []).filter(t => t.statIndex === i);
        let existingHtml = existing.map((t, ti) =>
          `<div class="text-xs text-green-400 ml-4">→ ${esc(t.name)} <span class="text-gray-500">(${t.pickTier})</span></div>`
        ).join('');

        // Available entries for picking
        let pickBtns = '';
        if (section && existing.length === 0) {
          const allowedTiers = val >= 110 ? ['A','B','C'] : val >= 105 ? ['A','B'] : ['A'];
          const available = (section.entries || []).filter(e => allowedTiers.includes(e.pick_tier));
          if (available.length > 0) {
            pickBtns = `<select class="field c3-talent-pick" data-stat-idx="${i}" style="font-size:0.75rem;margin-left:1rem">
              <option value="">— ${lang === 'en' ? 'Pick talent' : 'Choisir talent'} —</option>
              ${available.map(e => `<option value="${esc(e.id || e.name_en)}" data-tier="${e.pick_tier}">${e.pick_tier}: ${esc(e.name_fr || e.name_en || e.name)}</option>`).join('')}
            </select>
            <button class="btn-primary text-xs c3-talent-confirm" data-stat-idx="${i}" style="padding:2px 8px;margin-left:4px">OK</button>`;
          }
        }

        talentRows += `<div style="margin-bottom:0.3rem">
          <span class="font-bold">${STAT_ABBREVS[i]}: ${val}</span>
          <span class="text-xs text-gray-500 ml-2">${picksDesc}</span>
          ${pickBtns}
          ${existingHtml}
        </div>`;
      }
      if (hasTalents) {
        talentsHtml = panel(lang === 'en' ? 'Innate Talents (Companion III)' : 'Talents Innés (Compagnon III)', talentRows);
      }
    }
  }

  return `
    ${bgPanel}
    ${talentsHtml}

    ${panel(lang === 'en' ? 'Physical Description' : 'Description physique', `
      <div class="info-grid">
        <label>Sexe</label>
        <select id="f-sex-select" class="field field-sm">
          <option value="Masculin" ${character.sex === 'Masculin' || character.sex === 'M' ? 'selected' : ''}>Masculin</option>
          <option value="Féminin" ${character.sex === 'Féminin' || character.sex === 'F' ? 'selected' : ''}>Féminin</option>
        </select>
        <label>Taille</label>
        <input type="text" id="f-height" value="${esc(character.height)}" class="field field-sm" placeholder="178 cm">
        <label>Poids</label>
        <input type="text" id="f-weight" value="${esc(character.weight)}" class="field field-sm" placeholder="75 kg">
        <label>Âge</label>
        <input type="text" id="f-age" value="${esc(character.age)}" class="field field-sm">
        <label>Cheveux</label>
        <input type="text" id="f-hair" value="${esc(character.hair)}" class="field field-sm">
        <label>Yeux</label>
        <input type="text" id="f-eyes" value="${esc(character.eyes)}" class="field field-sm">
        <label>Apparence (1-100)</label>
        <input type="text" id="f-appearance" value="${esc(character.appearance)}" class="field field-sm">
        <label>Comportement</label>
        <input type="text" id="f-behavior" value="${esc(character.behavior)}" class="field">
      </div>
      ${hasRace ? `<button class="btn-secondary text-sm mt-3 no-print" id="btn-reroll-bg">${lang === 'en' ? 'Re-roll background' : 'Relancer l\'historique'}</button>` : ''}
    `)}
    ${panel(lang === 'en' ? 'Equipment' : 'Équipement', `
      <textarea id="f-equipment" class="field w-full" rows="6" placeholder="- 1 épée longue (1.5kg)\n- 1 armure de cuir souple\n- ...">${esc(character.equipment)}</textarea>
    `)}
    ${panel(lang === 'en' ? 'Background & Notes' : 'Historique & Notes', `
      <textarea id="f-history" class="field w-full" rows="8" placeholder="Historique du personnage...">${esc(character.history)}</textarea>
    `)}
    ${panel(lang === 'en' ? 'Event Journal' : 'Journal des événements', `
      <div class="rm-journal-shell">
        <div class="rm-journal-toolbar">
          <p class="rm-sheet-subtitle" style="margin:0">${lang === 'en' ? 'Character milestones and rolls.' : 'Événements et jets du personnage.'}</p>
          <div class="rm-filter-row" role="group" aria-label="${lang === 'en' ? 'Journal filters' : 'Filtres'}">
            <button class="rm-filter-chip is-active" type="button" data-filter="all">${lang === 'en' ? 'All' : 'Tous'}</button>
            <button class="rm-filter-chip" type="button" data-filter="stats">${lang === 'en' ? 'Stats' : 'Stats'}</button>
            <button class="rm-filter-chip" type="button" data-filter="skills">${lang === 'en' ? 'Skills' : 'Compét.'}</button>
            <button class="rm-filter-chip" type="button" data-filter="spells">${lang === 'en' ? 'Spells' : 'Sorts'}</button>
            <button class="rm-filter-chip" type="button" data-filter="notes">${lang === 'en' ? 'Notes' : 'Notes'}</button>
          </div>
        </div>
        <div class="rm-timeline" id="event-journal-container" style="max-height:320px;overflow-y:auto">
          <div class="text-xs" style="color:#6b5030;padding:0.5rem">${lang === 'en' ? 'Loading…' : 'Chargement…'}</div>
        </div>
      </div>
    `)}
  `;
}

// isMovingSkill imported from character.js

// === Tab: Skills ===
function renderSkillsTab(lang) {
  const categories = getAllCategories();
  const devPts = getDevPointsTotal(character);
  const spent = getDevPointsSpent(character);
  const remaining = devPts - spent;

  const isValidated = !!character.phaseValidated;
  const phaseLabelFr = character.devPhase === 'adolescent' ? 'Adolescent' : character.devPhase === 'apprenti' ? 'Apprenti' : `Niveau ${character.level}`;
  const phaseLabelEn = character.devPhase === 'adolescent' ? 'Adolescent' : character.devPhase === 'apprenti' ? 'Apprentice' : `Level ${character.level}`;
  const phaseLabel = lang === 'en' ? phaseLabelEn : phaseLabelFr;

  // Phase indicator (no free switching — strict order)
  let header = `
    <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
      <div class="flex items-center gap-2">
        <span class="text-gray-500 text-sm">${lang === 'en' ? 'Phase:' : 'Phase :'}</span>
        <span class="phase-btn active" style="cursor:default">${phaseLabel}</span>
        ${isValidated
          ? `<span class="text-green-500 text-xs font-bold ml-1">${lang === 'en' ? 'VALIDATED' : 'VALIDÉ'}</span>`
          : `<span class="text-yellow-500 text-xs ml-1">${lang === 'en' ? 'In progress' : 'En cours'}</span>`
        }
      </div>
      <div class="text-right">
        <span class="text-gray-400 text-sm">${lang === 'en' ? 'Dev Points:' : 'Points de dév :'} </span>
        <span class="text-amber-300 font-bold text-lg">${remaining}</span>
        <span class="text-gray-500"> / ${devPts}</span>
        ${remaining < 0 ? '<span class="text-red-400 text-xs ml-2">Dépassement !</span>' : ''}
        ${devPts > 0 ? `<div class="dp-bar"><div class="dp-bar-fill${remaining <= Math.floor(devPts * 0.1) ? ' low' : ''}" style="width:${Math.max(0, Math.min(100, (spent / devPts) * 100))}%"></div></div>` : ''}
      </div>
    </div>
    <div class="flex gap-2 mb-3 no-print">
      ${!isValidated
        ? `<button class="btn-primary text-sm" id="btn-validate-phase">${lang === 'en' ? 'End development phase' : 'Fin de la phase de développement'}</button>`
        : `<button class="btn-primary text-sm" id="btn-next-phase">${lang === 'en' ? 'Advance to next level' : 'Monter au prochain niveau'}</button>`
      }
      ${(character.phases || []).length > 0 ? `<button class="btn-secondary text-xs" id="btn-phase-history">${lang === 'en' ? 'History' : 'Historique'} (${character.phases.length})</button>` : ''}
      ${!isValidated && (character.phases || []).length > 0 ? `<button class="btn-secondary text-xs" id="btn-repeat-previous" title="${lang === 'en' ? 'Copy skill ranks from the last validated phase' : 'Copier les rangs de compétences de la dernière phase validée'}">${lang === 'en' ? 'Same as previous' : 'Comme au niveau précédent'}</button>` : ''}
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
          <th class="text-center w-10">${lang === 'en' ? 'Lvl' : 'Niv'}</th>
          <th class="text-center w-10">${lang === 'en' ? 'Sim' : 'Sim'}</th>
          <th class="text-center w-14" title="${lang === 'en' ? 'Misc: manual + background + armor penalties for moving skills' : 'Div: manuels + historique + malus armure pour compétences de mouvement'}">${lang === 'en' ? 'Misc' : 'Div'}</th>
          <th class="text-center w-16 font-bold">Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  const bgBonuses = getBackgroundBonuses(character);
  const bgStatMods = bgBonuses.statBonusMods || new Array(10).fill(0);

  let globalIndex = 0;
  for (const cat of categories) {
    const catNameFr = CAT_NAMES_FR[cat.name] || cat.name;
    const catName = lang === 'en' ? cat.name : catNameFr;
    table += `<tr><td colspan="10" class="skill-category-header">${catName}</td></tr>`;

    for (const skill of cat.skills) {
      const name = getSkillName(skill, lang);
      const isParent = isParentSkill(skill, globalIndex);

      if (isParent) {
        // Parent skill — non-developable container with "add sub-skill" button
        const isWeapon = globalIndex === WEAPON_SKILL_GLOBAL_INDEX;
        const hasWeaponPriorities = character.weaponPriorities.some(p => p !== null);

        // Determine the action button for each parent type
        let parentAction = '';
        if (isWeapon) {
          if (hasWeaponPriorities) {
            parentAction = `<button class="text-xs text-amber-400 hover:text-amber-300 font-bold btn-add-weapon-skill">⚔ ${lang === 'en' ? '+ Add weapon' : '+ Ajouter arme'}</button>`;
          } else {
            parentAction = `<span class="text-xs text-red-400">${lang === 'en' ? '→ Assign priorities (Weapons tab)' : '→ Priorités (onglet Armes)'}</span>`;
          }
        } else if (globalIndex === 148) {
          // Spell Mastery — needs known spell lists
          const hasSpells = character.spellLists.length > 0;
          parentAction = hasSpells
            ? `<button class="text-xs text-amber-400 hover:text-amber-300 font-bold btn-add-subskill" data-parent="${globalIndex}">+ ${lang === 'en' ? 'Add' : 'Ajouter'}</button>`
            : `<span class="text-xs text-gray-600">${lang === 'en' ? '→ Add spell lists first' : '→ Ajoutez d\'abord des sorts'}</span>`;
        } else {
          parentAction = `<button class="text-xs text-amber-400 hover:text-amber-300 font-bold btn-add-subskill" data-parent="${globalIndex}">+ ${lang === 'en' ? 'Add' : 'Ajouter'}</button>`;
        }

        const wpnCount = isWeapon ? character.weaponSkills.length : 0;
        const subCount = isWeapon ? wpnCount : character.subSkills.filter(s => s.parentIndex === globalIndex).length;
        // Inline + button next to the name (more visible)
        let inlineAddBtn = '';
        if (isWeapon && hasWeaponPriorities) {
          inlineAddBtn = `<button class="btn-add-weapon-skill" style="background:none;border:1px solid currentColor;border-radius:3px;width:1.2rem;height:1.2rem;font-size:0.75rem;cursor:pointer;color:inherit;line-height:1;padding:0;margin-left:4px" title="${lang === 'en' ? 'Add weapon' : 'Ajouter arme'}">+</button>`;
        } else if (!isWeapon && !(globalIndex === 148 && character.spellLists.length === 0)) {
          inlineAddBtn = `<button class="btn-add-subskill" data-parent="${globalIndex}" style="background:none;border:1px solid currentColor;border-radius:3px;width:1.2rem;height:1.2rem;font-size:0.75rem;cursor:pointer;color:inherit;line-height:1;padding:0;margin-left:4px" title="${lang === 'en' ? 'Add' : 'Ajouter'}">+</button>`;
        }
        table += `
          <tr class="text-gray-500" style="background:rgba(139,92,246,0.05)">
            <td class="sticky-col text-purple-400 font-bold">${name} ${isWeapon ? '⚔' : '▸'}${subCount > 0 ? ` <span class="text-xs text-gray-500">(${subCount})</span>` : ''} ${inlineAddBtn}</td>
            <td colspan="3"></td>
            <td colspan="6" class="text-right">${parentAction}</td>
          </tr>
        `;

        // Render weapon sub-skills added by the player (under the parent)
        if (isWeapon) {
          for (let ws = 0; ws < character.weaponSkills.length; ws++) {
            const wpn = character.weaponSkills[ws];
            const wsKey = 'wpn_' + ws;
            const wPhaseRanks = getCurrentPhaseRanks(character, wsKey);
            const wTotalRanks = getTotalRanks(character, wsKey);
            const wCost = wpn.cost;
            const wCostStr = wCost.second > 0 ? `${wCost.first}/${wCost.second}` : `${wCost.first}`;
            const wMaxRanks = wCost.second > 0 ? 2 : 1;
            const wCanAdd = !isValidated && wPhaseRanks < wMaxRanks && remaining > 0;
            const wNextCost = wPhaseRanks === 0 ? wCost.first : wCost.second;
            const wCanAfford = remaining >= wNextCost;
            const wRankBonus = getRankBonus(wTotalRanks);
            const wStatBonus = calcSkillStatBonusTotal(skill, character);
            const wMisc = character.skillMiscBonuses[wsKey] || 0;
            const wTotal = wRankBonus + wStatBonus + wMisc;

            const wHlColor = (character.skillHighlights || {})[wsKey] || '';
            const wHlClass = wHlColor ? `highlight-${wHlColor}` : '';
            const wBoldClass = (character.skillBold || {})[wsKey] ? 'skill-bold' : '';
            const wTextColorClass = (character.skillTextColors || {})[wsKey] ? `skill-text-${character.skillTextColors[wsKey]}` : '';
            table += `
              <tr class="${wTotalRanks > 0 ? '' : 'text-gray-600'} ${wHlClass} ${wBoldClass} ${wTextColorClass}">
                <td class="sticky-col text-gray-300 pl-6 skill-highlight-cell" data-skill-hl="${wsKey}" style="cursor:pointer">↳ ${esc(wpn.name)}</td>
                <td class="text-center text-gray-500 text-xs">${wCostStr}</td>
                <td class="text-center">
                  ${renderRankBoxes(wTotalRanks, wPhaseRanks)}
                  <span class="text-xs text-amber-300 ml-1">${wTotalRanks > 0 ? wTotalRanks : ''}</span>
                </td>
                <td class="text-center">
                  <span class="skill-pm">
                    <button class="pm-btn wpn-skill-minus" data-wpn-skill="${ws}" ${isValidated || wPhaseRanks <= 0 ? 'disabled' : ''}>−</button>
                    <button class="pm-btn wpn-skill-plus" data-wpn-skill="${ws}" ${!wCanAdd || !wCanAfford ? 'disabled' : ''}>+</button>
                  </span>
                  <button class="text-red-400 text-xs ml-1 wpn-skill-remove" data-wpn-skill="${ws}">✕</button>
                </td>
                <td class="text-center stat-bonus ${wRankBonus >= 0 ? 'positive' : 'negative'}">${wRankBonus >= 0 ? '+' + wRankBonus : wRankBonus}</td>
                <td class="text-center stat-bonus ${wStatBonus >= 0 ? 'positive' : 'negative'}">${wStatBonus >= 0 ? '+' + wStatBonus : wStatBonus}</td>
                <td class="text-center text-xs"></td>
                <td class="text-center"><input type="number" class="field-inline skill-misc-input" data-skill="${wsKey}" value="${wMisc || ''}" style="width:2.5rem"></td>
                <td class="text-center font-bold stat-bonus ${wTotal >= 0 ? 'positive' : 'negative'}">${wTotal >= 0 ? '+' + wTotal : wTotal}</td>
              </tr>
            `;
          }
        }

        // Render generic sub-skills for non-weapon parents
        if (!isWeapon) {
          const parentSubs = character.subSkills.filter(s => s.parentIndex === globalIndex);
          for (let si = 0; si < parentSubs.length; si++) {
            const sub = parentSubs[si];
            const subKey = 'sub_' + globalIndex + '_' + si;
            const sPhaseRanks = getCurrentPhaseRanks(character, subKey);
            const sTotalRanks = getTotalRanks(character, subKey);
            const sCost = sub.cost || getSkillDevCost(character.classIndex, globalIndex) || { first: 4, second: 0 };
            const sCostStr = sCost.second > 0 ? `${sCost.first}/${sCost.second}` : `${sCost.first}`;
            const sMaxRanks = sCost.second > 0 ? 2 : 1;
            const sCanAdd = !isValidated && sPhaseRanks < sMaxRanks && remaining > 0;
            const sNextCost = sPhaseRanks === 0 ? sCost.first : sCost.second;
            const sRankBonus = getRankBonus(sTotalRanks);
            // Stat bonus: use custom stats if defined, else inherit parent skill's stats
            const sStatBonus = calcSubSkillStatBonus(sub, skill, character);
            const sStatLabel = getSubSkillStatLabel(sub, skill);
            const sMisc = character.skillMiscBonuses[subKey] || 0;
            const sTotal = sRankBonus + sStatBonus + sMisc;

            const sHlColor = (character.skillHighlights || {})[subKey] || '';
            const sHlClass = sHlColor ? `highlight-${sHlColor}` : '';
            const sBoldClass = (character.skillBold || {})[subKey] ? 'skill-bold' : '';
            const sTextColorClass = (character.skillTextColors || {})[subKey] ? `skill-text-${character.skillTextColors[subKey]}` : '';
            table += `
              <tr class="${sTotalRanks > 0 ? '' : 'text-gray-600'} ${sHlClass} ${sBoldClass} ${sTextColorClass}">
                <td class="sticky-col text-gray-300 pl-6 skill-highlight-cell" data-skill-hl="${subKey}" style="cursor:pointer">↳ ${esc(sub.name)} <button class="text-gray-600 hover:text-amber-300 text-xs ml-1 sub-skill-edit" data-parent="${globalIndex}" data-sub-idx="${si}" title="${lang === 'en' ? 'Edit name & stats' : 'Modifier nom & carac'}">✎</button></td>
                <td class="text-center text-gray-500 text-xs">${sCostStr}</td>
                <td class="text-center">
                  ${renderRankBoxes(sTotalRanks, sPhaseRanks)}
                  <span class="text-xs text-amber-300 ml-1">${sTotalRanks > 0 ? sTotalRanks : ''}</span>
                </td>
                <td class="text-center">
                  <span class="skill-pm">
                    <button class="pm-btn sub-skill-minus" data-sub-key="${subKey}" data-parent="${globalIndex}" data-sub-idx="${si}" ${isValidated || sPhaseRanks <= 0 ? 'disabled' : ''}>−</button>
                    <button class="pm-btn sub-skill-plus" data-sub-key="${subKey}" data-parent="${globalIndex}" data-sub-idx="${si}" ${!sCanAdd || remaining < sNextCost ? 'disabled' : ''}>+</button>
                  </span>
                  <button class="text-red-400 text-xs ml-1 sub-skill-remove" data-parent="${globalIndex}" data-sub-idx="${si}">✕</button>
                </td>
                <td class="text-center stat-bonus ${sRankBonus >= 0 ? 'positive' : 'negative'}">${sRankBonus >= 0 ? '+' + sRankBonus : sRankBonus}</td>
                <td class="text-center stat-bonus ${sStatBonus >= 0 ? 'positive' : 'negative'}" title="${sStatLabel}">${sStatBonus >= 0 ? '+' + sStatBonus : sStatBonus}</td>
                <td class="text-center text-xs"></td>
                <td class="text-center"><input type="number" class="field-inline skill-misc-input" data-skill="${subKey}" value="${sMisc || ''}" style="width:2.5rem"></td>
                <td class="text-center font-bold stat-bonus ${sTotal >= 0 ? 'positive' : 'negative'}">${sTotal >= 0 ? '+' + sTotal : sTotal}</td>
              </tr>
            `;
          }
        }
      } else {
        // Normal developable skill
        const phaseRanks = getCurrentPhaseRanks(character, globalIndex);
        const totalRanks = getTotalRanks(character, globalIndex);
        const cost = getSkillDevCost(character.classIndex, globalIndex);
        let costStr = '—';
        let maxRanks = 0;
        if (cost) {
          costStr = cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`;
          maxRanks = cost.maxRanks;
        }
        const canAdd = !isValidated && cost && phaseRanks < maxRanks && remaining > 0;
        const nextRankCost = phaseRanks === 0 ? (cost ? cost.first : 0) : (cost ? cost.second : 0);
        const canAfford = remaining >= nextRankCost;
        const canRemove = !isValidated && phaseRanks > 0;
        const rankBonus = getRankBonus(totalRanks);
        const statTotalBonusBase = calcSkillStatBonusTotal(skill, character);
        const _skillSI = getSkillStatIndices(skill);
        const bgStatBonus = _skillSI.length === 0 ? 0 : Math.floor(_skillSI.reduce((s, i) => s + (bgStatMods[i - 1] || 0), 0) / _skillSI.length);
        const statTotalBonus = statTotalBonusBase + bgStatBonus;
        const cls = character.classIndex >= 0 ? getAllClasses()[character.classIndex] : null;
        const lvlBonus = getLevelBonus(cls, character.level, cat.name, globalIndex);
        const similBonus = calcSimilarityBonus(globalIndex, character);
        const bgSkillBonus = getSkillBackgroundBonus(bgBonuses, skill.name, skill.name_en);
        const miscBonus = (character.skillMiscBonuses[globalIndex] || 0) + bgSkillBonus;
        const armorMM = ARMOR_MANEUVER_PENALTIES[(character.armorType || 1) - 1] || 0;
        const armorMagic = character.armorMagicBonus || 0;
        const effectiveArmorPenalty = Math.min(0, armorMM + armorMagic);
        const isMoving = isMovingSkill(skill);
        const armorPenalty = isMoving ? effectiveArmorPenalty : 0;
        const total = rankBonus + statTotalBonus + lvlBonus + similBonus + miscBonus + armorPenalty;
        let rankBoxes = renderRankBoxes(totalRanks, phaseRanks);
        const addDisabled = !canAdd || !canAfford ? 'disabled' : '';
        const removeDisabled = !canRemove ? 'disabled' : '';
        const plusMinus = cost ? `
          <span class="skill-pm">
            <button class="pm-btn pm-minus" data-skill="${globalIndex}" ${removeDisabled}>−</button>
            <button class="pm-btn pm-plus" data-skill="${globalIndex}" ${addDisabled}>+</button>
          </span>
        ` : '';

        const hlColor = (character.skillHighlights || {})[globalIndex] || '';
        const hlClass = hlColor ? `highlight-${hlColor}` : '';
        const boldClass = (character.skillBold || {})[globalIndex] ? 'skill-bold' : '';
        const textColorClass = (character.skillTextColors || {})[globalIndex] ? `skill-text-${character.skillTextColors[globalIndex]}` : '';
        table += `
          <tr class="${totalRanks > 0 ? '' : 'text-gray-600'} ${hlClass} ${boldClass} ${textColorClass}">
            <td class="sticky-col text-gray-300 skill-highlight-cell" data-skill-hl="${globalIndex}" style="cursor:pointer">${name} <span class="skill-stats-label">(${getSkillStatIndices(skill).map(i => STAT_ABBREVS[i-1]).join('/')})</span>${isSpecializableSkill(globalIndex) ? ` <button class="btn-add-subskill text-xs" data-parent="${globalIndex}" style="background:none;border:1px solid currentColor;border-radius:3px;width:1rem;height:1rem;font-size:0.6rem;cursor:pointer;color:inherit;padding:0;line-height:1" title="${lang === 'en' ? 'Add specialization' : 'Spécialiser'}">▸</button>` : ''}</td>
            <td class="text-center text-gray-500 text-xs">${costStr}</td>
            <td class="text-center">
              ${rankBoxes}
              <span class="text-xs text-amber-300 ml-1">${totalRanks > 0 ? totalRanks : ''}</span>
            </td>
            <td class="text-center">${plusMinus}</td>
            <td class="text-center stat-bonus ${rankBonus >= 0 ? 'positive' : 'negative'}">${rankBonus >= 0 ? '+' + rankBonus : rankBonus}</td>
            <td class="text-center stat-bonus ${statTotalBonus >= 0 ? 'positive' : 'negative'}">${statTotalBonus >= 0 ? '+' + statTotalBonus : statTotalBonus}</td>
            <td class="text-center text-xs">${lvlBonus > 0 ? '+' + lvlBonus : ''}</td>
            <td class="text-center text-xs">${similBonus > 0 ? '+' + similBonus : ''}</td>
            <td class="text-center">
              <input type="number" class="field-inline skill-misc-input" data-skill="${globalIndex}" value="${miscBonus || ''}" style="width:2.5rem" title="Bonus divers">
              ${armorPenalty < 0 ? `<span title="${lang === 'en' ? 'Armor penalty: ' + armorPenalty : 'Malus armure: ' + armorPenalty}" style="color:#f97316;font-size:0.65rem">⛨${armorPenalty}</span>` : ''}
            </td>
            <td class="text-center font-bold stat-bonus ${total >= 0 ? 'positive' : 'negative'}">${total >= 0 ? '+' + total : total}</td>
          </tr>
        `;
        // Render specializations for specializable skills (same as sub-skills)
        if (isSpecializableSkill(globalIndex)) {
          const specSubs = character.subSkills.filter(s => s.parentIndex === globalIndex);
          for (let si = 0; si < specSubs.length; si++) {
            const sub = specSubs[si];
            const subKey = 'sub_' + globalIndex + '_' + si;
            const sPhaseRanks = getCurrentPhaseRanks(character, subKey);
            const sTotalRanks = getTotalRanks(character, subKey);
            const sCost = sub.cost || cost || { first: 4, second: 0 };
            const sCostStr = sCost.second > 0 ? `${sCost.first}/${sCost.second}` : `${sCost.first}`;
            const sMaxRanks = sCost.second > 0 ? 2 : 1;
            const sCanAdd = !isValidated && sPhaseRanks < sMaxRanks && remaining > 0;
            const sNextCost = sPhaseRanks === 0 ? sCost.first : sCost.second;
            const sRankBonus = getRankBonus(sTotalRanks);
            const sStatBonus = calcSubSkillStatBonus(sub, skill, character);
            const sMisc = character.skillMiscBonuses[subKey] || 0;
            const sTotal = sRankBonus + sStatBonus + sMisc;
            const sHlColor = (character.skillHighlights || {})[subKey] || '';
            const sHlClass = sHlColor ? `highlight-${sHlColor}` : '';
            table += `
              <tr class="${sTotalRanks > 0 ? '' : 'text-gray-600'} ${sHlClass}">
                <td class="sticky-col text-gray-300 pl-6 skill-highlight-cell" data-skill-hl="${subKey}" style="cursor:pointer">↳ ${esc(sub.name)} <button class="text-gray-600 hover:text-amber-300 text-xs ml-1 sub-skill-edit" data-parent="${globalIndex}" data-sub-idx="${si}">✎</button></td>
                <td class="text-center text-gray-500 text-xs">${sCostStr}</td>
                <td class="text-center">${renderRankBoxes(sTotalRanks, sPhaseRanks)} <span class="text-xs text-amber-300 ml-1">${sTotalRanks > 0 ? sTotalRanks : ''}</span></td>
                <td class="text-center"><span class="skill-pm"><button class="pm-btn sub-skill-minus" data-sub-key="${subKey}" data-parent="${globalIndex}" data-sub-idx="${si}" ${isValidated || sPhaseRanks <= 0 ? 'disabled' : ''}>−</button><button class="pm-btn sub-skill-plus" data-sub-key="${subKey}" data-parent="${globalIndex}" data-sub-idx="${si}" ${!sCanAdd || remaining < sNextCost ? 'disabled' : ''}>+</button></span> <button class="text-red-400 text-xs ml-1 sub-skill-remove" data-parent="${globalIndex}" data-sub-idx="${si}">✕</button></td>
                <td class="text-center stat-bonus ${sRankBonus >= 0 ? 'positive' : 'negative'}">${sRankBonus >= 0 ? '+' + sRankBonus : sRankBonus}</td>
                <td class="text-center stat-bonus ${sStatBonus >= 0 ? 'positive' : 'negative'}">${sStatBonus >= 0 ? '+' + sStatBonus : sStatBonus}</td>
                <td class="text-center text-xs"></td>
                <td class="text-center"><input type="number" class="field-inline skill-misc-input" data-skill="${subKey}" value="${sMisc || ''}" style="width:2.5rem"></td>
                <td class="text-center font-bold stat-bonus ${sTotal >= 0 ? 'positive' : 'negative'}">${sTotal >= 0 ? '+' + sTotal : sTotal}</td>
              </tr>`;
          }
        }
      }
      globalIndex++;
    }
  }

  table += `</tbody></table></div>`;
  return panel(lang === 'en' ? 'Skills — ' + phaseLabel : 'Compétences — ' + phaseLabel, header + table);
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
 * Get the stat label string for a sub-skill (e.g. "Ag/Fo").
 * Uses custom stats if defined, else inherits parent skill's stats.
 */
function getSubSkillStatLabel(sub, parentSkill) {
  if (sub.stats && sub.stats.length > 0) {
    return sub.stats.map(i => STAT_ABBREVS[i]).join('/');
  }
  const indices = getSkillStatIndices(parentSkill);
  if (indices.length === 0) return '—';
  return indices.map(i => STAT_ABBREVS[i - 1]).join('/');
}

/**
 * Calculate stat bonus for a sub-skill.
 * Uses sub.stats (0-based) if defined, else inherits parent skill's stats (1-based).
 */
function calcSubSkillStatBonus(sub, parentSkill, char) {
  let statIndices0; // 0-based indices
  if (sub.stats && sub.stats.length > 0) {
    statIndices0 = sub.stats;
  } else {
    const parentIndices = getSkillStatIndices(parentSkill); // 1-based
    if (parentIndices.length === 0) return 0;
    statIndices0 = parentIndices.map(i => i - 1);
  }
  if (statIndices0.length === 1) return getTotalStatBonus(char, statIndices0[0]);
  let sum = 0;
  for (const idx of statIndices0) {
    sum += getTotalStatBonus(char, idx);
  }
  return Math.floor(sum / statIndices0.length);
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
  document.querySelectorAll('.rm-tab-icon, .tab-btn').forEach(btn => {
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
  if (btnSaveLocal) btnSaveLocal.addEventListener('click', async () => {
    saveCurrentTabData();
    character.updatedAt = new Date().toISOString();
    await saveToLocalStorage(character);
    showToast('Personnage sauvegardé !');
  });
  if (btnPrint) btnPrint.addEventListener('click', () => openPrintConfigPopup());

  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) btnExportPdf.addEventListener('click', () => {
    if (!window.jspdf) {
      showToast('jsPDF non disponible — vérifier la connexion internet', true);
      return;
    }
    const spinner = document.getElementById('pdf-spinner');
    btnExportPdf.setAttribute('aria-busy', 'true');
    if (spinner) spinner.style.display = '';
    try {
      const lang = character.language || 'fr';
      generateCharacterPDF(character, { lang });
      showToast(lang === 'en' ? 'PDF downloaded!' : 'PDF téléchargé !');
    } catch (e) {
      showToast('Erreur PDF: ' + e.message, true);
    } finally {
      btnExportPdf.removeAttribute('aria-busy');
      if (spinner) spinner.style.display = 'none';
    }
  });
}

function bindContentEvents(app) {
  switch (currentTab) {
    case 'infos': bindInfosEvents(app); break;
    case 'stats': bindStatsEvents(app); break;
    case 'race': bindRaceEvents(app); break;
    case 'weapons': bindWeaponsEvents(app); break;
    case 'languages': bindLanguagesEvents(app); break;
    case 'spells': bindSpellsEvents(app); break;
    case 'history': bindHistoryEvents(app); break;
    case 'skills': bindSkillsEvents(app); break;
    case 'options': bindOptionsEvents(app); break;
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
 * Show a modal for manually entering D100 stat gain rolls (Table 05-02).
 * Pre-rolls all stats; player can replace any value with their physical die result.
 * callback(gains) is called with the final computed gains array.
 */
function showStatGainModal(stats, potentials, lang, callback) {
  const preRolls = stats.map((temp, i) => {
    const pot = potentials[i] || temp;
    const diff = pot - temp;
    if (diff <= 0) return { roll: 0, diff: 0, gain: 0, openEnded: false, newTemp: temp };
    const r = Math.floor(Math.random() * 100) + 1;
    const g = statGainLookup(r, diff);
    const gain = typeof g === 'number' ? g : 1;
    return { roll: r, diff, gain, openEnded: g === '*', newTemp: Math.min(temp + gain, pot) };
  });

  const statNames = lang === 'en' ? STAT_NAMES_EN : STAT_NAMES_FR;
  const rows = stats.map((temp, i) => {
    const pot = potentials[i] || temp;
    const diff = pot - temp;
    const pr = preRolls[i];
    if (diff <= 0) {
      return `<tr class="text-gray-600">
        <td class="font-bold">${STAT_ABBREVS[i]}</td><td class="text-center text-xs">${statNames[i]}</td>
        <td class="text-center">${temp}</td><td class="text-center">${pot}</td>
        <td class="text-center">0</td><td class="text-center">—</td>
        <td class="text-center">0</td><td class="text-center">${temp}</td>
      </tr>`;
    }
    return `<tr>
      <td class="font-bold text-amber-400">${STAT_ABBREVS[i]}</td>
      <td class="text-center text-xs" style="color:#9ca3af">${statNames[i]}</td>
      <td class="text-center">${temp}</td><td class="text-center">${pot}</td>
      <td class="text-center">${diff}</td>
      <td class="text-center">
        <input type="number" class="sg-d100-input" data-stat="${i}" value="${pr.roll}" min="1" max="100"
          style="width:4rem;background:rgba(0,0,0,0.3);border:1px solid rgba(139,92,20,0.4);
          border-radius:3px;padding:2px 4px;color:#e5d5b0;text-align:center">
      </td>
      <td class="text-center sg-gain" data-stat="${i}"
        style="color:${pr.gain > 0 ? '#4ade80' : '#9ca3af'};font-weight:${pr.gain > 0 ? 'bold' : 'normal'}">
        ${pr.gain > 0 ? '+' + pr.gain : '0'}${pr.openEnded ? '*' : ''}
      </td>
      <td class="text-center sg-newtemp" data-stat="${i}">${pr.newTemp}</td>
    </tr>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'rm-overlay-shell';
  overlay.innerHTML = `
    <div class="rm-modal-panel" style="padding:1.5rem;max-width:44rem">
      <h3 style="font-family:Cinzel,serif;color:#8b6914;margin-bottom:0.5rem">
        ${lang === 'en' ? 'Stat Gains — Level Up' : 'Gains de caractéristiques — Montée de niveau'}
      </h3>
      <p style="font-size:0.75rem;color:#6b5030;margin-bottom:1rem">
        ${lang === 'en'
          ? 'Edit D100 values to use your physical dice rolls, then confirm.'
          : 'Modifiez les D100 avec vos jets réels, puis confirmez.'}
      </p>
      <div class="overflow-x-auto">
        <table class="skill-table" style="width:100%">
          <thead><tr>
            <th>Car.</th><th></th>
            <th class="text-center">Temp</th><th class="text-center">Pot</th>
            <th class="text-center">Diff</th><th class="text-center">D100</th>
            <th class="text-center">${lang === 'en' ? 'Gain' : 'Gain'}</th>
            <th class="text-center">→</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:1rem;margin-top:1.25rem;justify-content:flex-end">
        <button id="sg-reroll-all" class="btn-secondary" style="font-size:0.85rem">
          🎲 ${lang === 'en' ? 'Reroll all' : 'Tout retirer'}
        </button>
        <button id="sg-confirm" class="btn-primary" style="font-size:0.85rem">
          ${lang === 'en' ? 'Confirm' : 'Confirmer'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.sg-d100-input').forEach(input => {
    input.addEventListener('input', () => {
      const si = parseInt(input.dataset.stat);
      const temp = stats[si];
      const pot = potentials[si] || temp;
      const diff = pot - temp;
      const roll = Math.max(1, Math.min(100, parseInt(input.value) || 1));
      const g = statGainLookup(roll, diff);
      const gain = typeof g === 'number' ? g : 1;
      const openEnded = g === '*';
      const gainCell = overlay.querySelector(`.sg-gain[data-stat="${si}"]`);
      const ntCell = overlay.querySelector(`.sg-newtemp[data-stat="${si}"]`);
      if (gainCell) {
        gainCell.textContent = (gain > 0 ? '+' + gain : '0') + (openEnded ? '*' : '');
        gainCell.style.color = gain > 0 ? '#4ade80' : '#9ca3af';
        gainCell.style.fontWeight = gain > 0 ? 'bold' : 'normal';
      }
      if (ntCell) ntCell.textContent = Math.min(temp + gain, pot);
    });
  });

  overlay.querySelector('#sg-reroll-all')?.addEventListener('click', () => {
    overlay.querySelectorAll('.sg-d100-input').forEach(input => {
      input.value = Math.floor(Math.random() * 100) + 1;
      input.dispatchEvent(new Event('input'));
    });
  });

  overlay.querySelector('#sg-confirm')?.addEventListener('click', () => {
    const gains = stats.map((temp, i) => {
      const pot = potentials[i] || temp;
      const diff = pot - temp;
      if (diff <= 0) return { statIndex: i, roll: 0, diff: 0, gain: 0, openEnded: false, oldTemp: temp, newTemp: temp };
      const input = overlay.querySelector(`.sg-d100-input[data-stat="${i}"]`);
      const roll = input ? Math.max(1, Math.min(100, parseInt(input.value) || 1)) : 0;
      const g = statGainLookup(roll, diff);
      const gain = typeof g === 'number' ? g : 1;
      return { statIndex: i, roll, diff, gain, openEnded: g === '*', oldTemp: temp, newTemp: Math.min(temp + gain, pot) };
    });
    document.body.removeChild(overlay);
    callback(gains);
  });
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
    // Level N → Level N+1: accumulate prior ranks before advancing
    const currentRanks = character.skillRanksLevel || {};
    for (const [key, val] of Object.entries(currentRanks)) {
      character.skillRanksPrior[key] = (character.skillRanksPrior[key] || 0) + val;
    }
    character.skillRanksLevel = {};
    character.level++;
  }

  const lang = character.language || 'fr';
  const needsGains = character.devPhase === 'level' && character.level >= 2 && character.stats.some(s => s > 0);

  const applyAndFinish = (gains) => {
    if (gains) {
      character._lastStatGains = gains;
      for (const g of gains) character.stats[g.statIndex] = g.newTemp;
      if (character.name) {
        const improved = gains.filter(g => g.gain > 0);
        const summary = improved.length > 0
          ? improved.map(g => `${STAT_ABBREVS[g.statIndex]}+${g.gain}`).join(' ')
          : (lang === 'en' ? 'No gains' : 'Aucun gain');
        logStatGain(character.name, { level: character.level, gains, summary });
      }
    } else {
      character._lastStatGains = null;
    }

    character.phaseValidated = false;
    setDevPointsSpent(character, 0);
    if (character.spellStudy) character.spellStudy.sgrDone = false;

    const label = character.devPhase === 'level'
      ? (lang === 'en' ? `Level ${character.level}!` : `Niveau ${character.level} !`)
      : (character.devPhase === 'apprenti' ? (lang === 'en' ? 'Apprentice phase!' : 'Phase Apprenti !') : 'Phase Adolescent !');
    if (character.name && character.devPhase === 'level') logLevelUp(character.name, {
      oldLevel: character.level - 1, newLevel: character.level,
    });
    showToast(label);
    renderEditor(app);
  };

  if (!needsGains) {
    applyAndFinish(null);
  } else if (character.manualStatGains) {
    showStatGainModal(character.stats, character.potentials, lang, applyAndFinish);
  } else {
    applyAndFinish(processLevelUpStatGains(character.stats, character.potentials));
  }
}

function bindInfosEvents(app) {
  const fields = { 'f-name': 'name', 'f-xp': 'xp' };

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

  // Armor magic bonus (reduces maneuver penalty)
  const armorMagicEl = document.getElementById('f-armor-magic');
  if (armorMagicEl) armorMagicEl.addEventListener('change', () => {
    character.armorMagicBonus = parseInt(armorMagicEl.value) || 0;
  });

  // Shield selector
  const shieldEl = document.getElementById('f-shield');
  if (shieldEl) shieldEl.addEventListener('change', () => {
    character.shieldType = parseInt(shieldEl.value) || 0;
    renderEditor(app);
  });

  // Defense bonus
  const defEl = document.getElementById('f-defbonus');
  if (defEl) defEl.addEventListener('change', () => {
    character.defenseBonus = parseInt(defEl.value) || 0;
  });

  // DB item bonus
  const dbItemEl = document.getElementById('f-db-item-bonus');
  if (dbItemEl) dbItemEl.addEventListener('change', () => {
    character.dbItemBonus = parseInt(dbItemEl.value) || 0;
    renderEditor(app);
  });

  // Manual bonuses
  document.querySelectorAll('.manual-bonus-input').forEach(input => {
    input.addEventListener('change', () => {
      if (!character.manualBonuses) character.manualBonuses = {};
      const key = input.dataset.mbKey;
      const val = parseInt(input.value) || 0;
      character.manualBonuses[key] = val;
      renderEditor(app);
    });
  });
  const mbNotesEl = document.getElementById('mb-notes');
  if (mbNotesEl) mbNotesEl.addEventListener('change', () => {
    if (!character.manualBonuses) character.manualBonuses = {};
    character.manualBonuses.miscNotes = mbNotesEl.value;
  });

  // Portrait upload (base64)
  const portraitUpload = document.getElementById('portrait-upload');
  if (portraitUpload) {
    portraitUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 500000) { showToast('Image trop grande (max 500KB)', true); return; }
      const reader = new FileReader();
      reader.onload = () => {
        character.portraitUrl = reader.result; // data:image/...;base64,...
        renderEditor(app);
      };
      reader.readAsDataURL(file);
    });
  }

  // Portrait URL
  const portraitUrlEl = document.getElementById('portrait-url');
  if (portraitUrlEl) {
    portraitUrlEl.addEventListener('change', () => {
      const url = portraitUrlEl.value.trim();
      if (url && !url.startsWith('http')) { showToast('URL invalide', true); return; }
      character.portraitUrl = url;
      renderEditor(app);
    });
  }

  // Portrait clear
  const portraitClear = document.getElementById('portrait-clear');
  if (portraitClear) {
    portraitClear.addEventListener('click', () => {
      character.portraitUrl = '';
      renderEditor(app);
    });
  }

  // Projection simulate
  const btnProject = document.getElementById('btn-project');
  if (btnProject) {
    btnProject.addEventListener('click', async () => {
      const targetLvl = parseInt(document.getElementById('proj-target-level')?.value) || 0;
      const resultEl = document.getElementById('proj-result');
      if (!resultEl) return;
      if (targetLvl <= character.level) {
        resultEl.innerHTML = `<span class="text-red-400">${app.lang === 'en' ? 'Target level must be > current level' : 'Le niveau cible doit être > niveau actuel'}</span>`;
        return;
      }
      resultEl.innerHTML = `<span class="text-gray-500">${app.lang === 'en' ? 'Simulating…' : 'Simulation…'}</span>`;
      try {
        const result = await projectProgression(character.name, targetLvl);
        if (result.error) { resultEl.innerHTML = `<span class="text-red-400">${result.error}</span>`; return; }
        let html = `<table style="border-collapse:collapse;width:100%">`;
        html += `<tr style="color:#9ca3af"><th style="text-align:left;padding:1px 4px">Niv</th><th style="padding:1px 4px">PdC</th><th style="padding:1px 4px">PP</th><th style="padding:1px 4px">BD</th><th style="text-align:left;padding:1px 4px">${app.lang === 'en' ? 'Top skill' : 'Meill. comp.'}</th></tr>`;
        for (const s of result.snapshots) {
          const top = s.topSkills[0];
          html += `<tr style="border-top:1px solid #374151">
            <td style="padding:1px 4px;color:#f59e0b;font-weight:bold">${s.level}</td>
            <td style="padding:1px 4px;color:#f87171;text-align:center">${s.hp}</td>
            <td style="padding:1px 4px;color:#60a5fa;text-align:center">${s.pp}</td>
            <td style="padding:1px 4px;color:#a3e635;text-align:center">${s.db.meleeBD ?? s.db}</td>
            <td style="padding:1px 4px;color:#d1d5db">${top ? `${top.name} (+${top.bonus})` : '—'}</td>
          </tr>`;
        }
        html += `</table>`;
        resultEl.innerHTML = html;
      } catch (e) {
        resultEl.innerHTML = `<span class="text-red-400">Erreur: ${e.message}</span>`;
      }
    });
  }
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
      } else if (rollingMethod === 'hybrid') {
        rolledStats = generateStatRollsHybrid();
        character.rawRolls = rolledStats.map(r => ({ tempRoll: r.tempRoll, potRoll: r.potRoll, potRollBoosted: r.potRollBoosted, forced100: r.forced100 }));
      } else if (rollingMethod === 'antilose') {
        rolledStats = generateStatRollsAntiLose();
        character.rawRolls = rolledStats.map(r => ({ tempRoll: r.tempRoll, potRoll: r.potRoll, potRollBoosted: r.potRollBoosted, forced100: r.forced100 }));
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
      if (character.name) logStatRoll(character.name, { method: log.method, rolls: rolledStats.map(r => ({ ...r })) });

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
      if (character.name) logStatValidate(character.name, { stats: [...character.stats], potentials: [...character.potentials] });
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

  const chkManual = document.getElementById('chk-manual-stat-gain');
  if (chkManual) {
    chkManual.addEventListener('change', () => {
      character.manualStatGains = chkManual.checked;
    });
  }

  // Projection slider — update sparkline without full re-render
  const slider = document.getElementById('projection-level');
  if (slider) {
    slider.addEventListener('input', () => {
      const target = parseInt(slider.value);
      const out = document.getElementById('projection-level-out');
      if (out) out.textContent = `${app.lang === 'en' ? 'Lv.' : 'Niv.'} ${target}`;
      const curves = buildProjectionCurves(target);
      if (!curves) return;
      const svg = document.getElementById('projection-svg');
      if (svg) svg.innerHTML = buildSparklineSVG(curves);
      const last = curves.hpPoints.length - 1;
      const hpEl = document.getElementById('proj-hp');
      if (hpEl) hpEl.textContent = curves.hpPoints[last].toFixed(0);
      const ppEl = document.getElementById('proj-pp');
      if (ppEl) ppEl.textContent = curves.ppPoints[last].toFixed(0);
      const dbEl = document.getElementById('proj-db');
      if (dbEl) dbEl.textContent = curves.dbPoints[last];
    });
  }
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
  } else if (rollingMethod === 'hybrid' || rollingMethod === 'antilose') {
    const values = getStatValuesHybrid(roll, isPrime);
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
    const quality = rollingMethod === 'rmss' ? rolledStats[r].temp : rolledStats[r].tempRoll;
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
  if (!character.spellLog) character.spellLog = [];
  if (!character.spellStudy) character.spellStudy = { listName: null, listType: null, listRealm: null, ranks: 0, sgrDone: false, blockSize: 5, nextBlockStart: 1 };
  const study = character.spellStudy;
  const cls = character.classIndex >= 0 ? getAllClasses()[character.classIndex] : null;
  const rankCost = getSpellRankCost(cls);

  // + Rank button (invest DP into current study)
  const btnRank = document.getElementById('btn-spell-rank');
  if (btnRank) {
    btnRank.addEventListener('click', () => {
      const spent = getDevPointsSpent(character);
      const budget = getDevPointsTotal(character);
      if (spent + rankCost > budget) { showToast('Pas assez de PD !', true); return; }
      if (study.ranks >= 20) return;
      study.ranks++;
      setDevPointsSpent(character, spent + rankCost);
      character.spellLog.push({
        timestamp: new Date().toISOString(), action: 'invest', listName: study.listName,
        phase: character.devPhase, details: { cost: rankCost, newRanks: study.ranks },
      });
      // Auto-learn at 20 ranks
      if (study.ranks >= 20) {
        applySpellLearn(study);
      }
      renderEditor(app);
    });
  }

  // SGR button (Spell Gain Roll: D100 + ranks×5 ≥ 101)
  const btnSgr = document.getElementById('btn-spell-sgr');
  if (btnSgr) {
    btnSgr.addEventListener('click', () => {
      performSGR(false);
    });
  }

  // Table roll button (extra SGR after first one — logged as extra)
  const btnSgrTable = document.getElementById('btn-spell-sgr-table');
  if (btnSgrTable) {
    btnSgrTable.addEventListener('click', () => {
      const lang = character.language || 'fr';
      const input = prompt(lang === 'en'
        ? `Enter D100 result from table roll (1-100), or leave empty for digital roll:`
        : `Entrez le résultat du jet sur table (1-100), ou laissez vide pour un jet numérique :`);
      if (input === null) return; // cancelled
      const manualRoll = input.trim() ? parseInt(input.trim()) : 0;
      if (input.trim() && (isNaN(manualRoll) || manualRoll < 1 || manualRoll > 100)) {
        showToast(lang === 'en' ? 'Invalid roll (1-100)' : 'Jet invalide (1-100)', true);
        return;
      }
      performSGR(true, input.trim() ? manualRoll : 0);
    });
  }

  function performSGR(isExtra, manualRoll) {
    const roll = manualRoll || Math.floor(Math.random() * 100) + 1;
    const bonus = study.ranks * 5;
    const total = roll + bonus;
    const success = total >= 101;
    if (!isExtra) study.sgrDone = true;
    const sgrCount = character.spellLog.filter(e => e.action === 'sgr' && e.details.phase === character.devPhase).length;
    character.spellLog.push({
      timestamp: new Date().toISOString(), action: 'sgr', listName: study.listName,
      phase: character.devPhase,
      details: {
        roll, bonus, total, success,
        block: `${study.nextBlockStart}-${study.nextBlockStart + study.blockSize - 1}`,
        extraRoll: isExtra,
        manualEntry: !!manualRoll,
        sgrNumber: sgrCount + 1,
      },
    });
    if (character.name) logSpellSGR(character.name, {
      listName: study.listName, d100: roll, bonus, total, threshold: 101,
      success, levelsGained: success ? study.blockSize : 0, level: character.level,
    });
    if (success) {
      const blockStr = `${study.nextBlockStart}-${study.nextBlockStart + study.blockSize - 1}`;
      finalizeSpellLearn();
      showToast(`SGR: D100=${roll} + ${bonus} = ${total} ≥ 101 → Niveaux ${blockStr} appris !`);
    } else {
      showToast(`SGR: D100=${roll} + ${bonus} = ${total} < 101 — Échec. Rangs conservés.`, true);
    }
    renderEditor(app);
  }

  // Confirm auto-learn (when 20 ranks reached)
  const btnAutoConfirm = document.getElementById('btn-spell-confirm-auto');
  if (btnAutoConfirm) {
    btnAutoConfirm.addEventListener('click', () => {
      const blockStart = study.nextBlockStart;
      const blockEnd = blockStart + study.blockSize - 1;
      character.spellLog.push({
        timestamp: new Date().toISOString(), action: 'auto', listName: study.listName,
        phase: character.devPhase, details: { ranks: 20, block: `${blockStart}-${blockEnd}` },
      });
      finalizeSpellLearn();
      showToast(`Niveaux ${blockStart}-${blockEnd} appris automatiquement !`);
      renderEditor(app);
    });
  }

  // Abandon current study
  const btnAbandon = document.getElementById('btn-spell-abandon');
  if (btnAbandon) {
    btnAbandon.addEventListener('click', () => {
      const lang = character.language || 'fr';
      if (!confirm(lang === 'en' ? 'Abandon current study? All accumulated ranks will be lost.' : 'Abandonner l\'étude en cours ? Tous les rangs accumulés seront perdus.')) return;
      character.spellLog.push({
        timestamp: new Date().toISOString(), action: 'abandon', listName: study.listName,
        phase: character.devPhase, details: { ranksLost: study.ranks },
      });
      // Note: DP already spent are NOT refunded
      study.listName = null; study.listType = null; study.listRealm = null;
      study.ranks = 0; study.sgrDone = false; study.blockSize = 5; study.nextBlockStart = 1;
      renderEditor(app);
    });
  }

  // Study a list (from spell lists table — learned or not yet)
  document.querySelectorAll('.spell-study-list').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const sl = character.spellLists[idx];
      const classRealm = cls ? getRealmKey(cls) : 'none';
      const costInfo = getSpellListCost(cls, classRealm, sl.name, sl.realm || '');
      const typeKey = sl.type || getListTypeKey(costInfo.type, false);
      const blockSize = getSpellBlockSize(cls, typeKey);
      study.listName = sl.name;
      study.listType = typeKey;
      study.listRealm = sl.realm || '';
      study.ranks = 0;
      study.sgrDone = false;
      study.blockSize = blockSize;
      study.nextBlockStart = (sl.maxLevel || 0) + 1;
      character.spellLog.push({
        timestamp: new Date().toISOString(), action: 'start', listName: sl.name,
        phase: character.devPhase, details: { realm: sl.realm, type: typeKey, blockSize, nextBlock: study.nextBlockStart },
      });
      renderEditor(app);
    });
  });

  // Toggle base list type
  document.querySelectorAll('.spell-toggle-base').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const sl = character.spellLists[idx];
      sl.type = sl.type === 'base_own' ? 'open' : 'base_own';
      renderEditor(app);
    });
  });

  // Remove a list from the character's spell lists
  document.querySelectorAll('.spell-remove-list').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const sl = character.spellLists[idx];
      if (sl.maxLevel > 0) {
        const lang = character.language || 'fr';
        if (!confirm(lang === 'en' ? `Remove ${sl.name}? Learned levels will be lost.` : `Retirer ${sl.name} ? Les niveaux appris seront perdus.`)) return;
      }
      character.spellLog.push({
        timestamp: new Date().toISOString(), action: 'remove', listName: sl.name,
        phase: character.devPhase, details: { maxLevel: sl.maxLevel || 0 },
      });
      character.spellLists.splice(idx, 1);
      renderEditor(app);
    });
  });

  // Realm tab switching
  document.querySelectorAll('.spell-realm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.realmTab;
      document.querySelectorAll('.spell-realm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.spell-realm-panel').forEach(p => p.classList.add('hidden'));
      const panel = document.querySelector(`.spell-realm-panel[data-realm-panel="${key}"]`);
      if (panel) panel.classList.remove('hidden');
    });
  });
  // Auto-show first tab (Base if exists, else class realm)
  const firstTab = document.querySelector('.spell-realm-tab');
  if (firstTab) firstTab.click();

  // Add spell list from available lists (just adds to character's list, doesn't start study)
  const baseLists = character.classIndex >= 0 ? getClassBaseSpellLists(character.classIndex) : [];
  document.querySelectorAll('.add-spell-list:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.spellName;
      const realm = btn.dataset.spellRealm || '';
      const classRealm = cls ? getRealmKey(cls) : 'none';
      const costInfo = getSpellListCost(cls, classRealm, name, realm);
      const isBaseOwn = baseLists.some(bl => name.includes(bl) || bl.includes(name));
      const typeKey = isBaseOwn ? 'base_own' : getListTypeKey(costInfo.type, false);
      character.spellLists.push({
        name, maxLevel: 0, reference: realm, type: typeKey, realm: realm,
      });
      character.spellLog.push({
        timestamp: new Date().toISOString(), action: 'add', listName: name,
        phase: character.devPhase, details: { realm, type: typeKey },
      });
      renderEditor(app);
    });
  });

  function finalizeSpellLearn() {
    const blockStart = study.nextBlockStart;
    const blockEnd = blockStart + study.blockSize - 1;
    // Check if list already in learned lists
    const existing = character.spellLists.find(sl => sl.name === study.listName);
    if (existing) {
      existing.maxLevel = blockEnd;
    } else {
      character.spellLists.push({
        name: study.listName,
        maxLevel: blockEnd,
        reference: study.listRealm,
        type: study.listType,
        realm: study.listRealm,
      });
    }
    // Reset study
    study.listName = null; study.listType = null; study.listRealm = null;
    study.ranks = 0; study.sgrDone = false; study.blockSize = 5; study.nextBlockStart = 1;
  }
}

// --- Background option modal helpers ---

function showSetOptionsModal(entries, lang, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'rm-overlay-shell';
  overlay.innerHTML = `
    <div class="rm-modal-panel" style="padding:1.5rem;max-width:36rem">
      <h3 style="font-family:var(--font-title,Cinzel,serif);color:#8b6914;margin-bottom:1rem">
        ${lang === 'en' ? 'Choose an option' : 'Choisissez une option'}
      </h3>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${entries.map((e, i) => {
          const name = lang === 'en' ? (e.name_en || e.name_fr || '') : (e.name_fr || e.name_en || '');
          const desc = (lang === 'en' ? (e.description_en || e.description_fr) : (e.description_fr || e.description_en) || '').slice(0, 120);
          const optional = e.optional ? `<span style="color:#9a6420;font-size:0.7rem"> (${lang === 'en' ? 'optional' : 'optionnel'})</span>` : '';
          return `<button class="set-opt-pick" data-set-idx="${i}"
            style="text-align:left;padding:0.6rem 0.8rem;background:rgba(139,92,20,0.08);
            border:1px solid rgba(139,92,20,0.2);border-radius:4px;cursor:pointer;
            color:#4a3520;font-size:0.85rem">
            <strong>${name}</strong>${optional}
            ${desc ? `<div style="font-size:0.7rem;color:#6b5030;margin-top:2px">${desc}</div>` : ''}
          </button>`;
        }).join('')}
      </div>
      <button style="margin-top:1rem;padding:0.4rem 1rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;cursor:pointer;background:rgba(255,255,255,0.3);color:#4a3520" id="set-opt-cancel">
        ${lang === 'en' ? 'Cancel' : 'Annuler'}
      </button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.set-opt-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      callback(parseInt(btn.dataset.setIdx));
    });
  });
  overlay.querySelector('#set-opt-cancel').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
}

function showStatPickModal(lang, multi, callback) {
  const STATS = [
    { key: 'CO', fr: 'Constitution', en: 'Constitution' },
    { key: 'AG', fr: 'Agilité', en: 'Agility' },
    { key: 'AD', fr: 'Adresse', en: 'Adroitness' },
    { key: 'ME', fr: 'Mémoire', en: 'Memory' },
    { key: 'RS', fr: 'Raison', en: 'Reasoning' },
    { key: 'FO', fr: 'Force', en: 'Strength' },
    { key: 'RP', fr: 'Répartie', en: 'Repartee' },
    { key: 'PR', fr: 'Prestance', en: 'Presence' },
    { key: 'EM', fr: 'Empathie', en: 'Empathy' },
    { key: 'IN', fr: 'Intuition', en: 'Intuition' },
  ];
  const selected = [];
  const overlay = document.createElement('div');
  overlay.className = 'rm-overlay-shell';
  const title = multi > 1
    ? (lang === 'en' ? `Choose ${multi} stats (+1 each)` : `Choisissez ${multi} stats (+1 chacune)`)
    : (lang === 'en' ? 'Choose a stat (+2)' : 'Choisissez une stat (+2)');
  overlay.innerHTML = `
    <div class="rm-modal-panel" style="padding:1.5rem;max-width:28rem">
      <h3 style="font-family:var(--font-title,Cinzel,serif);color:#8b6914;margin-bottom:0.75rem">${title}</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.4rem" id="stat-pick-grid">
        ${STATS.map(s => `<button class="stat-pick-btn" data-key="${s.key}"
          style="padding:0.5rem 0.8rem;border:1px solid rgba(139,92,20,0.2);border-radius:4px;
          cursor:pointer;background:rgba(255,255,255,0.3);color:#4a3520;text-align:left">
          <strong>${s.key}</strong> — ${lang === 'en' ? s.en : s.fr}
        </button>`).join('')}
      </div>
      <div style="margin-top:0.75rem;font-size:0.8rem;color:#6b5030" id="stat-pick-hint">
        ${multi > 1 ? (lang === 'en' ? `Selected: 0 / ${multi}` : `Sélectionnées: 0 / ${multi}`) : ''}
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
        <button id="stat-pick-ok" disabled style="padding:0.4rem 1rem;border:1px solid #946a1e;border-radius:4px;cursor:pointer;background:rgba(139,92,20,0.15);color:#4a3520">OK</button>
        <button id="stat-pick-cancel" style="padding:0.4rem 1rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;cursor:pointer;background:rgba(255,255,255,0.3);color:#4a3520">
          ${lang === 'en' ? 'Cancel' : 'Annuler'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const okBtn = overlay.querySelector('#stat-pick-ok');
  const hint = overlay.querySelector('#stat-pick-hint');
  overlay.querySelectorAll('.stat-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (multi === 1) { document.body.removeChild(overlay); callback([key]); return; }
      const idx = selected.indexOf(key);
      if (idx >= 0) { selected.splice(idx, 1); btn.style.background = 'rgba(255,255,255,0.3)'; }
      else if (selected.length < multi) { selected.push(key); btn.style.background = 'rgba(139,92,20,0.2)'; }
      hint.textContent = lang === 'en' ? `Selected: ${selected.length} / ${multi}` : `Sélectionnées: ${selected.length} / ${multi}`;
      okBtn.disabled = selected.length !== multi;
    });
  });
  okBtn.addEventListener('click', () => { document.body.removeChild(overlay); callback([...selected]); });
  overlay.querySelector('#stat-pick-cancel').addEventListener('click', () => document.body.removeChild(overlay));
}

function showTextInputModal(lang, titleText, placeholder, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'rm-overlay-shell';
  overlay.innerHTML = `
    <div class="rm-modal-panel" style="padding:1.5rem;max-width:26rem">
      <h3 style="font-family:var(--font-title,Cinzel,serif);color:#8b6914;margin-bottom:0.75rem">${titleText}</h3>
      <input id="text-modal-input" type="text" placeholder="${placeholder}"
        style="width:100%;padding:0.5rem 0.7rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,255,255,0.5);color:#2b1806;font:inherit">
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
        <button id="text-modal-ok" style="padding:0.4rem 1rem;border:1px solid #946a1e;border-radius:4px;cursor:pointer;background:rgba(139,92,20,0.15);color:#4a3520">OK</button>
        <button id="text-modal-cancel" style="padding:0.4rem 1rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;cursor:pointer;background:rgba(255,255,255,0.3);color:#4a3520">
          ${lang === 'en' ? 'Cancel' : 'Annuler'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#text-modal-input');
  input.focus();
  overlay.querySelector('#text-modal-ok').addEventListener('click', () => {
    const val = input.value.trim();
    if (val) { document.body.removeChild(overlay); callback(val); }
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { const val = input.value.trim(); if (val) { document.body.removeChild(overlay); callback(val); } } });
  overlay.querySelector('#text-modal-cancel').addEventListener('click', () => document.body.removeChild(overlay));
}

function bindHistoryEvents(app) {
  const lang = character.language || 'fr';
  // Physical description fields
  const fields = {
    'f-height': 'height', 'f-weight': 'weight', 'f-age': 'age',
    'f-hair': 'hair', 'f-eyes': 'eyes', 'f-appearance': 'appearance',
    'f-behavior': 'behavior',
  };
  for (const [id, field] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { character[field] = el.value; });
  }

  // Sex selector — triggers background re-generation
  const sexEl = document.getElementById('f-sex-select');
  if (sexEl) {
    sexEl.addEventListener('change', () => {
      character.sex = sexEl.value;
      // Re-generate size if race is selected
      if (character.raceIndex >= 0) {
        const race = getRaceByIndex(character.raceIndex);
        if (race) autoFillBackground(race);
        renderEditor(app);
      }
    });
  }

  // Re-roll background button
  const btnReroll = document.getElementById('btn-reroll-bg');
  if (btnReroll) {
    btnReroll.addEventListener('click', () => {
      const race = getRaceByIndex(character.raceIndex);
      if (race) autoFillBackground(race);
      renderEditor(app);
    });
  }

  const eqEl = document.getElementById('f-equipment');
  if (eqEl) eqEl.addEventListener('input', () => { character.equipment = eqEl.value; });
  const histEl = document.getElementById('f-history');
  if (histEl) histEl.addEventListener('input', () => { character.history = histEl.value; });

  // Background option roll buttons
  document.querySelectorAll('.bg-opt-roll').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.bgIdx);
      const catSelect = document.querySelector(`.bg-opt-category[data-bg-idx="${idx}"]`);
      if (!catSelect || !catSelect.value) { showToast(lang === 'en' ? 'Select a category first' : 'Choisissez une catégorie', true); return; }

      const bgData = getData().background_options_merged;
      const catIdx = parseInt(catSelect.value);
      const categories = [];
      const s0 = bgData.sources[0];
      if (s0) for (let si = 1; si < (s0.sections || []).length; si++) categories.push({ source: s0, sectionIdx: si });
      const s1 = bgData.sources[1];
      if (s1) for (let si = 0; si < (s1.sections || []).length; si++) categories.push({ source: s1, sectionIdx: si });

      const cat = categories[catIdx];
      if (!cat) return;
      const section = cat.source.sections[cat.sectionIdx];
      const entries = section.entries || [];

      if (section.table_id === '06-02' || (section.name_en || '').includes('Set Options')) {
        // Direct choice — show modal (no D100 roll)
        showSetOptionsModal(entries, lang, ci => {
          if (ci < 0 || ci >= entries.length) return;
          const entry = entries[ci];
          if (!character.backgroundOptions) character.backgroundOptions = { totalOptions: 0, options: [], companionIIITalents: [] };
          character.backgroundOptions.options[idx] = {
            index: idx + 1, source: cat.source.id, category: section.name_en || section.name,
            roll: null, name: entry.name_en || entry.name, name_fr: entry.name_fr || entry.name,
            description: entry.description_fr || entry.description_en || entry.description || '',
            type: entry.type || 'mixed', effects: entry.effects || {}, playerNotes: '', timestamp: new Date().toISOString(),
          };
          const _bgW1 = generateWealthText(getBackgroundBonuses(character));
          if (_bgW1) {
            const _eq1 = character.equipment || '';
            character.equipment = _eq1.replace(/--- Richesse d'historique ---[\s\S]*?(?=\n---|$)/, '').trim();
            character.equipment += (character.equipment ? '\n\n' : '') + _bgW1;
          }
          renderEditor(app);
        });
      } else {
        // D100 roll
        const roll = Math.floor(Math.random() * 100) + 1;
        const entry = entries.find(e => {
          if (!e.roll) return false;
          const r = String(e.roll);
          if (r.includes('-')) { const [lo, hi] = r.split('-').map(Number); return roll >= lo && roll <= hi; }
          return parseInt(r) === roll;
        });
        if (!character.backgroundOptions) character.backgroundOptions = { totalOptions: 0, options: [], companionIIITalents: [] };
        character.backgroundOptions.options[idx] = {
          index: idx + 1, source: cat.source.id, category: section.name_en || section.name,
          roll, name: entry ? (entry.name_en || entry.name || `Roll ${roll}`) : `Roll ${roll}`,
          name_fr: entry ? (entry.name_fr || entry.name) : `Jet ${roll}`,
          description: entry ? (entry.description_fr || entry.description_en || entry.description || '') : '',
          type: entry?.type || 'mixed', effects: entry?.effects || {}, playerNotes: '', timestamp: new Date().toISOString(),
        };
        const _bgW2 = generateWealthText(getBackgroundBonuses(character));
        if (_bgW2) {
          const _eq2 = character.equipment || '';
          character.equipment = _eq2.replace(/--- Richesse d'historique ---[\s\S]*?(?=\n---|$)/, '').trim();
          character.equipment += (character.equipment ? '\n\n' : '') + _bgW2;
        }
        showToast(`D100 = ${roll} → ${entry ? (entry.name_fr || entry.name_en || entry.name) : '?'}`);
        if (character.name) logBgOption(character.name, {
          category: section.name_en || section.name,
          d100: roll, resultName: entry ? (entry.name_fr || entry.name_en || entry.name || `Roll ${roll}`) : `Roll ${roll}`,
          effects: entry?.effects || {}, level: character.level,
        });
        renderEditor(app);
      }
    });
  });

  // Remove background option
  document.querySelectorAll('.bg-opt-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.bgIdx);
      if (character.backgroundOptions) character.backgroundOptions.options[idx] = null;
      renderEditor(app);
    });
  });

  // Background option notes
  document.querySelectorAll('.bg-opt-notes').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.bgIdx);
      if (character.backgroundOptions?.options[idx]) character.backgroundOptions.options[idx].playerNotes = input.value;
    });
  });

  // Background option resolve buttons
  document.querySelectorAll('.bg-opt-resolve').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.bgIdx);
      const opt = character.backgroundOptions?.options[idx];
      if (!opt) return;
      const choiceType = opt.choice_type;
      if (choiceType === 'skill') {
        const skillType = opt.effects.skill_type === 'secondary' ? (lang === 'en' ? 'secondary' : 'secondaire') : (lang === 'en' ? 'primary' : 'primaire');
        const title = lang === 'en'
          ? `Choose a ${skillType} skill for the +${opt.effects.skill_bonus} bonus`
          : `Choisissez une compétence ${skillType} pour le bonus de +${opt.effects.skill_bonus}`;
        showTextInputModal(lang, title, lang === 'en' ? 'Skill name…' : 'Nom de la compétence…', skillName => {
          resolveBackgroundChoice(character, idx, { skill_choice: skillName }); renderEditor(app);
        });
      } else if (choiceType === 'stat') {
        showStatPickModal(lang, 1, keys => {
          resolveBackgroundChoice(character, idx, { stat_choice: keys[0] }); renderEditor(app);
        });
      } else if (choiceType === 'language') {
        showTextInputModal(lang, lang === 'en' ? 'Language name' : 'Nom de la langue', lang === 'en' ? 'e.g. Elvish…' : 'ex. Elfique…', langName => {
          resolveBackgroundChoice(character, idx, { language_name: langName }); renderEditor(app);
        });
      } else if (choiceType === 'stat_increase') {
        // First pick mode: +2 one stat or +1 three stats
        const modeOverlay = document.createElement('div');
        modeOverlay.className = 'rm-overlay-shell';
        modeOverlay.innerHTML = `
          <div class="rm-modal-panel" style="padding:1.5rem;max-width:24rem">
            <h3 style="font-family:var(--font-title,Cinzel,serif);color:#8b6914;margin-bottom:1rem">
              ${lang === 'en' ? 'Stat increase — choose mode' : 'Augmentation de stat — choisissez le mode'}
            </h3>
            <div style="display:flex;flex-direction:column;gap:0.5rem">
              <button id="mode-2" style="padding:0.6rem 0.8rem;border:1px solid rgba(139,92,20,0.2);border-radius:4px;cursor:pointer;background:rgba(139,92,20,0.08);color:#4a3520;text-align:left">
                <strong>${lang === 'en' ? '+2 to one stat' : '+2 à une stat'}</strong>
              </button>
              <button id="mode-3" style="padding:0.6rem 0.8rem;border:1px solid rgba(139,92,20,0.2);border-radius:4px;cursor:pointer;background:rgba(139,92,20,0.08);color:#4a3520;text-align:left">
                <strong>${lang === 'en' ? '+1 to three stats' : '+1 à trois stats'}</strong>
              </button>
              <button id="mode-cancel" style="margin-top:0.25rem;padding:0.4rem 1rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;cursor:pointer;background:rgba(255,255,255,0.3);color:#4a3520">
                ${lang === 'en' ? 'Cancel' : 'Annuler'}
              </button>
            </div>
          </div>`;
        document.body.appendChild(modeOverlay);
        modeOverlay.querySelector('#mode-2').addEventListener('click', () => {
          document.body.removeChild(modeOverlay);
          showStatPickModal(lang, 1, keys => {
            const si = ['CO','AG','AD','ME','RS','FO','RP','PR','EM','IN'].indexOf(keys[0]);
            if (si >= 0) { resolveStatIncrease(character, idx, '2', [si]); renderEditor(app); }
          });
        });
        modeOverlay.querySelector('#mode-3').addEventListener('click', () => {
          document.body.removeChild(modeOverlay);
          showStatPickModal(lang, 3, keys => {
            const allKeys = ['CO','AG','AD','ME','RS','FO','RP','PR','EM','IN'];
            const indices = keys.map(k => allKeys.indexOf(k)).filter(i => i >= 0);
            if (indices.length === 3) { resolveStatIncrease(character, idx, '1x3', indices); renderEditor(app); }
          });
        });
        modeOverlay.querySelector('#mode-cancel').addEventListener('click', () => document.body.removeChild(modeOverlay));
      }
    });
  });

  // Companion III talent selection
  document.querySelectorAll('.c3-talent-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      const statIdx = parseInt(btn.dataset.statIdx);
      const select = document.querySelector(`.c3-talent-pick[data-stat-idx="${statIdx}"]`);
      if (!select || !select.value) return;
      const tier = select.selectedOptions[0]?.dataset.tier || 'A';
      const name = select.selectedOptions[0]?.textContent.replace(/^[ABC]: /, '') || select.value;
      if (!character.backgroundOptions) character.backgroundOptions = { totalOptions: 0, options: [], companionIIITalents: [] };
      if (!character.backgroundOptions.companionIIITalents) character.backgroundOptions.companionIIITalents = [];
      character.backgroundOptions.companionIIITalents.push({
        statIndex: statIdx, statValue: character.stats[statIdx],
        pickTier: tier, name, entryId: select.value, timestamp: new Date().toISOString(),
      });
      renderEditor(app);
    });
  });

  // Load event journal async and inject as timeline
  if (character.name) {
    getCharacterHistory(character.name, { limit: 50 }).then(history => {
      const container = document.getElementById('event-journal-container');
      if (!container) return;
      if (history.length === 0) {
        container.innerHTML = `<div style="color:#6b5030;font-size:0.82rem;padding:0.75rem">${lang === 'en' ? 'No events yet.' : 'Aucun événement.'}</div>`;
        return;
      }
      const EVENT_TYPE_MAP = {
        'stat_roll': 'stats', 'stat_validate': 'stats', 'hp_roll': 'stats', 'level_up': 'stats', 'phase_validate': 'stats',
        'skill_develop': 'skills',
        'spell_sgr': 'spells',
        'bg_option_roll': 'notes', 'note': 'notes', 'save': 'notes',
      };
      const EVENT_LABELS = {
        stat_roll: { fr: 'Jet de stat', en: 'Stat roll' },
        stat_validate: { fr: 'Stats validées', en: 'Stats validated' },
        skill_develop: { fr: 'Compétence développée', en: 'Skill developed' },
        spell_sgr: { fr: 'Jet SGR', en: 'SGR roll' },
        phase_validate: { fr: 'Phase validée', en: 'Phase validated' },
        level_up: { fr: 'Passage de niveau', en: 'Level up' },
        bg_option_roll: { fr: 'Option d\'historique', en: 'Background option' },
        hp_roll: { fr: 'Jet PdC', en: 'HP roll' },
        note: { fr: 'Note', en: 'Note' },
        save: { fr: 'Sauvegarde', en: 'Save' },
      };
      const allItems = [...history].reverse().map(e => {
        const type = EVENT_TYPE_MAP[e.type] || 'notes';
        const d = new Date(e.timestamp);
        const time = d.toLocaleDateString(lang === 'en' ? 'en' : 'fr') + ' · ' +
          d.toLocaleTimeString(lang === 'en' ? 'en' : 'fr', { hour: '2-digit', minute: '2-digit' });
        const title = EVENT_LABELS[e.type]?.[lang] || e.type;
        const tag = { stats: lang === 'en' ? 'Stats' : 'Stats', skills: lang === 'en' ? 'Skills' : 'Compét.', spells: lang === 'en' ? 'Spells' : 'Sorts', notes: lang === 'en' ? 'Notes' : 'Notes' }[type] || type;
        return `<article class="rm-timeline-item" data-type="${type}">
          <div class="rm-timeline-head">
            <div>
              <h4 class="rm-timeline-title">${title}</h4>
              <p class="rm-timeline-meta">${time}</p>
            </div>
            <span class="rm-timeline-tag">${tag}</span>
          </div>
          ${e.summary ? `<div class="rm-timeline-body" style="font-size:0.82rem;margin-top:0.4rem">${e.summary}</div>` : ''}
        </article>`;
      });
      container.innerHTML = allItems.join('') || `<div style="color:#6b5030;font-size:0.82rem;padding:0.75rem">${lang === 'en' ? 'No events yet.' : 'Aucun événement.'}</div>`;

      // Wire filter chips
      const filterChips = document.querySelectorAll('.rm-filter-chip[data-filter]');
      filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
          filterChips.forEach(c => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          const filter = chip.dataset.filter;
          container.querySelectorAll('.rm-timeline-item').forEach(item => {
            item.style.display = (filter === 'all' || item.dataset.type === filter) ? '' : 'none';
          });
        });
      });
    }).catch(() => {});
  }
}

function bindSkillsEvents(app) {
  // Phase validation: end current development phase (irréversible)
  const btnValidatePhase = document.getElementById('btn-validate-phase');
  if (btnValidatePhase) {
    btnValidatePhase.addEventListener('click', () => {
      const lang = character.language || 'fr';
      const phaseLabel = character.devPhase === 'adolescent' ? 'Adolescent' : character.devPhase === 'apprenti' ? 'Apprenti' : `Niveau ${character.level}`;
      const msg = lang === 'en'
        ? `End the ${phaseLabel} development phase?\nUnspent DP will be lost. This action is irreversible.`
        : `Valider la phase de développement ${phaseLabel} ?\nLes PD non dépensés seront perdus. Cette action est irréversible.`;
      if (!confirm(msg)) return;

      // Snapshot current phase
      if (!character.phases) character.phases = [];
      character.phases.push({
        phase: character.devPhase === 'level' ? character.level : character.devPhase,
        dpTotal: getDevPointsTotal(character),
        dpSpent: getDevPointsSpent(character),
        skillRanks: { ...getCurrentPhaseRanksObj(character) },
        validatedAt: new Date().toISOString(),
      });
      character.phaseValidated = true;
      if (character.name) logPhaseValidate(character.name, {
        phase: character.devPhase === 'level' ? character.level : character.devPhase,
        dpTotal: getDevPointsTotal(character), dpSpent: getDevPointsSpent(character),
        level: character.level,
      });
      showToast(lang === 'en' ? `${phaseLabel} phase validated!` : `Phase ${phaseLabel} validée !`);
      renderEditor(app);
    });
  }

  // Next phase: advance to next level (only when validated)
  const btnNextPhase = document.getElementById('btn-next-phase');
  if (btnNextPhase) {
    btnNextPhase.addEventListener('click', () => performLevelUp(app));
  }

  // Repeat previous phase ranks
  const btnRepeat = document.getElementById('btn-repeat-previous');
  if (btnRepeat) {
    btnRepeat.addEventListener('click', () => {
      const phases = character.phases || [];
      if (phases.length === 0) return;
      const lastPhase = phases[phases.length - 1];
      const prevRanks = lastPhase.skillRanks || {};
      const ranksObj = getCurrentPhaseRanksObj(character);
      const budget = getDevPointsTotal(character);
      const bodyDevIdx = getBodyDevSkillIndex();
      const lang = character.language || 'fr';
      let totalCost = 0;

      for (const [key, ranks] of Object.entries(prevRanks)) {
        if (ranks <= 0) continue;
        const skillIdx = key.startsWith('wpn_') || key.startsWith('sub_') ? key : parseInt(key);
        const cost = typeof skillIdx === 'number' ? getSkillDevCost(character.classIndex, skillIdx) : null;
        if (!cost) {
          ranksObj[key] = ranks;
          totalCost += ranks * 4;
          continue;
        }
        const rankCost = ranks >= 1 ? cost.first : 0;
        const rank2Cost = ranks >= 2 && cost.second > 0 ? cost.second : 0;
        const thisCost = rankCost + rank2Cost;
        if (totalCost + thisCost <= budget) {
          ranksObj[key] = ranks;
          totalCost += thisCost;
          // Body Dev: roll hit dice for each rank copied
          if (skillIdx === bodyDevIdx) {
            const dieStr = character.raceHitDie || '1-10';
            const dieMatch = dieStr.match(/1-(\d+)/);
            const dieMax = dieMatch ? parseInt(dieMatch[1]) : 10;
            if (!character.bodyDevRolls) character.bodyDevRolls = [];
            for (let r = 0; r < ranks; r++) {
              const autoRoll = Math.floor(Math.random() * dieMax) + 1;
              const input = prompt(
                lang === 'en'
                  ? `Body Dev rank ${r + 1}/${ranks} — hit die (1d${dieMax}): auto = ${autoRoll}.\nOK to accept or enter table roll:`
                  : `Dév. Corporel rang ${r + 1}/${ranks} — dé de vie (1d${dieMax}) : auto = ${autoRoll}.\nOK pour accepter ou entrez votre jet :`,
                String(autoRoll)
              );
              const val = input !== null ? (parseInt(input) || autoRoll) : autoRoll;
              character.bodyDevRolls.push(Math.max(1, Math.min(dieMax, val)));
            }
          }
        }
      }
      setDevPointsSpent(character, totalCost);
      showToast(lang === 'en' ? `Copied ${Object.keys(prevRanks).length} skills from previous phase` : `${Object.keys(prevRanks).length} compétences copiées de la phase précédente`);
      renderEditor(app);
    });
  }

  // Phase history popup
  const btnHistory = document.getElementById('btn-phase-history');
  if (btnHistory) {
    btnHistory.addEventListener('click', () => openPhaseHistoryPopup());
  }

  // Skill highlighting — click to cycle colors
  const HL_COLORS = ['', 'yellow', 'green', 'pink', 'blue', 'orange'];
  document.querySelectorAll('.skill-highlight-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      // Don't trigger on button clicks inside the cell
      if (e.target.tagName === 'BUTTON') return;
      const idx = cell.dataset.skillHl;
      if (!character.skillHighlights) character.skillHighlights = {};
      const current = character.skillHighlights[idx] || '';
      const currentPos = HL_COLORS.indexOf(current);
      const next = HL_COLORS[(currentPos + 1) % HL_COLORS.length];
      if (next) {
        character.skillHighlights[idx] = next;
      } else {
        delete character.skillHighlights[idx];
      }
      // Update row class immediately
      const row = cell.closest('tr');
      HL_COLORS.forEach(c => { if (c) row.classList.remove('highlight-' + c); });
      if (next) row.classList.add('highlight-' + next);
    });

    // Right-click: format menu (bold, text color)
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const idx = cell.dataset.skillHl;
      showSkillFormatMenu(e.pageX, e.pageY, idx, app);
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
      const _skills = getAllSkillsFlat();
      if (character.name) logSkillDevelop(character.name, {
        skillIndex: skillIdx, skillName: _skills[skillIdx]?.name_fr || String(skillIdx),
        ranksAdded: 1, dpCost: rankCost, phase: character.devPhase, level: character.level,
      });
      // Body Dev: roll hit die (or manual entry)
      if (skillIdx === getBodyDevSkillIndex()) {
        const dieStr = character.raceHitDie || '1-10';
        const match = dieStr.match(/1-(\d+)/);
        const dieMax = match ? parseInt(match[1]) : 10;
        const autoRoll = Math.floor(Math.random() * dieMax) + 1;
        const lang = character.language || 'fr';
        const input = prompt(
          lang === 'en'
            ? `Body Dev hit die (1d${dieMax}): auto roll = ${autoRoll}.\nPress OK to accept, or enter your own table roll (1-${dieMax}):`
            : `Dé de vie Dév. Corporel (1d${dieMax}) : jet auto = ${autoRoll}.\nAppuyez OK pour accepter, ou entrez votre jet sur table (1-${dieMax}) :`,
          String(autoRoll)
        );
        if (input === null) {
          // Cancelled — undo the rank
          ranksObj[skillIdx] = phaseRanks;
          if (ranksObj[skillIdx] === 0) delete ranksObj[skillIdx];
          setDevPointsSpent(character, spent);
        } else {
          const val = parseInt(input) || autoRoll;
          const clamped = Math.max(1, Math.min(dieMax, val));
          if (!character.bodyDevRolls) character.bodyDevRolls = [];
          character.bodyDevRolls.push(clamped);
          if (character.name) logHpRoll(character.name, {
            rank: character.bodyDevRolls.length, dieRoll: clamped, dieType: dieMax,
            level: character.level,
          });
          showToast(`Body Dev +1 → ${clamped === autoRoll ? '' : '(table) '}${clamped} PdC`);
        }
      }
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
      // Body Dev: remove last die roll
      if (skillIdx === getBodyDevSkillIndex() && character.bodyDevRolls && character.bodyDevRolls.length > 0) {
        character.bodyDevRolls.pop();
      }
      renderEditor(app);
    });
  });

  // Misc bonus inputs (handles both numeric skill indices and 'wpn_N' string keys)
  document.querySelectorAll('.skill-misc-input').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.skill;
      // Keys: numeric for skills, 'wpn_N' for weapons, 'sub_P_N' for sub-skills
      const idx = key.startsWith('wpn_') || key.startsWith('sub_') ? key : parseInt(key);
      const val = parseInt(input.value) || 0;
      if (val) {
        character.skillMiscBonuses[idx] = val;
      } else {
        delete character.skillMiscBonuses[idx];
      }
      renderEditor(app);
    });
  });

  // "Add weapon" button — opens selection popup
  document.querySelectorAll('.btn-add-weapon-skill').forEach(btn => {
    btn.addEventListener('click', () => {
      openWeaponSkillSelector(app);
    });
  });

  // Weapon sub-skill + buttons
  document.querySelectorAll('.wpn-skill-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const wsIdx = parseInt(btn.dataset.wpnSkill);
      const wpn = character.weaponSkills[wsIdx];
      if (!wpn) return;
      const wsKey = 'wpn_' + wsIdx;
      const phaseRanks = getCurrentPhaseRanks(character, wsKey);
      const maxRanks = wpn.cost.second > 0 ? 2 : 1;
      if (phaseRanks >= maxRanks) return;
      const rankCost = phaseRanks === 0 ? wpn.cost.first : wpn.cost.second;
      const devPts = getDevPointsTotal(character);
      const spent = getDevPointsSpent(character);
      if (spent + rankCost > devPts) return;
      const ranksObj = getCurrentPhaseRanksObj(character);
      ranksObj[wsKey] = phaseRanks + 1;
      setDevPointsSpent(character, spent + rankCost);
      renderEditor(app);
    });
  });

  // Weapon sub-skill - buttons
  document.querySelectorAll('.wpn-skill-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const wsIdx = parseInt(btn.dataset.wpnSkill);
      const wpn = character.weaponSkills[wsIdx];
      if (!wpn) return;
      const wsKey = 'wpn_' + wsIdx;
      const phaseRanks = getCurrentPhaseRanks(character, wsKey);
      if (phaseRanks <= 0) return;
      const refund = phaseRanks === 2 ? wpn.cost.second : wpn.cost.first;
      const ranksObj = getCurrentPhaseRanksObj(character);
      ranksObj[wsKey] = phaseRanks - 1;
      if (ranksObj[wsKey] === 0) delete ranksObj[wsKey];
      const spent = getDevPointsSpent(character);
      setDevPointsSpent(character, Math.max(0, spent - refund));
      renderEditor(app);
    });
  });

  // Weapon sub-skill remove
  document.querySelectorAll('.wpn-skill-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const wsIdx = parseInt(btn.dataset.wpnSkill);
      character.weaponSkills.splice(wsIdx, 1);
      renderEditor(app);
    });
  });

  // Generic "Add sub-skill" button for non-weapon parents
  document.querySelectorAll('.btn-add-subskill').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentIdx = parseInt(btn.dataset.parent);
      openSubSkillSelector(app, parentIdx);
    });
  });

  // Generic sub-skill + buttons
  document.querySelectorAll('.sub-skill-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const subKey = btn.dataset.subKey;
      const parentIdx = parseInt(btn.dataset.parent);
      const subIdx = parseInt(btn.dataset.subIdx);
      const sub = character.subSkills.filter(s => s.parentIndex === parentIdx)[subIdx];
      if (!sub) return;
      const cost = sub.cost || getSkillDevCost(character.classIndex, parentIdx) || { first: 4, second: 0 };
      const phaseRanks = getCurrentPhaseRanks(character, subKey);
      const maxRanks = cost.second > 0 ? 2 : 1;
      if (phaseRanks >= maxRanks) return;
      const rankCost = phaseRanks === 0 ? cost.first : cost.second;
      const spent = getDevPointsSpent(character);
      const devPts = getDevPointsTotal(character);
      if (spent + rankCost > devPts) return;
      const ranksObj = getCurrentPhaseRanksObj(character);
      ranksObj[subKey] = phaseRanks + 1;
      setDevPointsSpent(character, spent + rankCost);
      renderEditor(app);
    });
  });

  // Generic sub-skill - buttons
  document.querySelectorAll('.sub-skill-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const subKey = btn.dataset.subKey;
      const parentIdx = parseInt(btn.dataset.parent);
      const subIdx = parseInt(btn.dataset.subIdx);
      const sub = character.subSkills.filter(s => s.parentIndex === parentIdx)[subIdx];
      if (!sub) return;
      const cost = sub.cost || getSkillDevCost(character.classIndex, parentIdx) || { first: 4, second: 0 };
      const phaseRanks = getCurrentPhaseRanks(character, subKey);
      if (phaseRanks <= 0) return;
      const refund = phaseRanks === 2 ? cost.second : cost.first;
      const ranksObj = getCurrentPhaseRanksObj(character);
      ranksObj[subKey] = phaseRanks - 1;
      if (ranksObj[subKey] === 0) delete ranksObj[subKey];
      const spent = getDevPointsSpent(character);
      setDevPointsSpent(character, Math.max(0, spent - refund));
      renderEditor(app);
    });
  });

  // Generic sub-skill remove
  document.querySelectorAll('.sub-skill-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentIdx = parseInt(btn.dataset.parent);
      const subIdx = parseInt(btn.dataset.subIdx);
      const subs = character.subSkills.filter(s => s.parentIndex === parentIdx);
      if (subIdx < subs.length) {
        const idx = character.subSkills.indexOf(subs[subIdx]);
        if (idx >= 0) character.subSkills.splice(idx, 1);
      }
      renderEditor(app);
    });
  });

  // Generic sub-skill edit (name + stats)
  document.querySelectorAll('.sub-skill-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentIdx = parseInt(btn.dataset.parent);
      const subIdx = parseInt(btn.dataset.subIdx);
      openSubSkillEditor(app, parentIdx, subIdx);
    });
  });
}

// Weapon type ID → monde.weapon_categories type number
const WEAPON_TYPE_MAP = {
  'edged_1h': 1, 'blunt_1h': 2, 'two_handed': 3,
  'polearm': 4, 'ranged': 5, 'thrown': 6,
};

/**
 * Open weapon skill selector — shows subcategories and individual weapons
 * from the 6 weapon categories the player chose in the Armes tab.
 */
function openWeaponSkillSelector(app) {
  const monde = getData().monde;
  if (!monde || !monde.weapon_categories) return;

  // Build HTML: for each weapon priority, show subcategories and weapons
  let html = `<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" id="wpn-selector-overlay">
    <div class="bg-gray-800 rounded-lg p-4 max-w-lg" style="display:flex;flex-direction:column">
      <h3 class="text-amber-300 font-bold mb-3">Choisir une arme</h3>
      <div class="overflow-y-auto flex-1">`;

  for (let slot = 0; slot < 6; slot++) {
    const typeId = character.weaponPriorities[slot];
    if (!typeId) continue;
    const typeNum = WEAPON_TYPE_MAP[typeId];
    const wcDef = WEAPON_CATEGORIES.find(w => w.id === typeId);
    const subcats = monde.weapon_categories.filter(wc => wc.type === typeNum);
    const cost = getWeaponSkillCost(character.classIndex, typeId, character.weaponPriorities);
    const costStr = cost ? (cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`) : '?';

    html += `<div class="mb-3">
      <div class="text-sm text-purple-400 font-bold">${slot + 1}. ${wcDef ? wcDef.fr : typeId} <span class="text-gray-500 text-xs">(coût: ${costStr})</span></div>`;
    for (const sc of subcats) {
      html += `<div class="ml-3 text-xs text-gray-500">${sc.name}</div>`;
      for (const weapon of sc.weapons) {
        const already = character.weaponSkills.some(ws => ws.name === weapon && ws.weaponType === typeNum);
        html += `<button class="ml-6 text-xs py-0.5 block ${already ? 'text-gray-600' : 'text-gray-400 hover:text-amber-300'} wpn-select-item"
          data-wpn-name="${esc(weapon)}" data-wpn-type="${typeNum}" data-wpn-type-id="${typeId}"
          ${already ? 'disabled' : ''}>${weapon}${already ? ' ✓' : ''}</button>`;
      }
    }
    html += `</div>`;
  }

  html += `</div>
      <button class="btn-secondary text-sm mt-3" id="wpn-selector-close">Fermer</button>
    </div></div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Bind events
  document.getElementById('wpn-selector-close').addEventListener('click', () => {
    document.getElementById('wpn-selector-overlay').remove();
  });
  document.getElementById('wpn-selector-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'wpn-selector-overlay') e.target.remove();
  });

  document.querySelectorAll('.wpn-select-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.wpnName;
      const typeNum = parseInt(btn.dataset.wpnType);
      const typeId = btn.dataset.wpnTypeId;
      const cost = getWeaponSkillCost(character.classIndex, typeId, character.weaponPriorities);
      if (!cost) return;

      character.weaponSkills.push({
        name,
        weaponType: typeNum,
        weaponTypeId: typeId,
        cost: { first: cost.first, second: cost.second },
      });

      document.getElementById('wpn-selector-overlay').remove();
      renderEditor(app);
    });
  });
}

/**
 * Open sub-skill selector popup for a parent skill (non-weapon).
 */
function openSubSkillSelector(app, parentIndex) {
  // Get options based on parent type
  let options = getParentSubSkillOptions(parentIndex);

  // Special case: Spell Mastery uses character's known spell lists
  if (parentIndex === 148) {
    options = character.spellLists.filter(sl => sl.name).map(sl => ({ name: sl.name }));
  }

  if (options.length === 0) {
    // Free-text specialization for specializable skills
    const lang = character.language || 'fr';
    const suggestion = getSpecializationSuggestion(parentIndex, lang);
    const msg = lang === 'en'
      ? `Enter specialization name:${suggestion ? `\nEx.: ${suggestion}` : ''}`
      : `Nom de la spécialisation :${suggestion ? `\nEx. : ${suggestion}` : ''}`;
    const input = prompt(msg);
    if (!input || !input.trim()) return;
    const cost = getSkillDevCost(character.classIndex, parentIndex);
    character.subSkills.push({
      parentIndex,
      name: input.trim(),
      cost: cost ? { first: cost.first, second: cost.second } : { first: 4, second: 0 },
    });
    renderEditor(app);
    return;
  }

  // Get cost for this parent skill
  const cost = getSkillDevCost(character.classIndex, parentIndex);
  const costStr = cost ? (cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`) : '?';

  // Find parent name
  let parentName = '';
  let gIdx = 0;
  const categories = getAllCategories();
  for (const cat of categories) {
    for (const skill of cat.skills) {
      if (gIdx === parentIndex) parentName = skill.name_fr;
      gIdx++;
    }
  }

  let html = `<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" id="subskill-selector-overlay">
    <div class="bg-gray-800 rounded-lg p-4 max-w-md" style="display:flex;flex-direction:column">
      <h3 class="text-amber-300 font-bold mb-1">${esc(parentName)}</h3>
      <p class="text-xs text-gray-500 mb-3">Coût: ${costStr} par rang</p>
      <div class="overflow-y-auto flex-1" style="max-height:60vh">`;

  for (const opt of options) {
    const already = character.subSkills.some(s => s.parentIndex === parentIndex && s.name === opt.name);
    html += `<button class="block w-full text-left text-sm py-1 px-2 rounded ${already ? 'text-gray-600' : 'text-gray-300 hover:bg-gray-700 hover:text-amber-300'} subskill-select-item"
      data-name="${esc(opt.name)}" data-parent="${parentIndex}" ${already ? 'disabled' : ''}>
      ${esc(opt.name)}${already ? ' ✓' : ''}
    </button>`;
  }

  html += `</div>
      <button class="btn-secondary text-sm mt-3" id="subskill-selector-close">Fermer</button>
    </div></div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('subskill-selector-close').addEventListener('click', () => {
    document.getElementById('subskill-selector-overlay').remove();
  });
  document.getElementById('subskill-selector-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'subskill-selector-overlay') e.target.remove();
  });

  document.querySelectorAll('.subskill-select-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      character.subSkills.push({
        parentIndex,
        name: btn.dataset.name,
        cost: cost ? { first: cost.first, second: cost.second } : { first: 4, second: 0 },
      });
      document.getElementById('subskill-selector-overlay').remove();
      renderEditor(app);
    });
  });
}

/**
 * Open editor popup for a sub-skill: rename + change determining stats.
 */
function openSubSkillEditor(app, parentIndex, subIdx) {
  const subs = character.subSkills.filter(s => s.parentIndex === parentIndex);
  if (subIdx >= subs.length) return;
  const sub = subs[subIdx];
  const lang = character.language || 'fr';

  // Find parent skill to get default stats
  let parentSkill = null;
  let gIdx = 0;
  const categories = getAllCategories();
  for (const cat of categories) {
    for (const skill of cat.skills) {
      if (gIdx === parentIndex) parentSkill = skill;
      gIdx++;
    }
  }
  const parentStatIndices = parentSkill ? getSkillStatIndices(parentSkill) : [];
  // Current custom stats (0-based) or null
  const currentStats = sub.stats && sub.stats.length > 0 ? sub.stats : null;
  // If no custom stats, default display is parent's stats (convert 1-based to 0-based)
  const displayStats = currentStats || parentStatIndices.map(i => i - 1);
  const statCount = displayStats.length || 2; // default to 2 slots if parent has none

  const statNames = lang === 'en' ? STAT_NAMES_EN : STAT_NAMES_FR;

  let html = `<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" id="subskill-editor-overlay">
    <div class="bg-gray-800 rounded-lg p-4 w-80">
      <h3 class="text-amber-300 font-bold mb-3">${lang === 'en' ? 'Edit Sub-Skill' : 'Modifier sous-compétence'}</h3>
      <div class="mb-3">
        <label class="text-xs text-gray-500">${lang === 'en' ? 'Name' : 'Nom'}</label>
        <input type="text" id="subskill-edit-name" class="field-inline w-full text-sm" value="${esc(sub.name)}" style="background:#1f2937;border:1px solid #4b5563;padding:4px 8px;border-radius:4px">
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500">${lang === 'en' ? 'Determining Stats (for bonus)' : 'Caractéristiques déterminantes (pour bonus)'}</label>
        <div class="flex gap-2 mt-1">`;

  // Render 1-3 stat selectors
  const numSlots = Math.max(statCount, 1);
  for (let s = 0; s < 3; s++) {
    const selected = s < displayStats.length ? displayStats[s] : -1;
    html += `<select class="subskill-stat-select text-sm" data-slot="${s}" style="background:#1f2937;border:1px solid #4b5563;padding:2px 4px;border-radius:4px;color:#d1d5db;flex:1${s >= numSlots ? ';opacity:0.4' : ''}">
      <option value="-1" ${selected === -1 ? 'selected' : ''}>—</option>`;
    for (let si = 0; si < 10; si++) {
      html += `<option value="${si}" ${selected === si ? 'selected' : ''}>${STAT_ABBREVS[si]} — ${statNames[si]}</option>`;
    }
    html += `</select>`;
  }

  html += `</div>
        <p class="text-xs text-gray-600 mt-1">${lang === 'en' ? 'Average of selected stats = bonus' : 'Moyenne des carac. sélectionnées = bonus'}</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-primary text-sm flex-1" id="subskill-edit-save">${lang === 'en' ? 'Save' : 'Enregistrer'}</button>
        <button class="btn-secondary text-sm flex-1" id="subskill-edit-cancel">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
      </div>
    </div></div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('subskill-edit-cancel').addEventListener('click', () => {
    document.getElementById('subskill-editor-overlay').remove();
  });
  document.getElementById('subskill-editor-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'subskill-editor-overlay') e.target.remove();
  });

  document.getElementById('subskill-edit-save').addEventListener('click', () => {
    const newName = document.getElementById('subskill-edit-name').value.trim();
    if (newName) sub.name = newName;

    // Collect selected stats
    const newStats = [];
    document.querySelectorAll('.subskill-stat-select').forEach(sel => {
      const v = parseInt(sel.value);
      if (v >= 0 && v <= 9) newStats.push(v);
    });
    sub.stats = newStats.length > 0 ? newStats : undefined;

    document.getElementById('subskill-editor-overlay').remove();
    renderEditor(app);
  });
}

/**
 * Show phase history popup — lists all validated phases.
 */
function showSkillFormatMenu(x, y, skillIdx, app) {
  document.getElementById('skill-format-menu')?.remove();
  const lang = character.language || 'fr';
  const isBold = (character.skillBold || {})[skillIdx] || false;
  const currentColor = (character.skillTextColors || {})[skillIdx] || '';

  const menu = document.createElement('div');
  menu.id = 'skill-format-menu';
  menu.style.cssText = `position:absolute;z-index:1000;background:#2a2218;border:1px solid #8b6914;border-radius:6px;padding:4px 0;min-width:140px;box-shadow:0 4px 16px rgba(0,0,0,0.6);left:${x}px;top:${y}px`;
  menu.innerHTML = `
    <div class="scm-item" data-action="bold" style="padding:4px 12px;cursor:pointer;font-size:0.8rem;color:#d4c5a9">
      ${isBold ? '☑' : '☐'} ${lang === 'en' ? 'Bold' : 'Gras'}
    </div>
    <div style="border-top:1px solid #444;margin:2px 0"></div>
    <div style="padding:4px 12px;font-size:0.7rem;color:#888">${lang === 'en' ? 'Text color:' : 'Couleur texte :'}</div>
    <div class="scm-item" data-action="color-none" style="padding:4px 12px;cursor:pointer;font-size:0.8rem;color:#d4c5a9${currentColor === '' ? ';font-weight:bold' : ''}">● ${lang === 'en' ? 'Normal' : 'Normal'}</div>
    <div class="scm-item" data-action="color-red" style="padding:4px 12px;cursor:pointer;font-size:0.8rem;color:#c00${currentColor === 'red' ? ';font-weight:bold' : ''}">● ${lang === 'en' ? 'Red' : 'Rouge'}</div>
    <div class="scm-item" data-action="color-blue" style="padding:4px 12px;cursor:pointer;font-size:0.8rem;color:#06c${currentColor === 'blue' ? ';font-weight:bold' : ''}">● ${lang === 'en' ? 'Blue' : 'Bleu'}</div>
    <div class="scm-item" data-action="color-green" style="padding:4px 12px;cursor:pointer;font-size:0.8rem;color:#060${currentColor === 'green' ? ';font-weight:bold' : ''}">● ${lang === 'en' ? 'Green' : 'Vert'}</div>
  `;

  document.body.appendChild(menu);

  menu.querySelectorAll('.scm-item').forEach(item => {
    item.addEventListener('mouseenter', () => { item.style.background = 'rgba(212,160,23,0.15)'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; });
  });

  menu.addEventListener('click', (e) => {
    const action = e.target.closest('.scm-item')?.dataset.action;
    if (!action) return;
    if (action === 'bold') {
      if (!character.skillBold) character.skillBold = {};
      character.skillBold[skillIdx] = !isBold;
    } else if (action.startsWith('color-')) {
      if (!character.skillTextColors) character.skillTextColors = {};
      const color = action.replace('color-', '');
      if (color === 'none') delete character.skillTextColors[skillIdx];
      else character.skillTextColors[skillIdx] = color;
    }
    menu.remove();
    renderEditor(app);
  });

  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }, { once: true });
  }, 10);
}

function openPhaseHistoryPopup() {
  const lang = character.language || 'fr';
  const phases = character.phases || [];
  let rows = '';
  for (const p of phases) {
    const label = typeof p.phase === 'number' ? `Niveau ${p.phase}` : (p.phase === 'adolescent' ? 'Adolescent' : 'Apprenti');
    const date = new Date(p.validatedAt).toLocaleString();
    const rankCount = Object.values(p.skillRanks || {}).reduce((s, v) => s + v, 0);
    rows += `<tr>
      <td class="text-amber-300">${label}</td>
      <td class="text-center">${p.dpSpent} / ${p.dpTotal}</td>
      <td class="text-center">${rankCount}</td>
      <td class="text-xs text-gray-500">${date}</td>
    </tr>`;
  }

  const html = `<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" id="phase-history-overlay">
    <div class="bg-gray-800 rounded-lg p-4 max-w-lg" style="display:flex;flex-direction:column">
      <h3 class="text-amber-300 font-bold mb-3">${lang === 'en' ? 'Phase History' : 'Historique des phases'}</h3>
      <div class="overflow-y-auto flex-1">
        <table class="skill-table text-sm">
          <thead><tr>
            <th>Phase</th>
            <th class="text-center">${lang === 'en' ? 'DP Used' : 'PD utilisés'}</th>
            <th class="text-center">${lang === 'en' ? 'Ranks' : 'Rangs'}</th>
            <th>${lang === 'en' ? 'Date' : 'Date'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <button class="btn-secondary text-sm mt-3" id="phase-history-close">${lang === 'en' ? 'Close' : 'Fermer'}</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('phase-history-close').addEventListener('click', () => {
    document.getElementById('phase-history-overlay').remove();
  });
  document.getElementById('phase-history-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'phase-history-overlay') e.target.remove();
  });
}

/**
 * Print configuration popup — font, skill filters, spell options, etc.
 */
function openPrintConfigPopup() {
  const lang = character.language || 'fr';
  // Print config state (stored on character for persistence)
  if (!character.printConfig) {
    character.printConfig = {
      font: 'Arial',
      skillFilter: 'both', // 'developed', 'positive', 'both', 'all', 'highlighted'
      spellFilter: 'all', // 'all', 'developed'
      showStats: true,
      showCosts: false,
      historyInline: true,
      skillsPerPage1: 43,
      skillsPerPageN: 68,
    };
  }
  const pc = character.printConfig;

  const html = `<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" id="print-config-overlay">
    <div class="bg-gray-800 rounded-lg p-4" style="display:flex;flex-direction:column">
      <h3 class="text-amber-300 font-bold mb-3">${lang === 'en' ? 'Print Configuration' : 'Configuration d\'impression'}</h3>

      <div class="grid gap-3 text-sm" style="grid-template-columns: auto 1fr">
        <label class="text-gray-400">${lang === 'en' ? 'Font' : 'Police'}</label>
        <select id="pc-font" class="field field-sm">
          ${['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'].map(f => `<option value="${f}" ${pc.font === f ? 'selected' : ''}>${f}</option>`).join('')}
        </select>

        <label class="text-gray-400">${lang === 'en' ? 'Skills' : 'Compétences'}</label>
        <div class="flex flex-col gap-1">
          ${[
            ['developed', lang === 'en' ? 'Developed only' : 'Développées uniquement'],
            ['positive', lang === 'en' ? 'Positive bonus' : 'Bonus positif'],
            ['both', lang === 'en' ? 'Developed + positive (default)' : 'Développées + bonus positif (défaut)'],
            ['all', lang === 'en' ? 'All skills' : 'Toutes les compétences'],
            ['highlighted', lang === 'en' ? 'Highlighted only' : 'Surlignées uniquement'],
          ].map(([val, label]) =>
            `<label class="text-xs cursor-pointer"><input type="radio" name="pc-skill-filter" value="${val}" ${pc.skillFilter === val ? 'checked' : ''}> ${label}</label>`
          ).join('')}
        </div>

        <label class="text-gray-400">${lang === 'en' ? 'Spells' : 'Sorts'}</label>
        <div class="flex gap-3">
          <label class="text-xs cursor-pointer"><input type="radio" name="pc-spell-filter" value="all" ${pc.spellFilter === 'all' ? 'checked' : ''}> ${lang === 'en' ? 'All lists' : 'Toutes'}</label>
          <label class="text-xs cursor-pointer"><input type="radio" name="pc-spell-filter" value="developed" ${pc.spellFilter === 'developed' ? 'checked' : ''}> ${lang === 'en' ? 'Developed only' : 'Développées'}</label>
        </div>

        <label class="text-gray-400">${lang === 'en' ? 'Options' : 'Options'}</label>
        <div class="flex flex-col gap-1">
          <label class="text-xs cursor-pointer"><input type="checkbox" id="pc-stats" ${pc.showStats ? 'checked' : ''}> ${lang === 'en' ? 'Show characteristics' : 'Caractéristiques'}</label>
          <label class="text-xs cursor-pointer"><input type="checkbox" id="pc-costs" ${pc.showCosts ? 'checked' : ''}> ${lang === 'en' ? 'Show dev costs' : 'Coûts de développement'}</label>
          <label class="text-xs cursor-pointer"><input type="checkbox" id="pc-history" ${pc.historyInline ? 'checked' : ''}> ${lang === 'en' ? 'Print history inline' : 'Historique à la suite'}</label>
        </div>

        <label class="text-gray-400">${lang === 'en' ? 'Skills/page' : 'Comp/page'}</label>
        <div class="flex gap-2 items-center">
          <span class="text-xs text-gray-500">P1:</span>
          <input type="number" id="pc-spp1" value="${pc.skillsPerPage1}" class="field-inline" style="width:3rem" min="20" max="80">
          <span class="text-xs text-gray-500">P2+:</span>
          <input type="number" id="pc-sppn" value="${pc.skillsPerPageN}" class="field-inline" style="width:3rem" min="20" max="100">
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <button class="btn-primary text-sm flex-1" id="pc-print">${lang === 'en' ? 'Print' : 'Imprimer'}</button>
        <button class="btn-secondary text-sm flex-1" id="pc-cancel">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('pc-cancel').addEventListener('click', () => {
    document.getElementById('print-config-overlay').remove();
  });
  document.getElementById('print-config-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'print-config-overlay') e.target.remove();
  });

  document.getElementById('pc-print').addEventListener('click', () => {
    // Save config
    pc.font = document.getElementById('pc-font').value;
    pc.skillFilter = document.querySelector('input[name="pc-skill-filter"]:checked')?.value || 'both';
    pc.spellFilter = document.querySelector('input[name="pc-spell-filter"]:checked')?.value || 'all';
    pc.showStats = document.getElementById('pc-stats').checked;
    pc.showCosts = document.getElementById('pc-costs').checked;
    pc.historyInline = document.getElementById('pc-history').checked;
    pc.skillsPerPage1 = parseInt(document.getElementById('pc-spp1').value) || 43;
    pc.skillsPerPageN = parseInt(document.getElementById('pc-sppn').value) || 68;

    // Apply print font
    document.documentElement.style.setProperty('--print-font-family', pc.font);
    document.documentElement.style.setProperty('--print-font-size', '8pt');

    document.getElementById('print-config-overlay').remove();
    showPrintPreview(character, pc, character.language || 'fr');
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

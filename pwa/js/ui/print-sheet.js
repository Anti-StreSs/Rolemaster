// Print Sheet — generates printable character sheet HTML
// Reproduces CPR093 layout: identity, stats, combat, skills with DM boxes

import { getAllClasses, getClassName, getRealmKey, getRealmLabel } from '../engine/classes.js';
import { getAllCategories, getSkillName, getSkillDevCost, getSkillStatIndices, getLevelBonus } from '../engine/skills.js';
import { getStatBonus, getRankBonus, STAT_COUNT } from '../engine/stats.js';
import { getTotalRanks, getTotalStatBonus, getStatDev, calcHitPoints, calcPowerPoints, calculateDB } from '../engine/character.js';

const STAT_NAMES_FR = ['Constitution', 'Agilité', 'Auto-discipline', 'Mémoire', 'Raisonnement', 'Force', 'Rapidité', 'Présence', 'Empathie', 'Intuition'];
const STAT_ABBREVS = ['Co', 'Ag', 'AD', 'Mé', 'Ra', 'Fo', 'Rp', 'Pr', 'Em', 'In'];
const DEV_STATS = [0, 1, 2, 3, 4];

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function calcSkillStatBonus(skill, character) {
  const statIndices = getSkillStatIndices(skill);
  if (statIndices.length === 0) return 0;
  if (statIndices.length === 1) return getTotalStatBonus(character, statIndices[0] - 1);
  let sum = 0;
  for (const idx of statIndices) sum += getTotalStatBonus(character, idx - 1);
  return Math.floor(sum / statIndices.length);
}

/**
 * Get filtered and formatted skills for printing.
 */
function getFilteredSkills(character, config) {
  const categories = getAllCategories();
  const lang = config.lang || 'fr';
  const result = [];
  let globalIndex = 0;

  for (const cat of categories) {
    for (const skill of cat.skills) {
      const totalRanks = getTotalRanks(character, globalIndex);
      const rankBonus = getRankBonus(totalRanks);
      const statBonus = calcSkillStatBonus(skill, character);
      const cls = character.classIndex >= 0 ? getAllClasses()[character.classIndex] : null;
      const lvlBonus = getLevelBonus(cls, character.level, cat.name, globalIndex);
      const miscBonus = character.skillMiscBonuses[globalIndex] || 0;
      const total = rankBonus + statBonus + lvlBonus + miscBonus;
      const highlight = (character.skillHighlights || {})[globalIndex] || null;

      let include = false;
      switch (config.skillFilter) {
        case 'developed': include = totalRanks > 0; break;
        case 'positive': include = total > 0; break;
        case 'both': include = totalRanks > 0 || total > 0; break;
        case 'all': include = true; break;
        case 'highlighted': include = !!highlight; break;
        default: include = totalRanks > 0 || total > 0;
      }

      if (include) {
        const cost = getSkillDevCost(character.classIndex, globalIndex);
        result.push({
          name: getSkillName(skill, lang),
          categoryName: lang === 'en' ? cat.name : cat.name,
          totalRanks,
          rankBonus,
          statBonus,
          lvlBonus,
          miscBonus: miscBonus || '',
          total,
          costStr: cost ? (cost.second > 0 ? `${cost.first}/${cost.second}` : `${cost.first}`) : '—',
          highlight,
          textColor: (character.skillTextColors || {})[globalIndex] || null,
          bold: (character.skillBold || {})[globalIndex] || false,
        });
      }

      // Insert weapon sub-skills right after weapon parent (index 63)
      if (globalIndex === 63) {
        for (let ws = 0; ws < (character.weaponSkills || []).length; ws++) {
          const wpn = character.weaponSkills[ws];
          const wsKey = 'wpn_' + ws;
          const wRanks = getTotalRanks(character, wsKey);
          const wRankB = getRankBonus(wRanks);
          const wMisc = character.skillMiscBonuses[wsKey] || 0;
          const wTotal = wRankB + wMisc;
          if (wRanks > 0 || wTotal > 0) {
            result.push({
              name: '  ↳ ' + wpn.name, categoryName: '', totalRanks: wRanks, rankBonus: wRankB,
              statBonus: 0, lvlBonus: 0, miscBonus: wMisc || '', total: wTotal,
              costStr: wpn.cost ? `${wpn.cost.first}/${wpn.cost.second}` : '—',
              highlight: (character.skillHighlights || {})[wsKey] || null,
              textColor: (character.skillTextColors || {})[wsKey] || null,
              bold: (character.skillBold || {})[wsKey] || false,
            });
          }
        }
      }

      // Insert generic sub-skills right after their parent
      const parentSubs = (character.subSkills || []).filter(s => s.parentIndex === globalIndex);
      for (let si = 0; si < parentSubs.length; si++) {
        const sub = parentSubs[si];
        const subKey = 'sub_' + globalIndex + '_' + si;
        const sRanks = getTotalRanks(character, subKey);
        const sRankB = getRankBonus(sRanks);
        const sMisc = character.skillMiscBonuses[subKey] || 0;
        const sTotal = sRankB + sMisc;
        if (sRanks > 0 || sTotal > 0) {
          result.push({
            name: '  ↳ ' + sub.name, categoryName: '', totalRanks: sRanks, rankBonus: sRankB,
            statBonus: 0, lvlBonus: 0, miscBonus: sMisc || '', total: sTotal,
            costStr: sub.cost ? `${sub.cost.first}/${sub.cost.second || ''}` : '—',
            highlight: (character.skillHighlights || {})[subKey] || null,
            textColor: (character.skillTextColors || {})[subKey] || null,
            bold: (character.skillBold || {})[subKey] || false,
          });
        }
      }

      globalIndex++;
    }
  }

  return result;
}

/**
 * Generate stats block HTML.
 */
function generateStatsBlock(character) {
  let rows = '';
  for (let i = 0; i < STAT_COUNT; i++) {
    const temp = character.stats[i];
    const pot = character.potentials[i] || temp;
    const dev = DEV_STATS.includes(i) ? (getStatDev(character, i) !== null ? getStatDev(character, i).toFixed(1) : '—') : '';
    const normBonus = getStatBonus(temp);
    const raceBonus = character.raceBonuses[i] || 0;
    const specBonus = character.specialBonuses[i] || 0;
    const total = normBonus + raceBonus + specBonus;

    rows += `<tr>
      <td class="ps-stat-name"><b>${STAT_NAMES_FR[i]}</b></td>
      <td class="tc">${temp}</td>
      <td class="tc">${pot}</td>
      <td class="tc">${dev}</td>
      <td class="tc ps-bonus">${normBonus >= 0 ? '+' + normBonus : normBonus}</td>
      <td class="tc">${raceBonus ? (raceBonus >= 0 ? '+' + raceBonus : raceBonus) : ''}</td>
      <td class="tc">${specBonus ? (specBonus >= 0 ? '+' + specBonus : specBonus) : ''}</td>
      <td class="tc ps-bonus-total"><b>${total >= 0 ? '+' + total : total}</b></td>
    </tr>`;
  }

  return `
    <table class="ps-stats-table">
      <thead>
        <tr>
          <th rowspan="2">CARAC</th>
          <th colspan="3">Points</th>
          <th colspan="4">Bonus</th>
        </tr>
        <tr>
          <th>Temp</th><th>Pot</th><th>Dév</th>
          <th>Norm</th><th>Race</th><th>Spéc</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/**
 * Generate skill table HTML with DM boxes.
 */
function generateSkillTable(skills, config) {
  let rows = '';
  let currentCategory = null;
  const colSpan = config.showCosts ? 9 : 8;

  for (const sk of skills) {
    if (sk.categoryName && sk.categoryName !== currentCategory) {
      currentCategory = sk.categoryName;
      rows += `<tr class="ps-cat-row"><td colspan="${colSpan}"><b>${currentCategory}</b></td></tr>`;
    }

    const totalRanks = sk.totalRanks;
    const maxBoxes = Math.max(totalRanks + 2, 10);
    const displayBoxes = Math.min(maxBoxes, 20);
    let dmBoxes = '';
    for (let b = 0; b < displayBoxes; b++) {
      dmBoxes += b < totalRanks ? '■' : '□';
    }
    if (totalRanks > 20) dmBoxes += `+${totalRanks - 20}`;

    const hlClass = sk.highlight ? `ps-hl-${sk.highlight}` : '';
    const textClass = sk.textColor ? `ps-text-${sk.textColor}` : '';
    const boldClass = sk.bold ? 'ps-bold' : '';

    rows += `<tr class="${hlClass} ${textClass} ${boldClass}">
      <td class="ps-skill-name">${esc(sk.name)}</td>
      ${config.showCosts ? `<td class="tc ps-cost">${sk.costStr}</td>` : ''}
      <td class="ps-dm-boxes">${dmBoxes}</td>
      <td class="tc ps-bonus">${sk.rankBonus >= 0 ? '+' + sk.rankBonus : sk.rankBonus}</td>
      <td class="tc ps-bonus">${sk.statBonus >= 0 ? '+' + sk.statBonus : sk.statBonus}</td>
      <td class="tc">${sk.lvlBonus > 0 ? '+' + sk.lvlBonus : ''}</td>
      <td class="tc">${sk.miscBonus || ''}</td>
      <td class="tc ps-bonus-total"><b>${sk.total >= 0 ? '+' + sk.total : sk.total}</b></td>
    </tr>`;
  }

  return `
    <table class="ps-skills-table">
      <thead>
        <tr>
          <th>Compétence</th>
          ${config.showCosts ? '<th class="tc">Coût</th>' : ''}
          <th>DM</th>
          <th class="tc">Rang</th>
          <th class="tc">Carac</th>
          <th class="tc">Niv</th>
          <th class="tc">Div</th>
          <th class="tc">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/**
 * Generate page 1: header + stats + combat info + first skills.
 */
function generatePage1(character, config, lang) {
  const cls = character.classIndex >= 0 ? getAllClasses()[character.classIndex] : null;
  const className = cls ? getClassName(cls, lang) : '';
  const realmLabel = cls ? getRealmLabel(cls, lang) : '';
  const hp = calcHitPoints(character);
  const pp = calcPowerPoints(character);

  const skills = getFilteredSkills(character, config);
  const page1Skills = skills.slice(0, config.skillsPerPage1 || 60);

  const db = calculateDB(character);
  const portrait = character.portraitUrl || '';

  return `
    <div class="ps-header">
      <h1 class="ps-title">Feuille de Personnage</h1>
    </div>

    <div class="ps-top-grid">
      <div class="ps-identity">
        <div class="ps-field"><b>Nom:</b> ${esc(character.name)}</div>
        <div class="ps-field"><b>Race:</b> ${esc(character.raceName || '')}</div>
        <div class="ps-field"><b>Taille:</b> ${esc(character.height)} <b>Cheveux:</b> ${esc(character.hair)}</div>
        <div class="ps-field"><b>Poids:</b> ${esc(character.weight)} <b>Yeux:</b> ${esc(character.eyes)}</div>
        <div class="ps-field"><b>Age:</b> ${esc(character.age)} <b>Sexe:</b> ${esc(character.sex)}</div>
        <div class="ps-field"><b>Apparence:</b> ${esc(character.appearance)}</div>
        <div class="ps-field"><b>Comportement:</b> ${esc(character.behavior)}</div>
        <div class="ps-field"><b>Profession:</b> ${esc(className)}</div>
        <div class="ps-field"><b>Niveau:</b> ${character.level}</div>
        <div class="ps-field"><b>Pts d'Exp:</b> ${character.xp || ''}</div>
      </div>

      <div class="ps-languages">
        <table class="ps-table-mini">
          <thead><tr><th>LANGAGE</th><th>P</th><th>É</th></tr></thead>
          <tbody>
            ${(character.languages || []).map((l, i) =>
              `<tr><td>${i + 1} ${esc(l.name)}</td><td class="tc">${l.spoken || 0}</td><td class="tc">${l.written || 0}</td></tr>`
            ).join('')}
          </tbody>
        </table>
      </div>

      <div class="ps-portrait-zone">
        ${portrait
          ? `<img src="${portrait}" alt="Portrait" style="max-width:100%;max-height:100%;object-fit:contain">`
          : `<div style="text-align:center;color:#ccc;font-size:7pt;padding-top:30pt">Portrait</div>`
        }
      </div>
    </div>

    <!-- Stats + Combat recap + Spell lists — side by side -->
    <div class="ps-mid-grid">
      ${config.showStats ? `<div class="ps-stats-col">${generateStatsBlock(character)}</div>` : ''}

      ${(() => {
        const mb = character.manualBonuses || {};
        const obStr = mb.obItem ? ` <span style="font-size:6pt">BO:+${mb.obItem}</span>` : '';
        const notesStr = mb.miscNotes ? `<div class="ps-field" style="font-size:6pt;color:#666"><b>Notes:</b> ${esc(mb.miscNotes)}</div>` : '';
        const rrParts = [];
        if (mb.rrEssence) rrParts.push('Ess:' + mb.rrEssence);
        if (mb.rrChanneling) rrParts.push('Thé:' + mb.rrChanneling);
        if (mb.rrMentalism) rrParts.push('Men:' + mb.rrMentalism);
        if (mb.rrPoison) rrParts.push('Poi:' + mb.rrPoison);
        if (mb.rrDisease) rrParts.push('Mal:' + mb.rrDisease);
        const rrStr = rrParts.length ? `<div class="ps-field" style="font-size:6pt"><b>RR:</b> ${rrParts.join(' ')}</div>` : '';
        return `<div class="ps-combat-col">
          <div class="ps-field" style="font-size:7pt"><b>PdeC Base:</b> <span class="ps-pencil-space">____</span> / ${hp.base || '—'}</div>
          <div class="ps-field" style="font-size:7pt"><b>Cap PdeC:</b> <span class="ps-pencil-space">____</span> / ${hp.cap || '—'}</div>
          <div class="ps-field" style="font-size:7pt"><b>Royaume:</b> ${realmLabel || '—'}</div>
          <div class="ps-field" style="font-size:7pt"><b>Pts Pouvoir:</b> <span class="ps-pencil-space">____</span> / ${pp || '—'}</div>
          <div class="ps-field" style="font-size:7pt"><b>Type Armure:</b> ${character.armorType || 1}</div>
          <div class="ps-field" style="font-size:7pt"><b>Bonus Déf:</b> ${db.printDisplay}${obStr}</div>
          ${rrStr}
          ${notesStr}
        </div>`;
      })()}

      <div class="ps-spells-col">
        <table class="ps-table-mini">
          <thead><tr><th>LISTES DE SORTS</th><th>Niv</th></tr></thead>
          <tbody>
            ${(character.spellLists || []).filter(sl => sl.maxLevel > 0).map((sl, i) =>
              `<tr><td>${i + 1} ${esc(sl.name)}</td><td class="tc">${sl.maxLevel || 0}</td></tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="ps-magic-effects">
          <div style="font-size:7pt;font-weight:bold">Effets magiques:</div>
          <div class="ps-blank-lines">
            _______________________________________________<br>
            _______________________________________________<br>
            _______________________________________________
          </div>
        </div>
      </div>
    </div>

    ${generateSkillTable(page1Skills, config)}
  `;
}

/**
 * Generate a continuation skills page.
 */
function generateSkillPage(skills, config) {
  return generateSkillTable(skills, config);
}

/**
 * Generate the complete print sheet (multi-page HTML).
 */
export function generatePrintSheet(character, config, lang) {
  if (!config) config = { skillFilter: 'both', showStats: true, showCosts: false, skillsPerPage1: 60, skillsPerPageN: 85, lang };
  config.lang = lang;

  const skills = getFilteredSkills(character, config);
  const pages = [];

  // Page 1: header + stats + first skills
  pages.push(generatePage1(character, config, lang));

  // Remaining skills pages
  const remainingSkills = skills.slice(config.skillsPerPage1 || 60);
  const perPage = config.skillsPerPageN || 85;
  for (let i = 0; i < remainingSkills.length; i += perPage) {
    const pageSkills = remainingSkills.slice(i, i + perPage);
    pages.push(generateSkillPage(pageSkills, config));
  }

  return pages.map((p, i) => `
    <div class="print-page" data-page="${i + 1}">
      ${p}
      <div class="print-footer">
        CPR — Création de Personnage pour Rolemaster ©Eric Lestrade / ©2025 Quentin PARISOT — Page ${i + 1}/${pages.length}
      </div>
    </div>
  `).join('');
}

/**
 * Open print preview overlay.
 */
export function showPrintPreview(character, config, lang) {
  const sheetHtml = generatePrintSheet(character, config, lang);

  const overlay = document.createElement('div');
  overlay.id = 'print-preview-overlay';
  overlay.className = 'print-preview-overlay';

  const pageCount = (sheetHtml.match(/class="print-page"/g) || []).length;

  overlay.innerHTML = `
    <div class="print-preview-toolbar no-print">
      <button id="pp-print" class="btn-primary" style="padding:6px 20px">Imprimer</button>
      <button id="pp-close" class="btn-secondary" style="padding:6px 20px">Fermer</button>
      <span class="pp-info">${lang === 'en' ? 'Preview' : 'Aperçu'} — ${pageCount} page${pageCount > 1 ? 's' : ''}</span>
    </div>
    <div class="print-preview-content">
      ${sheetHtml}
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add('printing');

  document.getElementById('pp-print').addEventListener('click', () => window.print());
  document.getElementById('pp-close').addEventListener('click', () => {
    overlay.remove();
    document.body.classList.remove('printing');
  });
}

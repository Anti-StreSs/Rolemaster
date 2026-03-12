// Character sheet — full display and print view

import { panel } from './components.js';
import { getStatBonus, getRankBonus } from '../engine/stats.js';
import { getClassByIndex, getClassName, getCasterTypeKey } from '../engine/classes.js';
import { getAllCategories, getSkillName, calcSkillStatBonus } from '../engine/skills.js';
import { getAllRealms, getSpellListName } from '../engine/spells.js';
import { ARMOR_TYPES } from '../engine/equipment.js';
import { calcHitPoints, calcPowerPoints, getStatBonuses } from '../engine/character.js';
import { downloadCharacter, saveToLocalStorage } from '../engine/export.js';
import { showToast } from './components.js';

export function renderSheet(character, app) {
  const t = app.t;
  const lang = app.lang;

  if (!character || !character.name) {
    return `<div class="text-gray-500 text-center py-8">Aucun personnage à afficher.</div>`;
  }

  const cls = character.classIndex >= 0 ? getClassByIndex(character.classIndex) : null;
  const className = cls ? getClassName(cls, lang) : '—';
  const bonuses = getStatBonuses(character);
  const hp = calcHitPoints(character);
  const pp = calcPowerPoints(character);

  let html = '';

  // Header
  html += panel('', `
    <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <h2 class="text-2xl font-bold text-amber-400">${character.name}</h2>
        <div class="text-gray-400">
          ${className} — ${t.sheet.level} ${character.level}
          ${character.realm !== 'none' ? ` — ${t.realms[character.realm] || character.realm}` : ''}
        </div>
      </div>
      <div class="flex gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-red-400">${hp}</div>
          <div class="text-xs text-gray-500">${t.sheet.hitPoints}</div>
        </div>
        ${character.realm !== 'none' ? `
        <div>
          <div class="text-2xl font-bold text-blue-400">${pp}</div>
          <div class="text-xs text-gray-500">${t.sheet.powerPoints}</div>
        </div>` : ''}
      </div>
    </div>
  `);

  // Save/Print buttons
  html += `
    <div class="flex gap-2 mb-4 no-print">
      <button class="btn-primary" id="btn-save-json">${t.save.download}</button>
      <button class="btn-secondary" id="btn-save-local">${t.save.saveLocal}</button>
      <button class="btn-secondary" id="btn-print">${t.app.print}</button>
    </div>
  `;

  // Stats table
  let statsHtml = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
  `;
  for (let i = 0; i < 10; i++) {
    const bonus = bonuses[i];
    const bonusClass = bonus > 0 ? 'positive' : bonus < 0 ? 'negative' : 'zero';
    const isPrime = character.primeStats.includes(i);
    statsHtml += `
      <div class="stat-row">
        <span class="text-sm ${isPrime ? 'text-amber-400 font-bold' : 'text-gray-300'}">
          ${t.stats.abbrevs[i]} ${t.stats.names[i]} ${isPrime ? '★' : ''}
        </span>
        <span class="stat-value text-amber-300">${character.stats[i]}</span>
        <span class="stat-bonus ${bonusClass}">${bonus >= 0 ? '+' + bonus : bonus}</span>
        <span></span>
      </div>
    `;
  }
  statsHtml += `</div>`;
  html += panel(t.sheet.characteristics, statsHtml);

  // Skills
  const categories = getAllCategories();
  let skillsHtml = `
    <table class="skill-table">
      <thead>
        <tr>
          <th>${t.skills.skill}</th>
          <th class="text-center w-12">${t.skills.ranks}</th>
          <th class="text-center w-16">${t.skills.statBonus}</th>
          <th class="text-center w-16">${t.skills.rankBonus}</th>
          <th class="text-center w-16">${t.skills.totalBonus}</th>
        </tr>
      </thead>
      <tbody>
  `;

  let globalIndex = 0;
  let hasSkills = false;
  for (const cat of categories) {
    let catHasRanks = false;
    let catSkills = '';
    for (const skill of cat.skills) {
      const ranks = (character.totalSkillRanks[globalIndex] || 0) + (character.skillRanks[globalIndex] || 0);
      if (ranks > 0) {
        catHasRanks = true;
        hasSkills = true;
        const name = getSkillName(skill, lang);
        const statBonus = calcSkillStatBonus(skill, character.stats);
        const rankBonus = getRankBonus(ranks);
        const total = statBonus + rankBonus;
        const statBonusClass = statBonus > 0 ? 'positive' : statBonus < 0 ? 'negative' : 'zero';

        catSkills += `
          <tr>
            <td class="text-gray-300">${name}</td>
            <td class="text-center text-amber-300">${ranks}</td>
            <td class="text-center stat-bonus ${statBonusClass}">${statBonus >= 0 ? '+' + statBonus : statBonus}</td>
            <td class="text-center text-green-400">+${rankBonus}</td>
            <td class="text-center font-bold text-gray-200">${total >= 0 ? '+' + total : total}</td>
          </tr>
        `;
      }
      globalIndex++;
    }
    if (catHasRanks) {
      skillsHtml += `<tr><td colspan="5" class="skill-category-header">${cat.name}</td></tr>`;
      skillsHtml += catSkills;
    }
  }

  skillsHtml += `</tbody></table>`;
  if (!hasSkills) {
    skillsHtml = `<p class="text-gray-500">Aucune compétence développée.</p>`;
  }
  html += panel(t.sheet.skills, skillsHtml);

  // Spells
  if (character.spellLists.length > 0) {
    const realms = getAllRealms();
    let spellsHtml = `<ul class="space-y-1">`;
    for (const sl of character.spellLists) {
      const realm = realms[sl.realmIndex];
      if (!realm) continue;
      const group = realm.groups[sl.groupIndex];
      if (!group) continue;
      const spell = group[sl.spellIndex];
      if (!spell) continue;
      const name = lang === 'en' ? spell.name_en : spell.name_fr;
      spellsHtml += `
        <li class="text-gray-300">
          <span class="text-purple-400">${realm.name}</span> — ${name}
        </li>
      `;
    }
    spellsHtml += `</ul>`;
    html += panel(t.sheet.spells, spellsHtml);
  }

  // Equipment
  const armorType = ARMOR_TYPES[character.armorType] || ARMOR_TYPES[0];
  html += panel(t.sheet.equipment, `
    <div class="text-gray-300">${t.armor.type}: <span class="text-amber-300">${t.armor[armorType.key]}</span></div>
  `);

  return html;
}

/**
 * Bind sheet action buttons (called from app after rendering).
 */
export function bindSheetEvents(character) {
  const btnSaveJson = document.getElementById('btn-save-json');
  const btnSaveLocal = document.getElementById('btn-save-local');
  const btnPrint = document.getElementById('btn-print');

  if (btnSaveJson) {
    btnSaveJson.addEventListener('click', () => {
      downloadCharacter(character);
      showToast('Personnage téléchargé !');
    });
  }

  if (btnSaveLocal) {
    btnSaveLocal.addEventListener('click', () => {
      saveToLocalStorage(character);
      showToast('Personnage sauvegardé !');
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', () => window.print());
  }
}

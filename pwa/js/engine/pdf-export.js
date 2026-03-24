// pdf-export.js — Generate downloadable PDF character sheet
// Uses jsPDF (loaded via CDN, available as window.jspdf)

import { getStatBonus, getRankBonus } from './stats.js';
import { calcHitPoints, calcPowerPoints, calculateDB, getTotalRanks,
         getTotalStatBonus } from './character.js';
import { getSkillName, getSkillDevCost, getSkillStatIndices, getLevelBonus,
         getAllCategories, getAllSkillsFlat } from './skills.js';
import { getBackgroundBonuses, getSkillBackgroundBonus,
         summarizeBackgroundBonuses } from './background-effects.js';
import { getClassName, getRealmLabel, getAllClasses } from './classes.js';

// Column headers
const STAT_ABBREVS_FR = ['CO', 'AG', 'AD', 'Mé', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];
const STAT_ABBREVS_EN = ['CO', 'AG', 'SD', 'Me', 'Re', 'St', 'Qu', 'Pr', 'Em', 'In'];

// --- Helpers ---

function calcSkillStatBonusPDF(skill, character, bgBonuses) {
  const statIndices = getSkillStatIndices(skill);
  if (statIndices.length === 0) return 0;
  let sum = 0;
  for (const idx of statIndices) {
    const base = getStatBonus(character.stats[idx - 1] || 0);
    const bg = bgBonuses.statBonusMods[idx - 1] || 0;
    sum += base + bg;
  }
  return Math.floor(sum / statIndices.length);
}

function getDevelopedSkills(character) {
  const categories = getAllCategories();
  const classes = getAllClasses();
  const cls = character.classIndex >= 0 ? classes[character.classIndex] : null;
  const bgBonuses = getBackgroundBonuses(character);
  const result = [];
  let globalIndex = 0;

  for (const cat of categories) {
    let catPushed = false;
    for (const skill of cat.skills) {
      const totalRanks = getTotalRanks(character, globalIndex);
      const rankBonus = getRankBonus(totalRanks);
      const statBonus = calcSkillStatBonusPDF(skill, character, bgBonuses);
      const lvlBonus = getLevelBonus(cls, character.level, cat.name, globalIndex);
      const miscBonus = character.skillMiscBonuses[globalIndex] || 0;
      const bgBonus = getSkillBackgroundBonus(bgBonuses, skill.name_fr, skill.name_en);
      const total = rankBonus + statBonus + lvlBonus + miscBonus + bgBonus;

      if (totalRanks > 0 || total > 0) {
        if (!catPushed) {
          result.push({ isCategory: true, name: cat.name });
          catPushed = true;
        }
        result.push({
          name: skill.name_fr || skill.name_en,
          totalRanks, rankBonus, statBonus, lvlBonus, miscBonus, bgBonus, total,
        });
      }

      // Weapon sub-skills
      if (globalIndex === 63) {
        for (let ws = 0; ws < (character.weaponSkills || []).length; ws++) {
          const wpn = character.weaponSkills[ws];
          const wsKey = 'wpn_' + ws;
          const wRanks = getTotalRanks(character, wsKey);
          const wTotal = getRankBonus(wRanks);
          if (wRanks > 0 || wTotal > 0) {
            result.push({ name: '  ' + wpn.name, totalRanks: wRanks, rankBonus: wTotal,
              statBonus: 0, lvlBonus: 0, miscBonus: 0, bgBonus: 0, total: wTotal });
          }
        }
      }

      // Generic sub-skills
      const parentSubs = (character.subSkills || []).filter(s => s.parentIndex === globalIndex);
      for (let si = 0; si < parentSubs.length; si++) {
        const sub = parentSubs[si];
        const subKey = 'sub_' + globalIndex + '_' + si;
        const sRanks = getTotalRanks(character, subKey);
        const sTotal = getRankBonus(sRanks);
        if (sRanks > 0 || sTotal > 0) {
          result.push({ name: '  ' + sub.name, totalRanks: sRanks, rankBonus: sTotal,
            statBonus: 0, lvlBonus: 0, miscBonus: 0, bgBonus: 0, total: sTotal });
        }
      }

      globalIndex++;
    }
  }
  return result;
}

// --- Main export function ---

export function generateCharacterPDF(character, options = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const lang = options.lang || character.language || 'fr';
  const STAT_ABBREVS = lang === 'en' ? STAT_ABBREVS_EN : STAT_ABBREVS_FR;

  const pageW = 210, pageH = 297;
  const mL = 10, mT = 12, mR = 10, mB = 12;
  const usableW = pageW - mL - mR;
  let y = mT;

  function checkPage(needed = 8) {
    if (y + needed > pageH - mB) { doc.addPage(); y = mT; }
  }

  function sectionHeader(title) {
    checkPage(14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), mL, y);
    y += 1.5;
    doc.setDrawColor(180, 130, 20);
    doc.setLineWidth(0.4);
    doc.line(mL, y, mL + usableW, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setLineWidth(0.2);
    doc.setDrawColor(100, 100, 100);
  }

  function textLine(label, value, indent = 0) {
    checkPage(5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', mL + indent, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value ?? ''), mL + indent + doc.getTextWidth(label + ': '), y);
    y += 4.5;
  }

  // ==============================
  // PAGE 1: Title + Identity + Stats + Combat
  // ==============================

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(character.name || (lang === 'en' ? 'Unnamed' : 'Sans nom'), pageW / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 80, 20);
  const classes = getAllClasses();
  const cls = character.classIndex >= 0 ? classes[character.classIndex] : null;
  const realmLabel = cls ? getRealmLabel(cls, lang) : '';
  const subtitle = [
    cls ? getClassName(cls, lang) : '',
    character.raceName,
    (lang === 'en' ? 'Lvl ' : 'Niv. ') + (character.level || 1),
  ].filter(Boolean).join(' — ');
  doc.text(subtitle, pageW / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Identity block (two columns)
  sectionHeader(lang === 'en' ? 'Identity' : 'Identité');
  const col1x = mL, col2x = mL + usableW / 2;
  const idFields = [
    [lang === 'en' ? 'Race' : 'Race', character.raceName],
    [lang === 'en' ? 'Realm' : 'Royaume', realmLabel],
    ['Âge', character.age],
    [lang === 'en' ? 'Height' : 'Taille', character.height],
    [lang === 'en' ? 'Weight' : 'Poids', character.weight],
    [lang === 'en' ? 'Sex' : 'Sexe', character.sex],
    [lang === 'en' ? 'Hair' : 'Cheveux', character.hair],
    [lang === 'en' ? 'Eyes' : 'Yeux', character.eyes],
  ].filter(([, v]) => v);
  doc.setFontSize(9);
  for (let i = 0; i < idFields.length; i++) {
    const [label, value] = idFields[i];
    const isRight = i % 2 === 1;
    const x = isRight ? col2x : col1x;
    if (!isRight) checkPage(5);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), x + doc.getTextWidth(label + ': '), y);
    if (isRight || i === idFields.length - 1) y += 4.5;
  }
  y += 2;

  // Stats table
  sectionHeader(lang === 'en' ? 'Statistics' : 'Caractéristiques');
  const bgBonuses = getBackgroundBonuses(character);

  // Header row
  const sColX = [mL, mL + 18, mL + 30, mL + 42, mL + 56, mL + 70, mL + 84, mL + 100];
  const sHeaders = ['Stat', 'Temp', 'Pot', 'Race', 'Bonus', 'BG', 'Spéc', 'Total'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  sHeaders.forEach((h, i) => doc.text(h, sColX[i], y));
  y += 1.5;
  doc.line(mL, y, mL + 115, y);
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  for (let i = 0; i < 10; i++) {
    checkPage(5);
    const temp = character.stats[i] || 0;
    const pot = character.potentials[i] || temp;
    const race = character.raceBonuses[i] || 0;
    const bonus = getStatBonus(temp);
    const bg = bgBonuses.statBonusMods[i] || 0;
    const spec = character.specialBonuses[i] || 0;
    const total = bonus + bg + spec;
    doc.text(STAT_ABBREVS[i], sColX[0], y);
    doc.text(String(temp), sColX[1], y);
    doc.text(String(pot), sColX[2], y);
    doc.text(race !== 0 ? (race > 0 ? '+' + race : String(race)) : '—', sColX[3], y);
    doc.text(bonus >= 0 ? '+' + bonus : String(bonus), sColX[4], y);
    doc.text(bg !== 0 ? (bg > 0 ? '+' + bg : String(bg)) : '—', sColX[5], y);
    doc.text(spec !== 0 ? (spec > 0 ? '+' + spec : String(spec)) : '—', sColX[6], y);
    doc.setFont('helvetica', 'bold');
    doc.text(total >= 0 ? '+' + total : String(total), sColX[7], y);
    doc.setFont('helvetica', 'normal');
    y += 4;
  }
  y += 3;

  // Combat block
  sectionHeader(lang === 'en' ? 'Combat' : 'Combat');
  const hp = calcHitPoints(character);
  const pp = calcPowerPoints(character);
  const db = calculateDB(character);
  const combatFields = [
    [lang === 'en' ? 'Hit Points' : 'PdC', hp],
    ['PP', pp],
    ['DB / BD', db],
    [lang === 'en' ? 'Armor Type' : 'Type Armure (AT)', character.armorType],
  ];
  doc.setFontSize(9);
  for (let i = 0; i < combatFields.length; i++) {
    const [label, value] = combatFields[i];
    const isRight = i % 2 === 1;
    const x = isRight ? col2x : col1x;
    if (!isRight) checkPage(5);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value ?? '0'), x + doc.getTextWidth(label + ': '), y);
    if (isRight || i === combatFields.length - 1) y += 4.5;
  }
  y += 3;

  // ==============================
  // SKILLS — compact table, multi-page
  // ==============================
  const developedSkills = getDevelopedSkills(character);

  if (developedSkills.length > 0) {
    sectionHeader(lang === 'en' ? 'Skills' : 'Compétences');

    // Column layout: Name | Rangs | RkB | StB | LvB | BG | Total
    const skX = [mL, mL + 82, mL + 95, mL + 108, mL + 121, mL + 134, mL + 147];
    const skHeaders = [lang === 'en' ? 'Skill' : 'Compétence', 'Rgs', 'RkB', 'StB', 'LvB', 'BG', 'Total'];
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    skHeaders.forEach((h, i) => doc.text(h, skX[i], y));
    y += 1.5;
    doc.line(mL, y, mL + 162, y);
    y += 3;

    for (const sk of developedSkills) {
      if (sk.isCategory) {
        checkPage(10);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(120, 80, 10);
        doc.text(sk.name.toUpperCase(), mL, y);
        doc.setTextColor(0, 0, 0);
        y += 3.5;
      } else {
        checkPage(5);
        doc.setFontSize(8);
        doc.setFont('helvetica', sk.name.startsWith('  ') ? 'italic' : 'normal');
        // Truncate long names
        let name = sk.name;
        while (name.length > 0 && doc.getTextWidth(name) > 78) name = name.slice(0, -1);
        doc.text(name, skX[0], y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(sk.totalRanks || 0), skX[1], y);
        doc.text(sk.rankBonus >= 0 ? '+' + sk.rankBonus : String(sk.rankBonus), skX[2], y);
        doc.text(sk.statBonus >= 0 ? '+' + sk.statBonus : String(sk.statBonus), skX[3], y);
        doc.text(sk.lvlBonus > 0 ? '+' + sk.lvlBonus : (sk.lvlBonus < 0 ? String(sk.lvlBonus) : '—'), skX[4], y);
        doc.text(sk.bgBonus !== 0 ? (sk.bgBonus > 0 ? '+' + sk.bgBonus : String(sk.bgBonus)) : '—', skX[5], y);
        doc.setFont('helvetica', 'bold');
        const tot = sk.total;
        doc.text(tot >= 0 ? '+' + tot : String(tot), skX[6], y);
        doc.setFont('helvetica', 'normal');
        y += 4;
      }
    }
    y += 3;
  }

  // ==============================
  // SPELL LISTS
  // ==============================
  const spellLists = character.spellLists || [];
  if (spellLists.length > 0) {
    checkPage(20);
    sectionHeader(lang === 'en' ? 'Spell Lists' : 'Listes de Sorts');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'en' ? 'List' : 'Liste', mL, y);
    doc.text(lang === 'en' ? 'Max Lvl' : 'Niv. Max', mL + 100, y);
    doc.text(lang === 'en' ? 'Type' : 'Type', mL + 120, y);
    y += 1.5;
    doc.line(mL, y, mL + 140, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
    for (const sl of spellLists) {
      checkPage(5);
      let name = sl.name || '?';
      while (name.length > 0 && doc.getTextWidth(name) > 92) name = name.slice(0, -1);
      doc.text(name, mL, y);
      doc.text(String(sl.maxLevel || '?'), mL + 100, y);
      doc.text(sl.type || '', mL + 120, y);
      y += 4;
    }
    y += 3;
  }

  // ==============================
  // BACKGROUND BONUSES SUMMARY
  // ==============================
  const bgSummary = summarizeBackgroundBonuses(bgBonuses, lang);
  if (bgSummary && bgSummary.length > 0) {
    checkPage(20);
    sectionHeader(lang === 'en' ? 'Background Bonuses' : 'Bonus d\'Historique');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    for (const line of bgSummary) {
      checkPage(5);
      // Wrap long lines
      const wrapped = doc.splitTextToSize(line, usableW);
      for (const wl of wrapped) {
        checkPage(4);
        doc.text(wl, mL, y);
        y += 4;
      }
    }
    y += 2;
  }

  // ==============================
  // EQUIPMENT + NOTES
  // ==============================
  if (character.equipment) {
    checkPage(15);
    sectionHeader(lang === 'en' ? 'Equipment' : 'Équipement');
    doc.setFontSize(8);
    const equipLines = doc.splitTextToSize(character.equipment, usableW);
    for (const line of equipLines) {
      checkPage(4);
      doc.text(line, mL, y);
      y += 4;
    }
    y += 2;
  }

  if (character.history) {
    checkPage(15);
    sectionHeader(lang === 'en' ? 'Notes' : 'Historique');
    doc.setFontSize(8);
    const histLines = doc.splitTextToSize(character.history, usableW);
    for (const line of histLines.slice(0, 20)) { // cap at 20 lines
      checkPage(4);
      doc.text(line, mL, y);
      y += 4;
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(`Rolemaster — ${character.name || ''} — p.${p}/${pageCount}`, pageW / 2, pageH - 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`${(character.name || 'personnage').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  return doc;
}

// pdf-export.js — Generate downloadable PDF character sheet
// Uses jsPDF (loaded via CDN, available as window.jspdf)

import { getStatBonus, getRankBonus } from './stats.js';
import { calcHitPoints, calcPowerPoints, calculateDB, getTotalRanks,
         getTotalStatBonus, getDeathThreshold, ARMOR_MANEUVER_PENALTIES, isMovingSkill } from './character.js';
import { getSkillStatIndices, getLevelBonus, getAllCategories } from './skills.js';
import { getBackgroundBonuses, getSkillBackgroundBonus,
         summarizeBackgroundBonuses } from './background-effects.js';
import { getClassName, getRealmLabel, getAllClasses } from './classes.js';

const STAT_ABBREVS_FR = ['CO', 'AG', 'AD', 'Mé', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];
const STAT_ABBREVS_EN = ['CO', 'AG', 'SD', 'Me', 'Re', 'St', 'Qu', 'Pr', 'Em', 'In'];

// Per-skill text color → jsPDF RGB
const TEXT_COLORS = {
  red:    [200,  50,  50],
  green:  [ 30, 140,  30],
  blue:   [ 30,  80, 180],
  purple: [120,  30, 160],
  gold:   [180, 130,   0],
  orange: [200, 100,   0],
  gray:   [110, 110, 110],
  teal:   [  0, 130, 130],
};

// Per-skill highlight row background → jsPDF RGB
const HIGHLIGHT_FILLS = {
  yellow: [255, 248, 185],
  green:  [200, 240, 200],
  pink:   [255, 200, 215],
  blue:   [200, 220, 255],
  orange: [255, 225, 190],
  red:    [255, 200, 200],
  purple: [230, 208, 255],
};

// --- Skill data ---

const CAT_NAMES_FR = {
  'Academic':    'Savoir',
  'Animal':      'Animaux',
  'Athletic':    'Athlétique',
  'Combat':      'Combat',
  'Deadly':      'Contrôle de Soi',
  'Evaluation':  'Attaques Spéciales',
  'General':     'Évaluation',
  'Gymnastic':   'Artisanat',
  'Linguistic':  'Gymnastique',
  'Magical':     'Communication',
  'Medical':     'Magie',
  'Perception':  'Médecine',
  'Social':      'Perception',
  'Subterfuge':  'Influence',
  'Survival':    'Subterfuge',
  'Category_15': 'Survie/Extérieur',
};

function calcSkillStatBonusPDF(skill, character, bgBonuses) {
  const statIndices = getSkillStatIndices(skill);
  if (statIndices.length === 0) return 0;
  let sum = 0;
  for (const idx of statIndices) {
    sum += getStatBonus(character.stats[idx - 1] || 0) + (bgBonuses.statBonusMods[idx - 1] || 0);
  }
  return Math.floor(sum / statIndices.length);
}

function getDevelopedSkills(character, lang) {
  const categories = getAllCategories();
  const classes = getAllClasses();
  const cls = character.classIndex >= 0 ? classes[character.classIndex] : null;
  const bgBonuses = getBackgroundBonuses(character);
  const result = [];
  let gi = 0;

  for (const cat of categories) {
    let catPushed = false;
    for (const skill of cat.skills) {
      const totalRanks = getTotalRanks(character, gi);
      const rankBonus  = getRankBonus(totalRanks);
      const statBonus  = calcSkillStatBonusPDF(skill, character, bgBonuses);
      const lvlBonus   = getLevelBonus(cls, character.level, cat.name, gi);
      const miscBonus  = character.skillMiscBonuses[gi] || 0;
      const bgBonus    = getSkillBackgroundBonus(bgBonuses, skill.name_fr, skill.name_en);
      const armorMM    = ARMOR_MANEUVER_PENALTIES[(character.armorType || 1) - 1] || 0;
      const armorMagic = character.armorMagicBonus || 0;
      const armorPenalty = isMovingSkill(skill) ? Math.min(0, armorMM + armorMagic) : 0;
      const total      = rankBonus + statBonus + lvlBonus + miscBonus + bgBonus + armorPenalty;

      if (totalRanks > 0 || total > 0) {
        const catLabel = lang === 'fr' ? (CAT_NAMES_FR[cat.name] || cat.name) : cat.name;
        if (!catPushed) { result.push({ isCategory: true, name: catLabel }); catPushed = true; }
        result.push({
          name: skill.name_fr || skill.name_en,
          totalRanks, rankBonus, statBonus, lvlBonus, miscBonus, bgBonus, total,
          bold:      !!(character.skillBold        || {})[gi],
          textColor:  (character.skillTextColors   || {})[gi] || null,
          highlight:  (character.skillHighlights   || {})[gi] || null,
        });
      }

      // Weapon sub-skills (after weapon parent index 63)
      if (gi === 63) {
        for (let ws = 0; ws < (character.weaponSkills || []).length; ws++) {
          const wpn   = character.weaponSkills[ws];
          const wsKey = 'wpn_' + ws;
          const wRanks = getTotalRanks(character, wsKey);
          const wTotal = getRankBonus(wRanks);
          if (wRanks > 0 || wTotal > 0) {
            result.push({
              name: '  ' + wpn.name, totalRanks: wRanks, rankBonus: wTotal,
              statBonus: 0, lvlBonus: 0, miscBonus: 0, bgBonus: 0, total: wTotal,
              bold:      !!(character.skillBold        || {})[wsKey],
              textColor:  (character.skillTextColors   || {})[wsKey] || null,
              highlight:  (character.skillHighlights   || {})[wsKey] || null,
            });
          }
        }
      }

      // Generic sub-skills
      for (let si = 0; si < (character.subSkills || []).filter(s => s.parentIndex === gi).length; si++) {
        const sub    = (character.subSkills || []).filter(s => s.parentIndex === gi)[si];
        const subKey = 'sub_' + gi + '_' + si;
        const sRanks = getTotalRanks(character, subKey);
        const sTotal = getRankBonus(sRanks);
        if (sRanks > 0 || sTotal > 0) {
          result.push({
            name: '  ' + sub.name, totalRanks: sRanks, rankBonus: sTotal,
            statBonus: 0, lvlBonus: 0, miscBonus: 0, bgBonus: 0, total: sTotal,
            bold:      !!(character.skillBold        || {})[subKey],
            textColor:  (character.skillTextColors   || {})[subKey] || null,
            highlight:  (character.skillHighlights   || {})[subKey] || null,
          });
        }
      }

      gi++;
    }
  }
  return result;
}

// --- Drawing primitives ---

// DM rank boxes: filled squares for acquired ranks, empty for blank slots (max 9 shown)
function drawDMBoxes(doc, x, y, totalRanks) {
  const SZ = 1.85, GAP = 0.22, MAX = 9;
  for (let b = 0; b < MAX; b++) {
    const bx = x + b * (SZ + GAP);
    const by = y - SZ + 0.2;
    if (b < totalRanks) {
      doc.setFillColor(75, 50, 10);
      doc.rect(bx, by, SZ, SZ, 'F');
    } else {
      doc.setDrawColor(170, 145, 95);
      doc.setLineWidth(0.15);
      doc.rect(bx, by, SZ, SZ);
    }
  }
  if (totalRanks > 0) {
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 50, 10);
    const label = totalRanks > MAX ? '+' + (totalRanks - MAX) : String(totalRanks);
    doc.text(label, x + MAX * (SZ + GAP) + 0.3, y);
    doc.setTextColor(0, 0, 0);
  }
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
}

// Two-column layout offsets within one 92mm column:
// 0: name(40) | 40: DM boxes(19) | 60: Rk(8) | 68: St(8) | 76: Lv(7) | 83: Tot(9)
function drawSkillRow(doc, sk, x, y) {
  const ROW_H = 4.5;

  // Highlight background
  if (sk.highlight && HIGHLIGHT_FILLS[sk.highlight]) {
    const [r, g, b] = HIGHLIGHT_FILLS[sk.highlight];
    doc.setFillColor(r, g, b);
    doc.rect(x, y - ROW_H + 1, 92, ROW_H - 0.3, 'F');
  }

  // Text color
  if (sk.textColor && TEXT_COLORS[sk.textColor]) {
    const [r, g, b] = TEXT_COLORS[sk.textColor];
    doc.setTextColor(r, g, b);
  }

  const isSub   = sk.name.startsWith('  ');
  const fStyle  = sk.bold ? 'bold' : (isSub ? 'italic' : 'normal');
  doc.setFont('helvetica', fStyle);
  doc.setFontSize(7.5);

  let name = sk.name.trim();
  const maxNameW = isSub ? 34 : 38;
  while (name.length > 0 && doc.getTextWidth(name) > maxNameW) name = name.slice(0, -1);
  doc.text((isSub ? '↳ ' : '') + name, x + (isSub ? 2 : 0), y);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // DM boxes
  drawDMBoxes(doc, x + 40, y, sk.totalRanks);

  // Numeric columns
  const sign = n => n >= 0 ? '+' + n : String(n);
  doc.setFontSize(7.5);
  doc.text(sign(sk.rankBonus), x + 60, y);
  doc.text(sign(sk.statBonus), x + 68, y);
  if (sk.lvlBonus !== 0) doc.text(sign(sk.lvlBonus), x + 76, y);

  // Total (bold)
  doc.setFont('helvetica', 'bold');
  doc.text(sign(sk.total), x + 83, y);
  doc.setFont('helvetica', 'normal');
}

function drawSkillCategoryHeader(doc, name, x, y) {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(120, 80, 10);
  doc.text(name.toUpperCase(), x, y);
  doc.setLineWidth(0.25);
  doc.setDrawColor(180, 130, 20);
  doc.line(x, y + 0.9, x + 92, y + 0.9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
}

function drawSkillColHeaders(doc, x, y, lang) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(lang === 'en' ? 'Skill' : 'Compétence', x, y);
  doc.text('DM',  x + 41, y);
  doc.text('Rg',  x + 60, y);
  doc.text('St',  x + 68, y);
  doc.text('Nv',  x + 76, y);
  doc.text('Tot', x + 83, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.3);
  doc.setDrawColor(120, 90, 20);
  doc.line(x, y + 1, x + 92, y + 1);
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
}

// --- Two-column, multi-page skills renderer ---
// Returns { y, col } — caller advances page if col===1 to avoid side-by-side continuation.
function renderSkillsSection(doc, skills, lang, startY, pageH, mT, mB, mL) {
  const RIGHT_X   = mL + 98; // 92mm col + 6mm gutter
  const ROW_H     = 4.5;
  const CAT_H     = 5.5;
  const HEADER_H  = 5.5;

  function drawHeaders(atY) {
    drawSkillColHeaders(doc, mL,      atY, lang);
    drawSkillColHeaders(doc, RIGHT_X, atY, lang);
    return atY + HEADER_H;
  }

  let col         = 0;
  let y           = drawHeaders(startY);
  let colTopY     = y;
  let lastCatName = '';

  for (const sk of skills) {
    const rowH = sk.isCategory ? CAT_H : ROW_H;

    if (y + rowH > pageH - mB) {
      if (col === 0) {
        // Move to right column, reset y to column top
        col = 1;
        y   = colTopY;
        // Re-emit category continuation header if next item is a skill
        if (!sk.isCategory && lastCatName) {
          drawSkillCategoryHeader(doc, lastCatName, RIGHT_X, y);
          y += CAT_H;
        }
      } else {
        // Both columns full — new page
        doc.addPage();
        y       = mT;
        y       = drawHeaders(y);
        colTopY = y;
        col     = 0;
        // Re-emit category continuation header if next item is a skill
        if (!sk.isCategory && lastCatName) {
          drawSkillCategoryHeader(doc, lastCatName, mL, y);
          y += CAT_H;
        }
      }
    }

    const colX = col === 0 ? mL : RIGHT_X;

    if (sk.isCategory) {
      lastCatName = sk.name;
      drawSkillCategoryHeader(doc, sk.name, colX, y);
      y += CAT_H;
    } else {
      drawSkillRow(doc, sk, colX, y);
      y += ROW_H;
    }
  }

  return { y, col };
}

// --- Main export ---

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
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(42, 26, 8); // dark brown, prints clearly
    doc.text(title.toUpperCase(), mL, y);
    doc.setTextColor(0, 0, 0);
    y += 1.5;
    doc.setDrawColor(201, 154, 46);
    doc.setLineWidth(0.5);
    doc.line(mL, y, mL + usableW, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setLineWidth(0.2);
    doc.setDrawColor(100, 100, 100);
  }

  // ==============================
  // C2 — Header (print-friendly: text only, no fill)
  // ==============================
  const classes    = getAllClasses();
  const cls        = character.classIndex >= 0 ? classes[character.classIndex] : null;
  const realmLabel = cls ? getRealmLabel(cls, lang) : '';
  const subtitle   = [
    character.name || (lang === 'en' ? 'Unnamed' : 'Sans nom'),
    cls ? getClassName(cls, lang) : '',
    character.raceName,
    (lang === 'en' ? 'Lvl ' : 'Niv. ') + (character.level || 1),
  ].filter(Boolean).join(' — ');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(42, 26, 8);
  doc.text('ROLEMASTER', pageW / 2, 8, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 40, 15);
  doc.text(subtitle, pageW / 2, 13, { align: 'center' });
  doc.setDrawColor(80, 55, 20);
  doc.setLineWidth(0.5);
  doc.line(mL, 16, mL + usableW, 16);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setDrawColor(100, 100, 100);
  y = 20; // compact — saves space

  // ==============================
  // Identity (two columns) + portrait on right if present
  // ==============================
  const identityStartY = y;
  sectionHeader(lang === 'en' ? 'Identity' : 'Identité');
  const portraitW = character.portraitUrl ? 44 : 0;
  const idW = usableW - portraitW - (portraitW ? 3 : 0);
  const col1x = mL, col2x = mL + idW / 2;
  const idFields = [
    [lang === 'en' ? 'Race' : 'Race',       character.raceName],
    [lang === 'en' ? 'Realm' : 'Royaume',   realmLabel],
    ['Âge',                                  character.age],
    [lang === 'en' ? 'Height' : 'Taille',   character.height],
    [lang === 'en' ? 'Weight' : 'Poids',    character.weight],
    [lang === 'en' ? 'Sex' : 'Sexe',        character.sex],
    [lang === 'en' ? 'Hair' : 'Cheveux',    character.hair],
    [lang === 'en' ? 'Eyes' : 'Yeux',       character.eyes],
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

  // Portrait image (right column, same row as identity)
  if (character.portraitUrl) {
    const pX = mL + usableW - portraitW;
    const pH = y - identityStartY;
    const fmt = character.portraitUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    try {
      doc.addImage(character.portraitUrl, fmt, pX, identityStartY, portraitW, pH, undefined, 'FAST');
    } catch (_e) { /* skip if format unsupported */ }
  }

  // ==============================
  // Stats table — uneven columns (name wider, numerics narrower)
  // ==============================
  sectionHeader(lang === 'en' ? 'Statistics' : 'Caractéristiques');
  const bgBonuses = getBackgroundBonuses(character);

  // Column x positions: stat abbrev(16) | temp(11) | pot(11) | race(14) | bonus(14) | bg(14) | spec(14) | total(14)
  const sColX = [mL, mL+16, mL+27, mL+38, mL+52, mL+65, mL+78, mL+91];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  ['Stat','Temp','Pot','Race','Bonus','BG','Spéc','Total'].forEach((h, i) => doc.text(h, sColX[i], y));
  y += 1.5;
  doc.setLineWidth(0.3); doc.setDrawColor(120, 90, 20);
  doc.line(mL, y, mL + 105, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.2);

  for (let i = 0; i < 10; i++) {
    checkPage(5);
    const temp  = character.stats[i] || 0;
    const pot   = character.potentials[i] || temp;
    const race  = character.raceBonuses[i] || 0;
    const bonus = getStatBonus(temp);
    const bg    = bgBonuses.statBonusMods[i] || 0;
    const spec  = character.specialBonuses[i] || 0;
    const total = bonus + bg + spec;

    // Alternating row tint
    if (i % 2 === 0) {
      doc.setFillColor(248, 244, 234);
      doc.rect(mL, y - 3.2, 105, 4, 'F');
    }

    const isPrime = (character.primeStats || []).includes(i);
    doc.setFont('helvetica', isPrime ? 'bolditalic' : 'bold');
    doc.text(STAT_ABBREVS[i] + (isPrime ? ' *' : ''), sColX[0], y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(temp), sColX[1], y);
    doc.text(String(pot),  sColX[2], y);
    doc.text(race !== 0 ? (race > 0 ? '+' + race : String(race)) : '—', sColX[3], y);
    doc.text(bonus >= 0  ? '+' + bonus  : String(bonus),  sColX[4], y);
    doc.text(bg !== 0    ? (bg > 0 ? '+' + bg : String(bg)) : '—', sColX[5], y);
    doc.text(spec !== 0  ? (spec > 0 ? '+' + spec : String(spec)) : '—', sColX[6], y);
    doc.setFont('helvetica', 'bold');
    doc.text(total >= 0 ? '+' + total : String(total), sColX[7], y);
    doc.setFont('helvetica', 'normal');
    y += 4;
  }
  y += 3;

  // ==============================
  // Combat (two columns)
  // ==============================
  sectionHeader(lang === 'en' ? 'Combat' : 'Combat');
  const hp = calcHitPoints(character);
  const pp = calcPowerPoints(character);
  const db = calculateDB(character);
  const combatFields = [
    [lang === 'en' ? 'HP Base / Max' : 'PdC Base / Max',  `${hp.base} / ${hp.cap}`],
    [lang === 'en' ? 'Death at' : 'Mort à',               getDeathThreshold(character)],
    ['PP',                                                  pp],
    ['DB / BD',                                             db.printDisplay],
    [lang === 'en' ? 'Armor Type' : 'Type d\'Armure (TA)', character.armorType],
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
  y += 4;

  // ==============================
  // Skills — two-column, multi-page, with bold/color/highlight/DM boxes
  // ==============================
  const developedSkills = getDevelopedSkills(character, lang);

  if (developedSkills.length > 0) {
    sectionHeader(lang === 'en' ? 'Skills' : 'Compétences');
    const { y: skillsY, col: skillsCol } = renderSkillsSection(
      doc, developedSkills, lang, y, pageH, mT, mB, mL
    );
    // If we ended in right column, start subsequent sections on a fresh page
    if (skillsCol === 1) {
      doc.addPage();
      y = mT;
    } else {
      y = skillsY + 4;
    }
  }

  // ==============================
  // Spell lists
  // ==============================
  const spellLists = (character.spellLists || []).filter(sl => sl.maxLevel > 0);
  if (spellLists.length > 0) {
    checkPage(20);
    sectionHeader(lang === 'en' ? 'Spell Lists' : 'Listes de Sorts');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.2);

    if (spellLists.length > 10) {
      // Two-column layout
      const half = Math.ceil(spellLists.length / 2);
      const colW = (usableW - 6) / 2; // each column width
      const c2x = mL + colW + 6;      // second column x offset

      // Column headers
      doc.setFont('helvetica', 'bold');
      doc.text(lang === 'en' ? 'List' : 'Liste', mL,          y);
      doc.text('Niv',                              mL + colW - 8, y);
      doc.text(lang === 'en' ? 'List' : 'Liste', c2x,         y);
      doc.text('Niv',                              c2x + colW - 8, y);
      y += 1.5;
      doc.setLineWidth(0.3); doc.setDrawColor(120, 90, 20);
      doc.line(mL, y, mL + usableW, y);
      y += 3;
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.2);

      const startY = y;
      const maxNameW = colW - 12;
      for (let i = 0; i < spellLists.length; i++) {
        const sl = spellLists[i];
        const isRight = i >= half;
        const row = isRight ? i - half : i;
        const cx = isRight ? c2x : mL;
        let name = sl.name || '?';
        while (name.length > 0 && doc.getTextWidth(name) > maxNameW) name = name.slice(0, -1);
        doc.text(name, cx, startY + row * 4);
        doc.text(String(sl.maxLevel || '?'), cx + colW - 8, startY + row * 4);
      }
      y = startY + half * 4;
    } else {
      // Single-column layout
      doc.setFont('helvetica', 'bold');
      doc.text(lang === 'en' ? 'List' : 'Liste',   mL,       y);
      doc.text(lang === 'en' ? 'Max Lvl' : 'Niv.', mL + 100, y);
      doc.text('Type',                              mL + 120, y);
      y += 1.5;
      doc.setLineWidth(0.3); doc.setDrawColor(120, 90, 20);
      doc.line(mL, y, mL + 140, y);
      y += 3;
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.2);
      for (const sl of spellLists) {
        checkPage(5);
        let name = sl.name || '?';
        while (name.length > 0 && doc.getTextWidth(name) > 92) name = name.slice(0, -1);
        doc.text(name,                       mL,       y);
        doc.text(String(sl.maxLevel || '?'), mL + 100, y);
        doc.text(sl.type || '',              mL + 120, y);
        y += 4;
      }
    }
    y += 3;
  }

  // ==============================
  // Background bonuses
  // ==============================
  const bgSummary = summarizeBackgroundBonuses(bgBonuses, lang);
  if (bgSummary && bgSummary.length > 0) {
    checkPage(20);
    sectionHeader(lang === 'en' ? 'Background Bonuses' : 'Bonus d\'Historique');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    for (const line of bgSummary) {
      checkPage(5);
      for (const wl of doc.splitTextToSize(line, usableW)) {
        checkPage(4);
        doc.text(wl, mL, y);
        y += 4;
      }
    }
    y += 2;
  }

  // ==============================
  // Equipment + History
  // ==============================
  if (character.equipment) {
    checkPage(15);
    sectionHeader(lang === 'en' ? 'Equipment' : 'Équipement');
    doc.setFontSize(8);
    for (const line of doc.splitTextToSize(character.equipment, usableW)) {
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
    for (const line of doc.splitTextToSize(character.history, usableW).slice(0, 20)) {
      checkPage(4);
      doc.text(line, mL, y);
      y += 4;
    }
  }

  // ==============================
  // C6 — Footer on all pages (gold line + character name + date + page)
  // ==============================
  const pageCount = doc.getNumberOfPages();
  const footerDate = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(201, 154, 46);
    doc.setLineWidth(0.3);
    doc.line(mL, pageH - 9, pageW - mR, pageH - 9);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 110, 60);
    doc.text(character.name || '', mL, pageH - 5.5);
    doc.text(`Rolemaster Reborn — ${footerDate}`, pageW / 2, pageH - 5.5, { align: 'center' });
    doc.text(`${p}/${pageCount}`, pageW - mR, pageH - 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`${(character.name || 'personnage').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  return doc;
}

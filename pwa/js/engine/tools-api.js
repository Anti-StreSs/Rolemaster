// tools-api.js — Agent-ready Tooling API for Rolemaster engine
// Each tool = {name, description, parameters, execute(params)}

import { loadCharacter, saveCharacter, getAllCharacters } from './db.js';
import { calcHitPoints, calcPowerPoints, calculateDB, getTotalRanks } from './character.js';
import { getStatBonus, getRankBonus, generateStatRolls } from './stats.js';
import { getSkillName, getSkillDevCost, getSkillStatIndices,
         getLevelBonus, calcSimilarityBonus, getAllSkillsFlat,
         getAllCategories, calcSkillStatBonus } from './skills.js';
import { getBackgroundBonuses, getSkillBackgroundBonus } from './background-effects.js';
import { getAllClasses, getClassName } from './classes.js';
import { getSpellListCost, getSpellRankCost } from './spells.js';
import { getData } from './data-loader.js';

// --- Tool Registry ---
const TOOLS = {};

function registerTool(name, description, parameters, executeFn) {
  TOOLS[name] = { name, description, parameters, execute: executeFn };
}

/** Get all tool definitions (for LLM function-calling schema). */
export function getToolDefinitions() {
  return Object.values(TOOLS).map(t => ({
    name: t.name, description: t.description, parameters: t.parameters,
  }));
}

/** Execute a tool by name with validated params. */
export async function executeTool(name, params = {}) {
  const tool = TOOLS[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  for (const [key, schema] of Object.entries(tool.parameters)) {
    if (schema.required && !(key in params))
      throw new Error(`Missing required parameter: ${key}`);
    if (!(key in params) && 'default' in schema)
      params[key] = schema.default;
  }
  return await tool.execute(params);
}

// Expose globally for console testing
if (typeof window !== 'undefined') {
  window.__rmTools = { getToolDefinitions, executeTool };
}

// --- Group 1: Character Management ---

registerTool('list_characters',
  'List all saved characters with basic info',
  {},
  async () => {
    const chars = await getAllCharacters();
    return chars.map(c => ({
      name: c.name, race: c.raceName, class: c.classIndex,
      level: c.level, updatedAt: c.updatedAt,
    }));
  }
);

registerTool('get_character',
  'Load full character data by name',
  { name: { type: 'string', required: true } },
  async ({ name }) => {
    const c = await loadCharacter(name);
    return c || { error: 'Character not found' };
  }
);

registerTool('get_character_summary',
  'Get concise summary: name, race, class, level, HP, PP, DB',
  { name: { type: 'string', required: true } },
  async ({ name }) => {
    const c = await loadCharacter(name);
    if (!c) return { error: 'Character not found' };
    const classes = getAllClasses();
    const cls = c.classIndex >= 0 ? classes[c.classIndex] : null;
    return {
      name: c.name, race: c.raceName, level: c.level,
      className: cls ? getClassName(cls, 'fr') : '?',
      hp: calcHitPoints(c), pp: calcPowerPoints(c), db: calculateDB(c),
    };
  }
);

// --- Group 2: Stats & Rolls ---

registerTool('get_stat_bonus',
  'Get the RM2 stat bonus for a given stat value (1-101+)',
  { statValue: { type: 'number', required: true } },
  async ({ statValue }) => ({ bonus: getStatBonus(statValue) })
);

registerTool('get_all_stat_bonuses',
  'Get all 10 stat bonuses for a character, with background modifications',
  { name: { type: 'string', required: true } },
  async ({ name }) => {
    const c = await loadCharacter(name);
    if (!c) return { error: 'Character not found' };
    const bg = getBackgroundBonuses(c);
    const ABBREVS = ['CO', 'AG', 'AD', 'ME', 'RS', 'FO', 'RP', 'PR', 'EM', 'IN'];
    return ABBREVS.map((a, i) => ({
      stat: a, value: c.stats[i], bonus: getStatBonus(c.stats[i]),
      bgMod: bg.statBonusMods[i] || 0,
      total: getStatBonus(c.stats[i]) + (bg.statBonusMods[i] || 0),
    }));
  }
);

// --- Group 3: Skills ---

registerTool('get_skill_total',
  'Get full breakdown for one skill: ranks, rank, stat, level, sim, bg, total',
  { name: { type: 'string', required: true },
    skillIndex: { type: 'number', required: true } },
  async ({ name, skillIndex }) => {
    const c = await loadCharacter(name);
    if (!c) return { error: 'Character not found' };
    const skills = getAllSkillsFlat();
    const skill = skills[skillIndex];
    if (!skill) return { error: 'Skill not found' };
    const ranks = getTotalRanks(c, skillIndex);
    const rankBonus = getRankBonus(ranks);
    const bg = getBackgroundBonuses(c);
    const statValues = c.stats.map((s, i) => s + (bg.statBonusMods[i] || 0));
    const statBonus = calcSkillStatBonus(skill, statValues);
    const classes = getAllClasses();
    const cls = c.classIndex >= 0 ? classes[c.classIndex] : null;
    const lvlBonus = getLevelBonus(cls, c.level, skill.categoryName, skillIndex);
    const simBonus = calcSimilarityBonus(skillIndex, c);
    const bgBonus = getSkillBackgroundBonus(bg, skill.name_fr, skill.name_en);
    const miscBonus = (c.miscBonuses && c.miscBonuses[skillIndex]) || 0;
    const total = rankBonus + statBonus + lvlBonus + simBonus + bgBonus + miscBonus;
    return { skillName: skill.name_fr, ranks, rankBonus, statBonus, lvlBonus, simBonus, bgBonus, miscBonus, total };
  }
);

registerTool('get_all_skills',
  'Get all skills with totals for a character, optionally filtered',
  { name: { type: 'string', required: true },
    filter: { type: 'string', default: 'developed' } },
  async ({ name, filter }) => {
    const c = await loadCharacter(name);
    if (!c) return { error: 'Character not found' };
    const skills = getAllSkillsFlat();
    const classes = getAllClasses();
    const cls = c.classIndex >= 0 ? classes[c.classIndex] : null;
    const bg = getBackgroundBonuses(c);
    const statValues = c.stats.map((s, i) => s + (bg.statBonusMods[i] || 0));
    const result = [];
    for (const skill of skills) {
      const idx = skill.globalIndex;
      const ranks = getTotalRanks(c, idx);
      const rankBonus = getRankBonus(ranks);
      const statBonus = calcSkillStatBonus(skill, statValues);
      const lvlBonus = getLevelBonus(cls, c.level, skill.categoryName, idx);
      const simBonus = calcSimilarityBonus(idx, c);
      const bgBonus = getSkillBackgroundBonus(bg, skill.name_fr, skill.name_en);
      const total = rankBonus + statBonus + lvlBonus + simBonus + bgBonus;
      if (filter === 'developed' && ranks === 0) continue;
      if (filter === 'positive' && total <= 0) continue;
      result.push({
        index: idx, name_fr: skill.name_fr, name_en: skill.name_en,
        ranks, rankBonus, statBonus, lvlBonus, simBonus, bgBonus, total,
      });
    }
    return result;
  }
);

// --- Group 4: Spells ---

registerTool('get_spell_lists',
  'Get all spell lists known by a character',
  { name: { type: 'string', required: true } },
  async ({ name }) => {
    const c = await loadCharacter(name);
    if (!c) return { error: 'Character not found' };
    return c.spellLists || [];
  }
);

// --- Group 5: Combat ---

registerTool('get_combat_stats',
  'Get combat stats: DB breakdown, HP, PP',
  { name: { type: 'string', required: true } },
  async ({ name }) => {
    const c = await loadCharacter(name);
    if (!c) return { error: 'Character not found' };
    const bg = getBackgroundBonuses(c);
    return {
      db: calculateDB(c), hp: calcHitPoints(c), pp: calcPowerPoints(c),
      initiativeBonus: bg.initiativeBonus || 0,
      armorType: c.armorType, shieldType: c.shieldType,
    };
  }
);

// --- Group 6: Lookup ---

registerTool('lookup_rule',
  'Search optional rules by keyword',
  { query: { type: 'string', required: true } },
  async ({ query }) => {
    const data = getData();
    const options = data.options?.options || [];
    const q = query.toLowerCase();
    const matches = options.filter(o =>
      (o.name_fr || '').toLowerCase().includes(q) ||
      (o.name_en || '').toLowerCase().includes(q) ||
      (o.description_fr || '').toLowerCase().includes(q)
    ).slice(0, 10);
    return matches;
  }
);

registerTool('get_rank_bonus',
  'Get the RM2 rank bonus for a given number of ranks',
  { ranks: { type: 'number', required: true } },
  async ({ ranks }) => ({ bonus: getRankBonus(ranks) })
);

// Party Manager — runtime session state for GM use
// Not persisted to IndexedDB; purely in-memory during a session.

import { calcHitPoints, calcPowerPoints, calculateDB, getTotalStatBonus } from './character.js';
import {
  getSession, setPartyMembers,
  removeNPC,
  getCombatState, setCombatActive,
  incrementCombatRound, getCombatTurnIndex, setCombatTurnIndex,
  addCombatLog, addSessionLog, pushNPCFromCreature,
  resetSession as _resetSession,
} from './session-state.js';

// Predefined status effects with FR/EN labels
export const STATUS_LIST = [
  { id: 'stunned',        fr: 'Étourdi',              en: 'Stunned',          color: 'red',    hasRounds: true,  effects: '-25 tout'              },
  {
    id: 'bleeding',
    fr: 'Saignement',
    en: 'Bleeding',
    color: 'red',
    hasRounds: false,
    periodic: true,
    defaultDmg: 3,
    effects: 'N PV/round — stopper par soin',
  },
  { id: 'unconscious',    fr: 'Inconscient',           en: 'Unconscious',      color: 'gray',   hasRounds: false, effects: 'incapable, -50 BD'     },
  { id: 'dead',           fr: 'Mort',                  en: 'Dead',             color: 'gray',   hasRounds: false, effects: '—'                     },
  { id: 'prone',          fr: 'Au sol',                en: 'Prone',            color: 'yellow', hasRounds: false, effects: '-20 BO / -20 BD'       },
  { id: 'stunned_unable', fr: "Incapable d'agir",      en: 'Unable to Act',    color: 'red',    hasRounds: true,  effects: 'aucune action'         },
  { id: 'hasted',         fr: 'Accéléré',              en: 'Hasted',           color: 'blue',   hasRounds: true,  effects: '+20 tout, 2× actions'  },
  { id: 'slowed',         fr: 'Ralenti',               en: 'Slowed',           color: 'yellow', hasRounds: true,  effects: '-20 tout, ½ mvt'       },
  { id: 'paralyzed',      fr: 'Paralysé',              en: 'Paralyzed',        color: 'gray',   hasRounds: true,  effects: 'aucune action, -50 BD' },
  { id: 'silenced',       fr: 'Silencieux',            en: 'Silenced',         color: 'blue',   hasRounds: true,  effects: 'pas de sorts'          },
  { id: 'no_parry',       fr: 'Pas de parade',         en: 'No Parry',         color: 'yellow', hasRounds: true,  effects: 'BD = 0'                },
  { id: 'stunned_no_parry', fr: 'Étourdi+pas parade', en: 'Stunned+No Parry', color: 'red',    hasRounds: true,  effects: '-25 tout, BD = 0'      },
];

// ── Accesseurs sur le singleton session ──────────────────────────────────────

function _find(name) {
  return getSession().partyMembers.find(m => m.char?.name === name)
      || getSession().npcCombatants.find(m => m.name === name);
}

// ── Membres PJ ───────────────────────────────────────────────────────────────

export function initParty(characters) {
  const members = characters.map(char => {
    const hpResult = calcHitPoints(char);
    const maxHP = hpResult?.cap ?? hpResult ?? 0;
    const maxPP = calcPowerPoints(char) ?? 0;
    const dbResult = calculateDB(char);
    const db = dbResult?.meleeBD ?? dbResult?.totalBD ?? (typeof dbResult === 'number' ? dbResult : 0);
    return { char, maxHP, maxPP, db, currentHP: maxHP, currentPP: maxPP,
             statuses: [], initiative: 0, actionPoints: 0, weaponSlot3: null };
  });
  setPartyMembers(members);
  addSessionLog(`Équipe initialisée (${members.length} membres)`);
}

export function getParty() {
  const s = getSession();
  return { members: s.partyMembers, round: s.combat.round, log: s.sessionLog };
}

export function addMember(char) {
  if (_find(char.name)) return;
  const hpResult = calcHitPoints(char);
  const maxHP = hpResult?.cap ?? hpResult ?? 0;
  const maxPP = calcPowerPoints(char) ?? 0;
  const dbResult = calculateDB(char);
  const db = dbResult?.meleeBD ?? dbResult?.totalBD ?? (typeof dbResult === 'number' ? dbResult : 0);
  getSession().partyMembers.push({
    char, maxHP, maxPP, db, currentHP: maxHP, currentPP: maxPP,
    statuses: [], initiative: 0, actionPoints: 0, weaponSlot3: null,
  });
  addSessionLog(`${char.name} rejoint l'équipe`);
}

export function removeMember(name) {
  const members = getSession().partyMembers;
  const idx = members.findIndex(m => m.char.name === name);
  if (idx === -1) return;
  members.splice(idx, 1);
  addSessionLog(`${name} quitte l'équipe`);
}

export function applyDamage(name, amount) {
  const m = _find(name);
  if (!m) return;
  m.currentHP = Math.max(0, m.currentHP - amount);
  addSessionLog(`${name} subit ${amount} dégâts → HP: ${m.currentHP}/${m.maxHP}`);
}

export function applyHealing(name, amount) {
  const m = _find(name);
  if (!m) return;
  m.currentHP = Math.min(m.maxHP, m.currentHP + amount);
  addSessionLog(`${name} récupère ${amount} PV → HP: ${m.currentHP}/${m.maxHP}`);
}

export function spendPP(name, amount) {
  const m = _find(name);
  if (!m || m.isNPC) return;
  m.currentPP = Math.max(0, m.currentPP - amount);
  addSessionLog(`${name} dépense ${amount} PP → PP: ${m.currentPP}/${m.maxPP}`);
}

export function recoverPP(name, amount) {
  const m = _find(name);
  if (!m || m.isNPC) return;
  m.currentPP = Math.min(m.maxPP, m.currentPP + amount);
  addSessionLog(`${name} récupère ${amount} PP → PP: ${m.currentPP}/${m.maxPP}`);
}

export function addStatus(name, statusId, rounds, options = {}) {
  const m = _find(name);
  if (!m) return;
  const def = STATUS_LIST.find(s => s.id === statusId);
  if (!def) return;
  if (!def.periodic && rounds === null && m.statuses.some(s => s.id === statusId)) return;
  const entry = {
    id: statusId,
    label: def.fr,
    color: def.color,
    effects: def.effects || '',
    roundsRemaining: def.periodic ? null : (rounds ?? null),
    periodic: def.periodic ?? false,
    dmgPerRound: def.periodic ? (options.dmgPerRound ?? def.defaultDmg ?? 1) : 0,
  };
  m.statuses.push(entry);
  const roundStr = entry.roundsRemaining !== null ? ` (${entry.roundsRemaining}r)` : '';
  const dmgStr   = entry.periodic ? ` [${entry.dmgPerRound} PV/round]` : '';
  addSessionLog(`${name} → ${def.fr}${roundStr}${dmgStr}`);
}

export function removeStatus(name, statusIndex) {
  const m = _find(name);
  if (!m || statusIndex < 0 || statusIndex >= m.statuses.length) return;
  const removed = m.statuses.splice(statusIndex, 1)[0];
  addSessionLog(`${name} : fin de ${removed.label}`);
}

/**
 * Click on a status pill:
 * - Periodic (bleeding): click removes (healed).
 * - Permanent (roundsRemaining === null): remove immediately.
 * - Timed, rounds > 1: decrement by 1.
 * - Timed, rounds === 1: remove (expired).
 */
export function clickStatus(name, statusIndex) {
  const m = _find(name);
  if (!m || statusIndex < 0 || statusIndex >= m.statuses.length) return;
  const s = m.statuses[statusIndex];
  if (s.periodic) {
    m.statuses.splice(statusIndex, 1);
    addSessionLog(`${name} : ${s.label} soigné`);
  } else if (s.roundsRemaining === null) {
    m.statuses.splice(statusIndex, 1);
    addSessionLog(`${name} : ${s.label} retiré`);
  } else if (s.roundsRemaining <= 1) {
    m.statuses.splice(statusIndex, 1);
    addSessionLog(`${name} : ${s.label} expiré`);
  } else {
    s.roundsRemaining -= 1;
    addSessionLog(`${name} : ${s.label} → ${s.roundsRemaining}r restants`);
  }
}

function _tickMemberStatuses(m, displayName) {
  const toRemove = [];
  for (let i = 0; i < m.statuses.length; i++) {
    const s = m.statuses[i];
    if (s.periodic) {
      // Dégâts périodiques — jamais auto-expirés, seulement sur soin
      if (s.dmgPerRound > 0) {
        m.currentHP = Math.max(0, (m.currentHP ?? 0) - s.dmgPerRound);
        addSessionLog(`${displayName} : ${s.label} → −${s.dmgPerRound} PV`);
      }
      continue;
    }
    if (s.roundsRemaining === null) continue;
    s.roundsRemaining -= 1;
    if (s.roundsRemaining <= 0) {
      toRemove.push(i);
      addSessionLog(`${displayName} : ${s.label} expiré`);
    }
  }
  for (let i = toRemove.length - 1; i >= 0; i--) {
    m.statuses.splice(toRemove[i], 1);
  }
}

export function tickStatuses() {
  for (const m of getSession().partyMembers) _tickMemberStatuses(m, m.char.name);
  for (const npc of getSession().npcCombatants) _tickMemberStatuses(npc, npc.name);
}

// ── Initiative par Points d'Action (PA) ─────────────────────────────────────
// Variante RM2 : Init PA = 1d100 + valeur brute RP (index 6)
// Chaque action coûte des PA. Le combattant avec le plus de PA agit en premier.
// Quand tout le monde ≤ 0, le round se termine.

function _rollD100() { return Math.floor(Math.random() * 100) + 1; }

export const ACTION_COSTS = {
  melee:          60,   // Attaque mêlée
  ranged:         70,   // Attaque à distance
  spell:         100,   // Sort normal
  spell_instant:  50,   // Sort instantané
  move_full:      40,   // Déplacement plein
  move_half:      25,   // Demi-déplacement
  parry:          30,   // Parade active
  draw_weapon:    25,   // Dégainer / changer d'arme
  stand_up:       35,   // Se relever (prone)
  maneuver:       30,   // Manœuvre rapide
};

export const ACTION_LABELS = {
  melee:          { fr: 'Attaque mêlée',        en: 'Melee attack'       },
  ranged:         { fr: 'Attaque à distance',    en: 'Ranged attack'      },
  spell:          { fr: 'Sort (normal)',         en: 'Spell (normal)'     },
  spell_instant:  { fr: 'Sort (instantané)',     en: 'Spell (instant)'    },
  move_full:      { fr: 'Déplacement',           en: 'Full move'          },
  move_half:      { fr: 'Demi-déplacement',      en: 'Half move'          },
  parry:          { fr: 'Parade active',         en: 'Active parry'       },
  draw_weapon:    { fr: 'Dégainer/changer arme', en: 'Draw/switch weapon' },
  stand_up:       { fr: 'Se relever',            en: 'Stand up'           },
  maneuver:       { fr: 'Manœuvre',              en: 'Maneuver'           },
};

/**
 * Obtient la valeur brute de RP pour un PJ (character.stats[6])
 * ou le base_rate pour un NPC.
 */
function _getRP(m) {
  if (m.isNPC) return m.base_rate ?? 50;
  return m.char?.stats?.[6] ?? 50;  // index 6 = RP (Rapidité/Quickness)
}

export function rollInitiative(name, manualRoll) {
  const m = _find(name);
  if (!m) return;
  const roll = manualRoll ?? _rollD100();
  const rp = _getRP(m);
  m.initiative = roll + rp;
  m.actionPoints = m.initiative;
  const rpLabel = m.isNPC ? 'MM' : 'RP';
  addSessionLog(`${name} initiative: ${roll} + ${rp} (${rpLabel}) = ${m.initiative} PA`);
}

export function rollAllInitiative() {
  for (const m of getSession().partyMembers) {
    const roll = _rollD100();
    const rp = _getRP(m);
    m.initiative = roll + rp;
    m.actionPoints = m.initiative;
    addSessionLog(`${m.char.name} initiative: ${roll} + ${rp} (RP) = ${m.initiative} PA`);
  }
  for (const npc of getSession().npcCombatants) {
    const roll = _rollD100();
    const rp = _getRP(npc);
    npc.initiative = roll + rp;
    npc.actionPoints = npc.initiative;
    addSessionLog(`${npc.name} initiative: ${roll} + ${rp} (MM) = ${npc.initiative} PA`);
  }
}

/**
 * Dépense des PA pour une action. Le combattant peut aller en négatif.
 */
export function spendAction(name, actionId) {
  const m = _find(name);
  if (!m) return false;
  const cost = ACTION_COSTS[actionId];
  if (cost === undefined) return false;
  m.actionPoints = (m.actionPoints ?? 0) - cost;
  const label = ACTION_LABELS[actionId]?.fr || actionId;
  addSessionLog(`${name} : ${label} (−${cost} PA) → ${m.actionPoints} PA restants`);
  return true;
}

/**
 * Modifie manuellement les PA d'un combattant (ajustement MJ).
 */
export function adjustActionPoints(name, delta) {
  const m = _find(name);
  if (!m) return;
  m.actionPoints = (m.actionPoints ?? 0) + delta;
  const sign = delta >= 0 ? '+' : '';
  addSessionLog(`${name} : ${sign}${delta} PA (MJ) → ${m.actionPoints} PA`);
}

/**
 * Retourne true si tous les combattants vivants ont ≤ 0 PA.
 */
export function isRoundOver() {
  const alive = _aliveOrder();
  return alive.length > 0 && alive.every(e => {
    const m = _find(e.name);
    return (m?.actionPoints ?? 0) <= 0;
  });
}

export function nextRound() {
  incrementCombatRound();
  tickStatuses();
  rollAllInitiative();  // Nouveau round = nouveau jet d'initiative pour tous
  addSessionLog(`--- Round ${getSession().combat.round} ---`);
}

export function setMemberWeapon3(name, weaponIndex) {
  const m = getSession().partyMembers.find(m => m.char.name === name);
  if (!m) return;
  m.weaponSlot3 = weaponIndex === '' ? null : parseInt(weaponIndex, 10);
}

export function getPartyLog() { return getSession().sessionLog; }

export function resetParty() { _resetSession(); }

// ─── Combat Mode ─────────────────────────────────────────────────────────────

export function enterCombatMode()  { setCombatActive(true); }
export function exitCombatMode()   { setCombatActive(false); }
export function isCombatMode()     { return getCombatState().active; }
export function getNPCCombatants() { return getSession().npcCombatants; }
export function getCombatLog()     { return getSession().combat.log; }

export function addNPCCombatant(creature) {
  return pushNPCFromCreature(creature);
}

export function removeNPCCombatant(id) {
  removeNPC(id);
  addSessionLog(`PNJ ${id} retiré du combat`);
}

export function logCombatAction(entry) {
  addCombatLog(entry);
  addSessionLog(entry.msg || entry.summary || '');
}

export function getInitiativeOrder() {
  const all = [
    ...getSession().partyMembers.map(m => ({
      name: m.char.name, initiative: m.initiative, actionPoints: m.actionPoints ?? 0,
      isNPC: false, isDead: m.statuses.some(s => s.id === 'dead'),
    })),
    ...getSession().npcCombatants.map(m => ({
      name: m.name, initiative: m.initiative, actionPoints: m.actionPoints ?? 0,
      isNPC: true, isDead: m.currentHP <= 0 || m.statuses.some(s => s.id === 'dead'),
    })),
  ];
  // Tri par PA restants décroissant (le plus de PA agit en premier)
  return all.sort((a, b) => b.actionPoints - a.actionPoints);
}

function _aliveOrder() { return getInitiativeOrder().filter(e => !e.isDead); }

export function getCurrentTurn() {
  if (!isCombatMode()) return null;
  const alive = _aliveOrder();
  if (!alive.length) return null;
  // Le premier avec PA > 0 dans l'ordre trié
  const active = alive.find(e => e.actionPoints > 0);
  return active || alive[0];  // fallback au premier si tous ≤ 0
}

export function nextTurn() {
  // Dans le système PA, pas de "tour suivant" séquentiel.
  // Si tous les PA sont ≤ 0, le round est terminé.
  if (isRoundOver()) {
    nextRound();
  }
}

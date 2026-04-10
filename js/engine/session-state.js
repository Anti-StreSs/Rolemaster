// session-state.js — Singleton de session partagé entre tous les modules UI
// Survit à la navigation entre onglets. Reset explicite uniquement.

const _state = {
  partyMembers: [],
  npcCombatants: [],
  combat: {
    active: false,
    round: 0,
    currentTurnIndex: 0,
    log: [],
  },
  sessionLog: [],
  encounterLog: [],
  treasurePending: null,
};

let _npcCounter = 0;

// ── Observers (pub/sub léger) ──────────────────────────────────────────────

const _listeners = new Set();

export function subscribeSession(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify(event) {
  for (const fn of _listeners) {
    try { fn(event); } catch (e) { /* ne pas bloquer */ }
  }
}

// ── Accès lecture ────────────────────────────────────────────────────────────

export function getSession() { return _state; }
export function isPartyInitialized() { return _state.partyMembers.length > 0; }
export function isCombatActive() { return _state.combat.active; }

// ── Membres PJ ──────────────────────────────────────────────────────────────

export function setPartyMembers(members) {
  _state.partyMembers = members;
  _notify('party:updated');
}

export function updatePartyMember(name, patch) {
  const m = _state.partyMembers.find(m => m.char?.name === name);
  if (!m) return;
  Object.assign(m, patch);
  _notify('party:member:updated');
}

export function getPartyMember(name) {
  return _state.partyMembers.find(m => m.char?.name === name)
      || _state.npcCombatants.find(m => m.name === name);
}

// ── PNJs ─────────────────────────────────────────────────────────────────────

/**
 * Ajoute une créature du bestiaire comme PNJ de combat.
 * Appelé depuis encounter-ui.js et bestiary-ui.js.
 * Party Manager n'a PAS besoin d'être initialisé au préalable.
 */
export function pushNPCFromCreature(creature, customName) {
  _npcCounter++;
  const name = customName || `${creature.name_en} #${_npcCounter}`;
  const npc = {
    id: `npc-${_npcCounter}`,
    name,
    isNPC: true,
    fromBestiary: creature.id,
    level: creature.level ?? 1,
    maxHP: creature.hits_base ?? 10,
    currentHP: creature.hits_base ?? 10,
    db: creature.db ?? 0,
    armorType: creature.armor_type ?? 1,
    attacks: creature.attacks ?? [],
    attacks_raw: creature.attacks_raw ?? '—',
    size: creature.size ?? 'M',
    base_rate: creature.movement?.base_rate ?? creature.level * 3 + 50,
    statuses: [],
    initiative: 0,
    actionPoints: 0,
  };
  _state.npcCombatants.push(npc);
  _sessionLog(`${npc.name} ajouté au combat (PdC ${npc.maxHP}, BD ${npc.db}, TA ${npc.armorType})`);
  _notify('npc:added');
  return npc;
}

export function removeNPC(id) {
  const idx = _state.npcCombatants.findIndex(m => m.id === id);
  if (idx === -1) return;
  _state.npcCombatants.splice(idx, 1);
  _notify('npc:removed');
}

/**
 * Met à jour les stats d'un NPC de combat.
 * @param {string} id — ID du NPC (ex: 'npc-3')
 * @param {object} patch — champs à modifier (ex: { db: 15, armorType: 4 })
 */
export function updateNPC(id, patch) {
  const npc = _state.npcCombatants.find(m => m.id === id);
  if (!npc) return;
  // Traitement spécial pour maxHP : ajuster currentHP proportionnellement
  if (patch.maxHP !== undefined && npc.maxHP > 0) {
    const ratio = npc.currentHP / npc.maxHP;
    npc.maxHP = patch.maxHP;
    npc.currentHP = Math.round(patch.maxHP * ratio);
    delete patch.maxHP;
  }
  Object.assign(npc, patch);
  _notify('npc:updated');
}

export function getNPCCombatants() { return _state.npcCombatants; }

// ── Log de rencontre ─────────────────────────────────────────────────────────

export function logEncounter(terrain, encounters) {
  const entry = {
    time: _ts(),
    terrain,
    creatures: encounters.map(e => ({
      name: e.creature.name_en,
      name_fr: e.creature.name_fr,
      count: e.count,
      level: e.creature.level,
    })),
  };
  _state.encounterLog.unshift(entry);
  if (_state.encounterLog.length > 50) _state.encounterLog.pop();
  _sessionLog(`Rencontre [${terrain}] : ${entry.creatures.map(c => `${c.name} ×${c.count}`).join(', ')}`);
  _notify('encounter:logged');
}

// ── Trésor pending ───────────────────────────────────────────────────────────

export function setPendingTreasure(result) {
  _state.treasurePending = result;
  _sessionLog(`Trésor type ${result?.type || '?'} généré`);
  _notify('treasure:updated');
}

export function clearPendingTreasure() {
  _state.treasurePending = null;
  _notify('treasure:cleared');
}

// ── Journal de session ───────────────────────────────────────────────────────

function _sessionLog(msg) {
  _state.sessionLog.unshift({ time: _ts(), msg });
  if (_state.sessionLog.length > 200) _state.sessionLog.pop();
}

export function addSessionLog(msg) {
  _sessionLog(msg);
  _notify('log:updated');
}

export function getSessionLog() { return _state.sessionLog; }

// ── Combat state ─────────────────────────────────────────────────────────────

export function getCombatState() { return _state.combat; }

export function setCombatActive(active) {
  _state.combat.active = active;
  if (!active) {
    _state.combat.round = 0;
    _state.combat.currentTurnIndex = 0;
    _state.combat.log = [];
    _state.npcCombatants = [];
    _npcCounter = 0;
    _sessionLog('Mode combat terminé');
  } else {
    _sessionLog('⚔ Mode combat activé');
  }
  _notify('combat:state');
}

export function incrementCombatRound() {
  _state.combat.round++;
  _notify('combat:round');
}

export function getCombatTurnIndex() { return _state.combat.currentTurnIndex; }

export function setCombatTurnIndex(idx) {
  _state.combat.currentTurnIndex = idx;
  _notify('combat:turn');
}

export function addCombatLog(entry) {
  _state.combat.log.unshift({ time: _ts(), round: _state.combat.round, ...entry });
  if (_state.combat.log.length > 200) _state.combat.log.pop();
  _notify('combat:log');
}

// ── Reset total ───────────────────────────────────────────────────────────────

export function resetSession() {
  _state.partyMembers = [];
  _state.npcCombatants = [];
  _state.combat = { active: false, round: 0, currentTurnIndex: 0, log: [] };
  _state.sessionLog = [];
  _state.encounterLog = [];
  _state.treasurePending = null;
  _npcCounter = 0;
  _notify('session:reset');
}

// ── Utilitaire ────────────────────────────────────────────────────────────────

function _ts() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}

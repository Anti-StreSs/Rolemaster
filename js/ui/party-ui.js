// Party Manager UI — GM dashboard for tracking multiple characters in a session

import {
  initParty, getParty, applyDamage, applyHealing, spendPP, recoverPP,
  addStatus, removeStatus, clickStatus, nextRound, rollAllInitiative, rollInitiative,
  addMember, removeMember, getPartyLog, resetParty, STATUS_LIST, setMemberWeapon3,
  enterCombatMode, exitCombatMode, isCombatMode, getInitiativeOrder,
  getCurrentTurn, nextTurn, addNPCCombatant, removeNPCCombatant, getNPCCombatants,
  getCombatLog, logCombatAction,
  spendAction, adjustActionPoints, isRoundOver, ACTION_COSTS, ACTION_LABELS,
} from '../engine/party-manager.js';
import { getComputedSkills } from '../engine/skill-compute.js';
import { showToast } from './components.js';
import { getLocalSaves } from '../engine/export.js';
import { getClassName, getRealmInfo, getAllClasses } from '../engine/classes.js';
import { loadBestiaryData, filterCreatures, getCreatureById, CATEGORY_LABELS, ATTACK_TYPE_LABELS } from '../engine/bestiary.js';
import { rollOpenEndedD100, resolveFullAttack, getAvailableWeapons } from '../engine/combat.js';
import { formatCriticalText } from '../engine/text-format.js';
import { rollTreasure, getTreasureTypes } from '../engine/merchants.js';
import { subscribeSession, getSession, updateNPC } from '../engine/session-state.js';

// Crit type FR labels (same as session toolbox)
const CRIT_TYPE_FR = {
  slash: 'Taille', krush: 'Contusion', puncture: 'Perforation',
  unbalancing: 'Déséquilibre', heat: 'Chaleur', cold: 'Froid',
  electricity: 'Électricité', grapple: 'Saisie', subdual: 'Maîtrise',
  brawling: 'Bagarre', acid: 'Acide', large_creature: 'Gde Créature',
  super_large_creature: 'T.Gde Créature', tiny_animal: 'Petit Animal',
};
const SEVERITY_FR = { A: 'Critique A', B: 'Critique B', C: 'Critique C', D: 'Critique D', E: 'Critique E (mortel)' };

// Realm → left border color
const REALM_COLORS = {
  channeling: '#3b82f6', essence: '#22c55e', mentalism: '#a855f7',
  arms: '#d97706', none: '#6b7280',
};

// State for NPC picker modal
let npcPickerOpen = false;
let npcPickerFilter = '';

/** Get all developed weapon skills sorted by BO desc. */
function getCharWeapons(char, lang) {
  try {
    return getComputedSkills(char, lang)
      .filter(s => s.isWeapon && s.totalRanks > 0)
      .sort((a, b) => b.total - a.total);
  } catch (e) { return []; }
}

function fmtOB(total) {
  return `BO ${total >= 0 ? '+' : ''}${total}`;
}

function getRealmColor(char) {
  const classes = getAllClasses();
  const cls = classes[char.classIndex];
  if (!cls) return REALM_COLORS.none;
  const info = getRealmInfo(cls);
  const base = info?.baseRealm ?? info?.key ?? 'none';
  return REALM_COLORS[base] || REALM_COLORS.none;
}

function hpColor(pct) {
  if (pct > 0.6) return '#16a34a';
  if (pct > 0.3) return '#eab308';
  return '#dc2626';
}

function renderBar(current, max, type) {
  if (max <= 0) return '';
  const pct = Math.max(0, Math.min(1, current / max));
  const pctPx = Math.round(pct * 100);
  const color = type === 'hp' ? hpColor(pct) : (pct > 0.4 ? '#3b82f6' : '#1e40af');
  const label = type === 'hp' ? 'HP' : 'PP';
  return `
    <div class="pm-bar-row">
      <span class="pm-bar-label">${label}</span>
      <div class="pm-bar-track" title="${current}/${max}">
        <div class="pm-bar-fill" style="width:${pctPx}%;background:${color}"></div>
      </div>
      <span class="pm-bar-value">${current}/${max}</span>
    </div>`;
}

function renderStatusPills(statuses, memberName) {
  if (!statuses.length) return '';
  return statuses.map((s, i) => {
    const rounds = s.roundsRemaining !== null ? ` ·${s.roundsRemaining}r` : '';
    const hint = s.roundsRemaining !== null
      ? (s.roundsRemaining > 1 ? 'Cliquer pour décrémenter' : 'Cliquer pour retirer')
      : 'Cliquer pour retirer';
    return `<span class="pm-status-pill pm-status-${s.color}" data-member="${encodeURIComponent(memberName)}" data-idx="${i}" title="${hint}">${s.label}${rounds}</span>`;
  }).join('');
}

function renderActiveEffects(statuses) {
  const relevant = statuses.filter(s => s.effects && s.effects !== '—');
  if (!relevant.length) return '';
  const lines = relevant.map(s => {
    const rounds = s.roundsRemaining !== null ? ` (${s.roundsRemaining}r)` : '';
    return `<div class="pm-effect-line pm-effect-${s.color}">
      <span class="pm-effect-label">${s.label}${rounds}</span>
      <span class="pm-effect-value">${s.effects}</span>
    </div>`;
  }).join('');
  return `<div class="pm-effects-block">${lines}</div>`;
}

function renderCard(m, lang, isActiveTurn) {
  const char = m.char;
  const classes = getAllClasses();
  const cls = classes[char.classIndex];
  const className = cls ? getClassName(cls, lang) : '?';
  const realmColor = getRealmColor(char);
  const isDead = m.statuses.some(s => s.id === 'dead');
  const enc = encodeURIComponent(char.name);

  function dmgBtns(action, cls2, sign) {
    return [1,3,5,10].map(n =>
      `<button class="pm-btn ${cls2}" data-action="${action}" data-member="${enc}" data-amount="${n}">${sign}${n}</button>`
    ).join('') +
    `<button class="pm-btn ${cls2} pm-btn-custom" data-action="${action}-custom" data-member="${enc}">${sign}?</button>`;
  }

  const ppBar = m.maxPP > 0 ? renderBar(m.currentPP, m.maxPP, 'pp') : '';
  const spendPPBtns = m.maxPP > 0 ? `
    <div class="pm-action-group">
      <span class="pm-action-label">PP−</span>
      <div class="pm-action-row">${dmgBtns('spendpp', 'pm-btn-pp-dmg', '−')}</div>
    </div>
    <div class="pm-action-group">
      <span class="pm-action-label">PP+</span>
      <div class="pm-action-row">${dmgBtns('recoverpp', 'pm-btn-pp-heal', '+')}</div>
    </div>` : '';

  const statusOptions = STATUS_LIST.map(s => `<option value="${s.id}">${s.fr}</option>`).join('');

  // Weapons
  const allWeapons = getCharWeapons(char, lang);
  const top2 = allWeapons.slice(0, 2);
  const slot3Weapon = m.weaponSlot3 !== null ? allWeapons.find(w => w.weaponIndex === m.weaponSlot3) : null;

  const weaponRowsHtml = top2.map(w => `
    <div class="pm-weapon-row">
      <span class="pm-weapon-name">${w.name.replace(/^\s*↳\s*/, '')}</span>
      <span class="pm-weapon-ob">${fmtOB(w.total)}</span>
    </div>`).join('');

  const weapon3Html = slot3Weapon ? `
    <div class="pm-weapon-row pm-weapon-slot3">
      <span class="pm-weapon-name">${slot3Weapon.name.replace(/^\s*↳\s*/, '')}</span>
      <span class="pm-weapon-ob">${fmtOB(slot3Weapon.total)}</span>
    </div>` : '';

  const weapon3SelectHtml = allWeapons.length > 2 ? `
    <select class="pm-weapon-select" data-action="weapon3" data-member="${enc}">
      <option value="">— 3e arme —</option>
      ${allWeapons.map(w => {
        const wName = w.name.replace(/^\s*↳\s*/, '');
        const sel = m.weaponSlot3 === w.weaponIndex ? 'selected' : '';
        return `<option value="${w.weaponIndex}" ${sel}>${wName} (${fmtOB(w.total)})</option>`;
      }).join('')}
    </select>` : '';

  const weaponsSection = allWeapons.length > 0 ? `
    <div class="pm-weapons">
      ${weaponRowsHtml}${weapon3Html}${weapon3SelectHtml}
    </div>` : '';

  const activeBorder = isActiveTurn ? ' combat-active-card' : '';

  const paBtnsHtml = isCombatMode() ? `
<div class="pm-pa-quick-btns" style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-60" title="CaC (−60 PA)">⚔−60</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-70" title="Dist (−70 PA)">🏹−70</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-100" title="Sort (−100 PA)">✦−100</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-50" title="Sort instant (−50 PA)">⚡−50</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-40" title="Mvt (−40 PA)">🦶−40</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-25" title="½Mvt (−25 PA)">½🦶−25</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-30" title="Parade (−30 PA)">🛡−30</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-30" title="Manœuvre (−30 PA)">⚙−30</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="10" title="+10 PA">+10</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-10" title="−10 PA">−10</button>
</div>` : '';

  return `
    <article class="pm-card${isDead ? ' pm-card-dead' : ''}${activeBorder}" style="border-left:4px solid ${realmColor}" data-card-name="${enc}">
      ${isDead ? '<div class="pm-dead-overlay"><span>☠ MORT</span></div>' : ''}
      <header class="pm-card-header">
        <div>
          <div class="pm-card-name">${char.name}${char.isNPC ? ' <span class="pm-npc-badge">PNJ</span>' : ''}</div>
          <div class="pm-card-meta">${className} · Niv.${char.level}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="position:relative;min-width:80px;text-align:center;padding:4px 8px;
                      border-radius:6px;background:rgba(0,0,0,0.12);overflow:hidden;cursor:pointer"
               class="pm-initiative-badge" data-member="${enc}" title="Cliquer = re-roll initiative">
            <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(0, Math.min(100, ((m.actionPoints ?? 0) / Math.max(m.initiative || 1, 1)) * 100))}%;
                        background:${(m.actionPoints ?? 0) > 60 ? '#22c55e' : (m.actionPoints ?? 0) > 20 ? '#eab308' : (m.actionPoints ?? 0) > 0 ? '#f97316' : '#dc2626'};opacity:0.25;transition:width 0.3s"></div>
            <span style="position:relative;font-weight:bold;font-size:0.82rem;color:${(m.actionPoints ?? 0) > 60 ? '#22c55e' : (m.actionPoints ?? 0) > 20 ? '#eab308' : (m.actionPoints ?? 0) > 0 ? '#f97316' : '#dc2626'}">
              ${m.actionPoints ?? 0} PA
            </span>
            <span style="position:relative;font-size:0.6rem;color:#8b6914;margin-left:4px">
              / ${m.initiative ?? 0}
            </span>
          </div>
          <input class="pm-manual-init" type="number" min="1" max="100" placeholder="d100"
            data-member="${enc}"
            style="width:54px;font-size:0.65rem;padding:2px 4px;border:1px solid rgba(139,92,20,0.3);
                   border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08"
            title="Saisir le jet de d100 (la RP est ajoutée automatiquement)">
        </div>
      </header>
      ${paBtnsHtml}
      <div class="pm-bars">
        ${renderBar(m.currentHP, m.maxHP, 'hp')}
        ${ppBar}
        <div class="pm-db-row"><span class="pm-bar-label">BD</span> <strong>${m.db}</strong></div>
      </div>
      ${renderActiveEffects(m.statuses)}
      ${weaponsSection}
      <div class="pm-statuses" data-member="${enc}">
        ${renderStatusPills(m.statuses, char.name)}
      </div>
      <div class="pm-action-group">
        <span class="pm-action-label">HP−</span>
        <div class="pm-action-row">${dmgBtns('dmg', 'pm-btn-dmg', '−')}</div>
      </div>
      <div class="pm-action-group">
        <span class="pm-action-label">HP+</span>
        <div class="pm-action-row">${dmgBtns('heal', 'pm-btn-heal', '+')}</div>
      </div>
      ${spendPPBtns}
      <div class="pm-status-add-row">
        <select class="pm-status-select" data-member="${enc}">${statusOptions}</select>
        <input class="pm-rounds-input" type="number" min="1" max="99" value="3" data-member="${enc}" placeholder="R">
        <button class="pm-btn pm-btn-status" data-action="add-status" data-member="${enc}">+État</button>
      </div>
    </article>`;
}

function renderNPCCard(npc, lang, isActiveTurn) {
  const isDead = npc.currentHP <= 0 || npc.statuses.some(s => s.id === 'dead');
  const enc = encodeURIComponent(npc.name);

  function dmgBtns(action, cls, sign) {
    return [1,3,5,10].map(n =>
      `<button class="pm-btn ${cls}" data-action="${action}" data-member="${enc}" data-amount="${n}">${sign}${n}</button>`
    ).join('') +
    `<button class="pm-btn ${cls} pm-btn-custom" data-action="${action}-custom" data-member="${enc}">${sign}?</button>`;
  }

  const attacksHtml = npc.attacks?.length
    ? npc.attacks.map((atk, atkIdx) => {
        const typeName = ATTACK_TYPE_LABELS[atk.type]?.[lang] || atk.type_en || atk.type;
        return `<div class="pm-weapon-row" style="display:flex;align-items:center;gap:4px">
          <span class="pm-weapon-name">${typeName} (${atk.size})</span>
          <span style="font-size:0.65rem;color:#8b6914">BO</span>
          <input class="npc-edit-atk-ob" data-npc-id="${npc.id}" data-atk-idx="${atkIdx}" type="number"
            value="${atk.ob}" min="0" max="300" style="width:44px;font-size:0.72rem;font-weight:bold;
            padding:1px 3px;border:1px solid rgba(139,92,20,0.25);border-radius:3px;
            background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center"
            title="Bonus Offensif — modifier directement">
          <span style="font-size:0.65rem;color:#9ca3af">· ${atk.percent}%</span>
        </div>`;
      }).join('')
    : `<div class="pm-weapon-row"><span class="pm-weapon-name" style="color:#9ca3af">${npc.attacks_raw || '—'}</span></div>`;

  const statusOptions = STATUS_LIST.map(s => `<option value="${s.id}">${s.fr}</option>`).join('');
  const activeBorder = isActiveTurn ? ' combat-active-card' : '';

  const paBtnsHtml = isCombatMode() ? `
<div class="pm-pa-quick-btns" style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-60" title="CaC (−60 PA)">⚔−60</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-70" title="Dist (−70 PA)">🏹−70</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-100" title="Sort (−100 PA)">✦−100</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-50" title="Sort instant (−50 PA)">⚡−50</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-40" title="Mvt (−40 PA)">🦶−40</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-25" title="½Mvt (−25 PA)">½🦶−25</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-30" title="Parade (−30 PA)">🛡−30</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-30" title="Manœuvre (−30 PA)">⚙−30</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="10" title="+10 PA">+10</button>
  <button class="pm-pa-btn" data-member="${enc}" data-pa-delta="-10" title="−10 PA">−10</button>
</div>` : '';

  return `
    <article class="pm-card pm-card-npc${isDead ? ' pm-card-dead' : ''}${activeBorder}" data-card-name="${enc}" data-npc-id="${npc.id}">
      ${isDead ? '<div class="pm-dead-overlay"><span>☠ MORT</span></div>' : ''}
      <header class="pm-card-header">
        <div>
          <div class="pm-card-name">${npc.name} <span class="pm-npc-badge">PNJ</span></div>
          <div class="pm-card-meta">Niv.${npc.level} · Taille ${npc.size}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <button class="pm-btn" style="padding:2px 6px;font-size:0.85rem;background:rgba(185,28,28,0.25);color:#fca5a5;border:1px solid rgba(185,28,28,0.4);line-height:1" data-action="remove-npc" data-npc-id="${npc.id}" title="Retirer du combat">🗑</button>
          <div style="position:relative;min-width:80px;text-align:center;padding:4px 8px;
                      border-radius:6px;background:rgba(0,0,0,0.12);overflow:hidden;cursor:pointer"
               class="pm-initiative-badge" data-member="${enc}" title="Cliquer = re-roll initiative">
            <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(0, Math.min(100, ((npc.actionPoints ?? 0) / Math.max(npc.initiative || 1, 1)) * 100))}%;
                        background:${(npc.actionPoints ?? 0) > 60 ? '#22c55e' : (npc.actionPoints ?? 0) > 20 ? '#eab308' : (npc.actionPoints ?? 0) > 0 ? '#f97316' : '#dc2626'};opacity:0.25;transition:width 0.3s"></div>
            <span style="position:relative;font-weight:bold;font-size:0.82rem;color:${(npc.actionPoints ?? 0) > 60 ? '#22c55e' : (npc.actionPoints ?? 0) > 20 ? '#eab308' : (npc.actionPoints ?? 0) > 0 ? '#f97316' : '#dc2626'}">
              ${npc.actionPoints ?? 0} PA
            </span>
            <span style="position:relative;font-size:0.6rem;color:#8b6914;margin-left:4px">
              / ${npc.initiative ?? 0}
            </span>
          </div>
          <input class="pm-manual-init" type="number" min="1" max="100" placeholder="d100"
            data-member="${enc}"
            style="width:54px;font-size:0.65rem;padding:2px 4px;border:1px solid rgba(139,92,20,0.3);
                   border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08"
            title="Saisir le jet de d100 (MM ajouté automatiquement)">
        </div>
      </header>
      ${paBtnsHtml}
      <div class="pm-bars">
        ${renderBar(npc.currentHP, npc.maxHP, 'hp')}
        <div class="pm-db-row" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="pm-bar-label">BD</span>
          <input class="npc-edit-field" data-npc-id="${npc.id}" data-field="db" type="number"
            value="${npc.db}" min="-50" max="200" style="width:48px;font-size:0.75rem;font-weight:bold;
            padding:2px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:3px;
            background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center"
            title="BD — modifier directement">
          <span style="color:#8b6914;font-size:0.7rem">TA</span>
          <input class="npc-edit-field" data-npc-id="${npc.id}" data-field="armorType" type="number"
            value="${npc.armorType}" min="1" max="20" style="width:38px;font-size:0.75rem;
            padding:2px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:3px;
            background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center"
            title="Type d'Armure (1-20)">
          <span style="color:#8b6914;font-size:0.7rem">Niv</span>
          <input class="npc-edit-field" data-npc-id="${npc.id}" data-field="level" type="number"
            value="${npc.level}" min="0" max="50" style="width:38px;font-size:0.75rem;
            padding:2px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:3px;
            background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center"
            title="Niveau">
          <span style="color:#8b6914;font-size:0.7rem">HP max</span>
          <input class="npc-edit-field" data-npc-id="${npc.id}" data-field="maxHP" type="number"
            value="${npc.maxHP}" min="1" max="999" style="width:48px;font-size:0.75rem;
            padding:2px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:3px;
            background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center"
            title="Points de vie max (ajuste HP courants proportionnellement)">
          <span style="color:#8b6914;font-size:0.7rem">MM</span>
          <input class="npc-edit-field" data-npc-id="${npc.id}" data-field="base_rate" type="number"
            value="${npc.base_rate ?? 50}" min="0" max="300" style="width:48px;font-size:0.75rem;
            padding:2px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:3px;
            background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center"
            title="Mouvement de base (utilisé comme RP pour l'initiative)">
        </div>
      </div>
      ${renderActiveEffects(npc.statuses)}
      <div class="pm-weapons">${attacksHtml}</div>
      <div class="pm-statuses" data-member="${enc}">
        ${renderStatusPills(npc.statuses, npc.name)}
      </div>
      <div class="pm-action-group">
        <span class="pm-action-label">HP−</span>
        <div class="pm-action-row">${dmgBtns('dmg', 'pm-btn-dmg', '−')}</div>
      </div>
      <div class="pm-action-group">
        <span class="pm-action-label">HP+</span>
        <div class="pm-action-row">${dmgBtns('heal', 'pm-btn-heal', '+')}</div>
      </div>
      <div class="pm-status-add-row">
        <select class="pm-status-select" data-member="${enc}">${statusOptions}</select>
        <input class="pm-rounds-input" type="number" min="1" max="99" value="3" data-member="${enc}" placeholder="R">
        <button class="pm-btn pm-btn-status" data-action="add-status" data-member="${enc}">+État</button>
      </div>
    </article>`;
}

function renderInitiativeTrack(inCombat, currentTurn) {
  if (!inCombat) {
    // Session mode: simple sorted bar
    const sorted = [...getParty().members].sort((a, b) => b.initiative - a.initiative);
    const pills = sorted.map(m =>
      `<span class="pm-init-pill" title="${m.char.name}: ${m.initiative}">${m.char.name} <strong>${m.initiative}</strong></span>`
    ).join('');
    return `<div class="pm-initiative-bar">${pills}</div>`;
  }

  // Combat mode: full initiative track
  const order = getInitiativeOrder();
  const tokens = order.map(e => {
    const isActive = currentTurn && e.name === currentTurn.name;
    const deadCls = e.isDead ? ' is-dead' : '';
    const npcCls = e.isNPC ? ' is-npc' : '';
    const activeCls = isActive ? ' is-active' : '';
    return `<div class="init-token${activeCls}${npcCls}${deadCls}" data-token-name="${encodeURIComponent(e.name)}" title="${e.name}: ${e.actionPoints} PA / init ${e.initiative}">
      <span class="init-value">${e.actionPoints}</span>
      <span class="init-name">${e.name}</span>
    </div>`;
  }).join('');
  return `<div class="combat-initiative-track" id="combat-init-track">${tokens || '<span style="color:#9ca3af;font-size:0.75rem;padding:4px">Aucune initiative — Lancez l\'initiative</span>'}</div>`;
}

// --- Helper: map PJ weapon name to attack table id ---
const _WEAPON_NAME_TO_TABLE = {
  'battle axe': 'atk-rmss5520-battle-axe', 'hache de bataille': 'atk-rmss5520-battle-axe',
  'broadsword': 'atk-rmss5520-broadsword', 'épée large': 'atk-rmss5520-broadsword',
  'dagger': 'atk-rmss5520-dagger', 'dague': 'atk-rmss5520-dagger',
  'falchion': 'atk-rmss5520-falchion', 'fauchon': 'atk-rmss5520-falchion',
  'flail': 'atk-rmss5520-flail', 'fléau': 'atk-rmss5520-flail',
  'handaxe': 'atk-rmss5520-handaxe', 'hachette': 'atk-rmss5520-handaxe',
  'javelin': 'atk-rmss5520-javelin', 'javelot': 'atk-rmss5520-javelin',
  'katana': 'atk-rmss5520-katana',
  'lance': 'atk-rmss5520-lance',
  'long bow': 'atk-rmss5520-long-bow', 'arc long': 'atk-rmss5520-long-bow',
  'composite bow': 'atk-rmss5520-composite-bow', 'arc composite': 'atk-rmss5520-composite-bow',
  'short bow': 'atk-rmss5520-short-bow', 'arc court': 'atk-rmss5520-short-bow',
  'mace': 'atk-rmss5520-mace', 'masse': 'atk-rmss5520-mace',
  'morning star': 'atk-rmss5520-morning-star', 'étoile du matin': 'atk-rmss5520-morning-star',
  'polearm': 'atk-rmss5520-polearm', 'arme d\'hast': 'atk-rmss5520-polearm',
  'quarterstaff': 'atk-rmss5520-quarterstaff', 'bâton': 'atk-rmss5520-quarterstaff',
  'rapier': 'atk-rmss5520-rapier', 'rapière': 'atk-rmss5520-rapier',
  'scimitar': 'atk-rmss5520-scimitar', 'cimeterre': 'atk-rmss5520-scimitar',
  'short sword': 'atk-rmss5520-short-sword', 'épée courte': 'atk-rmss5520-short-sword',
  'sling': 'atk-rmss5520-sling', 'fronde': 'atk-rmss5520-sling',
  'spear': 'atk-rmss5520-spear', 'lance': 'atk-rmss5520-spear',
  'two-handed sword': 'atk-rmss5520-two-handed-sword', 'épée à deux mains': 'atk-rmss5520-two-handed-sword',
  'war hammer': 'atk-rmss5520-war-hammer', 'marteau de guerre': 'atk-rmss5520-war-hammer',
  'whip': 'atk-rmss5520-whip', 'fouet': 'atk-rmss5520-whip',
  'club': 'atk-rmss5520-club', 'gourdin': 'atk-rmss5520-club', 'massue': 'atk-rmss5520-club',
  'heavy crossbow': 'atk-rmss5520-heavy-crossbow', 'arbalète lourde': 'atk-rmss5520-heavy-crossbow',
  'light crossbow': 'atk-rmss5520-light-crossbow', 'arbalète légère': 'atk-rmss5520-light-crossbow',
  'main gauche': 'atk-rmss5520-main-gauche',
  'martial arts strikes': 'atk-rmss5520-martial-arts-strikes',
  'martial arts sweeps': 'atk-rmss5520-martial-arts-sweeps',
};
function _matchWeaponToTable(weaponName) {
  if (!weaponName) return '';
  const norm = weaponName.toLowerCase().trim();
  if (_WEAPON_NAME_TO_TABLE[norm]) return _WEAPON_NAME_TO_TABLE[norm];
  // Fuzzy: find first key that is a substring of the weapon name
  for (const [k, v] of Object.entries(_WEAPON_NAME_TO_TABLE)) {
    if (norm.includes(k) || k.includes(norm)) return v;
  }
  return '';
}

// --- Helper: map creature attack type to proper creature table (with size variants) ---
const _CREATURE_TYPE_TO_TABLE = {
  'Bi': 'atk-creature-bite',    // Bite — size variants: -small/-medium/-large/-huge
  'Cl': 'atk-creature-claw',    // Claw — size variants
  'Ho': 'atk-creature-horn',    // Horn
  'Cr': 'atk-creature-crush',   // Crush
  'Ba': 'atk-creature-crush',   // Bash → same table as Crush
  'Ts': 'atk-creature-horn',    // Tusk → same table as Horn
  'St': 'atk-creature-stinger', // Stinger
  'Gr': 'atk-creature-grapple', // Grapple
  'Pi': 'atk-creature-grapple', // Pincer → same table as Grapple
  'We': '',                      // Weapon → context-dependent
};
// Size codes from bestiary: T=Tiny, S=Small, M=Medium, L=Large, H=Huge, E=Enormous
const _SIZE_SUFFIX = { 'T': '-small', 'S': '-small', 'M': '-medium', 'L': '-large', 'H': '-huge', 'E': '-huge' };
function _creatureAttackToTable(attack, creatureSize) {
  if (!attack) return '';
  const base = _CREATURE_TYPE_TO_TABLE[attack.type];
  if (!base) return '';
  // Bite and Claw have size variants
  if (base === 'atk-creature-bite' || base === 'atk-creature-claw') {
    const suffix = _SIZE_SUFFIX[creatureSize] || '-medium';
    return base + suffix;
  }
  return base;
}

function renderAttackPanel(currentTurn, lang) {
  if (!currentTurn) return '';
  const p = getParty();
  const npcs = getNPCCombatants();

  // Weapon table options
  let weaponOptions = '<option value="">— Table d\'arme —</option>';
  let bestWeaponId = ''; // for auto-select
  try {
    const weapons = getAvailableWeapons();
    weaponOptions += weapons.map(w => {
      const sel = w.id === bestWeaponId ? ' selected' : '';
      return `<option value="${w.id}"${sel}>${lang === 'fr' ? (w.name_fr || w.name_en) : w.name_en}</option>`;
    }).join('');
  } catch (e) { /* attack tables may not be loaded */ }

  // Pre-fill OB from active combatant
  let defaultOB = 0;
  let atkHint = '';
  if (!currentTurn.isNPC) {
    const m = p.members.find(m => m.char.name === currentTurn.name);
    if (m) {
      const weapons = getCharWeapons(m.char, lang);
      if (weapons.length) {
        // Pick weapon with highest OB
        const best = weapons.reduce((a, b) => (b.total > a.total ? b : a), weapons[0]);
        defaultOB = best.total;
        atkHint = best.name.replace(/^\s*↳\s*/, '');
        // Try matching weapon name to attack table id
        bestWeaponId = _matchWeaponToTable(atkHint);
      }
    }
  } else {
    const npc = npcs.find(n => n.name === currentTurn.name);
    if (npc?.attacks?.length) {
      // Pick attack with highest OB
      const best = npc.attacks.reduce((a, b) => (b.ob > a.ob ? b : a), npc.attacks[0]);
      defaultOB = best.ob;
      atkHint = ATTACK_TYPE_LABELS[best.type]?.[lang] || best.type_en || best.type;
      // Map creature attack type to proper creature table (size-aware)
      bestWeaponId = _creatureAttackToTable(best, npc.size);
    }
  }

  // Target options: all combatants except self
  const allTargets = [
    ...p.members.filter(m => !m.statuses.some(s => s.id === 'dead')).map(m => ({
      name: m.char.name, db: m.db, at: m.char.armor?.type ?? 1, isNPC: false,
    })),
    ...npcs.filter(n => n.currentHP > 0 && !n.statuses.some(s => s.id === 'dead')).map(n => ({
      name: n.name, db: n.db, at: n.armorType, isNPC: true,
    })),
  ].filter(t => t.name !== currentTurn.name);

  const targetOptions = allTargets.map(t => `<option value="${encodeURIComponent(t.name)}" data-db="${t.db}" data-at="${t.at}">${t.name}</option>`).join('');
  const firstTarget = allTargets[0];

  return `<div class="combat-attack-panel" id="combat-attack-panel">
    <div style="font-size:0.8rem;font-weight:bold;color:#e8d5a0;margin-bottom:6px">⚔ Tour de ${currentTurn.name}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
      <div>
        <label style="font-size:0.68rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">Table d'arme${atkHint ? ' (sugg: '+atkHint+')' : ''}</label>
        <select id="catk-weapon" style="width:100%;font-size:0.72rem;padding:3px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
          ${weaponOptions}
        </select>
      </div>
      <div>
        <label style="font-size:0.68rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">BO attaquant</label>
        <input id="catk-ob" type="number" value="${defaultOB}" style="width:100%;font-size:0.72rem;padding:3px 6px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
      </div>
      <div>
        <label style="font-size:0.68rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">Cible</label>
        <select id="catk-target" style="width:100%;font-size:0.72rem;padding:3px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
          ${targetOptions || '<option value="">Aucune cible</option>'}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div>
          <label style="font-size:0.68rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">BD cible</label>
          <input id="catk-db" type="number" value="${firstTarget?.db ?? 0}" style="width:100%;font-size:0.72rem;padding:3px 6px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
        </div>
        <div>
          <label style="font-size:0.68rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">TA cible</label>
          <input id="catk-at" type="number" value="${firstTarget?.at ?? 1}" min="1" max="20" style="width:100%;font-size:0.72rem;padding:3px 6px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
        </div>
      </div>
    </div>
    <div style="background:rgba(0,0,0,0.08);border-radius:4px;padding:6px 8px;margin-bottom:6px">
      <div style="font-size:0.65rem;color:#c9a840;font-weight:500;margin-bottom:4px;font-style:italic">
        Jets physiques — laisser vide pour jet auto 🎲
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">
        <div>
          <label style="font-size:0.65rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">Attaque (d100)</label>
          <input id="catk-manual-atk" type="number" min="1" max="200" placeholder="auto"
            style="width:100%;font-size:0.72rem;padding:3px 6px;border:1px solid rgba(139,92,20,0.3);
                   border-radius:4px;background:rgba(255,250,240,0.85);color:#3a1a08">
        </div>
        <div>
          <label style="font-size:0.65rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">Critique (d100)</label>
          <input id="catk-manual-crit" type="number" min="1" max="100" placeholder="auto"
            style="width:100%;font-size:0.72rem;padding:3px 6px;border:1px solid rgba(139,92,20,0.3);
                   border-radius:4px;background:rgba(255,250,240,0.85);color:#3a1a08">
        </div>
        <div>
          <label style="font-size:0.65rem;color:#c9a840;font-weight:600;display:block;margin-bottom:2px">Fumble (d100)</label>
          <input id="catk-manual-fumble" type="number" min="1" max="100" placeholder="auto"
            style="width:100%;font-size:0.72rem;padding:3px 6px;border:1px solid rgba(139,92,20,0.3);
                   border-radius:4px;background:rgba(255,250,240,0.85);color:#3a1a08">
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
      <button class="pm-btn" style="padding:6px 14px;background:rgba(185,28,28,0.3);color:#fca5a5;border:1px solid rgba(185,28,28,0.5)" data-action="resolve-attack">🎲 Résoudre</button>
      <button class="pm-btn" style="padding:6px 14px;background:rgba(107,114,128,0.2);color:#d1d5db;border:1px solid rgba(107,114,128,0.3)" data-action="skip-turn">Passer →</button>
    </div>
    <div id="catk-result" style="margin-top:6px"></div>
  </div>`;
}

function renderCombatLog(log) {
  if (!log.length) return '<p style="color:#9ca3af;font-size:0.75rem">Aucune action de combat.</p>';
  return log.slice().reverse().slice(0, 60).map(e =>
    `<div class="pm-log-entry"><span class="pm-log-time">[R${e.round}]</span> ${e.msg}</div>`
  ).join('');
}

function renderLog(log) {
  if (!log.length) return '<p style="color:#9ca3af;font-size:0.8rem">Aucune action.</p>';
  return log.slice().reverse().slice(0, 50).map(e =>
    `<div class="pm-log-entry"><span class="pm-log-time">${e.time}</span> ${e.msg}</div>`
  ).join('');
}

function renderNPCPicker(lang) {
  const creatures = filterCreatures({ keyword: npcPickerFilter });
  const items = creatures.slice(0, 30).map(c => {
    const icon = CATEGORY_LABELS[c.category]?.icon || '?';
    return `<button class="pm-char-row" style="text-align:left;width:100%" data-action="add-npc-from-bestiary" data-creature-id="${c.id}">
      <span style="font-size:0.9rem">${icon}</span>
      <span class="pm-char-name">${lang === 'fr' ? (c.name_fr || c.name_en) : c.name_en}</span>
      <span class="pm-char-meta">Niv.${c.level} · ${c.size} · BD ${c.db}</span>
    </button>`;
  }).join('');
  const moreCount = Math.max(0, creatures.length - 30);

  return `<div class="combat-npc-picker" id="combat-npc-picker">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:0.85rem;font-weight:bold;color:#3a1a08">Ajouter un PNJ</span>
      <button class="pm-btn" style="background:rgba(100,100,100,0.2);color:#9ca3af" data-action="close-npc-picker">✕</button>
    </div>
    <input id="npc-picker-search" type="search" placeholder="Rechercher…" value="${npcPickerFilter}"
      style="width:100%;margin-bottom:6px;font-size:0.8rem;padding:4px 8px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
    <div class="pm-char-list" style="max-height:40vh">${items || '<p style="color:#9ca3af;font-size:0.8rem;padding:4px">Aucun résultat.</p>'}
    ${moreCount ? `<p style="font-size:0.7rem;color:#9ca3af;padding:4px">…et ${moreCount} autres. Affinez la recherche.</p>` : ''}
    </div>
  </div>`;
}

function renderDashboard(main, app) {
  const p = getParty();
  const lang = app.lang;
  const inCombat = isCombatMode();
  const currentTurn = getCurrentTurn();
  const npcs = getNPCCombatants();
  const roundOverFlag = inCombat && isRoundOver();

  const actionBtns = Object.entries(ACTION_COSTS).map(([id, cost]) => {
    const label = ACTION_LABELS[id]?.[lang] || id;
    return `<button class="rm-action-btn pm-spend-action-btn" data-action="${id}"
      style="font-size:0.7rem;padding:3px 8px;margin:2px"
      title="${label} — coût ${cost} PA">
      ${label} <span style="opacity:0.6">(${cost})</span>
    </button>`;
  }).join('');

  const actionPanelHtml = inCombat ? `
<div style="background:rgba(139,92,20,0.06);border:1px solid rgba(139,92,20,0.15);
            border-radius:8px;padding:8px 10px;margin-bottom:10px">
  <div style="font-size:0.75rem;font-weight:bold;color:#8b6914;margin-bottom:6px">
    ${roundOverFlag
      ? (lang === 'en' ? '⏱ Round over — all combatants at 0 PA' : '⏱ Round terminé — tous les combattants à 0 PA')
      : (currentTurn
        ? (lang === 'en' ? `⚔ ${currentTurn.name}'s turn — ${currentTurn.actionPoints} PA remaining` : `⚔ Tour de ${currentTurn.name} — ${currentTurn.actionPoints} PA restants`)
        : (lang === 'en' ? 'Roll initiative to start' : 'Lancez l\'initiative pour commencer'))}
  </div>
  ${roundOverFlag ? `
  <button class="btn-primary" id="pm-next-round-pa" style="font-size:0.8rem;padding:4px 16px">
    ${lang === 'en' ? '➡ Next Round (re-roll initiative)' : '➡ Round suivant (relancer initiative)'}
  </button>` : `
  <div style="display:flex;flex-wrap:wrap;gap:2px">${actionBtns}</div>
  <div style="display:flex;align-items:center;gap:4px;margin-top:6px">
    <span style="font-size:0.65rem;color:#8b6914">Ajuster PA :</span>
    <input id="pm-ap-adjust" type="number" value="0" style="width:50px;font-size:0.7rem;
      padding:2px 4px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;
      background:rgba(255,250,240,0.85);color:#3a1a08;text-align:center">
    <button class="rm-action-btn" id="pm-ap-adjust-btn" style="font-size:0.65rem;padding:2px 8px">
      Appliquer
    </button>
  </div>
  `}
</div>` : '';

  const pcCards = p.members.map(m => {
    const isActive = inCombat && currentTurn && currentTurn.name === m.char.name;
    return renderCard(m, lang, isActive);
  }).join('');
  const npcCards = npcs.map(npc => {
    const isActive = inCombat && currentTurn && currentTurn.name === npc.name;
    return renderNPCCard(npc, lang, isActive);
  }).join('');

  const combatBtnLabel = inCombat
    ? (lang === 'en' ? 'Exit Combat' : 'Quitter le combat')
    : (lang === 'en' ? 'Combat Mode' : 'Mode Combat');
  const combatBtnCls = inCombat ? 'is-active' : '';

  main.innerHTML = `
    <div class="pm-root">
      <div class="pm-header-row">
        <h2 class="pm-title">⚔ Équipe — Round <span id="pm-round">${p.round}</span></h2>
        <div class="pm-header-btns">
          <button class="combat-mode-btn ${combatBtnCls}" id="pm-toggle-combat">⚔ ${combatBtnLabel}</button>
          <button class="rm-action-btn" id="pm-next-round">Round suivant</button>
          <button class="rm-action-btn is-secondary" id="pm-roll-all-init">${lang === 'en' ? '🎲 Roll Initiative (d100+RP)' : '🎲 Initiative (d100+RP)'}</button>
          ${inCombat ? `<button class="rm-action-btn is-secondary" id="pm-add-npc">+ PNJ</button>` : ''}
          ${inCombat ? `<button class="rm-action-btn" id="pm-show-pa-recap" style="font-size:0.7rem;padding:3px 10px" title="Récapitulatif des coûts PA">📋 Coûts PA</button>` : ''}
          <button class="rm-action-btn is-subtle" id="pm-reset-party">Réinitialiser</button>
          <button class="rm-action-btn is-subtle" id="pm-gen-treasure">🏆 Trésor</button>
        </div>
      </div>
      <div id="pm-treasure-modal" style="display:none;margin-bottom:0.75rem;border:1px solid rgba(139,92,20,0.25);border-radius:6px;padding:10px 12px;background:rgba(255,250,240,0.4)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <label style="font-size:0.75rem;color:#6b5030">Type de trésor :</label>
          <select id="pm-treasure-type-sel" style="padding:3px 6px;font-size:0.78rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,250,240,0.7);color:#3a1a08">
            ${['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map(l=>`<option value="${l}">Type ${l}</option>`).join('')}
          </select>
          <button id="pm-treasure-roll-btn" style="padding:3px 10px;font-size:0.78rem;border:1px solid #c49a20;border-radius:4px;background:rgba(196,154,32,0.15);color:#3a1a08;cursor:pointer;font-family:inherit">Tirer</button>
          <button id="pm-treasure-close" style="padding:3px 8px;font-size:0.78rem;border:1px solid rgba(139,92,20,0.25);border-radius:4px;background:transparent;color:#6b5030;cursor:pointer;font-family:inherit">✕</button>
        </div>
        <div id="pm-treasure-output"></div>
      </div>
      ${renderInitiativeTrack(inCombat, currentTurn)}
      ${actionPanelHtml}
      ${inCombat ? renderAttackPanel(currentTurn, lang) : ''}
      ${inCombat && npcPickerOpen ? renderNPCPicker(lang) : ''}
      <div class="pm-card-grid" id="pm-card-grid">
        ${pcCards}${npcCards}
      </div>
      ${inCombat ? `<details class="pm-log-section">
        <summary>Journal de combat (${getCombatLog().length})</summary>
        <div class="pm-log" id="pm-combat-log">${renderCombatLog(getCombatLog())}</div>
      </details>` : ''}
      <details class="pm-log-section">
        <summary>Journal de session (${p.log.length})</summary>
        <div class="pm-log" id="pm-log">${renderLog(p.log)}</div>
      </details>
    </div>`;

  bindDashboardEvents(main, app);
  _bindAttackPanelTargetAutoFill(main);
}

function _bindAttackPanelTargetAutoFill(main) {
  const targetSel = main.querySelector('#catk-target');
  if (!targetSel) return;
  targetSel.addEventListener('change', () => {
    const opt = targetSel.options[targetSel.selectedIndex];
    if (!opt) return;
    const db = opt.dataset.db;
    const at = opt.dataset.at;
    if (db != null) main.querySelector('#catk-db').value = db;
    if (at != null) main.querySelector('#catk-at').value = at;
  });
}

function _resolveAttack(main, app) {
  const weaponTable = main.querySelector('#catk-weapon').value;
  if (!weaponTable) { showToast('Choisissez une table d\'arme'); return; }
  const ob = parseInt(main.querySelector('#catk-ob').value) || 0;
  const db = parseInt(main.querySelector('#catk-db').value) || 0;
  const armorType = parseInt(main.querySelector('#catk-at').value) || 1;
  const targetEnc = main.querySelector('#catk-target')?.value;
  const targetName = targetEnc ? decodeURIComponent(targetEnc) : null;
  const currentTurn = getCurrentTurn();

  const manualAtk    = parseInt(main.querySelector('#catk-manual-atk')?.value)    || null;
  const manualCrit   = parseInt(main.querySelector('#catk-manual-crit')?.value)   || null;
  const manualFumble = parseInt(main.querySelector('#catk-manual-fumble')?.value) || null;

  let result;
  try {
    result = resolveFullAttack({ weaponTable, ob, db, armorType,
      attackRoll: manualAtk, critRoll: manualCrit, fumbleRoll: manualFumble });
  } catch (e) {
    main.querySelector('#catk-result').innerHTML = `<div style="color:#dc2626;font-size:0.75rem">Erreur: ${e.message}</div>`;
    return;
  }

  const lang = app.lang;
  const hits = result.totalHits ?? 0;
  const isFumble = !!result.fumble;
  const isCrit = !isFumble && !!result.critical;
  const rawSev = result.critical?.severity || '';
  const sev = lang === 'fr' ? (SEVERITY_FR[rawSev] || rawSev) : rawSev;
  const rawType = result.critical?.type || '';
  const critType = lang === 'fr' ? (CRIT_TYPE_FR[rawType] || rawType) : rawType;
  const critText = isCrit ? formatCriticalText(result.critical.rawText, result.critical.parsedEffects, lang) : '';
  const fumbleText = isFumble ? formatCriticalText(result.fumble?.rawText, result.fumble?.parsedEffects, lang) : '';

  // Auto-apply results to target
  if (targetName) {
    if (hits > 0) applyDamage(targetName, hits);
    if (isCrit && result.critical?.parsedEffects) {
      const fx = result.critical.parsedEffects;
      if (fx.stun_rounds > 0) addStatus(targetName, 'stunned', fx.stun_rounds);
      if (fx.bleed_per_round > 0) addStatus(targetName, 'bleeding', null, { dmgPerRound: fx.bleed_per_round });
      if (fx.unconscious) addStatus(targetName, 'unconscious', null);
      if (fx.dead) addStatus(targetName, 'dead', null);
    }
    // Check if HP hit 0
    const p = getParty();
    const npcs = getNPCCombatants();
    const target = p.members.find(m => m.char.name === targetName) || npcs.find(n => n.name === targetName);
    if (target && target.currentHP <= 0) addStatus(targetName, 'dead', null);
  }

  // Log combat action
  const attackerName = currentTurn?.name || '?';
  const roll = result.attack?.breakdown?.roll ?? '?';
  const total = result.attack?.total ?? '?';
  let logMsg = `${attackerName} → ${targetName || '?'}: ${roll}+${ob}=${total} vs TA${armorType} BD${db} → `;
  if (isFumble) logMsg += `FUMBLE! ${fumbleText}`;
  else if (hits > 0 || isCrit) logMsg += `${hits} PdC${isCrit ? ` + ${sev} ${critType}` : ''}`;
  else logMsg += 'Raté';
  logCombatAction({ msg: logMsg });

  // Render result card
  const stateColor = isFumble ? '#a16207' : isCrit ? '#dc2626' : hits > 0 ? '#16a34a' : '#6b7280';
  const stateLbl = isFumble ? 'FUMBLE!' : isCrit ? `${hits} PdC + ${sev} ${critType}` : hits > 0 ? `${hits} PdC` : 'Raté';
  main.querySelector('#catk-result').innerHTML = `<div class="combat-result-card">
    <div style="font-weight:bold;color:${stateColor};margin-bottom:3px">${stateLbl}</div>
    <div style="font-size:0.72rem;color:#c9a840;font-weight:500">Jet ${roll} + BO${ob} = ${total} · BD${db} · TA${armorType}</div>
    ${isCrit ? `<div class="combat-result-crit" style="margin-top:3px;font-size:0.75rem">${sev} ${critType}: ${critText}</div>` : ''}
    ${isFumble ? `<div class="combat-result-fumble" style="margin-top:3px;font-size:0.75rem">${fumbleText}</div>` : ''}
    ${targetName && hits > 0 ? `<div style="font-size:0.7rem;color:#9ca3af;margin-top:2px">→ ${hits} PdC appliqués à ${targetName}</div>` : ''}
  </div>`;

}

function bindDashboardEvents(main, app) {
  // Combat mode toggle
  main.querySelector('#pm-toggle-combat').addEventListener('click', () => {
    if (isCombatMode()) {
      exitCombatMode();
      npcPickerOpen = false;
    } else {
      enterCombatMode();
    }
    renderDashboard(main, app);
  });

  // Next round
  main.querySelector('#pm-next-round').addEventListener('click', () => {
    nextRound();
    renderDashboard(main, app);
  });

  // Roll all initiative
  main.querySelector('#pm-roll-all-init').addEventListener('click', () => {
    rollAllInitiative();
    renderDashboard(main, app);
  });

  // Add NPC button
  main.querySelector('#pm-add-npc')?.addEventListener('click', async () => {
    try { await loadBestiaryData(); } catch (e) { showToast('Bestiaire non disponible'); return; }
    npcPickerOpen = true;
    npcPickerFilter = '';
    renderDashboard(main, app);
    main.querySelector('#npc-picker-search')?.focus();
  });

  // Reset
  main.querySelector('#pm-reset-party').addEventListener('click', () => {
    if (!confirm('Réinitialiser la session ?')) return;
    npcPickerOpen = false;
    resetParty();
    renderPartyManager(app);
  });

  // Treasure generator
  main.querySelector('#pm-gen-treasure')?.addEventListener('click', () => {
    const modal = main.querySelector('#pm-treasure-modal');
    if (modal) modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
  });
  main.querySelector('#pm-treasure-close')?.addEventListener('click', () => {
    const modal = main.querySelector('#pm-treasure-modal');
    if (modal) modal.style.display = 'none';
  });
  main.querySelector('#pm-treasure-roll-btn')?.addEventListener('click', async () => {
    const type = main.querySelector('#pm-treasure-type-sel')?.value || 'C';
    const result = await rollTreasure(type);
    const out = main.querySelector('#pm-treasure-output');
    if (!out) return;
    if (result.error) { out.innerHTML = `<p style="color:#a32d2d;font-size:0.78rem">${result.error}</p>`; return; }
    const wHtml = result.wealth.map(w => `<li style="font-size:0.78rem">${w.label_fr} <small style="color:#9ca3af">(${w.roll})</small></li>`).join('') || '<li style="font-size:0.78rem;color:#8b6914">Aucune richesse</li>';
    const iHtml = result.items.map(i => `<li style="font-size:0.78rem">${i.nb_items}× ${i.category_fr}</li>`).join('') || '<li style="font-size:0.78rem;color:#8b6914">Pas d\'objets</li>';
    out.innerHTML = `<div style="font-size:0.75rem;font-weight:bold;color:#c49a20;margin-bottom:4px">Type ${result.type} — ${result.wealth_label}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div style="font-size:0.65rem;color:#8b6914;text-transform:uppercase;margin-bottom:2px">Richesses</div><ul style="margin:0;padding-left:1.2em;list-style:disc">${wHtml}</ul></div>
        <div><div style="font-size:0.65rem;color:#8b6914;text-transform:uppercase;margin-bottom:2px">Objets</div><ul style="margin:0;padding-left:1.2em;list-style:disc">${iHtml}</ul></div>
      </div>`;
  });

  // NPC picker search
  main.querySelector('#npc-picker-search')?.addEventListener('input', e => {
    npcPickerFilter = e.target.value;
    const picker = main.querySelector('#combat-npc-picker');
    if (picker) {
      const items = filterCreatures({ keyword: npcPickerFilter }).slice(0, 30).map(c => {
        const icon = CATEGORY_LABELS[c.category]?.icon || '?';
        const _lang = app.lang || 'fr';
        return `<button class="pm-char-row" style="text-align:left;width:100%" data-action="add-npc-from-bestiary" data-creature-id="${c.id}">
          <span style="font-size:0.9rem">${icon}</span>
          <span class="pm-char-name">${_lang === 'fr' ? (c.name_fr || c.name_en) : c.name_en}</span>
          <span class="pm-char-meta">Niv.${c.level} · ${c.size} · BD ${c.db}</span>
        </button>`;
      }).join('');
      picker.querySelector('.pm-char-list').innerHTML = items || '<p style="color:#9ca3af;font-size:0.8rem;padding:4px">Aucun résultat.</p>';
    }
  });

  // Initiative track token click → scroll to card
  main.querySelector('#combat-init-track')?.addEventListener('click', e => {
    const token = e.target.closest('[data-token-name]');
    if (!token) return;
    const name = token.dataset.tokenName;
    const card = main.querySelector(`[data-card-name="${name}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Attack panel: resolve + skip
  main.querySelector('[data-action="resolve-attack"]')?.addEventListener('click', () => {
    _resolveAttack(main, app);
  });
  main.querySelector('[data-action="skip-turn"]')?.addEventListener('click', () => {
    nextTurn();
    renderDashboard(main, app);
  });

  // Card grid event delegation
  const grid = main.querySelector('#pm-card-grid');
  grid.addEventListener('change', e => {
    const sel = e.target.closest('[data-action="weapon3"]');
    if (!sel) return;
    const name = decodeURIComponent(sel.dataset.member);
    setMemberWeapon3(name, sel.value);
    renderDashboard(main, app);
  });

  grid.addEventListener('click', e => {
    // NPC remove button
    const removeNpc = e.target.closest('[data-action="remove-npc"]');
    if (removeNpc) {
      removeNPCCombatant(removeNpc.dataset.npcId);
      renderDashboard(main, app);
      return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) {
      // Status pill
      const pill = e.target.closest('.pm-status-pill');
      if (pill) {
        const name = decodeURIComponent(pill.dataset.member);
        const idx = parseInt(pill.dataset.idx, 10);
        clickStatus(name, idx);
        renderDashboard(main, app);
      }
      // Initiative re-roll (auto, RP added automatically)
      const initBadge = e.target.closest('.pm-initiative-badge');
      if (initBadge) {
        const name = decodeURIComponent(initBadge.dataset.member);
        rollInitiative(name);
        renderDashboard(main, app);
      }
      return;
    }

    const action = btn.dataset.action;
    const name = decodeURIComponent(btn.dataset.member ?? '');
    const amount = parseInt(btn.dataset.amount ?? '0', 10);

    switch (action) {
      case 'dmg': applyDamage(name, amount); renderDashboard(main, app); break;
      case 'dmg-custom': {
        const val = parseInt(prompt(`Dégâts pour ${name}:`), 10);
        if (!isNaN(val) && val > 0) { applyDamage(name, val); renderDashboard(main, app); }
        break;
      }
      case 'heal': applyHealing(name, amount); renderDashboard(main, app); break;
      case 'heal-custom': {
        const val = parseInt(prompt(`Soins pour ${name}:`), 10);
        if (!isNaN(val) && val > 0) { applyHealing(name, val); renderDashboard(main, app); }
        break;
      }
      case 'spendpp': spendPP(name, amount); renderDashboard(main, app); break;
      case 'spendpp-custom': {
        const val = parseInt(prompt(`PP dépensés pour ${name}:`), 10);
        if (!isNaN(val) && val > 0) { spendPP(name, val); renderDashboard(main, app); }
        break;
      }
      case 'recoverpp': recoverPP(name, amount); renderDashboard(main, app); break;
      case 'recoverpp-custom': {
        const val = parseInt(prompt(`PP récupérés pour ${name}:`), 10);
        if (!isNaN(val) && val > 0) { recoverPP(name, val); renderDashboard(main, app); }
        break;
      }
      case 'add-status': {
        const card = btn.closest('.pm-card');
        const sel = card.querySelector('.pm-status-select');
        const inp = card.querySelector('.pm-rounds-input');
        const statusId = sel.value;
        const statusDef = STATUS_LIST.find(s => s.id === statusId);
        const rounds = statusDef?.hasRounds ? (parseInt(inp.value, 10) || 3) : null;
        addStatus(name, statusId, rounds);
        renderDashboard(main, app);
        break;
      }
      case 'close-npc-picker': {
        npcPickerOpen = false;
        renderDashboard(main, app);
        break;
      }
      case 'add-npc-from-bestiary': {
        const creatureId = btn.dataset.creatureId;
        const creature = getCreatureById(creatureId);
        if (creature) {
          const npc = addNPCCombatant(creature);
          // Auto-roll initiative for the new NPC
          if (npc) rollInitiative(npc.name);
          npcPickerOpen = false;
          renderDashboard(main, app);
        }
        break;
      }
    }
  });

  // Manual initiative inputs (d100 roll — RP/MM added automatically)
  main.querySelectorAll('.pm-manual-init').forEach(input => {
    input.addEventListener('change', () => {
      const val = parseInt(input.value);
      if (isNaN(val)) return;
      const name = decodeURIComponent(input.dataset.member);
      rollInitiative(name, val);
      input.value = '';
      renderDashboard(main, app);
    });
  });

  // ── Actions PA ──
  main.querySelectorAll('.pm-spend-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const turn = getCurrentTurn();
      if (!turn) return;
      spendAction(turn.name, btn.dataset.action);
      if (isRoundOver()) {
        showToast(lang === 'en' ? 'Round over! All at 0 PA.' : 'Round terminé ! Tous à 0 PA.');
      }
      renderDashboard(main, app);
    });
  });

  main.querySelector('#pm-ap-adjust-btn')?.addEventListener('click', () => {
    const turn = getCurrentTurn();
    if (!turn) return;
    const delta = parseInt(main.querySelector('#pm-ap-adjust')?.value) || 0;
    if (delta === 0) return;
    adjustActionPoints(turn.name, delta);
    renderDashboard(main, app);
  });

  main.querySelector('#pm-next-round-pa')?.addEventListener('click', () => {
    nextRound();
    renderDashboard(main, app);
  });

  // ── Boutons PA rapides par carte ──
  main.querySelectorAll('.pm-pa-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.dataset.member);
      const delta = parseInt(btn.dataset.paDelta);
      if (isNaN(delta)) return;
      adjustActionPoints(name, delta);
      if (isRoundOver()) {
        showToast(lang === 'en' ? 'Round over!' : 'Round terminé !');
      }
      renderDashboard(main, app);
    });
  });

  // ── Récap coûts PA (toggle panel) ──
  main.querySelector('#pm-show-pa-recap')?.addEventListener('click', () => {
    const existing = main.querySelector('#pm-pa-recap-panel');
    if (existing) { existing.remove(); return; }

    const t = (fr, en) => lang === 'en' ? en : fr;
    const rows = Object.entries(ACTION_COSTS).map(([id, cost]) => {
      const label = ACTION_LABELS[id]?.[lang] || id;
      const icon = { melee: '⚔', ranged: '🏹', spell: '✦', spell_instant: '⚡',
        move_full: '🦶', move_half: '½🦶', parry: '🛡', draw_weapon: '🗡',
        stand_up: '⤴', maneuver: '⚙' }[id] || '•';
      return `<tr><td style="padding:2px 6px">${icon}</td><td style="padding:2px 6px">${label}</td><td style="padding:2px 6px;text-align:right;font-weight:bold;color:#dc2626">−${cost}</td></tr>`;
    }).join('');

    const panel = document.createElement('div');
    panel.id = 'pm-pa-recap-panel';
    panel.style.cssText = 'background:rgba(255,250,240,0.97);border:2px solid rgba(139,92,20,0.3);border-radius:8px;padding:10px 12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.15)';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:0.82rem;font-weight:bold;color:#3a1a08">${t('Récapitulatif des coûts PA', 'Action Point Costs')}</div>
        <button id="pm-close-pa-recap" style="background:none;border:none;font-size:1rem;cursor:pointer;color:#8b6914">✕</button>
      </div>
      <div style="font-size:0.7rem;color:#6b5030;margin-bottom:6px">${t('Initiative = 1d100 + RP (PJ) ou MM (PNJ)', 'Initiative = 1d100 + QU (PC) or MM (NPC)')}</div>
      <table style="width:100%;font-size:0.72rem;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid rgba(139,92,20,0.2)">
          <th style="padding:2px 6px;text-align:left"></th>
          <th style="padding:2px 6px;text-align:left">${t('Action', 'Action')}</th>
          <th style="padding:2px 6px;text-align:right">${t('Coût', 'Cost')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    const tracker = main.querySelector('#combat-init-track');
    if (tracker) tracker.parentNode.insertBefore(panel, tracker);
    else main.prepend(panel);

    panel.querySelector('#pm-close-pa-recap').addEventListener('click', () => panel.remove());
  });

  // ── Édition inline des stats NPC ──
  main.querySelectorAll('.npc-edit-field').forEach(input => {
    input.addEventListener('change', () => {
      const npcId = input.dataset.npcId;
      const field = input.dataset.field;
      let val = parseInt(input.value);
      if (isNaN(val)) return;
      if (field === 'armorType') val = Math.max(1, Math.min(20, val));
      if (field === 'maxHP') val = Math.max(1, val);
      if (field === 'level') val = Math.max(0, val);
      if (field === 'base_rate') val = Math.max(0, val);
      updateNPC(npcId, { [field]: val });
      renderDashboard(main, app);
    });
  });

  // ── Édition inline du BO par attaque NPC ──
  main.querySelectorAll('.npc-edit-atk-ob').forEach(input => {
    input.addEventListener('change', () => {
      const npcId = input.dataset.npcId;
      const atkIdx = parseInt(input.dataset.atkIdx);
      const val = parseInt(input.value);
      if (isNaN(val) || isNaN(atkIdx)) return;
      const npc = getSession().npcCombatants.find(n => n.id === npcId);
      if (!npc?.attacks?.[atkIdx]) return;
      npc.attacks[atkIdx].ob = Math.max(0, val);
      renderDashboard(main, app);
    });
  });
}

async function renderSetup(main, app) {
  const saves = await getLocalSaves();
  const names = Object.keys(saves);
  const lang = app.lang;

  if (!names.length) {
    main.innerHTML = `
      <div class="pm-root">
        <h2 class="pm-title">⚔ Gestionnaire d'Équipe</h2>
        <div class="rm-crystal-ball">
          <div class="rm-crystal-ball-container">
            <video muted loop playsinline autoplay
              src="assets/IntroSmall.mp4"
              onerror="this.style.display='none'"></video>
            <div class="rm-crystal-overlay"></div>
          </div>
        </div>
        <p style="color:#9ca3af;margin-top:0.5rem">Aucun personnage sauvegardé. Créez des personnages d'abord.</p>
      </div>`;
    return;
  }

  const classes = getAllClasses();
  const rows = names.map(n => {
    const char = saves[n];
    const cls = classes[char.classIndex];
    const clsName = cls ? getClassName(cls, lang) : '?';
    const npcBadge = char.isNPC ? ' <span class="pm-npc-badge">PNJ</span>' : '';
    return `<label class="pm-char-row">
      <input type="checkbox" class="pm-char-check" value="${encodeURIComponent(n)}">
      <span class="pm-char-name">${char.name}${npcBadge}</span>
      <span class="pm-char-meta">${clsName} · Niv.${char.level}</span>
    </label>`;
  }).join('');

  main.innerHTML = `
    <div class="pm-root">
      <h2 class="pm-title">⚔ Gestionnaire d'Équipe</h2>
      <div class="rm-crystal-ball">
          <div class="rm-crystal-ball-container">
            <video muted loop playsinline autoplay
              src="assets/IntroSmall.mp4"
              onerror="this.style.display='none'"></video>
            <div class="rm-crystal-overlay"></div>
          </div>
        </div>
      <p class="pm-setup-hint">Sélectionnez les personnages pour cette session :</p>
      <div class="pm-char-list">${rows}</div>
      <div class="pm-action-row" style="margin-top:1rem">
        <button class="rm-action-btn" id="pm-start-session">Démarrer la session</button>
        <button class="rm-action-btn is-subtle" id="pm-select-all">Tout sélectionner</button>
      </div>
    </div>`;

  main.querySelector('#pm-select-all').addEventListener('click', () => {
    main.querySelectorAll('.pm-char-check').forEach(cb => { cb.checked = true; });
  });

  main.querySelector('#pm-start-session').addEventListener('click', () => {
    const checked = [...main.querySelectorAll('.pm-char-check:checked')];
    if (!checked.length) { showToast('Sélectionnez au moins un personnage.'); return; }
    const chars = checked.map(cb => saves[decodeURIComponent(cb.value)]).filter(Boolean);
    initParty(chars);
    renderDashboard(main, app);
  });
}

export async function renderPartyManager(app) {
  const main = document.getElementById('app-main');
  const p = getParty();
  if (p.members.length > 0) {
    renderDashboard(main, app);
  } else {
    await renderSetup(main, app);
  }
  // Synchro : re-render si une autre vue modifie l'état de session
  // GUARD: only re-render if we are actually on the party view — otherwise
  // this overwrites Encounters/Bestiary/etc. when npc:added fires.
  if (window._pmUnsub) window._pmUnsub();
  window._pmUnsub = subscribeSession((event) => {
    if (app.currentView !== 'party') return;  // ← critical guard
    if (['npc:added','npc:removed','party:member:updated',
         'combat:state','combat:round','encounter:logged','session:reset'].includes(event)) {
      const container = document.getElementById('app-main');
      if (container) renderDashboard(container, app);
    }
  });
}

export function resetPartyManager() {
  if (window._pmUnsub) { window._pmUnsub(); window._pmUnsub = null; }
  npcPickerOpen = false;
  npcPickerFilter = '';
  // L'état de session (party, npcs, combat) survit dans session-state.js
}

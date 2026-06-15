// compendium-book.js — Book spread + spell focus views for Grimoire UI v2
// Ported from outputs/grimoire_ui_v2_mockup.html (validated 2026-06-15).

import { getListById, getSpellById, getSpellsForList, resolveRealm,
  ensureParams, loadDescriptionsForList, getListTypeLabel } from '../engine/spell-compendium.js';

// Module-level mutable state
let BOOK = { pages: [], list: null };
let currentSpread = 0;
let currentKeyHandler = null;
let currentResizeHandler = null;

const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// ── openBook ──────────────────────────────────────────────────────────────────

export async function openBook(listId, app, container, onBack) {
  // Remove any handlers from a previous book session
  if (currentKeyHandler) { document.removeEventListener('keydown', currentKeyHandler); currentKeyHandler = null; }
  if (currentResizeHandler) { window.removeEventListener('resize', currentResizeHandler); currentResizeHandler = null; }

  const lang = app?.lang || 'fr';
  const L = bookI18n(lang);

  // Show loading skeleton while data fetches
  container.innerHTML = `<div class="book-toolbar"><button class="iconbtn" id="bk-back">← ${esc(L.back)}</button></div>
    <div style="text-align:center;padding:4rem;color:#c9ab78">${lang === 'en' ? 'Loading…' : 'Chargement…'}</div>`;
  container.querySelector('#bk-back').onclick = () => onBack && onBack();

  await ensureParams();

  const list = getListById(listId);
  if (!list) {
    container.innerHTML = `<div class="empty">${lang === 'en' ? 'List not found.' : 'Liste introuvable.'}</div>`;
    return;
  }

  await loadDescriptionsForList(listId);
  const spells = await getSpellsForList(listId);

  BOOK.list = list;
  currentSpread = 0;

  const rc = resolveRealm(list.realm);

  container.innerHTML = `
  <div class="book-toolbar">
    <button class="iconbtn" id="bk-back">← ${esc(L.back)}</button>
    <span class="badge" style="--realm:${rc.border};--realm-text:${rc.text};background:${rc.bg};border-color:${rc.border}">${rc.glyph} ${esc(rc.multi ? list.realm : rc['label_' + lang])}</span>
    <span class="badge type">${esc(getListTypeLabel(list.list_type, lang))}</span>
    ${list.source_book ? `<span style="font-size:.78rem;color:#c9ab78">📖 ${esc(list.source_book)}</span>` : ''}
    <span class="spacer"></span>
    <button class="iconbtn" id="bk-print">🖨 ${esc(L.print)}</button>
  </div>
  <div class="book-stage">
    <div class="book" id="bk-book" style="--realm:${rc.border};--realm-text:${rc.text}">
      <button class="turn prev" id="bk-prev" aria-label="${lang === 'fr' ? 'Page précédente' : 'Previous page'}">‹</button>
      <div class="spread" id="bk-spread"></div>
      <button class="turn next" id="bk-next" aria-label="${lang === 'fr' ? 'Page suivante' : 'Next page'}">›</button>
    </div>
  </div>`;

  BOOK.pages = paginate(spells, lang);
  renderSpread(container, lang, rc);

  const doBack = () => {
    if (currentKeyHandler) { document.removeEventListener('keydown', currentKeyHandler); currentKeyHandler = null; }
    if (currentResizeHandler) { window.removeEventListener('resize', currentResizeHandler); currentResizeHandler = null; }
    onBack && onBack();
  };

  container.querySelector('#bk-back').onclick = doBack;
  container.querySelector('#bk-prev').onclick = () => turn(-1, container, lang, rc);
  container.querySelector('#bk-next').onclick = () => turn(1, container, lang, rc);
  container.querySelector('#bk-print').onclick = () => doPrintList(list, spells, lang, rc);

  // Entry click delegates via #bk-spread (persists through renderSpread innerHTML updates)
  container.querySelector('#bk-spread').addEventListener('click', e => {
    const entry = e.target.closest('.entry[data-spell]');
    if (!entry) return;
    if (currentKeyHandler) { document.removeEventListener('keydown', currentKeyHandler); currentKeyHandler = null; }
    renderSpellFocus(entry.dataset.spell, app, container, (lid) => {
      if (lid) openBook(lid, app, container, onBack);
      else doBack();
    });
  });

  bindSwipe(container.querySelector('#bk-book'), container, lang, rc);

  currentKeyHandler = (e) => {
    if (e.key === 'ArrowRight') turn(1, container, lang, rc);
    else if (e.key === 'ArrowLeft') turn(-1, container, lang, rc);
    else if (e.key === 'Escape') doBack();
  };
  document.addEventListener('keydown', currentKeyHandler);

  currentResizeHandler = debounce(() => {
    if (!container.querySelector('#bk-spread')) return;
    BOOK.pages = paginate(spells, lang);
    const total = isMobile() ? BOOK.pages.length : spreadsCount();
    if (currentSpread >= total) currentSpread = Math.max(0, total - 1);
    renderSpread(container, lang, rc);
  }, 250);
  window.addEventListener('resize', currentResizeHandler);
}

// ── renderSpellFocus (exported — router calls this directly too) ───────────────

export async function renderSpellFocus(spellId, app, container, onBack) {
  if (currentKeyHandler) { document.removeEventListener('keydown', currentKeyHandler); currentKeyHandler = null; }

  const lang = app?.lang || 'fr';

  await ensureParams();

  const s = getSpellById(spellId);
  if (!s) {
    container.innerHTML = `<div class="empty">${lang === 'en' ? 'Spell not found.' : 'Sort introuvable.'}</div>`;
    return;
  }

  const l = getListById(s.list_id);
  if (l) await loadDescriptionsForList(s.list_id);

  const rc = resolveRealm(l ? l.realm : 'Other');
  const L = bookI18n(lang);
  const sn = spellName(s, lang);
  const alt = lang === 'fr' ? (s.name_fr ? s.name_en : '') : (s.name_fr || '');
  const d = spellDesc(s, lang);
  const ln = l ? (lang === 'fr' && l.name_fr ? l.name_fr : (l.name_en_clean || l.name_en)) : (s.list_id || '');

  container.innerHTML = `
  <div class="book-toolbar">
    <button class="iconbtn" id="fc-back">← ${esc(l ? ln : L.back)}</button>
  </div>
  <div class="focus-stage">
    <div class="focus-page parch" style="--realm:${rc.border};--realm-text:${rc.text}">
      <div class="focus-inner">
        <div class="topline"></div>
        <h2 class="focus-name">${esc(sn.n)}${sn.en ? ' <span class="en-badge">EN</span>' : ''}</h2>
        ${alt ? `<p class="focus-alt">${esc(alt)}</p>` : ''}
        <div class="focus-meta">
          <span class="badge" style="--realm:${rc.border};--realm-text:${rc.text};background:${rc.bg};border-color:${rc.border}">${rc.glyph} ${esc(rc.multi ? (l ? l.realm : '') : rc['label_' + lang])}</span>
          ${l ? `<button class="iconbtn" id="fc-tolist">${esc(ln)}</button>` : ''}
        </div>
        <div class="param-grid">
          <div class="param"><div class="l">${L.lvl}</div><div class="v">${s.level}</div></div>
          <div class="param"><div class="l">${L.type2}</div><div class="v">${esc(spellType(s, lang))}</div></div>
          <div class="param"><div class="l">${L.aoe}</div><div class="v">${esc(pick(s, 'aoe', lang))}</div></div>
          <div class="param"><div class="l">${L.dur}</div><div class="v">${esc(pick(s, 'duration', lang))}</div></div>
          <div class="param"><div class="l">${L.rng}</div><div class="v">${esc(pick(s, 'range', lang))}</div></div>
        </div>
        ${d.text
          ? `<div class="focus-desc">${d.enBadge ? '<span class="en-badge">EN</span> ' : ''}${esc(d.text)}</div>`
          : `<p class="focus-missing">${esc(L.nodesc)}</p>`}
        ${l && l.source_book ? `<p class="focus-src">📖 ${esc(l.source_book)}</p>` : ''}
      </div>
    </div>
  </div>`;

  const doBack = (listId) => {
    if (currentKeyHandler) { document.removeEventListener('keydown', currentKeyHandler); currentKeyHandler = null; }
    onBack && onBack(listId);
  };

  container.querySelector('#fc-back').onclick = () => doBack(l ? l.id : null);
  const toList = container.querySelector('#fc-tolist');
  if (toList) toList.onclick = () => doBack(s.list_id);

  currentKeyHandler = (e) => {
    if (e.key === 'Escape') doBack(l ? l.id : null);
  };
  document.addEventListener('keydown', currentKeyHandler);
}

// ── Pagination (measured) ─────────────────────────────────────────────────────

function paginate(spells, lang) {
  const meas = document.createElement('div');
  meas.className = 'measure';
  document.body.appendChild(meas);

  const pageW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--page-w')) || 480;
  const pageH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--page-h')) || 618;
  // Subtract: 30+34 (page-inner top+bottom pad) + 46 (header) + 34 (footer)
  const contentH = pageH - 30 - 34 - 46 - 34;
  meas.style.width = (pageW - 60) + 'px'; // matches page-inner side padding
  meas.style.padding = '0';

  const pages = []; let cur = []; let h = 0;
  for (const s of spells) {
    meas.innerHTML = entryHTML(s, lang, false);
    const node = meas.firstElementChild;
    const eh = node ? node.getBoundingClientRect().height + 14 : 60;
    if (h + eh > contentH && cur.length) { pages.push(cur); cur = []; h = 0; }
    cur.push(s);
    h += eh;
  }
  if (cur.length) pages.push(cur);
  meas.remove();
  return pages.length ? pages : [[]];
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function entryHTML(s, lang, clickable) {
  const rc = resolveRealm(BOOK.list ? BOOK.list.realm : 'Other');
  const sn = spellName(s, lang);
  const d = spellDesc(s, lang);
  const L = bookI18n(lang);
  const params = `<span class="params"><b>${L.type2}</b> ${esc(spellType(s, lang))} · <b>${L.aoe}</b> ${esc(pick(s, 'aoe', lang))} · <b>${L.dur}</b> ${esc(pick(s, 'duration', lang))} · <b>${L.rng}</b> ${esc(pick(s, 'range', lang))}</span>`;
  const desc = d.text
    ? `<div class="desc">${d.enBadge ? '<span class="en-badge">EN</span> ' : ''}${esc(d.text)}</div>`
    : `<div class="nodesc">${L.nodesc}</div>`;
  return `<div class="entry${clickable ? ' clickable' : ''}" data-spell="${s.id}">
    <div class="eh"><span class="lvl" style="background:${rc.border}">${s.level}</span>
      <span class="enm">${esc(sn.n)}${sn.en ? ' <span class="en-badge">EN</span>' : ''}</span></div>
    ${params}${desc}</div>`;
}

function pageHTML(side, pageArr, folio, lang) {
  const l = BOOK.list;
  const rc = resolveRealm(l.realm);
  const nm = listNameObj(l, lang);
  const isFirst = folio === 1;
  const L = bookI18n(lang);
  const head = `<div class="page-head">
    <div class="ttl">${esc(nm.primary)}${isFirst && nm.sub ? `<small>${esc(nm.sub)}</small>` : ''}</div>
    ${isFirst ? `<div class="cov-mini">${l.described || 0}/${l.spell_count || 0} ${L.described}</div>` : ''}
  </div>`;
  const entries = pageArr.map(s => entryHTML(s, lang, true)).join('') || `<div class="nodesc">—</div>`;
  const foot = `<div class="page-foot"><span class="page-folio">${folio}</span></div>`;
  return `<div class="page ${side} parch"><div class="page-inner">${head}<div class="page-body">${entries}</div>${foot}</div></div>`;
}

function spreadsCount() { return Math.max(1, Math.ceil(BOOK.pages.length / 2)); }
function isMobile() { return window.matchMedia('(max-width:900px)').matches; }

function renderSpread(container, lang, rc) {
  const sp = container.querySelector('#bk-spread'); if (!sp) return;
  const i = currentSpread;
  if (isMobile()) {
    sp.innerHTML = pageHTML('left', BOOK.pages[i] || [], i + 1, lang);
  } else {
    const left = BOOK.pages[i * 2] || [];
    const right = BOOK.pages[i * 2 + 1];
    sp.innerHTML = pageHTML('left', left, i * 2 + 1, lang) +
      `<div class="spine"></div>` +
      pageHTML('right', right || [], i * 2 + 2, lang);
  }
  const total = isMobile() ? BOOK.pages.length : spreadsCount();
  const prev = container.querySelector('#bk-prev');
  const next = container.querySelector('#bk-next');
  if (prev) prev.disabled = i <= 0;
  if (next) next.disabled = i >= total - 1;
}

// ── Page turn (CSS 3D flip) ───────────────────────────────────────────────────

function turn(dir, container, lang, rc) {
  const mobile = isMobile();
  const total = mobile ? BOOK.pages.length : spreadsCount();
  const target = currentSpread + dir;
  if (target < 0 || target >= total) return;

  if (reducedMotion || document.body.classList.contains('no-anim') || mobile) {
    currentSpread = target;
    renderSpread(container, lang, rc);
    return;
  }

  const book = container.querySelector('#bk-book');
  const flip = document.createElement('div'); flip.className = 'flip';
  const front = document.createElement('div'); front.className = 'face front';
  const back = document.createElement('div'); back.className = 'face back';

  if (dir > 0) {
    // Right page flips left
    flip.style.right = '18px'; flip.style.transformOrigin = 'left center';
    front.innerHTML = pageHTML('right', BOOK.pages[currentSpread * 2 + 1] || [], currentSpread * 2 + 2, lang);
    back.innerHTML = pageHTML('left', BOOK.pages[target * 2] || [], target * 2 + 1, lang);
    flip.append(front, back); book.appendChild(flip);
    requestAnimationFrame(() => {
      flip.style.transition = 'transform var(--flip-ms, 620ms) ease-in';
      flip.style.transform = 'rotateY(-180deg)';
    });
  } else {
    // Left page flips right
    flip.style.left = '18px'; flip.style.transformOrigin = 'right center';
    front.innerHTML = pageHTML('left', BOOK.pages[currentSpread * 2] || [], currentSpread * 2 + 1, lang);
    back.innerHTML = pageHTML('right', BOOK.pages[target * 2 + 1] || [], target * 2 + 2, lang);
    flip.append(front, back); book.appendChild(flip);
    flip.style.transform = 'rotateY(0deg)';
    requestAnimationFrame(() => {
      flip.style.transition = 'transform var(--flip-ms, 620ms) ease-in';
      flip.style.transform = 'rotateY(180deg)';
    });
  }

  currentSpread = target;
  renderSpread(container, lang, rc);

  const done = () => flip.remove();
  flip.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 800); // safety net
}

function bindSwipe(el, container, lang, rc) {
  if (!el) return;
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) turn(dx < 0 ? 1 : -1, container, lang, rc);
    x0 = null;
  }, { passive: true });
}

// ── Print list as table ───────────────────────────────────────────────────────

function doPrintList(list, spells, lang, rc) {
  const listName = lang === 'fr' && list.name_fr ? list.name_fr : (list.name_en_clean || list.name_en);
  const headers = lang === 'en'
    ? ['Lv', 'Spell', 'AoE', 'Duration', 'Range', 'Type']
    : ['Niv', 'Sort', 'Zone', 'Durée', 'Portée', 'Type'];
  const rows = spells.map(s => {
    const nm = lang === 'fr' && s.name_fr ? s.name_fr : s.name_en;
    return `<tr><td>${s.level}</td><td>${nm}</td>
      <td>${pick(s, 'aoe', lang)}</td><td>${pick(s, 'duration', lang)}</td>
      <td>${pick(s, 'range', lang)}</td><td>${spellType(s, lang)}</td></tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${listName}</title>
<style>@page{size:A4;margin:10mm 8mm}body{font-family:'Palatino','Georgia',serif;font-size:8pt;color:#1a0e04}
h1{font-size:13pt;color:${rc.border};margin:0 0 4pt}p{font-size:7.5pt;color:#6b5030;margin:0 0 8pt}
table{width:100%;border-collapse:collapse;font-size:7.5pt}
th{text-align:left;padding:2pt 4pt;font-weight:bold;border-bottom:1.5pt solid ${rc.border}}
td{padding:1.5pt 4pt;border-bottom:.25pt solid rgba(0,0,0,.1)}
td:first-child{width:16pt;text-align:center;font-weight:bold;color:${rc.border}}</style>
</head><body>
<h1>${listName}</h1>
<p>${list.realm} · ${list.spell_count || spells.length} ${lang === 'en' ? 'spells' : 'sorts'}${list.source_book ? ' · 📖 ' + list.source_book : ''}</p>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function pick(s, f, lang) {
  const fr = s[f + '_fr']; const en = s[f + '_en'] || s[f] || '';
  return lang === 'fr' && fr ? fr : en;
}

function spellType(s, lang) { return pick(s, 'spell_type', lang) || s.spell_type || ''; }

function spellName(s, lang) {
  const fr = s.name_fr;
  if (lang === 'en' || !fr) return { n: s.name_en || s.id, en: !fr && lang === 'fr' };
  return { n: fr, en: false };
}

function spellDesc(s, lang) {
  const fr = s.description_fr; const en = s.description_en || '';
  const text = lang === 'fr' && fr ? fr : en;
  return { text, enBadge: !fr && !!text && lang === 'fr' };
}

function listNameObj(l, lang) {
  const primary = lang === 'fr' && l.name_fr ? l.name_fr : (l.name_en_clean || l.name_en);
  const sub = lang === 'fr' && l.name_fr ? (l.name_en_clean || l.name_en) : '';
  return { primary, sub };
}

// ── i18n ──────────────────────────────────────────────────────────────────────

function bookI18n(lang) {
  const fr = { back: 'Bibliothèque', print: 'Imprimer', lvl: 'Niv.', type2: 'Type', aoe: 'Zone', dur: 'Durée', rng: 'Portée', nodesc: 'Description à venir.', described: 'décrits' };
  const en = { back: 'Library', print: 'Print', lvl: 'Lv.', type2: 'Type', aoe: 'AoE', dur: 'Dur.', rng: 'Range', nodesc: 'Description pending.', described: 'described' };
  return lang === 'en' ? en : fr;
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

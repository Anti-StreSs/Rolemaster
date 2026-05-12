// Reusable UI components

/**
 * Show a toast notification.
 */
export function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `toast ${isError ? 'error' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/**
 * Create a panel with title.
 */
export function panel(title, content) {
  return `
    <div class="panel">
      ${title ? `<div class="panel-title">${title}</div>` : ''}
      ${content}
    </div>
  `;
}

/**
 * Create step indicator dots.
 */
export function stepIndicator(currentStep, totalSteps, stepLabels) {
  const dots = [];
  for (let i = 0; i < totalSteps; i++) {
    const state = i < currentStep ? 'completed' : i === currentStep ? 'current' : '';
    dots.push(`
      <div class="step-dot ${state}" title="${stepLabels[i] || ''}" data-step="${i}">
        ${i + 1}
      </div>
    `);
  }
  return `<div class="step-indicator">${dots.join('')}</div>`;
}

/**
 * Create navigation buttons (prev/next).
 */
export function wizardNav(currentStep, totalSteps, t) {
  return `
    <div class="flex justify-between mt-6 no-print">
      <button class="btn-secondary" id="btn-prev" ${currentStep === 0 ? 'disabled style="visibility:hidden"' : ''}>
        ← ${t.wizard.prev}
      </button>
      <span class="text-gray-500 text-sm self-center">
        ${t.wizard.step} ${currentStep + 1} ${t.wizard.of} ${totalSteps}
      </span>
      ${currentStep < totalSteps - 1
        ? `<button class="btn-primary" id="btn-next">${t.wizard.next} →</button>`
        : `<button class="btn-primary" id="btn-finish">${t.wizard.finish} ✓</button>`
      }
    </div>
  `;
}

/**
 * Render a search input.
 */
export function searchInput(placeholder, id) {
  return `
    <input type="text" id="${id}" placeholder="${placeholder}"
      class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100 mb-4 focus:border-amber-500 focus:outline-none">
  `;
}

/**
 * Show a confirm/cancel modal. Returns Promise<boolean>.
 */
export function confirmModal({ title, body, confirmLabel = 'OK', cancelLabel = 'Annuler' }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'rm-overlay-shell';
    overlay.innerHTML = `
      <div class="rm-modal-panel" style="padding:1.5rem;max-width:28rem">
        <h3 style="font-family:var(--font-title,Cinzel,serif);color:#8b6914;margin-bottom:0.75rem">${title}</h3>
        <p style="font-size:0.9rem;color:#4a3520;margin-bottom:1.25rem">${body}</p>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end">
          <button id="cm-cancel" style="padding:0.4rem 1rem;border:1px solid #946a1e;border-radius:4px;cursor:pointer;background:transparent;color:#4a3520">${cancelLabel}</button>
          <button id="cm-confirm" style="padding:0.4rem 1rem;border:1px solid #946a1e;border-radius:4px;cursor:pointer;background:rgba(139,92,20,0.15);color:#4a3520;font-weight:bold">${confirmLabel}</button>
        </div>
      </div>
    `;
    const close = result => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(result); };
    const onKey = e => { if (e.key === 'Escape') close(false); else if (e.key === 'Enter') close(true); };
    overlay.querySelector('#cm-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#cm-confirm').addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('#cm-confirm').focus();
  });
}

/**
 * Show a numeric input modal with min/max validation. Returns Promise<number|null> (null = cancelled).
 */
export function promptNumberModal({ title, min, max, placeholder = '', defaultValue = '', cancelLabel = 'Annuler', confirmLabel = 'OK' }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'rm-overlay-shell';
    overlay.innerHTML = `
      <div class="rm-modal-panel" style="padding:1.5rem;max-width:24rem">
        <h3 style="font-family:var(--font-title,Cinzel,serif);color:#8b6914;margin-bottom:0.75rem">${title}</h3>
        <input id="pnm-input" type="number" min="${min}" max="${max}"
          inputmode="numeric" pattern="[0-9]*" value="${defaultValue}"
          placeholder="${placeholder}"
          style="width:100%;padding:0.5rem 0.7rem;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,255,255,0.5);color:#2b1806;font:inherit;box-sizing:border-box">
        <p id="pnm-error" style="color:#dc2626;font-size:0.8rem;min-height:1.2em;margin:0.3rem 0 0.7rem"></p>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end">
          <button id="pnm-cancel" style="padding:0.4rem 1rem;border:1px solid #946a1e;border-radius:4px;cursor:pointer;background:transparent;color:#4a3520">${cancelLabel}</button>
          <button id="pnm-ok" style="padding:0.4rem 1rem;border:1px solid #946a1e;border-radius:4px;cursor:pointer;background:rgba(139,92,20,0.15);color:#4a3520;font-weight:bold">${confirmLabel}</button>
        </div>
      </div>
    `;
    const input = overlay.querySelector('#pnm-input');
    const errorEl = overlay.querySelector('#pnm-error');
    const submit = () => {
      const v = parseInt(input.value, 10);
      if (isNaN(v) || v < min || v > max) { errorEl.textContent = `Valeur hors limites (${min}–${max}).`; return; }
      overlay.remove(); document.removeEventListener('keydown', onKey); resolve(v);
    };
    const cancel = () => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(null); };
    const onKey = e => { if (e.key === 'Escape') cancel(); };
    overlay.querySelector('#pnm-cancel').addEventListener('click', cancel);
    overlay.querySelector('#pnm-ok').addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

/**
 * Show a floating skill info panel (SoHK condition modifiers) near `anchorEl`.
 * Calling again while open closes the previous one first (toggle if same skill).
 */
export function showSkillInfoPanel(tableData, lang, anchorEl) {
  const existing = document.getElementById('skill-info-panel');
  if (existing) {
    const wasSame = existing.dataset.forGlobal === anchorEl.dataset.global;
    existing.remove();
    if (wasSame) return;
  }
  if (!tableData) return;

  const t = (fr, en) => lang === 'en' ? en : fr;
  const mods = tableData.special_modifiers || [];

  const modsHtml = mods.length > 0
    ? `<div style="margin-top:5px">
        <div style="font-size:0.62rem;font-weight:bold;color:#8b6914;margin-bottom:2px">${t('Modificateurs de condition', 'Condition Modifiers')}</div>
        <table style="width:100%;border-collapse:collapse">
          ${mods.map(m => `<tr>
            <td style="padding:1px 3px;color:#4a3520;font-size:0.65rem">${m.label_en}</td>
            <td style="padding:1px 3px;text-align:right;font-weight:bold;font-size:0.65rem;color:${m.value > 0 ? '#22c55e' : '#ef4444'}">${m.value > 0 ? '+' : ''}${m.value}</td>
          </tr>`).join('')}
        </table>
      </div>`
    : `<div style="color:#8b8b7a;font-size:0.62rem;font-style:italic;margin-top:4px">${t('Aucun modificateur de condition.', 'No condition modifiers.')}</div>`;

  const statsLine = tableData.sohk_stats
    ? `<div style="font-size:0.61rem;color:#8b8b7a;margin-top:1px">${t('Carac.', 'Stats')}: ${tableData.sohk_stats}</div>`
    : '';

  const panel = document.createElement('div');
  panel.id = 'skill-info-panel';
  panel.dataset.forGlobal = anchorEl.dataset.global;
  panel.style.cssText = 'position:fixed;z-index:9999;background:rgba(255,250,240,0.97);border:2px solid rgba(139,92,20,0.3);border-radius:8px;padding:8px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.25);max-width:240px;min-width:160px';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:0.72rem;font-weight:bold;color:#3a1a08">${tableData.skill_name_fr || tableData.skill_name_en}</div>
        ${tableData.skill_name_fr && tableData.skill_name_en && tableData.skill_name_en !== tableData.skill_name_fr
          ? `<div style="font-size:0.6rem;color:#8b6914">${tableData.skill_name_en}</div>` : ''}
        ${statsLine}
      </div>
      <button id="sip-close" style="background:none;border:none;font-size:0.85rem;cursor:pointer;color:#8b6914;padding:0;margin-left:6px;line-height:1;flex-shrink:0">✕</button>
    </div>
    ${modsHtml}`;

  const rect = anchorEl.getBoundingClientRect();
  panel.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
  panel.style.top = (rect.bottom + 4) + 'px';

  panel.querySelector('#sip-close').addEventListener('click', () => panel.remove());
  const dismiss = e => {
    if (!panel.contains(e.target) && e.target !== anchorEl) {
      panel.remove();
      document.removeEventListener('click', dismiss, true);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss, true), 0);
  document.body.appendChild(panel);
}

/**
 * Render a modifier browser panel inside `container` (prepended).
 * Shows all sections from action_modifiers.json with search + copy-to-clipboard.
 * Calling again while the panel is open closes it (toggle).
 */
export function renderModifierBrowser(sections, container, lang) {
  const t = (fr, en) => lang === 'en' ? en : fr;

  const renderValue = v => {
    if (v === null || v === 'na' || v === '*') return `<span style="color:#8b8b7a">${v ?? '—'}</span>`;
    const n = Number(v);
    if (!isNaN(n)) return `<span style="font-weight:bold;color:${n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#8b8b7a'}">${n > 0 ? '+' : ''}${n}</span>`;
    return `<span>${v}</span>`;
  };

  const renderSection = sec => {
    const label = lang === 'en' ? (sec.label_en || sec.label_fr) : sec.label_fr;
    if (!sec.modifiers?.length) return '';
    const hasValues = sec.modifiers[0]?.values;
    const axisHeader = hasValues && sec.axis
      ? `<tr style="border-bottom:1px solid rgba(139,92,20,0.2)">${sec.axis.map(a => `<th style="padding:1px 4px;font-size:0.6rem;color:#8b6914">${a}</th>`).join('')}</tr>`
      : '';
    const rows = sec.modifiers.map(m => {
      const lbl = lang === 'en' ? (m.label_en || m.label_fr || m.range || m.diff || '') : (m.label_fr || m.range || m.diff || '');
      if (hasValues) {
        const cells = m.values.map(v => `<td style="padding:1px 4px;text-align:center">${renderValue(v)}</td>`).join('');
        return `<tr title="${lbl}"><td style="padding:1px 4px;font-size:0.65rem;color:#4a3520;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lbl}</td>${cells}</tr>`;
      }
      const val = m.value !== undefined ? m.value : '';
      const copyVal = typeof val === 'number' ? (val >= 0 ? '+' + val : String(val)) : String(val);
      return `<tr><td style="padding:1px 4px;font-size:0.65rem;color:#4a3520">${lbl}</td><td style="padding:1px 4px;text-align:right;cursor:pointer" title="${t('Copier','Copy')}" data-copy="${copyVal}">${renderValue(val)}</td></tr>`;
    }).join('');
    return `
      <details style="margin-bottom:4px" open>
        <summary style="cursor:pointer;font-size:0.72rem;font-weight:bold;color:#3a1a08;padding:3px 0;list-style:none">▶ ${label}</summary>
        <table style="width:100%;font-size:0.68rem;border-collapse:collapse;margin-top:2px">
          ${axisHeader ? `<thead>${axisHeader}</thead>` : ''}
          <tbody>${rows}</tbody>
        </table>
      </details>`;
  };

  const sectionsHtml = sections.map(renderSection).filter(Boolean).join('');

  const panel = document.createElement('div');
  panel.id = 'pm-modif-panel';
  panel.style.cssText = 'background:rgba(255,250,240,0.97);border:2px solid rgba(139,92,20,0.3);border-radius:8px;padding:10px 12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.15);max-height:60vh;overflow-y:auto';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;position:sticky;top:0;background:rgba(255,250,240,0.97);z-index:1;padding-bottom:4px;border-bottom:1px solid rgba(139,92,20,0.15)">
      <div style="font-size:0.82rem;font-weight:bold;color:#3a1a08">${t('Modificateurs d\'action', 'Action Modifiers')}</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="pm-modif-search" type="text" placeholder="${t('Rechercher…','Search…')}"
          style="font-size:0.65rem;padding:2px 6px;border:1px solid rgba(139,92,20,0.3);border-radius:4px;background:rgba(255,255,255,0.7);color:#2b1806;width:110px">
        <button id="pm-close-modif" style="background:none;border:none;font-size:1rem;cursor:pointer;color:#8b6914">✕</button>
      </div>
    </div>
    <div id="pm-modif-body">${sectionsHtml}</div>`;

  const tracker = container.querySelector('#combat-init-track');
  if (tracker) tracker.parentNode.insertBefore(panel, tracker);
  else container.prepend(panel);

  panel.querySelector('#pm-close-modif').addEventListener('click', () => panel.remove());

  panel.querySelector('#pm-modif-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    panel.querySelectorAll('tr').forEach(row => {
      row.style.display = q && !row.textContent.toLowerCase().includes(q) ? 'none' : '';
    });
  });

  panel.querySelectorAll('[data-copy]').forEach(el => {
    el.addEventListener('click', () => {
      navigator.clipboard?.writeText(el.dataset.copy).catch(() => {});
      const orig = el.innerHTML;
      el.innerHTML = '✓';
      setTimeout(() => { el.innerHTML = orig; }, 800);
    });
  });
}

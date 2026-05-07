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

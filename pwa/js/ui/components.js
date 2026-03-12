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

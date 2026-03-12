// Settings UI — language, options

import { panel } from './components.js';
import { getLocalSaves, deleteLocalSave } from '../engine/export.js';

export function renderLoadView(app) {
  const t = app.t;
  const saves = getLocalSaves();
  const names = Object.keys(saves);

  let html = '';

  // File upload
  html += panel(t.save.upload, `
    <input type="file" id="file-upload" accept=".json"
      class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-900 file:text-amber-200 hover:file:bg-amber-800">
  `);

  // Local saves
  let savesHtml = '';
  if (names.length === 0) {
    savesHtml = `<p class="text-gray-500">${t.save.noSaves}</p>`;
  } else {
    savesHtml = `<div class="space-y-2">`;
    for (const name of names) {
      const save = saves[name];
      const date = save.updatedAt ? new Date(save.updatedAt).toLocaleDateString() : '?';
      savesHtml += `
        <div class="flex items-center justify-between bg-gray-800 rounded px-4 py-2">
          <div>
            <span class="text-amber-300 font-bold">${name}</span>
            <span class="text-gray-500 text-sm ml-2">${date}</span>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary text-sm py-1 px-3 load-save-btn" data-name="${name}">Charger</button>
            <button class="btn-secondary text-sm py-1 px-3 delete-save-btn" data-name="${name}">✕</button>
          </div>
        </div>
      `;
    }
    savesHtml += `</div>`;
  }
  html += panel(t.save.localStorage, savesHtml);

  return html;
}

export function bindLoadEvents(app) {
  const fileInput = document.getElementById('file-upload');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const { uploadCharacter } = await import('../engine/export.js');
        const character = await uploadCharacter(file);
        app.loadCharacter(character);
      } catch (err) {
        const { showToast } = await import('./components.js');
        showToast('Fichier invalide: ' + err.message, true);
      }
    });
  }

  document.querySelectorAll('.load-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { loadFromLocalStorage } = require_export();
      const character = loadFromLocalStorage(btn.dataset.name);
      if (character) app.loadCharacter(character);
    });
  });

  document.querySelectorAll('.delete-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(app.t.save.confirmDelete)) {
        deleteLocalSave(btn.dataset.name);
        app.navigate('load');
      }
    });
  });
}

// Helper to avoid circular import issues
function require_export() {
  return { loadFromLocalStorage: (name) => {
    const saves = getLocalSaves();
    return saves[name] || null;
  }};
}

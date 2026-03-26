// Export engine — save/load characters as JSON + IndexedDB persistence

import { saveCharacter, loadCharacter, deleteCharacter,
         getAllCharacters, migrateFromLocalStorage } from './db.js';
import { normalizeCharacter } from './character.js';

// Re-export DB functions under legacy names for backwards compatibility
export { saveCharacter as saveToLocalStorage };
export { loadCharacter as loadFromLocalStorage };
export { deleteCharacter as deleteLocalSave };
export { migrateFromLocalStorage };

/**
 * Get all saved characters as {name: character} object.
 * Now async — returns Promise.
 */
export async function getLocalSaves() {
  const chars = await getAllCharacters();
  const obj = {};
  for (const c of chars) obj[c.name || 'unnamed'] = c;
  return obj;
}

/**
 * Serialize a character to JSON string.
 */
export function characterToJSON(character) {
  return JSON.stringify(character, null, 2);
}

/**
 * Parse a character from JSON string.
 */
export function characterFromJSON(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (!data.version || !data.name) {
    throw new Error('Invalid character file');
  }
  return normalizeCharacter(data);
}

/**
 * Download character as JSON file.
 */
export function downloadCharacter(character) {
  const json = characterToJSON(character);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${character.name || 'character'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Upload a character from a file input.
 * @returns {Promise<object>} parsed character
 */
export function uploadCharacter(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(characterFromJSON(reader.result));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

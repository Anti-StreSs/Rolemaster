// Export engine — save/load characters as JSON

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
  return data;
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

/**
 * Save character to localStorage.
 */
export function saveToLocalStorage(character) {
  const saves = getLocalSaves();
  const key = character.name || 'unnamed';
  saves[key] = { ...character, updatedAt: new Date().toISOString() };
  localStorage.setItem('rolemaster_saves', JSON.stringify(saves));
}

/**
 * Get all locally saved characters.
 */
export function getLocalSaves() {
  try {
    return JSON.parse(localStorage.getItem('rolemaster_saves') || '{}');
  } catch {
    return {};
  }
}

/**
 * Delete a local save by name.
 */
export function deleteLocalSave(name) {
  const saves = getLocalSaves();
  delete saves[name];
  localStorage.setItem('rolemaster_saves', JSON.stringify(saves));
}

/**
 * Load a character from localStorage by name.
 */
export function loadFromLocalStorage(name) {
  const saves = getLocalSaves();
  return saves[name] || null;
}

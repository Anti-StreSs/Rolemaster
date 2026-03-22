// Data loader — fetches all game JSON files at startup

const DATA_PATH = './data/';

// Map of data keys to filenames (key: used in code, value: actual filename without .json)
// When key !== value, the file is loaded under the key name
const FILES_MAP = {
  'carac_tables': 'carac_tables',
  'classes': 'classes',
  'competences': 'competences',
  'sorts': 'sorts',
  'couts': 'couts',
  'categories': 'categories',
  'simil': 'simil',
  'options': 'options',
  'monde': 'monde',
  'background_options_merged': 'background_options_v3_patched',
  'skill_similarity_pairs': 'skill_similarity_pairs',
};

let gameData = null;

export async function loadAllData() {
  if (gameData) return gameData;

  const entries = await Promise.all(
    Object.entries(FILES_MAP).map(async ([key, filename]) => {
      const resp = await fetch(`${DATA_PATH}${filename}.json`);
      if (!resp.ok) throw new Error(`Failed to load ${filename}.json: ${resp.status}`);
      return [key, await resp.json()];
    })
  );

  gameData = Object.fromEntries(entries);
  return gameData;
}

export function getData() {
  if (!gameData) throw new Error('Data not loaded yet. Call loadAllData() first.');
  return gameData;
}

// Data loader — fetches all game JSON files at startup

const DATA_PATH = './data/';

const FILES = [
  'carac_tables',
  'classes',
  'competences',
  'sorts',
  'couts',
  'categories',
  'simil',
  'options',
  'monde',
  'background_options_merged',
];

let gameData = null;

export async function loadAllData() {
  if (gameData) return gameData;

  const entries = await Promise.all(
    FILES.map(async name => {
      const resp = await fetch(`${DATA_PATH}${name}.json`);
      if (!resp.ok) throw new Error(`Failed to load ${name}.json: ${resp.status}`);
      return [name, await resp.json()];
    })
  );

  gameData = Object.fromEntries(entries);
  return gameData;
}

export function getData() {
  if (!gameData) throw new Error('Data not loaded yet. Call loadAllData() first.');
  return gameData;
}

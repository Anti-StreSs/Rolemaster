// db.js — IndexedDB persistence for Rolemaster PWA
// No server needed — runs entirely in the browser

const DB_NAME = 'rolemaster_cpr';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('characters')) {
        const store = db.createObjectStore('characters', { keyPath: 'name' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('classIndex', 'classIndex');
        store.createIndex('level', 'level');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('event_log')) {
        const logStore = db.createObjectStore('event_log', {
          keyPath: 'id', autoIncrement: true
        });
        logStore.createIndex('characterName', 'characterName');
        logStore.createIndex('timestamp', 'timestamp');
        logStore.createIndex('type', 'type');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// --- Character CRUD ---

export async function saveCharacter(character) {
  const db = await openDB();
  if (!character.name || !character.name.trim()) {
    const base = character.createdAt || new Date().toISOString();
    character.name = 'Personnage_' + base.slice(0, 16).replace('T', '_').replace(':', 'h');
  }
  character.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('characters', 'readwrite');
    tx.objectStore('characters').put(character);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCharacter(name) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('characters', 'readonly');
    const req = tx.objectStore('characters').get(name);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCharacter(name) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('characters', 'readwrite');
    tx.objectStore('characters').delete(name);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllCharacters() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('characters', 'readonly');
    const req = tx.objectStore('characters').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// --- Migration from localStorage ---

export async function migrateFromLocalStorage() {
  try {
    const raw = localStorage.getItem('rolemaster_saves');
    if (!raw) return 0;
    const saves = JSON.parse(raw);
    const names = Object.keys(saves);
    if (names.length === 0) return 0;

    const db = await openDB();
    const tx = db.transaction('characters', 'readwrite');
    const store = tx.objectStore('characters');
    let migrated = 0;

    for (const name of names) {
      // Check if already migrated
      const existing = await new Promise(r => {
        const req = store.get(name);
        req.onsuccess = () => r(req.result);
        req.onerror = () => r(null);
      });
      if (!existing) {
        store.put({ ...saves[name], name, _migratedFrom: 'localStorage' });
        migrated++;
      }
    }

    await new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    localStorage.setItem('rolemaster_saves_migrated', 'true');
    return migrated;
  } catch (e) {
    console.warn('Migration from localStorage failed:', e);
    return 0;
  }
}

// --- Event Log (used by Batch 22) ---

export async function appendEvent(event) {
  const db = await openDB();
  event.timestamp = event.timestamp || new Date().toISOString();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('event_log', 'readwrite');
    tx.objectStore('event_log').add(event);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEvents(characterName, options = {}) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('event_log', 'readonly');
    const store = tx.objectStore('event_log');
    const index = store.index('characterName');
    const req = index.getAll(characterName);
    req.onsuccess = () => {
      let results = req.result || [];
      if (options.type) results = results.filter(e => e.type === options.type);
      if (options.limit) results = results.slice(-options.limit);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

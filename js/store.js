// Everything Nila remembers lives in this browser's IndexedDB, on this device.
// Nothing is sent anywhere. When IndexedDB is not available (Node tests), an
// in-memory map stands in with the same interface.

const DB_NAME = 'nila';
const DB_VERSION = 1;
const STORES = ['kv', 'events', 'blobs', 'visits', 'records', 'spots'];

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (store) => listeners.forEach((fn) => fn(store));

// ---- backends -------------------------------------------------------------

function memoryBackend() {
  const maps = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  return {
    get: async (s, k) => maps[s].get(k),
    put: async (s, k, v) => void maps[s].set(k, v),
    del: async (s, k) => void maps[s].delete(k),
    all: async (s) => [...maps[s].values()],
    clear: async (s) => maps[s].clear(),
  };
}

function idbBackend() {
  const open = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = async (s, mode, fn) => {
    const db = await open;
    return new Promise((resolve, reject) => {
      const t = db.transaction(s, mode);
      const req = fn(t.objectStore(s));
      t.oncomplete = () => resolve(req?.result);
      t.onerror = () => reject(t.error);
    });
  };
  return {
    get: (s, k) => tx(s, 'readonly', (o) => o.get(k)),
    put: (s, k, v) => tx(s, 'readwrite', (o) => o.put(v, k)),
    del: (s, k) => tx(s, 'readwrite', (o) => o.delete(k)),
    all: (s) => tx(s, 'readonly', (o) => o.getAll()),
    clear: (s) => tx(s, 'readwrite', (o) => o.clear()),
  };
}

let db = typeof indexedDB !== 'undefined' ? idbBackend() : memoryBackend();
/** Tests swap in a fresh in-memory store. */
export function useMemoryStore() {
  db = memoryBackend();
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---- settings -------------------------------------------------------------

export const DEFAULT_SETTINGS = {
  babyName: '',
  birthDate: '',
  night: false,
  demoSpeed: 1,
  lightsOnAlert: true,
  soundOnAlert: true,
};

let settingsCache = null;
export async function settings() {
  if (!settingsCache) settingsCache = { ...DEFAULT_SETTINGS, ...((await db.get('kv', 'settings')) || {}) };
  return settingsCache;
}
export function cachedSettings() {
  return settingsCache || { ...DEFAULT_SETTINGS };
}
export async function saveSettings(patch) {
  settingsCache = { ...(await settings()), ...patch };
  await db.put('kv', 'settings', settingsCache);
  emit('settings');
  return settingsCache;
}
export const babyName = () => cachedSettings().babyName || 'Baby';

// ---- generic keyed values ----------------------------------------------------

export const getValue = (key) => db.get('kv', key);
export async function setValue(key, value) {
  await db.put('kv', key, value);
  emit('kv');
}

// ---- sound records: which sound settles this baby -------------------------------

export async function soundStats() {
  return (await db.get('kv', 'soundStats')) || {};
}
export async function recordSoundResult(soundId, helped) {
  const stats = await soundStats();
  const s = stats[soundId] || { tried: 0, helped: 0, lastUsed: 0 };
  stats[soundId] = { tried: s.tried + 1, helped: s.helped + (helped ? 1 : 0), lastUsed: Date.now() };
  await db.put('kv', 'soundStats', stats);
  emit('kv');
  return stats;
}

/** A sound that seemed to help, until the crying came back. */
export async function reviseSoundResult(soundId) {
  const stats = await soundStats();
  const s = stats[soundId];
  if (s && s.helped > 0) stats[soundId] = { ...s, helped: s.helped - 1 };
  await db.put('kv', 'soundStats', stats);
  emit('kv');
  return stats;
}

// ---- events: cries, quick log, watch alerts ---------------------------------------

export async function addEvent(e) {
  const ev = { id: e.id || newId(), t: e.t || Date.now(), ...e };
  await db.put('events', ev.id, ev);
  emit('events');
  return ev;
}
/** Many at once (the sample week), with one change notice at the end. */
export async function addEvents(list) {
  for (const e of list) {
    const ev = { id: e.id || newId(), t: e.t || Date.now(), ...e };
    await db.put('events', ev.id, ev);
  }
  emit('events');
}
export async function updateEvent(id, patch) {
  const ev = await db.get('events', id);
  if (!ev) return null;
  const next = { ...ev, ...patch };
  await db.put('events', id, next);
  emit('events');
  return next;
}
export async function deleteEvent(id) {
  await db.del('events', id);
  emit('events');
}
export async function events({ from = 0, to = Infinity, type } = {}) {
  const all = await db.all('events');
  return all
    .filter((e) => e.t >= from && e.t < to && (!type || e.type === type))
    .sort((a, b) => b.t - a.t);
}
export async function lastEvent(type, filter = () => true) {
  return (await events({ type })).find(filter) || null;
}

// ---- blobs: voice, kept cry clips, photos ----------------------------------------

export async function putBlob(blob, kind, id = newId()) {
  await db.put('blobs', id, { id, blob, kind, t: Date.now() });
  return id;
}
export async function getBlob(id) {
  return (await db.get('blobs', id))?.blob || null;
}
export const deleteBlob = (id) => db.del('blobs', id);

// ---- collections: visits, records, spots ------------------------------------------

export async function list(store) {
  return (await db.all(store)).sort((a, b) => (b.t || 0) - (a.t || 0));
}
export const getItem = (store, id) => db.get(store, id);
export async function putItem(store, item) {
  const v = { id: item.id || newId(), t: item.t || Date.now(), ...item };
  await db.put(store, v.id, v);
  emit(store);
  return v;
}
export async function deleteItem(store, id) {
  await db.del(store, id);
  emit(store);
}

/** Remove every sample row (Insights → Remove the samples). */
export async function removeSamples() {
  for (const e of await db.all('events')) if (e.sample) await db.del('events', e.id);
  emit('events');
}

export async function clearEverything() {
  for (const s of STORES) await db.clear(s);
  settingsCache = null;
  emit('all');
}

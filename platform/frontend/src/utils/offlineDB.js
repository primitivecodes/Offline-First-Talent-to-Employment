const DB_NAME    = 'alu-offline';
const DB_VERSION = 2;
let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('modules')) {
        const ms = db.createObjectStore('modules', { keyPath: 'id' });
        ms.createIndex('track', 'track', { unique: false });
        ms.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('progressQueue')) {
        const ps = db.createObjectStore('progressQueue', { keyPath: 'moduleId' });
        ps.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains('assessmentQueue')) {
        const as = db.createObjectStore('assessmentQueue', { keyPath: 'assessmentId' });
        as.createIndex('ts', 'ts', { unique: false });
      }
    };
    request.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    request.onerror    = (e) => reject(e.target.error);
  });
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror   = (e) => reject(e.target.error);
  });
}

export async function cacheModule(module) {
  const store = await getStore('modules', 'readwrite');
  return promisify(store.put({ ...module, cachedAt: Date.now() }));
}

export async function getCachedModule(id) {
  const store = await getStore('modules');
  return promisify(store.get(id));
}

export async function getAllCachedModules() {
  const store = await getStore('modules');
  return promisify(store.getAll());
}

export async function deleteCachedModule(id) {
  const store = await getStore('modules', 'readwrite');
  return promisify(store.delete(id));
}

export async function getCachedModuleCount() {
  const store = await getStore('modules');
  return promisify(store.count());
}

export async function queueProgress(moduleId, progressPct, isCompleted) {
  const store = await getStore('progressQueue', 'readwrite');
  const existing = await promisify(store.get(moduleId));
  if (existing && existing.progressPct >= progressPct && !isCompleted) return;
  return promisify(store.put({ moduleId, progressPct, isCompleted: isCompleted || false, ts: Date.now() }));
}

export async function getProgressQueue() {
  const store = await getStore('progressQueue');
  return promisify(store.getAll());
}

export async function removeFromProgressQueue(moduleId) {
  const store = await getStore('progressQueue', 'readwrite');
  return promisify(store.delete(moduleId));
}

export async function clearProgressQueue() {
  const store = await getStore('progressQueue', 'readwrite');
  return promisify(store.clear());
}

export async function queueAssessment(assessmentId, answers, timeTakenMinutes) {
  const store = await getStore('assessmentQueue', 'readwrite');
  return promisify(store.put({ assessmentId, answers, timeTakenMinutes, ts: Date.now() }));
}

export async function getAssessmentQueue() {
  const store = await getStore('assessmentQueue');
  return promisify(store.getAll());
}

export async function removeFromAssessmentQueue(assessmentId) {
  const store = await getStore('assessmentQueue', 'readwrite');
  return promisify(store.delete(assessmentId));
}

export async function isAssessmentQueued(assessmentId) {
  const store = await getStore('assessmentQueue');
  const item = await promisify(store.get(assessmentId));
  return !!item;
}

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return {
      usedMB:  (usage  / 1024 / 1024).toFixed(1),
      totalMB: (quota  / 1024 / 1024).toFixed(0),
      pct:     Math.round((usage / quota) * 100),
    };
  } catch { return null; }
}
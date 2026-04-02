/**
 * offlineDB.js
 *
 * IndexedDB wrapper for the ALU Talent Platform offline-first layer.
 *
 * Why IndexedDB instead of localStorage?
 * localStorage has a 5 MB cap, is synchronous (blocks the UI), and gets
 * wiped by the browser under storage pressure — a real problem on budget
 * Android devices common in Africa. IndexedDB is async, handles 50+ MB,
 * and persists reliably across sessions.
 *
 * Three stores:
 *   modules         — full module content for offline reading
 *   progressQueue   — reading progress that failed to sync while offline
 *   assessmentQueue — exam answers submitted while offline
 */

const DB_NAME    = 'alu-offline';
const DB_VERSION = 2;

// Cached connection — openDB() only opens once then reuses it
let _db = null;

// ─────────────────────────────────────────────────────
// OPEN / UPGRADE
// Called internally before every operation.
// Creates all three stores on first run, or upgrades if
// DB_VERSION increases in a future release.
// ─────────────────────────────────────────────────────
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store 1: full module content
      if (!db.objectStoreNames.contains('modules')) {
        const moduleStore = db.createObjectStore('modules', { keyPath: 'id' });
        moduleStore.createIndex('track',    'track',    { unique: false });
        moduleStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Store 2: offline progress queue
      // keyPath is moduleId so a second scroll on the same module
      // overwrites the first entry instead of creating a duplicate
      if (!db.objectStoreNames.contains('progressQueue')) {
        const progressStore = db.createObjectStore('progressQueue', { keyPath: 'moduleId' });
        progressStore.createIndex('ts', 'ts', { unique: false });
      }

      // Store 3: offline assessment submission queue
      // keyPath is assessmentId — same reason as above
      if (!db.objectStoreNames.contains('assessmentQueue')) {
        const assessmentStore = db.createObjectStore('assessmentQueue', { keyPath: 'assessmentId' });
        assessmentStore.createIndex('ts', 'ts', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// Used only inside this file — not exported
// ─────────────────────────────────────────────────────

// Opens a transaction and returns the object store
async function getStore(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

// Wraps an IDBRequest in a Promise so we can use async/await
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror   = (event) => reject(event.target.error);
  });
}

// ─────────────────────────────────────────────────────
// MODULE CACHE
// ─────────────────────────────────────────────────────

/**
 * Save a full module object into IndexedDB.
 * Called by ModulePage after a successful API response,
 * so the content is available next time even without internet.
 */
export async function cacheModule(module) {
  const store = await getStore('modules', 'readwrite');
  return promisify(store.put({
    ...module,
    cachedAt: Date.now(),
  }));
}

/**
 * Retrieve a single cached module by its id.
 * Called by ModulePage when the API call fails (offline fallback).
 * Returns the module object or undefined if not cached.
 */
export async function getCachedModule(id) {
  const store = await getStore('modules');
  return promisify(store.get(id));
}

/**
 * Get all cached modules.
 * Called by LearnerDashboard when the /api/modules request fails,
 * so the learner still sees their downloaded content.
 */
export async function getAllCachedModules() {
  const store = await getStore('modules');
  return promisify(store.getAll());
}

/**
 * Delete a single cached module by id.
 * Useful for freeing up device storage — can be triggered
 * from a "Remove offline copy" button in a future release.
 */
export async function deleteCachedModule(id) {
  const store = await getStore('modules', 'readwrite');
  return promisify(store.delete(id));
}

/**
 * Count how many modules are currently cached.
 * Used by LearnerDashboard sidebar to show "X modules saved offline".
 */
export async function getCachedModuleCount() {
  const store = await getStore('modules');
  return promisify(store.count());
}

// ─────────────────────────────────────────────────────
// PROGRESS QUEUE
// ─────────────────────────────────────────────────────

/**
 * Add or update a progress item in the queue.
 *
 * The keyPath is moduleId, so calling this twice for the same module
 * updates the existing record rather than creating a duplicate.
 * We also guard against regression — if the server already has a
 * higher percentage, we do not overwrite it with a lower one.
 *
 * Called by ModulePage when the /modules/sync POST fails.
 */
export async function queueProgress(moduleId, progressPct, isCompleted) {
  const store = await getStore('progressQueue', 'readwrite');

  // Check if there is already a queued item for this module
  const existing = await promisify(store.get(moduleId));

  // Only update if the new percentage is higher, or if marking complete
  if (existing && existing.progressPct >= progressPct && !isCompleted) {
    return; // nothing to update
  }

  return promisify(store.put({
    moduleId,
    progressPct,
    isCompleted: isCompleted || false,
    ts: Date.now(),
  }));
}

/**
 * Get all items currently in the progress queue.
 * Called by useServiceWorker when the device comes back online,
 * to flush everything to the server.
 */
export async function getProgressQueue() {
  const store = await getStore('progressQueue');
  return promisify(store.getAll());
}

/**
 * Remove a single item from the progress queue after it has
 * been successfully synced to the server.
 * Called by useServiceWorker inside the flush loop.
 */
export async function removeFromProgressQueue(moduleId) {
  const store = await getStore('progressQueue', 'readwrite');
  return promisify(store.delete(moduleId));
}

/**
 * Clear the entire progress queue.
 * Used as a safety reset — for example after a full re-sync.
 */
export async function clearProgressQueue() {
  const store = await getStore('progressQueue', 'readwrite');
  return promisify(store.clear());
}

// ─────────────────────────────────────────────────────
// ASSESSMENT QUEUE
// ─────────────────────────────────────────────────────

/**
 * Save an assessment submission to the queue.
 * Called by AssessmentPage when the /assessments/:id/submit
 * POST fails because the device is offline.
 * The answers are preserved here and will be auto-submitted
 * when connectivity returns.
 */
export async function queueAssessment(assessmentId, answers, timeTakenMinutes) {
  const store = await getStore('assessmentQueue', 'readwrite');
  return promisify(store.put({
    assessmentId,
    answers,
    timeTakenMinutes,
    ts: Date.now(),
  }));
}

/**
 * Get all queued assessment submissions.
 * Called by useServiceWorker when the device comes back online.
 */
export async function getAssessmentQueue() {
  const store = await getStore('assessmentQueue');
  return promisify(store.getAll());
}

/**
 * Remove a queued assessment after it has been successfully
 * submitted to the server.
 */
export async function removeFromAssessmentQueue(assessmentId) {
  const store = await getStore('assessmentQueue', 'readwrite');
  return promisify(store.delete(assessmentId));
}

/**
 * Check if a specific assessment is currently queued.
 * Useful for showing a "pending

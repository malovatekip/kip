/**
 * KIP Offline Queue
 * Stores daily log entries in IndexedDB when the device is offline.
 * The service worker syncs them when connectivity returns.
 * Can also be triggered manually from the app.
 */

const DB_NAME    = 'kip-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending_logs';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('plan_id',   'plan_id',   { unique: false });
        store.createIndex('queued_at', 'queued_at', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(new Error('Could not open offline queue database.'));
  });
}

/** Add a daily log entry to the offline queue */
export async function queueLog(payload, token) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const entry = {
      payload,
      token,
      queued_at: new Date().toISOString(),
      plan_id:   payload.plan_id,
    };
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add(entry);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

/** Get count of pending items in queue */
export async function getPendingCount() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.count();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror   = () => { db.close(); resolve(0); };
    });
  } catch {
    return 0;
  }
}

/** Get all pending log entries */
export async function getPendingLogs() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror   = () => { db.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

/** Remove a synced entry from the queue */
export async function removePendingLog(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(id);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

/** Manually sync all pending logs (called when user comes back online) */
export async function syncNow(apiClient) {
  const pending = await getPendingLogs();
  if (!pending.length) return { synced: 0, failed: 0 };

  let synced = 0, failed = 0;

  for (const entry of pending) {
    try {
      await apiClient.post('/logs/daily', entry.payload);
      await removePendingLog(entry.id);
      synced++;
    } catch (err) {
      console.error('[KIP Queue] Failed to sync entry', entry.id, err);
      failed++;
    }
  }

  return { synced, failed };
}

/** Request background sync via Service Worker */
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('kip-log-sync');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

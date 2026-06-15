// KIP Service Worker — Offline Mode
// Strategy:
//   App shell & static assets  → Cache First
//   API GET requests            → Network First, fallback to cache
//   API POST (log submissions)  → Queue in IndexedDB when offline, sync when online

const CACHE_NAME     = 'kip-v3';
const API_CACHE_NAME = 'kip-api-v3';
const QUEUE_DB_NAME  = 'kip-offline-queue';
const QUEUE_VERSION  = 1;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache for offline reading (GET only)
const CACHEABLE_API_PATTERNS = [
  '/api/business/my-plans',
  '/api/dashboard',
  '/api/ideas/',
  '/api/learn/courses',
  '/api/learn/my-progress',
  '/api/templates/',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET API calls — they go to the queue handler instead
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http
  if (!url.protocol.startsWith('http')) return;

  // API GET requests — Network First with cache fallback
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = CACHEABLE_API_PATTERNS.some(p => url.pathname.startsWith(p));
    if (shouldCache) {
      event.respondWith(networkFirstWithCache(request, API_CACHE_NAME));
    }
    return;
  }

  // App shell and static assets — Cache First
  event.respondWith(cacheFirstWithNetwork(request));
});

// ── Sync (background sync when back online) ───────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'kip-log-sync') {
    event.waitUntil(syncPendingLogs());
  }
});

// ── Message from client ───────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'SYNC_NOW') {
    syncPendingLogs();
  }
});

// ── Cache strategies ──────────────────────────────────────────────────────────

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ offline: true, message: 'You are offline. Showing cached data.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return index.html for navigation requests (SPA fallback)
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── Offline queue (IndexedDB) ─────────────────────────────────────────────────

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB_NAME, QUEUE_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending_logs')) {
        const store = db.createObjectStore('pending_logs', { keyPath: 'id', autoIncrement: true });
        store.createIndex('plan_id', 'plan_id', { unique: false });
        store.createIndex('queued_at', 'queued_at', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

async function syncPendingLogs() {
  let db;
  try {
    db = await openQueueDB();
  } catch (e) {
    console.error('[KIP SW] Could not open queue DB:', e);
    return;
  }

  const pending = await new Promise((resolve, reject) => {
    const tx    = db.transaction('pending_logs', 'readonly');
    const store = tx.objectStore('pending_logs');
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

  if (!pending.length) return;

  console.log(`[KIP SW] Syncing ${pending.length} pending log(s)…`);

  for (const entry of pending) {
    try {
      const token = entry.token || '';
      const res   = await fetch(`/api/logs/daily`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(entry.payload),
      });

      if (res.ok) {
        // Remove from queue
        await new Promise((resolve, reject) => {
          const tx    = db.transaction('pending_logs', 'readwrite');
          const store = tx.objectStore('pending_logs');
          const req   = store.delete(entry.id);
          req.onsuccess = resolve;
          req.onerror   = reject;
        });
        console.log(`[KIP SW] Synced log id ${entry.id}`);

        // Notify clients
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({
          type: 'LOG_SYNCED',
          entry_id: entry.id,
          plan_id:  entry.payload?.plan_id,
        }));
      }
    } catch (err) {
      console.error(`[KIP SW] Failed to sync log ${entry.id}:`, err);
    }
  }

  db.close();
}

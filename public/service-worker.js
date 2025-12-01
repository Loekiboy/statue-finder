const CACHE_NAME = 'statue-finder-v1';
const OFFLINE_URL = '/';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // If no cache, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Background sync for offline uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-uploads') {
    event.waitUntil(syncUploads());
  }
});

async function syncUploads() {
  // Get pending uploads from IndexedDB
  const db = await openDB();
  const uploads = await getAllPendingUploads(db);
  
  for (const upload of uploads) {
    try {
      // Attempt to upload
      const response = await fetch(upload.url, {
        method: 'POST',
        body: upload.data,
        headers: upload.headers,
      });
      
      if (response.ok) {
        // Remove from pending uploads
        await removePendingUpload(db, upload.id);
      }
    } catch (error) {
      console.error('Sync failed for upload:', upload.id, error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StatueFinderDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllPendingUploads(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_uploads'], 'readonly');
    const store = transaction.objectStore('pending_uploads');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removePendingUpload(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_uploads'], 'readwrite');
    const store = transaction.objectStore('pending_uploads');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

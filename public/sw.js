/**
 * ParkCheck Service Worker — background sync for notifications.
 * Polls data/notifications.json, updates PWA badge, fires local notifications.
 */

const POLL_MS = 5 * 60 * 1000; // 5 minutes
const NOTIF_KEY = 'parkcheck_notif_last_seen';
const PREFS_KEY = 'parkcheck_notification_prefs';

let pollTimer = null;

// ── IDB helpers (simple key-value) ──────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('parkcheck-sw', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = () => resolve();
  });
}

// ── Quiet hours check ───────────────────────────────────────────
function isQuietHours(prefs) {
  if (!prefs) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const { quietStart = '23:00', quietEnd = '08:00' } = prefs;
  if (quietStart <= quietEnd) return hhmm >= quietStart && hhmm < quietEnd;
  return hhmm >= quietStart || hhmm < quietEnd;
}

// ── Poll & notify ───────────────────────────────────────────────
async function checkNotifications() {
  try {
    const res = await fetch('data/notifications.json', { cache: 'no-store' });
    if (!res.ok) return;
    const all = await res.json();
    if (!all.length) return;

    const lastSeenId = await idbGet(NOTIF_KEY);
    if (all[0].id === lastSeenId) return; // no new

    // Find new notifications
    const newItems = [];
    for (const n of all) {
      if (n.id === lastSeenId) break;
      newItems.push(n);
    }
    if (!newItems.length) return;

    await idbSet(NOTIF_KEY, all[0].id);

    // Update badge
    if (self.navigator && self.navigator.setAppBadge) {
      try { await self.navigator.setAppBadge(newItems.length); } catch { /* unsupported */ }
    }

    // Get prefs from IDB (synced by client)
    const prefs = await idbGet(PREFS_KEY);
    if (isQuietHours(prefs)) return;

    // Show local notifications
    for (const n of newItems.slice(0, 3)) {
      const icons = { dried: '☀️', rain: '🌧️', hazard: '⚠️', reopened: '✅', report: '📋', crowd: '👥' };
      try {
        await self.registration.showNotification(
          `${icons[n.type] || '🔔'} ${n.title}`,
          {
            body: n.message,
            icon: 'icons/icon-192.png',
            tag: `parkcheck-${n.id}`,
            data: { park: n.park },
          }
        );
      } catch { /* permission not granted */ }
    }
  } catch { /* network error, skip */ }
}

// ── Event handlers ──────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
  pollTimer = setInterval(checkNotifications, POLL_MS);
  checkNotifications();
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const park = e.notification.data?.park;
  const url = park ? `/park/${park}` : '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length) {
        clients[0].navigate(url);
        return clients[0].focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// Listen for messages from client to sync prefs
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SYNC_PREFS') {
    idbSet(PREFS_KEY, e.data.prefs);
  }
  if (e.data?.type === 'SYNC_LAST_SEEN') {
    idbSet(NOTIF_KEY, e.data.id);
  }
});

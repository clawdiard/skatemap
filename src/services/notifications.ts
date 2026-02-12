/**
 * Lightweight notification service — fetches notifications.json,
 * filters to favorited parks, and tracks read state in localStorage.
 */

const BASE = import.meta.env.BASE_URL || '/';
const READ_KEY = 'parkcheck_notif_read';
const LAST_SEEN_KEY = 'parkcheck_notif_last_seen';

export interface ParkNotification {
  id: string;
  type: 'dried' | 'rain' | 'hazard' | 'reopened' | 'report' | 'crowd';
  park: string; // slug — empty string for broadcast (e.g. rain)
  title: string;
  message: string;
  timestamp: string; // ISO-8601
}

// ── Fetch ────────────────────────────────────────────────────────
export async function fetchNotifications(): Promise<ParkNotification[]> {
  try {
    const res = await fetch(`${BASE}data/notifications.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as ParkNotification[];
  } catch {
    return [];
  }
}

// ── Favorites helper (mirrors existing localStorage key) ────────
function getFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem('parkcheck_favorites');
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

// ── Prefs helper ────────────────────────────────────────────────
interface NotifPrefs {
  notify_dried: boolean;
  notify_rain: boolean;
  notify_hazards: boolean;
  notify_reopened: boolean;
  notify_reports: boolean;
  notify_crowds: boolean;
  quietStart: string;
  quietEnd: string;
}

function getPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem('parkcheck_notification_prefs');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    notify_dried: true,
    notify_rain: true,
    notify_hazards: true,
    notify_reopened: true,
    notify_reports: false,
    notify_crowds: false,
    quietStart: '23:00',
    quietEnd: '08:00',
  };
}

const TYPE_TO_PREF: Record<string, keyof NotifPrefs> = {
  dried: 'notify_dried',
  rain: 'notify_rain',
  hazard: 'notify_hazards',
  reopened: 'notify_reopened',
  report: 'notify_reports',
  crowd: 'notify_crowds',
};

// ── Filter ──────────────────────────────────────────────────────
export function filterNotifications(all: ParkNotification[]): ParkNotification[] {
  const favs = getFavorites();
  const prefs = getPrefs();
  return all.filter((n) => {
    // Check pref toggle
    const prefKey = TYPE_TO_PREF[n.type];
    if (prefKey && !prefs[prefKey]) return false;
    // Broadcast types (rain) have empty park — always show if pref enabled
    if (n.park && !favs.has(n.park)) return false;
    return true;
  });
}

// ── Read tracking ───────────────────────────────────────────────
function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveReadSet(s: Set<string>): void {
  // Keep only last 200 IDs
  const arr = [...s].slice(-200);
  localStorage.setItem(READ_KEY, JSON.stringify(arr));
}

export function isRead(id: string): boolean {
  return getReadSet().has(id);
}

export function markRead(id: string): void {
  const s = getReadSet();
  s.add(id);
  saveReadSet(s);
}

export function markAllRead(ids: string[]): void {
  const s = getReadSet();
  ids.forEach((id) => s.add(id));
  saveReadSet(s);
}

export function getUnreadCount(notifications: ParkNotification[]): number {
  const read = getReadSet();
  return notifications.filter((n) => !read.has(n.id)).length;
}

// ── Last-seen ID (for service worker) ───────────────────────────
export function getLastSeenId(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function setLastSeenId(id: string): void {
  localStorage.setItem(LAST_SEEN_KEY, id);
}

// ── Quiet hours check ───────────────────────────────────────────
export function isQuietHours(): boolean {
  const prefs = getPrefs();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const { quietStart, quietEnd } = prefs;
  if (quietStart <= quietEnd) {
    return hhmm >= quietStart && hhmm < quietEnd;
  }
  // Wraps midnight
  return hhmm >= quietStart || hhmm < quietEnd;
}

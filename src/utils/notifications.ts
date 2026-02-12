/**
 * Lightweight notification utilities — no external push services.
 * Uses localStorage for prefs and the Notification API for local alerts.
 */

const PREFS_KEY = 'parkcheck_notification_prefs';
const VISIT_KEY = 'parkcheck_visit_count';

export interface NotificationPrefs {
  notify_dried: boolean;
  notify_rain: boolean;
  notify_hazards: boolean;
  notify_reopened: boolean;
  notify_reports: boolean;
  notify_crowds: boolean;
  quietStart: string;
  quietEnd: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  notify_dried: true,
  notify_rain: true,
  notify_hazards: true,
  notify_reopened: true,
  notify_reports: false,
  notify_crowds: false,
  quietStart: '23:00',
  quietEnd: '08:00',
};

export function initNotifications(): void {
  // Register service worker for background sync + badge
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL || '/'}sw.js`
    ).catch(() => { /* silent */ });
  }
}

export function getVisitCount(): number {
  return parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
}

export function incrementVisitCount(): number {
  const count = getVisitCount() + 1;
  localStorage.setItem(VISIT_KEY, String(count));
  return count;
}

export function shouldShowPrompt(): boolean {
  return getVisitCount() >= 2;
}

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch { /* use defaults */ }
  return { ...DEFAULT_PREFS };
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

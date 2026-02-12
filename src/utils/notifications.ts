import OneSignal from 'react-onesignal';

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

let initialized = false;

export async function initOneSignal(): Promise<void> {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || initialized) return;

  await OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: import.meta.env.DEV,
  });
  initialized = true;

  // Sync saved prefs as tags
  const prefs = getNotificationPrefs();
  syncPrefsToTags(prefs);
}

export function getVisitCount(): number {
  const count = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
  return count;
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
  try {
    await OneSignal.Slidedown.promptPush();
    return true;
  } catch {
    return false;
  }
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
  syncPrefsToTags(prefs);
}

function syncPrefsToTags(prefs: NotificationPrefs): void {
  if (!initialized) return;
  OneSignal.User.addTags({
    notify_dried: String(prefs.notify_dried),
    notify_rain: String(prefs.notify_rain),
    notify_hazards: String(prefs.notify_hazards),
    notify_reopened: String(prefs.notify_reopened),
    notify_reports: String(prefs.notify_reports),
    notify_crowds: String(prefs.notify_crowds),
    quiet_start: prefs.quietStart,
    quiet_end: prefs.quietEnd,
  });
}

export function syncFavoriteTag(slug: string, isFavorite: boolean): void {
  if (!initialized) return;
  const key = `fav_${slug}`;
  if (isFavorite) {
    OneSignal.User.addTag(key, 'true');
  } else {
    OneSignal.User.removeTag(key);
  }
}

/**
 * Notification helper for GitHub Actions.
 * Writes to data/notifications.json (local notification feed).
 * No external push service required.
 *
 * Supports both CJS (require) and ESM (import) via dual export.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const NOTIF_FILE = resolve(__dirname, '..', 'data', 'notifications.json');
const MAX_NOTIFICATIONS = 50;

function readNotifications() {
  try {
    return JSON.parse(readFileSync(NOTIF_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeNotifications(arr) {
  mkdirSync(dirname(NOTIF_FILE), { recursive: true });
  writeFileSync(NOTIF_FILE, JSON.stringify(arr, null, 2) + '\n');
}

/**
 * Append a notification to the feed.
 * Newest first, capped at MAX_NOTIFICATIONS.
 */
export function appendNotification({ type, park, title, message }) {
  const all = readNotifications();
  const id = `notif-${Date.now()}-${park || 'broadcast'}-${type}`;
  const entry = {
    id,
    type,
    park: park || '',
    title,
    message,
    timestamp: new Date().toISOString(),
  };
  all.unshift(entry);
  writeNotifications(all.slice(0, MAX_NOTIFICATIONS));
  console.log(`Notification appended: "${title}"`);
  return entry;
}

/**
 * Send a park-specific notification.
 */
export async function notifyParkSubscribers({ type, parkSlug, title, message }) {
  return appendNotification({ type, park: parkSlug, title, message });
}

/**
 * Send a broadcast notification by preference type.
 */
export async function notifyByPreference({ type, title, message }) {
  return appendNotification({ type, park: '', title, message });
}

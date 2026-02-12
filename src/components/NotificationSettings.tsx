import { useState } from 'react';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  requestPermission,
  shouldShowPrompt,
  type NotificationPrefs,
} from '../utils/notifications';

const TOGGLE_OPTIONS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: 'notify_dried', label: 'Park Dried Out', desc: "When a favorited park's dry-out estimate is reached or reported dry" },
  { key: 'notify_rain', label: 'Rain Incoming', desc: 'When rain is forecast within 2 hours' },
  { key: 'notify_hazards', label: 'Hazard Reported', desc: 'When a hazard is reported at a favorited park' },
  { key: 'notify_reopened', label: 'Park Reopened', desc: 'When a closed park is reported open' },
  { key: 'notify_reports', label: 'New Condition Report', desc: 'Any new report at a favorited park' },
  { key: 'notify_crowds', label: 'Low Crowd Window', desc: 'When crowd drops to 1-2 at a favorited park' },
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);
  const [permGranted, setPermGranted] = useState(
    typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false
  );
  const showPrompt = shouldShowPrompt();

  const update = (key: keyof NotificationPrefs, value: boolean | string) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const handleEnable = async () => {
    const ok = await requestPermission();
    setPermGranted(ok);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-100">🔔 Notification Settings</h2>

      {!permGranted && showPrompt && (
        <div className="mb-6 p-4 rounded-lg bg-cyan-900/30 border border-cyan-800">
          <p className="text-sm text-cyan-300 mb-3">
            Get notified when your parks dry out after rain 🌤️
          </p>
          <button
            onClick={handleEnable}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Enable Notifications
          </button>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {TOGGLE_OPTIONS.map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs[key] as boolean}
              onChange={(e) => update(key, e.target.checked)}
              className="mt-1 accent-green-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-200">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-2">🌙 Quiet Hours</h3>
        <p className="text-xs text-gray-500 mb-2">Local notifications are suppressed during quiet hours.</p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="time"
            value={prefs.quietStart}
            onChange={(e) => update('quietStart', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200"
          />
          <span>to</span>
          <input
            type="time"
            value={prefs.quietEnd}
            onChange={(e) => update('quietEnd', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200"
          />
        </div>
      </div>
    </div>
  );
}

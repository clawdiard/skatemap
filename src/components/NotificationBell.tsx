import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchNotifications,
  filterNotifications,
  getUnreadCount,
  isRead,
  markRead,
  markAllRead,
  setLastSeenId,
  type ParkNotification,
} from '../services/notifications';

const POLL_MS = 60_000; // re-fetch every 60 s

const TYPE_ICON: Record<string, string> = {
  dried: '☀️',
  rain: '🌧️',
  hazard: '⚠️',
  reopened: '✅',
  report: '📋',
  crowd: '👥',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<ParkNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [, rerender] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const all = await fetchNotifications();
    const filtered = filterNotifications(all);
    setNotifications(filtered);
    if (filtered.length > 0) {
      setLastSeenId(filtered[0].id);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = getUnreadCount(notifications);

  const handleMarkAll = () => {
    markAllRead(notifications.map((n) => n.id));
    rerender((c) => c + 1);
  };

  const handleTap = (n: ParkNotification) => {
    markRead(n.id);
    rerender((c) => c + 1);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-200">Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-cyan-400 hover:text-cyan-300">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No notifications yet</div>
          ) : (
            notifications.slice(0, 30).map((n) => {
              const read = isRead(n.id);
              const link = n.park ? `/park/${n.park}` : '/';
              return (
                <Link
                  key={n.id}
                  to={link}
                  onClick={() => handleTap(n)}
                  className={`flex gap-2 px-3 py-2.5 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${
                    read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-200 truncate">{n.title}</div>
                    <div className="text-xs text-gray-500 truncate">{n.message}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{timeAgo(n.timestamp)}</div>
                  </div>
                  {!read && <span className="w-2 h-2 mt-2 flex-shrink-0 bg-cyan-400 rounded-full" />}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 60_000; // 60 seconds
const BASE = import.meta.env.BASE_URL || '/';

interface LastUpdated {
  conditions: string | null;
  weather: string | null;
  users: string | null;
}

type InvalidateCallback = (changed: (keyof LastUpdated)[]) => void;

export function useDataPolling(onInvalidate: InvalidateCallback) {
  const cached = useRef<LastUpdated>({ conditions: null, weather: null, users: null });

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}data/meta/last-updated.json`, { cache: 'no-store' });
      if (!res.ok) return;
      const timestamps: LastUpdated = await res.json();

      const changed: (keyof LastUpdated)[] = [];
      for (const key of ['conditions', 'weather', 'users'] as const) {
        if (timestamps[key] && timestamps[key] !== cached.current[key]) {
          changed.push(key);
        }
      }

      cached.current = timestamps;
      if (changed.length > 0) onInvalidate(changed);
    } catch {
      // Network error — silently ignore (offline)
    }
  }, [onInvalidate]);

  useEffect(() => {
    poll(); // Initial fetch
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  return cached;
}

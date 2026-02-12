/**
 * Reputation service — client-side fetching and computation for
 * the anonymous nickname-based reputation system.
 */

const BASE = import.meta.env.BASE_URL;

export interface ReporterStats {
  nickname: string;
  reportCount: number;
  reputation: number;
  level: ReputationLevel;
  accuracy?: number;
  parks?: string[];
  streak?: number;
  joinedAt: string;
  lastReportAt: string | null;
  source: string;
}

export interface StatsFile {
  updatedAt: string | null;
  reporters: ReporterStats[];
}

export type ReputationLevel = 'rookie' | 'regular' | 'local' | 'legend';

export interface LevelInfo {
  level: ReputationLevel;
  label: string;
  badge: string;
  minPoints: number;
}

export const LEVELS: LevelInfo[] = [
  { level: 'legend', label: 'Legend', badge: '👑', minPoints: 2000 },
  { level: 'local', label: 'Local', badge: '⭐', minPoints: 500 },
  { level: 'regular', label: 'Regular', badge: '🔥', minPoints: 100 },
  { level: 'rookie', label: 'Rookie', badge: '🛹', minPoints: 0 },
];

export function getLevelInfo(reputation: number): LevelInfo {
  return LEVELS.find(l => reputation >= l.minPoints) ?? LEVELS[LEVELS.length - 1];
}

export function getProgressToNext(reputation: number): { current: LevelInfo; next: LevelInfo | null; pct: number } {
  const current = getLevelInfo(reputation);
  const idx = LEVELS.indexOf(current);
  const next = idx > 0 ? LEVELS[idx - 1] : null;
  if (!next) return { current, next: null, pct: 100 };
  const range = next.minPoints - current.minPoints;
  const progress = reputation - current.minPoints;
  return { current, next, pct: Math.min(100, Math.round((progress / range) * 100)) };
}

let _cache: { data: StatsFile; ts: number } | null = null;
const CACHE_MS = 60_000;

export async function fetchStats(): Promise<StatsFile> {
  if (_cache && Date.now() - _cache.ts < CACHE_MS) return _cache.data;
  const res = await fetch(`${BASE}data/users/stats.json`);
  if (!res.ok) throw new Error('Failed to load stats');
  const data: StatsFile = await res.json();
  _cache = { data, ts: Date.now() };
  return data;
}

export function getLeaderboard(
  reporters: ReporterStats[],
  period: 'all' | 'month' | 'week' = 'all',
): ReporterStats[] {
  let filtered = [...reporters];

  if (period !== 'all') {
    const now = Date.now();
    const cutoff = period === 'week' ? 7 * 86400000 : 30 * 86400000;
    filtered = filtered.filter(
      r => r.lastReportAt && now - new Date(r.lastReportAt).getTime() < cutoff,
    );
  }

  return filtered.sort((a, b) => b.reputation - a.reputation);
}

export function getReporter(reporters: ReporterStats[], nickname: string): ReporterStats | undefined {
  return reporters.find(r => r.nickname === nickname);
}

// localStorage nickname persistence
const NICK_KEY = 'parkcheck_nickname';

export function getSavedNickname(): string {
  try {
    return localStorage.getItem(NICK_KEY) || '';
  } catch {
    return '';
  }
}

export function saveNickname(nick: string): void {
  try {
    localStorage.setItem(NICK_KEY, nick);
  } catch {
    // ignore
  }
}

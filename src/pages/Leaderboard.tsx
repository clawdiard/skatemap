import { useState, useEffect } from 'react';
import { SEOHead } from '../components/SEOHead';
import { ReputationBadge } from '../components/ReputationBadge';
import { fetchStats, getLeaderboard, getSavedNickname, type ReporterStats } from '../services/reputation';
import { Link } from 'react-router-dom';

type Period = 'all' | 'month' | 'week';

const PERIOD_LABELS: Record<Period, string> = { all: 'All Time', month: 'This Month', week: 'This Week' };

export default function Leaderboard() {
  const [reporters, setReporters] = useState<ReporterStats[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const myNick = getSavedNickname();

  useEffect(() => {
    fetchStats()
      .then(s => setReporters(s.reporters))
      .catch(() => setReporters([]))
      .finally(() => setLoading(false));
  }, []);

  const ranked = getLeaderboard(reporters, period);

  return (
    <>
      <SEOHead title="Leaderboard — ParkCheck" description="Top reporters keeping NYC skateparks updated" />
      <div className="max-w-xl mx-auto px-4 py-6 min-h-screen bg-gray-950 text-gray-100">
        <h1 className="text-2xl font-bold mb-4">🏆 Leaderboard</h1>

        {/* Period tabs */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                p === period
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading…</p>
        ) : ranked.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No reporters yet</p>
            <p className="text-gray-600 text-sm mt-2">Submit a condition report to appear on the leaderboard!</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {ranked.map((r, i) => {
              const isMe = myNick && r.nickname === myNick;
              return (
                <li key={r.nickname}>
                  <Link
                    to={`/reporter/${encodeURIComponent(r.nickname)}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition hover:bg-gray-800/80 ${
                      isMe
                        ? 'border-indigo-500/50 bg-indigo-950/30'
                        : 'border-gray-800 bg-gray-900/50'
                    }`}
                  >
                    {/* Rank */}
                    <span className="w-8 text-center font-bold text-lg text-gray-500">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold truncate ${isMe ? 'text-indigo-300' : 'text-gray-100'}`}>
                          {r.nickname}
                        </span>
                        <ReputationBadge reputation={r.reputation} size="sm" showPoints />
                        {isMe && (
                          <span className="text-[10px] uppercase tracking-wide bg-indigo-600/40 text-indigo-300 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.reportCount} report{r.reportCount !== 1 ? 's' : ''}
                        {r.accuracy != null && ` · ${Math.round(r.accuracy * 100)}% accuracy`}
                      </div>
                    </div>

                    {/* Points */}
                    <span className="text-lg font-bold text-gray-400">{r.reputation}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

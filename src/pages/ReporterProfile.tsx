import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';
import { ReputationBadge } from '../components/ReputationBadge';
import {
  fetchStats,
  getReporter,
  getProgressToNext,
  getSavedNickname,
  type ReporterStats,
} from '../services/reputation';

export default function ReporterProfile() {
  const { nickname } = useParams<{ nickname: string }>();
  const [reporter, setReporter] = useState<ReporterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const myNick = getSavedNickname();
  const isMe = myNick && nickname === myNick;

  useEffect(() => {
    if (!nickname) return;
    fetchStats()
      .then(s => {
        const r = getReporter(s.reporters, nickname);
        if (r) setReporter(r);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [nickname]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-500">Loading…</div>;
  }

  if (notFound || !reporter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-500 gap-4">
        <p className="text-lg">Reporter not found</p>
        <Link to="/leaderboard" className="text-indigo-400 hover:underline text-sm">
          ← Back to Leaderboard
        </Link>
      </div>
    );
  }

  const progress = getProgressToNext(reporter.reputation);

  return (
    <>
      <SEOHead title={`${reporter.nickname} — ParkCheck`} description={`Reporter profile for ${reporter.nickname}`} />
      <div className="max-w-lg mx-auto px-4 py-6 min-h-screen bg-gray-950 text-gray-100">
        {/* Header */}
        <Link to="/leaderboard" className="text-indigo-400 hover:underline text-sm mb-4 inline-block">
          ← Leaderboard
        </Link>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
              {progress.current.badge}
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {reporter.nickname}
                {isMe && (
                  <span className="text-[10px] uppercase tracking-wide bg-indigo-600/40 text-indigo-300 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
              </h1>
              <ReputationBadge reputation={reporter.reputation} showPoints />
            </div>
          </div>

          {/* Progress bar */}
          {progress.next && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{progress.current.badge} {progress.current.label}</span>
                <span>{progress.next.badge} {progress.next.label}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {progress.next.minPoints - reporter.reputation} pts to {progress.next.label}
              </p>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="Reports" value={reporter.reportCount.toString()} />
          <StatCard
            label="Accuracy"
            value={reporter.accuracy != null ? `${Math.round(reporter.accuracy * 100)}%` : '—'}
          />
          <StatCard
            label="Parks Covered"
            value={reporter.parks?.length?.toString() ?? '—'}
          />
          <StatCard
            label="Streak"
            value={reporter.streak != null ? `${reporter.streak} days` : '—'}
          />
        </div>

        {/* Dates */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>Joined: {reporter.joinedAt ? new Date(reporter.joinedAt).toLocaleDateString() : '—'}</p>
          <p>Last report: {reporter.lastReportAt ? new Date(reporter.lastReportAt).toLocaleDateString() : '—'}</p>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

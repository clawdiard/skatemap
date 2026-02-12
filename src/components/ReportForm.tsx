import { useState, type FormEvent } from 'react';
import { getToken, getUser, isSignedIn } from '../utils/auth';
import type { ParkInfo } from '../types/park';
import AuthButton from './AuthButton';

interface ReportFormProps {
  park: ParkInfo;
  onClose: () => void;
  onSubmitted: (report: SubmittedReport) => void;
}

export interface SubmittedReport {
  status: string;
  surface: number | null;
  crowd: number | null;
  hazards: string[];
  notes: string;
  timestamp: string;
  reporter: string;
}

const STATUS_OPTIONS = [
  { value: 'dry', emoji: '✅', label: 'Dry', color: 'bg-green-800/60 border-green-600 text-green-300' },
  { value: 'partially_wet', emoji: '🟡', label: 'Partial', color: 'bg-yellow-800/60 border-yellow-600 text-yellow-300' },
  { value: 'wet', emoji: '❌', label: 'Wet', color: 'bg-red-800/60 border-red-600 text-red-300' },
  { value: 'closed', emoji: '🚫', label: 'Closed', color: 'bg-gray-700/60 border-gray-500 text-gray-300' },
];

const SURFACE_ICONS = ['😫', '😕', '😐', '🙂', '😎'];
const SURFACE_LABELS = ['Terrible', 'Poor', 'Average', 'Good', 'Perfect'];
const CROWD_ICONS = ['👤', '👥', '👥', '🏟️', '🏟️'];
const CROWD_LABELS = ['Empty', 'Light', 'Moderate', 'Packed', 'Sardines'];

const STATUS_DISPLAY: Record<string, string> = {
  dry: '✅ Dry',
  partially_wet: '🟡 Partially Wet',
  wet: '❌ Wet',
  closed: '🚫 Closed',
};

export default function ReportForm({ park, onClose, onSubmitted }: ReportFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [surface, setSurface] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<number | null>(null);
  const [hazardFeatures, setHazardFeatures] = useState<Set<string>>(new Set());
  const [hazardNotes, setHazardNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleHazard = (featureId: string) => {
    const next = new Set(hazardFeatures);
    if (next.has(featureId)) {
      next.delete(featureId);
      const nn = { ...hazardNotes };
      delete nn[featureId];
      setHazardNotes(nn);
    } else {
      next.add(featureId);
    }
    setHazardFeatures(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!status) return;
    if (!isSignedIn()) return;

    setSubmitting(true);
    setError(null);

    const token = getToken()!;
    const user = getUser();
    const slug = park.slug;

    const hazardLines = Array.from(hazardFeatures).map(fId => {
      const feat = park.features.find(f => f.id === fId);
      const note = hazardNotes[fId];
      return `- ${feat?.type ?? fId}${note ? `: ${note}` : ''}`;
    });

    const body = [
      `## Condition Report`,
      ``,
      `**Park:** ${park.name} (\`${slug}\`)`,
      `**Status:** ${STATUS_DISPLAY[status] ?? status}`,
      surface != null ? `**Surface Quality:** ${surface}/5` : null,
      crowd != null ? `**Crowd Level:** ${crowd}/5` : null,
      hazardLines.length > 0 ? `**Hazards:**\n${hazardLines.join('\n')}` : `**Hazards:** None`,
      notes ? `**Notes:** ${notes}` : null,
      `**Timestamp:** ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const res = await fetch('https://api.github.com/repos/clawdiard/skatemap/issues', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `🛹 ${park.name} — ${STATUS_DISPLAY[status] ?? status}`,
          body,
          labels: ['condition-report', `park:${slug}`],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `GitHub API error ${res.status}`);
      }

      const report: SubmittedReport = {
        status,
        surface,
        crowd,
        hazards: Array.from(hazardFeatures),
        notes,
        timestamp: new Date().toISOString(),
        reporter: user?.login ?? 'anonymous',
      };

      setSubmitted(true);
      onSubmitted(report);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl p-6 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold">Report Submitted!</h2>
          <p className="text-gray-400 text-sm">Thanks for keeping the community updated.</p>
          <button onClick={onClose} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-3 rounded-lg font-semibold">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Report: {park.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {!isSignedIn() ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Sign in with GitHub to submit reports.</p>
            <AuthButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Conditions *</label>
              <div className="grid grid-cols-4 gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`flex flex-col items-center py-3 rounded-lg border text-sm transition ${
                      status === s.value ? s.color : 'bg-gray-800/50 border-gray-700 text-gray-400'
                    }`}
                  >
                    <span className="text-2xl mb-1">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Surface Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Surface Quality</label>
              <div className="flex gap-2">
                {SURFACE_ICONS.map((icon, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSurface(i + 1)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-sm transition ${
                      surface === i + 1
                        ? 'bg-cyan-800/50 border-cyan-500 text-cyan-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400'
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-[10px] mt-0.5">{SURFACE_LABELS[i]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Crowd Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Crowd Level</label>
              <div className="flex gap-2">
                {CROWD_ICONS.map((icon, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCrowd(i + 1)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-sm transition ${
                      crowd === i + 1
                        ? 'bg-purple-800/50 border-purple-500 text-purple-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400'
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-[10px] mt-0.5">{CROWD_LABELS[i]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hazards */}
            {park.features.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hazards</label>
                <div className="flex flex-wrap gap-2">
                  {park.features.map(f => (
                    <div key={f.id}>
                      <button
                        type="button"
                        onClick={() => toggleHazard(f.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition ${
                          hazardFeatures.has(f.id)
                            ? 'bg-red-800/50 border-red-500 text-red-300'
                            : 'bg-gray-800/50 border-gray-700 text-gray-400'
                        }`}
                      >
                        ⚠️ {f.type.replace('_', ' ')}
                      </button>
                      {hazardFeatures.has(f.id) && (
                        <input
                          type="text"
                          placeholder="Describe issue..."
                          value={hazardNotes[f.id] || ''}
                          onChange={e => setHazardNotes({ ...hazardNotes, [f.id]: e.target.value })}
                          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Waxed ledges, swept flat, anything notable..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none h-20"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={!status || submitting}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition"
            >
              {submitting ? 'Submitting...' : 'Submit Report 🛹'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

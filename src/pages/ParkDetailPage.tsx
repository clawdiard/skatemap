import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ParkInfo, ParkConditions } from '../types/park';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { timeAgo, featureIcons, statusBadge, boroughColors } from '../utils/park';

const BASE = import.meta.env.BASE_URL;

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

export default function ParkDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [info, setInfo] = useState<ParkInfo | null>(null);
  const [conditions, setConditions] = useState<ParkConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fav, setFav] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setFav(isFavorite(slug));

    Promise.all([
      fetch(`${BASE}data/parks/${slug}/info.json`).then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      }),
      fetch(`${BASE}data/parks/${slug}/conditions.json`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([infoData, condData]) => {
        setInfo(infoData);
        setConditions(condData);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  const handleFav = () => {
    if (!slug) return;
    const newState = toggleFavorite(slug);
    setFav(newState);
  };

  if (notFound) {
    return (
      <div className="dark min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-gray-400 mb-6">Park not found</p>
        <Link to="/" className="text-cyan-400 hover:underline">← Back to map</Link>
      </div>
    );
  }

  if (loading || !info) {
    return (
      <div className="dark min-h-screen bg-gray-950 text-gray-100 p-4 space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const status = statusBadge(conditions?.compositeStatus ?? null);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.location.lat},${info.location.lng}`;
  const boroughCls = boroughColors[info.borough] || boroughColors.manhattan;

  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100 pb-24">
      {/* Hero */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        {info.heroImage ? (
          <img src={info.heroImage} alt={info.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
        <Link
          to="/"
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/80 text-gray-300 hover:text-white backdrop-blur"
        >
          ←
        </Link>
        <button
          onClick={handleFav}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/80 backdrop-blur text-xl"
          aria-label="Toggle favorite"
        >
          {fav ? '⭐' : '☆'}
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{info.name}</h1>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${boroughCls}`}>
            {info.borough.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-4">
        {/* Status Section */}
        <section className="space-y-3">
          <div className={`inline-block px-4 py-2 rounded-lg text-lg font-semibold border ${status.classes}`}>
            {status.label}
          </div>
          {conditions && conditions.reportCount > 0 && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              {conditions.avgSurface != null && (
                <span>🛹 Surface: {conditions.avgSurface.toFixed(1)}/5</span>
              )}
              {conditions.avgCrowd != null && (
                <span>👥 Crowd: {'●'.repeat(Math.round(conditions.avgCrowd))}{'○'.repeat(5 - Math.round(conditions.avgCrowd))}</span>
              )}
              {conditions.activeHazards.length > 0 && (
                <span>⚠️ {conditions.activeHazards.length} hazard{conditions.activeHazards.length > 1 ? 's' : ''}</span>
              )}
            </div>
          )}
          {conditions?.lastReportAt && (
            <p className="text-sm text-gray-500">
              Last reported: {timeAgo(conditions.lastReportAt)}
              {conditions.reports[0]?.reporter ? ` by @${conditions.reports[0].reporter}` : ''}
            </p>
          )}
          {conditions?.dryEstimate && (
            <p className="text-sm text-cyan-400">
              Estimated dry by {new Date(conditions.dryEstimate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </section>

        {/* Weather Widget Placeholder */}
        <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-sm text-gray-500">🌤️ Weather data coming soon</p>
        </section>

        {/* Features Grid */}
        {info.features.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {info.features.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-800 text-sm"
                  title={f.description}
                >
                  <span className="text-lg">{featureIcons[f.type] || '🔧'}</span>
                  <span className="capitalize">{f.type.replace('_', ' ')}</span>
                  {(f.count ?? 0) > 1 && <span className="text-gray-500">×{f.count}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info Section */}
        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold mb-3">Info</h2>
          {info.address && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-cyan-400 hover:underline"
            >
              📍 {info.address}
            </a>
          )}
          {info.nearestSubway && <p className="text-gray-400">🚇 {info.nearestSubway}</p>}
          <p className="text-gray-400">
            🕐 {info.hours ? `${info.hours.open} – ${info.hours.close}` : info.isGated === false ? '24/7' : 'Hours unknown'}
          </p>
          {info.surfaceType && <p className="text-gray-400">🏗️ {info.surfaceType.replace('_', ' ')}</p>}
          {info.sunExposure && <p className="text-gray-400">☀️ {info.sunExposure.replace('_', ' ')}</p>}
          {info.drainage && <p className="text-gray-400">💧 Drainage: {info.drainage}</p>}
        </section>

        {/* Recent Reports */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Reports</h2>
          {(!conditions || conditions.reports.length === 0) ? (
            <p className="text-gray-500 text-sm">No condition reports yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {conditions.reports.map((r, i) => (
                <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-300">@{r.reporter}</span>
                    <span className="text-gray-500">{timeAgo(r.reportedAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    {r.status && <span>{statusBadge(r.status).label}</span>}
                    {r.surface != null && <span>Surface: {r.surface}/5</span>}
                    {r.crowd != null && <span>Crowd: {r.crowd}/5</span>}
                  </div>
                  {r.notes && <p className="text-sm text-gray-300">{r.notes}</p>}
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {r.photos.map((p, j) => (
                        <button key={j} onClick={() => setLightbox(p)} className="w-16 h-16 rounded overflow-hidden">
                          <img src={p} alt="Report photo" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3 flex gap-3">
        <button className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg text-sm transition">
          📝 Report Conditions
        </button>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 rounded-lg text-sm text-center transition"
        >
          🗺️ Directions
        </a>
        <button
          onClick={handleFav}
          className="w-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg text-xl transition"
          aria-label="Toggle favorite"
        >
          {fav ? '⭐' : '☆'}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

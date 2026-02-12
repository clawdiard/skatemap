import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../utils/favorites';
import { SEOHead } from '../components/SEOHead';

interface ParkIndex {
  slug: string;
  name: string;
  borough: string;
  status: string | null;
  crowd: number | null;
  lastReportAt: string | null;
}

export default function FavoritesPage() {
  const [parks, setParks] = useState<ParkIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const favSlugs = getFavorites();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/parks/index.json`)
      .then((r) => r.json())
      .then((all: ParkIndex[]) => {
        setParks(all.filter((p) => favSlugs.includes(p.slug)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100 pt-14 pb-20">
      <SEOHead title="Favorites" description="Your favorited NYC skateparks." path="/favorites" />
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">⭐ Favorites</h1>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : parks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-4">⭐</p>
            <p className="font-medium mb-1">No favorites yet</p>
            <p className="text-sm">Star parks from the map to track them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {parks.map((park) => (
              <Link
                key={park.slug}
                to={`/park/${park.slug}`}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-green-700 transition-colors"
              >
                <div>
                  <div className="font-semibold text-sm">{park.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{park.borough}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {park.status || 'Unknown'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

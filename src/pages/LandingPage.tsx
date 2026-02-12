import { Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';

const TOP_PARKS = [
  { slug: 'les-coleman', name: 'LES Coleman', borough: 'Manhattan' },
  { slug: 'chelsea-piers', name: 'Chelsea Piers', borough: 'Manhattan' },
  { slug: 'owl-hollow', name: "Owl's Hollow", borough: 'Staten Island' },
  { slug: 'astoria', name: 'Astoria', borough: 'Queens' },
  { slug: 'prospect-park', name: 'Prospect Park', borough: 'Brooklyn' },
  { slug: 'riverside', name: 'Riverside', borough: 'Manhattan' },
];

const STEPS = [
  { icon: '🗺️', title: 'Check the map', desc: 'See real-time conditions at every NYC park' },
  { icon: '📝', title: 'Report conditions', desc: 'Help fellow skaters by reporting what you see' },
  { icon: '🔔', title: 'Get alerts', desc: 'Know the moment your park dries out' },
];

export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100">
      <SEOHead />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/20 via-gray-950 to-gray-950" />
        <div className="relative z-10">
          <h1 className="text-5xl sm:text-7xl font-extrabold mb-4">
            Is your park dry? <span className="inline-block">🛹</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-400 max-w-lg mx-auto mb-8">
            Real-time conditions for every NYC skatepark. Never waste a trip.
          </p>
          <Link
            to="/park/les-coleman"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-green-500 hover:bg-green-400 text-gray-950 font-bold text-lg transition-colors"
          >
            Open Map <span>→</span>
          </Link>
        </div>
      </section>

      {/* Quick Status */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">Top Parks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {TOP_PARKS.map((park) => (
            <Link
              key={park.slug}
              to={`/park/${park.slug}`}
              className="flex flex-col gap-1 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-green-700 transition-colors"
            >
              <span className="font-semibold text-sm">{park.name}</span>
              <span className="text-xs text-gray-500">{park.borough}</span>
              <span className="mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 w-fit">
                No reports yet
              </span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link to="/park/les-coleman" className="text-green-400 hover:text-green-300 text-sm font-medium">
            All Parks →
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-3">{step.icon}</div>
                <h3 className="font-bold mb-1">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Stats */}
      <section className="px-4 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">Community</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-green-400">17</div>
            <div className="text-xs text-gray-500 mt-1">Parks Tracked</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-cyan-400">0</div>
            <div className="text-xs text-gray-500 mt-1">Reports This Week</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">5</div>
            <div className="text-xs text-gray-500 mt-1">Boroughs</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-800 text-center text-sm text-gray-600">
        <div className="flex justify-center gap-4 mb-2">
          <Link to="/about" className="hover:text-gray-400">About</Link>
          <a href="https://github.com/clawdiard/skatemap" target="_blank" rel="noopener" className="hover:text-gray-400">GitHub</a>
        </div>
        <p>© 2026 ParkCheck. Open source, made for skaters.</p>
      </footer>
    </div>
  );
}

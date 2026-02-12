import { Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';

export default function AboutPage() {
  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100 pt-14 pb-20">
      <SEOHead
        title="About ParkCheck"
        description="ParkCheck is an open-source tool for NYC skaters to check real-time skatepark conditions."
        path="/about"
      />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">About ParkCheck</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-4">
          <p>
            <strong>ParkCheck</strong> is a free, open-source tool that helps NYC skaters check
            real-time conditions at skateparks across all five boroughs. No more showing up to a
            soaked park after rain.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">How to Contribute</h2>
          <p>
            Visit any park page and submit a condition report. Your reports help the entire
            community know which parks are skateable right now.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">Open Source</h2>
          <p>
            ParkCheck is fully open source. Contributions, bug reports, and feature requests are
            welcome.
          </p>
          <a
            href="https://github.com/clawdiard/skatemap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            ⭐ View on GitHub
          </a>

          <h2 className="text-xl font-bold mt-8 mb-3">Credits</h2>
          <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
            <li>Park data sourced from NYC Open Data and community contributions</li>
            <li>Weather data via OpenWeatherMap</li>
            <li>Map tiles from OpenStreetMap contributors</li>
            <li>Built with React, Vite, and Tailwind CSS</li>
          </ul>
        </div>

        <div className="mt-10">
          <Link to="/" className="text-green-400 hover:text-green-300 text-sm font-medium">
            ← Back to ParkCheck
          </Link>
        </div>
      </div>
    </div>
  );
}

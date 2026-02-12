import { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ParkDetailPage from './pages/ParkDetailPage';
import SettingsPage from './pages/SettingsPage';
import { initOneSignal, incrementVisitCount } from './utils/notifications';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { useDataPolling } from './hooks/useDataPolling';

const BASE = import.meta.env.BASE_URL;

function HomePage() {
  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
          ParkCheck
        </h1>
        <p className="text-xl text-gray-400 mb-2">NYC Skatepark Conditions</p>
        <p className="text-sm text-gray-600">Real-time park status, weather &amp; crowd data</p>
        <div className="mt-8 flex gap-3">
          <span className="px-3 py-1 rounded-full bg-green-900/50 text-green-400 text-sm border border-green-800">
            🛹 Live
          </span>
          <span className="px-3 py-1 rounded-full bg-cyan-900/50 text-cyan-400 text-sm border border-cyan-800">
            ☀️ Weather
          </span>
          <span className="px-3 py-1 rounded-full bg-purple-900/50 text-purple-400 text-sm border border-purple-800">
            📊 Crowds
          </span>
        </div>
        <Link
          to="/settings"
          className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ⚙️ Settings
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    incrementVisitCount();
    initOneSignal();
  }, []);

  const handleInvalidate = useCallback((changed: string[]) => {
    console.log('[ParkCheck] Data changed:', changed);
    // Components will refetch on next render via their own data hooks
  }, []);

  useDataPolling(handleInvalidate);

  return (
    <BrowserRouter basename={BASE}>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/park/:slug" element={<ParkDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <InstallPrompt />
    </BrowserRouter>
  );
}

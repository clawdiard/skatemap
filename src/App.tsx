import { useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { initNotifications, incrementVisitCount } from './utils/notifications';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { useDataPolling } from './hooks/useDataPolling';

const BASE = import.meta.env.BASE_URL;

const LandingPage = lazy(() => import('./pages/LandingPage'));
const ParkDetailPage = lazy(() => import('./pages/ParkDetailPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const ReporterProfile = lazy(() => import('./pages/ReporterProfile'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-500">
      Loading…
    </div>
  );
}

export default function App() {
  useEffect(() => {
    incrementVisitCount();
    initNotifications();
  }, []);

  const handleInvalidate = useCallback((changed: string[]) => {
    console.log('[ParkCheck] Data changed:', changed);
  }, []);

  useDataPolling(handleInvalidate);

  return (
    <HelmetProvider>
      <BrowserRouter basename={BASE}>
        <OfflineBanner />
        <Header />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/park/:slug" element={<ParkDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/reporter/:nickname" element={<ReporterProfile />} />
          </Routes>
        </Suspense>
        <TabBar />
        <InstallPrompt />
      </BrowserRouter>
    </HelmetProvider>
  );
}

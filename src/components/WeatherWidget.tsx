import { useState, useEffect } from 'react';

const BASE = import.meta.env.BASE_URL;

interface WeatherData {
  fetchedAt: string;
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windGust: number;
    conditions: string;
    description: string;
    icon: string;
    cloudCover: number;
    lastRainAt: string | null;
    precipLast1h: number;
  };
  hourly: Array<{
    dt: string;
    temp: number;
    pop: number;
    rain1h: number;
    conditions: string;
    icon: string;
    windSpeed: number;
  }>;
  alerts: Array<{ event: string; description: string }>;
}

interface DryEstimate {
  isDry: boolean;
  estimatedDryAt: string | null;
  confidence: string;
  note: string | null;
}

interface DryEstimatesData {
  computedAt: string;
  estimates: Record<string, DryEstimate>;
}

function weatherIcon(icon: string): string {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return map[icon] || '🌤️';
}

function timeLabel(dt: string): string {
  return new Date(dt).toLocaleTimeString([], { hour: 'numeric' });
}

export default function WeatherWidget({ parkSlug }: { parkSlug: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [dryEstimate, setDryEstimate] = useState<DryEstimate | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}data/weather/current.json`).then(r => r.ok ? r.json() : null),
      fetch(`${BASE}data/weather/dry-estimates.json`).then(r => r.ok ? r.json() : null),
    ])
      .then(([w, d]: [WeatherData | null, DryEstimatesData | null]) => {
        if (w) setWeather(w);
        else setError(true);
        if (d?.estimates?.[parkSlug]) setDryEstimate(d.estimates[parkSlug]);
      })
      .catch(() => setError(true));
  }, [parkSlug]);

  if (error || !weather) {
    return (
      <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <p className="text-sm text-gray-500">🌤️ Weather data unavailable</p>
      </section>
    );
  }

  const c = weather.current;
  const next6 = weather.hourly.slice(0, 6);
  const rainSoon = next6.some(h => h.pop > 0.6);

  // Dry-out banner
  let dryBanner: { icon: string; text: string; cls: string } | null = null;
  if (c.precipLast1h > 0) {
    dryBanner = { icon: '🌧️', text: 'Currently raining — check back for dry-out estimates', cls: 'text-blue-400' };
  } else if (dryEstimate) {
    if (dryEstimate.isDry) {
      const ago = c.lastRainAt
        ? `${Math.round((Date.now() - new Date(c.lastRainAt).getTime()) / 3600000)}h ago`
        : '';
      dryBanner = {
        icon: '✅',
        text: `Should be dry${ago ? ` (last rain was ${ago})` : ''}`,
        cls: 'text-green-400',
      };
    } else if (dryEstimate.estimatedDryAt) {
      const dryTime = new Date(dryEstimate.estimatedDryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dryBanner = {
        icon: '☔',
        text: `Estimated dry by ${dryTime} (based on sun exposure + drainage)`,
        cls: 'text-yellow-400',
      };
    }
  }

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
      {/* Current conditions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{weatherIcon(c.icon)}</span>
          <div>
            <p className="text-2xl font-bold">{c.temp}°F</p>
            <p className="text-xs text-gray-400 capitalize">{c.description}</p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-400 space-y-0.5">
          <p>Feels like {c.feelsLike}°F</p>
          <p>💨 {c.windSpeed} mph{c.windGust > c.windSpeed ? ` (gusts ${c.windGust})` : ''}</p>
          <p>💧 {c.humidity}%</p>
        </div>
      </div>

      {/* Rain warning */}
      {rainSoon && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900/30 border border-blue-800 text-sm text-blue-300">
          🌧️ Rain likely within 2 hours
        </div>
      )}

      {/* Dry-out banner */}
      {dryBanner && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm ${dryBanner.cls}`}>
          {dryBanner.icon} {dryBanner.text}
          {dryEstimate?.confidence && !dryEstimate.isDry && (
            <span className="ml-auto text-xs text-gray-500 capitalize">{dryEstimate.confidence} confidence</span>
          )}
        </div>
      )}
      {dryEstimate?.note && (
        <p className="text-xs text-gray-500 px-1">{dryEstimate.note}</p>
      )}

      {/* 6-hour forecast */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {next6.map((h, i) => (
          <div key={i} className="flex flex-col items-center min-w-[3.5rem] px-1 py-2 rounded-lg bg-gray-800/40 text-xs">
            <span className="text-gray-500">{timeLabel(h.dt)}</span>
            <span className="text-lg my-0.5">{weatherIcon(h.icon)}</span>
            <span className="font-medium">{h.temp}°</span>
            {h.pop > 0.2 && <span className="text-blue-400">{Math.round(h.pop * 100)}%</span>}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {weather.alerts.length > 0 && (
        <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-300">
          ⚠️ {weather.alerts[0].event}
        </div>
      )}
    </section>
  );
}

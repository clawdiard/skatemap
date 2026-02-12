/**
 * update-weather.js
 *
 * Fetches NYC weather from OpenWeatherMap One Call API 3.0,
 * writes data/weather/current.json, computes per-park dry-out
 * estimates, and writes data/weather/dry-estimates.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const NYC_LAT = 40.7128;
const NYC_LON = -74.0060;
const DATA_DIR = join(process.cwd(), 'data');
const WEATHER_DIR = join(DATA_DIR, 'weather');
const PARKS_DIR = join(DATA_DIR, 'parks');

if (!API_KEY) {
  console.error('Missing OPENWEATHERMAP_API_KEY');
  process.exit(1);
}

if (!existsSync(WEATHER_DIR)) mkdirSync(WEATHER_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return null; }
}

function getPreviousWeather() {
  return readJSON(join(WEATHER_DIR, 'current.json'));
}

function loadParks() {
  const parks = [];
  for (const slug of readdirSync(PARKS_DIR)) {
    const info = readJSON(join(PARKS_DIR, slug, 'info.json'));
    if (info) parks.push(info);
  }
  return parks;
}

// ── Weather Fetch ────────────────────────────────────────────────────

async function fetchWeather() {
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${NYC_LAT}&lon=${NYC_LON}&appid=${API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeatherMap API error: ${res.status} ${await res.text()}`);
  return res.json();
}

function transformWeather(raw) {
  const c = raw.current;
  const rain = c.rain?.['1h'] ?? 0;
  const rain3h = c.rain?.['3h'] ?? rain;

  // Determine lastRainAt: if currently raining, it's now.
  // Otherwise, walk backwards through hourly to find last rain.
  let lastRainAt = null;
  if (rain > 0) {
    lastRainAt = new Date().toISOString();
  } else {
    // Check hourly history (past hours in the data)
    for (const h of (raw.hourly || []).slice(0, 24)) {
      if ((h.rain?.['1h'] ?? 0) > 0 && h.dt * 1000 < Date.now()) {
        const candidate = new Date(h.dt * 1000).toISOString();
        if (!lastRainAt || candidate > lastRainAt) lastRainAt = candidate;
      }
    }
  }

  // If no rain found in data, check if we had a lastRainAt from previous fetch
  const prev = getPreviousWeather();
  if (!lastRainAt && prev?.current?.lastRainAt) {
    lastRainAt = prev.current.lastRainAt;
  }

  const current = {
    temp: Math.round(c.temp),
    feelsLike: Math.round(c.feels_like),
    humidity: c.humidity,
    windSpeed: Math.round(c.wind_speed),
    windGust: Math.round(c.wind_gust ?? c.wind_speed),
    conditions: c.weather?.[0]?.main?.toLowerCase() ?? 'unknown',
    description: c.weather?.[0]?.description ?? '',
    icon: c.weather?.[0]?.icon ?? '',
    cloudCover: c.clouds ?? 0,
    visibility: c.visibility ?? 10000,
    lastRainAt,
    precipLast1h: rain,
    precipLast3h: rain3h,
  };

  const hourly = (raw.hourly || []).slice(0, 48).map(h => ({
    dt: new Date(h.dt * 1000).toISOString(),
    temp: Math.round(h.temp),
    pop: h.pop ?? 0,
    rain1h: h.rain?.['1h'] ?? 0,
    conditions: h.weather?.[0]?.main?.toLowerCase() ?? 'unknown',
    icon: h.weather?.[0]?.icon ?? '',
    cloudCover: h.clouds ?? 0,
    windSpeed: Math.round(h.wind_speed),
  }));

  const alerts = (raw.alerts || []).map(a => ({
    event: a.event,
    sender: a.sender_name,
    start: new Date(a.start * 1000).toISOString(),
    end: new Date(a.end * 1000).toISOString(),
    description: a.description,
  }));

  return {
    fetchedAt: new Date().toISOString(),
    current,
    hourly,
    alerts,
  };
}

// ── Dry-Out Model ────────────────────────────────────────────────────

function estimateDryTime(park, weather) {
  const lastRainAt = weather.current.lastRainAt;
  if (!lastRainAt) return { isDry: true, estimate: null };

  const lastRain = new Date(lastRainAt);
  const hoursSinceRain = (Date.now() - lastRain.getTime()) / (1000 * 60 * 60);

  if (hoursSinceRain > 24) return { isDry: true, estimatedDryAt: null };

  // Currently raining
  if (weather.current.precipLast1h > 0) {
    return {
      isDry: false,
      estimatedDryAt: null,
      confidence: 'low',
      note: 'Currently raining — estimate available after rain stops',
      factors: null,
    };
  }

  const precipAmount = weather.current.precipLast3h || weather.current.precipLast1h || 0;
  let baseDryHours;
  if (precipAmount < 2) baseDryHours = 2;
  else if (precipAmount < 10) baseDryHours = 4;
  else if (precipAmount < 25) baseDryHours = 6;
  else baseDryHours = 10;

  const surfaceModifiers = {
    smooth_concrete: 1.0,
    rough_concrete: 1.3,
    asphalt: 0.9,
    coated: 0.8,
  };

  const hour = new Date().getHours();
  const isDaylight = hour >= 7 && hour <= 18;
  const cloudCover = (weather.current.cloudCover ?? 0) / 100;
  const sunModifiers = {
    full_sun: isDaylight ? (0.5 + cloudCover * 0.4) : 1.2,
    partial_shade: isDaylight ? (0.7 + cloudCover * 0.3) : 1.2,
    full_shade: 1.4,
  };

  const drainageModifiers = { excellent: 0.6, average: 1.0, poor: 1.5 };

  const windSpeed = weather.current.windSpeed;
  const windModifier = windSpeed > 20 ? 0.6 : windSpeed > 10 ? 0.8 : 1.0;

  const surfMod = surfaceModifiers[park.surfaceType] ?? 1.0;
  const sunMod = sunModifiers[park.sunExposure] ?? 1.0;
  const drainMod = drainageModifiers[park.drainage] ?? 1.0;

  const totalDryHours = baseDryHours * surfMod * sunMod * drainMod * windModifier;
  const estimatedDryAt = new Date(lastRain.getTime() + totalDryHours * 60 * 60 * 1000);
  const isDry = Date.now() > estimatedDryAt.getTime();

  return {
    isDry,
    estimatedDryAt: estimatedDryAt.toISOString(),
    confidence: precipAmount < 5 ? 'high' : precipAmount < 15 ? 'medium' : 'low',
    note: (park.coveredPct ?? 0) > 30 ? `~${park.coveredPct}% covered area likely dry` : null,
    factors: {
      baseDryHours,
      surfaceModifier: surfMod,
      sunModifier: sunMod,
      drainageModifier: drainMod,
      windModifier,
      totalDryHours: Math.round(totalDryHours * 10) / 10,
    },
  };
}

// ── Rain Reset Logic ─────────────────────────────────────────────────

function handleRainReset(weather, parks) {
  const prev = getPreviousWeather();
  const wasRaining = prev && (prev.current?.precipLast1h ?? 0) > 0;
  const isRaining = (weather.current.precipLast1h ?? 0) > 0;

  if (wasRaining && !isRaining) {
    console.log('Rain stopped — resetting park condition statuses');
    for (const park of parks) {
      const condPath = join(PARKS_DIR, park.slug, 'conditions.json');
      const cond = readJSON(condPath);
      if (cond) {
        cond.compositeStatus = null;
        cond.rainResetAt = new Date().toISOString();
        writeJSON(condPath, cond);
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function sendNotification({ title, message, url, filters }) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return;
  try {
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, headings: { en: title }, contents: { en: message }, ...(url && { url }), ...(filters && { filters }), enable_frequency_cap: true }),
    });
  } catch (e) { console.warn('Notification failed:', e.message); }
}

async function main() {
  console.log('Fetching NYC weather...');
  const raw = await fetchWeather();
  const weather = transformWeather(raw);

  writeJSON(join(WEATHER_DIR, 'current.json'), weather);
  console.log(`Weather updated: ${weather.current.temp}°F, ${weather.current.conditions}`);

  const parks = loadParks();
  console.log(`Computing dry-out estimates for ${parks.length} parks...`);

  handleRainReset(weather, parks);

  // Load previous estimates for comparison
  const prevEstPath = join(WEATHER_DIR, 'dry-estimates.json');
  const prevEstimates = existsSync(prevEstPath) ? JSON.parse(readFileSync(prevEstPath, 'utf8')).estimates || {} : {};

  const estimates = {};
  for (const park of parks) {
    estimates[park.slug] = estimateDryTime(park, weather);
  }

  const dryEstimates = {
    computedAt: new Date().toISOString(),
    lastRainEndedAt: weather.current.lastRainAt,
    estimates,
  };

  writeJSON(join(WEATHER_DIR, 'dry-estimates.json'), dryEstimates);
  console.log('Dry-out estimates written.');

  // Push notifications
  // Rain incoming
  const rainSoon = (weather.hourly || []).slice(0, 2).some(h => (h.pop || 0) > 0.6);
  const prevWeatherPath = join(WEATHER_DIR, 'prev-alert-state.json');
  const alertState = existsSync(prevWeatherPath) ? JSON.parse(readFileSync(prevWeatherPath, 'utf8')) : {};
  if (rainSoon && !alertState.rainAlerted) {
    await sendNotification({
      title: '🌧️ Rain incoming in NYC',
      message: 'Rain expected within 2 hours. Get your session in!',
      filters: [{ field: 'tag', key: 'notify_rain', value: 'true' }],
    });
    alertState.rainAlerted = true;
  } else if (!rainSoon) {
    alertState.rainAlerted = false;
  }

  // Park dried out notifications
  for (const [slug, est] of Object.entries(estimates)) {
    if (est.isDry && prevEstimates[slug] && !prevEstimates[slug].isDry) {
      const park = parks.find(p => p.slug === slug);
      const name = park?.name || slug;
      await sendNotification({
        title: `☀️ ${name} should be dry now`,
        message: 'Dry-out estimate reached. Go check it out!',
        url: `/park/${slug}`,
        filters: [
          { field: 'tag', key: `fav_${slug}`, value: 'true' },
          { operator: 'AND' },
          { field: 'tag', key: 'notify_dried', value: 'true' },
        ],
      });
    }
  }

  writeFileSync(prevWeatherPath, JSON.stringify(alertState));

  // Summary
  const dryCount = Object.values(estimates).filter(e => e.isDry).length;
  console.log(`${dryCount}/${parks.length} parks estimated dry.`);
}

main().catch(err => {
  console.error('Weather update failed:', err.message);
  process.exit(1);
});

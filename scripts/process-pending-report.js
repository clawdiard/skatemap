/**
 * Process a pending anonymous report JSON file.
 * Called by the process-pending-reports workflow.
 *
 * Usage: node scripts/process-pending-report.js <path-to-json>
 *
 * Reads the JSON, validates it, updates park conditions and stats,
 * then the workflow deletes the pending file.
 */

const fs = require('fs');
const path = require('path');

const DATA = path.resolve(__dirname, '..', 'data');
const now = new Date();

// ── Helpers ──
function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function writeJSON(fp, obj) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2) + '\n');
}

function clamp(n, lo, hi) {
  if (n == null || isNaN(n)) return null;
  return Math.max(lo, Math.min(hi, n));
}

// ── Validation ──
const VALID_STATUSES = ['dry', 'partially_wet', 'wet', 'closed'];

function validateReport(report) {
  if (!report || typeof report !== 'object') return 'Invalid JSON';
  if (!report.park || typeof report.park !== 'string') return 'Missing park slug';
  if (!VALID_STATUSES.includes(report.status)) return `Invalid status: ${report.status}`;
  return null;
}

// ── Reputation (anonymous users get base weight) ──
function getReputationWeight(stats, nickname) {
  // Anonymous/unverified users get lower weight
  if (!nickname || nickname === 'anonymous') return 0.5;
  const reporter = (stats.reporters || []).find(r => r.nickname === nickname);
  if (!reporter) return 0.7;
  const rep = reporter.reputation || 0;
  if (rep >= 2000) return 3.0;
  if (rep >= 500) return 2.0;
  if (rep >= 100) return 1.5;
  return 1.0;
}

function getLevel(rep) {
  if (rep >= 2000) return 'legend';
  if (rep >= 500) return 'local';
  if (rep >= 100) return 'regular';
  return 'rookie';
}

// ── Update Conditions ──
function updateConditions(slug, reportObj, stats) {
  const condPath = path.join(DATA, 'parks', slug, 'conditions.json');
  const cond = readJSON(condPath) || {
    slug,
    compositeStatus: null,
    avgSurface: null,
    avgCrowd: null,
    activeHazards: [],
    reportCount: 0,
    lastReportAt: null,
    reports: [],
    updatedAt: null,
  };

  cond.reports.unshift(reportObj);
  if (cond.reports.length > 20) cond.reports = cond.reports.slice(0, 20);
  cond.reportCount = (cond.reportCount || 0) + 1;
  cond.lastReportAt = reportObj.createdAt;

  // Composite from last 4 hours
  const fourHours = 4 * 60 * 60 * 1000;
  const fresh = cond.reports.filter(r => now.getTime() - new Date(r.createdAt).getTime() < fourHours);

  if (fresh.length > 0) {
    const statusVotes = {};
    fresh.forEach(r => {
      if (!r.status) return;
      const w = getReputationWeight(stats, r.nickname);
      statusVotes[r.status] = (statusVotes[r.status] || 0) + w;
    });
    const sorted = Object.entries(statusVotes).sort((a, b) => b[1] - a[1]);
    cond.compositeStatus = sorted[0]?.[0] || null;

    const wavg = (field) => {
      let sumW = 0, sumV = 0;
      fresh.forEach(r => {
        if (r[field] == null) return;
        const w = getReputationWeight(stats, r.nickname);
        sumW += w;
        sumV += r[field] * w;
      });
      return sumW > 0 ? Math.round((sumV / sumW) * 10) / 10 : null;
    };
    cond.avgSurface = wavg('surface');
    cond.avgCrowd = wavg('crowd');
  }

  cond.updatedAt = now.toISOString();
  writeJSON(condPath, cond);
  return cond;
}

// ── Update Park Index ──
function updateParkIndex(slug, cond) {
  const indexPath = path.join(DATA, 'parks', 'index.json');
  const index = readJSON(indexPath) || [];
  const entry = index.find(p => p.slug === slug);
  if (entry) {
    entry.status = cond.compositeStatus;
    entry.crowd = cond.avgCrowd;
    entry.lastReportAt = cond.lastReportAt;
  }
  writeJSON(indexPath, index);
}

// ── Update Anonymous User Stats (full reputation system) ──
function updateUserStats(nickname, report) {
  const statsPath = path.join(DATA, 'users', 'stats.json');
  const stats = readJSON(statsPath) || { updatedAt: null, reporters: [] };

  if (nickname && nickname !== 'anonymous') {
    let reporter = stats.reporters.find(r => r.nickname === nickname);
    if (!reporter) {
      reporter = {
        nickname,
        reportCount: 0,
        reputation: 0,
        level: 'rookie',
        accuracy: null,
        parks: [],
        streak: 0,
        joinedAt: now.toISOString(),
        lastReportAt: null,
        source: 'anonymous',
      };
      stats.reporters.push(reporter);
    }
    reporter.reportCount += 1;

    // +10 base points per report
    let points = 10;

    // +20 bonus: first report at park after rain (check weather data)
    const weatherPath = path.join(DATA, 'weather', 'current.json');
    const weather = readJSON(weatherPath);
    if (weather && weather.recentRain) {
      const condPath = path.join(DATA, 'parks', report.park, 'conditions.json');
      const cond = readJSON(condPath);
      const sixHours = 6 * 60 * 60 * 1000;
      const hasRecent = (cond?.reports || []).some(
        r => r.nickname !== nickname && now.getTime() - new Date(r.createdAt).getTime() < sixHours,
      );
      if (!hasRecent) points += 20;
    }

    reporter.reputation = (reporter.reputation || 0) + points;
    reporter.level = getLevel(reporter.reputation);
    reporter.lastReportAt = now.toISOString();

    // Track parks
    if (!reporter.parks) reporter.parks = [];
    if (report.park && !reporter.parks.includes(report.park)) {
      reporter.parks.push(report.park);
    }

    // Simple streak: consecutive days
    if (reporter.lastReportAt) {
      const lastDay = new Date(reporter.lastReportAt).toDateString();
      const today = now.toDateString();
      const yesterday = new Date(now.getTime() - 86400000).toDateString();
      if (lastDay === yesterday) {
        reporter.streak = (reporter.streak || 0) + 1;
      } else if (lastDay !== today) {
        reporter.streak = 1;
      }
    } else {
      reporter.streak = 1;
    }
  }

  stats.updatedAt = now.toISOString();
  writeJSON(statsPath, stats);
  return stats;
}

// ── Update Meta ──
function updateMeta() {
  const metaPath = path.join(DATA, 'meta', 'last-updated.json');
  const meta = readJSON(metaPath) || {};
  meta.conditions = now.toISOString();
  writeJSON(metaPath, meta);
}

// ── Main ──
function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node process-pending-report.js <path-to-json>');
    process.exit(1);
  }

  const report = readJSON(filePath);
  const err = validateReport(report);
  if (err) {
    console.error(`REJECTED ${filePath}: ${err}`);
    process.exit(1);
  }

  // Check park exists
  const parkDir = path.join(DATA, 'parks', report.park);
  if (!fs.existsSync(parkDir)) {
    console.error(`REJECTED: Unknown park "${report.park}"`);
    process.exit(1);
  }

  const reportObj = {
    source: 'anonymous',
    nickname: report.nickname || 'anonymous',
    createdAt: report.timestamp || now.toISOString(),
    status: report.status,
    surface: clamp(report.surface, 1, 5),
    crowd: clamp(report.crowd, 1, 5),
    hazards: [],
    notes: report.notes || '',
  };

  const stats = updateUserStats(report.nickname, report);
  const cond = updateConditions(report.park, reportObj, stats);
  updateParkIndex(report.park, cond);
  updateMeta();

  console.log(`✅ Processed anonymous report for ${report.park} — status: ${cond.compositeStatus}`);
}

main();

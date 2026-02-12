const fs = require('fs');
const path = require('path');

// ── Environment ──
const {
  ISSUE_BODY = '',
  ISSUE_AUTHOR = '',
  ISSUE_AUTHOR_ID = '',
  ISSUE_NUMBER = '0',
  ISSUE_CREATED_AT = new Date().toISOString(),
  GH_TOKEN = '',
} = process.env;

const DATA = path.resolve(__dirname, '..', 'data');
const now = new Date(ISSUE_CREATED_AT);

// ── Helpers ──
function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function writeJSON(fp, obj) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2) + '\n');
}

function setRejected(reason) {
  // Signal the workflow to skip closing with success
  const ghEnv = process.env.GITHUB_ENV;
  if (ghEnv) fs.appendFileSync(ghEnv, 'REPORT_REJECTED=true\n');
  console.log(`REJECTED: ${reason}`);
}

// ── 1. Parse Issue Body ──
function parseIssueBody(body) {
  const get = (label) => {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
    const m = body.match(re);
    return m ? m[1].trim() : null;
  };

  const slug = get('Park') || (() => {
    const m = body.match(/park:([a-z0-9-]+)/i);
    return m ? m[1] : null;
  })();

  const statusRaw = (get('Status') || '').toLowerCase();
  const validStatuses = ['dry', 'partially_wet', 'wet', 'closed'];
  const status = validStatuses.includes(statusRaw) ? statusRaw : null;

  const surface = clamp(parseInt(get('Surface Quality') || get('Surface') || '0', 10), 1, 5) || null;
  const crowd = clamp(parseInt(get('Crowd Level') || get('Crowd') || '0', 10), 1, 5) || null;

  const hazardsRaw = get('Hazards') || '';
  const hazards = hazardsRaw ? hazardsRaw.split(',').map(h => h.trim()).filter(Boolean) : [];

  const notes = get('Notes') || '';

  // Photos: find markdown image links
  const photos = [];
  const photoRe = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let pm;
  while ((pm = photoRe.exec(body)) !== null) photos.push(pm[1]);

  // GPS
  let gps = null;
  const gpsRaw = get('GPS') || get('Coordinates') || get('Location');
  if (gpsRaw) {
    const gm = gpsRaw.match(/([-\d.]+)\s*,\s*([-\d.]+)/);
    if (gm) gps = { lat: parseFloat(gm[1]), lng: parseFloat(gm[2]) };
  }

  return { slug, status, surface, crowd, hazards, notes, photos, gps };
}

function clamp(n, lo, hi) {
  if (isNaN(n)) return null;
  return Math.max(lo, Math.min(hi, n));
}

// ── 2. Validate Reporter ──
async function validateReporter(author, authorId) {
  // Check account age via GitHub API
  try {
    const res = await fetch(`https://api.github.com/users/${author}`, {
      headers: GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {},
    });
    if (res.ok) {
      const user = await res.json();
      const created = new Date(user.created_at);
      const ageDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) return { ok: false, reason: 'Account less than 7 days old' };
    }
  } catch (e) {
    console.warn('Could not verify account age:', e.message);
  }

  // Rate limit: max 10 reports per day
  const statsPath = path.join(DATA, 'users', 'stats.json');
  const stats = readJSON(statsPath) || { updatedAt: null, reporters: [] };
  const reporter = stats.reporters.find(r => r.githubUser === author);
  if (reporter) {
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const lastReport = new Date(reporter.lastReportAt || 0);
    // Reset today count if last report was a different day
    if (lastReport < todayStart) {
      reporter.todayReportCount = 0;
    }
    if ((reporter.todayReportCount || 0) >= 10) {
      return { ok: false, reason: 'Daily report limit reached (10/day)' };
    }
  }

  return { ok: true };
}

// ── 3. Reputation ──
function getReputationWeight(stats, author) {
  const reporter = (stats.reporters || []).find(r => r.githubUser === author);
  if (!reporter) return 1.0;
  const rep = reporter.reputation || 0;
  if (rep >= 2000) return 3.0;   // Legend
  if (rep >= 500) return 2.0;    // Local
  if (rep >= 100) return 1.5;    // Regular
  return 1.0;                     // Rookie
}

function getLevel(rep) {
  if (rep >= 2000) return 'legend';
  if (rep >= 500) return 'local';
  if (rep >= 100) return 'regular';
  return 'rookie';
}

// ── 4. Update Conditions ──
function updateConditions(slug, report, stats) {
  const condPath = path.join(DATA, 'parks', slug, 'conditions.json');
  const cond = readJSON(condPath) || {
    slug,
    compositeStatus: null,
    avgSurface: null,
    avgCrowd: null,
    activeHazards: [],
    reportCount: 0,
    lastReportAt: null,
    dryEstimate: null,
    reports: [],
    updatedAt: null,
  };

  // Add report, keep last 20
  cond.reports.unshift(report);
  if (cond.reports.length > 20) cond.reports = cond.reports.slice(0, 20);
  cond.reportCount = (cond.reportCount || 0) + 1;
  cond.lastReportAt = report.createdAt;

  // Composite from last 4 hours
  const fourHours = 4 * 60 * 60 * 1000;
  const fresh = cond.reports.filter(r => now.getTime() - new Date(r.createdAt).getTime() < fourHours);

  if (fresh.length > 0) {
    // Status: weighted vote
    const statusVotes = {};
    fresh.forEach(r => {
      if (!r.status) return;
      const w = getReputationWeight(stats, r.githubUser);
      statusVotes[r.status] = (statusVotes[r.status] || 0) + w;
    });
    const sorted = Object.entries(statusVotes).sort((a, b) => b[1] - a[1]);
    cond.compositeStatus = sorted[0]?.[0] || null;

    // Weighted averages
    const wavg = (field) => {
      let sumW = 0, sumV = 0;
      fresh.forEach(r => {
        if (r[field] == null) return;
        const w = getReputationWeight(stats, r.githubUser);
        sumW += w;
        sumV += r[field] * w;
      });
      return sumW > 0 ? Math.round((sumV / sumW) * 10) / 10 : null;
    };
    cond.avgSurface = wavg('surface');
    cond.avgCrowd = wavg('crowd');

    // Active hazards from fresh reports
    const hazardSet = new Set();
    fresh.forEach(r => (r.hazards || []).forEach(h => hazardSet.add(h)));
    cond.activeHazards = [...hazardSet];
  }

  cond.updatedAt = now.toISOString();
  writeJSON(condPath, cond);
  return cond;
}

// ── 5. Update Park Index ──
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

// ── 6. Update User Stats ──
function updateUserStats(author, report) {
  const statsPath = path.join(DATA, 'users', 'stats.json');
  const stats = readJSON(statsPath) || { updatedAt: null, reporters: [] };

  let reporter = stats.reporters.find(r => r.githubUser === author);
  if (!reporter) {
    reporter = {
      githubUser: author,
      reportCount: 0,
      accuracy: 1.0,
      reputation: 0,
      level: 'rookie',
      joinedAt: now.toISOString(),
      lastReportAt: null,
      todayReportCount: 0,
    };
    stats.reporters.push(reporter);
  }

  // Reset today count if needed
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  if (new Date(reporter.lastReportAt || 0) < todayStart) {
    reporter.todayReportCount = 0;
  }

  reporter.reportCount += 1;
  reporter.todayReportCount = (reporter.todayReportCount || 0) + 1;
  reporter.lastReportAt = now.toISOString();

  // Reputation points
  let repGain = 10; // base
  if (report.photos && report.photos.length > 0) repGain += 5;
  // (Rain-first and accuracy bonuses would require weather data and multi-report correlation — simplified here)
  reporter.reputation = (reporter.reputation || 0) + repGain;
  reporter.level = getLevel(reporter.reputation);

  stats.updatedAt = now.toISOString();
  writeJSON(statsPath, stats);
  return stats;
}

// ── 7. Update Meta ──
function updateMeta() {
  const metaPath = path.join(DATA, 'meta', 'last-updated.json');
  const meta = readJSON(metaPath) || {};
  meta.conditions = now.toISOString();
  meta.users = now.toISOString();
  writeJSON(metaPath, meta);
}

// ── Main ──
async function main() {
  console.log(`Processing condition report #${ISSUE_NUMBER} by ${ISSUE_AUTHOR}`);

  // Parse
  const report = parseIssueBody(ISSUE_BODY);
  if (!report.slug) {
    console.error('ERROR: Could not determine park slug from issue body');
    setRejected('Missing park slug');
    process.exit(1);
  }

  // Check park exists
  const parkDir = path.join(DATA, 'parks', report.slug);
  if (!fs.existsSync(parkDir)) {
    console.error(`ERROR: Unknown park slug "${report.slug}"`);
    setRejected(`Unknown park: ${report.slug}`);
    process.exit(1);
  }

  // Validate reporter
  const validation = await validateReporter(ISSUE_AUTHOR, ISSUE_AUTHOR_ID);
  if (!validation.ok) {
    console.error(`REJECTED: ${validation.reason}`);
    setRejected(validation.reason);
    process.exit(1);
  }

  // Build report object
  const reportObj = {
    issueNumber: parseInt(ISSUE_NUMBER, 10),
    githubUser: ISSUE_AUTHOR,
    githubUserId: ISSUE_AUTHOR_ID,
    createdAt: now.toISOString(),
    status: report.status,
    surface: report.surface,
    crowd: report.crowd,
    hazards: report.hazards,
    notes: report.notes,
    photos: report.photos,
    gps: report.gps,
  };

  // Update user stats first (need for reputation weights)
  const stats = updateUserStats(ISSUE_AUTHOR, reportObj);

  // Update conditions
  const cond = updateConditions(report.slug, reportObj, stats);

  // Update park index
  updateParkIndex(report.slug, cond);

  // Update meta
  updateMeta();

  console.log(`✅ Processed report for ${report.slug} — status: ${cond.compositeStatus}, surface: ${cond.avgSurface}, crowd: ${cond.avgCrowd}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

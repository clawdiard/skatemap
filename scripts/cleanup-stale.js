#!/usr/bin/env node
/**
 * Stale Report Cleanup Script
 * - Reports > 4hrs: mark stale
 * - Reports > 12hrs: archive and remove
 * - Recompute composite conditions
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PARKS_DIR = join(ROOT, 'data', 'parks');
const META_DIR = join(ROOT, 'data', 'meta');
const REPORTS_DIR = join(ROOT, 'data', 'reports');

const STALE_MS = 4 * 60 * 60 * 1000;    // 4 hours
const ARCHIVE_MS = 12 * 60 * 60 * 1000;  // 12 hours

const now = Date.now();

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function writeJSON(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

// Load parks index
const indexPath = join(PARKS_DIR, 'index.json');
const parks = readJSON(indexPath);
if (!parks || !Array.isArray(parks)) {
  console.log('No parks index found');
  process.exit(0);
}

let totalCleaned = 0;
let totalArchived = 0;

for (const park of parks) {
  const slug = park.slug;
  const condPath = join(PARKS_DIR, slug, 'conditions.json');
  const cond = readJSON(condPath);
  if (!cond || !cond.reports || cond.reports.length === 0) continue;

  const toArchive = [];
  const remaining = [];

  for (const report of cond.reports) {
    const reportTime = new Date(report.submittedAt || report.createdAt).getTime();
    const age = now - reportTime;

    if (age > ARCHIVE_MS) {
      toArchive.push(report);
      totalArchived++;
    } else {
      if (age > STALE_MS) {
        report.stale = true;
        totalCleaned++;
      }
      remaining.push(report);
    }
  }

  // Archive old reports
  if (toArchive.length > 0) {
    for (const report of toArchive) {
      const d = new Date(report.submittedAt || report.createdAt);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const archivePath = join(REPORTS_DIR, String(yyyy), mm, `${dd}.json`);
      const existing = readJSON(archivePath) || [];
      existing.push({ ...report, park: slug });
      writeJSON(archivePath, existing);
    }
  }

  // Recompute composite from non-stale reports
  const fresh = remaining.filter(r => !r.stale);

  if (fresh.length > 0) {
    const avgSurface = fresh.reduce((s, r) => s + (r.surface || 0), 0) / fresh.length;
    const avgCrowd = fresh.reduce((s, r) => s + (r.crowd || 0), 0) / fresh.length;
    const hazards = [...new Set(fresh.flatMap(r => r.hazards || []))];

    cond.compositeStatus = avgSurface >= 3.5 ? 'good' : avgSurface >= 2.5 ? 'fair' : 'poor';
    cond.avgSurface = Math.round(avgSurface * 10) / 10;
    cond.avgCrowd = Math.round(avgCrowd * 10) / 10;
    cond.activeHazards = hazards;
  } else {
    cond.compositeStatus = null;
    cond.avgSurface = null;
    cond.avgCrowd = null;
    cond.activeHazards = [];
  }

  cond.reports = remaining;
  cond.reportCount = remaining.length;
  cond.lastReportAt = remaining.length > 0
    ? remaining.reduce((latest, r) => {
        const t = r.submittedAt || r.createdAt;
        return t > latest ? t : latest;
      }, '')
    : null;
  cond.updatedAt = new Date().toISOString();

  writeJSON(condPath, cond);

  // Update index entry
  park.compositeStatus = cond.compositeStatus;
  park.reportCount = cond.reportCount;
}

// Write updated index
writeJSON(indexPath, parks);

// Update last-updated meta
const metaPath = join(META_DIR, 'last-updated.json');
const meta = readJSON(metaPath) || {};
meta.conditions = new Date().toISOString();
writeJSON(metaPath, meta);

console.log(`Cleanup complete: ${totalCleaned} marked stale, ${totalArchived} archived`);

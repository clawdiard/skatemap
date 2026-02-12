/**
 * Anonymous report submission via GitHub Contents API.
 *
 * Writes a JSON file to reports/pending/{timestamp}-{random}.json
 * which triggers the process-pending-reports workflow.
 *
 * Uses a scoped PAT stored in VITE_REPORT_TOKEN (contents:write only).
 */

const REPO = 'clawdiard/skatemap';
const API = 'https://api.github.com';

export interface ReportPayload {
  park: string;
  status: string;
  surface: number | null;
  crowd: number | null;
  nickname: string;
  notes: string;
  timestamp: string;
  ua: string;
}

// ── Rate Limiting (localStorage) ──
const RATE_KEY = 'parkcheck_rate';
const RATE_MS = 10 * 60 * 1000; // 10 minutes per park

function getRateLimits(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function isRateLimited(parkSlug: string): boolean {
  const limits = getRateLimits();
  const last = limits[parkSlug];
  if (!last) return false;
  return Date.now() - last < RATE_MS;
}

function setRateLimit(parkSlug: string) {
  const limits = getRateLimits();
  limits[parkSlug] = Date.now();
  // Clean old entries
  const cutoff = Date.now() - RATE_MS;
  for (const k of Object.keys(limits)) {
    if (limits[k] < cutoff) delete limits[k];
  }
  localStorage.setItem(RATE_KEY, JSON.stringify(limits));
}

// ── Submission ──
export async function submitReport(payload: ReportPayload): Promise<void> {
  const token = import.meta.env.VITE_REPORT_TOKEN;
  if (!token) throw new Error('Report submission is not configured.');

  if (isRateLimited(payload.park)) {
    throw new Error('You recently submitted a report for this park. Please wait 10 minutes.');
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  const filePath = `reports/pending/${ts}-${rand}.json`;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

  const res = await fetch(`${API}/repos/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      message: `📋 Report: ${payload.park} — ${payload.status}`,
      content,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Submission failed (${res.status})`);
  }

  setRateLimit(payload.park);
}

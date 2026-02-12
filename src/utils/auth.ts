/**
 * GitHub OAuth Device Flow for static sites (no backend needed).
 *
 * Flow:
 * 1. POST /login/device/code → get user_code + device_code + verification_uri
 * 2. User visits verification_uri and enters user_code
 * 3. We poll POST /login/oauth/access_token until user completes auth
 * 4. Store token + user profile in localStorage
 *
 * NOTE: Requires a GitHub OAuth App with Device Flow enabled.
 * Set the Client ID in VITE_GITHUB_CLIENT_ID env var.
 */

const STORAGE_TOKEN_KEY = 'parkcheck_gh_token';
const STORAGE_USER_KEY = 'parkcheck_gh_user';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  id: number;
  name: string | null;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/** Get stored auth token */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

/** Get stored user profile */
export function getUser(): GitHubUser | null {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Check if user is signed in */
export function isSignedIn(): boolean {
  return !!getToken();
}

/** Sign out */
export function signOut(): void {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

/** Get the GitHub OAuth Client ID */
function getClientId(): string {
  const id = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!id) throw new Error('VITE_GITHUB_CLIENT_ID not set');
  return id;
}

/** Step 1: Request device + user codes */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: getClientId(),
      scope: 'public_repo',
    }),
  });
  if (!res.ok) throw new Error('Failed to request device code');
  return res.json();
}

/** Step 2: Poll for access token (call in a loop) */
export async function pollForToken(deviceCode: string): Promise<string | 'pending' | 'expired'> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: getClientId(),
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });
  const data = await res.json();

  if (data.access_token) {
    localStorage.setItem(STORAGE_TOKEN_KEY, data.access_token);
    // Fetch and store user profile
    const user = await fetchUser(data.access_token);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    return data.access_token;
  }

  if (data.error === 'authorization_pending' || data.error === 'slow_down') {
    return 'pending';
  }

  if (data.error === 'expired_token') {
    return 'expired';
  }

  throw new Error(data.error_description || data.error || 'Unknown error');
}

/** Fetch GitHub user profile */
async function fetchUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

/**
 * Full device flow: returns when user completes auth or times out.
 * onCode callback gives the UI the code + URL to display.
 */
export async function startDeviceFlow(
  onCode: (userCode: string, verificationUri: string) => void,
): Promise<GitHubUser> {
  const dc = await requestDeviceCode();
  onCode(dc.user_code, dc.verification_uri);

  const deadline = Date.now() + dc.expires_in * 1000;
  const interval = Math.max((dc.interval || 5) * 1000, 5000);

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval));
    const result = await pollForToken(dc.device_code);
    if (result === 'pending') continue;
    if (result === 'expired') throw new Error('Device code expired');
    // Got a token — user is stored
    const user = getUser();
    if (user) return user;
    throw new Error('Token received but user fetch failed');
  }
  throw new Error('Device flow timed out');
}

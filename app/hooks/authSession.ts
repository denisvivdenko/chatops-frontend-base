const ACCESS_TOKEN_STORAGE_KEY = 'chatops.accessToken';

let accessToken: string | null = null;

function loadPersistedToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function persistToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  else window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

async function createAnonymousSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/anonymous-session`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to create anonymous session: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function setToken(token: string) {
  accessToken = token;
  persistToken(token);
}

/** Call once on app load: reuses a stored token, or creates a fresh anonymous session. */
export async function ensureSession(baseUrl: string): Promise<void> {
  const stored = loadPersistedToken();
  if (stored) {
    accessToken = stored;
    return;
  }
  setToken(await createAnonymousSession(baseUrl));
}

/**
 * fetch() wrapper that attaches the current access token and, on a 401,
 * refreshes it (or starts a brand new anonymous session if the refresh
 * token is gone) before retrying once.
 */
export async function authorizedFetch(baseUrl: string, path: string, init: RequestInit = {}): Promise<Response> {
  async function withAuth(token: string | null) {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  }

  const res = await withAuth(accessToken);
  if (res.status !== 401) return res;

  const refreshed = await refreshAccessToken(baseUrl);
  if (refreshed) {
    setToken(refreshed);
    return withAuth(refreshed);
  }

  setToken(await createAnonymousSession(baseUrl));
  return withAuth(accessToken);
}

/** Drops the current identity and starts a brand new anonymous one. */
export async function resetSession(baseUrl: string): Promise<void> {
  accessToken = null;
  persistToken(null);
  setToken(await createAnonymousSession(baseUrl));
}

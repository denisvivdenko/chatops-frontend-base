export class AnonymousSessionError extends Error {
  constructor(public status: number) {
    super(`Failed to create anonymous session: ${status}`);
  }
}

export class RefreshTokenError extends Error {
  constructor(public status: number) {
    super(`Failed to refresh access token: ${status}`);
  }
}

export async function createAnonymousSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/anonymous-session`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new AnonymousSessionError(res.status);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// `init` is never passed in production - a real browser attaches the HttpOnly refresh
// cookie invisibly via `credentials: 'include'`. It exists so tests (no browser, no
// cookie jar) can hand the cookie captured from a real bootstrap response back in.
export async function refreshAccessToken(baseUrl: string, init: RequestInit = {}): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    ...init,
  });
  if (!res.ok) throw new RefreshTokenError(res.status);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

import { parseJson, UnauthorizedError } from './errors';

export async function createAnonymousSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/anonymous-session`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await parseJson<{ access_token: string }>(res);
  return data.access_token;
}

export async function refreshAccessToken(baseUrl: string, init: RequestInit = {}): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    ...init,
  });
  const data = await parseJson<{ access_token: string }>(res);
  return data.access_token;
}

export type AuthRequest = (path: string, init?: RequestInit) => Promise<Response>;
export type AuthApi = Awaited<ReturnType<typeof createAuthApi>>;

export async function createAuthApi(
  baseUrl: string,
  login: string | null,
  password: string | null,
  initToken: string | null,
  onTokenUpdate: (token: string) => void,
) {
  let token: string;

  function setToken(newToken: string): void {
    token = newToken;
    onTokenUpdate(newToken);
  }

  async function authenticate(login: string | null, password: string | null): Promise<string> {
    if (login === null || password === null) {
      return createAnonymousSession(baseUrl);
    }
    throw new Error('Not implemented auth service with login and password.');
  }

  if (initToken) token = initToken;
  else setToken(await authenticate(login, password));

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    async function withAuth() {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(`${baseUrl}${path}`, { ...init, headers });
    }

    const res = await withAuth();
    if (res.status !== 401) return res;

    try {
      setToken(await refreshAccessToken(baseUrl));
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) throw err;
      setToken(await authenticate(login, password));
    }
    return withAuth();
  }

  return {
    request,
    async logout(): Promise<void> {
      setToken(await authenticate(login, password));
    },
  };
}

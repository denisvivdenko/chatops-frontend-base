import { describe, expect, it } from 'vitest';
import { AnonymousSessionError, RefreshTokenError, createAnonymousSession, refreshAccessToken } from './authSession';

/**
 * Real integration tests: every call here hits the actual backend at BASE_URL, no
 * mocked fetch and no fabricated responses. Requires the backend to be running
 * locally (see Makefile: BACKEND_URL defaults to http://localhost:8000/api).
 */

const BASE_URL = process.env.BACKEND_URL ?? 'http://localhost:8000/api';

describe('authSession (real backend integration)', () => {
  it('createAnonymousSession returns a usable access token', async () => {
    const token = await createAnonymousSession(BASE_URL);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('createAnonymousSession throws an AnonymousSessionError carrying the real HTTP status when the request is not successful', async () => {
    let error: unknown;
    try {
      await createAnonymousSession(`${BASE_URL}/does-not-exist`);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(AnonymousSessionError);
    expect((error as AnonymousSessionError).status).toBe(404);
  });

  it('refreshAccessToken throws a RefreshTokenError carrying the real HTTP status when there is no refresh cookie', async () => {
    let error: unknown;
    try {
      await refreshAccessToken(BASE_URL);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(RefreshTokenError);
    expect((error as RefreshTokenError).status).toBe(401);
  });

  it('refreshAccessToken returns a new access token when a valid refresh cookie is presented', async () => {
    const bootstrapRes = await fetch(`${BASE_URL}/auth/anonymous-session`, { method: 'POST', credentials: 'include' });
    const [cookie] = bootstrapRes.headers.getSetCookie();

    const token = await refreshAccessToken(BASE_URL, { headers: { Cookie: cookie.split(';')[0] } });

    expect(typeof token).toBe('string');
    expect(token?.length).toBeGreaterThan(0);
  });
});

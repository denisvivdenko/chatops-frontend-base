import { describe, expect, it } from 'vitest';
import { createAnonymousSession, refreshAccessToken } from './authService';
import { HttpError } from './httpError';
import { BASE_URL } from './testUtils';

describe('authService', () => {
  it('createAnonymousSession returns a token that authenticates a protected endpoint', async () => {
    const token = await createAnonymousSession(BASE_URL);

    const res = await fetch(`${BASE_URL}/chats?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  it('createAnonymousSession throws an HttpError carrying the real HTTP status when the request is not successful', async () => {
    let error: unknown;
    try {
      await createAnonymousSession(`${BASE_URL}/does-not-exist`);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  });

  it('refreshAccessToken throws an HttpError carrying the real HTTP status when there is no refresh cookie', async () => {
    let error: unknown;
    try {
      await refreshAccessToken(BASE_URL);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(401);
    // Auth failures use `{"detail": ...}`, not the `{"error": code}`
    expect((error as HttpError).code).toBeUndefined();
  });

  it('refreshAccessToken returns a new access token when a valid refresh cookie is presented', async () => {
    const bootstrapRes = await fetch(`${BASE_URL}/auth/anonymous-session`, { method: 'POST', credentials: 'include' });
    const [cookie] = bootstrapRes.headers.getSetCookie();

    const token = await refreshAccessToken(BASE_URL, { headers: { Cookie: cookie.split(';')[0] } });

    expect(typeof token).toBe('string');
    expect(token?.length).toBeGreaterThan(0);
  });
});

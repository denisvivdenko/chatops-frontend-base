'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Dispatch } from 'react';
import { createAnonymousSession, refreshAccessToken, RefreshTokenError } from '../services/authService';
import type { AppAction } from './chat/appState';
import type { AuthorizedFetch } from './chat/chatApi';

const ACCESS_TOKEN_STORAGE_KEY = 'chatops.accessToken';

function loadPersistedToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function persistToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  else window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

/**
 * The anonymous-session identity lifecycle, and the sole owner of the access token -
 * held in a ref (not the reducer) since a refresh shouldn't trigger a re-render. It
 * bootstraps a session once on mount and announces it with `sessionReady` (which the
 * store uses to gate loads and re-key the chat effects) - a non-destructive marker,
 * so it never clobbers other state. `authorizedFetch` is the one way the rest of the
 * app talks to the backend: it attaches the current token and, on a 401, refreshes it
 * (or starts a brand new anonymous session if the refresh token is gone) before
 * retrying once. `logout` abandons the current identity for a new one: it navigates
 * home first so the active-chat route unwinds (aborting any live stream), then
 * `sessionReset` wipes the previous user's data and its new id triggers a reload of
 * the (empty) chat list.
 */
export function useSession(dispatch: Dispatch<AppAction>, baseUrl: string) {
  const router = useRouter();
  const accessToken = useRef<string | null>(null);

  const setToken = useCallback((token: string) => {
    accessToken.current = token;
    persistToken(token);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = loadPersistedToken();
      if (stored) {
        accessToken.current = stored;
      } else {
        setToken(await createAnonymousSession(baseUrl));
      }
      if (!cancelled) dispatch({ type: 'sessionReady', id: crypto.randomUUID() });
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [baseUrl, setToken, dispatch]);

  const authorizedFetch: AuthorizedFetch = useCallback(async (path, init = {}) => {
    async function withAuth(token: string | null) {
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(`${baseUrl}${path}`, { ...init, headers });
    }

    const res = await withAuth(accessToken.current);
    if (res.status !== 401) return res;

    let refreshed: string;
    try {
      refreshed = await refreshAccessToken(baseUrl);
    } catch (err) {
      // Only a rejected refresh (invalid/expired refresh token) triggers the
      // re-anonymize fallback - anything else (a real network failure, say) is
      // unexpected and should surface, not be silently absorbed into it.
      if (!(err instanceof RefreshTokenError)) throw err;
      setToken(await createAnonymousSession(baseUrl));
      return withAuth(accessToken.current);
    }

    setToken(refreshed);
    return withAuth(refreshed);
  }, [baseUrl, setToken]);

  const logout = useCallback(async () => {
    router.push('/');
    accessToken.current = null;
    persistToken(null);
    setToken(await createAnonymousSession(baseUrl));
    dispatch({ type: 'sessionReset', id: crypto.randomUUID() });
  }, [baseUrl, router, dispatch, setToken]);

  return { logout, authorizedFetch };
}

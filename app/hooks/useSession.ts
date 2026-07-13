'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Dispatch } from 'react';
import { ensureSession, resetSession } from './authSession';
import type { AppAction } from './chat/appState';

/**
 * The anonymous-session identity lifecycle. Bootstraps a session once on mount and
 * announces it with `sessionReady` (which the store uses to gate loads and re-key
 * the chat effects) — a non-destructive marker, so it never clobbers other state.
 * `logout` abandons the current identity for a new one: it navigates home first so
 * the active-chat route unwinds (aborting any live stream), then `sessionReset`
 * wipes the previous user's data and its new id triggers a reload of the (empty)
 * chat list.
 */
export function useSession(dispatch: Dispatch<AppAction>, baseUrl: string) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    ensureSession(baseUrl).then(() => {
      if (!cancelled) dispatch({ type: 'sessionReady', id: crypto.randomUUID() });
    });
    return () => { cancelled = true; };
  }, [baseUrl, dispatch]);

  const logout = useCallback(async () => {
    router.push('/');
    await resetSession(baseUrl);
    dispatch({ type: 'sessionReset', id: crypto.randomUUID() });
  }, [baseUrl, router, dispatch]);

  return { logout };
}

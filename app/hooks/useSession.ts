'use client';

import { useState, useEffect, useCallback } from 'react';
import { ensureSession, resetSession } from './authSession';

/**
 * The anonymous-session identity lifecycle. Bootstraps a session once on mount
 * (`ready` gates the data-loading effects until then) and exposes `reset`, which
 * abandons the current identity for a fresh one. This is deliberately independent
 * of the chat domain — it only knows about `authSession`.
 */
export function useSession(baseUrl: string) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSession(baseUrl).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [baseUrl]);

  const reset = useCallback(() => resetSession(baseUrl), [baseUrl]);

  return { ready, reset };
}

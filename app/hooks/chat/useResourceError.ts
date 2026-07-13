'use client';

import { useState, useCallback } from 'react';
import { HttpError } from './chatApi';

/**
 * The resource-not-found banner state. Any chat operation can hit a 404 (chat
 * gone) or 403 (not yours); `report` inspects a caught error, raises the banner
 * when it's one of those, and returns whether it handled it so callers can stop.
 * Kept out of the reducer because it's a cross-cutting view concern, not chat data.
 */
export function useResourceError() {
  const [notFoundReason, setNotFoundReason] = useState<'not-found' | 'forbidden' | null>(null);

  const report = useCallback((err: unknown): boolean => {
    if (err instanceof HttpError && err.status === 404) {
      setNotFoundReason('not-found');
      return true;
    }
    if (err instanceof HttpError && err.status === 403) {
      setNotFoundReason('forbidden');
      return true;
    }
    return false;
  }, []);

  const dismiss = useCallback(() => setNotFoundReason(null), []);

  return { notFoundReason, report, dismiss };
}

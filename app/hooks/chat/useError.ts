'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { Dispatch } from 'react';
import type { AppAction } from './appState';

/**
 * The resource-not-found banner is route-scoped: it belongs to whatever route
 * raised it, so any navigation clears it. That keeps `goHome`/route changes free
 * of an explicit dismiss and removes a class of "forgot to clear the banner" bugs.
 * Raising the banner is done by the controller (it dispatches `errorRaised` on a
 * 404/403); this hook owns only the clear side.
 */
export function useError(dispatch: Dispatch<AppAction>) {
  const pathname = usePathname();

  useEffect(() => {
    dispatch({ type: 'errorDismissed', reason: 'url-change' });
  }, [pathname, dispatch]);

  const dismissError = useCallback(
    () => dispatch({ type: 'errorDismissed', reason: 'user-input' }),
    [dispatch]
  );

  return { dismissError };
}

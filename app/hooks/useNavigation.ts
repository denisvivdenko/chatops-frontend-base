'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Explicit user navigation. Kept purely navigational — anything route-scoped that
 * should reset on a move (e.g. the error banner) reacts to the route change itself
 * rather than being bundled into these actions.
 */
export function useNavigation() {
  const router = useRouter();
  const goHome = useCallback(() => router.push('/'), [router]);
  return { goHome };
}

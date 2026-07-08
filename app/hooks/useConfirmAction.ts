'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Arms a button on first click and only fires `onConfirm` on the next one; disarms on outside click or Escape. */
export function useConfirmAction<T extends HTMLElement>(ref: RefObject<T | null>, onConfirm: () => void) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;

    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setConfirming(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setConfirming(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirming, ref]);

  function handleClick() {
    if (confirming) {
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
    }
  }

  return { confirming, handleClick };
}

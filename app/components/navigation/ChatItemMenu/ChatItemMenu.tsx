'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import styles from './ChatItemMenu.module.css';

type Props = {
  onDeleteAction(): void;
};

export default function ChatItemMenu({ onDeleteAction }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleDeleteClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    close();
    onDeleteAction();
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.trigger}
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MoreVertical size={16} strokeWidth={2} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button
            className={`${styles.menuItem} ${confirming ? styles.menuItemConfirm : ''}`}
            role="menuitem"
            onClick={handleDeleteClick}
          >
            <Trash2 size={14} strokeWidth={2} />
            {confirming ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

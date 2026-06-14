'use client';

import styles from './ChatHeader.module.css';

type Props = {
  onMenuOpenAction: () => void;
};

export default function ChatHeader({ onMenuOpenAction }: Props) {
  return (
    <header className={styles.header}>
      <button className={styles.menuBtn} aria-label="Open menu" onClick={onMenuOpenAction}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>
  );
}

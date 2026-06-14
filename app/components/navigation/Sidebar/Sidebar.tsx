'use client';

import { useState } from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
      <button
        className={styles.item}
        aria-label="Toggle sidebar"
        onClick={() => setExpanded((v) => !v)}
      >
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
        <span className={styles.label}>Collapse</span>
      </button>

      <button className={styles.item} aria-label="New chat">
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className={styles.label}>New chat</span>
      </button>
    </aside>
  );
}

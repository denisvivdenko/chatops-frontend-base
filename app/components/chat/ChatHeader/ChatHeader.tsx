'use client';

import { Menu } from 'lucide-react';
import styles from './ChatHeader.module.css';

type Props = {
  onMenuOpenAction: () => void;
};

export default function ChatHeader({ onMenuOpenAction }: Props) {
  return (
    <header className={styles.header}>
      <button className={styles.menuBtn} aria-label="Open menu" onClick={onMenuOpenAction}>
        <Menu size={20} />
      </button>
    </header>
  );
}

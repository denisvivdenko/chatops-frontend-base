'use client';

import { SearchX } from 'lucide-react';
import styles from './NotFoundNotice.module.css';

type Props = {
  message: string;
  onGoHomeAction(): void;
  onStayAction(): void;
};

export default function NotFoundNotice({ message, onGoHomeAction, onStayAction }: Props) {
  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.notice}>
        <SearchX size={20} strokeWidth={1.5} className={styles.icon} />
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={onGoHomeAction}>
            Go to home
          </button>
          <button className={styles.secondaryButton} onClick={onStayAction}>
            Stay
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { SearchX } from 'lucide-react';
import styles from './NotFoundNotice.module.css';

type Props = {
  reason: 'not-found' | 'forbidden';
  onGoHomeAction(): void;
  onStayAction(): void;
};

const MESSAGES = {
  'not-found': "This chat couldn't be found.",
  forbidden: "This chat belongs to someone else, so you can't access it.",
};

export default function NotFoundNotice({ reason, onGoHomeAction, onStayAction }: Props) {
  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.notice}>
        <SearchX size={20} className={styles.icon} />
        <p className={styles.message}>{MESSAGES[reason]}</p>
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

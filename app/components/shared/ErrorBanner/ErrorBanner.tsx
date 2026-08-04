'use client';

import styles from './ErrorBanner.module.css';
import { SearchX } from 'lucide-react';
import { useNavigation } from '@/app/hooks/useNavigation';
import { useErrorReporter } from '@/app/context/ErrorContext';

export default function ErrorBanner() {
  const { errorMessage, dismissError } = useErrorReporter()
  const { goHome } = useNavigation()

  return (
    (errorMessage && 
    <div className={styles.wrapper} role="alert">
      <div className={styles.notice}>
        <SearchX size={20} strokeWidth={1.5} className={styles.icon} />
        <p className={styles.message}>{errorMessage}</p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={goHome}>
            Go to home
          </button>
          <button className={styles.secondaryButton} onClick={dismissError}>
            Stay
          </button>
        </div>
      </div>
    </div>
    ) 
  );
}

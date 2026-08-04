'use client';

import styles from './ReplaceConfirmDialog.module.css';

type ReplaceConfirmDialogProps = {
  filename: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ReplaceConfirmDialog({ filename, onCancel, onConfirm }: ReplaceConfirmDialogProps) {
  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div
        className={styles.confirmPanel}
        role="alertdialog"
        aria-modal="true"
        aria-label="Replace document"
        onClick={e => e.stopPropagation()}
      >
        <p className={styles.confirmMessage}>
          <strong>{filename}</strong> is already added. Replace it?
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmCancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.confirmReplaceButton} onClick={onConfirm}>
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}

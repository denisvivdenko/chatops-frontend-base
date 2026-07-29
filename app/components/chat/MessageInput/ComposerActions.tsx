'use client';

import { ArrowUp, X } from 'lucide-react';
import styles from './MessageInput.module.css';

type ComposerActionsProps = {
  onSend: () => void;
  onCancel?: () => void;
  sendDisabled: boolean;
  isEditVariant: boolean;
};

function ComposerActions({ onSend, onCancel, sendDisabled, isEditVariant }: ComposerActionsProps) {
  return (
    <div className={styles.rightActions}>
      {onCancel && (
        <button className={styles.cancelButton} onClick={onCancel} aria-label="Cancel edit">
          <X size={16} strokeWidth={1.5} />
        </button>
      )}
      <button
        className={styles.sendButton}
        onClick={onSend}
        disabled={sendDisabled}
        aria-label={isEditVariant ? 'Save edit' : 'Send message'}
      >
        <ArrowUp size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default ComposerActions;

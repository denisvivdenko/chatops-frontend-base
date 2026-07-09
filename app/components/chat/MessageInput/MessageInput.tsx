'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';
import styles from './MessageInput.module.css';

type MessageInputProps = {
  onSendAction: (content: string) => void;
  disableSend?: boolean;
  /** Seeds the textarea and switches this into a compact edit-in-place variant. */
  initialValue?: string;
  /** Presence of this prop is what puts the input into edit mode (adds a Cancel button, Escape-to-cancel). */
  onCancelAction?: () => void;
  autoFocus?: boolean;
};

export default function MessageInput({ onSendAction, disableSend, initialValue = '', onCancelAction, autoFocus }: MessageInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditVariant = onCancelAction !== undefined;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (autoFocus) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // Only meant to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSendAction(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disableSend) handleSend();
    } else if (e.key === 'Escape' && onCancelAction) {
      e.preventDefault();
      onCancelAction();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className={`${styles.wrapper} ${isEditVariant ? styles.compact : ''}`}>
      <div className={styles.container}>
        {/* left slot — future home of the + button */}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder="Type a message..."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.rightActions}>
          {onCancelAction && (
            <button className={styles.cancelButton} onClick={onCancelAction} aria-label="Cancel edit">
              <X size={16} strokeWidth={2} />
            </button>
          )}
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={disableSend || !value.trim()}
            aria-label={isEditVariant ? 'Save edit' : 'Send message'}
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

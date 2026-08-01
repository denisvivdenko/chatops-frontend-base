'use client';

import { memo, useMemo } from 'react';
import AddAttachmentMenu from './AddAttachmentMenu';
import AttachmentList from './AttachmentList';
import ComposerActions from './ComposerActions';
import { splitContentAndAttachments } from './attachments';
import { useAttachments } from './useAttachments';
import { useMessageComposer } from './useMessageComposer';
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

function MessageInput({ onSendAction, disableSend, initialValue = '', onCancelAction, autoFocus }: MessageInputProps) {
  const isEditVariant = onCancelAction !== undefined;

  // Only meant to run once, on mount — initialValue just seeds the composer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialSplit = useMemo(() => splitContentAndAttachments(initialValue), []);

  const { value, textareaRef, handleChange, send } = useMessageComposer({ initialValue: initialSplit.text, autoFocus });
  const { attachments, attachmentError, addImageAttachment, handleAttachmentPaste, removeAttachment, resetAttachments } =
    useAttachments(initialSplit.attachments);

  const handleSend = () => {
    const content = send(attachments);
    if (content === null) return;
    resetAttachments();
    onSendAction(content);
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

  return (
    <div className={`${styles.wrapper} ${isEditVariant ? styles.compact : ''}`}>
      <div className={styles.container}>
        <AddAttachmentMenu onPickImages={files => addImageAttachment(files, { keepNames: true })} />
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder="Type a message..."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handleAttachmentPaste}
        />
        <ComposerActions
          onSend={handleSend}
          onCancel={onCancelAction}
          sendDisabled={Boolean(disableSend) || (!value.trim() && attachments.length === 0)}
          isEditVariant={isEditVariant}
        />
      </div>
      <AttachmentList attachments={attachments} onRemove={removeAttachment} />
      {attachmentError && <div className={styles.attachmentError}>{attachmentError}</div>}
    </div>
  );
}

export default memo(MessageInput);

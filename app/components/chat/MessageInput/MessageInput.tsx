'use client';

import { memo } from 'react';
import AddAttachmentMenu from './AddAttachmentMenu';
import AttachmentList from './AttachmentList';
import ComposerActions from './ComposerActions';
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

  const { value, attachments, pasteError, textareaRef, handleChange, handlePaste, addImageFiles, removeAttachment, send } =
    useMessageComposer({ initialValue, autoFocus });

  const handleSend = () => {
    const content = send();
    if (content !== null) onSendAction(content);
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
        <AddAttachmentMenu onPickImages={files => addImageFiles(files, { keepNames: true })} />
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder="Type a message..."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <ComposerActions
          onSend={handleSend}
          onCancel={onCancelAction}
          sendDisabled={Boolean(disableSend) || (!value.trim() && attachments.length === 0)}
          isEditVariant={isEditVariant}
        />
      </div>
      <AttachmentList attachments={attachments} onRemove={removeAttachment} />
      {pasteError && <div className={styles.pasteError}>{pasteError}</div>}
    </div>
  );
}

export default memo(MessageInput);

'use client';

import { memo, useMemo, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';
import AddAttachmentMenu from './AddAttachmentMenu/AddAttachmentMenu';
import AttachmentList from './AttachmentList/AttachmentList';
import MessageTextArea from './MessageTextArea/MessageTextArea';
import { buildMessageContent, splitContentAndAttachments } from './attachments/attachments';
import { useAttachments } from './attachments/useAttachments';
import styles from './MessageInput.module.css';

type CreateModeProps = { mode?: 'create' };
type EditModeProps = {
  mode: 'edit';
  initialValue: string;
  onCancelAction: () => void;
};

type MessageInputProps = {
  onSendAction: (content: string) => void;
  disableSend?: boolean;
  autoFocus?: boolean;
} & (CreateModeProps | EditModeProps);

function MessageInput(props: MessageInputProps) {
  const { onSendAction, disableSend, autoFocus } = props;
  const initialValue = props.mode === 'edit' ? props.initialValue : '';

  const initialSplit = useMemo(() => splitContentAndAttachments(initialValue), [initialValue]);

  const [value, setValue] = useState(initialSplit.text);
  const { attachments, attachmentError, addImageAttachment, handleAttachmentPaste, removeAttachment, resetAttachments } =
    useAttachments(initialSplit.attachments);

  const isEditMode = props.mode === 'edit';
  const sendDisabled = Boolean(disableSend) || (!value.trim() && attachments.length === 0);

  const handleSend = () => {
    const content = buildMessageContent(value, attachments);
    if (content === null) return;
    setValue('');
    resetAttachments();
    onSendAction(content);
  };

  return (
    <div className={`${styles.wrapper} ${isEditMode ? styles.compact : ''}`}>
      <div className={styles.container}>
        <AddAttachmentMenu onPickImages={files => addImageAttachment(files, { keepNames: true })} />
        <MessageTextArea
          value={value}
          onChange={setValue}
          onSubmit={disableSend ? undefined : handleSend}
          onCancel={isEditMode ? props.onCancelAction : undefined}
          autoFocus={autoFocus}
          onPaste={handleAttachmentPaste}
        />
        <div className={styles.rightActions}>
          {isEditMode && (
            <button className={styles.cancelButton} onClick={props.onCancelAction} aria-label="Cancel edit">
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={sendDisabled}
            aria-label={isEditMode ? 'Save edit' : 'Send message'}
          >
            <ArrowUp size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <AttachmentList attachments={attachments} onRemove={removeAttachment} />
      {attachmentError && <div className={styles.attachmentError}>{attachmentError}</div>}
    </div>
  );
}

export default memo(MessageInput);

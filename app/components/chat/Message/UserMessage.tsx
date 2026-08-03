'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { Message } from '../../../types/chat';
import MessageInput from '../MessageInput/MessageInput';
import { useActiveChatActions } from '../../../context/ActiveChatContext';
import { isDocumentOnlyContent } from '../../../utils/documentLink';
import MarkdownContent from './MarkdownContent';
import styles from './UserMessage.module.css';

type UserMessageProps = {
  message: Message;
  editDisabled?: boolean;
};

export default function UserMessage({ message, editDisabled }: UserMessageProps) {
  const { modifyMessage } = useActiveChatActions();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className={styles.userWrapper}>
        <div className={styles.editWrapper}>
          <MessageInput
            mode="edit"
            initialValue={message.content}
            autoFocus
            onCancelAction={() => setIsEditing(false)}
            onSendAction={content => {
              setIsEditing(false);
              if (content !== message.content) modifyMessage(message.id, content);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.userWrapper}>
      <div className={styles.userGroup}>
        {!isDocumentOnlyContent(message.content) && (
          <button
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
            disabled={editDisabled}
            aria-label="Edit message"
          >
            <Pencil size={14} strokeWidth={1.5} />
          </button>
        )}
        <div className={styles.bubble}>
          <MarkdownContent content={message.content} />
        </div>
      </div>
    </div>
  );
}

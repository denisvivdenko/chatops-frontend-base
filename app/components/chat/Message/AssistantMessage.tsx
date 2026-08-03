'use client';

import { RotateCw } from 'lucide-react';
import type { Message } from '../../../types/chat';
import Spinner from '../../shared/Spinner/Spinner';
import { useActiveChatActions } from '../../../context/ActiveChatContext';
import MarkdownContent from './MarkdownContent';
import styles from './AssistantMessage.module.css';

type AssistantMessageProps = {
  message: Message;
};

export default function AssistantMessage({ message }: AssistantMessageProps) {
  const { retryMessage } = useActiveChatActions();

  if (message.status === 'failed') {
    return (
      <div className={styles.assistantWrapper}>
        {message.content && <MarkdownContent content={message.content} />}
        <div className={styles.errorRow}>
          <span>Something went wrong generating this response.</span>
          <button className={styles.retryButton} onClick={() => retryMessage(message.id)}>
            <RotateCw size={14} strokeWidth={1.5} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (message.status === 'pending' && !message.content) {
    return (
      <div className={styles.assistantWrapper}>
        <Spinner size={16} />
      </div>
    );
  }

  return (
    <div className={styles.assistantWrapper}>
      <MarkdownContent content={message.content} />
      {message.status === 'pending' && <span className={styles.cursor} />}
    </div>
  );
}

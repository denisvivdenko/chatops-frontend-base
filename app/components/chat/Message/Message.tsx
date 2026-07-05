import ReactMarkdown from 'react-markdown';
import { RotateCw } from 'lucide-react';
import type { Message } from '../../../types/chat';
import styles from './Message.module.css';

type MessageProps = {
  message: Message;
  onRetryAction?: () => void;
};

export default function Message({ message, onRetryAction }: MessageProps) {
  if (message.role === 'user') {
    return (
      <div className={styles.userWrapper}>
        <div className={styles.bubble}>{message.content}</div>
      </div>
    );
  }

  if (message.status === 'failed') {
    return (
      <div className={styles.assistantWrapper}>
        {message.content && <ReactMarkdown>{message.content}</ReactMarkdown>}
        <div className={styles.errorRow}>
          <span>Something went wrong generating this response.</span>
          <button className={styles.retryButton} onClick={onRetryAction}>
            <RotateCw size={14} strokeWidth={2} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.assistantWrapper}>
      <ReactMarkdown>{message.content}</ReactMarkdown>
      {message.status === 'pending' && <span className={styles.cursor} />}
    </div>
  );
}

import ReactMarkdown from 'react-markdown';
import type { Message } from '../../../types/chat';
import styles from './Message.module.css';

type MessageProps = {
  message: Message;
};

export default function Message({ message }: MessageProps) {
  if (message.role === 'user') {
    return (
      <div className={styles.userWrapper}>
        <div className={styles.bubble}>{message.content}</div>
      </div>
    );
  }

  return (
    <div className={styles.assistantWrapper}>
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  );
}

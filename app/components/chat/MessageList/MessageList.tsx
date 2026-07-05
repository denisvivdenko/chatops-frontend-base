import type { Message } from '../../../types/chat';
import MessageComponent from '../Message/Message';
import styles from './MessageList.module.css';

type MessageListProps = {
  messages: Message[];
  onRetryMessageAction?: (messageId: string) => void;
};

export default function MessageList({ messages, onRetryMessageAction }: MessageListProps) {
  return (
    <div className={styles.inner}>
      {messages.map(msg => (
        <MessageComponent
          key={msg.id}
          message={msg}
          onRetryAction={onRetryMessageAction ? () => onRetryMessageAction(msg.id) : undefined}
        />
      ))}
    </div>
  );
}

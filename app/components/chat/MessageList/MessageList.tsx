import type { Message } from '../../../types/chat';
import MessageComponent from '../Message/Message';
import styles from './MessageList.module.css';

type MessageListProps = {
  messages: Message[];
  onRetryMessageAction?: (messageId: string) => void;
  onModifyMessageAction?: (messageId: string, content: string) => void;
  editingBlocked?: boolean;
};

export default function MessageList({ messages, onRetryMessageAction, onModifyMessageAction, editingBlocked }: MessageListProps) {
  return (
    <div className={styles.inner}>
      {messages.map(msg => (
        <MessageComponent
          key={msg.id}
          message={msg}
          onRetryAction={onRetryMessageAction ? () => onRetryMessageAction(msg.id) : undefined}
          onModifyAction={onModifyMessageAction ? (content: string) => onModifyMessageAction(msg.id, content) : undefined}
          editDisabled={editingBlocked}
        />
      ))}
    </div>
  );
}

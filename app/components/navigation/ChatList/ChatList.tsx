import type { Chat } from '../../../types/chat';
import styles from './ChatList.module.css';

type ChatListProps = {
  chats: Chat[];
  activeChatId: string | null;
  onNewChatAction(): void;
  onSelectChatAction(id: string): void;
};

export default function ChatList({
  chats,
  activeChatId,
  onNewChatAction,
  onSelectChatAction,
}: ChatListProps) {
  return (
    <div className={styles.list}>
      <button
        className={`${styles.item} ${activeChatId === null ? styles.itemActive : ''}`}
        onClick={onNewChatAction}
      >
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className={styles.itemText}>New chat</span>
      </button>
      {chats.map(chat => (
        <button
          key={chat.id}
          className={`${styles.item} ${chat.id === activeChatId ? styles.itemActive : ''}`}
          onClick={() => onSelectChatAction(chat.id)}
          title={chat.title}
        >
          <span className={styles.itemText}>{chat.title}</span>
        </button>
      ))}
    </div>
  );
}

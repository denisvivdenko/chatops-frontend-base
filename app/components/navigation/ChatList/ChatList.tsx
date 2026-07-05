import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Chat } from '../../../types/chat';
import styles from './ChatList.module.css';

type ChatListProps = {
  chats: Chat[];
  activeChatId: string | null;
  onNavigateAction?(): void;
};

export default function ChatList({ chats, activeChatId, onNavigateAction }: ChatListProps) {
  return (
    <div className={styles.list}>
      <Link
        href="/"
        className={`${styles.item} ${activeChatId === null ? styles.itemActive : ''}`}
        onClick={onNavigateAction}
      >
        <Plus className={styles.icon} size={20} strokeWidth={1} />
        <span className={styles.itemText}>New chat</span>
      </Link>
      {chats.map(chat => (
        <Link
          key={chat.id}
          href={`/chat/${chat.id}`}
          className={`${styles.item} ${chat.id === activeChatId ? styles.itemActive : ''}`}
          onClick={onNavigateAction}
          title={chat.title}
        >
          <span className={styles.itemText}>{chat.title}</span>
        </Link>
      ))}
    </div>
  );
}

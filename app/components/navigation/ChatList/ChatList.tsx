import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Chat } from '../../../types/chat';
import ChatItemMenu from '../ChatItemMenu/ChatItemMenu';
import Spinner from '../../feedback/Spinner/Spinner';
import styles from './ChatList.module.css';

type ChatListProps = {
  chats: Chat[];
  activeChatId: string | null;
  isLoadingChats?: boolean;
  onNavigateAction?(): void;
  onDeleteChatAction(chatId: string): void;
};

export default function ChatList({ chats, activeChatId, isLoadingChats, onNavigateAction, onDeleteChatAction }: ChatListProps) {
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
      {isLoadingChats ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : (
        chats.map(chat => (
          <div key={chat.id} className={`${styles.itemRow} ${chat.id === activeChatId ? styles.itemRowActive : ''}`}>
            <Link
              href={`/chat/${chat.id}`}
              className={styles.item}
              onClick={onNavigateAction}
              title={chat.title}
            >
              <span className={styles.itemText}>{chat.title}</span>
            </Link>
            <ChatItemMenu onDeleteAction={() => onDeleteChatAction(chat.id)} />
          </div>
        ))
      )}
    </div>
  );
}

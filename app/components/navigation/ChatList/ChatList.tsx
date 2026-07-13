'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import ChatItemMenu from '../ChatItemMenu/ChatItemMenu';
import Spinner from '../../feedback/Spinner/Spinner';
import { useChats, useChatActions } from '../../../context/chatContext';
import styles from './ChatList.module.css';

export default function ChatList({ onNavigateAction }: { onNavigateAction?(): void }) {
  const { chats, activeChatId, isLoading } = useChats();
  const { deleteChat } = useChatActions();

  return (
    <div className={styles.list}>
      <Link
        href="/"
        className={`${styles.item} ${activeChatId === null ? styles.itemActive : ''}`}
        onClick={onNavigateAction}
      >
        <Plus className={styles.icon} size={20} strokeWidth={1.5} />
        <span className={styles.itemText}>New chat</span>
      </Link>
      {isLoading ? (
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
            <ChatItemMenu onDeleteAction={() => deleteChat(chat.id)} />
          </div>
        ))
      )}
    </div>
  );
}

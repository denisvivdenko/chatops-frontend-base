'use client';

import type { Chat } from '../../../types/chat';
import styles from './MobileMenu.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  onNewChatAction(): void;
  onSelectChatAction(id: string): void;
  onCloseAction(): void;
};

export default function MobileMenu({
  chats,
  activeChatId,
  onNewChatAction,
  onSelectChatAction,
  onCloseAction,
}: Props) {
  function handleNewChat() {
    onNewChatAction();
    onCloseAction();
  }

  function handleSelectChat(id: string) {
    onSelectChatAction(id);
    onCloseAction();
  }

  return (
    <div className={styles.menu}>
      <div className={styles.header}>
        <button className={styles.closeBtn} aria-label="Close menu" onClick={onCloseAction}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.chatList}>
        <button
          className={`${styles.chatItem} ${activeChatId === null ? styles.chatItemActive : ''}`}
          onClick={handleNewChat}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M7 2v10M2 7h10" />
          </svg>
          <span className={styles.chatItemText}>New chat</span>
        </button>
        {chats.map(chat => (
          <button
            key={chat.id}
            className={`${styles.chatItem} ${chat.id === activeChatId ? styles.chatItemActive : ''}`}
            onClick={() => handleSelectChat(chat.id)}
            title={chat.title}
          >
            <span className={styles.chatItemText}>{chat.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

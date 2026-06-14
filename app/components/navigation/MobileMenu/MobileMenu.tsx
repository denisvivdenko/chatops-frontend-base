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
      <nav className={styles.nav}>
        <button className={styles.item} onClick={handleNewChat}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>

        {chats.length > 0 && (
          <div className={styles.chatList}>
            {activeChatId === null && (
              <div className={`${styles.chatItem} ${styles.chatItemActive}`}>
                New chat
              </div>
            )}
            {chats.map(chat => (
              <button
                key={chat.id}
                className={`${styles.chatItem} ${chat.id === activeChatId ? styles.chatItemActive : ''}`}
                onClick={() => handleSelectChat(chat.id)}
                title={chat.title}
              >
                {chat.title}
              </button>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

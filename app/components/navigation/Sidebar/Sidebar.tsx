'use client';

import { useState } from 'react';
import type { Chat } from '../../../types/chat';
import styles from './Sidebar.module.css';

type SidebarProps = {
  chats: Chat[];
  activeChatId: string | null;
  onNewChatAction(): void;
  onSelectChatAction(id: string): void;
};

export default function Sidebar({
  chats,
  activeChatId,
  onNewChatAction,
  onSelectChatAction,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
      <button
        className={styles.item}
        aria-label="Toggle sidebar"
        onClick={() => setExpanded(v => !v)}
      >
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
        <span className={styles.label}>Collapse</span>
      </button>

      {expanded && (
        <div className={styles.chatList}>
          <button
            className={`${styles.chatItem} ${activeChatId === null ? styles.chatItemActive : ''}`}
            onClick={onNewChatAction}
          >
            <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className={styles.chatItemText}>New chat</span>
          </button>
          {chats.map(chat => (
            <button
              key={chat.id}
              className={`${styles.chatItem} ${chat.id === activeChatId ? styles.chatItemActive : ''}`}
              onClick={() => onSelectChatAction(chat.id)}
              title={chat.title}
            >
              <span className={styles.chatItemText}>{chat.title}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

'use client';

import { useState } from 'react';
import { PanelLeft, LogOut } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
import type { Chat } from '../../../types/chat';
import styles from './Sidebar.module.css';

type SidebarProps = {
  chats: Chat[];
  activeChatId: string | null;
  onLogoutAction(): void;
  onDeleteChatAction(chatId: string): void;
};

export default function Sidebar({ chats, activeChatId, onLogoutAction, onDeleteChatAction }: SidebarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
      <button
        className={styles.item}
        aria-label="Toggle sidebar"
        onClick={() => setExpanded(v => !v)}
      >
        <PanelLeft className={styles.icon} size={20} strokeWidth={1} />
        <span className={styles.label}>Collapse</span>
      </button>

      {expanded && (
        <div className={styles.chatListWrapper}>
          <ChatList chats={chats} activeChatId={activeChatId} onDeleteChatAction={onDeleteChatAction} />
        </div>
      )}

      <button
        className={styles.item}
        aria-label="Log out"
        onClick={onLogoutAction}
      >
        <LogOut className={styles.icon} size={20} strokeWidth={1} />
        <span className={styles.label}>Log out</span>
      </button>
    </aside>
  );
}

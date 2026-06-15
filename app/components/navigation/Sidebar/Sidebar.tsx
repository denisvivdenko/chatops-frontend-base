'use client';

import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
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
        <PanelLeft className={styles.icon} size={20} strokeWidth={1} />
        <span className={styles.label}>Collapse</span>
      </button>

      {expanded && (
        <div className={styles.chatListWrapper}>
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            onNewChatAction={onNewChatAction}
            onSelectChatAction={onSelectChatAction}
          />
        </div>
      )}
    </aside>
  );
}

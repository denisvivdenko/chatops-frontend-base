'use client';

import { useRef, useState } from 'react';
import { PanelLeft, LogOut } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
import type { Chat } from '../../../types/chat';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import styles from './Sidebar.module.css';

type SidebarProps = {
  chats: Chat[];
  activeChatId: string | null;
  isLoadingChats?: boolean;
  onLogoutAction(): void;
  onDeleteChatAction(chatId: string): void;
};

export default function Sidebar({ chats, activeChatId, isLoadingChats, onLogoutAction, onDeleteChatAction }: SidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const logoutRef = useRef<HTMLButtonElement>(null);
  const logout = useConfirmAction(logoutRef, onLogoutAction);

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
          <ChatList chats={chats} activeChatId={activeChatId} isLoadingChats={isLoadingChats} onDeleteChatAction={onDeleteChatAction} />
        </div>
      )}

      <button
        ref={logoutRef}
        className={`${styles.item} ${logout.confirming ? styles.itemDanger : ''}`}
        aria-label={logout.confirming ? 'Confirm log out' : 'Log out'}
        onClick={logout.handleClick}
      >
        <LogOut className={styles.icon} size={20} strokeWidth={1} />
        <span className={styles.label}>{logout.confirming ? 'Confirm logout' : 'Log out'}</span>
      </button>
    </aside>
  );
}

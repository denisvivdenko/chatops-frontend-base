'use client';

import { X, LogOut } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
import type { Chat } from '../../../types/chat';
import styles from './MobileMenu.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  onCloseAction(): void;
  onLogoutAction(): void;
  onDeleteChatAction(chatId: string): void;
  isClosing?: boolean;
  onAnimationEndAction?(): void;
};

export default function MobileMenu({
  chats,
  activeChatId,
  onCloseAction,
  onLogoutAction,
  onDeleteChatAction,
  isClosing,
  onAnimationEndAction,
}: Props) {
  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onAnimationEndAction?.();
  }

  return (
    <div
      className={`${styles.menu} ${isClosing ? styles.closing : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={styles.header}>
        <button className={styles.closeBtn} aria-label="Log out" onClick={onLogoutAction}>
          <LogOut size={20} />
        </button>
        <button className={styles.closeBtn} aria-label="Close menu" onClick={onCloseAction}>
          <X size={20} />
        </button>
      </div>
      <div className={styles.chatListWrapper}>
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          onNavigateAction={onCloseAction}
          onDeleteChatAction={onDeleteChatAction}
        />
      </div>
    </div>
  );
}

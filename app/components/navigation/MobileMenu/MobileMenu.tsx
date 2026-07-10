'use client';

import { useRef } from 'react';
import { X, LogOut } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
import type { Chat } from '../../../types/chat';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import styles from './MobileMenu.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  isLoadingChats?: boolean;
  onCloseAction(): void;
  onLogoutAction(): void;
  onDeleteChatAction(chatId: string): void;
  isClosing?: boolean;
  onAnimationEndAction?(): void;
};

export default function MobileMenu({
  chats,
  activeChatId,
  isLoadingChats,
  onCloseAction,
  onLogoutAction,
  onDeleteChatAction,
  isClosing,
  onAnimationEndAction,
}: Props) {
  const logoutRef = useRef<HTMLButtonElement>(null);
  const logout = useConfirmAction(logoutRef, onLogoutAction);

  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onAnimationEndAction?.();
  }

  return (
    <div
      className={`${styles.menu} ${isClosing ? styles.closing : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={styles.header}>
        <button
          ref={logoutRef}
          className={`${styles.closeBtn} ${logout.confirming ? styles.closeBtnDanger : ''}`}
          aria-label={logout.confirming ? 'Confirm log out' : 'Log out'}
          onClick={logout.handleClick}
        >
          <LogOut size={20} strokeWidth={1.5} />
        </button>
        <button className={styles.closeBtn} aria-label="Close menu" onClick={onCloseAction}>
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>
      <div className={styles.chatListWrapper}>
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          isLoadingChats={isLoadingChats}
          onNavigateAction={onCloseAction}
          onDeleteChatAction={onDeleteChatAction}
        />
      </div>
    </div>
  );
}

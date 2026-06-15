'use client';

import { useState } from 'react';
import type { Chat } from '../../types/chat';
import TopBar from '../TopBar/TopBar';
import MobileMenu from '../navigation/MobileMenu/MobileMenu';
import styles from './MobileLayout.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  onNewChatAction(): void;
  onSelectChatAction(id: string): void;
  children: React.ReactNode;
};

export default function MobileLayout({
  chats,
  activeChatId,
  onNewChatAction,
  onSelectChatAction,
  children,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={styles.main}>
      <div className={styles.headerBar}>
        <TopBar onMenuOpenAction={() => setIsMenuOpen(true)} />
      </div>
      {children}
      {isMenuOpen && (
        <MobileMenu
          chats={chats}
          activeChatId={activeChatId}
          onNewChatAction={onNewChatAction}
          onSelectChatAction={onSelectChatAction}
          onCloseAction={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}

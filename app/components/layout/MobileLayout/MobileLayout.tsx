'use client';

import { useState } from 'react';
import type { Chat } from '../../../types/chat';
import TopBar from '../TopBar/TopBar';
import MobileMenu from '../../navigation/MobileMenu/MobileMenu';
import styles from './MobileLayout.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  onNewChatAction(): void;
  onSelectChatAction(id: string): void;
  children: React.ReactNode;
};

type MenuState = 'closed' | 'open' | 'closing';

export default function MobileLayout({
  chats,
  activeChatId,
  onNewChatAction,
  onSelectChatAction,
  children,
}: Props) {
  const [menuState, setMenuState] = useState<MenuState>('closed');

  function handleClose() {
    setMenuState('closing');
  }

  function handleAnimationEnd() {
    if (menuState === 'closing') setMenuState('closed');
  }

  return (
    <div className={styles.main}>
      <div className={styles.headerBar}>
        <TopBar onMenuOpenAction={() => setMenuState('open')} />
      </div>
      {children}
      {menuState !== 'closed' && (
        <MobileMenu
          chats={chats}
          activeChatId={activeChatId}
          onNewChatAction={onNewChatAction}
          onSelectChatAction={onSelectChatAction}
          onCloseAction={handleClose}
          isClosing={menuState === 'closing'}
          onAnimationEndAction={handleAnimationEnd}
        />
      )}
    </div>
  );
}

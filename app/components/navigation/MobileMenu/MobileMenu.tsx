'use client';

import { X } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
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
          <X size={20} />
        </button>
      </div>
      <div className={styles.chatListWrapper}>
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          onNewChatAction={handleNewChat}
          onSelectChatAction={handleSelectChat}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Sidebar from '../navigation/Sidebar/Sidebar';
import TopBar from '../TopBar/TopBar';
import ChatPane from '../chat/ChatPane/ChatPane';
import MobileMenu from '../navigation/MobileMenu/MobileMenu';
import { useInMemoryChatService } from '../../hooks/useInMemoryChatService';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { chats, activeChatId, activeMessages, startNewChat, selectChat, sendMessage } =
    useInMemoryChatService();

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChatAction={startNewChat}
          onSelectChatAction={selectChat}
        />
      </div>
      <div className={styles.main}>
        <div className={styles.headerBar}>
          <TopBar onMenuOpenAction={() => setIsMenuOpen(true)} />
        </div>
        <ChatPane
          messages={activeMessages}
          onSendMessageAction={sendMessage}
        />
      </div>
      {isMenuOpen && (
        <MobileMenu
          chats={chats}
          activeChatId={activeChatId}
          onNewChatAction={startNewChat}
          onSelectChatAction={selectChat}
          onCloseAction={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}

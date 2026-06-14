'use client';

import { useState } from 'react';
import Sidebar from '../navigation/Sidebar/Sidebar';
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
      <ChatPane
        messages={activeMessages}
        onSendMessageAction={sendMessage}
        onMenuOpenAction={() => setIsMenuOpen(true)}
      />
      {isMenuOpen && <MobileMenu onCloseAction={() => setIsMenuOpen(false)} />}
    </div>
  );
}

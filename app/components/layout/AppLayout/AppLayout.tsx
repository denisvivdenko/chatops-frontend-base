'use client';

import { useInMemoryChatService } from '../../../hooks/useInMemoryChatService';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import DesktopLayout from '../DesktopLayout/DesktopLayout';
import MobileLayout from '../MobileLayout/MobileLayout';
import ChatPane from '../../chat/ChatPane/ChatPane';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const { chats, activeChatId, activeMessages, startNewChat, selectChat, sendMessage } =
    useInMemoryChatService();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <div className={styles.layout}>
      <Layout
        chats={chats}
        activeChatId={activeChatId}
        onNewChatAction={startNewChat}
        onSelectChatAction={selectChat}
      >
        <ChatPane
          messages={activeMessages}
          onSendMessageAction={sendMessage}
        />
      </Layout>
    </div>
  );
}

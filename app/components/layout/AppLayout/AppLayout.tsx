'use client';

import { useBackendChatService } from '../../../hooks/useBackendChatService';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import DesktopLayout from '../DesktopLayout/DesktopLayout';
import MobileLayout from '../MobileLayout/MobileLayout';
import ChatPane from '../../chat/ChatPane/ChatPane';
import styles from './AppLayout.module.css';

export default function AppLayout({ backendUrl }: { backendUrl: string }) {
  const { chats, activeChatId, activeMessages, sendMessage, retryMessage } =
    useBackendChatService(backendUrl);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <div className={styles.layout}>
      <Layout chats={chats} activeChatId={activeChatId}>
        <ChatPane
          messages={activeMessages}
          onSendMessageAction={sendMessage}
          onRetryMessageAction={
            activeChatId ? (messageId: string) => retryMessage(activeChatId, messageId) : undefined
          }
        />
      </Layout>
    </div>
  );
}

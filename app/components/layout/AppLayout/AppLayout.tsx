'use client';

import { useBackendChatService } from '../../../hooks/useBackendChatService';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import DesktopLayout from '../DesktopLayout/DesktopLayout';
import MobileLayout from '../MobileLayout/MobileLayout';
import ChatPane from '../../chat/ChatPane/ChatPane';
import NotFoundNotice from '../../feedback/NotFoundNotice/NotFoundNotice';
import styles from './AppLayout.module.css';

export default function AppLayout({ backendUrl }: { backendUrl: string }) {
  const {
    chats,
    activeChatId,
    activeMessages,
    sendMessage,
    retryMessage,
    deleteChat,
    logout,
    notFoundReason,
    goHome,
    dismissResourceNotFound,
  } = useBackendChatService(backendUrl);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <div className={styles.layout}>
      <Layout
        chats={chats}
        activeChatId={activeChatId}
        onLogoutAction={logout}
        onDeleteChatAction={deleteChat}
      >
        <ChatPane
          messages={activeMessages}
          onSendMessageAction={sendMessage}
          onRetryMessageAction={
            activeChatId ? (messageId: string) => retryMessage(activeChatId, messageId) : undefined
          }
        />
      </Layout>
      {notFoundReason && (
        <NotFoundNotice
          reason={notFoundReason}
          onGoHomeAction={goHome}
          onStayAction={dismissResourceNotFound}
        />
      )}
    </div>
  );
}

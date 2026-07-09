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
    isLoadingChats,
    isLoadingMessages,
    sendMessage,
    retryMessage,
    modifyMessage,
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
        isLoadingChats={isLoadingChats}
        onLogoutAction={logout}
        onDeleteChatAction={deleteChat}
      >
        <ChatPane
          messages={activeMessages}
          isLoadingMessages={isLoadingMessages}
          onSendMessageAction={sendMessage}
          onRetryMessageAction={
            activeChatId ? (messageId: string) => retryMessage(activeChatId, messageId) : undefined
          }
          onModifyMessageAction={
            activeChatId
              ? (messageId: string, content: string) => modifyMessage(activeChatId, messageId, content)
              : undefined
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

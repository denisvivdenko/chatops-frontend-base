'use client';

import { useMemo } from 'react';
import { useBackendChatService } from '../hooks/useBackendChatService';
import {
  ChatsContext,
  MessagesContext,
  StatusContext,
  ChatActionsContext,
} from './chatContext';

export default function ChatProvider({
  backendUrl,
  children,
}: {
  backendUrl: string;
  children: React.ReactNode;
}) {
  const {
    chats,
    activeChatId,
    activeMessages,
    isLoadingChats,
    isLoadingMessages,
    notFoundReason,
    sendMessage,
    retryMessage: retryAction,
    modifyMessage: modifyAction,
    deleteChat,
    logout,
    goHome,
    dismissResourceNotFound,
  } = useBackendChatService(backendUrl);

  const chatsValue = useMemo(
    () => ({ chats, activeChatId, isLoadingChats }),
    [chats, activeChatId, isLoadingChats],
  );

  const messagesValue = useMemo(
    () => ({ activeMessages, isLoadingMessages }),
    [activeMessages, isLoadingMessages],
  );

  const statusValue = useMemo(() => ({ notFoundReason }), [notFoundReason]);

  // retry/modify are bound to the active chat here so consumers (Message) need
  // only `useChatActions()` and stay out of ChatsContext. activeChatId is stable
  // during streaming, so these — and therefore the whole actions value — keep a
  // stable identity across tokens.
  const retryMessage = useMemo(
    () => (activeChatId ? (messageId: string) => retryAction(activeChatId, messageId) : null),
    [activeChatId, retryAction],
  );
  const modifyMessage = useMemo(
    () => (activeChatId ? (messageId: string, content: string) => modifyAction(activeChatId, messageId, content) : null),
    [activeChatId, modifyAction],
  );

  const actionsValue = useMemo(
    () => ({ sendMessage, deleteChat, logout, goHome, dismissResourceNotFound, retryMessage, modifyMessage }),
    [sendMessage, deleteChat, logout, goHome, dismissResourceNotFound, retryMessage, modifyMessage],
  );

  return (
    <ChatActionsContext value={actionsValue}>
      <StatusContext value={statusValue}>
        <ChatsContext value={chatsValue}>
          <MessagesContext value={messagesValue}>{children}</MessagesContext>
        </ChatsContext>
      </StatusContext>
    </ChatActionsContext>
  );
}

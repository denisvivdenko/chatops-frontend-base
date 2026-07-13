'use client';

import { useReducer, useMemo } from 'react';
import { appStateReducer, initialAppState } from '../hooks/chat/appState';
import { useChatController } from '../hooks/chat/useChatController';
import { useSession } from '../hooks/useSession';
import { useError } from '../hooks/chat/useError';
import { useNavigation } from '../hooks/useNavigation';
import {
  SessionContext,
  NavigationContext,
  ErrorContext,
  ChatActionsContext,
  ChatsContext,
  MessagesContext,
  type SessionValue,
  type NavigationValue,
  type ErrorValue,
  type ChatsValue,
  type MessagesValue,
  type ChatActionsValue,
} from './chatContext';

export default function ChatProvider({ backendUrl, children }: { backendUrl: string; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  const { goHome } = useNavigation();
  const { dismissError } = useError(dispatch);
  const { logout } = useSession(dispatch, backendUrl);
  const { deleteChat, sendMessage, modifyMessage, retryMessage } = useChatController(state.session.id, dispatch, backendUrl);

  const navigation: NavigationValue = useMemo(() => ({ goHome }), [goHome]);
  const session: SessionValue = useMemo(() => ({ logout }), [logout]);
  const error: ErrorValue = useMemo(
    () => ({ message: state.error.message, type: state.error.type, dismissError }),
    [state.error, dismissError],
  );
  const chatActions: ChatActionsValue = useMemo(
    () => ({ deleteChat, sendMessage, retryMessage, modifyMessage }),
    [deleteChat, sendMessage, retryMessage, modifyMessage],
  );
  const chats: ChatsValue = useMemo(
    () => ({ chats: state.chat.fetchedChats, activeChatId: state.chat.activeChatId, isLoading: state.chat.isLoading }),
    [state.chat],
  );
  const messages: MessagesValue = useMemo(
    () => ({ messages: state.messages.fetchedMessages, isLoading: state.messages.isLoading }),
    [state.messages],
  );

  return (
    <SessionContext value={session}>
      <NavigationContext value={navigation}>
        <ErrorContext value={error}>
          <ChatActionsContext value={chatActions}>
            <ChatsContext value={chats}>
              <MessagesContext value={messages}>{children}</MessagesContext>
            </ChatsContext>
          </ChatActionsContext>
        </ErrorContext>
      </NavigationContext>
    </SessionContext>
  );
}

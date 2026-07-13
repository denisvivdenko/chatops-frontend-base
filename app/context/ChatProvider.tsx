'use client';

import { useMemo } from 'react';
import { useChatController } from '../hooks/chat/useChatController';
import {
  ChatsContext,
  MessagesContext,
  ChatActionsContext,
} from './chatContext';

export default function ChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, dispatch } = useReducer(appStateReducer, initialAppState);
  const { goHome } = useNavigation();
  const { dismissError } = useError(dispatch);
  const { logout } = useSession(dispatch);
  const { deleteChat, sendMessage, modifyMessage, retryMessage } = useChatController(state.session.id, dispatch);

  const navigation: NavigationValue = useMemo(() => ({ goHome }), [goHome])
  const session: SessionValue = useMemo(() => ({ logout }), [logout]);
  const error: ErrorValue = useMemo(
    () => ({ message: state.error.message, type: state.error.type, dismissError }),
    [state.error, dismissError]
  );
  const chatActions: ChatActionsValue = useMemo(
    () => ({ deleteChat, sendMessage, retryMessage, modifyMessage }),
    [deleteChat, sendMessage, retryMessage, modifyMessage]
  );
  const chats: ChatsValue = useMemo(
    () => ({ chats: state.chat.fetchedChats, isLoading: state.chat.isLoading }),
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

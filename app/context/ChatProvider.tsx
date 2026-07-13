'use client';

import { useChatController } from '../hooks/chat/useChatController';
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
  const { chats, messages, status, actions } = useChatController(backendUrl);

  return (
    <ChatActionsContext value={actions}>
      <StatusContext value={status}>
        <ChatsContext value={chats}>
          <MessagesContext value={messages}>{children}</MessagesContext>
        </ChatsContext>
      </StatusContext>
    </ChatActionsContext>
  );
}

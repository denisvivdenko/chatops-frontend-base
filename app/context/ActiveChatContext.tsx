'use client';

import { createContext, useContext, useMemo, useRef, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Message } from '../types/chat';
import { useBackendApi } from '../hooks/useBackendApi';
import { useChats } from './ChatContext';
import { useErrorReporter } from './ErrorContext';

interface MessagesState {
  messages: Message[];
  isLoading: boolean;
}

interface ActiveChatActions {
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  modifyMessage: (messageId: string, content: string) => Promise<void>;
}

// ---------- Contexts ----------

const MessagesStateContext = createContext<MessagesState | undefined>(undefined);
const ActiveChatActionsContext = createContext<ActiveChatActions | undefined>(undefined);

const messagesQueryKey = (chatId: string) => ['messages', chatId] as const;

// ---------- Provider ----------

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const { activeChatId } = useChats();
  const backendApi = useBackendApi();
  const { reportError } = useErrorReporter();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: activeChatId ? messagesQueryKey(activeChatId) : ['messages', 'none'],
    queryFn: () => backendApi.fetchMessages(activeChatId as string),
    enabled: activeChatId !== null,
  });

  function updateMessage(chatId: string, messageId: string, patch: Partial<Message>) {
    queryClient.setQueryData<Message[]>(messagesQueryKey(chatId), (prev = []) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
    );
  }

  async function streamAndSync(chatId: string, message: Message) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    updateMessage(chatId, message.id, { status: 'pending', content: '' });

    try {
      await backendApi.streamMessage(chatId, message.id, controller.signal, (token) => {
        queryClient.setQueryData<Message[]>(messagesQueryKey(chatId), (prev = []) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, content: m.content + token } : m
          )
        );
      });
      updateMessage(chatId, message.id, { status: 'complete' });
    } catch (err) {
      updateMessage(chatId, message.id, { status: 'failed' });
      reportError('Message failed to stream', (err as Error).message);
    }
  }

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChatId) throw new Error('No active chat');
      return backendApi.postMessage(activeChatId, content);
    },
    onSuccess: (newMessage) => {
      if (!activeChatId) return;
      queryClient.setQueryData<Message[]>(messagesQueryKey(activeChatId), (prev = []) => [
        ...prev,
        newMessage,
      ]);
      streamAndSync(activeChatId, newMessage);
    },
    onError: (err) => {
      reportError('Failed to send message', (err as Error).message);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!activeChatId) throw new Error('No active chat');
      return backendApi.retryMessage(activeChatId, messageId);
    },
    onSuccess: (updated) => {
      if (!activeChatId) return;
      updateMessage(activeChatId, updated.id, updated);
      streamAndSync(activeChatId, updated);
    },
    onError: (err) => {
      reportError('Failed to retry message', (err as Error).message);
    },
  });

  const modifyMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      if (!activeChatId) throw new Error('No active chat');
      return backendApi.modifyMessage(activeChatId, messageId, content);
    },
    onSuccess: (updated) => {
      if (!activeChatId) return;
      updateMessage(activeChatId, updated.id, updated);
      streamAndSync(activeChatId, updated);
    },
    onError: (err) => {
      reportError('Failed to modify message', (err as Error).message);
    },
  });

  const state = useMemo<MessagesState>(
    () => ({ messages, isLoading }),
    [messages, isLoading]
  );

  const actions = useMemo<ActiveChatActions>(
    () => ({
      sendMessage: (content: string) => sendMutation.mutateAsync(content).then(() => {}),
      retryMessage: (messageId: string) => retryMutation.mutateAsync(messageId).then(() => {}),
      modifyMessage: (messageId: string, content: string) =>
        modifyMutation.mutateAsync({ messageId, content }).then(() => {}),
    }),
    [sendMutation, retryMutation, modifyMutation]
  );

  return (
    <MessagesStateContext.Provider value={state}>
      <ActiveChatActionsContext.Provider value={actions}>
        {children}
      </ActiveChatActionsContext.Provider>
    </MessagesStateContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesStateContext);
  if (!ctx) throw new Error('useMessages must be used within ActiveChatProvider');
  return ctx;
}

export function useActiveChatActions() {
  const ctx = useContext(ActiveChatActionsContext);
  if (!ctx) throw new Error('useActiveChatActions must be used within ActiveChatProvider');
  return ctx;
}
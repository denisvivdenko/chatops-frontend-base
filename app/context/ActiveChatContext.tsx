'use client';

import { createContext, useContext, useEffect, useMemo, useRef, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Message } from '../types/chat';
import type { StreamOutcome } from '../services/backendService';
import { useBackendApi } from '../hooks/useBackendApi';
import { useChats } from './ChatContext';
import { useErrorReporter } from './ErrorContext';
import { NotFoundError, AccessDeniedError } from '../services/errors';

interface MessagesState {
  messages: Message[];
  isLoading: boolean;
}

interface ActiveChatActions {
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  modifyMessage: (messageId: string, content: string) => Promise<void>;
}

const MessagesStateContext = createContext<MessagesState | undefined>(undefined);
const ActiveChatActionsContext = createContext<ActiveChatActions | undefined>(undefined);

const messagesQueryKey = (chatId: string) => ['messages', chatId] as const;

// The backend replays a stream from its first token, so a connection that drops before any
// terminal event can be resumed by reopening and rebuilding the content from scratch.
const MAX_STREAM_ATTEMPTS = 3;

function optimisticUserMessage(content: string): Message {
  return {
    id: `local-${Date.now()}`,
    role: 'user',
    status: 'complete',
    content,
    createdAt: Date.now(),
  };
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const { activeChatId } = useChats();
  const backendApi = useBackendApi();
  const { reportError } = useErrorReporter();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  const { data: messages = [], isLoading, isError, error } = useQuery({
    queryKey: activeChatId ? messagesQueryKey(activeChatId) : ['messages', 'none'],
    queryFn: () => backendApi.fetchMessages(activeChatId as string),
    enabled: activeChatId !== null,
    retry: false,
  });

  // Chats vanish (deleted) or belong to someone else, so a 404/403 here is expected
  // user-facing input, not a transient failure worth retrying.
  useEffect(() => {
    if (!isError) return;
    if (error instanceof NotFoundError || error instanceof AccessDeniedError) {
      reportError("This chat doesn't exist or you don't have access to it.");
    } else {
      reportError('Failed to load chat', (error as Error).message);
    }
  }, [isError, error, reportError]);

  function setMessages(chatId: string, update: (prev: Message[]) => Message[]) {
    queryClient.setQueryData<Message[]>(messagesQueryKey(chatId), (prev = []) => update(prev));
  }

  function updateMessage(chatId: string, messageId: string, patch: Partial<Message>) {
    setMessages(chatId, (prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)));
  }

  async function streamAndSync(chatId: string, messageId: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    streamingIdRef.current = messageId;

    try {
      for (let attempt = 1; attempt <= MAX_STREAM_ATTEMPTS; attempt++) {
        updateMessage(chatId, messageId, { status: 'pending', content: '' });

        let outcome: StreamOutcome | null = null;
        try {
          outcome = await backendApi.streamMessage(chatId, messageId, controller.signal, (token) => {
            setMessages(chatId, (prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, content: m.content + token } : m))
            );
          });
        } catch {
          if (controller.signal.aborted) return;
          // Stream threw before any terminal event - fall through and ask the backend
          // what actually happened instead of guessing.
        }

        if (outcome?.status === 'complete') {
          updateMessage(chatId, messageId, { status: 'complete' });
          return;
        }

        // Either the stream threw, or it reported 'failed' - don't trust either as final,
        // refetch and react to whatever the backend actually has.
        const fresh = await queryClient.fetchQuery({
          queryKey: messagesQueryKey(chatId),
          queryFn: () => backendApi.fetchMessages(chatId),
        });
        if (controller.signal.aborted) return;
        const current = fresh.find((m) => m.id === messageId);
        if (current?.status !== 'pending') return; // backend already resolved it - fetch synced the outcome

        // Still pending -> loop around and open a new stream.
      }

      updateMessage(chatId, messageId, { status: 'failed' });
    } catch {
      if (controller.signal.aborted) return;
      updateMessage(chatId, messageId, { status: 'failed' });
    } finally {
      if (streamingIdRef.current === messageId) streamingIdRef.current = null;
    }
  }

  const lastMessage = messages[messages.length - 1];
  const pendingAssistantId =
    lastMessage?.role === 'assistant' && lastMessage.status === 'pending' ? lastMessage.id : null;

  // Every path that produces a reply — creating a chat, sending, retrying, modifying, or just
  // opening a chat whose reply is still being generated — ends with a pending assistant message
  // at the tail of the list, so attaching the stream here covers all of them at once.
  useEffect(() => {
    if (!activeChatId || !pendingAssistantId) return;
    if (streamingIdRef.current === pendingAssistantId) return;
    streamAndSync(activeChatId, pendingAssistantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, pendingAssistantId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChatId) throw new Error('No active chat');
      return backendApi.postMessage(activeChatId, content);
    },
    onMutate: (content: string) => {
      if (!activeChatId) return;
      const optimistic = optimisticUserMessage(content);
      setMessages(activeChatId, (prev) => [...prev, optimistic]);
      return { chatId: activeChatId, optimisticId: optimistic.id };
    },
    onSuccess: (assistantMessage, _content, context) => {
      if (!context) return;
      setMessages(context.chatId, (prev) => [...prev, assistantMessage]);
    },
    onError: (err, _content, context) => {
      if (context) {
        setMessages(context.chatId, (prev) => prev.filter((m) => m.id !== context.optimisticId));
      }
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
    // The backend discards every message after the edited one and answers with a brand new
    // assistant message, so the local list has to be truncated to match.
    onSuccess: (assistantMessage, { messageId, content }) => {
      if (!activeChatId) return;
      setMessages(activeChatId, (prev) => {
        const index = prev.findIndex((m) => m.id === messageId);
        if (index === -1) return [...prev, assistantMessage];
        const kept = prev.slice(0, index + 1);
        kept[index] = { ...kept[index], content };
        return [...kept, assistantMessage];
      });
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

'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Chat } from '../types/chat';
import { useBackendApi } from '../hooks/useBackendApi';
import { useErrorReporter } from './ErrorContext';

interface ChatsState {
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
}

interface ChatActions {
  createChat: (message: string) => Promise<Chat>;
  deleteChat: (id: string) => Promise<void>;
  refreshChats: () => void;
}

const ChatsStateContext = createContext<ChatsState | undefined>(undefined);
const ChatActionsContext = createContext<ChatActions | undefined>(undefined);

const CHATS_QUERY_KEY = ['chats'] as const;

export function ChatProvider({ children }: { children: ReactNode }) {
  const backendApi = useBackendApi();
  const { reportError } = useErrorReporter();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const activeChatId = useMemo(() => {
    const match = pathname?.match(/^\/chat\/(.+)$/);
    return match ? match[1] : null;
  }, [pathname]);

  const { data: chats = [], isLoading } = useQuery({
    queryKey: CHATS_QUERY_KEY,
    queryFn: backendApi.fetchChats,
  });

  const createMutation = useMutation({
    mutationFn: (message: string) => backendApi.createChat(message),
    onSuccess: (newChat) => {
      queryClient.setQueryData<Chat[]>(CHATS_QUERY_KEY, (prev = []) => [newChat, ...prev]);
      router.push(`/chat/${newChat.id}`);
    },
    onError: (err) => {
      reportError('Failed to start new chat', (err as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => backendApi.deleteChat(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: CHATS_QUERY_KEY });
      const previous = queryClient.getQueryData<Chat[]>(CHATS_QUERY_KEY);

      queryClient.setQueryData<Chat[]>(CHATS_QUERY_KEY, (prev = []) =>
        prev.filter((c) => c.id !== id)
      );

      return { previous, deletedId: id };
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CHATS_QUERY_KEY, context.previous);
      }
      reportError('Failed to delete chat', (err as Error).message);
    },
    onSuccess: (_data, id) => {
      if (activeChatId === id) {
        router.push('/');
      }
    },
  });

  const state = useMemo<ChatsState>(
    () => ({ chats, activeChatId, isLoading }),
    [chats, activeChatId, isLoading]
  );

  const actions = useMemo<ChatActions>(
    () => ({
      createChat: (message: string) => createMutation.mutateAsync(message),
      deleteChat: (id: string) => deleteMutation.mutateAsync(id),
      refreshChats: () => queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY }),
    }),
    [createMutation, deleteMutation, queryClient]
  );

  return (
    <ChatsStateContext.Provider value={state}>
      <ChatActionsContext.Provider value={actions}>
        {children}
      </ChatActionsContext.Provider>
    </ChatsStateContext.Provider>
  );
}

export function useChats() {
  const ctx = useContext(ChatsStateContext);
  if (!ctx) throw new Error('useChats must be used within ChatProvider');
  return ctx;
}

export function useChatActions() {
  const ctx = useContext(ChatActionsContext);
  if (!ctx) throw new Error('useChatActions must be used within ChatProvider');
  return ctx;
}
'use client';

import { createContext, use } from 'react';
import type { Chat, Message } from '../types/chat';

/**
 * State is split by domain so a change to one slice only re-renders that slice's
 * consumers. In particular `MessagesContext` is the only thing that changes while
 * a reply streams token-by-token — the sidebar (ChatsContext) and every action
 * trigger (ChatActionsContext) sit the stream out.
 */

export type ChatsValue = {
  chats: Chat[];
  activeChatId: string | null;
  isLoadingChats: boolean;
};

export type MessagesValue = {
  activeMessages: Message[];
  isLoadingMessages: boolean;
};

export type StatusValue = {
  notFoundReason: 'not-found' | 'forbidden' | null;
};

export type ChatActionsValue = {
  sendMessage: (content: string) => void;
  deleteChat: (chatId: string) => void;
  logout: () => void;
  goHome: () => void;
  dismissResourceNotFound: () => void;
  // Route-bound to the active chat; null on the home route (no chat to act on),
  // which mirrors the old `activeChatId ? … : undefined` gating in AppLayout.
  retryMessage: ((messageId: string) => void) | null;
  modifyMessage: ((messageId: string, content: string) => void) | null;
};

export const ChatsContext = createContext<ChatsValue | null>(null);
export const MessagesContext = createContext<MessagesValue | null>(null);
export const StatusContext = createContext<StatusValue | null>(null);
export const ChatActionsContext = createContext<ChatActionsValue | null>(null);

function useRequired<T>(context: React.Context<T | null>, name: string): T {
  const value = use(context);
  if (value === null) throw new Error(`${name} must be used within a ChatProvider`);
  return value;
}

export const useChats = () => useRequired(ChatsContext, 'useChats');
export const useMessages = () => useRequired(MessagesContext, 'useMessages');
export const useChatStatus = () => useRequired(StatusContext, 'useChatStatus');
export const useChatActions = () => useRequired(ChatActionsContext, 'useChatActions');

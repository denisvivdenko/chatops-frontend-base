'use client';

import { createContext, use } from 'react';
import type { Chat, Message } from '../types/chat';
import type { ErrorType } from '../hooks/chat/appState';

/**
 * State and actions are split by domain so a change to one slice only re-renders
 * that slice's consumers. In particular `MessagesContext` is the only thing that
 * changes while a reply streams token-by-token — the sidebar (`ChatsContext`) and
 * every action trigger (`ChatActionsContext`) sit the stream out.
 */

export type SessionValue = {
  logout: () => void;
};

export type NavigationValue = {
  goHome: () => void;
};

export type ErrorValue = {
  message: string | null;
  type: ErrorType | null;
  dismissError: () => void;
};

export type ChatsValue = {
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
};

export type MessagesValue = {
  messages: Message[];
  isLoading: boolean;
};

export type ChatActionsValue = {
  sendMessage: (content: string) => void;
  deleteChat: (chatId: string) => void;
  // Route-bound to the active chat; null on the home route (no chat to act on).
  retryMessage: ((messageId: string) => void) | null;
  modifyMessage: ((messageId: string, content: string) => void) | null;
};

export const SessionContext = createContext<SessionValue | null>(null);
export const NavigationContext = createContext<NavigationValue | null>(null);
export const ErrorContext = createContext<ErrorValue | null>(null);
export const ChatsContext = createContext<ChatsValue | null>(null);
export const MessagesContext = createContext<MessagesValue | null>(null);
export const ChatActionsContext = createContext<ChatActionsValue | null>(null);

function useRequired<T>(context: React.Context<T | null>, name: string): T {
  const value = use(context);
  if (value === null) throw new Error(`${name} must be used within a ChatProvider`);
  return value;
}

export const useSessionValue = () => useRequired(SessionContext, 'useSessionValue');
export const useNavigationValue = () => useRequired(NavigationContext, 'useNavigationValue');
export const useErrorValue = () => useRequired(ErrorContext, 'useErrorValue');
export const useChats = () => useRequired(ChatsContext, 'useChats');
export const useMessages = () => useRequired(MessagesContext, 'useMessages');
export const useChatActions = () => useRequired(ChatActionsContext, 'useChatActions');

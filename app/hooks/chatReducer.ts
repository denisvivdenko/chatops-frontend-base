import type { Chat, Message } from '../types/chat';

/**
 * The whole chat domain in one place. Every transition below is expressed as an
 * action so `chatReducer` is the single source of truth for how state changes.
 *
 * Not in here on purpose:
 *  - `activeChatId` is URL state (derived from `useParams` in the hook), not app state.
 *  - `sessionReady` is bootstrap plumbing that only gates effects.
 *  - the pending-new-chat overlay is derived in the hook, since it depends on `activeChatId`.
 */
export type ChatState = {
  chats: Chat[];
  activeMessages: Message[];
  pendingNewChatMessage: Message | null;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  notFoundReason: 'not-found' | 'forbidden' | null;
};

export const initialChatState: ChatState = {
  chats: [],
  activeMessages: [],
  pendingNewChatMessage: null,
  isLoadingChats: true,
  isLoadingMessages: false,
  notFoundReason: null,
};

/**
 * The messages to render for the current route. On a real chat it's the message
 * buffer; on the home route (no chat id yet) it's just the optimistic pending
 * message, if any. Reading `activeChatId` here is what makes `activeMessages`
 * stale-safe: the buffer can still hold a previous/just-deleted chat's messages
 * and the home route simply won't show them.
 */
export function selectActiveMessages(state: ChatState, activeChatId: string | null): Message[] {
  if (activeChatId !== null) return state.activeMessages;
  return state.pendingNewChatMessage ? [state.pendingNewChatMessage] : [];
}

export type ChatAction =
  // chats
  | { type: 'chatsLoaded'; chats: Chat[] }
  | { type: 'chatsLoadFinished' }
  | { type: 'newChatPending'; message: Message }
  | { type: 'newChatCreated'; chat: Chat }
  | { type: 'newChatCleared' }
  | { type: 'chatDeleted'; chatId: string }
  // messages: loading
  | { type: 'messagesLoading' }
  | { type: 'messagesIdle' }
  | { type: 'messagesLoaded'; messages: Message[] }
  | { type: 'messagesLoadedStreaming'; messages: Message[]; streamingId: string }
  | { type: 'messagesReplaced'; messages: Message[] }
  // messages: single-message transitions
  | { type: 'userMessageAppended'; message: Message }
  | { type: 'assistantMessageAppended'; message: Message }
  | { type: 'tokenReceived'; messageId: string; token: string }
  | { type: 'messageMarkedFailed'; messageId: string }
  | { type: 'messageReplaced'; messageId: string; message: Message }
  | { type: 'messageModified'; messageId: string; content: string; assistantMessage: Message }
  // resource-not-found banner
  | { type: 'resourceNotFound'; reason: 'not-found' | 'forbidden' }
  | { type: 'resourceNotFoundDismissed' }
  // logout
  | { type: 'reset' };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatsLoaded':
      // Just the list. `isLoadingChats` is owned solely by the initial-load effect
      // (via `chatsLoadFinished`) so later refreshes don't flip the spinner.
      return { ...state, chats: action.chats };
    case 'chatsLoadFinished':
      return { ...state, isLoadingChats: false };
    case 'newChatPending':
      return { ...state, pendingNewChatMessage: action.message };
    case 'newChatCreated':
      return { ...state, chats: [action.chat, ...state.chats], pendingNewChatMessage: null };
    case 'newChatCleared':
      return { ...state, pendingNewChatMessage: null };
    case 'chatDeleted':
      return { ...state, chats: state.chats.filter(c => c.id !== action.chatId) };

    case 'messagesLoading':
      return { ...state, isLoadingMessages: true, notFoundReason: null };
    case 'messagesIdle':
      return { ...state, isLoadingMessages: false };
    case 'messagesLoaded':
      return { ...state, activeMessages: action.messages, isLoadingMessages: false };
    case 'messagesLoadedStreaming':
      return {
        ...state,
        activeMessages: action.messages.map(m =>
          m.id === action.streamingId ? { ...m, content: '' } : m
        ),
        isLoadingMessages: false,
      };
    case 'messagesReplaced':
      return { ...state, activeMessages: action.messages };

    case 'userMessageAppended':
    case 'assistantMessageAppended':
      return { ...state, activeMessages: [...state.activeMessages, action.message] };
    case 'tokenReceived':
      return {
        ...state,
        activeMessages: state.activeMessages.map(m =>
          m.id === action.messageId
            ? { ...m, content: m.content ? m.content + action.token : action.token }
            : m
        ),
      };
    case 'messageMarkedFailed':
      return {
        ...state,
        activeMessages: state.activeMessages.map(m =>
          m.id === action.messageId ? { ...m, status: 'failed' } : m
        ),
      };
    case 'messageReplaced':
      return {
        ...state,
        activeMessages: state.activeMessages.map(m =>
          m.id === action.messageId ? action.message : m
        ),
      };
    case 'messageModified': {
      const idx = state.activeMessages.findIndex(m => m.id === action.messageId);
      if (idx === -1) return state;
      return {
        ...state,
        activeMessages: [
          ...state.activeMessages.slice(0, idx),
          { ...state.activeMessages[idx], content: action.content },
          action.assistantMessage,
        ],
      };
    }

    case 'resourceNotFound':
      return { ...state, notFoundReason: action.reason };
    case 'resourceNotFoundDismissed':
      return { ...state, notFoundReason: null };

    case 'reset':
      return { ...state, activeMessages: [], pendingNewChatMessage: null };
  }
}

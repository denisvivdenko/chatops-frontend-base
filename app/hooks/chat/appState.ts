import type { Chat, Message } from '../../types/chat';

/**
 * The whole app state as one store, split into domain sub-slices. Each sub-reducer
 * owns one slice and returns its input unchanged for actions it doesn't handle — so
 * an unrelated dispatch (e.g. a streamed token) leaves the other slices' references
 * intact, which is what lets each context slice re-render in isolation.
 *
 * Not in here on purpose:
 *  - `activeChatId` is URL state (read from `useParams`), not app state.
 */

// ── session ──────────────────────────────────────────────────────────────────
// `id` is a client-side marker, not a backend id: null until the anonymous session
// is established, then a fresh value on every (re)establish. Gating loads on it and
// re-keying effects to it is what makes logout reload everything for the new identity.
export type SessionState = { id: string | null };
export const initialSessionState: SessionState = { id: null };

// ── error (resource-not-found banner) ────────────────────────────────────────
export type ErrorType = 'not-found' | 'forbidden';
export type ErrorDismissedReason = 'url-changed' | 'user-input';
export type ErrorState = { type: ErrorType | null; message: string | null };
export const initialErrorState: ErrorState = { type: null, message: null };

const ERROR_MESSAGES: Record<ErrorType, string> = {
  'not-found': "This chat couldn't be found.",
  forbidden: "This chat belongs to someone else, so you can't access it.",
};

// ── chat list ────────────────────────────────────────────────────────────────
// `activeChatId` mirrors the URL, kept in sync by the controller (its sole writer)
// so components read it from the store rather than reaching for `useParams`.
export type ChatState = { fetchedChats: Chat[]; activeChatId: string | null; isLoading: boolean };
export const initialChatState: ChatState = { fetchedChats: [], activeChatId: null, isLoading: true };

// ── messages ─────────────────────────────────────────────────────────────────
// `fetchedMessages` is the display list for the current route, maintained by the
// controller: the loaded buffer for a real chat, the optimistic message on the home
// route, and cleared when the route has no chat. The provider passes it straight
// through — deciding what to show is the controller's job, not the provider's.
export type MessagesState = {
  fetchedMessages: Message[];
  isLoading: boolean;
};
export const initialMessagesState: MessagesState = {
  fetchedMessages: [],
  isLoading: false,
};

export type AppState = {
  session: SessionState;
  error: ErrorState;
  chat: ChatState;
  messages: MessagesState;
};

export const initialAppState: AppState = {
  session: initialSessionState,
  error: initialErrorState,
  chat: initialChatState,
  messages: initialMessagesState,
};

export type AppAction =
  // session
  | { type: 'sessionReady'; id: string }   // bootstrap: mark the identity, wipe nothing
  | { type: 'sessionReset'; id: string }    // logout: new identity, wipe all data (root reducer)
  // error
  | { type: 'errorRaised'; reason: ErrorType }
  | { type: 'errorDismissed'; reason: ErrorDismissedReason }
  // chat list
  | { type: 'activeChatChanged'; activeChatId: string | null }
  | { type: 'chatsLoaded'; chats: Chat[] }
  | { type: 'chatsLoadFinished' }
  | { type: 'chatCreated'; chat: Chat }
  | { type: 'chatDeleted'; chatId: string }
  // messages: loading
  | { type: 'messagesLoading' }
  | { type: 'messagesIdle' }
  | { type: 'messagesCleared' }
  | { type: 'messagesLoaded'; messages: Message[] }
  | { type: 'messagesLoadedStreaming'; messages: Message[]; streamingId: string }
  | { type: 'messagesReplaced'; messages: Message[] }
  // messages: new-chat optimistic overlay
  | { type: 'newChatPending'; message: Message }
  | { type: 'newChatCleared' }
  // messages: single-message transitions
  | { type: 'userMessageAppended'; message: Message }
  | { type: 'assistantMessageAppended'; message: Message }
  | { type: 'tokenReceived'; messageId: string; token: string }
  | { type: 'messageReplaced'; messageId: string; message: Message }
  | { type: 'messageModified'; messageId: string; content: string; assistantMessage: Message };

function sessionReducer(state: SessionState, action: AppAction): SessionState {
  switch (action.type) {
    case 'sessionReady':
      // Bootstrap only records the identity. Nothing else is touched — in particular
      // the URL-synced `activeChatId` survives, so there's no reset to clobber it.
      return { id: action.id };
    default:
      return state;
  }
}

function errorReducer(state: ErrorState, action: AppAction): ErrorState {
  switch (action.type) {
    case 'errorRaised':
      return { type: action.reason, message: ERROR_MESSAGES[action.reason] };
    case 'errorDismissed':
      return state.type === null ? state : initialErrorState;
    default:
      return state;
  }
}

function chatReducer(state: ChatState, action: AppAction): ChatState {
  switch (action.type) {
    case 'activeChatChanged':
      return state.activeChatId === action.activeChatId ? state : { ...state, activeChatId: action.activeChatId };
    case 'chatsLoaded':
      // Just the list. `isLoading` is cleared solely by `chatsLoadFinished` so later
      // refreshes (e.g. after a stream reconcile) don't flip the spinner back on.
      return { ...state, fetchedChats: action.chats };
    case 'chatsLoadFinished':
      return { ...state, isLoading: false };
    case 'chatCreated':
      return { ...state, fetchedChats: [action.chat, ...state.fetchedChats] };
    case 'chatDeleted':
      return { ...state, fetchedChats: state.fetchedChats.filter(c => c.id !== action.chatId) };
    default:
      return state;
  }
}

function messagesReducer(state: MessagesState, action: AppAction): MessagesState {
  switch (action.type) {
    case 'messagesLoading':
      return { ...state, isLoading: true };
    case 'messagesIdle':
      return { ...state, isLoading: false };
    case 'messagesCleared':
      // Route has no chat: drop any prior buffer so it can't flash behind the home
      // route or a just-deleted chat.
      return { ...state, fetchedMessages: [], isLoading: false };
    case 'messagesLoaded':
      return { ...state, fetchedMessages: action.messages, isLoading: false };
    case 'messagesLoadedStreaming':
      return {
        ...state,
        fetchedMessages: action.messages.map(m =>
          m.id === action.streamingId ? { ...m, content: '' } : m
        ),
        isLoading: false,
      };
    case 'messagesReplaced':
      return { ...state, fetchedMessages: action.messages };
    case 'newChatPending':
      // Optimistic echo on the home route: the sole message until the real chat
      // loads (or `newChatCleared` rolls it back on failure).
      return { ...state, fetchedMessages: [action.message] };
    case 'newChatCleared':
      return { ...state, fetchedMessages: [] };
    case 'userMessageAppended':
    case 'assistantMessageAppended':
      return { ...state, fetchedMessages: [...state.fetchedMessages, action.message] };
    case 'tokenReceived':
      return {
        ...state,
        fetchedMessages: state.fetchedMessages.map(m =>
          m.id === action.messageId
            ? { ...m, content: m.content ? m.content + action.token : action.token }
            : m
        ),
      };
    case 'messageReplaced':
      return {
        ...state,
        fetchedMessages: state.fetchedMessages.map(m =>
          m.id === action.messageId ? action.message : m
        ),
      };
    case 'messageModified': {
      const idx = state.fetchedMessages.findIndex(m => m.id === action.messageId);
      if (idx === -1) return state;
      return {
        ...state,
        fetchedMessages: [
          ...state.fetchedMessages.slice(0, idx),
          { ...state.fetchedMessages[idx], content: action.content },
          action.assistantMessage,
        ],
      };
    }
    default:
      return state;
  }
}

let actionCount = 0;

export function appStateReducer(state: AppState, action: AppAction): AppState {
  console.log(`[chat-state] #${++actionCount}`, action.type, action);
  if (action.type === 'sessionReset') {
    // Logout: a new identity, so wipe every domain slice. `chat.isLoading` returns
    // to `true` so the sidebar spins until the session-keyed load effect refetches.
    // `activeChatId` resets to null too, which is correct — logout navigates home,
    // and the route sync would set it null anyway.
    return { ...initialAppState, session: { id: action.id } };
  }
  return {
    session: sessionReducer(state.session, action),
    error: errorReducer(state.error, action),
    chat: chatReducer(state.chat, action),
    messages: messagesReducer(state.messages, action),
  };
}

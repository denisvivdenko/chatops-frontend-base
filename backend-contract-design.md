# Frontend–Backend Interface Design

## Architecture

Two layers separate HTTP concerns from UI state management.

```
┌─────────────────────────────────────┐
│  Hook (useChatService)              │  orchestration, caching, SSE lifecycle
│  implements UseChatServiceResult    │
└────────────────┬────────────────────┘
                 │ uses
┌────────────────▼────────────────────┐
│  BackendChatClient                  │  thin HTTP wrapper, no state
└─────────────────────────────────────┘
```

---

## Data Models

```ts
interface Message {
  id:        string
  chatId:    string
  role:      'user' | 'assistant'
  content:   string
  status:    'pending' | 'complete' | 'failed'
  createdAt: number  // unix ms
}

interface Chat {
  id:             string
  title:          string
  lastMessage?:   string
  lastActivityAt: number  // unix ms
  createdAt:      number  // unix ms
}
```

**Notes:**
- No `'sent'` status — user messages are always written as `'complete'`
- `status` lifecycle applies to assistant messages: `pending → complete | failed`

---

## SSE Types

```ts
interface MessageStream {
  events: AsyncIterable<MessageStreamEvent>
  abort(): void
}

interface MessageStreamEvent {
  status:   'complete' | 'failed'
  message?: Message
  reason?:  string
}
```

---

## BackendChatClient

Thin HTTP layer — maps directly to API calls, no state.

```ts
interface BackendChatClient {
  fetchChats(): Promise<Chat[]>
  createChat(title: string): Promise<{ chatId: string; assistantMessageId: string }>
  fetchMessages(chatId: string, after?: string): Promise<Message[]>
  sendMessage(chatId: string, content: string): Promise<{ assistantMessageId: string }>
  observeMessage(chatId: string, messageId: string): MessageStream
}
```

**Notes:**
- `createChat` creates the chat and sends the first message in one call; returns both `chatId` and the pending assistant's `assistantMessageId`
- `sendMessage` always returns an `assistantMessageId` — the backend pre-creates the assistant message as `pending` before returning
- `fetchMessages(after?)` fetches all messages or messages after a given message id

---

## UseChatServiceResult

Hook interface — owns in-memory state, orchestrates fetching and streaming.
`useInMemoryChatService` implements this now; `useBackendChatService` will implement it when the backend is ready.

```ts
interface UseChatServiceResult {
  // state
  chats:          Chat[]          // sorted by lastActivityAt desc
  activeChatId:   string | null   // null means new chat (no separate isDrafting flag)
  activeMessages: Message[]

  // actions — void, state updates propagate via React reactivity
  fetchChats(): void
  startNewChat(): void
  selectChat(id: string): void
  createChat(firstMessage: string): void
  sendMessage(content: string): void
}
```

---

## Behavioral Contracts

### `fetchChats()`
- Calls `BackendChatClient.fetchChats()`
- Replaces in-memory chat list, sorted by `lastActivityAt` desc
- Called once on app load; subsequent updates happen in-memory

### `startNewChat()`
- Sets `activeChatId` to `null`
- No network call

### `selectChat(id)`
1. Set `activeChatId = id`
2. If messages already cached for this chat → use them, skip fetch
3. Otherwise → `fetchMessages(chatId)`
4. Inspect the last message:
   - `role: assistant, status: complete` → idle, wait for user input
   - `role: assistant, status: pending` → open SSE stream via `observeMessage`
   - `role: assistant, status: failed` → show failed state + Retry button
   - `role: user` → error state; re-fetch with `fetchMessages(chatId, after: lastUserMessage.id)` to resync

### `createChat(firstMessage)`
Called when the user sends the first message in a new chat (`activeChatId === null`).

1. `BackendChatClient.createChat(firstMessage)` → `{ chatId, assistantMessageId }`
2. Add new `Chat` to in-memory list (title = truncated firstMessage, sorted by lastActivityAt)
3. Set `activeChatId = chatId`
4. Add user message `{ status: 'complete' }` to state
5. Add assistant placeholder `{ status: 'pending', content: '' }` to state
6. Open SSE stream for `assistantMessageId`
7. On `complete` event → replace placeholder with real message content
8. On `failed` event → mark placeholder as `failed`, show Retry button

### `sendMessage(content)`
Called when the user sends a message in an existing chat.

1. Add user message `{ status: 'complete' }` to state immediately
2. Add assistant placeholder `{ status: 'pending', content: '' }` to state immediately
3. `BackendChatClient.sendMessage(chatId, content)` → `{ assistantMessageId }`
4. Open SSE stream for `assistantMessageId`
5. On `complete` event → replace placeholder with real message content
6. On `failed` event → mark placeholder as `failed`, show Retry button
7. Update `chat.lastActivityAt`, re-sort chats list

### SSE stream lifecycle
- `abort()` is called when the user navigates away from the chat or the component unmounts
- A stream that closes without a final `complete | failed` event is treated as interrupted → re-fetch full message history and re-enter `selectChat` flow

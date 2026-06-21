# Add loading states to useBackendChatService

## Problem

The current hook interface has no loading signals. With the backend, two operations are async:

- **Initial chat list load** — `chats` is `[]` until `GET /chats` resolves. The sidebar flickers empty on mount.
- **Switching chats** — `selectChat(id)` must fetch `GET /chats/{id}/messages`. During the fetch, `activeMessages` is an empty array and components cannot distinguish "loading" from "this chat has no messages".

## Proposed interface addition

```ts
return {
  chats,
  activeChatId,
  activeMessages,
  isLoadingChats,      // true during initial GET /chats
  isLoadingMessages,   // true while GET /chats/{id}/messages is in flight
  startNewChat,
  selectChat,
  sendMessage,
};
```

## What needs to change

- `useBackendChatService` — expose `isLoadingChats` and `isLoadingMessages`
- `ChatList` — render a skeleton/spinner when `isLoadingChats` is true
- `ChatPane` — render a spinner when `isLoadingMessages` is true
- `AppLayout` — pass the new flags down to the relevant components

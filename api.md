# ChatOps API Reference

Base URL: `http://localhost:8000`

No authentication required. No global headers needed beyond `Content-Type: application/json` on POST requests.

---

## Data Models

### Chat
```json
{
  "id": "string (UUID)",
  "title": "string",
  "last_activity_at": 1234567890000,
  "created_at": 1234567890000
}
```
Timestamps are Unix milliseconds (integer).

### Message
```json
{
  "id": "string (UUID)",
  "role": "user | assistant",
  "status": "pending | complete | failed",
  "content": "string",
  "created_at": 1234567890000
}
```

### MessageStreamEvent
```json
{
  "seq_id": 0,
  "token": "string"
}
```
`seq_id` starts at 0 and increments by 1 per token. Tokens are words separated by spaces — join with `" "` to reconstruct content.

---

## Endpoints

### GET /chats

List chats, sorted by most-recently-active first.

**Query params**

| Name | Type | Default | Constraint |
|------|------|---------|------------|
| `limit` | integer | `10` | `>= 1` |

**Response `200`**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Hello",
    "last_activity_at": 1750000000000,
    "created_at": 1750000000000
  }
]
```

---

### POST /chats

Create a new chat. Automatically creates the first user message and queues a pending assistant reply.

**Request body**
```json
{ "message": "Hello" }
```

| Field | Type | Notes |
|-------|------|-------|
| `message` | string | First user message. Title is derived from the first 50 chars. |

**Response `201`** — returns the created `Chat` object.
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Hello",
  "last_activity_at": 1750000000000,
  "created_at": 1750000000000
}
```

---

### DELETE /chats/{chat_id}

Delete a chat and all its messages.

**Path params**

| Name | Type |
|------|------|
| `chat_id` | string (UUID) |

**Response `204`** — no body.

---

### GET /chats/{chat_id}/messages

List all messages in a chat, in chronological order.

**Path params**

| Name | Type |
|------|------|
| `chat_id` | string (UUID) |

**Response `200`** — array of `Message` objects.
```json
[
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "role": "user",
    "status": "complete",
    "content": "Hello",
    "created_at": 1750000000000
  },
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000002",
    "role": "assistant",
    "status": "pending",
    "content": "",
    "created_at": 1750000000000
  }
]
```

After `POST /chats`, the list always starts with 2 messages: the user message followed by a `pending` assistant message.

---

### POST /chats/{chat_id}/messages

Send a new user message to an existing chat. Creates a user message and queues a new pending assistant reply.

**Path params**

| Name | Type |
|------|------|
| `chat_id` | string (UUID) |

**Request body**
```json
{ "content": "What is the weather?" }
```

**Response `201`** — the new pending `assistant` Message.
```json
{
  "id": "bbbbbbbb-0000-0000-0000-000000000003",
  "role": "assistant",
  "status": "pending",
  "content": "",
  "created_at": 1750000000000
}
```

**Response `409`** — if the last assistant message is still `pending` (previous response not yet finished).
```json
{ "error": "last_assistant_message_not_finished" }
```

---

### GET /chats/{chat_id}/messages/{message_id}/stream

Stream tokens for a pending assistant message using **Server-Sent Events (SSE)**.

**Path params**

| Name | Type |
|------|------|
| `chat_id` | string (UUID) |
| `message_id` | string (UUID) — must be an assistant message |

**Response `200`**

`Content-Type: text/event-stream; charset=utf-8`

Each event line:
```
data: {"seq_id": 0, "token": "Hello"}
data: {"seq_id": 1, "token": "!"}
data: {"seq_id": 2, "token": "How"}
...
```

The stream ends when the worker has finished generating the response. The `<EOM>` sentinel is consumed internally and never forwarded to the client. Join tokens with `" "` (space) to reconstruct the full message content.

---

## Typical Frontend Flow

```
1. POST /chats
   → receive chat.id

2. GET  /chats/{chat_id}/messages
   → messages[0] is user message (status: complete)
   → messages[1] is assistant message (status: pending) — capture its id

3. GET  /chats/{chat_id}/messages/{assistant_id}/stream
   → consume SSE tokens, render incrementally
   → stream closes when assistant finishes

4. POST /chats/{chat_id}/messages   (only valid after stream closes)
   → receive new pending assistant message id

5. GET  /chats/{chat_id}/messages/{new_assistant_id}/stream
   → stream next reply
```

For the chat list sidebar:
```
GET /chats?limit=20
→ sorted by last_activity_at desc; refresh after sending each message
```

---

## Error Reference

| Status | When |
|--------|------|
| `201` | Resource created successfully |
| `204` | Deleted successfully (no body) |
| `409` | Cannot send message — previous assistant reply still pending |

No 404 handling is implemented today — passing an unknown `chat_id` will result in an unhandled server error.

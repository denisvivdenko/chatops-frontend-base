# ChatOps API

A FastAPI backend for a chat application with async, worker-driven message generation
(LLM chat responses) and PDF resource ingestion. This document describes how to use the
HTTP API: authentication, every endpoint, request/response shapes, error codes, and the
asynchronous message-generation flow (queue + Server-Sent Events).

All examples below are taken directly from the project's own end-to-end tests
(`tests/end2end/`), so they reflect real, working request/response pairs.

- Base path for all feature endpoints: `/api`
- Base path for auth endpoints: `/api/auth`
- Default port when run locally / via `python -m chatops.api.main`: `8000`
- Content type for all JSON bodies: `application/json`

---

## 1. Quick start

```bash
# 1. Get an access token (creates a new anonymous user)
curl -i -X POST http://localhost:8000/api/auth/anonymous-session
# -> 201
# {"access_token": "<jwt>", "token_type": "bearer"}
# + Set-Cookie: refresh_token=...; HttpOnly; SameSite=Lax; Path=/api/auth

TOKEN="<jwt from above>"

# 2. Start a chat (this also creates the first user + assistant message pair
#    and kicks off background generation of the assistant's reply)
curl -s -X POST http://localhost:8000/api/chats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
# -> 201 {"id": "...", "user_id": "...", "title": "Hello", "created_at": 173..., "last_activity_at": 173...}

CHAT_ID="<id from above>"

# 3. List messages to find the pending assistant message id
curl -s http://localhost:8000/api/chats/$CHAT_ID/messages -H "Authorization: Bearer $TOKEN"
# -> [ {user message, status "complete"}, {assistant message, status "pending"} ]

ASSISTANT_ID="<assistant message id>"

# 4. Stream the assistant's reply as it's generated
curl -N http://localhost:8000/api/chats/$CHAT_ID/messages/$ASSISTANT_ID/stream \
  -H "Authorization: Bearer $TOKEN"
# -> text/event-stream:
#    data: {"seq_id": 0, "token": "Hi"}
#    data: {"seq_id": 1, "token": " there"}
#    event: done
#    data: {"status": "complete"}
```

There is no synchronous "send message, get a reply" endpoint. Sending a message always
returns immediately with a `pending` message; the actual reply text is produced by a
background worker and delivered either by streaming (`GET .../stream`) or by polling
(`GET .../messages` and checking `status`).

---

## 2. Authentication

The API uses **stateless JWT access tokens** plus **rotating opaque refresh tokens**.
There is currently only one way to obtain a session: anonymous sessions (no
username/password login endpoint is implemented).

### 2.1 Create an anonymous session

```
POST /api/auth/anonymous-session
```

No body required. Response:

```json
201 Created
{"access_token": "<jwt>", "token_type": "bearer"}
```

Also sets an HttpOnly cookie:

```
Set-Cookie: refresh_token=<opaque-token>; HttpOnly; SameSite=Lax; Path=/api/auth[; Secure if https]; Max-Age=1209600
```

The cookie's `path` is scoped to `/api/auth`, so browsers only send it back on auth
endpoints, never on `/api/chats`, etc.

### 2.2 Authenticate requests

Every endpoint under `/api` (except the two auth endpoints themselves) requires:

```
Authorization: Bearer <access_token>
```

Missing or invalid (malformed, wrong signature, expired) tokens get:

```json
401 Unauthorized
{"detail": "unauthorized"}
```

Note this is the **one place** in the API that uses FastAPI's default `{"detail": ...}`
error shape instead of the `{"error": ...}` convention used everywhere else (see
[§5 Errors](#5-error-handling)).

Access tokens are short-lived (default **15 minutes**, `ACCESS_TOKEN_TTL`). The JWT
payload is `{"sub": <user_id>, "type": "anonymous", "iat": ..., "exp": ...}`, signed
HS256.

### 2.3 Refresh an access token

```
POST /api/auth/refresh
```

No body. Requires the `refresh_token` cookie set by the previous
`anonymous-session`/`refresh` call to be present (browsers/HTTP clients that keep a
cookie jar handle this automatically). Response:

```json
200 OK
{"access_token": "<new jwt>", "token_type": "bearer"}
```

and rotates the refresh cookie (issues a new one, revokes the old one server-side).

Failure modes, all `401 {"detail": "unauthorized"}`:
- no `refresh_token` cookie present
- refresh token expired (`REFRESH_TOKEN_TTL`, default 14 days)
- refresh token already revoked/reused — **refresh tokens are single-use**; replaying an
  old (rotated-away) refresh token is rejected even if the client presents a valid cookie
  value that was valid a moment ago.

```python
# tests/end2end/auth/test_refresh.py
def test_reusing_rotated_refresh_token_is_rejected(client):
    client.post("/api/auth/anonymous-session")
    old_refresh_cookie = client.cookies.get("refresh_token")

    client.post("/api/auth/refresh")  # rotates: jar now holds a new refresh_token

    client.cookies.set("refresh_token", old_refresh_cookie)
    reuse_response = client.post("/api/auth/refresh")

    assert reuse_response.status_code == 401
```

### 2.4 Authorization / ownership

There are no roles or scopes — every chat, message, and resource is scoped to the user
that created it (`user_id` on the record). Any request against a chat/message/resource
owned by a different user returns:

```json
403 Forbidden
{"error": "forbidden"}
```

This check runs **before** other business-rule checks — e.g. a request against another
user's chat returns 403 even if that request would otherwise have hit a 409 conflict
(such as "assistant message still pending").

---

## 3. Chats & messages

### 3.1 Create a chat

```
POST /api/chats
Authorization: Bearer <token>
Content-Type: application/json

{"message": "Hello"}
```

```json
201 Created
{
  "id": "65f...",
  "user_id": "65e...",
  "title": "Hello",
  "created_at": 1732000000000,
  "last_activity_at": 1732000000000
}
```

`title` is currently just the literal text of the first message. As a side effect, this
call synchronously creates **two messages** in the new chat:
1. a `user` message with `status: "complete"` containing your text, and
2. an `assistant` message with `status: "pending"` and empty `content`,

and enqueues a background job to generate the assistant's reply (see
[§4 Async generation](#4-async-message-generation-jobs--streaming)). Fetch
`GET /api/chats/{chat_id}/messages` right after creating a chat to get both message ids.

### 3.2 List chats

```
GET /api/chats?limit=10
Authorization: Bearer <token>
```

`limit` is optional, `int`, `>= 1`, default `10`.

```json
200 OK
[
  {"id": "...", "user_id": "...", "title": "...", "created_at": ..., "last_activity_at": ...},
  ...
]
```

Ordered most-recently-active first (`last_activity_at` desc). Only chats owned by the
caller are returned.

### 3.3 Delete a chat

```
DELETE /api/chats/{chat_id}
Authorization: Bearer <token>
```

```
204 No Content
```

Errors: `403 {"error": "forbidden"}` (not your chat), `404 {"error": "chat_not_found"}`.

### 3.4 List messages in a chat

```
GET /api/chats/{chat_id}/messages
Authorization: Bearer <token>
```

```json
200 OK
[
  {
    "id": "...", "role": "user", "status": "complete", "content": "Hello",
    "created_at": ..., "resource_ids_to_process": []
  },
  {
    "id": "...", "role": "assistant", "status": "pending", "content": "",
    "created_at": ..., "resource_ids_to_process": []
  }
]
```

Fields:
| Field | Type | Notes |
|---|---|---|
| `id` | `str` | |
| `role` | `"user" \| "assistant"` | |
| `status` | `"pending" \| "complete" \| "failed"` | |
| `content` | `str` | Empty until generation completes; final text once `complete` |
| `created_at` | `int` | epoch millis |
| `resource_ids_to_process` | `list[str]` | ids of PDF resources referenced by this message (see [§3.7](#37-referencing-an-uploaded-pdf-in-a-message)) |

**Important side effect**: this endpoint lazily fails timed-out messages. Every call
first checks whether the chat's pending assistant message has exceeded its generation
deadline (see [§4.4 Timeouts](#44-timeouts)); if so it's transitioned to
`status: "failed"` before the list is returned. This means polling this endpoint is a
valid (if less efficient than SSE) way to detect both completion and timeout.

Errors: `403 {"error": "forbidden"}`, `404 {"error": "chat_not_found"}`.

### 3.5 Send a follow-up message

```
POST /api/chats/{chat_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{"content": "What is the weather?"}
```

```json
201 Created
{"id": "...", "role": "assistant", "status": "pending", "content": "", "created_at": ..., "resource_ids_to_process": []}
```

Like chat creation, this persists a `user` message (`complete`) and a new `assistant`
message (`pending`) and enqueues a generation job. Only the **assistant** message is
returned.

Errors:
| Status | Body | Cause |
|---|---|---|
| 409 | `{"error": "last_assistant_message_not_finished"}` | the chat's previous assistant message is still `pending` — you must wait for it to finish (or fail) before sending another |
| 403 | `{"error": "forbidden"}` | not your chat |
| 404 | `{"error": "chat_not_found"}` | |
| 404 | `{"error": "resource_not_found"}` | message references a `resource://` id that doesn't exist / isn't yours |
| 403 | `{"error": "forbidden"}` | message references a resource owned by another user |

```python
# tests/end2end/messages/test_messages.py — the "still pending" conflict
response = authed_client.post(f"/api/chats/{chat_id}/messages", json={"content": "Follow up"})
assert response.status_code == 409
assert response.json() == {"error": "last_assistant_message_not_finished"}
```

### 3.6 Retry a failed message

```
POST /api/chats/{chat_id}/messages/{message_id}/retry
Authorization: Bearer <token>
```

No body. Only valid for an **assistant** message currently in `status: "failed"` — resets
it to `pending` and re-enqueues generation (routed to the same worker type — chat or
ingestion — as originally).

```json
200 OK
{"id": "<same id>", "role": "assistant", "status": "pending", "content": "", ...}
```

Errors: `409 {"error": "message_not_failed"}` (message is `pending` or `complete`),
`403 forbidden`, `404 chat_not_found` / `message_not_found` / `resource_not_found`.

### 3.7 Modify a user message

```
POST /api/chats/{chat_id}/messages/{message_id}/modify
Authorization: Bearer <token>
Content-Type: application/json

{"content": "Hello, edited"}
```

`message_id` must reference an existing **user** message. All messages *after* it in the
chat are discarded, its content is replaced, and a new pending assistant message is
created and enqueued — effectively "edit and regenerate from here".

```json
200 OK
{"id": "<new assistant message id>", "role": "assistant", "status": "pending", "content": "", ...}
```

Errors:
| Status | Body | Cause |
|---|---|---|
| 409 | `{"error": "cannot_modify_assistant_message"}` | `message_id` refers to an assistant message |
| 409 | `{"error": "last_assistant_message_not_finished"}` | current assistant reply still pending |
| 403 / 404 | `forbidden` / `chat_not_found` / `message_not_found` / `resource_not_found` | ownership / existence, same as above |

### 3.8 Referencing an uploaded PDF in a message

Any message `content` (chat-creation `message`, or `content` on send/modify) can
reference a previously uploaded PDF using Markdown link syntax with a `resource://` URI:

```
[<display text>](resource://<resource_id>)
```

```python
chat_id = create_chat(client, f"[report.pdf](resource://{resource_id})")
```

When a message contains one or more `resource://` references, the resulting assistant
message's `resource_ids_to_process` is populated and the generation job is routed to the
**ingestion worker** (PDF → Markdown, via an LLM) instead of the normal chat-reply
worker — see [§4.5](#45-resource-ingestion-jobs). This works identically whether the
reference appears in the first message of a new chat, a follow-up message, or an edited
(`modify`) message.

---

## 4. Async message generation (jobs & streaming)

Sending or creating a message never returns the assistant's reply directly — generation
happens out-of-band in a worker process. There are two ways to consume the result:
**SSE streaming** (recommended — low latency, multiple readers can attach) or
**polling** `GET .../messages` and checking `status`.

### 4.1 How it works

1. `POST /api/chats` or `.../messages` (or `retry`/`modify`) persists a `pending`
   assistant message and pushes a `Job` onto a Redis queue — the **chat queue** (`jobs`)
   for plain replies, or the **ingestion queue** (`ingestion_jobs`) if the message
   references uploaded resources.
2. The HTTP call returns immediately with the `pending` message.
3. A separate worker process (`python -m chatops.workers.worker`, or
   `python -m chatops.workers.ingestion_worker`) pulls the job off its queue and calls
   an LLM (OpenAI), streaming the reply token-by-token into a Redis Stream keyed by
   `f"{chat_id}:{message_id}"`.
4. When done, the worker marks the message `complete` (persisting the full text) or, on
   any exception, `failed`.

### 4.2 Streaming a reply (SSE)

```
GET /api/chats/{chat_id}/messages/{message_id}/stream
Authorization: Bearer <token>
```

Response is `text/event-stream; charset=utf-8`. Two event kinds:

```
data: {"seq_id": 0, "token": "Hi"}
data: {"seq_id": 1, "token": " there"}
...
event: done
data: {"status": "complete"}
```

or, on timeout (no completion within the message's generation budget — see §4.4):

```
event: error
data: {"error": "message_generation_timeout"}
```

Notes:
- Token events have no `event:` line (default SSE event type); only `done` and `error`
  set an explicit `event:` field, so clients should treat any line starting with
  `data:` that isn't immediately preceded by an `event:` line as a token chunk.
- The stream is **replayable and multi-reader**: it's backed by a Redis Stream, not a
  one-shot pipe, so opening `.../stream` again after tokens have already been produced
  (or from a second client) replays from the beginning rather than losing early tokens.
  Reopening *after* the message has already timed out/failed just re-emits the
  `event: error` immediately, with no token data before it.
- Pre-stream checks (`chat_not_found`, `message_not_found`, `forbidden`) are returned as
  plain JSON with the normal HTTP status codes (403/404), **not** as SSE — because they
  fail before the stream even opens.

```python
# tests/end2end/messages/test_streaming.py
with authed_client_with_worker.stream("GET", url) as first_resp:
    assert first_resp.status_code == 200
    assert first_resp.headers["content-type"] == "text/event-stream; charset=utf-8"
    ...
# a second client opening the same URL concurrently gets the same full token sequence
```

### 4.3 Polling instead of streaming

`GET /api/chats/{chat_id}/messages` (§3.4) is a valid alternative — just poll until the
target message's `status` is no longer `"pending"`. This endpoint also actively
transitions overdue pending messages to `failed`, so polling it is sufficient to detect
timeouts without ever opening a stream.

### 4.4 Timeouts

Each pending message has a generation deadline computed from `created_at` plus a budget:

- Plain chat message (no resource refs): `MESSAGE_TIMEOUT__MESSAGE_GENERATION_TIMEOUT`
  seconds (default **30s**).
- Message with resource refs: `len(resource_ids_to_process) *
  MESSAGE_TIMEOUT__RESOURCE_PROCESSING_TIMEOUT` seconds (default **60s per resource**).

If the deadline passes with no worker completing the message, it becomes `status:
"failed"` (detected lazily, either on `GET .../messages` or on stream read) and, if a
client is actively streaming, the stream emits `event: error` /
`{"error": "message_generation_timeout"}`. A **timed-out generation is not an HTTP 5xx**
— the originating POST already returned 200/201 before the timeout could occur; the
failure only ever surfaces via `status: "failed"` or the stream's error event. Use
`POST .../retry` to re-attempt a failed message.

### 4.5 Resource ingestion jobs

Messages containing `resource://` references (§3.8) are routed to the ingestion worker,
which reads the referenced PDF, sends it to an LLM to be converted to Markdown, and the
resulting Markdown becomes the assistant message's `content`. From the API consumer's
perspective this looks identical to a normal chat reply — same `pending` → stream/poll →
`complete`/`failed` lifecycle — just typically with the longer
`resource_processing_timeout` budget instead of `message_generation_timeout`.

```python
# tests/end2end/resources/test_resource_message_processing.py
resource_id = upload_resource(authed_client_with_ingestion_worker)
chat_id = create_chat(authed_client_with_ingestion_worker, f"[report.pdf](resource://{resource_id})")
assistant_id = get_messages(authed_client_with_ingestion_worker, chat_id)[1]["id"]
stream_to_completion(authed_client_with_ingestion_worker, chat_id, assistant_id)

messages = get_messages(authed_client_with_ingestion_worker, chat_id)
assert messages[1]["status"] == "complete"
```

A subsequent chat message can then ask questions about the ingested document — the chat
worker includes prior message content (including the ingested Markdown) as context.

---

## 5. Resources (PDF uploads)

Uploaded files back the `resource://` references used in messages (§3.8). Only PDFs are
accepted, validated by magic-byte sniffing (`%PDF-` prefix), max size 20 MB.

### 5.1 Upload a PDF

```
POST /api/upload-resource
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: report.pdf (binary, content-type application/pdf)
```

```json
201 Created
{"id": "65f...", "filename": "report.pdf"}
```

```python
# tests/end2end/resources/helpers.py
PDF_CONTENT = b"%PDF-1.4\n%mock pdf content"

def upload_resource(client, filename="report.pdf", content=PDF_CONTENT):
    response = client.post("/api/upload-resource", files={"file": (filename, content, "application/pdf")})
    return response.json()["id"]
```

**Uploading the same filename again replaces the previous resource** (old one is
deleted, a new `id` is issued) — this is per-user; two different users can each have
their own `report.pdf` with different ids.

Errors:
| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "invalid_file_type"}` | content doesn't start with the PDF magic bytes `%PDF-` |
| 400 | `{"error": "file_too_large"}` | file exceeds 20 MB |
| 401 | `{"detail": "unauthorized"}` | missing/invalid token |

### 5.2 List resources

```
GET /api/resources
Authorization: Bearer <token>
```

```json
200 OK
[
  {"id": "...", "filename": "second.pdf"},
  {"id": "...", "filename": "first.pdf"}
]
```

Newest-uploaded first. Only the caller's own resources are listed.

---

## 6. Error handling reference

Two conventions coexist in this API — be aware of both when writing a client:

1. **Business-rule errors** (used by every `/api/chats...`/`/api/upload-resource`/
   `/api/resources` route): `JSONResponse` with body `{"error": "<snake_case_code>"}`.
   Not reflected in generated OpenAPI schemas (they're returned manually per-route, not
   via typed exception handlers).
2. **Authentication errors only**: FastAPI's built-in `HTTPException` shape,
   `{"detail": "unauthorized"}`, always with status `401`.

Full catalog of `{"error": ...}` codes:

| Code | HTTP status | Meaning |
|---|---|---|
| `forbidden` | 403 | Chat/message/resource exists but belongs to another user |
| `chat_not_found` | 404 | No chat with that id (for the caller) |
| `message_not_found` | 404 | No message with that id in that chat |
| `resource_not_found` | 404 | Referenced `resource://` id doesn't exist |
| `last_assistant_message_not_finished` | 409 | Can't send/modify — previous assistant reply still `pending` |
| `message_not_failed` | 409 | `retry` called on a message that isn't `failed` |
| `cannot_modify_assistant_message` | 409 | `modify` called with an assistant message id instead of a user message id |
| `invalid_file_type` | 400 | Upload isn't a valid PDF (magic-byte check) |
| `file_too_large` | 400 | Upload exceeds 20 MB |

Validation errors from FastAPI itself (e.g. malformed JSON body, missing required field)
fall back to FastAPI's default `422 Unprocessable Entity` response, which is a third,
unrelated shape (`{"detail": [{"loc": ..., "msg": ..., "type": ...}]}`).

Timeouts on message generation are **not** HTTP errors at all — see
[§4.4](#44-timeouts).

---

## 7. Reference: schemas

```python
class Chat(BaseModel):
    id: str
    user_id: str
    title: str
    last_activity_at: int   # epoch millis
    created_at: int          # epoch millis

class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"

class MessageStatus(StrEnum):
    PENDING = "pending"
    COMPLETE = "complete"
    FAILED = "failed"

class Message(BaseModel):
    id: str
    role: MessageRole
    status: MessageStatus
    content: str
    created_at: int
    resource_ids_to_process: list[str] = []

class MessageStreamEvent(BaseModel):   # shape of each SSE `data:` line for token events
    seq_id: int
    token: str

class TokenResponse(BaseModel):        # both /api/auth endpoints
    access_token: str
    token_type: str = "bearer"

class CreateChatRequest(BaseModel):    # POST /api/chats
    message: str

class SendMessageRequest(BaseModel):   # POST .../messages, POST .../modify
    content: str
```

`POST /api/upload-resource` and `GET /api/resources` return plain dicts
(`{"id": str, "filename": str}`), not a declared Pydantic response model.

---

## 8. Configuration reference

Environment variables read by `Settings` (`src/chatops/settings.py`, `pydantic-settings`,
case-insensitive, nested settings via `__` delimiter):

| Variable | Default | Purpose |
|---|---|---|
| `REDIS_HOST` | `localhost` | Redis host (job queues + SSE event streams) |
| `REDIS_PORT` | `6379` | Redis port |
| `MONGO_HOST` | `localhost` | MongoDB host (chats/messages/users/resources) |
| `MONGO_PORT` | `27017` | MongoDB port |
| `JOB_STREAM_TIMEOUT` | `1.0` | Worker's blocking-pop timeout on the job queue (s) |
| `EVENT_STREAM_TIMEOUT` | `3.0` | SSE endpoint's blocking-read timeout on the Redis stream (s) |
| `JWT_SECRET` | `insecure-dev-secret-change-me-in-production` | HMAC key for access tokens — **override in production** |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_TTL` | `900` (15 min) | Access token lifetime, seconds |
| `REFRESH_TOKEN_TTL` | `1209600` (14 days) | Refresh token lifetime / cookie `Max-Age`, seconds |
| `RESOURCE_STORAGE_DIR` | `/data/resources` | Filesystem path for uploaded PDFs |
| `OPENAI_API_KEY` | `""` | OpenAI key used by both worker processes |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model used for both reply generation and PDF ingestion |
| `MESSAGE_TIMEOUT__MESSAGE_GENERATION_TIMEOUT` | `30` | Plain-reply generation budget, seconds |
| `MESSAGE_TIMEOUT__RESOURCE_PROCESSING_TIMEOUT` | `60` | Per-resource ingestion budget, seconds |

### Running locally

```bash
# Full stack (API + Redis + Mongo + both workers) — requires OPENAI_API_KEY
make deploy

# API + infra only, no LLM workers (messages will always time out / never complete)
make deploy-without-worker

# API directly (expects Redis/Mongo reachable at localhost, or REDIS_HOST/MONGO_HOST set)
python -m chatops.api.main   # listens on 0.0.0.0:8000

# Workers, run separately from the API process
python -m chatops.workers.worker             # handles plain chat replies
python -m chatops.workers.ingestion_worker    # handles resource:// / PDF ingestion
```

---

## 9. Full request lifecycle example

End-to-end example combining chat creation, streaming, follow-up, and a PDF reference,
mirroring `tests/end2end/resources/test_resource_message_processing.py`:

```python
import httpx

client = httpx.Client(base_url="http://localhost:8000")

# 1. Auth
token = client.post("/api/auth/anonymous-session").json()["access_token"]
client.headers["Authorization"] = f"Bearer {token}"

# 2. Upload a PDF
with open("report.pdf", "rb") as f:
    resource_id = client.post(
        "/api/upload-resource",
        files={"file": ("report.pdf", f, "application/pdf")},
    ).json()["id"]

# 3. Start a chat that references the PDF
chat_id = client.post(
    "/api/chats", json={"message": f"[report.pdf](resource://{resource_id})"}
).json()["id"]

# 4. Get the pending assistant (ingestion) message and stream it to completion
messages = client.get(f"/api/chats/{chat_id}/messages").json()
ingestion_msg_id = messages[1]["id"]

with client.stream("GET", f"/api/chats/{chat_id}/messages/{ingestion_msg_id}/stream") as resp:
    for line in resp.iter_lines():
        print(line)  # data: {"seq_id": ..., "token": "..."} / event: done

# 5. Ask a follow-up question about the ingested document
client.post(
    f"/api/chats/{chat_id}/messages",
    json={"content": "What is the launch code mentioned in the document?"},
)
answer_id = client.get(f"/api/chats/{chat_id}/messages").json()[3]["id"]

with client.stream("GET", f"/api/chats/{chat_id}/messages/{answer_id}/stream") as resp:
    for line in resp.iter_lines():
        print(line)
```

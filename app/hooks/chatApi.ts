import type { Chat, Message } from '../types/chat';
import { ensureSession, authorizedFetch, resetSession } from './authSession';

/**
 * Transport layer for the chat backend. Every function returns domain objects
 * (or emits raw stream tokens) and throws `HttpError` on a non-ok response — it
 * never touches the reducer, the router, or React. Orchestration (deciding what
 * a failure means and what state should change) is the caller's job.
 */

export class HttpError extends Error {
  constructor(public status: number) {
    super(`Request failed with status ${status}`);
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

type RawMessage = {
  id: string;
  role: 'user' | 'assistant';
  status: 'pending' | 'complete' | 'failed';
  content: string;
  created_at: number;
};

type RawChat = {
  id: string;
  title: string;
  last_activity_at: number;
  created_at: number;
};

function mapMessage(raw: RawMessage): Message {
  return {
    id: raw.id,
    role: raw.role,
    status: raw.status,
    content: raw.content,
    createdAt: raw.created_at,
  };
}

function mapChat(raw: RawChat): Chat {
  return {
    id: raw.id,
    title: raw.title,
    lastActivityAt: raw.last_activity_at,
    createdAt: raw.created_at,
  };
}

/**
 * Reads an SSE body (fetch doesn't give us EventSource's framing for free) and emits tokens.
 * Tokens are coalesced and flushed at most once per animation frame, so a fast stream drives
 * ~60 re-renders/sec of the reply instead of one per token — the difference is invisible to
 * the reader but keeps the render loop cheap. The post-stream reconcile refetches the
 * authoritative content, so any dropped intra-frame granularity is inconsequential.
 */
async function readTokenStream(response: Response, onToken: (chunk: string) => void): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let pending = '';
  let frame = 0;
  const flush = () => {
    frame = 0;
    if (pending) {
      const chunk = pending;
      pending = '';
      onToken(chunk);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(flush);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const data = rawEvent
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n');
        if (!data) continue;

        const { token } = JSON.parse(data) as { seq_id: number; token: string };
        pending += token;
        schedule();
      }
    }
  } finally {
    if (frame) cancelAnimationFrame(frame);
    flush();
  }
}

export type ChatApi = ReturnType<typeof createChatApi>;

export function createChatApi(baseUrl: string) {
  return {
    ensureSession: () => ensureSession(baseUrl),
    resetSession: () => resetSession(baseUrl),

    async fetchChats(): Promise<Chat[]> {
      const res = await authorizedFetch(baseUrl, '/chats?limit=50');
      const data = await parseJson<RawChat[]>(res);
      return data.map(mapChat);
    },

    async fetchMessages(chatId: string): Promise<Message[]> {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages`);
      const data = await parseJson<RawMessage[]>(res);
      return data.map(mapMessage);
    },

    async createChat(message: string): Promise<Chat> {
      const res = await authorizedFetch(baseUrl, '/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      return mapChat(await parseJson<RawChat>(res));
    },

    async postMessage(chatId: string, content: string): Promise<Message> {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return mapMessage(await parseJson<RawMessage>(res));
    },

    async retryMessage(chatId: string, messageId: string): Promise<Message> {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages/${messageId}/retry`, {
        method: 'POST',
      });
      return mapMessage(await parseJson<RawMessage>(res));
    },

    async modifyMessage(chatId: string, messageId: string, content: string): Promise<Message> {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages/${messageId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return mapMessage(await parseJson<RawMessage>(res));
    },

    async deleteChat(chatId: string): Promise<void> {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}`, { method: 'DELETE' });
      if (!res.ok) throw new HttpError(res.status);
    },

    openStream(chatId: string, messageId: string, signal: AbortSignal): Promise<Response> {
      return authorizedFetch(
        baseUrl,
        `/chats/${chatId}/messages/${messageId}/stream`,
        { signal, headers: { Accept: 'text/event-stream' } },
      );
    },

    readTokenStream,
  };
}

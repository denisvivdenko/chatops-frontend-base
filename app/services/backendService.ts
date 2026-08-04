import type { Chat, Message } from '../types/chat';
import type { AuthRequest } from './authService';
import { ensureOk, parseJson } from './errors';

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

type RawResource = { id: string; filename: string };

export type ResourceSummary = { id: string; filename: string };

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

function mapResource(raw: RawResource): ResourceSummary {
  return { id: raw.id, filename: raw.filename };
}

export type StreamOutcome = { status: 'complete' } | { status: 'failed'; reason?: string };

async function readTokenStream(response: Response, onToken: (chunk: string) => void): Promise<StreamOutcome | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let outcome: StreamOutcome | null = null;

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
      if (done) return outcome;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const lines = rawEvent.split('\n');

        const eventType = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const data = lines
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n');
        if (!data) continue;

        if (eventType === 'done') {
          flush();
          outcome = JSON.parse(data) as StreamOutcome;
          continue;
        }
        if (eventType === 'error') {
          flush();
          const { error } = JSON.parse(data) as { error: string };
          outcome = { status: 'failed', reason: error };
          continue;
        }
        if (eventType === 'loading') continue;

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

export type BackendApi = ReturnType<typeof createBackendApi>;

export function createBackendApi(request: AuthRequest) {
  async function openStream(chatId: string, messageId: string, signal: AbortSignal): Promise<Response> {
    const res = await request(
      `/chats/${chatId}/messages/${messageId}/stream`,
      { signal, headers: { Accept: 'text/event-stream' } },
    );
    await ensureOk(res);
    return res;
  }

  return {
    async fetchChats(): Promise<Chat[]> {
      const res = await request('/chats?limit=50');
      const data = await parseJson<RawChat[]>(res);
      return data.map(mapChat);
    },

    async fetchMessages(chatId: string): Promise<Message[]> {
      const res = await request(`/chats/${chatId}/messages`);
      const data = await parseJson<RawMessage[]>(res);
      return data.map(mapMessage);
    },

    async createChat(message: string): Promise<Chat> {
      const res = await request('/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      return mapChat(await parseJson<RawChat>(res));
    },

    async postMessage(chatId: string, content: string): Promise<Message> {
      const res = await request(`/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return mapMessage(await parseJson<RawMessage>(res));
    },

    async retryMessage(chatId: string, messageId: string): Promise<Message> {
      const res = await request(`/chats/${chatId}/messages/${messageId}/retry`, {
        method: 'POST',
      });
      return mapMessage(await parseJson<RawMessage>(res));
    },

    async modifyMessage(chatId: string, messageId: string, content: string): Promise<Message> {
      const res = await request(`/chats/${chatId}/messages/${messageId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return mapMessage(await parseJson<RawMessage>(res));
    },

    async deleteChat(chatId: string): Promise<void> {
      const res = await request(`/chats/${chatId}`, { method: 'DELETE' });
      await ensureOk(res);
    },

    async streamMessage(chatId: string, messageId: string, signal: AbortSignal, onToken: (token: string) => void): Promise<StreamOutcome | null> {
      const stream = await openStream(chatId, messageId, signal);
      return readTokenStream(stream, onToken);
    },

    async listResources(): Promise<ResourceSummary[]> {
      const res = await request('/resources');
      const data = await parseJson<RawResource[]>(res);
      return data.map(mapResource);
    },

    async uploadResource(file: File, signal: AbortSignal): Promise<ResourceSummary> {
      const body = new FormData();
      body.append('file', file);
      const res = await request('/upload-resource', { method: 'POST', body, signal });
      return mapResource(await parseJson<RawResource>(res));
    },
  };
}

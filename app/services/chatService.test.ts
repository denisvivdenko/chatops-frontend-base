import { beforeAll, describe, expect, it } from 'vitest';
import { createAnonymousSession } from './authService';
import { createChatApi, HttpError, type AuthorizedFetch } from './chatService';

const BASE_URL = process.env.BACKEND_URL ?? 'http://localhost:8000/api';

let authorizedFetch: AuthorizedFetch;

beforeAll(async () => {
  const token = await createAnonymousSession(BASE_URL);
  authorizedFetch = (path, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${BASE_URL}${path}`, { ...init, headers });
  };
});

describe('chatService', () => {
  it('createChat creates a chat that then shows up in fetchChats', async () => {
    const api = createChatApi(authorizedFetch);

    const chat = await api.createChat('hello from chatService test');
    expect(chat.id).toBeTruthy();

    const chats = await api.fetchChats();
    expect(chats.some(c => c.id === chat.id)).toBe(true);
  });

  it('postMessage while the first reply is still pending is rejected with 409', async () => {
    const api = createChatApi(authorizedFetch);
    const chat = await api.createChat('seed chat for pending-guard test');

    let error: unknown;
    try {
      await api.postMessage(chat.id, 'sent before the first reply finished');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(409);
  });

  it('postMessage adds a message that then shows up in fetchMessages, once the prior reply has completed', async () => {
    const api = createChatApi(authorizedFetch);
    const chat = await api.createChat('seed chat for postMessage test');

    const [pendingReply] = (await api.fetchMessages(chat.id)).filter(m => m.role === 'assistant');
    const streamRes = await api.openStream(chat.id, pendingReply.id, new AbortController().signal);
    await api.readTokenStream(streamRes, () => {});

    const message = await api.postMessage(chat.id, 'a follow-up message');
    expect(message.role).toBe('assistant');
    expect(['pending', 'complete']).toContain(message.status);

    const messages = await api.fetchMessages(chat.id);
    expect(messages.some(m => m.id === message.id)).toBe(true);
  }, 30000);

  it('deleteChat removes the chat - its messages 404 afterwards', async () => {
    const api = createChatApi(authorizedFetch);
    const chat = await api.createChat('chat to delete');

    await api.deleteChat(chat.id);

    let error: unknown;
    try {
      await api.fetchMessages(chat.id);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  });

  it('a request against a chat id that never existed throws an HttpError', async () => {
    const api = createChatApi(authorizedFetch);

    let error: unknown;
    try {
      await api.fetchMessages('does-not-exist');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  });
});

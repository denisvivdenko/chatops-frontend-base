import { beforeAll, describe, expect, it } from 'vitest';
import { createChatApi, type SessionFetch } from './chatService';
import { HttpError } from './httpError';
import { createSessionFetch, drainReply } from './testUtils';

let sessionFetch: SessionFetch;

beforeAll(async () => {
  sessionFetch = await createSessionFetch();
});

describe('chatService', () => {
  it('createChat creates a chat that then shows up in fetchChats', async () => {
    const api = createChatApi(sessionFetch);

    const chat = await api.createChat('hello from chatService test');
    expect(chat.id).toBeTruthy();
    expect(chat.title).toBe('hello from chatService test');
    expect(Number.isFinite(chat.createdAt)).toBe(true);
    expect(Number.isFinite(chat.lastActivityAt)).toBe(true);

    const chats = await api.fetchChats();
    expect(chats.some(c => c.id === chat.id)).toBe(true);
  });

  it('createChat seeds a complete user message and a pending assistant reply', async () => {
    const api = createChatApi(sessionFetch);

    const chat = await api.createChat('seed chat for message-shape test');

    const [user, assistant] = await api.fetchMessages(chat.id);
    expect(user.role).toBe('user');
    expect(user.status).toBe('complete');
    expect(user.content).toBe('seed chat for message-shape test');
    expect(Number.isFinite(user.createdAt)).toBe(true);
    expect(assistant.role).toBe('assistant');
    expect(Number.isFinite(assistant.createdAt)).toBe(true);
  });

  it('postMessage while the first reply is still pending is rejected with 409', async () => {
    const api = createChatApi(sessionFetch);
    const chat = await api.createChat('seed chat for pending-guard test');

    let error: unknown;
    try {
      await api.postMessage(chat.id, 'sent before the first reply finished');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(409);
    expect((error as HttpError).code).toBe('last_assistant_message_not_finished');
  });

  it('postMessage returns the new pending assistant reply, once the prior one has completed', async () => {
    const api = createChatApi(sessionFetch);
    const chat = await api.createChat('seed chat for postMessage test');
    await drainReply(api, chat.id);

    const message = await api.postMessage(chat.id, 'a follow-up message');

    // The user message is persisted but not returned - only the assistant reply is (api.md §3.5).
    expect(message.role).toBe('assistant');
    expect(message.status).toBe('pending');
    expect(message.content).toBe('');
    expect(Number.isFinite(message.createdAt)).toBe(true);

    const messages = await api.fetchMessages(chat.id);
    expect(messages.some(m => m.id === message.id)).toBe(true);
    const sent = messages.find(m => m.content === 'a follow-up message');
    expect(sent?.role).toBe('user');
    expect(sent?.status).toBe('complete');
  }, 30000);

  it('deleteChat removes the chat - its messages 404 afterwards', async () => {
    const api = createChatApi(sessionFetch);
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
    expect((error as HttpError).code).toBe('chat_not_found');
  });
});

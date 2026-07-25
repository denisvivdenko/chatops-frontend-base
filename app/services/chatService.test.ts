import { beforeAll, describe, expect, it } from 'vitest';
import { createChatApi } from './chatService';
import { type SessionFetch } from './http';
import { createSessionFetch } from './testUtils';

let sessionFetch: SessionFetch;

beforeAll(async () => {
  sessionFetch = await createSessionFetch();
});

describe('chatService', () => {
  it('Flow: create chat, stream message, send message, fetch messages', async () => {
    const api = createChatApi(sessionFetch);
    const firstMessage = 'hello from chatService test';
    const followUpMessage = 'a follow-up message';

    const chat = await api.createChat(firstMessage);
    const chats = await api.fetchChats();
    let messages = await api.fetchMessages(chat.id);
    const assistant = messages[1];

    let streamedMessage = '';
    const stream = await api.openStream(chat.id, assistant.id, new AbortController().signal);
    await api.readTokenStream(stream, (chunk) => {
      streamedMessage += chunk;
    });

    const secondAssistant = await api.postMessage(chat.id, followUpMessage);
    let streamedSecondMessage = '';
    const secondStream = await api.openStream(chat.id, secondAssistant.id, new AbortController().signal);
    await api.readTokenStream(secondStream, (chunk) => {
      streamedSecondMessage += chunk;
    });

    messages = await api.fetchMessages(chat.id);

    expect(chat.id).toBeTruthy();
    expect(chats.some(c => c.id === chat.id)).toBe(true);
    expect(Number.isFinite(chat.createdAt)).toBe(true);
    expect(Number.isFinite(chat.lastActivityAt)).toBe(true);

    expect(messages[0].role).toBe('user');
    expect(messages[0].status).toBe('complete');
    expect(messages[0].content).toBe(firstMessage);
    expect(Number.isFinite(messages[0].createdAt)).toBe(true);

    expect(messages[1].role).toBe('assistant');
    expect(Number.isFinite(messages[1].createdAt)).toBe(true);
    expect(messages[1].status).toBe('complete');
    expect(messages[1].content).toBe(streamedMessage);
    expect(streamedMessage).toBeTruthy();

    expect(messages[2].role).toBe('user');
    expect(messages[2].status).toBe('complete');
    expect(messages[2].content).toBe(followUpMessage);
    expect(Number.isFinite(messages[2].createdAt)).toBe(true);

    expect(messages[3].role).toBe('assistant');
    expect(Number.isFinite(messages[3].createdAt)).toBe(true);
    expect(messages[3].status).toBe('complete');
    expect(messages[3].content).toBe(streamedSecondMessage);
    expect(streamedSecondMessage).toBeTruthy();
  }, 30000);
});

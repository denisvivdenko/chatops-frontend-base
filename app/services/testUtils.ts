import { createAnonymousSession } from './authService';
import type { ChatApi, SessionFetch } from './chatService';

export const BASE_URL = process.env.BACKEND_URL ?? 'http://localhost:8000/api';

/**
 * A `SessionFetch` backed by a fresh anonymous session. Each caller gets its own
 * user, so tests never see chats or resources left behind by another run.
 */
export async function createSessionFetch(): Promise<SessionFetch> {
  const token = await createAnonymousSession(BASE_URL);
  return (path, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${BASE_URL}${path}`, { ...init, headers });
  };
}

/**
 * Waits out the chat's pending assistant reply by streaming it to completion.
 * Sending a follow-up message is a 409 until this has happened (api.md §3.5).
 */
export async function drainReply(api: ChatApi, chatId: string): Promise<void> {
  const messages = await api.fetchMessages(chatId);
  const pending = [...messages].reverse().find(m => m.role === 'assistant' && m.status === 'pending');
  if (!pending) return;

  const res = await api.openStream(chatId, pending.id, new AbortController().signal);
  await api.readTokenStream(res, () => {});
}

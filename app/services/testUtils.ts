import { createAnonymousSession } from './authService';
import type { ChatApi } from './chatService';
import { HttpError, type SessionFetch } from './http';

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
 * Awaits a call expected to fail and hands back its `HttpError`, so tests can assert
 * on status and code directly. Fails loudly if the call succeeds or throws something
 * else, rather than leaving assertions to run against an undefined error.
 */
export async function catchHttpError(call: Promise<unknown>): Promise<HttpError> {
  try {
    await call;
  } catch (err) {
    if (err instanceof HttpError) return err;
    throw err;
  }
  throw new Error('Expected the request to fail, but it succeeded.');
}

/**
 * Waits out the chat's pending assistant reply by streaming it to completion.
 * Sending a follow-up message is a 409 until this has happened (api.md §3.5).
 */
export async function drainReply(messageId: string, chatId: string, api: ChatApi): Promise<void> {
  const res = await api.openStream(chatId, messageId, new AbortController().signal);
  await api.readTokenStream(res, () => {});
}

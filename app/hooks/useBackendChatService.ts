'use client';

import { useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Chat, Message } from '../types/chat';
import { chatReducer, initialChatState } from './chatReducer';
import { ensureSession, authorizedFetch, resetSession } from './authSession';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 500;

class HttpError extends Error {
  constructor(public status: number) {
    super(`Request failed with status ${status}`);
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

function mapMessage(raw: {
  id: string;
  role: 'user' | 'assistant';
  status: 'pending' | 'complete' | 'failed';
  content: string;
  created_at: number;
}): Message {
  return {
    id: raw.id,
    role: raw.role,
    status: raw.status,
    content: raw.content,
    createdAt: raw.created_at,
  };
}

function mapChat(raw: {
  id: string;
  title: string;
  last_activity_at: number;
  created_at: number;
}): Chat {
  return {
    id: raw.id,
    title: raw.title,
    lastActivityAt: raw.last_activity_at,
    createdAt: raw.created_at,
  };
}

async function fetchChats(baseUrl: string): Promise<Chat[]> {
  const res = await authorizedFetch(baseUrl, '/chats?limit=50');
  const data = await parseJson<Parameters<typeof mapChat>[0][]>(res);
  return data.map(mapChat);
}

async function fetchMessages(baseUrl: string, chatId: string): Promise<Message[]> {
  const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages`);
  const data = await parseJson<Parameters<typeof mapMessage>[0][]>(res);
  return data.map(mapMessage);
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

export function useBackendChatService(baseUrl: string) {
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId ?? null;

  const [sessionReady, setSessionReady] = useState(false);
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const streamAbortRef = useRef<AbortController | null>(null);

  // The pending-new-chat message is shown only while on the home route (no chat id yet).
  const activeMessages = activeChatId === null
    ? (state.pendingNewChatMessage ? [state.pendingNewChatMessage] : [])
    : state.activeMessages;

  const handleFetchError = useCallback((err: unknown): boolean => {
    if (err instanceof HttpError && err.status === 404) {
      dispatch({ type: 'resourceNotFound', reason: 'not-found' });
      return true;
    }
    if (err instanceof HttpError && err.status === 403) {
      dispatch({ type: 'resourceNotFound', reason: 'forbidden' });
      return true;
    }
    return false;
  }, []);

  const goHome = useCallback(() => {
    dispatch({ type: 'resourceNotFoundDismissed' });
    fetchChats(baseUrl).then(chats => dispatch({ type: 'chatsLoaded', chats }));
    router.push('/');
  }, [baseUrl, router]);

  const dismissResourceNotFound = useCallback(() => {
    dispatch({ type: 'resourceNotFoundDismissed' });
  }, []);

  const attemptStream = useCallback(function attemptStream(chatId: string, messageId: string, attempt: number) {
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;

    async function reconcile() {
      let messages: Message[];
      try {
        messages = await fetchMessages(baseUrl, chatId);
      } catch (err) {
        if (abort.signal.aborted) return;
        handleFetchError(err);
        return;
      }
      if (abort.signal.aborted) return;

      const target = messages.find(m => m.id === messageId);

      if (target?.status === 'pending') {
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          dispatch({ type: 'messagesReplaced', messages: messages.map(m => m.id === messageId ? { ...m, content: '' } : m) });
          setTimeout(() => {
            if (!abort.signal.aborted) attemptStream(chatId, messageId, attempt + 1);
          }, RECONNECT_DELAY_MS);
        } else {
          // Gave up reconnecting; the backend may still consider this pending.
          // Reflect it as failed locally so the user gets a retry affordance.
          dispatch({ type: 'messagesReplaced', messages: messages.map(m => m.id === messageId ? { ...m, status: 'failed' } : m) });
        }
      } else {
        dispatch({ type: 'messagesReplaced', messages });
      }

      fetchChats(baseUrl).then(chats => dispatch({ type: 'chatsLoaded', chats }));
    }

    // The server closes the connection both on normal completion and on
    // failure/timeout, and a dropped connection looks the same either way.
    // Rather than guess which happened, always refetch messages and let the
    // backend-persisted status decide what happens next.
    async function run() {
      try {
        const response = await authorizedFetch(
          baseUrl,
          `/chats/${chatId}/messages/${messageId}/stream`,
          { signal: abort.signal, headers: { Accept: 'text/event-stream' } },
        );
        if (abort.signal.aborted) return;

        await readTokenStream(response, (token) => {
          if (abort.signal.aborted) return;
          dispatch({ type: 'tokenReceived', messageId, token });
        });
      } catch {
        if (abort.signal.aborted) return;
      }

      if (abort.signal.aborted) return;
      await reconcile();
    }

    run();
  }, [baseUrl, handleFetchError]);

  const retryMessage = useCallback(async function retryMessage(chatId: string, messageId: string) {
    let messages: Message[];
    try {
      messages = await fetchMessages(baseUrl, chatId);
    } catch (err) {
      handleFetchError(err);
      return;
    }
    dispatch({ type: 'messagesReplaced', messages });

    const target = messages.find(m => m.id === messageId);
    if (!target) return;

    if (target.status === 'failed') {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages/${messageId}/retry`, {
        method: 'POST',
      });
      if (!res.ok) {
        if (handleFetchError(new HttpError(res.status))) return;
        // Backend no longer considers it failed (e.g. already retried elsewhere) - reconcile.
        fetchMessages(baseUrl, chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(handleFetchError);
        return;
      }
      const updated = mapMessage(await res.json());
      dispatch({ type: 'messageReplaced', messageId, message: updated });
      attemptStream(chatId, messageId, 0);
    } else if (target.status === 'pending') {
      attemptStream(chatId, messageId, 0);
    }
  }, [baseUrl, attemptStream, handleFetchError]);

  useEffect(() => {
    let cancelled = false;
    ensureSession(baseUrl).then(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => { cancelled = true; };
  }, [baseUrl]);

  useEffect(() => {
    if (!sessionReady) return;
    fetchChats(baseUrl)
      .then(chats => dispatch({ type: 'chatsLoaded', chats }))
      .finally(() => dispatch({ type: 'chatsLoadFinished' }));
  }, [sessionReady, baseUrl]);

  useEffect(() => {
    if (!sessionReady || activeChatId === null) {
      dispatch({ type: 'messagesIdle' });
      return;
    }
    let cancelled = false;
    dispatch({ type: 'messagesLoading' });
    fetchMessages(baseUrl, activeChatId).then(messages => {
      if (cancelled) return;
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.status === 'pending') {
        dispatch({ type: 'messagesLoadedStreaming', messages, streamingId: last.id });
        attemptStream(activeChatId, last.id, 0);
      } else {
        dispatch({ type: 'messagesLoaded', messages });
      }
    }).catch(err => {
      if (cancelled) return;
      handleFetchError(err);
      dispatch({ type: 'messagesIdle' });
    });
    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
  }, [sessionReady, activeChatId, baseUrl, attemptStream, handleFetchError]);

  const sendMessage = useCallback(async function sendMessage(content: string) {
    const isNewChat = activeChatId === null;

    if (isNewChat) {
      dispatch({
        type: 'newChatPending',
        message: {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          status: 'complete',
          createdAt: Date.now(),
        },
      });

      try {
        const res = await authorizedFetch(baseUrl, '/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        });
        const chat = mapChat(await parseJson<Parameters<typeof mapChat>[0]>(res));

        dispatch({ type: 'newChatCreated', chat });
        router.push(`/chat/${chat.id}`);
      } catch (err) {
        dispatch({ type: 'newChatCleared' });
        handleFetchError(err);
      }
    } else {
      const chatId = activeChatId;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        status: 'complete',
        createdAt: Date.now(),
      };
      dispatch({ type: 'userMessageAppended', message: userMessage });

      try {
        const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const assistantMessage = mapMessage(await parseJson<Parameters<typeof mapMessage>[0]>(res));

        dispatch({ type: 'assistantMessageAppended', message: assistantMessage });
        attemptStream(chatId, assistantMessage.id, 0);
      } catch (err) {
        handleFetchError(err);
      }
    }
  }, [activeChatId, baseUrl, router, attemptStream, handleFetchError]);

  const modifyMessage = useCallback(async function modifyMessage(chatId: string, messageId: string, content: string) {
    let res: Response;
    try {
      res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages/${messageId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      handleFetchError(err);
      return;
    }

    if (!res.ok) {
      if (handleFetchError(new HttpError(res.status))) return;
      // 409s (e.g. a reply is still streaming) or a stale message id - reconcile with the backend.
      fetchMessages(baseUrl, chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(handleFetchError);
      return;
    }

    const assistantMessage = mapMessage(await res.json());
    dispatch({ type: 'messageModified', messageId, content, assistantMessage });
    attemptStream(chatId, assistantMessage.id, 0);
  }, [baseUrl, attemptStream, handleFetchError]);

  const deleteChat = useCallback(async function deleteChat(chatId: string) {
    const res = await authorizedFetch(baseUrl, `/chats/${chatId}`, { method: 'DELETE' });
    if (!res.ok) {
      handleFetchError(new HttpError(res.status));
      return;
    }
    dispatch({ type: 'chatDeleted', chatId });
    if (chatId === activeChatId) {
      router.push('/');
    }
  }, [baseUrl, activeChatId, router, handleFetchError]);

  const logout = useCallback(async function logout() {
    streamAbortRef.current?.abort();
    await resetSession(baseUrl);
    dispatch({ type: 'reset' });
    dispatch({ type: 'chatsLoaded', chats: await fetchChats(baseUrl) });
    router.push('/');
  }, [baseUrl, router]);

  return {
    chats: state.chats,
    activeChatId,
    activeMessages,
    isLoadingChats: state.isLoadingChats,
    isLoadingMessages: state.isLoadingMessages,
    sendMessage,
    retryMessage,
    modifyMessage,
    deleteChat,
    logout,
    notFoundReason: state.notFoundReason,
    goHome,
    dismissResourceNotFound,
  };
}

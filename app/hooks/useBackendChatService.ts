'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Chat, Message } from '../types/chat';
import { ensureSession, authorizedFetch, resetSession } from './authSession';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 500;

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
  const data = await res.json();
  return data.map(mapChat);
}

async function fetchMessages(baseUrl: string, chatId: string): Promise<Message[]> {
  const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages`);
  const data = await res.json();
  return data.map(mapMessage);
}

/** Reads an SSE body (fetch doesn't give us EventSource's framing for free) and emits each token. */
async function readTokenStream(response: Response, onToken: (token: string) => void): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
      onToken(token);
    }
  }
}

export function useBackendChatService(baseUrl: string) {
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId ?? null;

  const [sessionReady, setSessionReady] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [_activeMessages, setActiveMessages] = useState<Message[]>([]);
  const activeMessages = activeChatId === null ? [] : _activeMessages;
  const streamAbortRef = useRef<AbortController | null>(null);

  const attemptStream = useCallback(function attemptStream(chatId: string, messageId: string, attempt: number) {
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;

    async function reconcile() {
      const messages = await fetchMessages(baseUrl, chatId);
      if (abort.signal.aborted) return;

      const target = messages.find(m => m.id === messageId);

      if (target?.status === 'pending') {
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          setActiveMessages(messages.map(m => m.id === messageId ? { ...m, content: '' } : m));
          setTimeout(() => {
            if (!abort.signal.aborted) attemptStream(chatId, messageId, attempt + 1);
          }, RECONNECT_DELAY_MS);
        } else {
          // Gave up reconnecting; the backend may still consider this pending.
          // Reflect it as failed locally so the user gets a retry affordance.
          setActiveMessages(messages.map(m => m.id === messageId ? { ...m, status: 'failed' } : m));
        }
      } else {
        setActiveMessages(messages);
      }

      fetchChats(baseUrl).then(setChats);
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
          setActiveMessages(prev =>
            prev.map(m =>
              m.id === messageId
                ? { ...m, content: m.content ? m.content + token : token }
                : m
            )
          );
        });
      } catch {
        if (abort.signal.aborted) return;
      }

      if (abort.signal.aborted) return;
      await reconcile();
    }

    run();
  }, [baseUrl]);

  const retryMessage = useCallback(async function retryMessage(chatId: string, messageId: string) {
    const messages = await fetchMessages(baseUrl, chatId);
    setActiveMessages(messages);

    const target = messages.find(m => m.id === messageId);
    if (!target) return;

    if (target.status === 'failed') {
      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages/${messageId}/retry`, {
        method: 'POST',
      });
      if (!res.ok) {
        // Backend no longer considers it failed (e.g. already retried elsewhere) - reconcile.
        fetchMessages(baseUrl, chatId).then(setActiveMessages);
        return;
      }
      const updated = mapMessage(await res.json());
      setActiveMessages(prev => prev.map(m => m.id === messageId ? updated : m));
      attemptStream(chatId, messageId, 0);
    } else if (target.status === 'pending') {
      attemptStream(chatId, messageId, 0);
    }
  }, [baseUrl, attemptStream]);

  useEffect(() => {
    let cancelled = false;
    ensureSession(baseUrl).then(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => { cancelled = true; };
  }, [baseUrl]);

  useEffect(() => {
    if (!sessionReady) return;
    fetchChats(baseUrl).then(setChats);
  }, [sessionReady, baseUrl]);

  useEffect(() => {
    if (!sessionReady || activeChatId === null) {
      return;
    }
    let cancelled = false;
    fetchMessages(baseUrl, activeChatId).then(messages => {
      if (cancelled) return;
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.status === 'pending') {
        setActiveMessages(messages.map(m => m.id === last.id ? { ...m, content: '' } : m));
        attemptStream(activeChatId, last.id, 0);
      } else {
        setActiveMessages(messages);
      }
    });
    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
  }, [sessionReady, activeChatId, baseUrl, attemptStream]);

  async function sendMessage(content: string) {
    const isNewChat = activeChatId === null;

    if (isNewChat) {
      const res = await authorizedFetch(baseUrl, '/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      const chat = mapChat(await res.json());

      setChats(prev => [chat, ...prev]);
      router.push(`/chat/${chat.id}`);
    } else {
      const chatId = activeChatId;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        status: 'complete',
        createdAt: Date.now(),
      };

      const res = await authorizedFetch(baseUrl, `/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const assistantMessage = mapMessage(await res.json());

      setActiveMessages(prev => [...prev, userMessage, assistantMessage]);
      attemptStream(chatId, assistantMessage.id, 0);
    }
  }

  const logout = useCallback(async function logout() {
    streamAbortRef.current?.abort();
    await resetSession(baseUrl);
    setActiveMessages([]);
    setChats(await fetchChats(baseUrl));
    router.push('/');
  }, [baseUrl, router]);

  return {
    chats,
    activeChatId,
    activeMessages,
    sendMessage,
    retryMessage,
    logout,
  };
}

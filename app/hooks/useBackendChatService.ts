'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Chat, Message } from '../types/chat';

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
  const res = await fetch(`${baseUrl}/chats?limit=50`);
  const data = await res.json();
  return data.map(mapChat);
}

async function fetchMessages(baseUrl: string, chatId: string): Promise<Message[]> {
  const res = await fetch(`${baseUrl}/chats/${chatId}/messages`);
  const data = await res.json();
  return data.map(mapMessage);
}

export function useBackendChatService(baseUrl: string) {
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId ?? null;

  const [chats, setChats] = useState<Chat[]>([]);
  const [_activeMessages, setActiveMessages] = useState<Message[]>([]);
  const activeMessages = activeChatId === null ? [] : _activeMessages;
  const streamAbortRef = useRef<AbortController | null>(null);

  const attemptStream = useCallback(function attemptStream(chatId: string, messageId: string, attempt: number) {
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;

    const url = `${baseUrl}/chats/${chatId}/messages/${messageId}/stream`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      if (abort.signal.aborted) {
        eventSource.close();
        return;
      }
      const { token } = JSON.parse(e.data) as { seq_id: number; token: string };
      setActiveMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content: m.content ? m.content + token : token }
            : m
        )
      );
    };

    // The server closes the connection both on normal completion and on
    // failure/timeout (it emits a named `event: error` frame first in the
    // latter case), and a dropped connection looks the same to EventSource.
    // Rather than guess which happened, always refetch messages and let the
    // backend-persisted status decide what happens next.
    eventSource.onerror = async () => {
      eventSource.close();
      if (abort.signal.aborted) return;

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
    };
  }, [baseUrl]);

  const retryMessage = useCallback(async function retryMessage(chatId: string, messageId: string) {
    const messages = await fetchMessages(baseUrl, chatId);
    setActiveMessages(messages);

    const target = messages.find(m => m.id === messageId);
    if (!target) return;

    if (target.status === 'failed') {
      const res = await fetch(`${baseUrl}/chats/${chatId}/messages/${messageId}/retry`, {
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
    fetchChats(baseUrl).then(setChats);
  }, [baseUrl]);

  useEffect(() => {
    if (activeChatId === null) {
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
  }, [activeChatId, baseUrl, attemptStream]);

  async function sendMessage(content: string) {
    const isNewChat = activeChatId === null;

    if (isNewChat) {
      const res = await fetch(`${baseUrl}/chats`, {
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

      const res = await fetch(`${baseUrl}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const assistantMessage = mapMessage(await res.json());

      setActiveMessages(prev => [...prev, userMessage, assistantMessage]);
      attemptStream(chatId, assistantMessage.id, 0);
    }
  }

  return {
    chats,
    activeChatId,
    activeMessages,
    sendMessage,
    retryMessage,
  };
}

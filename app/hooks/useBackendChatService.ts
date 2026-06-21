'use client';

import { useState, useEffect, useRef } from 'react';
import type { Chat, Message } from '../types/chat';

const BASE = 'http://localhost:8000';

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

async function fetchChats(): Promise<Chat[]> {
  const res = await fetch(`${BASE}/chats?limit=50`);
  const data = await res.json();
  return data.map(mapChat);
}

async function fetchMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`${BASE}/chats/${chatId}/messages`);
  const data = await res.json();
  return data.map(mapMessage);
}

export function useBackendChatService() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchChats().then(setChats);
  }, []);

  useEffect(() => {
    const promise = activeChatId === null ? Promise.resolve<Message[]>([]) : fetchMessages(activeChatId);
    promise.then(setActiveMessages);
  }, [activeChatId]);

  function startNewChat() {
    setActiveChatId(null);
  }

  function selectChat(id: string) {
    setActiveChatId(id);
  }

  function streamAssistantMessage(chatId: string, assistantMessageId: string) {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    const abort = new AbortController();
    streamAbortRef.current = abort;

    const url = `${BASE}/chats/${chatId}/messages/${assistantMessageId}/stream`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      console.log(Date.now(), e.data);

      if (abort.signal.aborted) {
        eventSource.close();
        return;
      }
      const { token } = JSON.parse(e.data) as { seq_id: number; token: string };
      setActiveMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: m.content ? m.content + token : token }
            : m
        )
      );
    };

    eventSource.onerror = () => {
      eventSource.close();
      setActiveMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId && m.status === 'pending'
            ? { ...m, status: 'complete' }
            : m
        )
      );
      fetchChats().then(setChats);
    };
  }

  async function sendMessage(content: string) {
    const isNewChat = activeChatId === null;

    if (isNewChat) {
      const res = await fetch(`${BASE}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      const chat = mapChat(await res.json());

      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat.id);

      const messages = await fetchMessages(chat.id);
      setActiveMessages(messages);

      const assistantMessage = messages.find(m => m.role === 'assistant' && m.status === 'pending');
      if (assistantMessage) {
        streamAssistantMessage(chat.id, assistantMessage.id);
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

      const res = await fetch(`${BASE}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const assistantMessage = mapMessage(await res.json());

      setActiveMessages(prev => [...prev, userMessage, assistantMessage]);
      streamAssistantMessage(chatId, assistantMessage.id);
    }
  }

  return {
    chats,
    activeChatId,
    activeMessages,
    startNewChat,
    selectChat,
    sendMessage,
  };
}

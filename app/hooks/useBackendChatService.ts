'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat, Message } from '../types/chat';



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
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [_activeMessages, setActiveMessages] = useState<Message[]>([]);
  const activeMessages = activeChatId === null ? [] : _activeMessages;
  const streamAbortRef = useRef<AbortController | null>(null);

  const streamAssistantMessage = useCallback(function streamAssistantMessage(chatId: string, assistantMessageId: string) {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    const abort = new AbortController();
    streamAbortRef.current = abort;

    const url = `${baseUrl}/chats/${chatId}/messages/${assistantMessageId}/stream`;
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
      fetchChats(baseUrl).then(setChats);
    };
  }, [baseUrl]);

  useEffect(() => {
    fetchChats(baseUrl).then(setChats);
  }, [baseUrl]);

  useEffect(() => {
    if (activeChatId === null) {
      return;
    }
    fetchMessages(baseUrl, activeChatId).then(messages => {
      const pendingAssistant = messages.find(m => m.role === 'assistant' && m.status === 'pending');
      if (pendingAssistant) {
        setActiveMessages(messages.map(m => m.id === pendingAssistant.id ? { ...m, content: '' } : m));
        streamAssistantMessage(activeChatId, pendingAssistant.id);
      } else {
        setActiveMessages(messages);
      }
    });
  }, [activeChatId, baseUrl, streamAssistantMessage]);

  function startNewChat() {
    setActiveChatId(null);
  }

  function selectChat(id: string) {
    setActiveChatId(id);
  }

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
      setActiveChatId(chat.id);

      const messages = await fetchMessages(baseUrl, chat.id);
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

      const res = await fetch(`${baseUrl}/chats/${chatId}/messages`, {
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

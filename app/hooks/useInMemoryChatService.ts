'use client';

import { useState } from 'react';
import type { Chat, Message } from '../types/chat';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function truncateTitle(content: string, maxLength = 40): string {
  return content.length <= maxLength ? content : content.slice(0, maxLength).trimEnd() + '…';
}

export function useInMemoryChatService() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeMessages: Message[] = activeChatId ? (messagesByChat[activeChatId] ?? []) : [];

  function startNewChat() {
    setActiveChatId(null);
  }

  function selectChat(id: string) {
    setActiveChatId(id);
  }

  function sendMessage(content: string) {
    const now = Date.now();
    const isNewChat = activeChatId === null;
    let chatId = activeChatId;

    if (isNewChat) {
      chatId = generateId();
      const newChat: Chat = {
        id: chatId,
        title: truncateTitle(content),
        lastMessage: content,
        lastActivityAt: now,
        createdAt: now,
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(chatId);
    } else {
      setChats(prev =>
        prev
          .map(c => c.id === chatId ? { ...c, lastMessage: content, lastActivityAt: now } : c)
          .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      );
    }

    const userMessage: Message = {
      id: generateId(),
      chatId: chatId!,
      role: 'user',
      content,
      status: 'complete',
      createdAt: now,
    };

    const assistantMessage: Message = {
      id: generateId(),
      chatId: chatId!,
      role: 'assistant',
      content: 'This is a placeholder response.',
      status: 'complete',
      createdAt: now + 1,
    };

    setMessagesByChat(prev => ({
      ...prev,
      [chatId!]: [...(prev[chatId!] ?? []), userMessage, assistantMessage],
    }));
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

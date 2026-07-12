'use client';

import { useReducer, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Message } from '../types/chat';
import { chatReducer, initialChatState, selectActiveMessages } from './chatReducer';
import { createChatApi, HttpError } from './chatApi';
import { createChatStream } from './chatStream';

export function useBackendChatService(baseUrl: string) {
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId ?? null;

  const api = useMemo(() => createChatApi(baseUrl), [baseUrl]);

  const [sessionReady, setSessionReady] = useState(false);
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const activeMessages = selectActiveMessages(state, activeChatId);

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
    api.fetchChats().then(chats => dispatch({ type: 'chatsLoaded', chats }));
    router.push('/');
  }, [api, router]);

  const dismissResourceNotFound = useCallback(() => {
    dispatch({ type: 'resourceNotFoundDismissed' });
  }, []);

  const stream = useMemo(() => createChatStream(api, {
    onToken: (messageId, token) => dispatch({ type: 'tokenReceived', messageId, token }),
    onMessages: (messages) => dispatch({ type: 'messagesReplaced', messages }),
    onChatsStale: () => { api.fetchChats().then(chats => dispatch({ type: 'chatsLoaded', chats })); },
    onError: handleFetchError,
  }), [api, handleFetchError]);

  const retryMessage = useCallback(async function retryMessage(chatId: string, messageId: string) {
    let messages: Message[];
    try {
      messages = await api.fetchMessages(chatId);
    } catch (err) {
      handleFetchError(err);
      return;
    }
    dispatch({ type: 'messagesReplaced', messages });

    const target = messages.find(m => m.id === messageId);
    if (!target) return;

    if (target.status === 'failed') {
      let updated: Message;
      try {
        updated = await api.retryMessage(chatId, messageId);
      } catch (err) {
        if (handleFetchError(err)) return;
        // Backend no longer considers it failed (e.g. already retried elsewhere) - reconcile.
        api.fetchMessages(chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(handleFetchError);
        return;
      }
      dispatch({ type: 'messageReplaced', messageId, message: updated });
      stream.start(chatId, messageId);
    } else if (target.status === 'pending') {
      stream.start(chatId, messageId);
    }
  }, [api, stream, handleFetchError]);

  useEffect(() => {
    let cancelled = false;
    api.ensureSession().then(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => { cancelled = true; };
  }, [api]);

  useEffect(() => {
    if (!sessionReady) return;
    api.fetchChats()
      .then(chats => dispatch({ type: 'chatsLoaded', chats }))
      .finally(() => dispatch({ type: 'chatsLoadFinished' }));
  }, [sessionReady, api]);

  useEffect(() => {
    if (!sessionReady || activeChatId === null) {
      dispatch({ type: 'messagesIdle' });
      return;
    }
    let cancelled = false;
    dispatch({ type: 'messagesLoading' });
    api.fetchMessages(activeChatId).then(messages => {
      if (cancelled) return;
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.status === 'pending') {
        dispatch({ type: 'messagesLoadedStreaming', messages, streamingId: last.id });
        stream.start(activeChatId, last.id);
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
      stream.abort();
    };
  }, [sessionReady, activeChatId, api, stream, handleFetchError]);

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
        const chat = await api.createChat(content);
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
        const assistantMessage = await api.postMessage(chatId, content);
        dispatch({ type: 'assistantMessageAppended', message: assistantMessage });
        stream.start(chatId, assistantMessage.id);
      } catch (err) {
        handleFetchError(err);
      }
    }
  }, [activeChatId, api, router, stream, handleFetchError]);

  const modifyMessage = useCallback(async function modifyMessage(chatId: string, messageId: string, content: string) {
    let assistantMessage: Message;
    try {
      assistantMessage = await api.modifyMessage(chatId, messageId, content);
    } catch (err) {
      if (handleFetchError(err)) return;
      // 409s (e.g. a reply is still streaming) or a stale message id - reconcile with the backend.
      api.fetchMessages(chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(handleFetchError);
      return;
    }

    dispatch({ type: 'messageModified', messageId, content, assistantMessage });
    stream.start(chatId, assistantMessage.id);
  }, [api, stream, handleFetchError]);

  const deleteChat = useCallback(async function deleteChat(chatId: string) {
    try {
      await api.deleteChat(chatId);
    } catch (err) {
      handleFetchError(err);
      return;
    }
    dispatch({ type: 'chatDeleted', chatId });
    if (chatId === activeChatId) {
      router.push('/');
    }
  }, [api, activeChatId, router, handleFetchError]);

  const logout = useCallback(async function logout() {
    stream.abort();
    await api.resetSession();
    dispatch({ type: 'reset' });
    dispatch({ type: 'chatsLoaded', chats: await api.fetchChats() });
    router.push('/');
  }, [api, stream, router]);

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

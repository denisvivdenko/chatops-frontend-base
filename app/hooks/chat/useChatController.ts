'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Dispatch } from 'react';
import type { Message } from '../../types/chat';
import type { AppAction } from './appState';
import { createChatApi, HttpError } from './chatApi';
import { createChatStream } from './chatStream';

/**
 * Orchestrates the chat domain: it owns the load effects and the streaming machine,
 * reads `activeChatId` from the URL, and turns network results into `dispatch`es
 * against the shared store. It holds no state of its own — state lives in the store,
 * identity comes in as `sessionId`. Returns the chat actions (retry/modify already
 * bound to the active chat, null on the home route).
 */
export function useChatController(sessionId: string | null, dispatch: Dispatch<AppAction>, baseUrl: string) {
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId ?? null;

  const api = useMemo(() => createChatApi(baseUrl), [baseUrl]);

  // The controller is the sole writer of activeChatId: it mirrors the URL into the
  // store so components read it from context instead of reaching for `useParams`.
  useEffect(() => {
    dispatch({ type: 'activeChatChanged', activeChatId });
  }, [activeChatId, dispatch]);

  const reportError = useCallback((err: unknown): boolean => {
    if (err instanceof HttpError && err.status === 404) {
      dispatch({ type: 'errorRaised', reason: 'not-found' });
      return true;
    }
    if (err instanceof HttpError && err.status === 403) {
      dispatch({ type: 'errorRaised', reason: 'forbidden' });
      return true;
    }
    return false;
  }, [dispatch]);

  const stream = useMemo(() => createChatStream(api, {
    onToken: (messageId, token) => dispatch({ type: 'tokenReceived', messageId, token }),
    onMessages: (messages) => dispatch({ type: 'messagesReplaced', messages }),
    onChatsStale: () => { api.fetchChats().then(chats => dispatch({ type: 'chatsLoaded', chats })); },
    onError: reportError,
  }), [api, reportError, dispatch]);

  const retryAction = useCallback(async function retryAction(chatId: string, messageId: string) {
    let messages: Message[];
    try {
      messages = await api.fetchMessages(chatId);
    } catch (err) {
      reportError(err);
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
        if (reportError(err)) return;
        // Backend no longer considers it failed (e.g. already retried elsewhere) - reconcile.
        api.fetchMessages(chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(reportError);
        return;
      }
      dispatch({ type: 'messageReplaced', messageId, message: updated });
      stream.start(chatId, messageId);
    } else if (target.status === 'pending') {
      stream.start(chatId, messageId);
    }
  }, [api, stream, reportError, dispatch]);

  // Chat list: (re)loads whenever the session identity changes — including logout,
  // which mints a new id.
  useEffect(() => {
    if (sessionId === null) return;
    api.fetchChats()
      .then(chats => dispatch({ type: 'chatsLoaded', chats }))
      .finally(() => dispatch({ type: 'chatsLoadFinished' }));
  }, [sessionId, api, dispatch]);

  // Active-chat messages: loads on route change (and once the session is ready).
  useEffect(() => {
    if (sessionId === null || activeChatId === null) {
      // No active chat: clear the buffer so a previous/just-deleted chat's messages
      // don't linger. The optimistic new-chat message (set on send) survives because
      // this effect doesn't re-run until the route actually changes.
      dispatch({ type: 'messagesCleared' });
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
      reportError(err);
      dispatch({ type: 'messagesIdle' });
    });
    return () => {
      cancelled = true;
      stream.abort();
    };
  }, [sessionId, activeChatId, api, stream, reportError, dispatch]);

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
        dispatch({ type: 'chatCreated', chat });
        router.push(`/chat/${chat.id}`);
      } catch (err) {
        dispatch({ type: 'newChatCleared' });
        reportError(err);
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
        reportError(err);
      }
    }
  }, [activeChatId, api, router, stream, reportError, dispatch]);

  const modifyAction = useCallback(async function modifyAction(chatId: string, messageId: string, content: string) {
    let assistantMessage: Message;
    try {
      assistantMessage = await api.modifyMessage(chatId, messageId, content);
    } catch (err) {
      if (reportError(err)) return;
      // 409s (e.g. a reply is still streaming) or a stale message id - reconcile with the backend.
      api.fetchMessages(chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(reportError);
      return;
    }

    dispatch({ type: 'messageModified', messageId, content, assistantMessage });
    stream.start(chatId, assistantMessage.id);
  }, [api, stream, reportError, dispatch]);

  const deleteChat = useCallback(async function deleteChat(chatId: string) {
    try {
      await api.deleteChat(chatId);
    } catch (err) {
      reportError(err);
      return;
    }
    dispatch({ type: 'chatDeleted', chatId });
    if (chatId === activeChatId) {
      router.push('/');
    }
  }, [api, activeChatId, router, reportError, dispatch]);

  // retry/modify are bound to the active chat here so consumers (Message) call them
  // with just a messageId and never need the URL. activeChatId is stable during
  // streaming, so these keep a stable identity across tokens. null on the home route.
  const retryMessage = useMemo(
    () => (activeChatId ? (messageId: string) => retryAction(activeChatId, messageId) : null),
    [activeChatId, retryAction],
  );
  const modifyMessage = useMemo(
    () => (activeChatId ? (messageId: string, content: string) => modifyAction(activeChatId, messageId, content) : null),
    [activeChatId, modifyAction],
  );

  return { sendMessage, deleteChat, retryMessage, modifyMessage };
}

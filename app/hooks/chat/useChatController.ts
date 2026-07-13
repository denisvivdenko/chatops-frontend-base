'use client';

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Message } from '../../types/chat';
import { chatReducer, initialChatState, selectActiveMessages } from './chatReducer';
import { createChatApi } from './chatApi';
import { createChatStream } from './chatStream';
import { useResourceError } from './useResourceError';
import { useSession } from '../useSession';
import type { ChatsValue, MessagesValue, StatusValue, ChatActionsValue } from '../../context/chatContext';

export function useChatController(baseUrl: string) {
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId ?? null;

  const api = useMemo(() => createChatApi(baseUrl), [baseUrl]);
  const { ready: sessionReady, reset: resetSession } = useSession(baseUrl);
  const { notFoundReason, report, dismiss } = useResourceError();

  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const activeMessages = selectActiveMessages(state, activeChatId);

  const goHome = useCallback(() => {
    dismiss();
    api.fetchChats().then(chats => dispatch({ type: 'chatsLoaded', chats }));
    router.push('/');
  }, [api, router, dismiss]);

  const stream = useMemo(() => createChatStream(api, {
    onToken: (messageId, token) => dispatch({ type: 'tokenReceived', messageId, token }),
    onMessages: (messages) => dispatch({ type: 'messagesReplaced', messages }),
    onChatsStale: () => { api.fetchChats().then(chats => dispatch({ type: 'chatsLoaded', chats })); },
    onError: report,
  }), [api, report]);

  const retryAction = useCallback(async function retryAction(chatId: string, messageId: string) {
    let messages: Message[];
    try {
      messages = await api.fetchMessages(chatId);
    } catch (err) {
      report(err);
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
        if (report(err)) return;
        // Backend no longer considers it failed (e.g. already retried elsewhere) - reconcile.
        api.fetchMessages(chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(report);
        return;
      }
      dispatch({ type: 'messageReplaced', messageId, message: updated });
      stream.start(chatId, messageId);
    } else if (target.status === 'pending') {
      stream.start(chatId, messageId);
    }
  }, [api, stream, report]);

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
    dismiss(); // entering a chat clears any stale not-found banner (was folded into 'messagesLoading')
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
      report(err);
      dispatch({ type: 'messagesIdle' });
    });
    return () => {
      cancelled = true;
      stream.abort();
    };
  }, [sessionReady, activeChatId, api, stream, report, dismiss]);

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
        report(err);
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
        report(err);
      }
    }
  }, [activeChatId, api, router, stream, report]);

  const modifyAction = useCallback(async function modifyAction(chatId: string, messageId: string, content: string) {
    let assistantMessage: Message;
    try {
      assistantMessage = await api.modifyMessage(chatId, messageId, content);
    } catch (err) {
      if (report(err)) return;
      // 409s (e.g. a reply is still streaming) or a stale message id - reconcile with the backend.
      api.fetchMessages(chatId).then(messages => dispatch({ type: 'messagesReplaced', messages })).catch(report);
      return;
    }

    dispatch({ type: 'messageModified', messageId, content, assistantMessage });
    stream.start(chatId, assistantMessage.id);
  }, [api, stream, report]);

  const deleteChat = useCallback(async function deleteChat(chatId: string) {
    try {
      await api.deleteChat(chatId);
    } catch (err) {
      report(err);
      return;
    }
    dispatch({ type: 'chatDeleted', chatId });
    if (chatId === activeChatId) {
      router.push('/');
    }
  }, [api, activeChatId, router, report]);

  const logout = useCallback(async function logout() {
    stream.abort();
    await resetSession();
    dispatch({ type: 'reset' });
    dispatch({ type: 'chatsLoaded', chats: await api.fetchChats() });
    router.push('/');
  }, [api, stream, router, resetSession]);

  // State is exposed as the same domain slices the contexts consume, so grouping
  // lives here (next to the state it derives from) rather than being re-assembled
  // downstream. Each slice is memoized independently: while a reply streams, only
  // `messages` changes identity, so the sidebar and action triggers sit it out.
  const chats: ChatsValue = useMemo(
    () => ({ chats: state.chats, activeChatId, isLoadingChats: state.isLoadingChats }),
    [state.chats, activeChatId, state.isLoadingChats],
  );

  const messages: MessagesValue = useMemo(
    () => ({ activeMessages, isLoadingMessages: state.isLoadingMessages }),
    [activeMessages, state.isLoadingMessages],
  );

  const status: StatusValue = useMemo(
    () => ({ notFoundReason }),
    [notFoundReason],
  );

  // retry/modify are bound to the active chat here so consumers (Message) call
  // them with just a messageId and never need ChatsContext. activeChatId is stable
  // during streaming, so these — and the whole actions slice — keep a stable
  // identity across tokens. null on the home route (no chat to act on).
  const retryMessage = useMemo(
    () => (activeChatId ? (messageId: string) => retryAction(activeChatId, messageId) : null),
    [activeChatId, retryAction],
  );
  const modifyMessage = useMemo(
    () => (activeChatId ? (messageId: string, content: string) => modifyAction(activeChatId, messageId, content) : null),
    [activeChatId, modifyAction],
  );

  const actions: ChatActionsValue = useMemo(
    () => ({ sendMessage, deleteChat, logout, goHome, dismissResourceNotFound: dismiss, retryMessage, modifyMessage }),
    [sendMessage, deleteChat, logout, goHome, dismiss, retryMessage, modifyMessage],
  );

  return { chats, messages, status, actions };
}

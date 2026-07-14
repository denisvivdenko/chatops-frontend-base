import type { Message } from '../../types/chat';
import type { ChatApi, StreamOutcome } from './chatApi';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 500;

/**
 * Owns the lifecycle of streaming one assistant reply: open the SSE stream, emit
 * tokens, and react to how it ends. The backend's terminal `done` event is
 * authoritative — it's applied directly with no extra round trip. Only when the
 * connection closes *without* one (drop, timeout, old backend) is the outcome
 * genuinely ambiguous, and only then do we reconcile against the backend-persisted
 * status (retrying with backoff while it's still pending, giving up as "failed"
 * after a few tries). It holds the AbortController and attempt counter itself and
 * speaks only in callbacks — it never touches the reducer, so the reconnect policy
 * lives here while the mapping to state stays with the caller.
 */
export type ChatStreamCallbacks = {
  /** A token arrived for the streaming message. */
  onToken: (messageId: string, token: string) => void;
  /** The backend's own terminal event arrived — apply it directly, no refetch needed. */
  onMessageDone: (messageId: string, status: 'complete' | 'failed') => void;
  /** No terminal event arrived; this is the reconciled, authoritative message list. */
  onMessages: (messages: Message[]) => void;
  /** The chat list (sidebar) may be out of date and should be refreshed. */
  onChatsStale: () => void;
  /** A reconcile refetch failed (e.g. 404/403). */
  onError: (err: unknown) => void;
};

export type ChatStream = ReturnType<typeof createChatStream>;

export function createChatStream(api: ChatApi, cb: ChatStreamCallbacks) {
  let abortController: AbortController | null = null;

  function attempt(chatId: string, messageId: string, attemptN: number) {
    abortController?.abort();
    const abort = new AbortController();
    abortController = abort;

    async function reconcile() {
      let messages: Message[];
      try {
        messages = await api.fetchMessages(chatId);
      } catch (err) {
        if (abort.signal.aborted) return;
        cb.onError(err);
        return;
      }
      if (abort.signal.aborted) return;

      const target = messages.find(m => m.id === messageId);

      if (target?.status === 'pending') {
        if (attemptN < MAX_RECONNECT_ATTEMPTS) {
          cb.onMessages(messages.map(m => m.id === messageId ? { ...m, content: '' } : m));
          setTimeout(() => {
            if (!abort.signal.aborted) attempt(chatId, messageId, attemptN + 1);
          }, RECONNECT_DELAY_MS);
        } else {
          // Gave up reconnecting; the backend may still consider this pending.
          // Reflect it as failed locally so the user gets a retry affordance.
          cb.onMessages(messages.map(m => m.id === messageId ? { ...m, status: 'failed' } : m));
        }
      } else {
        cb.onMessages(messages);
      }

      cb.onChatsStale();
    }

    async function run() {
      let outcome: StreamOutcome | null = null;
      try {
        const response = await api.openStream(chatId, messageId, abort.signal);
        if (abort.signal.aborted) return;

        outcome = await api.readTokenStream(response, (token) => {
          if (!abort.signal.aborted) cb.onToken(messageId, token);
        });
      } catch {
        if (abort.signal.aborted) return;
      }

      if (abort.signal.aborted) return;

      if (outcome) {
        // The backend told us directly how this ended — trust it, no refetch needed.
        cb.onMessageDone(messageId, outcome.status);
        cb.onChatsStale();
        return;
      }

      // No terminal event reached us (dropped connection, timeout, old backend) —
      // genuinely ambiguous, so fall back to reconciling against the backend.
      await reconcile();
    }

    run();
  }

  return {
    /** Start (or restart) streaming a reply; supersedes any in-flight stream. */
    start(chatId: string, messageId: string) {
      attempt(chatId, messageId, 0);
    },
    /** Stop the in-flight stream and any scheduled reconnect. */
    abort() {
      abortController?.abort();
    },
  };
}

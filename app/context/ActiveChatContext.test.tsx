import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActiveChatProvider, useMessages, useActiveChatActions } from './ActiveChatContext';
import { NotFoundError, AccessDeniedError } from '../services/errors';
import type { Message } from '../types/chat';
import type { StreamOutcome } from '../services/backendService';

let activeChatId: string | null = 'chat-1';
vi.mock('./ChatContext', () => ({
  useChats: () => ({ activeChatId }),
}));

const reportError = vi.fn();
vi.mock('./ErrorContext', () => ({
  useErrorReporter: () => ({ reportError }),
}));

const fetchMessages = vi.fn();
const postMessage = vi.fn();
const retryMessage = vi.fn();
const modifyMessage = vi.fn();
const streamMessage = vi.fn();

vi.mock('../hooks/useBackendApi', () => ({
  useBackendApi: () => ({
    fetchMessages,
    postMessage,
    retryMessage,
    modifyMessage,
    streamMessage,
  }),
}));

function msg(overrides: Partial<Message> & { id: string }): Message {
  return { role: 'user', status: 'complete', content: '', createdAt: 0, ...overrides };
}

function Consumer() {
  const { messages, isLoading, unresolved, editingBlocked } = useMessages();
  const { sendMessage, retryMessage: retry, modifyMessage: modify } = useActiveChatActions();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="unresolved">{String(unresolved)}</div>
      <div data-testid="editing-blocked">{String(editingBlocked)}</div>
      <ul>
        {messages.map((m) => (
          <li key={m.id} data-testid="message">{`${m.id}:${m.role}:${m.status}:${m.content}`}</li>
        ))}
      </ul>
      <button onClick={() => sendMessage('hello').catch(() => {})}>send</button>
      <button onClick={() => retry('m2').catch(() => {})}>retry</button>
      <button onClick={() => modify('m2', 'edited content').catch(() => {})}>modify</button>
    </div>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveChatProvider>
        <Consumer />
      </ActiveChatProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  activeChatId = 'chat-1';
  fetchMessages.mockResolvedValue([]);
});

describe('loading messages', () => {
  it('does not fetch when there is no active chat', () => {
    activeChatId = null;
    renderProvider();

    expect(fetchMessages).not.toHaveBeenCalled();
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('shows loading then renders the fetched messages', async () => {
    fetchMessages.mockResolvedValue([msg({ id: 'm1', content: 'hi' })]);
    renderProvider();

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('message')).toHaveTextContent('m1:user:complete:hi');
  });
});

describe('load error reporting', () => {
  it('shows a friendly message when the chat is missing', async () => {
    fetchMessages.mockRejectedValue(new NotFoundError());
    renderProvider();

    await waitFor(() =>
      expect(reportError).toHaveBeenCalledWith("This chat doesn't exist or you don't have access to it.")
    );
  });

  it('shows a friendly message when access is denied', async () => {
    fetchMessages.mockRejectedValue(new AccessDeniedError());
    renderProvider();

    await waitFor(() =>
      expect(reportError).toHaveBeenCalledWith("This chat doesn't exist or you don't have access to it.")
    );
  });

  it('reports the raw error message for other failures', async () => {
    fetchMessages.mockRejectedValue(new Error('network down'));
    renderProvider();

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to load chat', 'network down'));
  });
});

describe('derived state', () => {
  it('is resolved and does not block editing when there are no messages', async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('unresolved')).toHaveTextContent('false');
    expect(screen.getByTestId('editing-blocked')).toHaveTextContent('false');
  });

  it('is unresolved and blocks editing while the last message is pending', async () => {
    fetchMessages.mockResolvedValue([msg({ id: 'm1', status: 'pending' })]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('unresolved')).toHaveTextContent('true'));
    expect(screen.getByTestId('editing-blocked')).toHaveTextContent('true');
  });

  it('is unresolved but does not block editing when the last message failed', async () => {
    fetchMessages.mockResolvedValue([msg({ id: 'm1', role: 'assistant', status: 'failed' })]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('unresolved')).toHaveTextContent('true'));
    expect(screen.getByTestId('editing-blocked')).toHaveTextContent('false');
  });
});

describe('sendMessage', () => {
  it('optimistically appends the user message, then the reply on success', async () => {
    const user = userEvent.setup();
    postMessage.mockResolvedValue(msg({ id: 'm2', role: 'assistant', content: 'hi there' }));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('send'));

    await waitFor(() => expect(screen.getAllByTestId('message')).toHaveLength(2));
    const items = screen.getAllByTestId('message');
    expect(items[0]).toHaveTextContent('user:complete:hello');
    expect(items[1]).toHaveTextContent('m2:assistant:complete:hi there');
  });

  it('rolls back the optimistic message and reports an error on failure', async () => {
    const user = userEvent.setup();
    postMessage.mockRejectedValue(new Error('boom'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('send'));

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to send message', 'boom'));
    expect(screen.queryAllByTestId('message')).toHaveLength(0);
  });
});

describe('retryMessage', () => {
  it('updates the message in place on success', async () => {
    const user = userEvent.setup();
    fetchMessages.mockResolvedValue([msg({ id: 'm2', role: 'assistant', status: 'failed' })]);
    retryMessage.mockResolvedValue(msg({ id: 'm2', role: 'assistant', status: 'pending' }));
    streamMessage.mockReturnValue(new Promise<StreamOutcome | null>(() => {}));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('retry'));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('m2:assistant:pending:'));
  });

  it('reports an error and leaves the message unchanged on failure', async () => {
    const user = userEvent.setup();
    fetchMessages.mockResolvedValue([msg({ id: 'm2', role: 'assistant', status: 'failed' })]);
    retryMessage.mockRejectedValue(new Error('boom'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('retry'));

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to retry message', 'boom'));
    expect(screen.getByTestId('message')).toHaveTextContent('m2:assistant:failed:');
  });
});

describe('modifyMessage', () => {
  it('truncates messages after the edited one and appends the new reply', async () => {
    const user = userEvent.setup();
    fetchMessages.mockResolvedValue([
      msg({ id: 'm1', content: 'first' }),
      msg({ id: 'm2', content: 'original' }),
      msg({ id: 'm3', role: 'assistant', content: 'stale reply' }),
    ]);
    modifyMessage.mockResolvedValue(msg({ id: 'm4', role: 'assistant', content: 'new reply' }));
    renderProvider();
    await waitFor(() => expect(screen.getAllByTestId('message')).toHaveLength(3));

    await user.click(screen.getByText('modify'));

    await waitFor(() => expect(screen.getAllByTestId('message')).toHaveLength(3));
    const items = screen.getAllByTestId('message');
    expect(items[0]).toHaveTextContent('m1:user:complete:first');
    expect(items[1]).toHaveTextContent('m2:user:complete:edited content');
    expect(items[2]).toHaveTextContent('m4:assistant:complete:new reply');
  });

  it('reports an error and leaves messages unchanged on failure', async () => {
    const user = userEvent.setup();
    fetchMessages.mockResolvedValue([msg({ id: 'm2', content: 'original' })]);
    modifyMessage.mockRejectedValue(new Error('boom'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('message')).toBeInTheDocument());

    await user.click(screen.getByText('modify'));

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to modify message', 'boom'));
    expect(screen.getByTestId('message')).toHaveTextContent('m2:user:complete:original');
  });
});

describe('streaming a pending assistant reply', () => {
  it('streams tokens into the message and marks it complete', async () => {
    fetchMessages.mockResolvedValue([msg({ id: 'm2', role: 'assistant', status: 'pending' })]);
    streamMessage.mockImplementation(
      async (_chatId: string, _messageId: string, _signal: AbortSignal, onToken: (t: string) => void) => {
        onToken('Hel');
        onToken('lo');
        return { status: 'complete' } satisfies StreamOutcome;
      }
    );
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('m2:assistant:complete:Hello'));
  });

  it('retries a dropped stream up to the attempt limit, then marks the message failed', async () => {
    fetchMessages.mockResolvedValue([msg({ id: 'm2', role: 'assistant', status: 'pending' })]);
    streamMessage.mockRejectedValue(new Error('connection dropped'));
    renderProvider();

    // ActiveChatContext.MAX_STREAM_ATTEMPTS is 3 and isn't exported, so this mirrors it directly.
    await waitFor(() => expect(streamMessage).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('m2:assistant:failed:'));
  });

  it('stops retrying once a refetch shows the backend already resolved the message', async () => {
    fetchMessages
      .mockResolvedValueOnce([msg({ id: 'm2', role: 'assistant', status: 'pending' })])
      .mockResolvedValueOnce([msg({ id: 'm2', role: 'assistant', status: 'complete', content: 'resolved elsewhere' })]);
    streamMessage.mockRejectedValue(new Error('connection dropped'));
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('message')).toHaveTextContent('m2:assistant:complete:resolved elsewhere')
    );
    expect(streamMessage).toHaveBeenCalledTimes(1);
  });

  it('aborts the in-flight stream when the provider unmounts', async () => {
    fetchMessages.mockResolvedValue([msg({ id: 'm2', role: 'assistant', status: 'pending' })]);
    let capturedSignal: AbortSignal | undefined;
    streamMessage.mockImplementation((_chatId: string, _messageId: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<StreamOutcome | null>(() => {});
    });
    const { unmount } = renderProvider();

    await waitFor(() => expect(streamMessage).toHaveBeenCalled());
    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});

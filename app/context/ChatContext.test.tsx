import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatProvider, useChats, useChatActions } from './ChatContext';
import type { Chat } from '../types/chat';

let pathname = '/';
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

const reportError = vi.fn();
vi.mock('./ErrorContext', () => ({
  useErrorReporter: () => ({ reportError }),
}));

const fetchChats = vi.fn();
const createChat = vi.fn();
const deleteChat = vi.fn();

vi.mock('../hooks/useBackendApi', () => ({
  useBackendApi: () => ({ fetchChats, createChat, deleteChat }),
}));

function chat(overrides: Partial<Chat> & { id: string }): Chat {
  return { title: 'untitled', lastActivityAt: 0, createdAt: 0, ...overrides };
}

function Consumer() {
  const { chats, activeChatId, isLoading } = useChats();
  const { createChat: create, deleteChat: remove, refreshChats } = useChatActions();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="active-chat-id">{activeChatId ?? 'none'}</div>
      <ul>
        {chats.map((c) => (
          <li key={c.id} data-testid="chat">{`${c.id}:${c.title}`}</li>
        ))}
      </ul>
      <button onClick={() => create('hello').catch(() => {})}>create</button>
      <button onClick={() => remove('c1').catch(() => {})}>delete</button>
      <button onClick={() => refreshChats()}>refresh</button>
    </div>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatProvider>
        <Consumer />
      </ChatProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = '/';
  fetchChats.mockResolvedValue([]);
});

describe('activeChatId derived from the pathname', () => {
  it('extracts the id from a /chat/:id pathname', async () => {
    pathname = '/chat/abc123';
    renderProvider();

    expect(screen.getByTestId('active-chat-id')).toHaveTextContent('abc123');
  });

  it('is null for pathnames outside /chat/:id', async () => {
    pathname = '/';
    renderProvider();

    expect(screen.getByTestId('active-chat-id')).toHaveTextContent('none');
  });

  it('is null when no id segment follows /chat/', async () => {
    pathname = '/chat/';
    renderProvider();

    expect(screen.getByTestId('active-chat-id')).toHaveTextContent('none');
  });
});

describe('loading chats', () => {
  it('shows loading then renders the fetched chats', async () => {
    fetchChats.mockResolvedValue([chat({ id: 'c1', title: 'first chat' })]);
    renderProvider();

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('chat')).toHaveTextContent('c1:first chat');
  });
});

describe('createChat', () => {
  it('prepends the new chat and navigates to it on success', async () => {
    const user = userEvent.setup();
    fetchChats.mockResolvedValue([chat({ id: 'c1', title: 'old chat' })]);
    createChat.mockResolvedValue(chat({ id: 'c2', title: 'new chat' }));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('create'));

    await waitFor(() => expect(screen.getAllByTestId('chat')).toHaveLength(2));
    const items = screen.getAllByTestId('chat');
    expect(items[0]).toHaveTextContent('c2:new chat');
    expect(items[1]).toHaveTextContent('c1:old chat');
    expect(push).toHaveBeenCalledWith('/chat/c2');
  });

  it('reports an error and does not navigate on failure', async () => {
    const user = userEvent.setup();
    createChat.mockRejectedValue(new Error('boom'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('create'));

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to start new chat', 'boom'));
    expect(push).not.toHaveBeenCalled();
  });
});

describe('deleteChat', () => {
  it('removes the chat optimistically before the request resolves', async () => {
    const user = userEvent.setup();
    fetchChats.mockResolvedValue([chat({ id: 'c1', title: 'first chat' })]);
    let resolveDelete: () => void = () => {};
    deleteChat.mockImplementation(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('delete'));

    await waitFor(() => expect(screen.queryByTestId('chat')).not.toBeInTheDocument());
    resolveDelete();
  });

  it('rolls back and reports an error on failure', async () => {
    const user = userEvent.setup();
    fetchChats.mockResolvedValue([chat({ id: 'c1', title: 'first chat' })]);
    deleteChat.mockRejectedValue(new Error('boom'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('delete'));

    await waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to delete chat', 'boom'));
    expect(screen.getByTestId('chat')).toHaveTextContent('c1:first chat');
  });

  it('navigates home when the deleted chat was the active one', async () => {
    const user = userEvent.setup();
    pathname = '/chat/c1';
    fetchChats.mockResolvedValue([chat({ id: 'c1', title: 'first chat' })]);
    deleteChat.mockResolvedValue(undefined);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('delete'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });

  it('does not navigate when the deleted chat was not the active one', async () => {
    const user = userEvent.setup();
    pathname = '/chat/other';
    fetchChats.mockResolvedValue([chat({ id: 'c1', title: 'first chat' })]);
    deleteChat.mockResolvedValue(undefined);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('delete'));

    await waitFor(() => expect(deleteChat).toHaveBeenCalledWith('c1'));
    expect(push).not.toHaveBeenCalled();
  });
});

describe('refreshChats', () => {
  it('refetches the chats list', async () => {
    const user = userEvent.setup();
    fetchChats.mockResolvedValue([]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(fetchChats).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('refresh'));

    await waitFor(() => expect(fetchChats).toHaveBeenCalledTimes(2));
  });
});

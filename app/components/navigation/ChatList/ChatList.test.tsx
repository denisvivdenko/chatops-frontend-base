import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Chat } from '../../../types/chat';
import ChatList from './ChatList';

const deleteChat = vi.fn();

let chats: Chat[] = [];
let activeChatId: string | null = null;
let isLoading = false;

vi.mock('../../../context/ChatContext', () => ({
  useChats: () => ({ chats, activeChatId, isLoading }),
  useChatActions: () => ({ deleteChat }),
}));

function chat(id: string, title: string): Chat {
  return { id, title, lastActivityAt: 0, createdAt: 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
  chats = [];
  activeChatId = null;
  isLoading = false;
});

it('shows a spinner instead of the chat list while loading', () => {
  isLoading = true;
  chats = [chat('1', 'First chat')];
  render(<ChatList />);

  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  expect(screen.queryByText('First chat')).not.toBeInTheDocument();
});

it('renders a link per chat once loaded', () => {
  chats = [chat('1', 'First chat'), chat('2', 'Second chat')];
  render(<ChatList />);

  expect(screen.getByText('First chat')).toBeInTheDocument();
  expect(screen.getByText('Second chat')).toBeInTheDocument();
});

it('marks "New chat" active when there is no active chat', () => {
  render(<ChatList />);

  expect(screen.getByRole('link', { name: /new chat/i }).className).toMatch(/itemActive/);
});

it('does not mark "New chat" active once a chat is active', () => {
  chats = [chat('1', 'First chat')];
  activeChatId = '1';
  render(<ChatList />);

  expect(screen.getByRole('link', { name: /new chat/i }).className).not.toMatch(/itemActive/);
});

it('highlights the row for the active chat', () => {
  chats = [chat('1', 'First chat'), chat('2', 'Second chat')];
  activeChatId = '2';
  render(<ChatList />);

  expect(screen.getByText('Second chat').closest('div')!.className).toMatch(/itemRowActive/);
  expect(screen.getByText('First chat').closest('div')!.className).not.toMatch(/itemRowActive/);
});

it('calls onNavigateAction when a chat link is clicked', async () => {
  const user = userEvent.setup();
  const onNavigateAction = vi.fn();
  chats = [chat('1', 'First chat')];
  render(<ChatList onNavigateAction={onNavigateAction} />);

  await user.click(screen.getByText('First chat'));

  expect(onNavigateAction).toHaveBeenCalledTimes(1);
});

it('calls onNavigateAction when the "New chat" link is clicked', async () => {
  const user = userEvent.setup();
  const onNavigateAction = vi.fn();
  render(<ChatList onNavigateAction={onNavigateAction} />);

  await user.click(screen.getByRole('link', { name: /new chat/i }));

  expect(onNavigateAction).toHaveBeenCalledTimes(1);
});

it('deletes the chat matching the confirmed row', async () => {
  const user = userEvent.setup();
  chats = [chat('1', 'First chat')];
  render(<ChatList />);

  await user.click(screen.getByRole('button', { name: 'Chat options' }));
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
  await user.click(screen.getByRole('menuitem', { name: 'Confirm delete' }));

  expect(deleteChat).toHaveBeenCalledWith('1');
});

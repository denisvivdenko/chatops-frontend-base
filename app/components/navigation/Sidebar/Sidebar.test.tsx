import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

const logout = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ logout }),
}));

vi.mock('../../../context/ChatContext', () => ({
  useChats: () => ({ chats: [], activeChatId: null, isLoading: false }),
  useChatActions: () => ({ deleteChat: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it('renders expanded with the chat list visible by default', () => {
  render(<Sidebar />);

  expect(screen.getByRole('link', { name: /new chat/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument();
});

it('hides the chat list when collapsed and shows it again when expanded', async () => {
  const user = userEvent.setup();
  render(<Sidebar />);

  await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  expect(screen.queryByRole('link', { name: /new chat/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  expect(screen.getByRole('link', { name: /new chat/i })).toBeInTheDocument();
});

it('arms logout confirmation on first click without logging out', async () => {
  const user = userEvent.setup();
  render(<Sidebar />);

  await user.click(screen.getByRole('button', { name: 'Log out' }));

  expect(screen.getByRole('button', { name: 'Confirm log out' })).toBeInTheDocument();
  expect(logout).not.toHaveBeenCalled();
});

it('logs out on the confirming click', async () => {
  const user = userEvent.setup();
  render(<Sidebar />);

  await user.click(screen.getByRole('button', { name: 'Log out' }));
  await user.click(screen.getByRole('button', { name: 'Confirm log out' }));

  expect(logout).toHaveBeenCalledTimes(1);
});

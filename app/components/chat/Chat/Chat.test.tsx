import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat';

const sendMessage = vi.fn();
const createChat = vi.fn();

let isLoading = false;
let unresolved = false;
let activeChatId: string | null = 'chat-1';

vi.mock('../../../context/ActiveChatContext', () => ({
  useMessages: () => ({ isLoading, unresolved }),
  useActiveChatActions: () => ({ sendMessage }),
}));

vi.mock('../../../context/ChatContext', () => ({
  useChatActions: () => ({ createChat }),
  useChats: () => ({ activeChatId }),
}));

vi.mock('../MessageList/MessageList', () => ({
  default: () => <div data-testid="message-list" />,
}));

vi.mock('../MessageInput/MessageInput', () => ({
  default: ({ onSendAction, disableSend }: { onSendAction: (content: string) => void; disableSend?: boolean }) => (
    <div data-testid="message-input" data-disable-send={String(disableSend)}>
      <button onClick={() => onSendAction('hello')}>send</button>
    </div>
  ),
}));

vi.mock('../../shared/Spinner/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  isLoading = false;
  unresolved = false;
  activeChatId = 'chat-1';
});

it('shows a spinner instead of the message list while loading', () => {
  isLoading = true;
  render(<Chat />);

  expect(screen.getByTestId('spinner')).toBeInTheDocument();
  expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
});

it('shows the message list once loading is done', () => {
  isLoading = false;
  render(<Chat />);

  expect(screen.getByTestId('message-list')).toBeInTheDocument();
  expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
});

it('forwards unresolved as disableSend to MessageInput', () => {
  unresolved = true;
  render(<Chat />);

  expect(screen.getByTestId('message-input')).toHaveAttribute('data-disable-send', 'true');
});

it('does not disable send when there is nothing unresolved', () => {
  unresolved = false;
  render(<Chat />);

  expect(screen.getByTestId('message-input')).toHaveAttribute('data-disable-send', 'false');
});

it('sends the message to the active chat when one exists', async () => {
  const user = userEvent.setup();
  activeChatId = 'chat-1';
  render(<Chat />);

  await user.click(screen.getByText('send'));

  expect(sendMessage).toHaveBeenCalledWith('hello');
  expect(createChat).not.toHaveBeenCalled();
});

it('creates a new chat when there is no active chat', async () => {
  const user = userEvent.setup();
  activeChatId = null;
  render(<Chat />);

  await user.click(screen.getByText('send'));

  expect(createChat).toHaveBeenCalledWith('hello');
  expect(sendMessage).not.toHaveBeenCalled();
});

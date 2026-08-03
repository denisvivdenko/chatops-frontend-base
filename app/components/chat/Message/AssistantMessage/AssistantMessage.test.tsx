import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Message } from '../../../../types/chat';
import AssistantMessage from './AssistantMessage';

const retryMessage = vi.fn();

vi.mock('../../../../context/ActiveChatContext', () => ({
  useActiveChatActions: () => ({ retryMessage }),
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'assistant',
    content: '',
    status: 'complete',
    createdAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  retryMessage.mockClear();
});

it('shows a spinner while pending with no content yet', () => {
  render(<AssistantMessage message={makeMessage({ status: 'pending', content: '' })} />);

  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
});

it('renders streamed content with a blinking cursor while pending', () => {
  const { container } = render(
    <AssistantMessage message={makeMessage({ status: 'pending', content: 'partial reply' })} />
  );

  expect(screen.getByText('partial reply')).toBeInTheDocument();
  expect(container.querySelector('[class*="cursor"]')).toBeInTheDocument();
});

it('renders completed content without a cursor', () => {
  const { container } = render(
    <AssistantMessage message={makeMessage({ status: 'complete', content: 'final reply' })} />
  );

  expect(screen.getByText('final reply')).toBeInTheDocument();
  expect(container.querySelector('[class*="cursor"]')).not.toBeInTheDocument();
});

it('shows an error message and retry button when failed', () => {
  render(<AssistantMessage message={makeMessage({ status: 'failed', content: '' })} />);

  expect(screen.getByText('Something went wrong generating this response.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});

it('still renders partial content alongside the error when a failed reply had streamed some text', () => {
  render(<AssistantMessage message={makeMessage({ status: 'failed', content: 'partial' })} />);

  expect(screen.getByText('partial')).toBeInTheDocument();
});

it('calls retryMessage with the message id when retry is clicked', async () => {
  const user = userEvent.setup();
  render(<AssistantMessage message={makeMessage({ id: 'msg-42', status: 'failed' })} />);

  await user.click(screen.getByRole('button', { name: /retry/i }));

  expect(retryMessage).toHaveBeenCalledWith('msg-42');
});

import { render, screen } from '@testing-library/react';
import type { Message } from '../../../types/chat';
import MessageComponent from './Message';

vi.mock('./UserMessage', () => ({
  default: ({ message, editDisabled }: { message: Message; editDisabled?: boolean }) => (
    <div data-testid="user-message" data-id={message.id} data-edit-disabled={String(editDisabled)} />
  ),
}));

vi.mock('./AssistantMessage', () => ({
  default: ({ message }: { message: Message }) => <div data-testid="assistant-message" data-id={message.id} />,
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'hi',
    status: 'complete',
    createdAt: 0,
    ...overrides,
  };
}

it('renders UserMessage for a user message, forwarding editDisabled', () => {
  render(<MessageComponent message={makeMessage({ role: 'user', id: 'u-1' })} editDisabled />);

  const el = screen.getByTestId('user-message');
  expect(el).toHaveAttribute('data-id', 'u-1');
  expect(el).toHaveAttribute('data-edit-disabled', 'true');
  expect(screen.queryByTestId('assistant-message')).not.toBeInTheDocument();
});

it('renders AssistantMessage for an assistant message', () => {
  render(<MessageComponent message={makeMessage({ role: 'assistant', id: 'a-1' })} />);

  expect(screen.getByTestId('assistant-message')).toHaveAttribute('data-id', 'a-1');
  expect(screen.queryByTestId('user-message')).not.toBeInTheDocument();
});

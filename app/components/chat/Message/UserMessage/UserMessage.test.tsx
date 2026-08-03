import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentsModalProvider } from '../../../../context/DocumentsModalContext';
import type { Message } from '../../../../types/chat';
import UserMessage from './UserMessage';

const modifyMessage = vi.fn();

vi.mock('../../../../context/ActiveChatContext', () => ({
  useActiveChatActions: () => ({ modifyMessage }),
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'hello world',
    status: 'complete',
    createdAt: 0,
    ...overrides,
  };
}

function renderUserMessage(props: React.ComponentProps<typeof UserMessage>) {
  return render(
    <DocumentsModalProvider>
      <UserMessage {...props} />
    </DocumentsModalProvider>
  );
}

beforeEach(() => {
  modifyMessage.mockClear();
});

it('renders the message content in a bubble', () => {
  renderUserMessage({ message: makeMessage({ content: 'hello world' }) });

  expect(screen.getByText('hello world')).toBeInTheDocument();
});

it('disables the edit button when editDisabled is set', () => {
  renderUserMessage({ message: makeMessage(), editDisabled: true });

  expect(screen.getByRole('button', { name: 'Edit message' })).toBeDisabled();
});

it('hides the edit button for document-only content', () => {
  renderUserMessage({ message: makeMessage({ content: '[file.pdf](resource://abc)' }) });

  expect(screen.queryByRole('button', { name: 'Edit message' })).not.toBeInTheDocument();
});

it('switches to edit mode with the current content pre-filled when the edit button is clicked', async () => {
  const user = userEvent.setup();
  renderUserMessage({ message: makeMessage({ content: 'hello world' }) });

  await user.click(screen.getByRole('button', { name: 'Edit message' }));

  expect(screen.getByPlaceholderText('Type a message...')).toHaveValue('hello world');
});

it('calls modifyMessage with the new content and leaves edit mode when the edit is saved', async () => {
  const user = userEvent.setup();
  renderUserMessage({ message: makeMessage({ id: 'msg-1', content: 'hello' }) });

  await user.click(screen.getByRole('button', { name: 'Edit message' }));
  const textarea = screen.getByPlaceholderText('Type a message...');
  await user.clear(textarea);
  await user.type(textarea, 'updated');
  await user.click(screen.getByRole('button', { name: 'Save edit' }));

  expect(modifyMessage).toHaveBeenCalledWith('msg-1', 'updated');
  expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
});

it('does not call modifyMessage when the saved content is unchanged', async () => {
  const user = userEvent.setup();
  renderUserMessage({ message: makeMessage({ content: 'hello' }) });

  await user.click(screen.getByRole('button', { name: 'Edit message' }));
  await user.click(screen.getByRole('button', { name: 'Save edit' }));

  expect(modifyMessage).not.toHaveBeenCalled();
});

it('cancels edit mode without calling modifyMessage', async () => {
  const user = userEvent.setup();
  renderUserMessage({ message: makeMessage({ content: 'hello' }) });

  await user.click(screen.getByRole('button', { name: 'Edit message' }));
  await user.click(screen.getByRole('button', { name: 'Cancel edit' }));

  expect(modifyMessage).not.toHaveBeenCalled();
  expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentsModalProvider } from '../../../context/DocumentsModalContext';
import MessageInput from './MessageInput';

function renderMessageInput(props: React.ComponentProps<typeof MessageInput>) {
  return render(
    <DocumentsModalProvider>
      <MessageInput {...props} />
    </DocumentsModalProvider>
  );
}

it('sends the trimmed message on Enter and clears the composer', async () => {
  const user = userEvent.setup();
  const onSendAction = vi.fn();
  renderMessageInput({ onSendAction });

  const textarea = screen.getByPlaceholderText('Type a message...');
  await user.type(textarea, '  hello world  ');
  await user.keyboard('{Enter}');

  expect(onSendAction).toHaveBeenCalledWith('hello world');
  expect(textarea).toHaveValue('');
});

it('disables the send button until there is content, and while disableSend is set', async () => {
  const user = userEvent.setup();
  const onSendAction = vi.fn();
  const { rerender } = renderMessageInput({ onSendAction });

  const sendButton = screen.getByRole('button', { name: /send message/i });
  expect(sendButton).toBeDisabled();

  const textarea = screen.getByPlaceholderText('Type a message...');
  await user.type(textarea, 'hi');
  expect(sendButton).toBeEnabled();

  rerender(
    <DocumentsModalProvider>
      <MessageInput onSendAction={onSendAction} disableSend />
    </DocumentsModalProvider>
  );
  expect(sendButton).toBeDisabled();
});

it('adds an image attachment through the attach menu and can remove it', async () => {
  const user = userEvent.setup();
  const onSendAction = vi.fn();
  renderMessageInput({ onSendAction });

  await user.click(screen.getByRole('button', { name: /add attachment/i }));
  await user.click(screen.getByRole('menuitem', { name: /image/i }));

  const file = new File(['image-bytes'], 'sock.png', { type: 'image/png' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  expect(await screen.findByText('sock.png')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /remove sock.png/i }));
  expect(screen.queryByText('sock.png')).not.toBeInTheDocument();
});

it('seeds the textarea from initialValue in edit mode and cancels on Escape', async () => {
  const user = userEvent.setup();
  const onSendAction = vi.fn();
  const onCancelAction = vi.fn();
  renderMessageInput({ onSendAction, initialValue: 'draft text', onCancelAction });

  const textarea = screen.getByPlaceholderText('Type a message...');
  expect(textarea).toHaveValue('draft text');
  expect(screen.getByRole('button', { name: /save edit/i })).toBeInTheDocument();

  await user.click(textarea);
  await user.keyboard('{Escape}');

  expect(onCancelAction).toHaveBeenCalledTimes(1);
});

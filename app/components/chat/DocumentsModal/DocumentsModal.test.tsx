import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResourceItem } from '../../../context/ResourcesContext';
import type { Message } from '../../../types/chat';
import DocumentsModal from './DocumentsModal';

const ensureLoaded = vi.fn();
const uploadResource = vi.fn(() => 'new-1');
const cancelUpload = vi.fn();
const retryUpload = vi.fn();
const removeResource = vi.fn();
const sendMessage = vi.fn();
const createChat = vi.fn();
const closeDocumentsModal = vi.fn();

let items: ResourceItem[] = [];
let messages: Message[] = [];
let activeChatId: string | null = 'chat-1';

vi.mock('../../../context/ResourcesContext', () => ({
  useResources: () => ({ items, ensureLoaded, uploadResource, cancelUpload, retryUpload, removeResource }),
}));

vi.mock('../../../context/ActiveChatContext', () => ({
  useMessages: () => {
    const lastMessage = messages[messages.length - 1];
    return { unresolved: lastMessage?.status === 'pending' || lastMessage?.status === 'failed' };
  },
  useActiveChatActions: () => ({ sendMessage }),
}));

vi.mock('../../../context/ChatContext', () => ({
  useChatActions: () => ({ createChat }),
  useChats: () => ({ activeChatId }),
}));

vi.mock('../../../context/DocumentsModalContext', () => ({
  useDocumentsModal: () => ({ closeDocumentsModal }),
}));

function readyItem(id: string, filename: string, resourceId = `resource-${id}`): ResourceItem {
  return { id, filename, status: 'ready', resourceId };
}

function pdfFile(name: string) {
  return new File(['x'], name, { type: 'application/pdf' });
}

function getFileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function pickFiles(files: File[]) {
  const input = getFileInput();
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  items = [];
  messages = [];
  activeChatId = 'chat-1';
});

it('loads the resource library on mount', () => {
  render(<DocumentsModal />);

  expect(ensureLoaded).toHaveBeenCalled();
});

it('closes the modal when the close button is clicked', async () => {
  const user = userEvent.setup();
  render(<DocumentsModal />);

  await user.click(screen.getByRole('button', { name: 'Close' }));

  expect(closeDocumentsModal).toHaveBeenCalledTimes(1);
});

it('closes the modal when clicking the overlay', async () => {
  const user = userEvent.setup();
  const { container } = render(<DocumentsModal />);

  await user.click(container.firstChild as HTMLElement);

  expect(closeDocumentsModal).toHaveBeenCalledTimes(1);
});

it('does not close the modal when clicking inside the panel', async () => {
  const user = userEvent.setup();
  render(<DocumentsModal />);

  await user.click(screen.getByRole('dialog', { name: 'Documents' }));

  expect(closeDocumentsModal).not.toHaveBeenCalled();
});

it('closes the modal on Escape when there is no pending replacement', () => {
  render(<DocumentsModal />);

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(closeDocumentsModal).toHaveBeenCalledTimes(1);
});

it('cancels a pending replacement on Escape instead of closing the modal', () => {
  items = [readyItem('existing-1', 'report.pdf')];
  render(<DocumentsModal />);

  pickFiles([pdfFile('report.pdf')]);
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(closeDocumentsModal).not.toHaveBeenCalled();
});

it('renders the documents from the resource library', () => {
  items = [readyItem('1', 'report.pdf')];
  render(<DocumentsModal />);

  expect(screen.getByText('report.pdf')).toBeInTheDocument();
});

it('shows a hint and disables Add to Chat while an upload is unresolved', () => {
  items = [{ id: '1', filename: 'report.pdf', status: 'uploading', resourceId: null }];
  render(<DocumentsModal />);

  expect(screen.getByText('Resolve or remove failed uploads before sending.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add to chat' })).toBeDisabled();
});

it('disables Add to Chat when no document is selected', () => {
  items = [readyItem('1', 'report.pdf')];
  render(<DocumentsModal />);

  expect(screen.getByRole('button', { name: 'Add to chat' })).toBeDisabled();
});

it('enables Add to Chat once a document is selected', async () => {
  const user = userEvent.setup();
  items = [readyItem('1', 'report.pdf')];
  render(<DocumentsModal />);

  await user.click(screen.getByRole('checkbox'));

  expect(screen.getByRole('button', { name: 'Add to chat' })).toBeEnabled();
});

it('keeps Add to Chat disabled while the last message is still pending', async () => {
  const user = userEvent.setup();
  items = [readyItem('1', 'report.pdf')];
  messages = [{ id: 'm1', role: 'user', content: 'hi', status: 'pending', createdAt: 0 }];
  render(<DocumentsModal />);

  await user.click(screen.getByRole('checkbox'));

  expect(screen.getByRole('button', { name: 'Add to chat' })).toBeDisabled();
});

it('sends the selected document to the active chat and closes the modal', async () => {
  const user = userEvent.setup();
  items = [readyItem('1', 'report.pdf', 'resource-1')];
  activeChatId = 'chat-1';
  render(<DocumentsModal />);

  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Add to chat' }));

  expect(sendMessage).toHaveBeenCalledWith('[report.pdf](resource://resource-1)');
  expect(createChat).not.toHaveBeenCalled();
  expect(closeDocumentsModal).toHaveBeenCalledTimes(1);
});

it('creates a new chat with the selected document when there is no active chat', async () => {
  const user = userEvent.setup();
  items = [readyItem('1', 'report.pdf', 'resource-1')];
  activeChatId = null;
  render(<DocumentsModal />);

  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Add to chat' }));

  expect(createChat).toHaveBeenCalledWith('[report.pdf](resource://resource-1)');
  expect(sendMessage).not.toHaveBeenCalled();
});

it('joins multiple selected documents with newlines when adding to chat', async () => {
  const user = userEvent.setup();
  items = [readyItem('1', 'a.pdf', 'resource-a'), readyItem('2', 'b.pdf', 'resource-b')];
  render(<DocumentsModal />);

  const checkboxes = screen.getAllByRole('checkbox');
  await user.click(checkboxes[0]);
  await user.click(checkboxes[1]);
  await user.click(screen.getByRole('button', { name: 'Add to chat' }));

  expect(sendMessage).toHaveBeenCalledWith('[a.pdf](resource://resource-a)\n[b.pdf](resource://resource-b)');
});

it('shows a validation error when a non-PDF file is picked and does not upload it', () => {
  render(<DocumentsModal />);

  pickFiles([new File(['x'], 'photo.png', { type: 'image/png' })]);

  expect(screen.getByText("photo.png isn't a PDF.")).toBeInTheDocument();
  expect(uploadResource).not.toHaveBeenCalled();
});

it('asks to confirm replacing a document that shares an existing filename', () => {
  items = [readyItem('existing-1', 'report.pdf')];
  render(<DocumentsModal />);

  pickFiles([pdfFile('report.pdf')]);

  expect(screen.getByRole('alertdialog')).toHaveTextContent('report.pdf is already added. Replace it?');
  expect(uploadResource).not.toHaveBeenCalled();
});

it('removes the existing document and uploads the replacement on confirm', async () => {
  const user = userEvent.setup();
  items = [readyItem('existing-1', 'report.pdf')];
  render(<DocumentsModal />);

  pickFiles([pdfFile('report.pdf')]);
  await user.click(screen.getByRole('button', { name: 'Replace' }));

  expect(removeResource).toHaveBeenCalledWith('existing-1');
  expect(uploadResource).toHaveBeenCalledWith(expect.objectContaining({ name: 'report.pdf' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('discards the picked file without touching resources when the replacement is cancelled', async () => {
  const user = userEvent.setup();
  items = [readyItem('existing-1', 'report.pdf')];
  render(<DocumentsModal />);

  pickFiles([pdfFile('report.pdf')]);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(uploadResource).not.toHaveBeenCalled();
  expect(removeResource).not.toHaveBeenCalled();
});

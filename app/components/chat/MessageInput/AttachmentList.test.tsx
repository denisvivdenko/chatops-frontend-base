import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Attachment } from './attachments';
import AttachmentList from './AttachmentList';

const attachments: Attachment[] = [
  { id: 'image-1', name: 'sock.png', dataUrl: 'data:image/png;base64,aaa' },
  { id: 'image-2', name: null, dataUrl: 'data:image/png;base64,bbb' },
];

it('renders nothing when there are no attachments', () => {
  const { container } = render(<AttachmentList attachments={[]} onRemove={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

it('renders a card per attachment, using the id as a fallback label when name is null', () => {
  render(<AttachmentList attachments={attachments} onRemove={vi.fn()} />);

  expect(screen.getByText('sock.png')).toBeInTheDocument();
  expect(screen.getByText('image-2')).toBeInTheDocument();
});

it('labels the remove button with the attachment name, falling back to the id', () => {
  render(<AttachmentList attachments={attachments} onRemove={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Remove sock.png' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove image-2' })).toBeInTheDocument();
});

it('calls onRemove with the id of the clicked attachment', async () => {
  const user = userEvent.setup();
  const onRemove = vi.fn();
  render(<AttachmentList attachments={attachments} onRemove={onRemove} />);

  await user.click(screen.getByRole('button', { name: 'Remove sock.png' }));

  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(onRemove).toHaveBeenCalledWith('image-1');
});

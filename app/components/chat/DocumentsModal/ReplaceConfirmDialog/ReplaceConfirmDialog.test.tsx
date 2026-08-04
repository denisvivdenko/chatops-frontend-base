import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReplaceConfirmDialog from './ReplaceConfirmDialog';

it('shows the filename in the confirmation message', () => {
  render(<ReplaceConfirmDialog filename="report.pdf" onCancel={vi.fn()} onConfirm={vi.fn()} />);

  const dialog = screen.getByRole('alertdialog', { name: 'Replace document' });
  expect(dialog).toHaveTextContent('report.pdf is already added. Replace it?');
});

it('calls onConfirm when Replace is clicked', async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  render(<ReplaceConfirmDialog filename="report.pdf" onCancel={vi.fn()} onConfirm={onConfirm} />);

  await user.click(screen.getByRole('button', { name: 'Replace' }));

  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it('calls onCancel when Cancel is clicked', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(<ReplaceConfirmDialog filename="report.pdf" onCancel={onCancel} onConfirm={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('calls onCancel when clicking the overlay outside the panel', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  const { container } = render(<ReplaceConfirmDialog filename="report.pdf" onCancel={onCancel} onConfirm={vi.fn()} />);

  await user.click(container.firstChild as HTMLElement);

  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('does not call onCancel when clicking inside the panel', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(<ReplaceConfirmDialog filename="report.pdf" onCancel={onCancel} onConfirm={vi.fn()} />);

  await user.click(screen.getByRole('alertdialog'));

  expect(onCancel).not.toHaveBeenCalled();
});

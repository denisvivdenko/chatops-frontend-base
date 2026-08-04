import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceItem } from '../../../../context/ResourcesContext';
import DocumentListItem from './DocumentListItem';

function noop() {}

function renderItem(item: ResourceItem, overrides: Partial<React.ComponentProps<typeof DocumentListItem>> = {}) {
  return render(
    <DocumentListItem
      item={item}
      selected={false}
      onToggleSelect={noop}
      onCancelUpload={noop}
      onRetryUpload={noop}
      onRemove={noop}
      {...overrides}
    />
  );
}

it('shows a spinner and the filename while uploading', () => {
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'uploading', resourceId: null };
  renderItem(item);

  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  expect(screen.getByText('report.pdf')).toBeInTheDocument();
});

it('cancels an upload in progress', async () => {
  const user = userEvent.setup();
  const onCancelUpload = vi.fn();
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'uploading', resourceId: null };
  renderItem(item, { onCancelUpload });

  await user.click(screen.getByRole('button', { name: 'Cancel upload of report.pdf' }));

  expect(onCancelUpload).toHaveBeenCalledWith('1');
});

it('shows the error message for a failed upload', () => {
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'failed', resourceId: null, error: 'Network error' };
  renderItem(item);

  expect(screen.getByText('report.pdf')).toBeInTheDocument();
  expect(screen.getByText('Network error')).toBeInTheDocument();
});

it('renders no error text when a failed upload has none', () => {
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'failed', resourceId: null };
  renderItem(item);

  const cardText = screen.getByText('report.pdf').parentElement;
  expect(cardText?.children).toHaveLength(1);
});

it('retries a failed upload', async () => {
  const user = userEvent.setup();
  const onRetryUpload = vi.fn();
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'failed', resourceId: null };
  renderItem(item, { onRetryUpload });

  await user.click(screen.getByRole('button', { name: 'Retry report.pdf' }));

  expect(onRetryUpload).toHaveBeenCalledWith('1');
});

it('removes a failed upload', async () => {
  const user = userEvent.setup();
  const onRemove = vi.fn();
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'failed', resourceId: null };
  renderItem(item, { onRemove });

  await user.click(screen.getByRole('button', { name: 'Remove report.pdf' }));

  expect(onRemove).toHaveBeenCalledWith('1');
});

it('renders a checked checkbox for a selected, ready document', () => {
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'ready', resourceId: 'resource-1' };
  renderItem(item, { selected: true });

  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByText('report.pdf')).toBeInTheDocument();
});

it('renders an unchecked checkbox for an unselected, ready document', () => {
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'ready', resourceId: 'resource-1' };
  renderItem(item, { selected: false });

  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

it('toggles selection when the ready document checkbox is clicked', async () => {
  const user = userEvent.setup();
  const onToggleSelect = vi.fn();
  const item: ResourceItem = { id: '1', filename: 'report.pdf', status: 'ready', resourceId: 'resource-1' };
  renderItem(item, { onToggleSelect });

  await user.click(screen.getByRole('checkbox'));

  expect(onToggleSelect).toHaveBeenCalledWith('1');
});

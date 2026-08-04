import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceItem } from '../../../../context/ResourcesContext';
import DocumentsList from './DocumentsList';

function noop() {}

function renderList(items: ResourceItem[], overrides: Partial<React.ComponentProps<typeof DocumentsList>> = {}) {
  return render(
    <DocumentsList
      items={items}
      selectedIds={new Set()}
      onToggleSelect={noop}
      onCancelUpload={noop}
      onRetryUpload={noop}
      onRemove={noop}
      {...overrides}
    />
  );
}

it('shows an empty state when there are no documents', () => {
  renderList([]);

  expect(screen.getByText('No documents yet.')).toBeInTheDocument();
});

it('does not show the empty state once there are documents', () => {
  const items: ResourceItem[] = [{ id: '1', filename: 'report.pdf', status: 'ready', resourceId: 'resource-1' }];
  renderList(items);

  expect(screen.queryByText('No documents yet.')).not.toBeInTheDocument();
});

it('renders one row per item', () => {
  const items: ResourceItem[] = [
    { id: '1', filename: 'a.pdf', status: 'ready', resourceId: 'resource-1' },
    { id: '2', filename: 'b.pdf', status: 'uploading', resourceId: null },
    { id: '3', filename: 'c.pdf', status: 'failed', resourceId: null },
  ];
  renderList(items);

  expect(screen.getByText('a.pdf')).toBeInTheDocument();
  expect(screen.getByText('b.pdf')).toBeInTheDocument();
  expect(screen.getByText('c.pdf')).toBeInTheDocument();
});

it('checks only the ready items whose id is selected', () => {
  const items: ResourceItem[] = [
    { id: '1', filename: 'a.pdf', status: 'ready', resourceId: 'resource-1' },
    { id: '2', filename: 'b.pdf', status: 'ready', resourceId: 'resource-2' },
  ];
  renderList(items, { selectedIds: new Set(['2']) });

  const [checkboxA, checkboxB] = screen.getAllByRole('checkbox');
  expect(checkboxA).not.toBeChecked();
  expect(checkboxB).toBeChecked();
});

it('forwards onToggleSelect with the id of the clicked item', async () => {
  const user = userEvent.setup();
  const onToggleSelect = vi.fn();
  const items: ResourceItem[] = [
    { id: '1', filename: 'a.pdf', status: 'ready', resourceId: 'resource-1' },
    { id: '2', filename: 'b.pdf', status: 'ready', resourceId: 'resource-2' },
  ];
  renderList(items, { onToggleSelect });

  await user.click(screen.getAllByRole('checkbox')[1]);

  expect(onToggleSelect).toHaveBeenCalledWith('2');
});

it('forwards onCancelUpload with the id of the item being cancelled', async () => {
  const user = userEvent.setup();
  const onCancelUpload = vi.fn();
  const items: ResourceItem[] = [
    { id: '1', filename: 'a.pdf', status: 'uploading', resourceId: null },
    { id: '2', filename: 'b.pdf', status: 'uploading', resourceId: null },
  ];
  renderList(items, { onCancelUpload });

  await user.click(screen.getByRole('button', { name: 'Cancel upload of b.pdf' }));

  expect(onCancelUpload).toHaveBeenCalledWith('2');
});

it('forwards onRetryUpload and onRemove with the id of the failed item acted on', async () => {
  const user = userEvent.setup();
  const onRetryUpload = vi.fn();
  const onRemove = vi.fn();
  const items: ResourceItem[] = [
    { id: '1', filename: 'a.pdf', status: 'failed', resourceId: null },
    { id: '2', filename: 'b.pdf', status: 'failed', resourceId: null },
  ];
  renderList(items, { onRetryUpload, onRemove });

  await user.click(screen.getByRole('button', { name: 'Retry b.pdf' }));
  await user.click(screen.getByRole('button', { name: 'Remove a.pdf' }));

  expect(onRetryUpload).toHaveBeenCalledWith('2');
  expect(onRemove).toHaveBeenCalledWith('1');
});

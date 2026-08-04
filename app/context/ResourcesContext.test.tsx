import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ResourcesProvider, useResources } from './ResourcesContext';
import type { ResourceSummary } from '../services/backendService';

const listResources = vi.fn();
const uploadResource = vi.fn();

vi.mock('../hooks/useBackendApi', () => ({
  useBackendApi: () => ({ listResources, uploadResource }),
}));

function file(name: string) {
  return new File(['content'], name, { type: 'text/plain' });
}

function Consumer() {
  const resources = useResources();
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);

  return (
    <div>
      <button onClick={() => resources.ensureLoaded()}>ensure-loaded</button>
      <button
        onClick={() => {
          const id = resources.uploadResource(file('file.txt'));
          setLastUploadId(id);
        }}
      >
        upload
      </button>
      <div data-testid="last-upload-id">{lastUploadId ?? 'none'}</div>
      <button onClick={() => lastUploadId && resources.cancelUpload(lastUploadId)}>cancel</button>
      <button onClick={() => lastUploadId && resources.retryUpload(lastUploadId)}>retry</button>
      <button onClick={() => lastUploadId && resources.removeResource(lastUploadId)}>remove</button>
      <button onClick={() => {
        const serverItem = resources.items.find((i) => i.resourceId !== null && !i.filename.startsWith('local-'));
        if (serverItem) resources.retryUpload(serverItem.id);
      }}>
        retry-first-server-item
      </button>
      <button onClick={() => {
        const serverItem = resources.items[0];
        if (serverItem) resources.removeResource(serverItem.id);
      }}>
        remove-first-item
      </button>
      <ul>
        {resources.items.map((item) => (
          <li key={item.id} data-testid="item">
            {`${item.id}:${item.filename}:${item.status}:${item.resourceId ?? 'null'}:${item.error ?? ''}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderProvider() {
  return render(
    <ResourcesProvider>
      <Consumer />
    </ResourcesProvider>
  );
}

function resource(overrides: Partial<ResourceSummary> & { id: string }): ResourceSummary {
  return { filename: 'server-file.txt', ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  listResources.mockResolvedValue([]);
});

describe('ensureLoaded', () => {
  it('loads resources from the backend and only fetches once', async () => {
    const user = userEvent.setup();
    listResources.mockResolvedValue([resource({ id: 'r1', filename: 'a.txt' })]);
    renderProvider();

    await user.click(screen.getByText('ensure-loaded'));
    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('r1:a.txt:ready:r1:'));

    await user.click(screen.getByText('ensure-loaded'));
    expect(listResources).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate an item that was already uploaded locally', async () => {
    const user = userEvent.setup();
    uploadResource.mockResolvedValue(resource({ id: 'r1', filename: 'file.txt' }));
    renderProvider();

    await user.click(screen.getByText('upload'));
    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent(':ready:r1:'));

    listResources.mockResolvedValue([resource({ id: 'r1', filename: 'file.txt' })]);
    await user.click(screen.getByText('ensure-loaded'));

    await waitFor(() => expect(listResources).toHaveBeenCalledTimes(1));
    expect(screen.getAllByTestId('item')).toHaveLength(1);
  });
});

describe('uploadResource', () => {
  it('adds an uploading item immediately, then marks it ready on success', async () => {
    const user = userEvent.setup();
    let resolveUpload: (r: ResourceSummary) => void = () => {};
    uploadResource.mockReturnValue(new Promise<ResourceSummary>((resolve) => { resolveUpload = resolve; }));
    renderProvider();

    await user.click(screen.getByText('upload'));

    expect(screen.getByTestId('item')).toHaveTextContent('file.txt:uploading:null:');

    resolveUpload(resource({ id: 'r1', filename: 'file.txt' }));
    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('file.txt:ready:r1:'));
  });

  it('marks the item failed with the error message when the upload rejects', async () => {
    const user = userEvent.setup();
    uploadResource.mockRejectedValue(new Error('boom'));
    renderProvider();

    await user.click(screen.getByText('upload'));

    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('file.txt:failed:null:boom'));
  });
});

describe('cancelUpload', () => {
  it('removes the item and aborts the in-flight request', async () => {
    const user = userEvent.setup();
    let capturedSignal: AbortSignal | undefined;
    uploadResource.mockImplementation((_file: File, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<ResourceSummary>(() => {});
    });
    renderProvider();

    await user.click(screen.getByText('upload'));
    expect(screen.getByTestId('item')).toBeInTheDocument();

    await user.click(screen.getByText('cancel'));

    expect(screen.queryByTestId('item')).not.toBeInTheDocument();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('does not resurrect the item once the cancelled request settles', async () => {
    const user = userEvent.setup();
    let rejectUpload: (err: Error) => void = () => {};
    uploadResource.mockReturnValue(new Promise<ResourceSummary>((_resolve, reject) => { rejectUpload = reject; }));
    renderProvider();

    await user.click(screen.getByText('upload'));
    await user.click(screen.getByText('cancel'));
    rejectUpload(new Error('aborted'));

    await waitFor(() => expect(screen.queryByTestId('item')).not.toBeInTheDocument());
  });
});

describe('retryUpload', () => {
  it('re-uploads the original file after a failed upload', async () => {
    const user = userEvent.setup();
    uploadResource.mockRejectedValueOnce(new Error('boom'));
    renderProvider();

    await user.click(screen.getByText('upload'));
    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('failed'));

    uploadResource.mockResolvedValueOnce(resource({ id: 'r1', filename: 'file.txt' }));
    await user.click(screen.getByText('retry'));

    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('file.txt:ready:r1:'));
    expect(uploadResource).toHaveBeenCalledTimes(2);
  });

  it('does nothing for an item with no locally-held file', async () => {
    const user = userEvent.setup();
    listResources.mockResolvedValue([resource({ id: 'r1', filename: 'server-file.txt' })]);
    renderProvider();

    await user.click(screen.getByText('ensure-loaded'));
    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('ready'));

    await user.click(screen.getByText('retry-first-server-item'));

    expect(uploadResource).not.toHaveBeenCalled();
    expect(screen.getByTestId('item')).toHaveTextContent('r1:server-file.txt:ready:r1:');
  });
});

describe('removeResource', () => {
  it('removes a ready item', async () => {
    const user = userEvent.setup();
    uploadResource.mockResolvedValue(resource({ id: 'r1', filename: 'file.txt' }));
    renderProvider();

    await user.click(screen.getByText('upload'));
    await waitFor(() => expect(screen.getByTestId('item')).toHaveTextContent('ready'));

    await user.click(screen.getByText('remove-first-item'));

    expect(screen.queryByTestId('item')).not.toBeInTheDocument();
  });

  it('aborts an in-flight upload when removed', async () => {
    const user = userEvent.setup();
    let capturedSignal: AbortSignal | undefined;
    uploadResource.mockImplementation((_file: File, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<ResourceSummary>(() => {});
    });
    renderProvider();

    await user.click(screen.getByText('upload'));
    await user.click(screen.getByText('remove-first-item'));

    expect(screen.queryByTestId('item')).not.toBeInTheDocument();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

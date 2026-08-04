import { act, renderHook } from '@testing-library/react';
import { ResourceItem } from '../../../../context/ResourcesContext';
import { useDocumentSelection } from './useDocumentSelection';

function pdfFile(name: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

function readyItem(id: string, filename: string, resourceId: string | null = `resource-${id}`): ResourceItem {
  return { id, filename, status: 'ready', resourceId };
}

function changeEvent(files: File[]) {
  return { target: { files, value: 'x' } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

function renderSelection(items: ResourceItem[] = []) {
  const uploadResource = vi.fn(() => 'new-1');
  const cancelUpload = vi.fn();
  const removeResource = vi.fn();
  const hook = renderHook(() => useDocumentSelection({ items, uploadResource, cancelUpload, removeResource }));
  return { ...hook, uploadResource, cancelUpload, removeResource };
}

it('starts with nothing selected and no error or pending replacement', () => {
  const { result } = renderSelection();

  expect(result.current.selectedIds.size).toBe(0);
  expect(result.current.validationError).toBeNull();
  expect(result.current.pendingReplacement).toBeNull();
});

it('uploads a picked PDF and selects its returned id', () => {
  const { result, uploadResource } = renderSelection();

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });

  expect(uploadResource).toHaveBeenCalledWith(expect.objectContaining({ name: 'report.pdf' }));
  expect(result.current.selectedIds.has('new-1')).toBe(true);
  expect(result.current.validationError).toBeNull();
});

it("resets the input's value after reading the picked files", () => {
  const { result } = renderSelection();
  const event = changeEvent([pdfFile('report.pdf')]);

  act(() => {
    result.current.handleFileInputChange(event);
  });

  expect(event.target.value).toBe('');
});

it("rejects a file that isn't a PDF and does not upload it", () => {
  const { result, uploadResource } = renderSelection();
  const file = new File(['x'], 'photo.png', { type: 'image/png' });

  act(() => {
    result.current.handleFileInputChange(changeEvent([file]));
  });

  expect(result.current.validationError).toBe("photo.png isn't a PDF.");
  expect(uploadResource).not.toHaveBeenCalled();
});

it('rejects a PDF larger than 20MB and does not upload it', () => {
  const { result, uploadResource } = renderSelection();
  const file = pdfFile('huge.pdf', 20 * 1024 * 1024 + 1);

  act(() => {
    result.current.handleFileInputChange(changeEvent([file]));
  });

  expect(result.current.validationError).toBe('huge.pdf is too large (max 20MB).');
  expect(uploadResource).not.toHaveBeenCalled();
});

it('uploads the valid files in a batch while reporting errors for the invalid ones', () => {
  const { result, uploadResource } = renderSelection();
  const badFile = new File(['x'], 'photo.png', { type: 'image/png' });
  const goodFile = pdfFile('report.pdf');

  act(() => {
    result.current.handleFileInputChange(changeEvent([badFile, goodFile]));
  });

  expect(result.current.validationError).toBe("photo.png isn't a PDF.");
  expect(uploadResource).toHaveBeenCalledWith(expect.objectContaining({ name: 'report.pdf' }));
  expect(result.current.selectedIds.has('new-1')).toBe(true);
});

it('clears a previous validation error once a fresh batch is all valid', () => {
  const { result } = renderSelection();

  act(() => {
    result.current.handleFileInputChange(changeEvent([new File(['x'], 'photo.png', { type: 'image/png' })]));
  });
  expect(result.current.validationError).not.toBeNull();

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });
  expect(result.current.validationError).toBeNull();
});

it('asks to confirm replacement when a picked file matches an existing filename', () => {
  const items = [readyItem('existing-1', 'report.pdf')];
  const { result, uploadResource } = renderSelection(items);
  const file = pdfFile('report.pdf');

  act(() => {
    result.current.handleFileInputChange(changeEvent([file]));
  });

  expect(result.current.pendingReplacement).toEqual({ file, existingId: 'existing-1' });
  expect(uploadResource).not.toHaveBeenCalled();
});

it('removes the existing ready item and uploads the replacement on confirm', () => {
  const items = [readyItem('existing-1', 'report.pdf')];
  const { result, uploadResource, cancelUpload, removeResource } = renderSelection(items);

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });
  act(() => {
    result.current.handleConfirmReplace();
  });

  expect(removeResource).toHaveBeenCalledWith('existing-1');
  expect(cancelUpload).not.toHaveBeenCalled();
  expect(uploadResource).toHaveBeenCalledWith(expect.objectContaining({ name: 'report.pdf' }));
  expect(result.current.pendingReplacement).toBeNull();
});

it('cancels the existing upload, rather than removing it, when replacing an in-flight upload', () => {
  const items: ResourceItem[] = [{ id: 'existing-1', filename: 'report.pdf', status: 'uploading', resourceId: null }];
  const { result, cancelUpload, removeResource } = renderSelection(items);

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });
  act(() => {
    result.current.handleConfirmReplace();
  });

  expect(cancelUpload).toHaveBeenCalledWith('existing-1');
  expect(removeResource).not.toHaveBeenCalled();
});

it('deselects the replaced item and selects its replacement on confirm', () => {
  const items = [readyItem('existing-1', 'report.pdf')];
  const { result } = renderSelection(items);

  act(() => {
    result.current.toggleSelect('existing-1');
  });
  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });
  act(() => {
    result.current.handleConfirmReplace();
  });

  expect(result.current.selectedIds.has('existing-1')).toBe(false);
  expect(result.current.selectedIds.has('new-1')).toBe(true);
});

it('discards the picked file without touching any resource on cancel', () => {
  const items = [readyItem('existing-1', 'report.pdf')];
  const { result, uploadResource, cancelUpload, removeResource } = renderSelection(items);

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });
  act(() => {
    result.current.handleCancelReplace();
  });

  expect(result.current.pendingReplacement).toBeNull();
  expect(uploadResource).not.toHaveBeenCalled();
  expect(cancelUpload).not.toHaveBeenCalled();
  expect(removeResource).not.toHaveBeenCalled();
});

it('queues newly picked files instead of processing them while a replacement is pending', () => {
  const items = [readyItem('existing-1', 'report.pdf')];
  const { result, uploadResource } = renderSelection(items);

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf')]));
  });
  expect(result.current.pendingReplacement).not.toBeNull();

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('notes.pdf')]));
  });

  expect(uploadResource).not.toHaveBeenCalled();
  expect(result.current.pendingReplacement?.file.name).toBe('report.pdf');
});

it('resumes processing the rest of the queue once a replacement is resolved', () => {
  const items = [readyItem('existing-1', 'report.pdf')];
  const { result, uploadResource } = renderSelection(items);

  act(() => {
    result.current.handleFileInputChange(changeEvent([pdfFile('report.pdf'), pdfFile('notes.pdf')]));
  });
  act(() => {
    result.current.handleCancelReplace();
  });

  expect(uploadResource).toHaveBeenCalledWith(expect.objectContaining({ name: 'notes.pdf' }));
  expect(result.current.pendingReplacement).toBeNull();
});

it('toggles selection for an id on and off', () => {
  const { result } = renderSelection();

  act(() => {
    result.current.toggleSelect('doc-1');
  });
  expect(result.current.selectedIds.has('doc-1')).toBe(true);

  act(() => {
    result.current.toggleSelect('doc-1');
  });
  expect(result.current.selectedIds.has('doc-1')).toBe(false);
});

it('flags unresolved items while any upload is in progress or failed', () => {
  const items: ResourceItem[] = [readyItem('a', 'a.pdf'), { id: 'b', filename: 'b.pdf', status: 'uploading', resourceId: null }];
  const { result } = renderSelection(items);

  expect(result.current.hasUnresolvedItems).toBe(true);
});

it('reports no unresolved items once every item is ready', () => {
  const items = [readyItem('a', 'a.pdf'), readyItem('b', 'b.pdf')];
  const { result } = renderSelection(items);

  expect(result.current.hasUnresolvedItems).toBe(false);
});

it('only includes selected, ready items that have a resource id', () => {
  const items: ResourceItem[] = [
    readyItem('a', 'a.pdf'),
    readyItem('b', 'b.pdf'),
    { id: 'c', filename: 'c.pdf', status: 'ready', resourceId: null },
    { id: 'd', filename: 'd.pdf', status: 'uploading', resourceId: null },
  ];
  const { result } = renderSelection(items);

  act(() => {
    result.current.toggleSelect('a');
    result.current.toggleSelect('c');
    result.current.toggleSelect('d');
  });

  expect(result.current.selectedReadyItems.map(item => item.id)).toEqual(['a']);
});

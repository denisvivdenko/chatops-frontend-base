import { act, renderHook } from '@testing-library/react';
import { Attachment, MAX_IMAGE_BYTES } from './attachments';
import { useAttachments } from './useAttachments';

function pngFile(name: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

function pasteEventWithFiles(files: File[]) {
  return {
    clipboardData: {
      items: files.map(file => ({
        type: file.type,
        getAsFile: () => file,
      })),
    },
    preventDefault: vi.fn(),
  } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;
}

it('starts empty with no error when there are no initial attachments', () => {
  const { result } = renderHook(() => useAttachments());

  expect(result.current.attachments).toEqual([]);
  expect(result.current.attachmentError).toBeNull();
});

it('seeds attachments from the initial value', () => {
  const seed: Attachment[] = [{ id: 'image-1', name: 'seed.png', dataUrl: 'data:image/png;base64,seed' }];
  const { result } = renderHook(() => useAttachments(seed));

  expect(result.current.attachments).toEqual(seed);
});

it('adds image files as attachments, keeping the file name when asked', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.addImageAttachment([pngFile('sock.png')], { keepNames: true });
  });

  expect(result.current.attachments).toHaveLength(1);
  expect(result.current.attachments[0].name).toBe('sock.png');
  expect(result.current.attachments[0].dataUrl).toMatch(/^data:image\/png/);
});

it('drops the file name when keepNames is false, as when pasting', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.addImageAttachment([pngFile('clipboard.png')], { keepNames: false });
  });

  expect(result.current.attachments[0].name).toBeNull();
});

it('numbers generated ids starting after any seeded attachments', async () => {
  const seed: Attachment[] = [{ id: 'image-1', name: 'seed.png', dataUrl: 'data:image/png;base64,seed' }];
  const { result } = renderHook(() => useAttachments(seed));

  await act(async () => {
    await result.current.addImageAttachment([pngFile('a.png'), pngFile('b.png')], { keepNames: true });
  });

  expect(result.current.attachments.map((a: Attachment) => a.id)).toEqual(['image-1', 'image-2', 'image-3']);
});

it('rejects an oversized image with an error and does not add it', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.addImageAttachment([pngFile('huge.png', MAX_IMAGE_BYTES + 1)], { keepNames: true });
  });

  expect(result.current.attachments).toEqual([]);
  expect(result.current.attachmentError).toBe('Image is too large to add (max 3MB).');
});

it('clears a previous error once a valid image is added', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.addImageAttachment([pngFile('huge.png', MAX_IMAGE_BYTES + 1)], { keepNames: true });
  });
  expect(result.current.attachmentError).not.toBeNull();

  await act(async () => {
    await result.current.addImageAttachment([pngFile('ok.png')], { keepNames: true });
  });

  expect(result.current.attachmentError).toBeNull();
  expect(result.current.attachments).toHaveLength(1);
});

it('removes an attachment by id', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.addImageAttachment([pngFile('sock.png')], { keepNames: true });
  });
  const id = result.current.attachments[0].id;

  act(() => {
    result.current.removeAttachment(id);
  });

  expect(result.current.attachments).toEqual([]);
});

it('extracts pasted images and adds them without keeping a file name', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.handleAttachmentPaste(pasteEventWithFiles([pngFile('screenshot.png')]));
  });

  expect(result.current.attachments).toHaveLength(1);
  expect(result.current.attachments[0].name).toBeNull();
});

it('ignores a paste with no image items and does not prevent default', async () => {
  const { result } = renderHook(() => useAttachments());
  const event = pasteEventWithFiles([]);

  await act(async () => {
    await result.current.handleAttachmentPaste(event);
  });

  expect(result.current.attachments).toEqual([]);
  expect(event.preventDefault).not.toHaveBeenCalled();
});

it('resets attachments, the error, and the id counter', async () => {
  const { result } = renderHook(() => useAttachments());

  await act(async () => {
    await result.current.addImageAttachment([pngFile('sock.png', MAX_IMAGE_BYTES + 1)], { keepNames: true });
  });
  expect(result.current.attachmentError).not.toBeNull();

  act(() => {
    result.current.resetAttachments();
  });
  expect(result.current.attachments).toEqual([]);
  expect(result.current.attachmentError).toBeNull();

  await act(async () => {
    await result.current.addImageAttachment([pngFile('fresh.png')], { keepNames: true });
  });

  expect(result.current.attachments[0].id).toBe('image-1');
});

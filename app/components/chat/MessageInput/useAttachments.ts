import { useReducer, useRef } from 'react';
import { Attachment, MAX_IMAGE_BYTES, readFileAsDataUrl } from './attachments';

type AttachmentsState = {
  attachments: Attachment[];
  attachmentError: string | null;
};

type AttachmentsAction =
  | { type: 'ADD'; attachments: Attachment[] }
  | { type: 'IMAGE_TOO_LARGE' }
  | { type: 'REMOVE'; id: string }
  | { type: 'RESET' };

function attachmentsReducer(state: AttachmentsState, action: AttachmentsAction): AttachmentsState {
  switch (action.type) {
    case 'ADD':
      return { attachments: [...state.attachments, ...action.attachments], attachmentError: null };
    case 'IMAGE_TOO_LARGE':
      return { ...state, attachmentError: 'Image is too large to add (max 3MB).' };
    case 'REMOVE':
      return { ...state, attachments: state.attachments.filter(attachment => attachment.id !== action.id) };
    case 'RESET':
      return { attachments: [], attachmentError: null };
    default:
      return state;
  }
}

export function useAttachments(initialAttachments: Attachment[] = []) {
  const [state, dispatch] = useReducer(attachmentsReducer, {
    attachments: initialAttachments,
    attachmentError: null,
  });

  const imageCounterRef = useRef(initialAttachments.length);

  const addImageAttachment = async (imageFiles: File[], { keepNames }: { keepNames: boolean }) => {
    if (imageFiles.length === 0) return;

    if (imageFiles.some(file => file.size > MAX_IMAGE_BYTES)) {
      dispatch({ type: 'IMAGE_TOO_LARGE' });
      return;
    }

    const newAttachments = await Promise.all(
      imageFiles.map(async file => {
        imageCounterRef.current += 1;
        // Captured before the await below — reading the shared ref after an await would race
        // with sibling files in this same batch and could produce duplicate ids.
        const id = `image-${imageCounterRef.current}`;
        const dataUrl = await readFileAsDataUrl(file);
        // Clipboard pastes report the same generic filename (e.g. "image.png") for every file
        // regardless of browser, so it can't distinguish cards — use the id-based label instead.
        return { id, name: keepNames ? file.name : null, dataUrl };
      })
    );
    dispatch({ type: 'ADD', attachments: newAttachments });
  };

  const handleAttachmentPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length === 0) return;
    e.preventDefault();
    await addImageAttachment(imageFiles, { keepNames: false });
  };

  const removeAttachment = (id: string) => {
    dispatch({ type: 'REMOVE', id });
  };

  const resetAttachments = () => {
    dispatch({ type: 'RESET' });
    imageCounterRef.current = 0;
  };

  return {
    attachments: state.attachments,
    attachmentError: state.attachmentError,
    addImageAttachment,
    handleAttachmentPaste,
    removeAttachment,
    resetAttachments,
  };
}

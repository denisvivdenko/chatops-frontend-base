import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Attachment, MAX_IMAGE_BYTES, buildMessageContent, readFileAsDataUrl, splitContentAndAttachments } from './attachments';

type ComposerState = {
  value: string;
  attachments: Attachment[];
  pasteError: string | null;
};

type ComposerAction =
  | { type: 'SET_TEXT'; text: string }
  | { type: 'ADD_ATTACHMENTS'; attachments: Attachment[] }
  | { type: 'IMAGE_TOO_LARGE' }
  | { type: 'REMOVE_ATTACHMENT'; id: string }
  | { type: 'RESET' };

function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'SET_TEXT':
      return { ...state, value: action.text, pasteError: null };
    case 'ADD_ATTACHMENTS':
      return { ...state, attachments: [...state.attachments, ...action.attachments], pasteError: null };
    case 'IMAGE_TOO_LARGE':
      return { ...state, pasteError: 'Image is too large to add (max 3MB).' };
    case 'REMOVE_ATTACHMENT':
      return { ...state, attachments: state.attachments.filter(attachment => attachment.id !== action.id) };
    case 'RESET':
      return { ...state, value: '', attachments: [] };
    default:
      return state;
  }
}

type UseMessageComposerOptions = {
  initialValue?: string;
  autoFocus?: boolean;
};

export function useMessageComposer({ initialValue = '', autoFocus }: UseMessageComposerOptions) {
  // Only meant to run once, on mount — initialValue just seeds the composer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialSplit = useMemo(() => splitContentAndAttachments(initialValue), []);

  const [state, dispatch] = useReducer(composerReducer, {
    value: initialSplit.text,
    attachments: initialSplit.attachments,
    pasteError: null,
  });

  const imageCounterRef = useRef(initialSplit.attachments.length);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextarea();
    const el = textareaRef.current;
    if (autoFocus && el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // Only meant to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_TEXT', text: e.target.value });
    resizeTextarea();
  };

  const addImageFiles = async (imageFiles: File[], { keepNames }: { keepNames: boolean }) => {
    if (imageFiles.length === 0) return;

    if (imageFiles.some(file => file.size > MAX_IMAGE_BYTES)) {
      dispatch({ type: 'IMAGE_TOO_LARGE' });
      return;
    }

    const newAttachments = await Promise.all(
      imageFiles.map(async file => {
        imageCounterRef.current += 1;
        const dataUrl = await readFileAsDataUrl(file);
        // Clipboard pastes report the same generic filename (e.g. "image.png") for every file
        // regardless of browser, so it can't distinguish cards — use the id-based label instead.
        return { id: `image-${imageCounterRef.current}`, name: keepNames ? file.name : null, dataUrl };
      })
    );
    dispatch({ type: 'ADD_ATTACHMENTS', attachments: newAttachments });
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length === 0) return;
    e.preventDefault();
    await addImageFiles(imageFiles, { keepNames: false });
  };

  const removeAttachment = (id: string) => {
    dispatch({ type: 'REMOVE_ATTACHMENT', id });
  };

  /** Builds the outgoing content and resets the composer; returns null if there's nothing to send. */
  const send = () => {
    const content = buildMessageContent(state.value, state.attachments);
    if (content === null) return null;

    dispatch({ type: 'RESET' });
    imageCounterRef.current = 0;
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    return content;
  };

  return {
    value: state.value,
    attachments: state.attachments,
    pasteError: state.pasteError,
    textareaRef,
    handleChange,
    handlePaste,
    addImageFiles,
    removeAttachment,
    send,
  };
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';
import styles from './MessageInput.module.css';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*\]\((data:image\/[^)]+)\)/g;

/** Replaces `![image](data:...)` runs with short `[image-N]` placeholders, recording the mapping. */
function extractImagePlaceholders(text: string, images: Map<string, string>, counter: { current: number }) {
  return text.replace(IMAGE_MARKDOWN_PATTERN, (_match, dataUrl: string) => {
    counter.current += 1;
    const token = `[image-${counter.current}]`;
    images.set(token, dataUrl);
    return token;
  });
}

/** Reverses extractImagePlaceholders — swaps placeholders back to real Markdown image syntax before sending. */
function expandImagePlaceholders(text: string, images: Map<string, string>) {
  let result = text;
  for (const [token, dataUrl] of images) {
    result = result.split(token).join(`![image](${dataUrl})`);
  }
  return result;
}

type MessageInputProps = {
  onSendAction: (content: string) => void;
  disableSend?: boolean;
  /** Seeds the textarea and switches this into a compact edit-in-place variant. */
  initialValue?: string;
  /** Presence of this prop is what puts the input into edit mode (adds a Cancel button, Escape-to-cancel). */
  onCancelAction?: () => void;
  autoFocus?: boolean;
};

export default function MessageInput({ onSendAction, disableSend, initialValue = '', onCancelAction, autoFocus }: MessageInputProps) {
  const pendingImagesRef = useRef<Map<string, string>>(new Map());
  const imageCounterRef = useRef(0);
  const [value, setValue] = useState(() => extractImagePlaceholders(initialValue, pendingImagesRef.current, imageCounterRef));
  const [pasteError, setPasteError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditVariant = onCancelAction !== undefined;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (autoFocus) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // Only meant to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSendAction(expandImagePlaceholders(trimmed, pendingImagesRef.current));
    pendingImagesRef.current.clear();
    imageCounterRef.current = 0;
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disableSend) handleSend();
    } else if (e.key === 'Escape' && onCancelAction) {
      e.preventDefault();
      onCancelAction();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    setPasteError(null);
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + text + value.slice(end);
    setValue(nextValue);
    requestAnimationFrame(() => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
      const cursorPos = start + text.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length === 0) return;
    e.preventDefault();

    if (imageFiles.some(file => file.size > MAX_IMAGE_BYTES)) {
      setPasteError('Image is too large to paste (max 3MB).');
      return;
    }
    setPasteError(null);

    const dataUrls = await Promise.all(imageFiles.map(readFileAsDataUrl));
    const tokens = dataUrls.map(url => {
      imageCounterRef.current += 1;
      const token = `[image-${imageCounterRef.current}]`;
      pendingImagesRef.current.set(token, url);
      return token;
    });
    insertAtCursor(tokens.join('\n'));
  };

  return (
    <div className={`${styles.wrapper} ${isEditVariant ? styles.compact : ''}`}>
      <div className={styles.container}>
        {/* left slot — future home of the + button */}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder="Type a message..."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <div className={styles.rightActions}>
          {onCancelAction && (
            <button className={styles.cancelButton} onClick={onCancelAction} aria-label="Cancel edit">
              <X size={16} strokeWidth={2} />
            </button>
          )}
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={disableSend || !value.trim()}
            aria-label={isEditVariant ? 'Save edit' : 'Send message'}
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      {pasteError && <div className={styles.pasteError}>{pasteError}</div>}
    </div>
  );
}

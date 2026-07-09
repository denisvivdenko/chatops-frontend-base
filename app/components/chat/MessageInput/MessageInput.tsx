'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Image as ImageIcon, X } from 'lucide-react';
import styles from './MessageInput.module.css';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type Attachment = {
  id: string;
  name: string | null;
  dataUrl: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const IMAGE_MARKDOWN_PATTERN = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;

/** Pulls `![name](data:...)` runs out of existing content (edit mode) into attachment cards, leaving the rest as plain text. */
function splitContentAndAttachments(content: string): { text: string; attachments: Attachment[] } {
  const attachments: Attachment[] = [];
  const text = content
    .replace(IMAGE_MARKDOWN_PATTERN, (_match, name: string, dataUrl: string) => {
      attachments.push({ id: `image-${attachments.length + 1}`, name: name || null, dataUrl });
      return '';
    })
    .trim();
  return { text, attachments };
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
  // Only meant to run once, on mount — initialValue just seeds the composer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialSplit = useMemo(() => splitContentAndAttachments(initialValue), []);

  const [value, setValue] = useState(initialSplit.text);
  const [attachments, setAttachments] = useState<Attachment[]>(initialSplit.attachments);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const imageCounterRef = useRef(initialSplit.attachments.length);
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
    if (!trimmed && attachments.length === 0) return;

    const imagesMarkdown = attachments.map(attachment => `![${attachment.name ?? attachment.id}](${attachment.dataUrl})`).join('\n');
    const content = [trimmed, imagesMarkdown].filter(Boolean).join('\n\n');

    onSendAction(content);
    setValue('');
    setAttachments([]);
    imageCounterRef.current = 0;
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

    const newAttachments = await Promise.all(
      imageFiles.map(async file => {
        imageCounterRef.current += 1;
        const dataUrl = await readFileAsDataUrl(file);
        // Clipboard pastes report the same generic filename (e.g. "image.png") for every file
        // regardless of browser, so it can't distinguish cards — use the id-based label instead.
        return { id: `image-${imageCounterRef.current}`, name: null, dataUrl };
      })
    );
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
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
            disabled={disableSend || (!value.trim() && attachments.length === 0)}
            aria-label={isEditVariant ? 'Save edit' : 'Send message'}
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      {attachments.length > 0 && (
        <div className={styles.attachmentList}>
          {attachments.map(attachment => (
            <div key={attachment.id} className={styles.attachmentCard}>
              <ImageIcon size={14} strokeWidth={1.5} />
              <span className={styles.attachmentName}>{attachment.name ?? attachment.id}</span>
              <button
                type="button"
                className={styles.attachmentRemove}
                onClick={() => removeAttachment(attachment.id)}
                aria-label={`Remove ${attachment.name ?? attachment.id}`}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pasteError && <div className={styles.pasteError}>{pasteError}</div>}
    </div>
  );
}

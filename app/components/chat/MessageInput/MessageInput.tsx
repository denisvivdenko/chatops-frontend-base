'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Image as ImageIcon, Plus, X } from 'lucide-react';
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

function MessageInput({ onSendAction, disableSend, initialValue = '', onCancelAction, autoFocus }: MessageInputProps) {
  // Only meant to run once, on mount — initialValue just seeds the composer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialSplit = useMemo(() => splitContentAndAttachments(initialValue), []);

  const [value, setValue] = useState(initialSplit.text);
  const [attachments, setAttachments] = useState<Attachment[]>(initialSplit.attachments);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const imageCounterRef = useRef(initialSplit.attachments.length);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!isAddMenuOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setIsAddMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsAddMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddMenuOpen]);

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

  const addImageFiles = async (imageFiles: File[], { keepNames }: { keepNames: boolean }) => {
    if (imageFiles.length === 0) return;

    if (imageFiles.some(file => file.size > MAX_IMAGE_BYTES)) {
      setPasteError('Image is too large to add (max 3MB).');
      return;
    }
    setPasteError(null);

    const newAttachments = await Promise.all(
      imageFiles.map(async file => {
        imageCounterRef.current += 1;
        const dataUrl = await readFileAsDataUrl(file);
        // Clipboard pastes report the same generic filename (e.g. "image.png") for every file
        // regardless of browser, so it can't distinguish cards — use the id-based label instead.
        return { id: `image-${imageCounterRef.current}`, name: keepNames ? file.name : null, dataUrl };
      })
    );
    setAttachments(prev => [...prev, ...newAttachments]);
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

  const handleImageButtonClick = () => {
    setIsAddMenuOpen(false);
    imageInputRef.current?.click();
  };

  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(e.target.files ?? []);
    e.target.value = '';
    await addImageFiles(imageFiles, { keepNames: true });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

  return (
    <div className={`${styles.wrapper} ${isEditVariant ? styles.compact : ''}`}>
      <div className={styles.container}>
        <div className={styles.addMenu} ref={addMenuRef}>
          <button
            type="button"
            className={styles.addButton}
            aria-label="Add attachment"
            aria-haspopup="menu"
            aria-expanded={isAddMenuOpen}
            onClick={() => setIsAddMenuOpen(open => !open)}
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
          {isAddMenuOpen && (
            <div className={styles.addMenuList} role="menu">
              <button type="button" className={styles.addMenuItem} role="menuitem" onClick={handleImageButtonClick}>
                <ImageIcon size={14} strokeWidth={1.5} />
                Image
              </button>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageInputChange}
          />
        </div>
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
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={disableSend || (!value.trim() && attachments.length === 0)}
            aria-label={isEditVariant ? 'Save edit' : 'Send message'}
          >
            <ArrowUp size={16} strokeWidth={1.5} />
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
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pasteError && <div className={styles.pasteError}>{pasteError}</div>}
    </div>
  );
}

export default memo(MessageInput);

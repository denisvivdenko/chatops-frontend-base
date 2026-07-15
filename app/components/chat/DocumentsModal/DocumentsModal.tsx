'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, FileWarning, Plus, RotateCw, X } from 'lucide-react';
import Spinner from '../../feedback/Spinner/Spinner';
import { useChatActions, useMessages, useResources } from '../../../context/chatContext';
import { buildDocumentLinkMarkdown } from '../../../hooks/chat/documentLink';
import type { ResourceItem } from '../../../hooks/chat/appState';
import styles from './DocumentsModal.module.css';

const ACCEPTED_TYPE = 'application/pdf';
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (file.type !== ACCEPTED_TYPE) return `${file.name} isn't a PDF.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `${file.name} is too large (max 20MB).`;
  return null;
}

type Props = {
  onCloseAction: () => void;
};

export default function DocumentsModal({ onCloseAction }: Props) {
  const { items, ensureLoaded, uploadResource, cancelUpload, retryUpload, removeResource } = useResources();
  const { messages } = useMessages();
  const { sendMessage } = useChatActions();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // One-time library fetch: ensureLoaded no-ops once `isLoaded` flips, so re-running
  // it when its identity changes after that is harmless.
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseAction();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCloseAction]);

  const lastMessage = messages[messages.length - 1];
  const disableSend = lastMessage?.status === 'pending' || lastMessage?.status === 'failed';
  const hasUnresolvedItems = items.some(item => item.status === 'uploading' || item.status === 'failed');
  const selectedReadyItems = items.filter(
    (item): item is ResourceItem & { resourceId: string } =>
      item.status === 'ready' && item.resourceId !== null && selectedIds.has(item.id)
  );
  const addDisabled = disableSend || hasUnresolvedItems || selectedReadyItems.length === 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(e.target.files ?? []);
    e.target.value = '';

    const errors: string[] = [];
    for (const file of pickedFiles) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        continue;
      }
      // Pre-select immediately: the whole point of picking a file here was to attach it,
      // so there's nothing to check once it turns ready.
      const id = uploadResource(file);
      setSelectedIds(prev => new Set(prev).add(id));
    }
    setValidationError(errors.length > 0 ? errors.join(' ') : null);
  };

  const handleAddToChat = () => {
    const content = selectedReadyItems.map(item => buildDocumentLinkMarkdown(item.filename, item.resourceId)).join('\n');
    sendMessage(content);
    onCloseAction();
  };

  return (
    <div className={styles.overlay} onClick={onCloseAction}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Documents" onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Documents</h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCloseAction}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className={styles.addRow}>
          <button type="button" className={styles.addFilesButton} onClick={() => fileInputRef.current?.click()}>
            <Plus size={16} strokeWidth={1.5} />
            Add PDFs
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPE}
            multiple
            hidden
            onChange={handleFileInputChange}
          />
        </div>
        {validationError && <div className={styles.validationError}>{validationError}</div>}

        <div className={styles.list}>
          {items.length === 0 && <div className={styles.empty}>No documents yet.</div>}
          {items.map(item => (
            <div className={styles.card} key={item.id}>
              {item.status === 'uploading' && (
                <div className={styles.cardRow}>
                  <Spinner size={16} />
                  <span className={styles.filename}>{item.filename}</span>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => cancelUpload(item.id)}
                    aria-label={`Cancel upload of ${item.filename}`}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              )}
              {item.status === 'failed' && (
                <div className={styles.cardRow}>
                  <FileWarning size={16} strokeWidth={1.5} className={styles.failedIcon} />
                  <div className={styles.cardText}>
                    <span className={styles.filename}>{item.filename}</span>
                    {item.error && <span className={styles.errorText}>{item.error}</span>}
                  </div>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => retryUpload(item.id)}
                    aria-label={`Retry ${item.filename}`}
                  >
                    <RotateCw size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => removeResource(item.id)}
                    aria-label={`Remove ${item.filename}`}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              )}
              {item.status === 'ready' && (
                <label className={styles.cardRow}>
                  <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  <FileText size={16} strokeWidth={1.5} />
                  <span className={styles.filename}>{item.filename}</span>
                </label>
              )}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          {hasUnresolvedItems && (
            <span className={styles.footerHint}>Resolve or remove failed uploads before sending.</span>
          )}
          <button type="button" className={styles.addToChatButton} disabled={addDisabled} onClick={handleAddToChat}>
            Add to chat
          </button>
        </div>
      </div>
    </div>
  );
}

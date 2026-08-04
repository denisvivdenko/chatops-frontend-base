'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp, Plus, X } from 'lucide-react';
import { useResources } from '../../../context/ResourcesContext';
import { useMessages, useActiveChatActions } from '../../../context/ActiveChatContext';
import { useChatActions, useChats } from '../../../context/ChatContext';
import { useDocumentsModal } from '../../../context/DocumentsModalContext';
import { buildDocumentLinkMarkdown } from '../../../utils/documentLink';
import { ACCEPTED_TYPE } from './documents/documents';
import { useDocumentSelection } from './documents/useDocumentSelection';
import DocumentsList from './DocumentsList/DocumentsList';
import ReplaceConfirmDialog from './ReplaceConfirmDialog/ReplaceConfirmDialog';
import styles from './DocumentsModal.module.css';

export default function DocumentsModal() {
  const { closeDocumentsModal } = useDocumentsModal();
  const { items, ensureLoaded, uploadResource, cancelUpload, retryUpload, removeResource } = useResources();
  const { unresolved } = useMessages();
  const { sendMessage } = useActiveChatActions();
  const { createChat } = useChatActions();
  const { activeChatId } = useChats();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedIds,
    toggleSelect,
    validationError,
    pendingReplacement,
    handleFileInputChange,
    handleConfirmReplace,
    handleCancelReplace,
    hasUnresolvedItems,
    selectedReadyItems,
  } = useDocumentSelection({ items, uploadResource, cancelUpload, removeResource });

  // One-time library fetch: ensureLoaded no-ops once `isLoaded` flips, so re-running
  // it when its identity changes after that is harmless.
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (pendingReplacement) handleCancelReplace();
      else closeDocumentsModal();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDocumentsModal, pendingReplacement, handleCancelReplace]);

  const addDisabled = unresolved || hasUnresolvedItems || selectedReadyItems.length === 0;

  const handleAddToChat = () => {
    const content = selectedReadyItems.map(item => buildDocumentLinkMarkdown(item.filename, item.resourceId)).join('\n');
    if (activeChatId) sendMessage(content);
    else createChat(content);
    closeDocumentsModal();
  };

  return (
    <>
      <div className={styles.overlay} onClick={closeDocumentsModal}>
        <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Documents" onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>Documents</h2>
            <button type="button" className={styles.iconButton} aria-label="Close" onClick={closeDocumentsModal}>
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

          <DocumentsList
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onCancelUpload={cancelUpload}
            onRetryUpload={retryUpload}
            onRemove={removeResource}
          />

          <div className={styles.footer}>
            {hasUnresolvedItems && (
              <span className={styles.footerHint}>Resolve or remove failed uploads before sending.</span>
            )}
            <button
              type="button"
              className={styles.addToChatButton}
              disabled={addDisabled}
              onClick={handleAddToChat}
              aria-label="Add to chat"
            >
              <ArrowUp size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
      {pendingReplacement && (
        <ReplaceConfirmDialog
          filename={pendingReplacement.file.name}
          onCancel={handleCancelReplace}
          onConfirm={handleConfirmReplace}
        />
      )}
    </>
  );
}

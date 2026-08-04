import { useRef, useState } from 'react';
import { ResourceItem } from '../../../../context/ResourcesContext';
import { validateFile } from './documents';

type PendingReplacement = { file: File; existingId: string };

type UseDocumentSelectionArgs = {
  items: ResourceItem[];
  uploadResource: (file: File) => string;
  cancelUpload: (id: string) => void;
  removeResource: (id: string) => void;
};

export function useDocumentSelection({ items, uploadResource, cancelUpload, removeResource }: UseDocumentSelectionArgs) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<PendingReplacement | null>(null);
  // Files still waiting to be processed after `pendingReplacement` resolves.
  const queueRef = useRef<File[]>([]);

  const addFile = (file: File, existingId?: string) => {
    if (existingId) {
      const existing = items.find(item => item.id === existingId);
      if (existing?.status === 'uploading') cancelUpload(existingId);
      else removeResource(existingId);
    }
    // Pre-select immediately: the whole point of picking a file here was to attach it,
    // so there's nothing to check once it turns ready.
    const id = uploadResource(file);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (existingId) next.delete(existingId);
      next.add(id);
      return next;
    });
  };

  // Walks the queued files one at a time, pausing on the first one whose name collides
  // with an existing document until the replace-confirmation dialog resolves it.
  const processQueue = () => {
    const file = queueRef.current.shift();
    if (!file) return;

    const existing = items.find(item => item.filename === file.name);
    if (existing) {
      setPendingReplacement({ file, existingId: existing.id });
      return;
    }
    addFile(file);
    processQueue();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(e.target.files ?? []);
    e.target.value = '';

    const errors: string[] = [];
    const validFiles: File[] = [];
    for (const file of pickedFiles) {
      const error = validateFile(file);
      if (error) errors.push(error);
      else validFiles.push(file);
    }
    setValidationError(errors.length > 0 ? errors.join(' ') : null);

    queueRef.current.push(...validFiles);
    if (!pendingReplacement) processQueue();
  };

  const handleConfirmReplace = () => {
    if (!pendingReplacement) return;
    addFile(pendingReplacement.file, pendingReplacement.existingId);
    setPendingReplacement(null);
    processQueue();
  };

  const handleCancelReplace = () => {
    setPendingReplacement(null);
    processQueue();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasUnresolvedItems = items.some(item => item.status === 'uploading' || item.status === 'failed');
  const selectedReadyItems = items.filter(
    (item): item is ResourceItem & { resourceId: string } =>
      item.status === 'ready' && item.resourceId !== null && selectedIds.has(item.id)
  );

  return {
    selectedIds,
    toggleSelect,
    validationError,
    pendingReplacement,
    handleFileInputChange,
    handleConfirmReplace,
    handleCancelReplace,
    hasUnresolvedItems,
    selectedReadyItems,
  };
}

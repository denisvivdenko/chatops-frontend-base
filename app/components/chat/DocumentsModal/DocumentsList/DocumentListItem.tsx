'use client';

import { FileText, FileWarning, RotateCw, X } from 'lucide-react';
import Spinner from '../../../shared/Spinner/Spinner';
import { ResourceItem } from '../../../../context/ResourcesContext';
import styles from './DocumentsList.module.css';

type DocumentListItemProps = {
  item: ResourceItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onCancelUpload: (id: string) => void;
  onRetryUpload: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function DocumentListItem({
  item,
  selected,
  onToggleSelect,
  onCancelUpload,
  onRetryUpload,
  onRemove,
}: DocumentListItemProps) {
  return (
    <div className={styles.card}>
      {item.status === 'uploading' && (
        <div className={styles.cardRow}>
          <Spinner size={16} />
          <span className={styles.filename}>{item.filename}</span>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onCancelUpload(item.id)}
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
            onClick={() => onRetryUpload(item.id)}
            aria-label={`Retry ${item.filename}`}
          >
            <RotateCw size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.filename}`}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
      {item.status === 'ready' && (
        <label className={styles.cardRow}>
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.id)} />
          <FileText size={16} strokeWidth={1.5} />
          <span className={styles.filename}>{item.filename}</span>
        </label>
      )}
    </div>
  );
}

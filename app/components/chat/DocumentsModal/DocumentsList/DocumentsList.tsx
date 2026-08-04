'use client';

import { ResourceItem } from '../../../../context/ResourcesContext';
import DocumentListItem from './DocumentListItem';
import styles from './DocumentsList.module.css';

type DocumentsListProps = {
  items: ResourceItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onCancelUpload: (id: string) => void;
  onRetryUpload: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function DocumentsList({
  items,
  selectedIds,
  onToggleSelect,
  onCancelUpload,
  onRetryUpload,
  onRemove,
}: DocumentsListProps) {
  return (
    <div className={styles.list}>
      {items.length === 0 && <div className={styles.empty}>No documents yet.</div>}
      {items.map(item => (
        <DocumentListItem
          key={item.id}
          item={item}
          selected={selectedIds.has(item.id)}
          onToggleSelect={onToggleSelect}
          onCancelUpload={onCancelUpload}
          onRetryUpload={onRetryUpload}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

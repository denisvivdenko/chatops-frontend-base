'use client';

import { Image as ImageIcon, X } from 'lucide-react';
import { Attachment } from '../attachments/attachments';
import styles from './AttachmentList.module.css';

type AttachmentListProps = {
  attachments: Attachment[];
  onRemove: (id: string) => void;
};

function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={styles.attachmentList}>
      {attachments.map(attachment => (
        <div key={attachment.id} className={styles.attachmentCard}>
          <ImageIcon size={14} strokeWidth={1.5} />
          <span className={styles.attachmentName}>{attachment.name ?? attachment.id}</span>
          <button
            type="button"
            className={styles.attachmentRemove}
            onClick={() => onRemove(attachment.id)}
            aria-label={`Remove ${attachment.name ?? attachment.id}`}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default AttachmentList;

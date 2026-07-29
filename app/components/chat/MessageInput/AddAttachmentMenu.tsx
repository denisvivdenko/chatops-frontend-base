'use client';

import { useRef } from 'react';
import { FileText, Image as ImageIcon, Plus } from 'lucide-react';
import { useDismissableMenu } from './useDismissableMenu';
import styles from './MessageInput.module.css';

type AddAttachmentMenuProps = {
  onPickImages: (files: File[]) => void;
  onPickDocument: () => void;
};

function AddAttachmentMenu({ onPickImages, onPickDocument }: AddAttachmentMenuProps) {
  const { isOpen, toggle, close, menuRef } = useDismissableMenu<HTMLDivElement>();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageButtonClick = () => {
    close();
    imageInputRef.current?.click();
  };

  const handleDocumentButtonClick = () => {
    close();
    onPickDocument();
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    onPickImages(files);
  };

  return (
    <div className={styles.addMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.addButton}
        aria-label="Add attachment"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>
      {isOpen && (
        <div className={styles.addMenuList} role="menu">
          <button type="button" className={styles.addMenuItem} role="menuitem" onClick={handleImageButtonClick}>
            <ImageIcon size={16} strokeWidth={1.5} />
            Image
          </button>
          <button type="button" className={styles.addMenuItem} role="menuitem" onClick={handleDocumentButtonClick}>
            <FileText size={16} strokeWidth={1.5} />
            Document
          </button>
        </div>
      )}
      <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageInputChange} />
    </div>
  );
}

export default AddAttachmentMenu;

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DocumentsModalContextValue {
  isOpen: boolean;
  openDocumentsModal: () => void;
  closeDocumentsModal: () => void;
}

const DocumentsModalContext = createContext<DocumentsModalContextValue | undefined>(undefined);

export function DocumentsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDocumentsModal = useCallback(() => setIsOpen(true), []);
  const closeDocumentsModal = useCallback(() => setIsOpen(false), []);

  return (
    <DocumentsModalContext.Provider value={{ isOpen, openDocumentsModal, closeDocumentsModal }}>
      {children}
    </DocumentsModalContext.Provider>
  );
}

export function useDocumentsModal() {
  const ctx = useContext(DocumentsModalContext);
  if (!ctx) throw new Error('useDocumentsModal must be used within DocumentsModalProvider');
  return ctx;
}

'use client';

import { useMediaQuery } from '../../../hooks/useMediaQuery';
import DesktopLayout from '../DesktopLayout/DesktopLayout';
import MobileLayout from '../MobileLayout/MobileLayout';
import Chat from '../../chat/Chat/Chat';
import styles from './AppShell.module.css';
import ErrorBanner from '../../banner/ErrorBanner/ErrorBanner';
import DocumentsModal from '../../chat/DocumentsModal/DocumentsModal';
import { useDocumentsModal } from '../../../context/DocumentsModalContext';

export default function AppShell() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const Layout = isMobile ? MobileLayout : DesktopLayout;
  const { isOpen: isDocumentsModalOpen } = useDocumentsModal();

  return (
    <div className={styles.layout}>
      <ErrorBanner />
      <Layout>
        <Chat/>
      </Layout>
      {isDocumentsModalOpen && <DocumentsModal />}
    </div>
  );
}

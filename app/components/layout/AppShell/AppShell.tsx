'use client';

import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useChatStatus, useChatActions } from '../../../context/chatContext';
import DesktopLayout from '../DesktopLayout/DesktopLayout';
import MobileLayout from '../MobileLayout/MobileLayout';
import ChatPane from '../../chat/ChatPane/ChatPane';
import NotFoundNotice from '../../feedback/NotFoundNotice/NotFoundNotice';
import styles from './AppShell.module.css';

export default function AppShell() {
  const { notFoundReason } = useChatStatus();
  const { goHome, dismissResourceNotFound } = useChatActions();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <div className={styles.layout}>
      <Layout>
        <ChatPane />
      </Layout>
      {notFoundReason && (
        <NotFoundNotice
          reason={notFoundReason}
          onGoHomeAction={goHome}
          onStayAction={dismissResourceNotFound}
        />
      )}
    </div>
  );
}

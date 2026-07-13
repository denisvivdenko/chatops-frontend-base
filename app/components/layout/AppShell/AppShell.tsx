'use client';

import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useErrorValue, useNavigationValue } from '../../../context/chatContext';
import DesktopLayout from '../DesktopLayout/DesktopLayout';
import MobileLayout from '../MobileLayout/MobileLayout';
import ChatPane from '../../chat/ChatPane/ChatPane';
import NotFoundNotice from '../../feedback/NotFoundNotice/NotFoundNotice';
import styles from './AppShell.module.css';

export default function AppShell() {
  const { message, dismissError } = useErrorValue();
  const { goHome } = useNavigationValue();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <div className={styles.layout}>
      <Layout>
        <ChatPane />
      </Layout>
      {message && (
        <NotFoundNotice
          message={message}
          onGoHomeAction={goHome}
          onStayAction={dismissError}
        />
      )}
    </div>
  );
}

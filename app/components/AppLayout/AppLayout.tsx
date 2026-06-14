'use client';

import { useState } from 'react';
import Sidebar from '../navigation/Sidebar/Sidebar';
import ChatPane from '../chat/ChatPane/ChatPane';
import MobileMenu from '../navigation/MobileMenu/MobileMenu';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <Sidebar />
      </div>
      <ChatPane onMenuOpenAction={() => setIsMenuOpen(true)} />
      {isMenuOpen && <MobileMenu onCloseAction={() => setIsMenuOpen(false)} />}
    </div>
  );
}

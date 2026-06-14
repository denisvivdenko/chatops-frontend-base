'use client';

import { useState } from 'react';
import Sidebar from './navigation/Sidebar';
import ChatPane from './chat/ChatPane';
import MobileMenu from './navigation/MobileMenu';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <ChatPane onMenuOpenAction={() => setIsMenuOpen(true)} />
      {isMenuOpen && <MobileMenu onCloseAction={() => setIsMenuOpen(false)} />}
    </div>
  );
}

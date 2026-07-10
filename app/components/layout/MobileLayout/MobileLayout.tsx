'use client';

import { useState } from 'react';
import TopBar from '../TopBar/TopBar';
import MobileMenu from '../../navigation/MobileMenu/MobileMenu';
import styles from './MobileLayout.module.css';

type MenuState = 'closed' | 'open' | 'closing';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [menuState, setMenuState] = useState<MenuState>('closed');

  function handleClose() {
    setMenuState('closing');
  }

  function handleAnimationEnd() {
    if (menuState === 'closing') setMenuState('closed');
  }

  return (
    <div className={styles.main}>
      <div className={styles.headerBar}>
        <TopBar onMenuOpenAction={() => setMenuState('open')} />
      </div>
      {children}
      {menuState !== 'closed' && (
        <MobileMenu
          onCloseAction={handleClose}
          isClosing={menuState === 'closing'}
          onAnimationEndAction={handleAnimationEnd}
        />
      )}
    </div>
  );
}

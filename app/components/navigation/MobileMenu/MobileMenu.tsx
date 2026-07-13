'use client';

import { useRef } from 'react';
import { X, LogOut } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
import { useSessionValue } from '../../../context/chatContext';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import styles from './MobileMenu.module.css';

type Props = {
  onCloseAction(): void;
  isClosing?: boolean;
  onAnimationEndAction?(): void;
};

export default function MobileMenu({ onCloseAction, isClosing, onAnimationEndAction }: Props) {
  const { logout: onLogout } = useSessionValue();
  const logoutRef = useRef<HTMLButtonElement>(null);
  const logout = useConfirmAction(logoutRef, onLogout);

  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onAnimationEndAction?.();
  }

  return (
    <div
      className={`${styles.menu} ${isClosing ? styles.closing : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={styles.header}>
        <button
          ref={logoutRef}
          className={`${styles.closeBtn} ${logout.confirming ? styles.closeBtnDanger : ''}`}
          aria-label={logout.confirming ? 'Confirm log out' : 'Log out'}
          onClick={logout.handleClick}
        >
          <LogOut size={20} strokeWidth={1.5} />
        </button>
        <button className={styles.closeBtn} aria-label="Close menu" onClick={onCloseAction}>
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>
      <div className={styles.chatListWrapper}>
        <ChatList onNavigateAction={onCloseAction} />
      </div>
    </div>
  );
}

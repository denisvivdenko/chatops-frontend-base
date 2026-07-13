'use client';

import { useRef, useState } from 'react';
import { PanelLeft, LogOut } from 'lucide-react';
import ChatList from '../ChatList/ChatList';
import { useSessionValue } from '../../../context/chatContext';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { logout: onLogout } = useSessionValue();
  const [expanded, setExpanded] = useState(true);
  const logoutRef = useRef<HTMLButtonElement>(null);
  const logout = useConfirmAction(logoutRef, onLogout);

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
      <button
        className={styles.item}
        aria-label="Toggle sidebar"
        onClick={() => setExpanded(v => !v)}
      >
        <PanelLeft className={styles.icon} size={20} strokeWidth={1.5} />
        <span className={styles.label}>Collapse</span>
      </button>

      {expanded && (
        <div className={styles.chatListWrapper}>
          <ChatList />
        </div>
      )}

      <button
        ref={logoutRef}
        className={`${styles.item} ${logout.confirming ? styles.itemDanger : ''}`}
        aria-label={logout.confirming ? 'Confirm log out' : 'Log out'}
        onClick={logout.handleClick}
      >
        <LogOut className={styles.icon} size={20} strokeWidth={1.5} />
        <span className={styles.label}>{logout.confirming ? 'Confirm logout' : 'Log out'}</span>
      </button>
    </aside>
  );
}

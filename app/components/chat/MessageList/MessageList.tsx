'use client';

import { Virtuoso } from 'react-virtuoso';
import MessageComponent from '../Message/Message';
import { useMessages } from '../../../context/chatContext';
import styles from './MessageList.module.css';

const Header = () => <div className={styles.spacerTop} />;
const Footer = () => <div className={styles.spacerBottom} />;

export default function MessageList() {
  const { messages } = useMessages();

  const lastMessage = messages[messages.length - 1];
  // Editing is blocked only while a reply is actively streaming, not while one has failed
  // (modify.md: "Editing after a failed reply is fine").
  const editingBlocked = lastMessage?.status === 'pending';

  return (
    <Virtuoso
      className={styles.scroller}
      data={messages}
      computeItemKey={(_, msg) => msg.id}
      initialTopMostItemIndex={messages.length - 1}
      // 'smooth' animates toward the bottom; while a reply is streaming, every token
      // moves that target again, so the animation restarts dozens of times a second
      // and never catches up — visible as jittery, self-fighting scrolling. Snap
      // instantly ('auto') while streaming, and reserve the animated scroll for
      // discrete jumps like sending a message.
      followOutput={isAtBottom => (isAtBottom ? (editingBlocked ? 'auto' : 'smooth') : false)}
      atBottomThreshold={80}
      increaseViewportBy={{ top: 800, bottom: 800 }}
      components={{ Header, Footer }}
      itemContent={(_, msg) => (
        <div className={styles.item}>
          <MessageComponent message={msg} editDisabled={editingBlocked} />
        </div>
      )}
    />
  );
}

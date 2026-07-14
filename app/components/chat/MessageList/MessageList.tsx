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
      alignToBottom
      followOutput={isAtBottom => (isAtBottom ? 'smooth' : false)}
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

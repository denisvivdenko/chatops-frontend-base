'use client';

import MessageComponent from '../Message/Message';
import { useMessages } from '../../../context/chatContext';
import styles from './MessageList.module.css';

export default function MessageList() {
  const { messages } = useMessages();

  const lastMessage = messages[messages.length - 1];
  // Editing is blocked only while a reply is actively streaming, not while one has failed
  // (modify.md: "Editing after a failed reply is fine").
  const editingBlocked = lastMessage?.status === 'pending';

  return (
    <div className={styles.inner}>
      {messages.map(msg => (
        <MessageComponent key={msg.id} message={msg} editDisabled={editingBlocked} />
      ))}
    </div>
  );
}

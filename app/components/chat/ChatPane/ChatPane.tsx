'use client';

import { useState } from 'react';
import ChatHeader from '../ChatHeader/ChatHeader';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPane.module.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  onMenuOpenAction: () => void;
};

export default function ChatPane({ onMenuOpenAction }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);

  const handleSend = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: 'This is a placeholder response.' },
    ]);
  };

  return (
    <div className={styles.pane}>
      <div className={styles.headerBar}>
        <ChatHeader onMenuOpenAction={onMenuOpenAction} />
      </div>
      <MessageList messages={messages} />
      <div className={styles.inputBar}>
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}

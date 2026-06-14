'use client';

import { useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MobileMenu from './MobileMenu';
import styles from './ChatWindow.module.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSend = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: 'This is a placeholder response.' },
    ]);
  };

  return (
    <div className={styles.window}>
      <Sidebar />
      <div className={styles.chat}>
        <ChatHeader onMenuOpenAction={() => setIsMenuOpen(true)} />
        <MessageList messages={messages} />
        <div className={styles.inputBar}>
          <MessageInput onSend={handleSend} />
        </div>
      </div>
      {isMenuOpen && <MobileMenu onCloseAction={() => setIsMenuOpen(false)} />}
    </div>
  );
}

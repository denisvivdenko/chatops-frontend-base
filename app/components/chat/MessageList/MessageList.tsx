import { useEffect, useRef } from 'react';
import type { Message } from '../../../types/chat';
import MessageComponent from '../Message/Message';
import styles from './MessageList.module.css';

type MessageListProps = {
  messages: Message[];
};

export default function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.inner}>
      {messages.map(msg => (
        <MessageComponent key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

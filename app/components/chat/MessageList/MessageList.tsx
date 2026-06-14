import { useEffect, useRef } from 'react';
import Message from '../Message/Message';
import styles from './MessageList.module.css';

type MessageItem = {
  role: 'user' | 'assistant';
  content: string;
};

type MessageListProps = {
  messages: MessageItem[];
};

export default function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.list}>
      {messages.map((msg, i) => (
        <Message key={i} role={msg.role} content={msg.content} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

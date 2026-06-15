'use client';

import type { Message } from '../../../types/chat';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPane.module.css';

type Props = {
  messages: Message[];
  onSendMessageAction(content: string): void;
};

export default function ChatPane({ messages, onSendMessageAction }: Props) {
  const lastMessage = messages[messages.length - 1];
  const isPending = lastMessage?.status === 'pending';

  return (
    <div className={styles.pane}>
      <div className={styles.messageArea}>
        <MessageList messages={messages} />
      </div>
      <div className={styles.inputBar}>
        <MessageInput onSendAction={onSendMessageAction} disableSend={isPending} />
      </div>
    </div>
  );
}

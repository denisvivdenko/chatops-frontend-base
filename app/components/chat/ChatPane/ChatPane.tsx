'use client';

import type { Message } from '../../../types/chat';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPane.module.css';

type Props = {
  messages: Message[];
  onSendMessageAction(content: string): void;
  onRetryMessageAction?(messageId: string): void;
};

export default function ChatPane({ messages, onSendMessageAction, onRetryMessageAction }: Props) {
  const lastMessage = messages[messages.length - 1];
  const lastMessageUnresolved = lastMessage?.status === 'pending' || lastMessage?.status === 'failed';

  return (
    <div className={styles.pane}>
      <div className={styles.messageArea}>
        <MessageList messages={messages} onRetryMessageAction={onRetryMessageAction} />
      </div>
      <div className={styles.inputBar}>
        <MessageInput onSendAction={onSendMessageAction} disableSend={lastMessageUnresolved} />
      </div>
    </div>
  );
}

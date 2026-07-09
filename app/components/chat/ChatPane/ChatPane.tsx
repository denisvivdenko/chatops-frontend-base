'use client';

import type { Message } from '../../../types/chat';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPane.module.css';

type Props = {
  messages: Message[];
  onSendMessageAction(content: string): void;
  onRetryMessageAction?(messageId: string): void;
  onModifyMessageAction?(messageId: string, content: string): void;
};

export default function ChatPane({ messages, onSendMessageAction, onRetryMessageAction, onModifyMessageAction }: Props) {
  const lastMessage = messages[messages.length - 1];
  const lastMessageUnresolved = lastMessage?.status === 'pending' || lastMessage?.status === 'failed';
  // Editing is blocked only while a reply is actively streaming, not while one has failed
  // (modify.md: "Editing after a failed reply is fine").
  const editingBlocked = lastMessage?.status === 'pending';

  return (
    <div className={styles.pane}>
      <div className={styles.messageArea}>
        <MessageList
          messages={messages}
          onRetryMessageAction={onRetryMessageAction}
          onModifyMessageAction={onModifyMessageAction}
          editingBlocked={editingBlocked}
        />
      </div>
      <div className={styles.inputBar}>
        <MessageInput onSendAction={onSendMessageAction} disableSend={lastMessageUnresolved} />
      </div>
    </div>
  );
}

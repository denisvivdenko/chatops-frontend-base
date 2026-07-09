'use client';

import type { Message } from '../../../types/chat';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import Spinner from '../../feedback/Spinner/Spinner';
import styles from './ChatPane.module.css';

type Props = {
  messages: Message[];
  isLoadingMessages?: boolean;
  onSendMessageAction(content: string): void;
  onRetryMessageAction?(messageId: string): void;
  onModifyMessageAction?(messageId: string, content: string): void;
};

export default function ChatPane({ messages, isLoadingMessages, onSendMessageAction, onRetryMessageAction, onModifyMessageAction }: Props) {
  const lastMessage = messages[messages.length - 1];
  const lastMessageUnresolved = lastMessage?.status === 'pending' || lastMessage?.status === 'failed';
  // Editing is blocked only while a reply is actively streaming, not while one has failed
  // (modify.md: "Editing after a failed reply is fine").
  const editingBlocked = lastMessage?.status === 'pending';

  return (
    <div className={styles.pane}>
      <div className={styles.messageArea}>
        {isLoadingMessages ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : (
          <MessageList
            messages={messages}
            onRetryMessageAction={onRetryMessageAction}
            onModifyMessageAction={onModifyMessageAction}
            editingBlocked={editingBlocked}
          />
        )}
      </div>
      <div className={styles.inputBar}>
        <MessageInput onSendAction={onSendMessageAction} disableSend={lastMessageUnresolved} />
      </div>
    </div>
  );
}

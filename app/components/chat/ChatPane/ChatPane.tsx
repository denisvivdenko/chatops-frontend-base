'use client';

import type { Message } from '../../../types/chat';
import ChatHeader from '../ChatHeader/ChatHeader';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPane.module.css';

type Props = {
  messages: Message[];
  onSendMessageAction(content: string): void;
  onMenuOpenAction(): void;
};

export default function ChatPane({ messages, onSendMessageAction, onMenuOpenAction }: Props) {
  return (
    <div className={styles.pane}>
      <div className={styles.headerBar}>
        <ChatHeader onMenuOpenAction={onMenuOpenAction} />
      </div>
      <MessageList messages={messages} />
      <div className={styles.inputBar}>
        <MessageInput onSendAction={onSendMessageAction} />
      </div>
    </div>
  );
}

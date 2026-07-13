'use client';

import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import Spinner from '../../feedback/Spinner/Spinner';
import { useMessages, useChatActions } from '../../../context/chatContext';
import styles from './ChatPane.module.css';

export default function ChatPane() {
  const { messages, isLoading } = useMessages();
  const { sendMessage } = useChatActions();

  const lastMessage = messages[messages.length - 1];
  const lastMessageUnresolved = lastMessage?.status === 'pending' || lastMessage?.status === 'failed';

  return (
    <div className={styles.pane}>
      <div className={styles.messageArea}>
        {isLoading ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : (
          <MessageList />
        )}
      </div>
      <div className={styles.inputBar}>
        <MessageInput onSendAction={sendMessage} disableSend={lastMessageUnresolved} />
      </div>
    </div>
  );
}

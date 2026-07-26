'use client';

import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import Spinner from '../../shared/Spinner/Spinner';
import { useActiveChatActions, useMessages } from '../../../context/ActiveChatContext';
import styles from './Chat.module.css';

export default function Chat() {
  const { messages, isLoading } = useMessages();
  const { sendMessage } = useActiveChatActions();

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

'use client';

import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import Spinner from '../../shared/Spinner/Spinner';
import { useActiveChatActions, useMessages } from '../../../context/ActiveChatContext';
import { useChatActions, useChats } from '../../../context/ChatContext';
import styles from './Chat.module.css';

export default function Chat() {
  const { isLoading, unresolved } = useMessages();
  const { createChat } = useChatActions();
  const { activeChatId } = useChats();
  const { sendMessage } = useActiveChatActions();

  const handleSend = (content: string) => {
    if (activeChatId) {
      return sendMessage(content);
    }
    return createChat(content);
  };

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
        <MessageInput onSendAction={handleSend} disableSend={unresolved} />
      </div>
    </div>
  );
}

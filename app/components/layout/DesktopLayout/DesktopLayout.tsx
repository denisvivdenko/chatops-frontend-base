import type { Chat } from '../../../types/chat';
import Sidebar from '../../navigation/Sidebar/Sidebar';
import styles from './DesktopLayout.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  isLoadingChats?: boolean;
  onLogoutAction(): void;
  onDeleteChatAction(chatId: string): void;
  children: React.ReactNode;
};

export default function DesktopLayout({ chats, activeChatId, isLoadingChats, onLogoutAction, onDeleteChatAction, children }: Props) {
  return (
    <div className={styles.layout}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        isLoadingChats={isLoadingChats}
        onLogoutAction={onLogoutAction}
        onDeleteChatAction={onDeleteChatAction}
      />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}

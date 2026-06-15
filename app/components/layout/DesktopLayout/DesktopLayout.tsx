import type { Chat } from '../../../types/chat';
import Sidebar from '../../navigation/Sidebar/Sidebar';
import styles from './DesktopLayout.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  onNewChatAction(): void;
  onSelectChatAction(id: string): void;
  children: React.ReactNode;
};

export default function DesktopLayout({
  chats,
  activeChatId,
  onNewChatAction,
  onSelectChatAction,
  children,
}: Props) {
  return (
    <div className={styles.layout}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChatAction={onNewChatAction}
        onSelectChatAction={onSelectChatAction}
      />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}

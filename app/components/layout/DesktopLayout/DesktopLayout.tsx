import type { Chat } from '../../../types/chat';
import Sidebar from '../../navigation/Sidebar/Sidebar';
import styles from './DesktopLayout.module.css';

type Props = {
  chats: Chat[];
  activeChatId: string | null;
  onLogoutAction(): void;
  children: React.ReactNode;
};

export default function DesktopLayout({ chats, activeChatId, onLogoutAction, children }: Props) {
  return (
    <div className={styles.layout}>
      <Sidebar chats={chats} activeChatId={activeChatId} onLogoutAction={onLogoutAction} />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}

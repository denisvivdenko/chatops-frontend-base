import Sidebar from '../../navigation/Sidebar/Sidebar';
import styles from './DesktopLayout.module.css';

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}

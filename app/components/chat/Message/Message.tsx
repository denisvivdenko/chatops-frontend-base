import styles from './Message.module.css';

type MessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';
  return (
    <div className={`${styles.wrapper} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.bubble}>
        {content}
      </div>
    </div>
  );
}

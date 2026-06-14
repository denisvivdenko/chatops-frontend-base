import ReactMarkdown from 'react-markdown';
import styles from './Message.module.css';

type MessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Message({ role, content }: MessageProps) {
  if (role === 'user') {
    return (
      <div className={styles.userWrapper}>
        <div className={styles.bubble}>{content}</div>
      </div>
    );
  }

  return (
    <div className={styles.assistantWrapper}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

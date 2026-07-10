import { useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import { Pencil, RotateCw } from 'lucide-react';
import type { Message } from '../../../types/chat';
import MessageInput from '../MessageInput/MessageInput';
import styles from './Message.module.css';

type MessageProps = {
  message: Message;
  onRetryAction?: () => void;
  onModifyAction?: (content: string) => void;
  editDisabled?: boolean;
};

const mdComponents = {
  img: (props: React.ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element -- pasted images are arbitrary data URLs, not build-time assets
    <img {...props} className={styles.mdImage} alt={props.alt ?? ''} />
  ),
};

// react-markdown's default urlTransform strips `data:` URIs (only allows http(s)/mailto/xmpp/irc).
// Pasted images rely on `data:image/...` src, so allow that prefix through and sanitize everything else as usual.
function mdUrlTransform(url: string) {
  return url.startsWith('data:image/') ? url : defaultUrlTransform(url);
}

export default function Message({ message, onRetryAction, onModifyAction, editDisabled }: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (message.role === 'user') {
    if (isEditing) {
      return (
        <div className={styles.userWrapper}>
          <div className={styles.editWrapper}>
            <MessageInput
              initialValue={message.content}
              autoFocus
              onCancelAction={() => setIsEditing(false)}
              onSendAction={content => {
                setIsEditing(false);
                if (content !== message.content) onModifyAction?.(content);
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.userWrapper}>
        <div className={styles.userGroup}>
          {onModifyAction && (
            <button
              className={styles.editButton}
              onClick={() => setIsEditing(true)}
              disabled={editDisabled}
              aria-label="Edit message"
            >
              <Pencil size={14} strokeWidth={1.5} />
            </button>
          )}
          <div className={styles.bubble}>
            <ReactMarkdown components={mdComponents} urlTransform={mdUrlTransform}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  if (message.status === 'failed') {
    return (
      <div className={styles.assistantWrapper}>
        {message.content && (
          <ReactMarkdown components={mdComponents} urlTransform={mdUrlTransform}>
            {message.content}
          </ReactMarkdown>
        )}
        <div className={styles.errorRow}>
          <span>Something went wrong generating this response.</span>
          <button className={styles.retryButton} onClick={onRetryAction}>
            <RotateCw size={14} strokeWidth={1.5} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.assistantWrapper}>
      <ReactMarkdown components={mdComponents} urlTransform={mdUrlTransform}>
        {message.content}
      </ReactMarkdown>
      {message.status === 'pending' && <span className={styles.cursor} />}
    </div>
  );
}

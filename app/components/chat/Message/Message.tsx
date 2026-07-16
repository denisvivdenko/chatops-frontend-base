'use client';

import { memo, useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import { FileText, Pencil, RotateCw } from 'lucide-react';
import type { Message } from '../../../types/chat';
import MessageInput from '../MessageInput/MessageInput';
import { useChatActions } from '../../../context/chatContext';
import { DOCUMENT_LINK_SCHEME, isDocumentOnlyContent } from '../../../hooks/chat/documentLink';
import styles from './Message.module.css';

type MessageProps = {
  message: Message;
  editDisabled?: boolean;
};

const mdComponents = {
  img: (props: React.ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element -- pasted images are arbitrary data URLs, not build-time assets
    <img {...props} className={styles.mdImage} alt={props.alt ?? ''} />
  ),
  // Document links are `[filename](resource://id)` - render as a non-clickable icon+filename
  // card rather than a link; open/download is out of scope for now.
  a: (props: React.ComponentPropsWithoutRef<'a'>) => {
    if (props.href?.startsWith(DOCUMENT_LINK_SCHEME)) {
      return (
        <span className={styles.documentCard}>
          <FileText size={20} strokeWidth={1.5}/>
          <span className={styles.documentName}>{props.children}</span>
        </span>
      );
    }
    return <a {...props} />;
  },
};

// react-markdown's default urlTransform strips `data:` URIs (only allows http(s)/mailto/xmpp/irc)
// and unrecognized schemes generally. Pasted images rely on `data:image/...` src and document
// links on the `resource://` scheme, so allow both through and sanitize everything else as usual.
function mdUrlTransform(url: string) {
  if (url.startsWith('data:image/') || url.startsWith(DOCUMENT_LINK_SCHEME)) return url;
  return defaultUrlTransform(url);
}

// Parsing markdown is the expensive part of rendering a message — pasted images live in
// `content` as multi-MB base64 data URLs. Memoizing on `content` keeps a Message re-render
// triggered by something else (e.g. `editDisabled` flipping when a reply starts streaming)
// from re-parsing unchanged bodies. That synchronous re-parse of every image message is what
// used to freeze the app for a moment on send in image-heavy chats.
const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown components={mdComponents} urlTransform={mdUrlTransform}>
      {content}
    </ReactMarkdown>
  );
});

function Message({ message, editDisabled }: MessageProps) {
  const { retryMessage, modifyMessage } = useChatActions();
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
                if (content !== message.content) modifyMessage?.(message.id, content);
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.userWrapper}>
        <div className={styles.userGroup}>
          {modifyMessage && !isDocumentOnlyContent(message.content) && (
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
            <MarkdownContent content={message.content} />
          </div>
        </div>
      </div>
    );
  }

  if (message.status === 'failed') {
    return (
      <div className={styles.assistantWrapper}>
        {message.content && <MarkdownContent content={message.content} />}
        <div className={styles.errorRow}>
          <span>Something went wrong generating this response.</span>
          <button className={styles.retryButton} onClick={() => retryMessage?.(message.id)}>
            <RotateCw size={14} strokeWidth={1.5} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.assistantWrapper}>
      <MarkdownContent content={message.content} />
      {message.status === 'pending' && <span className={styles.cursor} />}
    </div>
  );
}

export default memo(Message);

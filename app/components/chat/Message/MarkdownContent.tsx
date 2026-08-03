import { memo } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import { FileText } from 'lucide-react';
import { DOCUMENT_LINK_SCHEME } from '../../../utils/documentLink';
import styles from './MarkdownContent.module.css';

const mdComponents = {
  img: (props: React.ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element -- pasted images are arbitrary data URLs, not build-time assets
    <img {...props} className={styles.mdImage} alt={props.alt ?? ''} />
  ),
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

function mdUrlTransform(url: string) {
  if (url.startsWith('data:image/') || url.startsWith(DOCUMENT_LINK_SCHEME)) return url;
  return defaultUrlTransform(url);
}

type MarkdownContentProps = { content: string };

function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown components={mdComponents} urlTransform={mdUrlTransform}>
      {content}
    </ReactMarkdown>
  );
}

export default memo(MarkdownContent);

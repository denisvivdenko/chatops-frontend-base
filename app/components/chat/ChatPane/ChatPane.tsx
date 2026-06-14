'use client';

import { useState } from 'react';
import ChatHeader from '../ChatHeader/ChatHeader';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import styles from './ChatPane.module.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  onMenuOpenAction: () => void;
};

export default function ChatPane({ onMenuOpenAction }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', content: 'Can you give me a quick overview of React hooks?' },
    {
      role: 'assistant',
      content: `## React Hooks Overview

Hooks let you use state and other React features in **function components**.

### Most commonly used hooks

- \`useState\` — local component state
- \`useEffect\` — side effects (data fetching, subscriptions)
- \`useRef\` — mutable ref that doesn't trigger re-renders
- \`useContext\` — consume a React context

### Example

\`\`\`ts
const [count, setCount] = useState(0);

useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

> Hooks must be called at the top level — never inside loops, conditions, or nested functions.`,
    },
  ]);

  const handleSend = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: 'This is a placeholder response.' },
    ]);
  };

  return (
    <div className={styles.pane}>
      <div className={styles.headerBar}>
        <ChatHeader onMenuOpenAction={onMenuOpenAction} />
      </div>
      <MessageList messages={messages} />
      <div className={styles.inputBar}>
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}

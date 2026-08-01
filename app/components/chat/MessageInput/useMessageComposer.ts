import { useEffect, useRef, useState } from 'react';
import { Attachment, buildMessageContent } from './attachments';

type UseMessageComposerOptions = {
  initialValue?: string;
  autoFocus?: boolean;
};

export function useMessageComposer({ initialValue = '', autoFocus }: UseMessageComposerOptions) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextarea();
    const el = textareaRef.current;
    if (autoFocus && el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // Only meant to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    resizeTextarea();
  };

  /** Builds the outgoing content and resets the composer text; returns null if there's nothing to send. */
  const send = (attachments: Attachment[]) => {
    const content = buildMessageContent(value, attachments);
    if (content === null) return null;

    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    return content;
  };

  return {
    value,
    textareaRef,
    handleChange,
    send,
  };
}

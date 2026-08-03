'use client';

import { memo } from 'react';
import type { Message } from '../../../types/chat';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';

type MessageProps = {
  message: Message;
  editDisabled?: boolean;
};

function Message({ message, editDisabled }: MessageProps) {
  return message.role === 'user' ? (
    <UserMessage message={message} editDisabled={editDisabled} />
  ) : (
    <AssistantMessage message={message} />
  );
}

export default memo(Message);

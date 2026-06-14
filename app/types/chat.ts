export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'complete' | 'failed';
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  lastActivityAt: number;
  createdAt: number;
}

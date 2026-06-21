export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'complete' | 'failed';
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  lastActivityAt: number;
  createdAt: number;
}

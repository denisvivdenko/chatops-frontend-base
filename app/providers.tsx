'use client';

import { ErrorProvider } from './context/ErrorContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ActiveChatProvider } from './context/ActiveChatContext';
import { ResourcesProvider } from './context/ResourcesContext';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <AuthProvider>
          <ChatProvider>
            <ActiveChatProvider>
              <ResourcesProvider>
                {children}
              </ResourcesProvider>
            </ActiveChatProvider>
          </ChatProvider>
        </AuthProvider>
      </ErrorProvider>
    </QueryClientProvider>
  );
}
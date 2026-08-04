'use client';

import { ErrorProvider } from './context/ErrorContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ActiveChatProvider } from './context/ActiveChatContext';
import { ResourcesProvider } from './context/ResourcesContext';
import { DocumentsModalProvider } from './context/DocumentsModalContext';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


export function Providers({ children, backendUrl }: { children: React.ReactNode; backendUrl: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <AuthProvider backendUrl={backendUrl}>
          <ChatProvider>
            <ActiveChatProvider>
              <ResourcesProvider>
                <DocumentsModalProvider>
                  {children}
                </DocumentsModalProvider>
              </ResourcesProvider>
            </ActiveChatProvider>
          </ChatProvider>
        </AuthProvider>
      </ErrorProvider>
    </QueryClientProvider>
  );
}
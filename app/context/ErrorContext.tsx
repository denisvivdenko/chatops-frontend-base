'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ErrorContextValue {
  errorMessage: string;
  reportError: (message: string, details?: string) => void;
  dismissError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errorMessage, setError] = useState<string>('');

  const reportError = useCallback((message: string) => {
    setError(message);
  }, []);

  const dismissError = useCallback(() => {
    setError('');
  }, []);

  return (
    <ErrorContext.Provider value={{ errorMessage, reportError, dismissError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorReporter() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useErrorReporter must be used within ErrorProvider');
  return ctx;
}

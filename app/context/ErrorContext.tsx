'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface ErrorContextValue {
  errorMessage: string;
  reportError: (message: string, details?: string) => void;
  dismissError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errorMessage, setError] = useState<string>('');
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setError('');
    }
  }, [pathname]);

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

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { createAuthApi, type AuthApi, type AuthRequest } from '../services/authService';

const TOKEN_STORAGE_KEY = 'auth_token';
// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;
const BASE_URL = "http://localhost:8000/api"

interface AuthContextValue {
  request: AuthRequest;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AuthRequest | null>(null);
  const authApiRef = useRef<AuthApi | null>(null);
  const initRef = useRef(false); // guard against double-run in React Strict Mode

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initToken =
      typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

    const onTokenUpdate = (token: string) => {
      if (typeof window === 'undefined') return;
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    };

    const onRefreshTokenError = () => {
      authApiRef.current?.loginAsAnonymousUser();
    };

    createAuthApi(BASE_URL, initToken, onTokenUpdate, onRefreshTokenError).then(
      async (api: AuthApi) => {
        authApiRef.current = api;

        if (!initToken) {
          await api.loginAsAnonymousUser();
        }

        setRequest(() => api.request);
      }
    );
  }, []);

  if (!request) {
    return null; // swap for a real loading/fallback UI
  }

  const logout = async () => {
    await authApiRef.current?.logout();
    await authApiRef.current?.loginAsAnonymousUser();
  };

  return (
    <AuthContext.Provider value={{ request, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
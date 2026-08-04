'use client';

import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBackendApi } from '../services/backendService';

export function useBackendApi() {
  const { request } = useAuth();
  return useMemo(() => createBackendApi(request), [request]);
}
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler, tokenStorage } from '../api/client';
import type { AuthResponse, User } from '../api/types';

interface RegisterData {
  name: string;
  email: string;
  phone: string | null;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  /** true, пока проверяем сохранённый токен при загрузке страницы. */
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(data: RegisterData): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStorage.get());

  const applySession = useCallback(
    (res: AuthResponse | null) => {
      tokenStorage.set(res?.token ?? null);
      setUser(res?.user ?? null);
      // Флаги «вы участник / организатор» в ответах зависят от пользователя.
      qc.invalidateQueries();
    },
    [qc],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => applySession(null));
    if (tokenStorage.get()) {
      api<User>('GET', '/auth/me')
        .then(setUser)
        .catch(() => tokenStorage.set(null))
        .finally(() => setLoading(false));
    }
    return () => setUnauthorizedHandler(null);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => applySession(await api<AuthResponse>('POST', '/auth/login', { email, password })),
      register: async (data) => applySession(await api<AuthResponse>('POST', '/auth/register', data)),
      logout: () => applySession(null),
    }),
    [user, loading, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}

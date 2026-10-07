import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, refreshSession, setAccessToken } from '../api/client';

export interface SessionUser {
  id: string;
  externalId: string;
  name: string;
  username: string;
  role: string;
}

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: SessionUser };

interface AuthContextValue {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => {
        if (!active) return;
        setState(
          session
            ? { status: 'authenticated', user: session.user as SessionUser }
            : { status: 'anonymous', user: null },
        );
      })
      .catch(() => active && setState({ status: 'anonymous', user: null }));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const body = await apiFetch<{ accessToken: string; user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAccessToken(body.accessToken);
    setState({ status: 'authenticated', user: body.user });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

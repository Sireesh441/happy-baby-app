import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchMe, loginRequest, signupRequest, type AuthUser } from '@/lib/auth-api';
import { deleteStoredToken, getStoredToken, setStoredToken } from '@/lib/token-storage';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start: if a token was persisted from a previous session, verify it's
  // still valid via /me (also picks up any name/email changes) before trusting it.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storedToken = await getStoredToken();
      if (!storedToken) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const me = await fetchMe(storedToken).catch(() => null);
      if (cancelled) return;

      if (me) {
        setToken(storedToken);
        setUser(me);
      } else {
        await deleteStoredToken();
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const { token: newToken, user: newUser } = await loginRequest(email, password);
    await setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function signup(name: string, email: string, password: string) {
    const { token: newToken, user: newUser } = await signupRequest(name, email, password);
    await setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function logout() {
    await deleteStoredToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { setUnauthorizedHandler } from '@/api/client';
import {
  AuthUser,
  getMe,
  loginRequest,
  logoutRequest,
  registerRequest,
  RegisterInput,
} from '@/api/auth';
import { getToken } from '@/api/tokenStore';

type Status = 'loading' | 'authed' | 'guest';

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  signIn: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const mounted = useRef(true);

  const signOut = useCallback(async () => {
    await logoutRequest();
    if (!mounted.current) return;
    setUser(null);
    setStatus('guest');
  }, []);

  // Bootstrap: if a token exists, validate it by loading the profile.
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (mounted.current) setStatus('guest');
        return;
      }
      try {
        const me = await getMe();
        if (!mounted.current) return;
        setUser(me);
        setStatus('authed');
      } catch {
        await logoutRequest();
        if (mounted.current) setStatus('guest');
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  // On any 401, the API client clears the token; reflect that as signed-out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('guest');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string, rememberMe: boolean) => {
      await loginRequest({ identifier, password, remember_me: rememberMe });
      const me = await getMe();
      setUser(me);
      setStatus('authed');
    },
    [],
  );

  const register = useCallback(async (input: RegisterInput) => {
    await registerRequest(input);
    // Backend returns no token on register — the user logs in afterward.
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, register, signOut }),
    [status, user, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

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
import { queryClient } from '@/api/queryClient';
import { getToken } from '@/api/tokenStore';

type Status = 'loading' | 'authed' | 'guest';

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  signIn: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetches `/users/me` — call after a write that changes something on
      the user object itself (e.g. setting the security question), since
      `user` is plain state here, not a query cache invalidation can refresh. */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Bootstrap retries before we stop waiting on an unreachable backend. */
const BOOTSTRAP_ATTEMPTS = 3;
const BOOTSTRAP_BACKOFF_MS = 1500;

/**
 * Only a 401 proves the token is bad. Everything else — timeout, offline, 5xx —
 * says nothing about the session's validity.
 */
function isUnauthorized(e: unknown): boolean {
  return (e as { response?: { status?: number } })?.response?.status === 401;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const mounted = useRef(true);

  const signOut = useCallback(async () => {
    await logoutRequest();
    // The QueryClient is a module singleton, so it outlives the session. Without
    // this, the next user to sign in inherits the previous user's cached
    // accounts, transactions, dashboard and budgets — `['accounts']` in
    // particular has a 10-minute staleTime, so it isn't even refetched.
    queryClient.clear();
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
      // Retry transient failures before giving up. A Render free-tier cold start
      // takes the better part of a minute, and the first request after the app
      // has been idle is exactly when it happens.
      for (let attempt = 0; attempt < BOOTSTRAP_ATTEMPTS; attempt++) {
        try {
          const me = await getMe();
          if (!mounted.current) return;
          setUser(me);
          setStatus('authed');
          return;
        } catch (e) {
          if (isUnauthorized(e)) {
            // The token really is invalid — sign out for real.
            await logoutRequest();
            if (mounted.current) setStatus('guest');
            return;
          }
          if (!mounted.current) return;
          if (attempt < BOOTSTRAP_ATTEMPTS - 1) await delay(BOOTSTRAP_BACKOFF_MS * (attempt + 1));
        }
      }

      // Backend unreachable, token left intact. Load the shell rather than
      // signing out a valid session because the server was slow to wake —
      // every screen has its own error/retry state, and a genuine 401 on any
      // later request still ejects through the interceptor above.
      if (mounted.current) setStatus('authed');
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  // On any 401, the API client clears the token; reflect that as signed-out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // An expired session ends the same way a sign-out does — drop the cache so
      // whoever signs in next starts from the server, not this user's data.
      queryClient.clear();
      setUser(null);
      setStatus('guest');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string, rememberMe: boolean) => {
      await loginRequest({ identifier, password, remember_me: rememberMe });
      // Belt and braces: every route into an authenticated session starts from
      // an empty cache, even ones that bypassed signOut (an expired token, or a
      // crash that left entries behind).
      queryClient.clear();
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

  const refreshUser = useCallback(async () => {
    const me = await getMe();
    if (mounted.current) setUser(me);
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, register, signOut, refreshUser }),
    [status, user, signIn, register, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

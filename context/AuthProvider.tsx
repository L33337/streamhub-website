'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export function AuthProvider({ children }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Hydrates the user after mount and syncs with the auth event stream
  // (other tabs, token refresh). supabase-js emits INITIAL_SESSION with the
  // cookie-stored session on subscribe — a local read, no network — so no
  // server-side user is needed (keeping the root layout static / ISR-able).
  // This is a "subscribe to external system" pattern — the documented
  // legitimate use of useEffect. The lint rule allows setState inside a
  // subscription callback (it only flags synchronous setState in the body).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/auth/sign-out', { method: 'POST' });
    } finally {
      setLoading(false);
      // Hard navigation for a clean client boot — the fresh AuthProvider
      // resolves to a null user from the (now cleared) session cookie.
      window.location.assign('/');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

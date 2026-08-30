'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, hasSupabaseAuthCookie } from '@/lib/supabase/client';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Hydrates the user after mount and syncs with the auth event stream
  // (other tabs, token refresh). supabase-js emits INITIAL_SESSION with the
  // cookie-stored session on subscribe — a local read, no network — so no
  // server-side user is needed (keeping the root layout static / ISR-able).
  //
  // Lazy (2026-08-29): supabase-js is only loaded once an auth cookie is
  // visible. Anonymous visitors — the bulk of the traffic — never download it
  // and never subscribe; they simply stay `user = null`, which is what the
  // cookie-less INITIAL_SESSION would have produced anyway. The effect re-runs
  // on route changes so a sign-in that ends in a soft navigation is picked up
  // too (today every sign-in/sign-out ends in a hard navigation, which remounts
  // this provider — the re-check is insurance, and idempotent).
  //
  // This is a "subscribe to external system" pattern — the documented
  // legitimate use of useEffect. The lint rule allows setState inside a
  // subscription callback (it only flags synchronous setState in the body).
  useEffect(() => {
    if (!hasSupabaseAuthCookie()) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void getSupabaseBrowserClient()
      .then((supabase) => {
        if (cancelled) return;
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
          setUser(session?.user ?? null);
        });
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch((err) => {
        console.error('[auth] loading the Supabase client failed:', err);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [pathname]);

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

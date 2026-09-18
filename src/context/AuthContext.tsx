import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminRow } from '@/lib/database.types';

/**
 * Supabase Auth session + admin-role resolution.
 *
 * Being signed in is not the same as being an admin: `isAdmin` is true only
 * when the user also has a row in `public.admins`. The UI uses this to decide
 * what to show; the database enforces the same rule independently through RLS,
 * so a tampered client gains nothing.
 */

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  admin: AdminRow | null;
  isAdmin: boolean;
  /** True until the initial session + role check has settled. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<AdminRow | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Guards against a slow role lookup resolving after a newer one.
  const lookupToken = useRef(0);

  const resolveAdmin = useCallback(async (next: Session | null) => {
    const token = ++lookupToken.current;

    if (!next?.user) {
      if (token === lookupToken.current) setAdmin(null);
      return;
    }

    // RLS restricts this to the caller's own row, so an ordinary signed-in
    // user simply gets nothing back.
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', next.user.id)
      .maybeSingle();

    if (token !== lookupToken.current) return;
    setAdmin(error ? null : ((data ?? null) as AdminRow | null));
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      await resolveAdmin(data.session);
      if (active) setInitializing(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void resolveAdmin(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveAdmin]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      admin,
      isAdmin: admin !== null,
      initializing,
      signIn,
      signOut
    }),
    [session, admin, initializing, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}

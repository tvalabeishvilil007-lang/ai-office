import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// AuthContext — session / user state + access control
//
// Access control flow:
//   1. User signs in with Google
//   2. We query allowed_users table for their email
//   3. If found + is_active → isAllowed = true → let them in
//   4. If not found / inactive → auto sign-out + show "access denied"
//
// isAdmin = true only for ADMIN_EMAIL (app owner)
//   → can access /admin panel and manage allowed_users
// ─────────────────────────────────────────────────────────────────────────────

// ── Change this to your email ─────────────────────────────────────────────────
export const ADMIN_EMAIL = 'tvalabeishvilil007@gmail.com';

interface AuthContextValue {
  session:   Session | null;
  user:      User    | null;
  loading:   boolean;
  isAllowed: boolean;         // email is in allowed_users and is_active
  isAdmin:   boolean;         // is the app owner
  accessDenied: boolean;      // signed in but not on the whitelist
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,      setSession]      = useState<Session | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [isAllowed,    setIsAllowed]    = useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // ── Initial session load + auth state listener ─────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) {
        setIsAllowed(false);
        setIsAdmin(false);
        setAccessDenied(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Access check whenever session / email changes ──────────────────────────
  useEffect(() => {
    const email = session?.user?.email;

    if (!email) {
      setLoading(false);
      return;
    }

    const admin = email === ADMIN_EMAIL;
    setIsAdmin(admin);

    if (admin) {
      // Owner is always allowed — no DB check needed
      setIsAllowed(true);
      setAccessDenied(false);
      setLoading(false);
      return;
    }

    // Check whitelist for regular users
    db
      .from('allowed_users')
      .select('is_active')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }: { data: { is_active: boolean } | null }) => {
        const allowed = data?.is_active === true;
        setIsAllowed(allowed);
        setAccessDenied(!allowed);
        setLoading(false);

        if (!allowed) {
          // Kick them out automatically
          supabase.auth.signOut();
        }
      });
  }, [session?.user?.email]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      isAllowed,
      isAdmin,
      accessDenied,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

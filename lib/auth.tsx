import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Redirect, useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { parseSupabaseAuthFragment } from '@/lib/auth-deep-link';

import { supabase } from './supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True during password recovery until updateUser completes or user signs out. */
  passwordRecoveryPending: boolean;
  endPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);

  async function ensureProfile(userId: string) {
    // Supabase-js v2: use `upsert` to avoid duplicate key errors.
    const { error } = await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to ensure profile', error.message);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function applyAuthTokensFromUrl(url: string | null) {
      if (!url) return;
      const { access_token, refresh_token, type } = parseSupabaseAuthFragment(url);
      if (!access_token || !refresh_token) return;
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.warn('setSession from auth URL failed', error.message);
        return;
      }
      if (type === 'recovery') {
        setPasswordRecoveryPending(true);
      }
    }

    async function init() {
      try {
        const initialUrl = await Linking.getInitialURL();
        await applyAuthTokensFromUrl(initialUrl);
      } catch (e) {
        console.warn('Initial URL handling failed', e);
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);

      if (data.session?.user) {
        const userId = data.session.user.id;
        await ensureProfile(userId);
      }

      setLoading(false);
    }

    init();

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      applyAuthTokensFromUrl(url);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
      }
      if (event === 'USER_UPDATED') {
        setPasswordRecoveryPending(false);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecoveryPending(false);
      }

      setSession(newSession);

      if (newSession?.user) {
        const userId = newSession.user.id;
        await ensureProfile(userId);
      }
    });

    return () => {
      isMounted = false;
      linkSub.remove();
      subscription.unsubscribe();
    };
  }, []);

  const endPasswordRecovery = useCallback(() => setPasswordRecoveryPending(false), []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        passwordRecoveryPending,
        endPasswordRecovery,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, passwordRecoveryPending } = useAuth();
  const segments = useSegments();

  if (loading) {
    return null;
  }

  if (session) {
    if (segments.includes('reset-password')) {
      return <>{children}</>;
    }
    if (passwordRecoveryPending) {
      return <Redirect href="/reset-password" />;
    }
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return <>{children}</>;
}


import { Session, User } from '@supabase/supabase-js';
import { Redirect } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from './supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function ensureProfile(userId: string) {
    // Supabase-js v2: use `upsert` to avoid duplicate key errors.
    const { error } = await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to ensure profile', error.message);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);

      // Ensure a corresponding profile row exists for the current user.
      if (data.session?.user) {
        const userId = data.session.user.id;
        await ensureProfile(userId);
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        const userId = newSession.user.id;
        await ensureProfile(userId);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
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
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (session) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return <>{children}</>;
}


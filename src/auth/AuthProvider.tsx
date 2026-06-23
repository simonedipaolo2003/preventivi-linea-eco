// ============================================================================
// AuthProvider — sessione utente condivisa in tutta l'app.
// Espone la sessione Supabase, il profilo (con ruolo) e le azioni di
// login/logout. Idratazione iniziale + ascolto dei cambi di stato auth.
// ============================================================================
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/data/supabase/client';
import type { ProfileRow } from '@/data/supabase/types';
import * as profilesRepo from '@/data/repositories/profilesRepo';

interface AuthState {
  /** Sessione Supabase (null = non autenticato). */
  session: Session | null;
  /** Profilo applicativo con ruolo (null finché non caricato). */
  profile: ProfileRow | null;
  /** True durante l'idratazione iniziale. */
  loading: boolean;
  /** True se il backend è configurato (.env presente). */
  configured: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Idratazione + sottoscrizione ai cambi di stato auth.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Carica il profilo quando cambia la sessione.
  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setProfile(null);
      return;
    }
    profilesRepo
      .me()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      isAdmin: profile?.role === 'admin',
      async signIn(email, password) {
        if (!supabase) throw new Error('Backend non configurato');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, displayName) {
        if (!supabase) throw new Error('Backend non configurato');
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}

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
import { emailForUsername, SHARED_PASSWORD } from './identity';

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
  /** Accesso col solo username (email/password derivate dietro le quinte). */
  signIn: (username: string) => Promise<void>;
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
      async signIn(username) {
        if (!supabase) throw new Error('Backend non configurato');
        const name = username.trim();
        if (!name) throw new Error('Inserisci il tuo nome.');
        const email = emailForUsername(name);

        // Primo tentativo: accesso con l'identità derivata.
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: SHARED_PASSWORD,
        });
        if (!error) return;

        // Se l'account non esiste ancora, lo creiamo al volo (display_name =
        // nome digitato) e riproviamo l'accesso. Così i PC si registrano da soli.
        if (/invalid login credentials/i.test(error.message)) {
          const { error: upErr } = await supabase.auth.signUp({
            email,
            password: SHARED_PASSWORD,
            options: { data: { display_name: name } },
          });
          if (upErr) throw upErr;
          const { error: retryErr } = await supabase.auth.signInWithPassword({
            email,
            password: SHARED_PASSWORD,
          });
          if (retryErr) throw retryErr;
          return;
        }
        throw error;
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

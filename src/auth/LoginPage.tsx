// ============================================================================
// LoginPage — accesso al gestionale preventivi col solo username.
// Nessuna password: email/password sono derivate dietro le quinte (vedi
// identity.ts). Al primo accesso l'account viene creato in automatico.
// Già autenticato → redirect alla home.
// ============================================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { session, loading, configured, signIn } = useAuth();
  const location = useLocation() as { state?: { from?: string } };

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && !loading) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(username);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-chalk px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-serif text-2xl text-ink">Preventivi</span>
            <span className="text-2xs uppercase tracking-label text-ink-faint">Linea Eco</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl2 border border-line bg-paper p-7 shadow-soft"
        >
          <div>
            <label className="field-label">Nome</label>
            <input
              required
              autoFocus
              className="field-input-boxed"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !configured}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
            )}
            Accedi
          </button>

          {!configured && (
            <p className="text-center text-2xs text-ink-faint">
              Backend non configurato (.env mancante)
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}

function messageFor(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/email not confirmed/i.test(raw)) {
    return 'Conferma email attiva su Supabase: disattivala per l’accesso solo-username.';
  }
  if (/invalid login credentials/i.test(raw)) return 'Accesso non riuscito. Riprova.';
  return raw;
}

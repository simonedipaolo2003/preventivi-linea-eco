// ============================================================================
// LoginPage — accesso al gestionale preventivi.
// Login con email/password; opzione di registrazione (il trigger DB crea il
// profilo 'operatore'). Già autenticato → redirect alla home.
// ============================================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

type Mode = 'login' | 'signup';

export function LoginPage() {
  const { session, loading, configured, signIn, signUp } = useAuth();
  const location = useLocation() as { state?: { from?: string } };

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && !loading) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim());
        setInfo('Registrazione completata. Se richiesto, conferma la mail e poi accedi.');
        setMode('login');
      }
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
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'login' ? 'Accedi al gestionale' : 'Crea un nuovo accesso'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl2 border border-line bg-paper p-7 shadow-soft"
        >
          {mode === 'signup' && (
            <div>
              <label className="field-label">Nome visualizzato</label>
              <input
                className="field-input-boxed"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Mario Rossi"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              required
              className="field-input-boxed"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              required
              className="field-input-boxed"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{info}</p>
          )}

          <button
            type="submit"
            disabled={busy || !configured}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
            )}
            {mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>

          {!configured && (
            <p className="text-center text-2xs text-ink-faint">
              Backend non configurato (.env mancante)
            </p>
          )}
        </form>

        <div className="mt-5 text-center text-xs text-ink-muted">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfo(null);
              }}
              className="transition-colors hover:text-accent"
            >
              Non hai un accesso? Registrati
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setInfo(null);
              }}
              className="transition-colors hover:text-accent"
            >
              Hai già un accesso? Accedi
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function messageFor(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(raw)) return 'Email o password non corretti.';
  if (/email not confirmed/i.test(raw)) return 'Email non ancora confermata.';
  if (/already registered/i.test(raw)) return 'Questa email è già registrata.';
  if (/password.*6/i.test(raw)) return 'La password deve avere almeno 6 caratteri.';
  return raw;
}

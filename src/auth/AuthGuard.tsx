// ============================================================================
// AuthGuard — protegge le route che richiedono autenticazione.
// Redirige a /login se non loggato; mostra uno stato di caricamento durante
// l'idratazione della sessione.
// ============================================================================
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();
  const location = useLocation();

  if (!configured) {
    return <ConfigNotice />;
  }

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-faint">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="text-xs uppercase tracking-label">Caricamento…</span>
      </div>
    </div>
  );
}

function ConfigNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-xl2 border border-line bg-paper p-8 text-center shadow-soft">
        <h1 className="font-serif text-xl text-ink">Backend non configurato</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Imposta <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> e{' '}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
          nel file <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">.env</code>, poi
          riavvia il server di sviluppo.
        </p>
      </div>
    </div>
  );
}

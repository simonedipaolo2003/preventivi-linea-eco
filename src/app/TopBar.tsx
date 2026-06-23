// ============================================================================
// TopBar — barra superiore condivisa: brand, navigazione, utente + logout.
// Accetta uno slot `actions` per i controlli specifici della pagina.
// ============================================================================
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

export function TopBar({ actions }: { actions?: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-chalk/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5 lg:px-10">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="font-serif text-lg text-ink">Preventivi</span>
            <span className="text-2xs uppercase tracking-label text-ink-faint">Linea Eco</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-ink-muted md:flex">
            <Link to="/archivio" className="transition-colors hover:text-ink">
              Archivio
            </Link>
            <Link to="/preventivo/nuovo" className="transition-colors hover:text-ink">
              Nuovo
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {actions}
          <div className="flex items-center gap-2 border-l border-line pl-3">
            <span className="hidden text-xs text-ink-muted sm:inline">
              {profile?.display_name || 'Utente'}
              {profile?.role === 'admin' && (
                <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-2xs uppercase tracking-label text-accent">
                  admin
                </span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-stone-300 hover:text-ink"
            >
              Esci
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

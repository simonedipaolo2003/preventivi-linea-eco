// ============================================================================
// App — shell di routing + provider (errori, notifiche, autenticazione).
// /login            → accesso (pubblica)
// /archivio (e /)   → elenco condiviso dei preventivi (protetta)
// /preventivo/nuovo → nuovo preventivo (protetta)
// /preventivo/:id   → editing di un preventivo esistente (protetta)
// ============================================================================
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { AuthGuard } from '@/auth/AuthGuard';
import { LoginPage } from '@/auth/LoginPage';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastProvider } from '@/components/Toast';

// Pagine protette caricate on-demand: restano fuori dal bundle iniziale
// (quello servito al login), che così resta leggero.
const ArchivioPage = lazy(() =>
  import('@/pages/ArchivioPage').then((m) => ({ default: m.ArchivioPage })),
);
const EditorPage = lazy(() =>
  import('@/pages/EditorPage').then((m) => ({ default: m.EditorPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <ArchivioPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/archivio"
                  element={
                    <AuthGuard>
                      <ArchivioPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/preventivo/nuovo"
                  element={
                    <AuthGuard>
                      <EditorPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/preventivo/:id"
                  element={
                    <AuthGuard>
                      <EditorPage />
                    </AuthGuard>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

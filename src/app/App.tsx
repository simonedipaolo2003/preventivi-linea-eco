// ============================================================================
// App — shell di routing + provider (errori, notifiche, autenticazione).
// /login            → accesso (pubblica)
// /archivio (e /)   → elenco condiviso dei preventivi (protetta)
// /preventivo/nuovo → nuovo preventivo (protetta)
// /preventivo/:id   → editing di un preventivo esistente (protetta)
// ============================================================================
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { AuthGuard } from '@/auth/AuthGuard';
import { LoginPage } from '@/auth/LoginPage';
import { ArchivioPage } from '@/pages/ArchivioPage';
import { EditorPage } from '@/pages/EditorPage';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastProvider } from '@/components/Toast';

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
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
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

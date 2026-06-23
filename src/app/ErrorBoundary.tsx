// ============================================================================
// ErrorBoundary — evita lo schermo bianco se un componente lancia in render.
// Mostra un messaggio sobrio con possibilità di ricaricare l'app.
// ============================================================================
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In produzione qui si potrebbe inoltrare l'errore a un servizio di logging.
    console.error('UI error boundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-xl2 border border-line bg-paper p-8 text-center shadow-soft">
          <h1 className="font-serif text-xl text-ink">Si è verificato un errore</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Qualcosa è andato storto nell’interfaccia. Ricarica la pagina per continuare; i dati
            salvati sul server non sono stati persi.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Ricarica
          </button>
        </div>
      </div>
    );
  }
}

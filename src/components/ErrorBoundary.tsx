import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-200/80 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-navy-950 mb-2">Something went wrong</h2>
            <p className="text-xs sm:text-sm text-navy-500 mb-6 leading-relaxed">
              HealthPilot encountered an unexpected error on this device. You can reload the page or return to the homepage.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('healthpilot_last_user_id');
                  } catch {
                    // ignore
                  }
                  window.location.href = '/';
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-navy-700 text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

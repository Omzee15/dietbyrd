import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 text-center">Something went wrong</h2>
              <p className="text-slate-500 text-center text-sm mt-2">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-navy text-white px-4 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                style={{ backgroundColor: "var(--navy, #0B1528)" }}
              >
                <RefreshCcw size={18} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                <Home size={18} />
                Go to Homepage
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-slate-900 text-slate-300 p-4 text-xs overflow-auto max-h-48 border-t border-slate-800">
                <pre>{this.state.error.toString()}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

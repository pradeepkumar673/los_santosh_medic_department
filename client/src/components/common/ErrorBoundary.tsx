import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Why: surfaced to the console so it's visible in dev tools / log capture,
    // without depending on an external error-reporting service.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-900">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h1>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {this.state.message || "An unexpected error occurred while rendering this page."}
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

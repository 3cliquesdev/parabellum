import React from "react";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
          <h1 className="text-2xl font-bold mb-4">Algo deu errado 😢</h1>
          <p className="mb-2 text-muted-foreground">
            Por favor, recarregue a página para tentar novamente.
          </p>
          {this.state.error && (
            <p className="mb-6 text-sm text-destructive max-w-md text-center">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;

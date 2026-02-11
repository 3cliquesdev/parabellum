import React from "react";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  copied: boolean;
}

const CHUNK_RETRY_KEY = "app_chunk_error_retry";

function isChunkError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("dynamically imported module") ||
    msg.includes("Failed to fetch") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed:", error, errorInfo);

    // Auto-reload UMA vez para erros de chunk/import dinâmico
    if (isChunkError(error) && !sessionStorage.getItem(CHUNK_RETRY_KEY)) {
      sessionStorage.setItem(CHUNK_RETRY_KEY, "1");
      window.location.reload();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardRefresh = async () => {
    try {
      const { hardRefresh } = await import("@/lib/build/ensureLatestBuild");
      await hardRefresh();
    } catch (e) {
      console.error("Erro ao executar hardRefresh:", e);
      window.location.reload();
    }
  };

  handleCopyError = () => {
    const error = this.state.error;
    if (!error) return;
    const text = `${error.name}: ${error.message}\n\n${error.stack || ""}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, copied } = this.state;

      return (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Algo deu errado</h1>
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>

            {/* Botão primário: reload simples */}
            <button
              onClick={this.handleReload}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Recarregar Página
            </button>

            {/* Botão secundário: hard refresh */}
            <button
              onClick={this.handleHardRefresh}
              className="w-full px-6 py-3 border border-input bg-background text-foreground rounded-lg font-medium hover:bg-accent transition-colors text-sm"
            >
              Limpar Cache e Atualizar
            </button>

            {/* Detalhes do erro (visível para todos) */}
            {error && (
              <details className="text-left text-xs text-muted-foreground mt-4">
                <summary className="cursor-pointer hover:text-foreground transition-colors">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded overflow-auto max-h-40 text-destructive">
                  {error.name}: {error.message}
                  {error.stack && (
                    <>
                      {"\n\n"}
                      {error.stack}
                    </>
                  )}
                </pre>
                <button
                  onClick={this.handleCopyError}
                  className="mt-2 px-3 py-1.5 text-xs border border-input rounded-md hover:bg-accent transition-colors"
                >
                  {copied ? "✅ Copiado!" : "📋 Copiar erro"}
                </button>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;

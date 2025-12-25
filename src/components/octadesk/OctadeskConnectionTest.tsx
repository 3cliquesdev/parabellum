import { useTestOctadeskConnection } from '@/hooks/useTestOctadeskConnection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plug, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface OctadeskConnectionTestProps {
  onConnectionSuccess?: () => void;
}

export function OctadeskConnectionTest({ onConnectionSuccess }: OctadeskConnectionTestProps) {
  const { testConnection, isTesting, result, clearResult, isConnected, hasError } = useTestOctadeskConnection();

  const handleTest = async () => {
    await testConnection();
    if (result?.success) {
      onConnectionSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Conexão com Octadesk
        </CardTitle>
        <CardDescription>
          Valide suas credenciais antes de importar conversas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleTest} 
            disabled={isTesting}
            variant={isConnected ? "outline" : "default"}
            className="gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : isConnected ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Testar Novamente
              </>
            ) : (
              <>
                <Plug className="h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>

          {result && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearResult}
              className="text-muted-foreground"
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Success State */}
        {isConnected && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-400">
              Conexão estabelecida!
            </AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-500">
              {result?.message}
              {result?.details?.baseUrl && (
                <span className="block text-xs mt-1 opacity-75">
                  URL: {result.details.baseUrl}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha na conexão</AlertTitle>
            <AlertDescription>
              {result?.error}
              {result?.details && (
                <div className="text-xs mt-2 space-y-1 opacity-75">
                  {result.details.baseUrl && (
                    <span className="block">URL: {result.details.baseUrl}</span>
                  )}
                  {result.details.responseStatus && (
                    <span className="block">Status HTTP: {result.details.responseStatus}</span>
                  )}
                  <span className="block">
                    API Key: {result.details.apiKeyConfigured ? 'Configurada' : 'Não configurada'}
                  </span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Info Text */}
        {!result && !isTesting && (
          <p className="text-sm text-muted-foreground">
            Clique para verificar se as credenciais <code className="bg-muted px-1 rounded">OCTADESK_API_KEY</code> e{' '}
            <code className="bg-muted px-1 rounded">OCTADESK_BASE_URL</code> estão configuradas corretamente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

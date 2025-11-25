import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, SkipForward, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportError {
  row: number;
  error: string;
}

interface KnowledgeImportProgressProps {
  progress: number;
  total: number;
  created: number;
  skipped: number;
  errors: ImportError[];
  isProcessing: boolean;
}

export function KnowledgeImportProgress({
  progress,
  total,
  created,
  skipped,
  errors,
  isProcessing
}: KnowledgeImportProgressProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              📊 Progresso da Importação
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              ✅ Importação Concluída
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isProcessing 
            ? `Processando linha ${progress} de ${total}...`
            : `${total} itens processados com sucesso`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">{created}</p>
              <p className="text-xs text-muted-foreground">Criados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <SkipForward className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">{skipped}</p>
              <p className="text-xs text-muted-foreground">Pulados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">{errors.length}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Detalhes dos Erros:</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {errors.map((error, idx) => (
                <Alert key={idx} variant="destructive">
                  <AlertDescription className="text-xs">
                    Linha {error.row}: {error.error}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportProgressProps {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

export function ImportProgress({ total, processed, created, updated, errors }: ImportProgressProps) {
  const progress = total > 0 ? (processed / total) * 100 : 0;
  const isComplete = processed === total && total > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso da Importação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Processando...</span>
            <span className="font-medium">{processed} / {total}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isComplete && (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{created}</p>
                <p className="text-xs text-muted-foreground">Criados</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{updated}</p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{errors.length}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Erros Encontrados ({errors.length})
            </h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                    <p className="font-medium">Linha {error.row}: {error.email}</p>
                    <p className="text-muted-foreground">{error.error}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

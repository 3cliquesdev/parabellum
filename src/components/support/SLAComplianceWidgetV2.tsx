import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useSLAComplianceV2 } from "@/hooks/v2/useSLAComplianceV2";

export function SLAComplianceWidgetV2() {
  const { data, isLoading, error } = useSLAComplianceV2();

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-center text-destructive">
          Erro ao carregar SLA
        </CardContent>
      </Card>
    );
  }

  const complianceRate = data?.compliance_rate ?? 0;
  const isGood = complianceRate >= 80;
  const isWarning = complianceRate >= 60 && complianceRate < 80;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Compliance de SLA</span>
          {!isLoading && (
            <span className={`text-lg font-bold ${
              isGood ? "text-green-600 dark:text-green-400" :
              isWarning ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            }`}>
              {complianceRate.toFixed(1)}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <Progress 
              value={complianceRate} 
              className={`h-2 ${
                isGood ? "[&>div]:bg-green-500" :
                isWarning ? "[&>div]:bg-amber-500" :
                "[&>div]:bg-red-500"
              }`}
            />

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300">
                  {data?.on_time ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">No prazo</div>
              </div>

              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="text-lg font-bold text-red-700 dark:text-red-300">
                  {data?.overdue ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Atrasados</div>
              </div>

              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {data?.pending ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Total: {data?.total ?? 0} tickets com SLA definido
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

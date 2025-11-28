import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCadenceMetrics } from "@/hooks/useCadenceMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, CheckCircle2, Reply, Target, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function CadencePerformanceWidget() {
  const { data: metrics, isLoading } = useCadenceMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance de Cadências
          </CardTitle>
          <CardDescription>Métricas de conversão e engajamento por cadência</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Target className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma cadência ativa encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance de Cadências
        </CardTitle>
        <CardDescription>Métricas de conversão e engajamento por cadência</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => (
          <div key={metric.cadence_id} className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">{metric.cadence_name}</h4>
              <span className="text-sm text-muted-foreground">
                {metric.total_enrollments} contatos inscritos
              </span>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Reply className="h-3 w-3" />
                  Taxa de Resposta
                </div>
                <div className="text-2xl font-bold text-primary">
                  {metric.reply_rate.toFixed(1)}%
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  Taxa de Conclusão
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {metric.completion_rate.toFixed(1)}%
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Tempo Médio
                </div>
                <div className="text-2xl font-bold">
                  {metric.avg_days_to_complete > 0 
                    ? `${metric.avg_days_to_complete}d` 
                    : '-'}
                </div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Ativos: {metric.active_enrollments}
                </span>
                <span className="text-muted-foreground">
                  {metric.total_enrollments > 0 
                    ? ((metric.active_enrollments / metric.total_enrollments) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={metric.total_enrollments > 0 
                  ? (metric.active_enrollments / metric.total_enrollments) * 100 
                  : 0} 
                className="h-2"
              />
            </div>

            {/* Task Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {metric.completed_tasks} tasks completas
              </span>
              <span className="flex items-center gap-1">
                ⏭️ {metric.skipped_tasks} puladas
              </span>
              <span className="flex items-center gap-1">
                📋 {metric.total_tasks} total
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

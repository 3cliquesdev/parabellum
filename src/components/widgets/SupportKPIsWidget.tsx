import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Timer, Star } from "lucide-react";
import { useSupportMetrics } from "@/hooks/useSupportMetrics";
import { Skeleton } from "@/components/ui/skeleton";

interface SupportKPIsWidgetProps {
  startDate: Date;
  endDate: Date;
}

export function SupportKPIsWidget({ startDate, endDate }: SupportKPIsWidgetProps) {
  const { data: metrics, isLoading } = useSupportMetrics(startDate, endDate);

  const formatTime = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  };

  const getFRTColor = (frt: number) => {
    if (frt <= 5) return "text-green-600 dark:text-green-400";
    if (frt <= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* First Response Time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tempo de 1ª Resposta (FRT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${getFRTColor(metrics?.avgFRT || 0)}`}>
            {formatTime(metrics?.avgFRT || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.avgFRT && metrics.avgFRT <= 5 ? "✅ Excelente" : 
             metrics?.avgFRT && metrics.avgFRT <= 10 ? "⚠️ Bom" : "🔴 Atenção"}
          </p>
        </CardContent>
      </Card>

      {/* Mean Time To Resolution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Tempo Médio de Resolução (MTTR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatTime(metrics?.avgMTTR || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo total até fechar ticket
          </p>
        </CardContent>
      </Card>

      {/* CSAT Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            Satisfação (CSAT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {metrics?.avgCSAT ? metrics.avgCSAT.toFixed(1) : "0.0"}/5.0
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.totalRatings || 0} avaliações
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

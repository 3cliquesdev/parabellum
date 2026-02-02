import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Timer, CheckCircle, AlertCircle } from "lucide-react";
import { useSupportMetricsV2 } from "@/hooks/v2/useSupportMetricsV2";
import { SupportDrilldownDrawer } from "./SupportDrilldownDrawer";
import { cn } from "@/lib/utils";

export function SupportKPIsWidgetV2() {
  const { data, isLoading, error } = useSupportMetricsV2();
  const [drilldownMetric, setDrilldownMetric] = useState<{ metric: string; label: string } | null>(null);

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-center text-destructive">
          Erro ao carregar metricas
        </CardContent>
      </Card>
    );
  }

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "N/A";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const kpis = [
    {
      label: "Tempo Medio 1a Resposta",
      shortLabel: "FRT",
      metric: "frt",
      value: formatMinutes(data?.frt_avg_minutes ?? null),
      count: data?.frt_count ?? 0,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      clickable: true,
    },
    {
      label: "Tempo Medio de Resolucao",
      shortLabel: "MTTR",
      metric: "mttr",
      value: formatMinutes(data?.mttr_avg_minutes ?? null),
      count: data?.mttr_count ?? 0,
      icon: Timer,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      clickable: true,
    },
    {
      label: "Tickets com FRT",
      shortLabel: "Com resposta",
      metric: "frt",
      value: data?.frt_count ?? 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
      clickable: true,
    },
    {
      label: "Tickets Resolvidos",
      shortLabel: "Resolvidos",
      metric: "mttr",
      value: data?.mttr_count ?? 0,
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      clickable: true,
    },
  ];

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card 
            key={kpi.shortLabel} 
            className={cn(
              "border-border/50 transition-all",
              kpi.clickable && !isLoading && "cursor-pointer hover:shadow-md hover:border-primary/30"
            )}
            onClick={() => {
              if (kpi.clickable && !isLoading) {
                setDrilldownMetric({ metric: kpi.metric, label: kpi.label });
              }
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
                {kpi.shortLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{kpi.value}</div>
              )}
              {kpi.count !== undefined && !isLoading && (
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.count} tickets
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <SupportDrilldownDrawer
        open={drilldownMetric !== null}
        onOpenChange={(open) => !open && setDrilldownMetric(null)}
        metric={drilldownMetric?.metric ?? "all"}
        metricLabel={drilldownMetric?.label ?? ""}
      />
    </>
  );
}

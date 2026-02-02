import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamEfficiencyV2 } from "@/hooks/v2/useTeamEfficiencyV2";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export function TeamEfficiencyWidgetV2() {
  const { data, isLoading, error } = useTeamEfficiencyV2();

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-center text-destructive">
          Erro ao carregar eficiência
        </CardContent>
      </Card>
    );
  }

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "N/A";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h${mins}m`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Eficiência da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum agente com tickets no período
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {data.slice(0, 10).map((agent) => (
              <div key={agent.agent_id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(agent.agent_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {agent.agent_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {agent.tickets_resolved} resolvidos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={agent.sla_compliance_rate} 
                      className="h-1.5 flex-1"
                    />
                    <span className={`text-xs font-medium min-w-[40px] text-right ${
                      agent.sla_compliance_rate >= 80 ? "text-green-600 dark:text-green-400" :
                      agent.sla_compliance_rate >= 60 ? "text-amber-600 dark:text-amber-400" :
                      "text-red-600 dark:text-red-400"
                    }`}>
                      {agent.sla_compliance_rate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>FRT: {formatMinutes(agent.avg_frt_minutes)}</span>
                    <span>MTTR: {formatMinutes(agent.avg_mttr_minutes)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

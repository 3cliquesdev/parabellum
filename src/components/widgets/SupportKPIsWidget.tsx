import { useState } from "react";
import { CompactMetricsGrid, type CompactMetric } from "@/components/ui/CompactMetricsGrid";
import { Clock, Timer, Star, Filter } from "lucide-react";
import { useSupportMetrics } from "@/hooks/useSupportMetrics";
import { useDepartments } from "@/hooks/useDepartments";
import { useSupportAgents } from "@/hooks/useSupportAgents";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupportKPIsWidgetProps {
  startDate: Date;
  endDate: Date;
}

export function SupportKPIsWidget({ startDate, endDate }: SupportKPIsWidgetProps) {
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [agentId, setAgentId] = useState<string | undefined>();

  const { data: metrics, isLoading } = useSupportMetrics(startDate, endDate, {
    departmentId,
    agentId,
  });
  const { data: departments } = useDepartments({ activeOnly: true });
  const { data: agents } = useSupportAgents();

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

  const getFRTStatus = (frt: number): { color: "green" | "yellow" | "red"; label: string } => {
    if (frt <= 5) return { color: "green", label: "✅ Excelente" };
    if (frt <= 10) return { color: "yellow", label: "⚠️ Bom" };
    return { color: "red", label: "🔴 Atenção" };
  };

  const hasFilters = !!departmentId || !!agentId;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={departmentId || "all"}
          onValueChange={(v) => setDepartmentId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={agentId || "all"}
          onValueChange={(v) => setAgentId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os agentes</SelectItem>
            {agents?.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.full_name || "Sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => { setDepartmentId(undefined); setAgentId(undefined); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Metrics */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <CompactMetricsGrid
          metrics={[
            {
              title: "Tempo até Resposta Humana",
              value: formatTime(metrics?.avgFRT || 0),
              icon: Clock,
              color: getFRTStatus(metrics?.avgFRT || 0).color === "green"
                ? "text-green-600"
                : getFRTStatus(metrics?.avgFRT || 0).color === "yellow"
                  ? "text-yellow-600"
                  : "text-red-600",
              bgColor: getFRTStatus(metrics?.avgFRT || 0).color === "green"
                ? "bg-green-100 dark:bg-green-900/30"
                : getFRTStatus(metrics?.avgFRT || 0).color === "yellow"
                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                  : "bg-red-100 dark:bg-red-900/30",
              subtext: getFRTStatus(metrics?.avgFRT || 0).label,
              tooltip: "Tempo médio desde roteamento ao departamento até o agente humano responder",
            },
            {
              title: "Tempo Médio de Atendimento",
              value: formatTime(metrics?.avgMTTR || 0),
              icon: Timer,
              color: "text-primary",
              bgColor: "bg-primary/10",
              subtext: "Do agente assumir até encerramento",
              tooltip: "Tempo médio desde o agente assumir a conversa até o encerramento",
            },
            {
              title: "Satisfação (CSAT)",
              value: `${metrics?.avgCSAT ? metrics.avgCSAT.toFixed(1) : "0.0"}/5.0`,
              icon: Star,
              color: "text-yellow-600",
              bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
              subtext: `${metrics?.totalRatings || 0} avaliações`,
              tooltip: "Média de satisfação dos clientes após atendimento",
            },
          ]}
          columns={3}
        />
      )}
    </div>
  );
}

import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-container";
import { useAIDecisionTelemetry } from "@/hooks/useAIDecisionTelemetry";
import { KPIScorecard } from "@/components/analytics/subscriptions/KPIScorecard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, AlertTriangle, ArrowRightLeft, ShieldAlert, Activity, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--warning, 38 92% 50%))",
  "hsl(var(--success, 142 71% 45%))",
  "hsl(var(--info, 217 91% 60%))",
  "hsl(var(--accent-foreground))",
];

const reasonLabels: Record<string, string> = {
  strict_rag_handoff: "RAG Handoff",
  zero_confidence_cautious: "Zero Confidence",
  confidence_flow_advance: "Flow Advance",
  anti_loop_max_fallbacks: "Anti-Loop",
  fallback_phrase_detected: "Fallback Detectado",
};

function getReasonLabel(eventType: string): string {
  const short = eventType.replace("ai_decision_", "");
  if (short.startsWith("restriction_violation_")) {
    return "Violação: " + short.replace("restriction_violation_", "");
  }
  return reasonLabels[short] || short;
}

function getBadgeVariant(eventType: string) {
  if (eventType.includes("handoff")) return "destructive" as const;
  if (eventType.includes("violation") || eventType.includes("anti_loop")) return "destructive" as const;
  if (eventType.includes("fallback")) return "secondary" as const;
  return "outline" as const;
}

export default function AITelemetry() {
  const { events, isLoading, refetch, kpis, typeBreakdown, hourlyData } = useAIDecisionTelemetry(24);

  return (
    <PageContainer>
      <PageHeader
        title="Telemetria AI Decision"
        description="Monitoramento em tempo real das decisões automáticas da IA (últimas 24h)"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </PageHeader>

      <PageContent>
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIScorecard
              title="Total Decisões"
              value={kpis.total}
              icon={Activity}
              iconColor="text-primary"
              isLoading={isLoading}
            />
            <KPIScorecard
              title="Handoffs"
              value={kpis.handoffs}
              subtitle="Transferências para humano"
              icon={ArrowRightLeft}
              iconColor="text-destructive"
              isLoading={isLoading}
            />
            <KPIScorecard
              title="Fallbacks"
              value={kpis.fallbacks}
              subtitle="Anti-loop + frases genéricas"
              icon={AlertTriangle}
              iconColor="text-warning"
              isLoading={isLoading}
            />
            <KPIScorecard
              title="Violações"
              value={kpis.violations}
              subtitle="Restrições de conteúdo"
              icon={ShieldAlert}
              iconColor="text-destructive"
              isLoading={isLoading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hourly Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Decisões por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : hourlyData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhum evento nas últimas 24h
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Type Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : typeBreakdown.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhum evento nas últimas 24h
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={typeBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={130}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickFormatter={(v) => getReasonLabel("ai_decision_" + v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [value, "Eventos"]}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {typeBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Events Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Eventos Recentes
                <Badge variant="secondary" className="ml-1">{events.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum evento de decisão AI registrado nas últimas 24h
                </div>
              ) : (
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Conversa</TableHead>
                        <TableHead>Flow?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.slice(0, 50).map((evt) => {
                        const json = evt.output_json as any;
                        return (
                          <TableRow key={evt.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(evt.created_at), "dd/MM HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(evt.event_type)} className="text-xs">
                                {getReasonLabel(evt.event_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {json?.exitType || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {evt.score ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {evt.entity_id?.slice(0, 8)}…
                            </TableCell>
                            <TableCell>
                              {json?.hasFlowContext ? (
                                <Badge variant="outline" className="text-xs">Sim</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Não</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}

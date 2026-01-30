import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale } from "lucide-react";
import type { CopilotComparison } from "@/hooks/useCopilotHealthScore";

interface CopilotComparisonChartProps {
  data: CopilotComparison[] | undefined;
  isLoading?: boolean;
}

export function CopilotComparisonChart({ data, isLoading }: CopilotComparisonChartProps) {
  // Transform data for side-by-side comparison
  const chartData = [
    {
      metric: "Tempo Resolução (s)",
      "Com Copilot": data?.find((d) => d.group_label === "Com Copilot")?.avg_resolution_seconds || 0,
      "Sem Copilot": data?.find((d) => d.group_label === "Sem Copilot")?.avg_resolution_seconds || 0,
    },
    {
      metric: "CSAT (1-5)",
      "Com Copilot": (data?.find((d) => d.group_label === "Com Copilot")?.avg_csat || 0),
      "Sem Copilot": (data?.find((d) => d.group_label === "Sem Copilot")?.avg_csat || 0),
    },
    {
      metric: "Conversas",
      "Com Copilot": data?.find((d) => d.group_label === "Com Copilot")?.total_conversations || 0,
      "Sem Copilot": data?.find((d) => d.group_label === "Sem Copilot")?.total_conversations || 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Com IA vs Sem IA
        </CardTitle>
        <CardDescription>
          Comparativo de métricas entre conversas com e sem Copilot
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data?.length ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sem dados para comparação no período
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="metric" type="category" width={100} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="Com Copilot"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="Sem Copilot"
                  fill="hsl(var(--muted-foreground))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

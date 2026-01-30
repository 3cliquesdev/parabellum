import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import type { MonthlyEvolution } from "@/hooks/useCopilotHealthScore";

interface MonthlyEvolutionChartProps {
  data: MonthlyEvolution[] | undefined;
  isLoading?: boolean;
}

export function MonthlyEvolutionChart({ data, isLoading }: MonthlyEvolutionChartProps) {
  const chartData = data?.map((item) => ({
    month: item.month,
    "Taxa de Adoção (%)": item.adoption_rate,
    "CSAT Médio": item.avg_csat,
    "KB Gaps": item.kb_gaps_created,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução Mensal
        </CardTitle>
        <CardDescription>
          Tendências de adoção, CSAT e KB Gaps ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !chartData.length ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sem dados históricos disponíveis
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Taxa de Adoção (%)"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))" }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="CSAT Médio"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="KB Gaps"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--chart-4))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

interface HealthScoreGaugeProps {
  score: number | null | undefined;
  isLoading?: boolean;
}

export function HealthScoreGauge({ score, isLoading }: HealthScoreGaugeProps) {
  const safeScore = score ?? 0;

  // Determine color based on score
  const getScoreColor = (value: number) => {
    if (value >= 70) return "hsl(var(--chart-2))"; // Green/success
    if (value >= 40) return "hsl(var(--chart-4))"; // Yellow/warning
    return "hsl(var(--destructive))"; // Red/critical
  };

  const getScoreLabel = (value: number) => {
    if (value >= 70) return "Saudável";
    if (value >= 40) return "Atenção";
    return "Crítico";
  };

  const data = [
    {
      name: "Health Score",
      value: safeScore,
      fill: getScoreColor(safeScore),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Health Score da Operação
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        ) : (
          <div className="relative h-40 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                barSize={12}
                data={data}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: "hsl(var(--muted))" }}
                  dataKey="value"
                  cornerRadius={6}
                  angleAxisId={0}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
              <span
                className="text-4xl font-bold"
                style={{ color: getScoreColor(safeScore) }}
              >
                {safeScore}
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: getScoreColor(safeScore) }}
              >
                {getScoreLabel(safeScore)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

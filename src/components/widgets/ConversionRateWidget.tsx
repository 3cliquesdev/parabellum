import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { useConversionStats } from "@/hooks/useConversionStats";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function ConversionRateWidget() {
  const { data: stats, isLoading } = useConversionStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: "Ganhos", value: stats?.wonDeals || 0, color: "hsl(var(--chart-1))" },
    { name: "Perdidos", value: stats?.lostDeals || 0, color: "hsl(var(--chart-2))" },
    { name: "Em Aberto", value: stats?.openDeals || 0, color: "hsl(var(--chart-3))" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Taxa de Conversão</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Taxa de Conversão Central */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Taxa de Conversão no Centro */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '35%' }}>
            <p className="text-4xl font-bold text-primary">
              {stats?.conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Conversão</p>
          </div>
        </div>

        {/* Métricas Detalhadas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">Ganhos</p>
            </div>
            <p className="text-lg font-semibold text-green-500">{stats?.wonDeals || 0}</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <p className="text-xs text-muted-foreground">Perdidos</p>
            </div>
            <p className="text-lg font-semibold text-red-500">{stats?.lostDeals || 0}</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-3 w-3 text-blue-500" />
              <p className="text-xs text-muted-foreground">Abertos</p>
            </div>
            <p className="text-lg font-semibold text-blue-500">{stats?.openDeals || 0}</p>
          </div>
        </div>

        {/* Resumo Textual */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">{stats?.wonDeals || 0}</span> ganhos de{" "}
            <span className="font-semibold text-foreground">{stats?.totalDeals || 0}</span> negócios totais
          </p>
          {stats && stats.lossRate > 0 && (
            <p className="mt-1">
              Taxa de perda: <span className="font-semibold text-red-500">{stats.lossRate.toFixed(1)}%</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

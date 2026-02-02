import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVolumeVsResolutionV2 } from "@/hooks/v2/useVolumeVsResolutionV2";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function VolumeResolutionWidgetV2() {
  const { data, isLoading, error } = useVolumeVsResolutionV2();

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-center text-destructive">
          Erro ao carregar volume
        </CardContent>
      </Card>
    );
  }

  const chartData = (data ?? []).map((d) => ({
    date: d.date_bucket,
    dateLabel: format(parseISO(d.date_bucket), "dd/MM", { locale: ptBR }),
    opened: Number(d.opened),
    resolved: Number(d.resolved),
  }));

  const totalOpened = chartData.reduce((sum, d) => sum + d.opened, 0);
  const totalResolved = chartData.reduce((sum, d) => sum + d.resolved, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Volume vs Resolução</span>
          {!isLoading && (
            <div className="flex gap-4 text-xs">
              <span className="text-blue-600 dark:text-blue-400">
                Abertos: {totalOpened}
              </span>
              <span className="text-green-600 dark:text-green-400">
                Resolvidos: {totalResolved}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Sem dados para o período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="dateLabel" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11 }}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => (
                  <span className="text-xs">{value === "opened" ? "Abertos" : "Resolvidos"}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="opened"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOpened)"
                name="opened"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
                name="resolved"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

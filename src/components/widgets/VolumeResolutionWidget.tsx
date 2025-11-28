import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useVolumeVsResolution } from "@/hooks/useVolumeVsResolution";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertCircle } from "lucide-react";

interface VolumeResolutionWidgetProps {
  startDate: Date;
  endDate: Date;
}

export function VolumeResolutionWidget({ startDate, endDate }: VolumeResolutionWidgetProps) {
  const { data, isLoading } = useVolumeVsResolution(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate backlog percentage
  const totalOpened = data?.reduce((sum, d) => sum + d.opened, 0) || 0;
  const totalResolved = data?.reduce((sum, d) => sum + d.resolved, 0) || 0;
  const backlogRate = totalOpened > 0 ? ((totalOpened - totalResolved) / totalOpened) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Volume vs. Resolução
            </CardTitle>
            <CardDescription>
              Tickets abertos vs. fechados por dia
            </CardDescription>
          </div>
          {backlogRate > 20 && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Backlog {backlogRate.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="opened" 
              name="Abertos" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="resolved" 
              name="Resolvidos" 
              fill="hsl(var(--chart-2))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

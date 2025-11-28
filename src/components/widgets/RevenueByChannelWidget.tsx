import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";

interface RevenueByChannelWidgetProps {
  startDate: Date;
  endDate: Date;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function RevenueByChannelWidget({ startDate, endDate }: RevenueByChannelWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-by-channel", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      // Get all won deals in period with contact source
      const { data: deals, error } = await supabase
        .from("deals")
        .select(`
          value,
          contacts!deals_contact_id_fkey(source)
        `)
        .eq("status", "won")
        .gte("closed_at", startDate.toISOString())
        .lte("closed_at", endDate.toISOString());

      if (error) throw error;

      // Group by source
      const revenueBySource: Record<string, number> = {};
      deals?.forEach(deal => {
        const source = (deal.contacts as any)?.source || "Sem Origem";
        revenueBySource[source] = (revenueBySource[source] || 0) + (deal.value || 0);
      });

      // Convert to array for chart
      return Object.entries(revenueBySource)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
    staleTime: 1000 * 60 * 5,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  const totalRevenue = data?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          Receita por Canal
        </CardTitle>
        <CardDescription>
          Origem das vendas fechadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Total Revenue */}
            <div className="mt-4 p-4 rounded-lg bg-muted text-center">
              <div className="text-sm font-medium text-muted-foreground">Receita Total</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalRevenue)}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma venda no período selecionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}

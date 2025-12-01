import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKiwifyFinancials } from "@/hooks/useKiwifyFinancials";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface RevenueBreakdownWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

export function RevenueBreakdownWidget({ startDate, endDate }: RevenueBreakdownWidgetProps) {
  const { data, isLoading, error } = useKiwifyFinancials(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-destructive">Erro ao carregar evolução de receita</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const chartData = data?.monthlyEvolution.map(m => ({
    month: formatMonth(m.month),
    "Receita Bruta": m.grossRevenue,
    "Receita Líquida": m.netRevenue,
    "Taxas Kiwify": m.kiwifyFee,
    "Comissões": m.affiliateCommission,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Evolução de Receita</CardTitle>
        <CardDescription>
          Breakdown completo de receita bruta, líquida, taxas e comissões por mês
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            "Receita Bruta": { label: "Receita Bruta", color: "hsl(var(--chart-1))" },
            "Receita Líquida": { label: "Receita Líquida", color: "hsl(var(--chart-2))" },
            "Taxas Kiwify": { label: "Taxas Kiwify", color: "hsl(var(--chart-3))" },
            "Comissões": { label: "Comissões Afiliados", color: "hsl(var(--chart-4))" },
          }}
          className="h-80"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="Receita Bruta"
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="Receita Líquida"
                stackId="2"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="Taxas Kiwify"
                stackId="3"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="Comissões"
                stackId="4"
                stroke="hsl(var(--chart-4))"
                fill="hsl(var(--chart-4))"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

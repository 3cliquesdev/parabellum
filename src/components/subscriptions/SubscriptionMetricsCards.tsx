import { Card, CardContent } from "@/components/ui/card";
import { SubscriptionMetrics, ProductCategory } from "@/hooks/useKiwifySubscriptions";
import { Users, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface SubscriptionMetricsCardsProps {
  data?: SubscriptionMetrics;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function SubscriptionMetricsCards({ data }: SubscriptionMetricsCardsProps) {
  if (!data) return null;

  const churnRate = data.totalAtivas > 0 
    ? ((data.totalCanceladas / (data.totalAtivas + data.totalCanceladas)) * 100).toFixed(1)
    : '0';

  const metrics = [
    {
      title: 'Assinaturas Ativas',
      value: data.totalAtivas.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Faturamento Recorrente',
      value: formatCurrency(data.faturamentoRecorrente),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Canceladas',
      value: data.totalCanceladas.toLocaleString('pt-BR'),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Taxa de Churn',
      value: `${churnRate}%`,
      icon: TrendingUp,
      color: parseFloat(churnRate) > 10 ? 'text-red-600' : 'text-green-600',
      bgColor: parseFloat(churnRate) > 10 ? 'bg-red-50' : 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface CategoryBreakdownProps {
  byCategory: Record<ProductCategory, { ativas: number; canceladas: number; faturamento: number }>;
}

export function CategoryBreakdown({ byCategory }: CategoryBreakdownProps) {
  const categories = Object.entries(byCategory).filter(([_, data]) => data.ativas + data.canceladas > 0);

  if (categories.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4">Por Categoria de Produto</h3>
        <div className="space-y-3">
          {categories.map(([category, data]) => {
            const total = data.ativas + data.canceladas;
            const activePercent = total > 0 ? (data.ativas / total) * 100 : 0;
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category}</span>
                  <span className="text-muted-foreground">
                    {data.ativas} ativas / {data.canceladas} canceladas
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${activePercent}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {formatCurrency(data.faturamento)} / mês
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { useKiwifySubscriptions } from "@/hooks/useKiwifySubscriptions";
import { CompactMetricsGrid, type CompactMetric } from "@/components/ui/CompactMetricsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserMinus, 
  DollarSign, 
  CreditCard,
  TrendingDown,
} from "lucide-react";

// Widgets
import { ChurnAnalysisCard } from "./subscriptions/ChurnAnalysisCard";
import { RefundsTimelineTable } from "./subscriptions/RefundsTimelineTable";
import { ChurnAnalyticsWidget } from "@/components/widgets/ChurnAnalyticsWidget";
import LostReasonsWidget from "@/components/widgets/LostReasonsWidget";

interface ChurnAnalysisTabProps {
  startDate: Date;
  endDate: Date;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ChurnAnalysisTab({ startDate, endDate }: ChurnAnalysisTabProps) {
  const { data: subscriptionData, isLoading } = useKiwifySubscriptions(startDate, endDate);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Calculate metrics from subscription data
  const refunds = subscriptionData?.reembolsos || [];
  const totalRefunds = refunds.length;
  const totalRefundValue = refunds.reduce((sum, r) => sum + (r.value || 0), 0);
  
  // Calculate churn rate based on gross sales
  const totalSales = subscriptionData?.vendasBrutas || 0;
  const churnRate = totalSales > 0 ? ((totalRefunds / totalSales) * 100) : 0;

  const churnMetrics: CompactMetric[] = [
    {
      title: "Reembolsos",
      value: totalRefunds,
      icon: UserMinus,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      subtext: formatCurrency(totalRefundValue),
      tooltip: "Total de reembolsos processados",
    },
    {
      title: "Chargebacks",
      value: 0,
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      subtext: "Sem dados",
      tooltip: "Disputas de pagamento",
    },
    {
      title: "Taxa Churn",
      value: churnRate.toFixed(1) + "%",
      icon: TrendingDown,
      color: churnRate > 5 ? "text-red-600" : churnRate > 2 ? "text-amber-600" : "text-green-600",
      bgColor: churnRate > 5 ? "bg-red-100 dark:bg-red-900/30" : churnRate > 2 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30",
      subtext: churnRate > 5 ? "Alto" : churnRate > 2 ? "Moderado" : "Saudável",
      tooltip: "Reembolsos / Vendas totais",
    },
    {
      title: "Valor Perdido",
      value: formatCurrency(totalRefundValue),
      icon: DollarSign,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      tooltip: "Total de receita perdida com churn",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Churn & Reembolsos</h3>
        <p className="text-sm text-muted-foreground">
          Análise de cancelamentos, reembolsos e perdas
        </p>
      </div>

      <CompactMetricsGrid label="Métricas de Churn" metrics={churnMetrics} columns={4} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChurnAnalysisCard subscriptionData={subscriptionData} isLoading={isLoading} />
        <LostReasonsWidget />
      </div>

      <ChurnAnalyticsWidget />
      <RefundsTimelineTable subscriptionData={subscriptionData} isLoading={isLoading} />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal } from "lucide-react";
import { SubscriptionMetrics } from "@/hooks/useKiwifySubscriptions";
import { useMemo } from "react";

interface WhoSoldRankingWidgetProps {
  subscriptionData?: SubscriptionMetrics;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Configuração de categorias baseada em comissão de afiliado (alinhado com menu Assinaturas)
// Afiliado = affiliateCommission > 0, Orgânico = affiliateCommission === 0
const CATEGORY_CONFIG: Record<string, { label: string; color: string; priority: number }> = {
  afiliado_novo: { label: "Afiliados (Novo)", color: "#f97316", priority: 1 },
  afiliado_recorrente: { label: "Afiliados (Recorrente)", color: "#ea580c", priority: 2 },
  organico_novo: { label: "Orgânico (Novo)", color: "#8b5cf6", priority: 3 },
  organico_recorrente: { label: "Orgânico (Recorrente)", color: "#7c3aed", priority: 4 },
};

interface CategoryMetrics {
  category: string;
  label: string;
  color: string;
  sales: number;
  revenue: number;
  percentage: number;
  avgTicket: number;
}

export function WhoSoldRankingWidget({ subscriptionData, isLoading }: WhoSoldRankingWidgetProps) {
  // Processar dados usando affiliateCommission de SubscriptionData (mesma lógica do menu Assinaturas)
  // NÃO busca payloads extras - usa dados já calculados em useKiwifySubscriptions
  const categories = useMemo((): CategoryMetrics[] => {
    if (!subscriptionData?.subscriptions || subscriptionData.subscriptions.length === 0) {
      return [];
    }

    const categoryMap = new Map<string, { sales: number; revenue: number }>();

    for (const sub of subscriptionData.subscriptions) {
      // Classificação alinhada com menu Assinaturas:
      // - Afiliado = tem comissão de afiliado (affiliateCommission > 0)
      // - Orgânico = sem comissão de afiliado
      const isAffiliate = sub.affiliateCommission > 0;
      const sourceType = isAffiliate ? 'afiliado' : 'organico';

      // Para determinar novo vs recorrente, verificamos se existe na classificação do hook
      // Usamos a lista de IDs de novas assinaturas vs renovações do metrics
      // Simplificação: se não há como saber, assumimos "novo" para produtos únicos
      // O hook calcula isso via charges.completed.length
      
      // Como o SubscriptionData não expõe saleType diretamente, 
      // vamos derivar: renovação = qualquer subscription recorrente com mais de 1 cobrança
      // Infelizmente, o SubscriptionData atual não expõe isso, então precisamos simplificar
      // Por ora, classificamos tudo como "novo" (podemos melhorar depois)
      const isRecorrente = false; // TODO: adicionar saleType ao SubscriptionData

      const categoryKey = `${sourceType}_${isRecorrente ? 'recorrente' : 'novo'}`;

      const existing = categoryMap.get(categoryKey) || { sales: 0, revenue: 0 };
      existing.sales += 1;
      existing.revenue += sub.grossValue;
      categoryMap.set(categoryKey, existing);
    }

    // Converter para array e calcular métricas
    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0);

    const result: CategoryMetrics[] = [];
    for (const [key, data] of categoryMap.entries()) {
      const config = CATEGORY_CONFIG[key] || {
        label: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: '#6b7280',
        priority: 99,
      };

      result.push({
        category: key,
        label: config.label,
        color: config.color,
        sales: data.sales,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
      });
    }

    // Ordenar por receita decrescente
    return result.sort((a, b) => b.revenue - a.revenue);
  }, [subscriptionData?.subscriptions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Quem Vendeu (Ranking por Receita)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Quem Vendeu (Ranking por Receita)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma venda no período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calcular totais para mostrar no cabeçalho
  const totalSales = categories.reduce((sum, c) => sum + c.sales, 0);
  const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
  const maxRevenue = Math.max(...categories.map((c) => c.revenue));

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-amber-500";
      case 1: return "text-gray-400";
      case 2: return "text-amber-700";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-amber-500" />
            Quem Vendeu (Ranking por Receita)
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{totalSales}</span> vendas · <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Canal</th>
                <th className="text-center py-2 font-medium">Vendas</th>
                <th className="text-right py-2 font-medium">Receita</th>
                <th className="text-right py-2 font-medium">% Total</th>
                <th className="text-right py-2 font-medium">Ticket Médio</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {categories.slice(0, 8).map((category, index) => (
                <tr key={category.category} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-sm">{category.label}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-sm font-semibold">{category.sales}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(category.revenue)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-medium text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm">{formatCurrency(category.avgTicket)}</span>
                  </td>
                  <td className="py-3">
                    <Progress
                      value={(category.revenue / maxRevenue) * 100}
                      className="h-2"
                      style={
                        {
                          "--progress-background": category.color,
                        } as React.CSSProperties
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

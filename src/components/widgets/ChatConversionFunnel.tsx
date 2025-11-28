import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useChatConversionFunnel } from "@/hooks/useChatConversionFunnel";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, TrendingDown } from "lucide-react";

interface ChatConversionFunnelProps {
  startDate: Date;
  endDate: Date;
}

export function ChatConversionFunnel({ startDate, endDate }: ChatConversionFunnelProps) {
  const { data: funnel, isLoading } = useChatConversionFunnel(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Funil de Conversão do Chat
        </CardTitle>
        <CardDescription>
          Conversão de Chat → Lead → Deal → Venda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnel?.map((stage, index) => {
            const nextStage = funnel[index + 1];
            const dropRate = nextStage 
              ? ((stage.count - nextStage.count) / stage.count) * 100 
              : 0;

            return (
              <div key={stage.stage}>
                {/* Funnel Stage Bar */}
                <div className="relative">
                  <div 
                    className="h-16 rounded-lg flex items-center justify-between px-6 transition-all hover:scale-[1.02]"
                    style={{
                      width: `${stage.percentage}%`,
                      background: `linear-gradient(135deg, hsl(var(--primary) / ${1 - index * 0.2}), hsl(var(--primary) / ${0.8 - index * 0.2}))`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary-foreground">
                        {stage.count}
                      </span>
                      <span className="text-sm font-medium text-primary-foreground/90">
                        {stage.stage}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-primary-foreground">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Drop Rate Indicator */}
                {nextStage && dropRate > 0 && (
                  <div className="flex items-center gap-2 ml-4 mt-1 text-xs text-muted-foreground">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span>
                      {dropRate.toFixed(1)}% de perda ({stage.count - nextStage.count} abandonos)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {funnel && funnel.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <div className="text-sm font-medium">Taxa de Conversão Final</div>
            <div className="text-2xl font-bold text-primary mt-1">
              {funnel[funnel.length - 1].percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {funnel[funnel.length - 1].count} vendas de {funnel[0].count} conversas iniciadas
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

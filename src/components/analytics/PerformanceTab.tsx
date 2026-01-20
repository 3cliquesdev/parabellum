import { useKiwifySubscriptions } from "@/hooks/useKiwifySubscriptions";
import { Skeleton } from "@/components/ui/skeleton";

// Widgets
import { WhoSoldRankingWidget } from "./subscriptions/WhoSoldRankingWidget";
import { SalesRepRankingWidget } from "./subscriptions/SalesRepRankingWidget";
import { ChannelPerformanceComparison } from "@/components/widgets/ChannelPerformanceComparison";
import { SalesLeaderboard } from "@/components/widgets/SalesLeaderboard";
import { RevenueByChannelWidget } from "@/components/widgets/RevenueByChannelWidget";
import { ChannelQualityWidget } from "@/components/widgets/ChannelQualityWidget";

interface PerformanceTabProps {
  startDate: Date;
  endDate: Date;
}

export function PerformanceTab({ startDate, endDate }: PerformanceTabProps) {
  const { data: subscriptionData, isLoading } = useKiwifySubscriptions(startDate, endDate);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Performance por Canal & Vendedor</h3>
        <p className="text-sm text-muted-foreground">
          Rankings de performance e comparativos entre canais de aquisição
        </p>
      </div>

      {/* Who Sold Ranking - Full Width */}
      <WhoSoldRankingWidget subscriptionData={subscriptionData} isLoading={isLoading} />

      {/* Channel Comparison - Full Width */}
      <ChannelPerformanceComparison startDate={startDate} endDate={endDate} />

      {/* Revenue by Channel + Channel Quality */}
      <div className="grid gap-6 md:grid-cols-2">
        <RevenueByChannelWidget startDate={startDate} endDate={endDate} />
        <ChannelQualityWidget startDate={startDate} endDate={endDate} />
      </div>

      {/* Sales Rep Ranking */}
      <SalesRepRankingWidget startDate={startDate} endDate={endDate} />

      {/* Sales Leaderboard - Full Width */}
      <SalesLeaderboard />
    </div>
  );
}

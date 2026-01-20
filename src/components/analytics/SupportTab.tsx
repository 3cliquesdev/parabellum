import { SupportKPIsWidget } from "@/components/widgets/SupportKPIsWidget";
import { AIExecutiveSummary } from "@/components/widgets/AIExecutiveSummary";
import { SLAComplianceWidget } from "@/components/widgets/SLAComplianceWidget";
import { TeamEfficiencyWidget } from "@/components/widgets/TeamEfficiencyWidget";
import { VolumeResolutionWidget } from "@/components/widgets/VolumeResolutionWidget";
import { BusyHoursHeatmap } from "@/components/widgets/BusyHoursHeatmap";
import { AIInsightsWidget } from "@/components/widgets/AIInsightsWidget";
import { SentimentDistributionWidget } from "@/components/widgets/SentimentDistributionWidget";

interface SupportTabProps {
  startDate: Date;
  endDate: Date;
}

export function SupportTab({ startDate, endDate }: SupportTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Performance do Suporte</h3>
        <p className="text-sm text-muted-foreground">
          KPIs de atendimento, SLA e análise de qualidade
        </p>
      </div>

      {/* AI Executive Summary */}
      <AIExecutiveSummary 
        data={{ 
          context: 'support',
          message: 'Aguardando coleta de KPIs para análise. Clique em "Gerar Análise" para processar.',
        }}
        context="support"
        startDate={startDate}
        endDate={endDate}
      />

      {/* Support KPIs - Compact */}
      <SupportKPIsWidget startDate={startDate} endDate={endDate} />

      {/* SLA + Team Efficiency */}
      <div className="grid gap-6 md:grid-cols-2 min-w-0">
        <SLAComplianceWidget startDate={startDate} endDate={endDate} />
        <TeamEfficiencyWidget startDate={startDate} endDate={endDate} />
      </div>

      {/* Volume vs Resolution + Busy Hours */}
      <div className="grid gap-6 md:grid-cols-2 min-w-0">
        <VolumeResolutionWidget startDate={startDate} endDate={endDate} />
        <BusyHoursHeatmap startDate={startDate} endDate={endDate} />
      </div>

      {/* AI Insights + Sentiment */}
      <div className="grid gap-6 md:grid-cols-2 min-w-0">
        <AIInsightsWidget startDate={startDate} endDate={endDate} />
        <SentimentDistributionWidget startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}

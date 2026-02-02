import { SupportFiltersProvider } from "@/context/SupportFiltersContext";
import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-container";
import { SupportFiltersBar } from "@/components/support/SupportFiltersBar";
import { SupportKPIsWidgetV2 } from "@/components/support/SupportKPIsWidgetV2";
import { SLAComplianceWidgetV2 } from "@/components/support/SLAComplianceWidgetV2";
import { VolumeResolutionWidgetV2 } from "@/components/support/VolumeResolutionWidgetV2";
import { TeamEfficiencyWidgetV2 } from "@/components/support/TeamEfficiencyWidgetV2";

function SupportDashboardContent() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard de Suporte"
        description="Métricas e análise de performance do atendimento"
      />

      <PageContent>
        <div className="space-y-6">
          {/* Filters */}
          <SupportFiltersBar />

          {/* KPIs */}
          <SupportKPIsWidgetV2 />

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <SLAComplianceWidgetV2 />
            <TeamEfficiencyWidgetV2 />
          </div>

          {/* Volume Chart */}
          <VolumeResolutionWidgetV2 />
        </div>
      </PageContent>
    </PageContainer>
  );
}

export default function SupportDashboard() {
  return (
    <SupportFiltersProvider>
      <SupportDashboardContent />
    </SupportFiltersProvider>
  );
}

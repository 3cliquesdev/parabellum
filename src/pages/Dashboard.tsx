import { FinancialStatusWidget } from "@/components/widgets/FinancialStatusWidget";
import { GuestChartWidget } from "@/components/widgets/GuestChartWidget";
import { OccupancyDonutWidget } from "@/components/widgets/OccupancyDonutWidget";
import { RecentActionsWidget } from "@/components/widgets/RecentActionsWidget";

export default function Dashboard() {
  return (
    <div className="h-screen p-6 grid grid-rows-[auto_1fr_auto] gap-6">
      {/* Widget 1: Status Financeiro - Topo */}
      <FinancialStatusWidget />

      {/* Grid de 2 colunas para Widgets 2 e 3 */}
      <div className="grid grid-cols-2 gap-6 min-h-0">
        <GuestChartWidget />
        <OccupancyDonutWidget />
      </div>

      {/* Widget 4: Últimas Ações - Rodapé */}
      <RecentActionsWidget />
    </div>
  );
}

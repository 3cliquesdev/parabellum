import { MetricCard } from "@/components/app/MetricCard";
import { TrendingUp, Users, Activity, DollarSign } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Visão Geral</h1>
        <p className="text-white/50 text-sm mt-1">Maio 2026 — todos os workspaces</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Leads ativos"
          value="248"
          change="+12%"
          positive
        />
        <MetricCard
          icon={TrendingUp}
          label="Pipeline"
          value="R$ 84.500"
          change="+8%"
          positive
        />
        <MetricCard
          icon={Activity}
          label="Atividades hoje"
          value="17"
          change="-3"
          positive={false}
        />
        <MetricCard
          icon={DollarSign}
          label="Fechados no mês"
          value="R$ 22.000"
          change="+31%"
          positive
        />
      </div>

      {/* Recent activity placeholder */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-base font-medium text-white mb-4">Atividade recente</h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-3 bg-white/8 rounded w-48 mb-1.5" />
                <div className="h-2.5 bg-white/5 rounded w-32" />
              </div>
              <div className="h-2.5 bg-white/5 rounded w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

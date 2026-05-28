import { MetricCard } from "@/components/app/MetricCard";
import { TrendingUp, Users, Activity, DollarSign } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Visão Geral</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "#939da4" }}>
            Maio 2026 — todos os workspaces
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
          Trial — 28 dias restantes
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Leads ativos" value="248" change="+12%" positive />
        <MetricCard icon={TrendingUp} label="Pipeline" value="R$ 84.500" change="+8%" positive />
        <MetricCard icon={Activity} label="Atividades hoje" value="17" change="-3" positive={false} />
        <MetricCard icon={DollarSign} label="Fechados no mês" value="R$ 22.000" change="+31%" positive />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-2xl p-6"
          style={{
            background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Atividade recente</h2>
            <span className="text-xs font-medium" style={{ color: "#9aea62" }}>Ver tudo</span>
          </div>
          <div className="space-y-1">
            {[
              { action: "Novo lead adicionado", name: "Maria Silva", time: "2m atrás", type: "lead" },
              { action: "Proposta enviada", name: "João Mendes", time: "18m atrás", type: "deal" },
              { action: "Ligação concluída", name: "Ana Costa", time: "1h atrás", type: "call" },
              { action: "Lead qualificado", name: "Pedro Alves", time: "2h atrás", type: "lead" },
              { action: "Negócio fechado", name: "Carla Duarte", time: "3h atrás", type: "win" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-3 rounded-xl px-3 transition-colors"
                style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: item.type === "win"
                      ? "rgba(154,234,98,0.12)"
                      : "rgba(255,255,255,0.06)",
                  }}>
                  <div className="w-2 h-2 rounded-full"
                    style={{ background: item.type === "win" ? "#9aea62" : "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.action}</p>
                  <p className="text-xs" style={{ color: "#939da4" }}>{item.name}</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: "rgba(147,157,164,0.5)" }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline resumo */}
        <div className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Pipeline</h2>
            <span className="text-xs font-medium" style={{ color: "#9aea62" }}>Detalhes</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Novo", count: 12, pct: 85, color: "rgba(255,255,255,0.15)" },
              { label: "Em Contato", count: 8, pct: 60, color: "#9aea62" },
              { label: "Proposta", count: 5, pct: 40, color: "#9aea62" },
              { label: "Negociação", count: 3, pct: 25, color: "#9aea62" },
              { label: "Ganho", count: 2, pct: 15, color: "#9aea62" },
            ].map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: "#939da4" }}>{stage.label}</span>
                  <span className="text-xs font-bold text-white">{stage.count}</span>
                </div>
                <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${stage.pct}%`, background: stage.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs mb-1" style={{ color: "#939da4" }}>Valor total do pipeline</p>
            <p className="text-lg font-extrabold text-white tracking-[-0.02em]">R$ 84.500</p>
          </div>
        </div>
      </div>
    </div>
  );
}

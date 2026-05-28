"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Activity, DollarSign, RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/app/MetricCard";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/types/database";
import Link from "next/link";

const PIPELINE_STAGES = [
  { id: "novo", label: "Novo", color: "rgba(255,255,255,0.2)" },
  { id: "em_contato", label: "Em Contato", color: "#60a5fa" },
  { id: "proposta", label: "Proposta", color: "#fb923c" },
  { id: "negociacao", label: "Negociação", color: "#facc15" },
  { id: "ganho", label: "Ganho", color: "#9aea62" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function DashboardPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!tenantLoading && tenantId) fetchData();
    if (!tenantLoading && !tenantId) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tenantLoading]);

  const activeLeads = leads.filter(l => l.status !== "perdido");
  const wonLeads = leads.filter(l => l.status === "ganho");
  const pipelineValue = activeLeads.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0);
  const wonValue = wonLeads.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0);
  const recentLeads = [...leads].slice(0, 5);

  const now = new Date();
  const monthLabel = now.toLocaleString("pt-BR", { month: "long" }) + " " + now.getFullYear();

  if (tenantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Visão Geral</h1>
          <p className="text-sm mt-1 font-medium capitalize" style={{ color: "#939da4" }}>{monthLabel}</p>
        </div>
        <button onClick={fetchData}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#939da4" }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Leads ativos" value={String(activeLeads.length)} change="" positive />
        <MetricCard icon={TrendingUp} label="Valor do pipeline" value={pipelineValue > 0 ? `R$ ${pipelineValue.toLocaleString("pt-BR")}` : "R$ 0"} change="" positive />
        <MetricCard icon={Activity} label="Total de leads" value={String(leads.length)} change="" positive />
        <MetricCard icon={DollarSign} label="Ganhos" value={wonValue > 0 ? `R$ ${wonValue.toLocaleString("pt-BR")}` : "R$ 0"} change="" positive />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leads recentes */}
        <div className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Leads recentes</h2>
            <Link href="/pipeline" className="text-xs font-medium" style={{ color: "#9aea62" }}>Ver pipeline</Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: "#939da4" }}>Nenhum lead ainda.</p>
              <Link href="/pipeline" className="text-xs mt-2 inline-block" style={{ color: "#9aea62" }}>Adicionar primeiro lead</Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentLeads.map((lead, i) => (
                <div key={lead.id} className="flex items-center gap-3 py-3 px-3 rounded-xl"
                  style={{ borderBottom: i < recentLeads.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: lead.status === "ganho" ? "rgba(154,234,98,0.15)" : "rgba(255,255,255,0.06)", color: lead.status === "ganho" ? "#9aea62" : "rgba(255,255,255,0.5)" }}>
                    {lead.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.nome}</p>
                    <p className="text-xs truncate" style={{ color: "#939da4" }}>{lead.servico_interesse ?? lead.status}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {lead.valor_estimado && (
                      <p className="text-xs font-bold" style={{ color: "#9aea62" }}>R$ {Number(lead.valor_estimado).toLocaleString("pt-BR")}</p>
                    )}
                    <p className="text-xs" style={{ color: "rgba(147,157,164,0.5)" }}>{timeAgo(lead.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline por etapa */}
        <div className="rounded-2xl p-6"
          style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Pipeline</h2>
            <Link href="/pipeline" className="text-xs font-medium" style={{ color: "#9aea62" }}>Detalhes</Link>
          </div>
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const count = leads.filter(l => l.status === stage.id).length;
              const maxCount = Math.max(...PIPELINE_STAGES.map(s => leads.filter(l => l.status === s.id).length), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={stage.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: "#939da4" }}>{stage.label}</span>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: count === 0 ? "0%" : `${Math.max(pct, 4)}%`, background: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs mb-1" style={{ color: "#939da4" }}>Valor total do pipeline</p>
            <p className="text-lg font-extrabold text-white tracking-[-0.02em]">
              {pipelineValue > 0 ? `R$ ${pipelineValue.toLocaleString("pt-BR")}` : "R$ 0"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

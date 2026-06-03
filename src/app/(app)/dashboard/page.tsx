"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Activity, DollarSign, RefreshCw, Kanban, ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/app/MetricCard";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/types/database";
import Link from "next/link";
import { motion } from "framer-motion";

const PIPELINE_STAGES = [
  { id: "novo", label: "Novo", color: "var(--status-novo)" },
  { id: "em_contato", label: "Em Contato", color: "var(--status-contato)" },
  { id: "proposta", label: "Proposta", color: "#fb923c" },
  { id: "negociacao", label: "Negociação", color: "#facc15" },
  { id: "ganho", label: "Ganho", color: "var(--status-ganho)" },
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

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 animate-pulse" style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
      <div className="h-3 w-20 rounded mb-4" style={{ background: "var(--border-subtle)" }} />
      <div className="h-8 w-28 rounded mb-2" style={{ background: "var(--input-border)" }} />
      <div className="h-2 w-16 rounded" style={{ background: "var(--input-bg)" }} />
    </div>
  );
}

function LeadEmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--accent)", boxShadow: "0 0 32px var(--accent)" }}>
        <Kanban size={24} style={{ color: "var(--status-ganho)" }} />
      </div>
      <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum lead ainda</p>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>Adicione seu primeiro lead para começar</p>
      <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl"
        style={{ background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }}>
        Ir para o pipeline <ArrowRight size={12} />
      </Link>
    </motion.div>
  );
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
    setLeads((data as unknown as Lead[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      if (!tenantLoading && tenantId) {
        void fetchData();
        return;
      }

      if (!tenantLoading) {
        setLoading(false);
      }
    });
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
      <div className="p-8 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-32 rounded-xl animate-pulse" style={{ background: "var(--border-subtle)" }} />
            <div className="h-4 w-20 rounded mt-2 animate-pulse" style={{ background: "var(--input-bg)" }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  return (
    <div className="p-8 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Visão Geral</h1>
          <p className="text-sm mt-1 font-medium capitalize" style={{ color: "var(--text-secondary)" }}>{monthLabel}</p>
        </div>
        <button onClick={fetchData}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:rotate-180"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", transition: "all 0.3s ease" }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* KPI Cards com stagger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Leads ativos", value: String(activeLeads.length) },
          { icon: TrendingUp, label: "Valor do pipeline", value: pipelineValue > 0 ? `R$ ${pipelineValue.toLocaleString("pt-BR")}` : "R$ 0" },
          { icon: Activity, label: "Total de leads", value: String(leads.length) },
          { icon: DollarSign, label: "Ganhos", value: wonValue > 0 ? `R$ ${wonValue.toLocaleString("pt-BR")}` : "R$ 0" },
        ].map(({ icon, label, value }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}>
            <MetricCard icon={icon} label={label} value={value} change="" positive />
          </motion.div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leads recentes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Leads recentes</h2>
            <Link href="/pipeline" className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--status-ganho)" }}>
              Ver pipeline <ArrowRight size={11} />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <LeadEmptyState />
          ) : (
            <div className="space-y-0.5">
              {recentLeads.map((lead, i) => (
                <motion.div key={lead.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl transition-colors cursor-default"
                  style={{ borderBottom: i < recentLeads.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--input-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: lead.status === "ganho" ? "var(--accent)" : "var(--border-subtle)",
                      color: lead.status === "ganho" ? "var(--status-ganho)" : "var(--text-secondary)",
                    }}>
                    {lead.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.nome}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{lead.servico_interesse ?? lead.status}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {lead.valor_estimado && (
                      <p className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>R$ {Number(lead.valor_estimado).toLocaleString("pt-BR")}</p>
                    )}
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{timeAgo(lead.created_at)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Pipeline por etapa */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Pipeline</h2>
            <Link href="/pipeline" className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>Detalhes</Link>
          </div>
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage, i) => {
              const count = leads.filter(l => l.status === stage.id).length;
              const maxCount = Math.max(...PIPELINE_STAGES.map(s => leads.filter(l => l.status === s.id).length), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={stage.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{stage.label}</span>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full w-full" style={{ background: "var(--border-subtle)" }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: count === 0 ? "0%" : `${Math.max(pct, 4)}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: "easeOut" }}
                      style={{ background: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Valor total do pipeline</p>
            <p className="text-lg font-extrabold text-white tracking-[-0.02em]">
              {pipelineValue > 0 ? `R$ ${pipelineValue.toLocaleString("pt-BR")}` : "R$ 0"}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

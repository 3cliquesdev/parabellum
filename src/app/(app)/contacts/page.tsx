"use client";

import { useState } from "react";
import { Search, Plus, Download } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useLeads } from "@/hooks/useLeads";
import type { Lead, LeadStatus } from "@/types/database";

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo", em_contato: "Em Contato", qualificado: "Qualificado",
  proposta: "Proposta", negociacao: "Negociação", ganho: "Ganho", perdido: "Perdido",
};
const STATUS_COLOR: Record<LeadStatus, string> = {
  novo: "rgba(255,255,255,0.2)", em_contato: "#60a5fa", qualificado: "#a78bfa",
  proposta: "#fb923c", negociacao: "#facc15", ganho: "#9aea62", perdido: "#f87171",
};

function exportCSV(leads: Lead[]) {
  const headers = ["Nome", "WhatsApp", "Email", "Serviço", "Status", "Valor", "Criado em"];
  const rows = leads.map(l => [
    l.nome, l.whatsapp ?? "", l.email ?? "", l.servico_interesse ?? "",
    STATUS_LABEL[l.status], l.valor_estimado ?? "", new Date(l.created_at).toLocaleDateString("pt-BR"),
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
}

export default function ContactsPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const { leads, loading } = useLeads(tenantId);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");

  const filtered = leads.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.whatsapp ?? "").includes(search);
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (tenantLoading || loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Contatos</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "#939da4" }}>{leads.length} leads cadastrados</p>
        </div>
        <button onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#939da4" }}>
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#939da4" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou WhatsApp..."
            className="h-9 pl-9 pr-4 rounded-xl text-sm text-white w-72 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as LeadStatus | "all")}
          className="h-9 px-3 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: filterStatus === "all" ? "#939da4" : "#fff" }}>
          <option value="all" style={{ background: "#111" }}>Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v} style={{ background: "#111" }}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="grid px-6 py-3 text-xs font-bold"
          style={{ gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr", color: "#939da4", background: "rgba(0,0,0,0.4)" }}>
          <span>Nome</span><span>WhatsApp</span><span>Serviço</span><span>Status</span><span>Valor</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "#939da4" }}>Nenhum contato encontrado.</p>
          </div>
        ) : filtered.map((lead, i) => (
          <div key={lead.id} className="grid px-6 py-4 items-center transition-colors"
            style={{ gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                {lead.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{lead.nome}</p>
                <p className="text-xs" style={{ color: "#939da4" }}>{lead.email ?? "—"}</p>
              </div>
            </div>
            <span className="text-sm" style={{ color: "#939da4" }}>{lead.whatsapp ?? "—"}</span>
            <span className="text-sm" style={{ color: "#939da4" }}>{lead.servico_interesse ?? "—"}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full w-fit"
              style={{ color: STATUS_COLOR[lead.status], background: `${STATUS_COLOR[lead.status]}15` }}>
              {STATUS_LABEL[lead.status]}
            </span>
            <span className="text-sm font-bold" style={{ color: lead.valor_estimado ? "#9aea62" : "#939da4" }}>
              {lead.valor_estimado ? `R$ ${Number(lead.valor_estimado).toLocaleString("pt-BR")}` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

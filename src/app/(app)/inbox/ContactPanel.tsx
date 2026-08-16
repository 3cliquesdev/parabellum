"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConversaWithLead } from "@/hooks/useConversas";
import type { Lead } from "@/types/database";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/leads/status";
import { LeadTimeline, type TimelineEvent } from "@/components/app/LeadTimeline";
import { inboxBadgeStyle, inboxBadgeTone, useContrastSafeColor } from "./theme";

interface TicketRow {
  id: string;
  ticket_number: string;
  titulo: string;
  status: string;
  prioridade: string;
  ticket_categories: { nome: string; cor: string } | null;
}

interface CompraRow {
  produto: string;
  valor: number;
  status: string;
  comprado_em: string;
  pago_em: string | null;
}

interface NegocioRow {
  id: string;
  titulo: string;
  valor: number | null;
  estagio: "aberto" | "ganho" | "perdido";
  created_at: string;
}

const NEGOCIO_ESTAGIO_TONE: Record<NegocioRow["estagio"], "green" | "yellow" | "neutral"> = {
  aberto: "yellow", ganho: "green", perdido: "neutral",
};
const NEGOCIO_ESTAGIO_LABEL: Record<NegocioRow["estagio"], string> = {
  aberto: "Aberto", ganho: "Ganho", perdido: "Perdido",
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto", em_andamento: "Em andamento", aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido", fechado: "Fechado",
};

const VENDA_STATUS_TONE: Record<string, "green" | "yellow" | "neutral"> = {
  pago: "green", aguardando_pagamento: "yellow", cartao_recusado: "neutral",
  reembolsado: "neutral", chargeback: "neutral", cancelado: "neutral",
};

type Aba = "tickets" | "negocios" | "timeline";

interface ContactPanelProps {
  conversa: ConversaWithLead;
  tenantId: string;
  allTags: { id: string; nome: string; cor: string }[];
  novaTag: string;
  setNovaTag: (v: string) => void;
  adicionandoTag: boolean;
  onAdicionarTag: () => void;
  onRemoverTag: (tagId: string) => void;
  criarNegocioSignal?: number;
}

export function ContactPanel({ conversa, tenantId, allTags, novaTag, setNovaTag, adicionandoTag, onAdicionarTag, onRemoverTag, criarNegocioSignal }: ContactPanelProps) {
  const safeColor = useContrastSafeColor();
  const [aba, setAba] = useState<Aba>("timeline");
  const [lead, setLead] = useState<Lead | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [negocios, setNegocios] = useState<NegocioRow[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNegocio, setNovoNegocio] = useState<{ titulo: string; valor: string } | null>(null);
  const [salvandoNegocio, setSalvandoNegocio] = useState(false);

  async function carregarNegocios() {
    const res = await fetch(`/api/negocios?tenant_id=${tenantId}&lead_id=${conversa.lead_id}`);
    if (res.ok) setNegocios((await res.json()).negocios ?? []);
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      const supabase = createClient();
      const [{ data: leadData }, ticketsRes, comprasRes, timelineRes, negociosRes] = await Promise.all([
        supabase.from("leads").select("*").eq("id", conversa.lead_id).single(),
        fetch(`/api/tickets?tenant_id=${tenantId}&lead_id=${conversa.lead_id}`),
        fetch(`/api/leads/${conversa.lead_id}/compras`),
        fetch(`/api/leads/${conversa.lead_id}/timeline`),
        fetch(`/api/negocios?tenant_id=${tenantId}&lead_id=${conversa.lead_id}`),
      ]);
      if (cancelado) return;

      setLead((leadData as unknown as Lead) ?? null);
      if (ticketsRes.ok) setTickets((await ticketsRes.json()).tickets ?? []);
      if (comprasRes.ok) setCompras((await comprasRes.json()).compras ?? []);
      if (timelineRes.ok) setEvents((await timelineRes.json()).events ?? []);
      if (negociosRes.ok) setNegocios((await negociosRes.json()).negocios ?? []);
      setLoading(false);
    }

    void carregar();
    return () => { cancelado = true; };
  }, [conversa.lead_id, tenantId]);

  async function criarNegocio() {
    if (!novoNegocio?.titulo.trim()) return;
    setSalvandoNegocio(true);
    await fetch("/api/negocios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        lead_id: conversa.lead_id,
        titulo: novoNegocio.titulo.trim(),
        valor: novoNegocio.valor ? Number(novoNegocio.valor) : null,
      }),
    });
    setSalvandoNegocio(false);
    setNovoNegocio(null);
    await carregarNegocios();
  }

  useEffect(() => {
    if (criarNegocioSignal === undefined || criarNegocioSignal === 0) return;

    function abrirFormularioNegocio() {
      setAba("negocios");
      setNovoNegocio({ titulo: "", valor: "" });
    }

    abrirFormularioNegocio();
  }, [criarNegocioSignal]);

  async function mudarEstagioNegocio(negocioId: string, estagio: NegocioRow["estagio"]) {
    await fetch(`/api/negocios/${negocioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, estagio }),
    });
    await carregarNegocios();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--primary-bg)", color: "var(--status-ganho)" }}>
            {conversa.lead_nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{conversa.lead_nome}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              {conversa.lead_whatsapp ?? conversa.lead_email ?? conversa.lead_instagram ?? "Sem contato direto"}
            </p>
          </div>
        </div>
        {lead && (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle(safeColor(STATUS_COLOR[lead.status]))}>
            {STATUS_LABEL[lead.status]}
          </span>
        )}

        <div>
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>Tags</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {conversa.tags.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhuma tag aplicada ainda.</p>
            ) : (
              conversa.tags.map((tag) => (
                <span key={tag.id} className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={inboxBadgeStyle(safeColor(tag.cor))}>
                  {tag.nome}
                  <button onClick={() => onRemoverTag(tag.id)} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))
            )}
          </div>
          <div className="flex gap-1.5">
            <select
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              className="flex-1 h-8 px-2 rounded-lg text-[11px] outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            >
              <option value="">Adicionar tag...</option>
              {allTags.filter((t) => !conversa.tags.some((st) => st.id === t.id)).map((t) => (
                <option key={t.id} value={t.nome} style={{ background: "var(--surface-solid)" }}>{t.nome}</option>
              ))}
            </select>
            <button
              onClick={onAdicionarTag}
              disabled={!novaTag || adicionandoTag}
              className="px-2.5 h-8 rounded-lg text-[11px] font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !novaTag || adicionandoTag ? 0.6 : 1 }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {([["tickets", "Tickets"], ["negocios", "Negócios"], ["timeline", "Timeline"]] as [Aba, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className="flex-1 py-2.5 text-xs font-bold text-center"
            style={{
              color: aba === id ? "var(--status-ganho)" : "var(--text-secondary)",
              borderBottom: aba === id ? "2px solid var(--status-ganho)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
          </div>
        ) : aba === "tickets" ? (
          tickets.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhum ticket para este contato.</p>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-lg p-2.5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{t.titulo}</p>
                    <span className="text-[9px] shrink-0" style={{ color: "var(--text-faint)" }}>#{t.ticket_number}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeTone("blue")}>
                      {TICKET_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    {t.ticket_categories && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle(safeColor(t.ticket_categories.cor))}>
                        {t.ticket_categories.nome}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : aba === "negocios" ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Negócios</p>
                {!novoNegocio && (
                  <button
                    onClick={() => setNovoNegocio({ titulo: "", valor: "" })}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg"
                    style={{ background: "var(--primary-bg)", color: "var(--status-ganho)" }}
                  >
                    + Criar
                  </button>
                )}
              </div>

              {novoNegocio && (
                <div className="rounded-lg p-2.5 space-y-2 mb-2" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
                  <input
                    value={novoNegocio.titulo}
                    onChange={(e) => setNovoNegocio({ ...novoNegocio, titulo: e.target.value })}
                    placeholder="Título do negócio"
                    className="w-full h-8 px-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  />
                  <input
                    value={novoNegocio.valor}
                    onChange={(e) => setNovoNegocio({ ...novoNegocio, valor: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="Valor (R$)"
                    className="w-full h-8 px-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setNovoNegocio(null)} className="px-2.5 h-7 rounded-lg text-[11px]" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
                    <button
                      onClick={criarNegocio}
                      disabled={!novoNegocio.titulo.trim() || salvandoNegocio}
                      className="px-2.5 h-7 rounded-lg text-[11px] font-bold"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !novoNegocio.titulo.trim() || salvandoNegocio ? 0.6 : 1 }}
                    >
                      {salvandoNegocio ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              )}

              {negocios.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhum negócio para este contato.</p>
              ) : (
                <div className="space-y-2">
                  {negocios.map((n) => (
                    <div key={n.id} className="rounded-lg p-2.5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{n.titulo}</p>
                        {n.valor != null && <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-primary)" }}>R$ {n.valor}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeTone(NEGOCIO_ESTAGIO_TONE[n.estagio])}>
                          {NEGOCIO_ESTAGIO_LABEL[n.estagio]}
                        </span>
                        {n.estagio === "aberto" && (
                          <>
                            <button onClick={() => mudarEstagioNegocio(n.id, "ganho")} className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>Marcar ganho</button>
                            <button onClick={() => mudarEstagioNegocio(n.id, "perdido")} className="text-[10px] font-bold" style={{ color: "var(--text-faint)" }}>Marcar perdido</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lead && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-secondary)" }}>Estágio do lead</p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle(safeColor(STATUS_COLOR[lead.status]))}>
                  {STATUS_LABEL[lead.status]}
                </span>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Valor estimado: {lead.valor_estimado ? `R$ ${lead.valor_estimado}` : "—"}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Serviço de interesse: {lead.servico_interesse ?? "—"}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--text-primary)" }}>Histórico de compras</p>
              {compras.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhuma compra registrada.</p>
              ) : (
                <div className="space-y-2">
                  {compras.map((c, i) => (
                    <div key={i} className="rounded-lg p-2.5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{c.produto}</p>
                        <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-primary)" }}>R$ {c.valor}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeTone(VENDA_STATUS_TONE[c.status] ?? "neutral")}>
                          {c.status}
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                          {new Date(c.pago_em ?? c.comprado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <LeadTimeline events={events} />
        )}
      </div>
    </div>
  );
}

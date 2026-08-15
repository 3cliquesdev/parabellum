"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Ticket as TicketIcon, AlertTriangle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

type TicketStatus =
  | "aberto" | "em_andamento" | "retorno" | "aguardando_cliente"
  | "aguardando_aprovacao" | "aprovado" | "resolvido" | "fechado";
type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";

interface TicketRow {
  id: string;
  ticket_number: string | null;
  titulo: string;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  due_date: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
  created_at: string;
  ticket_categories?: { nome: string; cor: string } | null;
  ticket_tags?: { tags: { id: string; nome: string; cor: string } }[];
}

interface TeamMember {
  user_id: string;
  email: string | null;
  name: string | null;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto", em_andamento: "Em Andamento", retorno: "Retorno",
  aguardando_cliente: "Aguardando Cliente", aguardando_aprovacao: "Aguard. Aprovação",
  aprovado: "Aprovado", resolvido: "Resolvido", fechado: "Fechado",
};
const STATUS_COLOR: Record<TicketStatus, string> = {
  aberto: "#60a5fa", em_andamento: "#facc15", retorno: "#fb923c",
  aguardando_cliente: "#c084fc", aguardando_aprovacao: "#c084fc",
  aprovado: "#10B981", resolvido: "#10B981", fechado: "#939da4",
};
const PRIORIDADE_LABEL: Record<TicketPrioridade, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
const PRIORIDADE_COLOR: Record<TicketPrioridade, string> = {
  baixa: "#939da4", media: "#60a5fa", alta: "#fb923c", urgente: "#f87171",
};

const TABS: { id: TicketStatus | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "aberto", label: "Aberto" },
  { id: "em_andamento", label: "Em Andamento" },
  { id: "aguardando_cliente", label: "Aguardando Cliente" },
  { id: "retorno", label: "Retorno" },
  { id: "resolvido", label: "Resolvido" },
  { id: "fechado", label: "Fechado" },
];

function slaBadge(ticket: TicketRow) {
  if (!ticket.due_date || ticket.resolved_at) return null;
  const diffMs = new Date(ticket.due_date).getTime() - Date.now();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const text = `${hours}h ${minutes}m`;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={overdue
        ? { color: "#f87171", background: "rgba(248,113,113,0.1)" }
        : { color: "#10B981", background: "rgba(16,185,129,0.1)" }}
    >
      {overdue && <AlertTriangle className="w-2.5 h-2.5" />}
      {overdue ? `Vencido há ${text}` : text}
    </span>
  );
}

export default function TicketsPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TicketStatus | "todos">("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", prioridade: "media" as TicketPrioridade });
  const [saving, setSaving] = useState(false);

  const membersByUserId = useMemo(
    () => Object.fromEntries(members.map((m) => [m.user_id, m])),
    [members],
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (tenantLoading) return;
      if (!tenantId) { setLoading(false); return; }
      void fetchTickets();
      void fetchMembers();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tenantLoading]);

  async function fetchTickets() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("tickets")
      .select("*, ticket_categories(nome, cor), ticket_tags(tags(id, nome, cor))")
      .eq("tenant_id", tenantId!)
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as unknown as TicketRow[]);
    setLoading(false);
  }

  async function fetchMembers() {
    const r = await fetch(`/api/team/members?tenant_id=${tenantId}`);
    const d = await r.json();
    setMembers(d.members ?? []);
  }

  async function createTicket() {
    if (!form.titulo || !tenantId) return;
    setSaving(true);
    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, ...form }),
    });
    setSaving(false);
    if (r.ok) {
      setShowForm(false);
      setForm({ titulo: "", descricao: "", prioridade: "media" });
      fetchTickets();
    }
  }

  const filtered = tab === "todos" ? tickets : tickets.filter((t) => t.status === tab);

  if (tenantLoading || loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Tickets</h1>
          <p className="text-[13px] mt-0.5 font-medium" style={{ color: "var(--text-secondary)" }}>
            {tickets.filter((t) => !["resolvido", "fechado"].includes(t.status)).length} em aberto · {tickets.length} no total
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Novo Ticket
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
          <input
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            placeholder="Assunto do ticket"
            className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          />
          <textarea
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Descrição (opcional)"
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          />
          <div className="flex items-center gap-2">
            <select
              value={form.prioridade}
              onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as TicketPrioridade }))}
              className="h-9 px-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            >
              {Object.entries(PRIORIDADE_LABEL).map(([v, l]) => (
                <option key={v} value={v} style={{ background: "var(--surface-solid)" }}>{l}</option>
              ))}
            </select>
            <button
              onClick={createTicket}
              disabled={saving || !form.titulo}
              className="px-4 h-9 rounded-xl text-xs font-bold ml-auto"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Criando..." : "Criar ticket"}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3.5 h-8 rounded-lg text-xs font-semibold shrink-0 transition-all"
            style={tab === id
              ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
              : { background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
            <TicketIcon className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum ticket aqui.</p>
          </div>
        ) : filtered.map((t) => {
          const assignee = t.assigned_to ? membersByUserId[t.assigned_to] : null;
          return (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex items-center gap-4 p-4 rounded-xl transition-colors"
              style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: "var(--text-faint)" }}>
                    {t.ticket_number ?? "—"}
                  </span>
                  <p className="text-sm font-semibold text-white truncate">{t.titulo}</p>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {t.ticket_categories && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: t.ticket_categories.cor, background: `${t.ticket_categories.cor}15` }}>
                      {t.ticket_categories.nome}
                    </span>
                  )}
                  {t.ticket_tags?.map(({ tags }) => (
                    <span key={tags.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: tags.cor, background: `${tags.cor}15` }}>
                      {tags.nome}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {slaBadge(t)}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: PRIORIDADE_COLOR[t.prioridade], background: `${PRIORIDADE_COLOR[t.prioridade]}15` }}>
                  {PRIORIDADE_LABEL[t.prioridade]}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}15` }}>
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-xs w-24 truncate text-right" style={{ color: "var(--text-secondary)" }}>
                  {assignee?.name ?? assignee?.email ?? "Não atribuído"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

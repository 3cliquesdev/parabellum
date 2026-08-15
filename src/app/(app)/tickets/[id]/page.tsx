"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

type TicketStatus =
  | "aberto" | "em_andamento" | "retorno" | "aguardando_cliente"
  | "aguardando_aprovacao" | "aprovado" | "resolvido" | "fechado";
type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";

interface TicketDetail {
  id: string;
  ticket_number: string | null;
  titulo: string;
  descricao: string | null;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  conteudo: string;
  autor_id: string | null;
  autor_tipo: "agente" | "ia" | "sistema" | "cliente";
  interno: boolean;
  created_at: string;
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
const PRIORIDADE_LABEL: Record<TicketPrioridade, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
const AUTOR_LABEL: Record<CommentRow["autor_tipo"], string> = {
  agente: "Agente", ia: "IA", sistema: "Sistema", cliente: "Cliente",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tenantId } = useTenant();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/team/members?tenant_id=${tenantId}`).then((r) => r.json()).then((d) => setMembers(d.members ?? []));
  }, [tenantId]);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/tickets/${id}`);
    const d = await r.json();
    setTicket(d.ticket ?? null);
    setComments(d.comments ?? []);
    setLoading(false);
  }

  async function updateField(field: string, value: string | null) {
    if (!ticket) return;
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  }

  async function sendComment() {
    if (!newComment.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await fetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo: newComment, autor_id: user?.id ?? null, autor_tipo: "agente" }),
    });
    setNewComment("");
    setSending(false);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  if (!ticket) return (
    <div className="p-6">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Ticket não encontrado.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-3xl" style={{ fontFamily: "var(--font-sans)" }}>
      <button onClick={() => router.push("/tickets")} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar pra tickets
      </button>

      <div>
        <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-faint)" }}>{ticket.ticket_number}</span>
        <h1 className="text-lg font-semibold text-white tracking-tight mt-0.5">{ticket.titulo}</h1>
        {ticket.descricao && (
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>{ticket.descricao}</p>
        )}
      </div>

      <div className="rounded-xl p-4 grid grid-cols-3 gap-4" style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
        <div>
          <label className="text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)" }}>Status</label>
          <select
            value={ticket.status}
            onChange={(e) => updateField("status", e.target.value)}
            className="w-full h-9 mt-1 px-2 rounded-lg text-xs outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v} style={{ background: "var(--surface-solid)" }}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)" }}>Prioridade</label>
          <select
            value={ticket.prioridade}
            onChange={(e) => updateField("prioridade", e.target.value)}
            className="w-full h-9 mt-1 px-2 rounded-lg text-xs outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
          >
            {Object.entries(PRIORIDADE_LABEL).map(([v, l]) => (
              <option key={v} value={v} style={{ background: "var(--surface-solid)" }}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)" }}>Responsável</label>
          <select
            value={ticket.assigned_to ?? ""}
            onChange={(e) => updateField("assigned_to", e.target.value || null)}
            className="w-full h-9 mt-1 px-2 rounded-lg text-xs outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
          >
            <option value="" style={{ background: "var(--surface-solid)" }}>Não atribuído</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id} style={{ background: "var(--surface-solid)" }}>{m.name ?? m.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Histórico</p>
        {comments.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhum comentário ainda.</p>
        ) : comments.map((c) => (
          <div key={c.id} className="rounded-xl p-3" style={{ background: c.interno ? "rgba(250,204,21,0.05)" : "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: "var(--status-ganho)", background: "var(--primary-bg)" }}>
                {AUTOR_LABEL[c.autor_tipo]}
              </span>
              {c.interno && <span className="text-[10px]" style={{ color: "#facc15" }}>nota interna</span>}
              <span className="text-[10px] ml-auto" style={{ color: "var(--text-faint)" }}>
                {new Date(c.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{c.conteudo}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendComment()}
          placeholder="Adicionar comentário..."
          className="flex-1 h-10 px-3 rounded-xl text-sm text-white outline-none"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
        />
        <button
          onClick={sendComment}
          disabled={sending || !newComment.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: sending ? 0.6 : 1 }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

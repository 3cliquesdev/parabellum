"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Ticket as TicketIcon, AlertTriangle, Upload, X } from "lucide-react";
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
  created_by: string | null;
  department_id: string | null;
  lead_id: string | null;
  created_at: string;
  ticket_categories?: { nome: string; cor: string } | null;
  ticket_tags?: { tags: { id: string; nome: string; cor: string } }[];
  ticket_stakeholders?: { user_id: string }[];
  leads?: { nome: string } | null;
}

interface TeamMember { user_id: string; email: string | null; name: string | null }
interface DepartmentOpt { id: string; name: string; color: string }
interface OperacaoOpt { id: string; nome: string }
interface TagOpt { id: string; nome: string; cor: string }
interface LeadOpt { id: string; nome: string; email: string | null }

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

const STATUS_SIDEBAR: TicketStatus[] = [
  "aberto", "em_andamento", "retorno", "aguardando_cliente", "aguardando_aprovacao", "aprovado",
];

type Filtro =
  | "todos" | "meus_abertos" | "criei" | "participei" | "nao_atribuidos" | "sla_vencido" | "sem_tag"
  | `status:${TicketStatus}` | "financeiro";

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
  const [departments, setDepartments] = useState<DepartmentOpt[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [showModal, setShowModal] = useState(false);

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
      void fetchDepartments();
      createClient().auth.getUser().then(({ data: { user } }) => setMyUserId(user?.id ?? null));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tenantLoading]);

  async function fetchTickets() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("tickets")
      .select("*, ticket_categories(nome, cor), ticket_tags(tags(id, nome, cor)), ticket_stakeholders(user_id), leads(nome)")
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

  async function fetchDepartments() {
    const r = await fetch(`/api/departments?tenant_id=${tenantId}`);
    const d = await r.json();
    setDepartments(d.departments ?? []);
  }

  const departamentoFinanceiro = departments.find((d) => d.name.toLowerCase() === "financeiro");

  const filtered = useMemo(() => {
    switch (filtro) {
      case "todos": return tickets;
      case "meus_abertos": return tickets.filter((t) => t.assigned_to === myUserId && !["resolvido", "fechado"].includes(t.status));
      case "criei": return tickets.filter((t) => t.created_by === myUserId);
      case "participei": return tickets.filter((t) => (t.ticket_stakeholders ?? []).some((s) => s.user_id === myUserId));
      case "nao_atribuidos": return tickets.filter((t) => !t.assigned_to);
      case "sla_vencido": return tickets.filter((t) => t.due_date && !t.resolved_at && new Date(t.due_date).getTime() < Date.now());
      case "sem_tag": return tickets.filter((t) => !(t.ticket_tags ?? []).length);
      case "financeiro": return departamentoFinanceiro ? tickets.filter((t) => t.department_id === departamentoFinanceiro.id) : [];
      default:
        if (filtro.startsWith("status:")) {
          const status = filtro.slice(7) as TicketStatus;
          return tickets.filter((t) => t.status === status);
        }
        return tickets;
    }
  }, [filtro, tickets, myUserId, departamentoFinanceiro]);

  const SIDEBAR_TOP: { id: Filtro; label: string }[] = [
    { id: "todos", label: "Todos os tickets" },
    { id: "meus_abertos", label: "Meus tickets abertos" },
    { id: "criei", label: "Tickets que criei" },
    { id: "participei", label: "Participei" },
    { id: "nao_atribuidos", label: "Não atribuídos" },
    { id: "sla_vencido", label: "SLA vencido" },
    { id: "sem_tag", label: "Sem tag" },
  ];

  if (tenantLoading || loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Sidebar de filtros */}
      <aside className="w-56 shrink-0 overflow-y-auto py-5 px-3" style={{ borderRight: "1px solid var(--border-subtle)", background: "var(--bg-subtle)" }}>
        <div className="space-y-0.5 mb-4">
          {SIDEBAR_TOP.map(({ id, label }) => (
            <button key={id} onClick={() => setFiltro(id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left"
              style={filtro === id
                ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                : { color: "var(--text-secondary)", border: "1px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>
        <p className="px-3 mb-1.5 text-[10px] font-bold uppercase" style={{ color: "rgba(147,157,164,0.5)", letterSpacing: "0.06em" }}>Por status</p>
        <div className="space-y-0.5 mb-4">
          {STATUS_SIDEBAR.map((status) => (
            <button key={status} onClick={() => setFiltro(`status:${status}`)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left"
              style={filtro === `status:${status}`
                ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                : { color: "var(--text-secondary)", border: "1px solid transparent" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[status] }} />
              {STATUS_LABEL[status]}
            </button>
          ))}
        </div>
        {departamentoFinanceiro && (
          <>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase" style={{ color: "rgba(147,157,164,0.5)", letterSpacing: "0.06em" }}>Financeiro</p>
            <button onClick={() => setFiltro("financeiro")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left"
              style={filtro === "financeiro"
                ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                : { color: "var(--text-secondary)", border: "1px solid transparent" }}>
              Tickets do Financeiro
            </button>
          </>
        )}
      </aside>

      {/* Conteudo principal */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Tickets</h1>
            <p className="text-[13px] mt-0.5 font-medium" style={{ color: "var(--text-secondary)" }}>
              {filtered.length} de {tickets.length} tickets
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
            <Plus className="w-3.5 h-3.5" /> Novo Ticket
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
            <TicketIcon className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum ticket aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Protocolo", "Assunto", "SLA", "Solicitante", "Responsável", "Data", "Criado por"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const assignee = t.assigned_to ? membersByUserId[t.assigned_to] : null;
                  const criador = t.created_by ? membersByUserId[t.created_by] : null;
                  return (
                    <tr key={t.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="px-4 py-3">
                        <Link href={`/tickets/${t.id}`} className="text-[11px] font-mono font-bold hover:underline" style={{ color: "var(--status-ganho)" }}>
                          {t.ticket_number ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <Link href={`/tickets/${t.id}`} className="block">
                          <p className="text-sm font-medium text-white truncate">{t.titulo}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {t.ticket_categories && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: t.ticket_categories.cor, background: `${t.ticket_categories.cor}15` }}>
                                {t.ticket_categories.nome}
                              </span>
                            )}
                            {t.ticket_tags?.map(({ tags }) => (
                              <span key={tags.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: tags.cor, background: `${tags.cor}15` }}>
                                {tags.nome}
                              </span>
                            ))}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}15` }}>
                              {STATUS_LABEL[t.status]}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: PRIORIDADE_COLOR[t.prioridade], background: `${PRIORIDADE_COLOR[t.prioridade]}15` }}>
                              {PRIORIDADE_LABEL[t.prioridade]}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">{slaBadge(t) ?? <span style={{ color: "var(--text-faint)" }}>—</span>}</td>
                      <td className="px-4 py-3 text-xs truncate max-w-[140px]" style={{ color: "var(--text-secondary)" }}>{t.leads?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-xs truncate max-w-[140px]" style={{ color: "var(--text-secondary)" }}>{assignee?.name ?? assignee?.email ?? "Não atribuído"}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-faint)" }}>{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 text-xs truncate max-w-[140px]" style={{ color: "var(--text-faint)" }}>{criador?.name ?? criador?.email ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && tenantId && (
        <NovoTicketModal
          tenantId={tenantId}
          members={members}
          departments={departments}
          myUserId={myUserId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchTickets(); }}
        />
      )}
    </div>
  );
}

function NovoTicketModal({
  tenantId, members, departments, myUserId, onClose, onCreated,
}: {
  tenantId: string;
  members: TeamMember[];
  departments: DepartmentOpt[];
  myUserId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [operacoes, setOperacoes] = useState<OperacaoOpt[]>([]);
  const [tags, setTags] = useState<TagOpt[]>([]);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadResults, setLeadResults] = useState<LeadOpt[]>([]);
  const [leadSelecionado, setLeadSelecionado] = useState<LeadOpt | null>(null);
  const [novaTag, setNovaTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    notaInterna: "",
    prioridade: "media" as TicketPrioridade,
    operacaoId: "",
    departmentId: "",
    assignedTo: "",
    evidenciaUrl: "",
    evidenciaNome: "",
    tagIds: [] as string[],
  });

  useEffect(() => {
    fetch(`/api/operacoes?tenant_id=${tenantId}`).then((r) => r.json()).then((d) => setOperacoes(d.operacoes ?? []));
    fetch(`/api/tags?tenant_id=${tenantId}`).then((r) => r.json()).then((d) => setTags(d.tags ?? []));
  }, [tenantId]);

  useEffect(() => {
    if (leadQuery.trim().length < 2) { setLeadResults([]); return; }
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("leads")
        .select("id, nome, email")
        .eq("tenant_id", tenantId)
        .or(`nome.ilike.%${leadQuery}%,email.ilike.%${leadQuery}%`)
        .limit(8);
      setLeadResults((data ?? []) as LeadOpt[]);
    }, 300);
    return () => clearTimeout(timeout);
  }, [leadQuery, tenantId]);

  function toggleTag(tagId: string) {
    setForm((f) => ({ ...f, tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter((t) => t !== tagId) : [...f.tagIds, tagId] }));
  }

  async function criarTagInline() {
    if (!novaTag.trim()) return;
    const r = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId, nome: novaTag.trim() }) });
    const d = await r.json();
    if (d.tag) { setTags((prev) => [...prev, d.tag]); setForm((f) => ({ ...f, tagIds: [...f.tagIds, d.tag.id] })); setNovaTag(""); }
  }

  async function handleFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `${tenantId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("ticket-evidencias").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("ticket-evidencias").getPublicUrl(path);
      setForm((f) => ({ ...f, evidenciaUrl: data.publicUrl, evidenciaNome: file.name }));
    }
    setUploading(false);
  }

  async function criarTicket() {
    if (!form.titulo || form.titulo.trim().length < 10) { setErro("Assunto precisa de pelo menos 10 caracteres"); return; }
    if (!form.operacaoId) { setErro("Selecione a operação"); return; }
    setErro(null);
    setSaving(true);
    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        titulo: form.titulo,
        descricao: form.descricao || undefined,
        nota_interna: form.notaInterna || undefined,
        prioridade: form.prioridade,
        operacao_id: form.operacaoId,
        department_id: form.departmentId || undefined,
        assigned_to: form.assignedTo || undefined,
        created_by: myUserId ?? undefined,
        lead_id: leadSelecionado?.id ?? undefined,
        evidencia_url: form.evidenciaUrl || undefined,
        tag_ids: form.tagIds,
      }),
    });
    setSaving(false);
    if (r.ok) onCreated();
    else { const d = await r.json().catch(() => ({})); setErro(d.error ?? "Erro ao criar ticket"); }
  }

  const inputStyle = { background: "var(--input-bg)", border: "1px solid var(--input-border)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-5 space-y-4" style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Criar Novo Ticket</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Preencha os detalhes do ticket de suporte.</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: "var(--text-faint)" }} /></button>
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Cliente <span style={{ color: "var(--text-faint)" }}>(opcional)</span></label>
          <input value={leadSelecionado ? leadSelecionado.nome : leadQuery}
            onChange={(e) => { setLeadSelecionado(null); setLeadQuery(e.target.value); }}
            placeholder="Buscar cliente por nome ou email..."
            className="w-full h-9 px-3 mt-1 rounded-xl text-sm text-white outline-none" style={inputStyle} />
          {leadResults.length > 0 && !leadSelecionado && (
            <div className="mt-1 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
              {leadResults.map((l) => (
                <button key={l.id} onClick={() => { setLeadSelecionado(l); setLeadResults([]); }}
                  className="w-full text-left px-3 py-2 text-xs" style={{ background: "var(--surface-soft)", color: "var(--text-primary)" }}>
                  {l.nome} {l.email ? `· ${l.email}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Assunto *</label>
          <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            placeholder="Resumo do problema (mín. 10 caracteres)"
            className="w-full h-9 px-3 mt-1 rounded-xl text-sm text-white outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Evidências (Print/Foto) <span style={{ color: "var(--text-faint)" }}>(opcional)</span></label>
          <label className="mt-1 flex flex-col items-center justify-center gap-1 py-4 rounded-xl cursor-pointer text-center" style={{ border: "1px dashed var(--border-subtle)" }}>
            <Upload className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {uploading ? "Enviando..." : form.evidenciaNome ? form.evidenciaNome : <>Arraste ou <span style={{ color: "var(--status-ganho)" }}>clique para adicionar</span></>}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>PNG, JPG, WEBP, PDF (máx 10MB cada)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); }} />
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Descrição <span style={{ color: "var(--text-faint)" }}>(opcional)</span></label>
          <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Descreva o problema em detalhes..." rows={3}
            className="w-full px-3 py-2 mt-1 rounded-xl text-sm text-white outline-none resize-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold flex items-center gap-1" style={{ color: "#facc15" }}>Nota Interna <span style={{ color: "var(--text-faint)" }}>(opcional)</span></label>
          <textarea value={form.notaInterna} onChange={(e) => setForm((f) => ({ ...f, notaInterna: e.target.value }))}
            placeholder="Nota interna visível apenas para a equipe..." rows={2}
            className="w-full px-3 py-2 mt-1 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.2)" }} />
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Prioridade *</label>
          <select value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as TicketPrioridade }))}
            className="w-full h-9 px-3 mt-1 rounded-xl text-sm outline-none" style={{ ...inputStyle, color: "var(--text-primary)" }}>
            {Object.entries(PRIORIDADE_LABEL).map(([v, l]) => <option key={v} value={v} style={{ background: "var(--surface-solid)" }}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Operação *</label>
          <select value={form.operacaoId} onChange={(e) => setForm((f) => ({ ...f, operacaoId: e.target.value }))}
            className="w-full h-9 px-3 mt-1 rounded-xl text-sm outline-none" style={{ ...inputStyle, color: "var(--text-primary)" }}>
            <option value="" style={{ background: "var(--surface-solid)" }}>Selecione a operação</option>
            {operacoes.map((o) => <option key={o.id} value={o.id} style={{ background: "var(--surface-solid)" }}>{o.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-white">Tags</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map((tag) => (
              <button key={tag.id} onClick={() => toggleTag(tag.id)} type="button"
                className="text-[11px] font-bold px-2 py-1 rounded-full"
                style={form.tagIds.includes(tag.id)
                  ? { color: tag.cor, background: `${tag.cor}25`, border: `1px solid ${tag.cor}50` }
                  : { color: "var(--text-secondary)", background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
                {tag.nome}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <input value={novaTag} onChange={(e) => setNovaTag(e.target.value)} placeholder="Adicionar tag..."
              className="flex-1 h-8 px-2.5 rounded-lg text-xs text-white outline-none" style={inputStyle} />
            <button onClick={criarTagInline} type="button" className="px-2.5 h-8 rounded-lg text-xs font-bold" style={{ background: "var(--surface-soft)", color: "var(--status-ganho)", border: "1px solid var(--border-subtle)" }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-white">Departamento <span style={{ color: "var(--text-faint)" }}>(opcional)</span></label>
            <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              className="w-full h-9 px-2 mt-1 rounded-xl text-xs outline-none" style={{ ...inputStyle, color: "var(--text-primary)" }}>
              <option value="" style={{ background: "var(--surface-solid)" }}>Nenhum</option>
              {departments.map((d) => <option key={d.id} value={d.id} style={{ background: "var(--surface-solid)" }}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-white">Atribuir a <span style={{ color: "var(--text-faint)" }}>(opcional)</span></label>
            <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              className="w-full h-9 px-2 mt-1 rounded-xl text-xs outline-none" style={{ ...inputStyle, color: "var(--text-primary)" }}>
              <option value="" style={{ background: "var(--surface-solid)" }}>Fila de Espera</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id} style={{ background: "var(--surface-solid)" }}>{m.name ?? m.email}</option>)}
            </select>
          </div>
        </div>

        {erro && <p className="text-xs" style={{ color: "#f87171" }}>{erro}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl text-xs font-bold" style={{ background: "var(--surface-soft)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>Cancelar</button>
          <button onClick={criarTicket} disabled={saving || uploading} className="flex-1 h-9 rounded-xl text-xs font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Criando..." : "Criar Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

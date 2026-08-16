"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Clock, FileText, MapPin, MessageSquare, Paperclip, Send, User } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/hooks/useTenant";
import { useConversas, type ConversaWithLead } from "@/hooks/useConversas";
import { useMensagens } from "@/hooks/useMensagens";
import { createClient } from "@/lib/supabase/client";
import type { Mensagem } from "@/types/database";
import {
  inboxBadgeStyle,
  inboxBadgeTone,
  inboxBubbleStyle,
  inboxCanvasStyle,
  inboxComposerStyle,
  inboxConversationItemStyle,
  inboxGhostButtonStyle,
  inboxPageStyle,
  inboxPanelStyle,
  useContrastSafeColor,
  type InboxBadgeTone,
} from "./theme";
import { ContactPanel } from "./ContactPanel";

const DISPATCH_BADGE: Record<string, { label: string; tone: InboxBadgeTone }> = {
  ia: { label: "IA", tone: "green" },
  atribuido: { label: "Atribuído", tone: "blue" },
  fila: { label: "Na fila", tone: "yellow" },
  resolvido: { label: "Resolvido", tone: "neutral" },
};

type FiltroInbox =
  | "todas"
  | "minhas"
  | "novas_atribuicoes"
  | "nao_respondidas"
  | "aguardando_cliente"
  | "sla_excedido"
  | "nao_atribuidas"
  | "fila_ia"
  | "fila_humana"
  | "encerradas";

const SLA_MINUTOS = 30;

interface DepartmentInfo {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface MembroEquipe {
  id: string;
  user_id?: string;
  email?: string;
  availability_status?: string | null;
}

const AVAILABILITY_LABEL: Record<string, string> = { online: "Disponível", away: "Ausente", offline: "Offline" };

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function conversationTimeLabel(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function MediaContent({ msg, tone }: { msg: Mensagem; tone: "lead" | "humano" | "ia" }) {
  const pad = "px-4 py-2.5";
  const textColor =
    tone === "lead"
      ? "var(--chat-inbound-text)"
      : tone === "ia"
        ? "var(--chat-ai-text)"
        : "var(--chat-outbound-text)";

  if (msg.media_type === "image" || msg.media_type === "sticker") {
    return (
      <div>
        {/* URL de mídia arbitrária do provedor; dimensões não são conhecidas antecipadamente. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={msg.media_url ?? ""}
          alt="imagem"
          className="max-w-full rounded-xl block"
          style={{ maxWidth: 280, maxHeight: 300, objectFit: "cover" }}
        />
        {msg.media_caption && (
          <p className={`${pad} text-sm`} style={{ color: textColor }}>
            {msg.media_caption}
          </p>
        )}
      </div>
    );
  }

  if (msg.media_type === "audio") {
    return (
      <div className={pad}>
        <audio controls src={msg.media_url ?? ""} className="w-full" style={{ maxWidth: 260, height: 36 }} />
      </div>
    );
  }

  if (msg.media_type === "video") {
    return (
      <div>
        <video controls src={msg.media_url ?? ""} className="max-w-full rounded-xl block" style={{ maxWidth: 280, maxHeight: 200 }} />
        {msg.media_caption && (
          <p className={`${pad} text-sm`} style={{ color: textColor }}>
            {msg.media_caption}
          </p>
        )}
      </div>
    );
  }

  if (msg.media_type === "document") {
    return (
      <a
        href={msg.media_url ?? ""}
        target="_blank"
        rel="noopener noreferrer"
        className={`${pad} flex items-center gap-2.5 no-underline`}
        style={{ color: textColor }}
      >
        <FileText className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium truncate">{msg.media_nome || "Documento"}</span>
      </a>
    );
  }

  if (msg.media_type === "location" && msg.latitude && msg.longitude) {
    return (
      <a
        href={`https://maps.google.com/?q=${msg.latitude},${msg.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${pad} flex items-center gap-2 no-underline`}
        style={{ color: textColor }}
      >
        <MapPin className="w-4 h-4 shrink-0" />
        <span className="text-sm">Ver localização</span>
      </a>
    );
  }

  return (
    <p className={`${pad} text-sm leading-6`} style={{ color: textColor }}>
      {msg.conteudo}
    </p>
  );
}

export default function InboxPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const { conversas, loading: conversasLoading } = useConversas(tenantId);
  const safeColor = useContrastSafeColor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { mensagens, loading: msgsLoading } = useMensagens(selectedId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [filtro, setFiltro] = useState<FiltroInbox>("todas");
  const [departamentoFiltro, setDepartamentoFiltro] = useState<string | null>(null);
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [atendenteFiltro, setAtendenteFiltro] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>("vendedor");
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null);
  const [departamentos, setDepartamentos] = useState<DepartmentInfo[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [criarNegocioTick, setCriarNegocioTick] = useState(0);
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    function atualizarAgora() {
      setAgora(Date.now());
    }
    atualizarAgora();
    const intervalo = setInterval(atualizarAgora, 30_000);
    return () => clearInterval(intervalo);
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/departments?tenant_id=${tenantId}`).then((r) => r.json()).then((d) => setDepartamentos(d.departments ?? []));
    fetch(`/api/team/members?tenant_id=${tenantId}`).then((r) => (r.ok ? r.json() : { members: [] })).then((d) => setEquipe(d.members ?? []));
  }, [tenantId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMyUserId(user.id);

      if (tenantId) {
        const { data: memberData } = await supabase
          .from("tenant_members")
          .select("role")
          .eq("tenant_id", tenantId)
          .eq("user_id", user.id)
          .single();
        const tm = memberData as { role?: string | null } | null;
        setMyRole(tm?.role ?? "vendedor");
      }
    });
  }, [tenantId]);

  const conversasAtivas = conversas.filter((c) => c.status === "ativo");
  const slaLimite = (agora ?? 0) - SLA_MINUTOS * 60 * 1000;

  const eMinhas = (c: ConversaWithLead) => c.assigned_to === myUserId;
  const ePredicados: Record<Exclude<FiltroInbox, "todas" | "encerradas">, (c: ConversaWithLead) => boolean> = {
    minhas: (c) => eMinhas(c),
    novas_atribuicoes: (c) => eMinhas(c) && !c.agente_respondeu,
    nao_respondidas: (c) => eMinhas(c) && c.agente_respondeu && c.ultima_mensagem_remetente === "lead",
    aguardando_cliente: (c) => eMinhas(c) && c.ultima_mensagem_remetente != null && c.ultima_mensagem_remetente !== "lead",
    sla_excedido: (c) => c.ultima_mensagem_remetente === "lead" && !!c.ultima_mensagem_em && new Date(c.ultima_mensagem_em).getTime() < slaLimite,
    nao_atribuidas: (c) => !c.assigned_to && !c.ia_ativa,
    fila_ia: (c) => c.ia_ativa,
    fila_humana: (c) => c.dispatch_status === "fila" || c.dispatch_status === "atribuido",
  };

  const contagemFilaIA = conversasAtivas.filter(ePredicados.fila_ia).length;
  const contagemFilaHumana = conversasAtivas.filter(ePredicados.fila_humana).length;
  const contagemEncerradas = conversas.filter((c) => c.status === "resolvido").length;
  const contagemMinhas = conversasAtivas.filter(ePredicados.minhas).length;
  const contagemNovasAtribuicoes = conversasAtivas.filter(ePredicados.novas_atribuicoes).length;
  const contagemNaoRespondidas = conversasAtivas.filter(ePredicados.nao_respondidas).length;
  const contagemAguardandoCliente = conversasAtivas.filter(ePredicados.aguardando_cliente).length;
  const contagemSlaExcedido = conversasAtivas.filter(ePredicados.sla_excedido).length;
  const contagemNaoAtribuidas = conversasAtivas.filter(ePredicados.nao_atribuidas).length;

  const conversasPorFiltro =
    filtro === "encerradas"
      ? conversas.filter((c) => c.status === "resolvido")
      : filtro === "todas"
        ? conversasAtivas
        : conversasAtivas.filter(ePredicados[filtro]);

  const conversasFiltradas = conversasPorFiltro
    .filter((c) => !departamentoFiltro || c.department_id === departamentoFiltro)
    .filter((c) => !tagFiltro || c.tags.some((t) => t.id === tagFiltro))
    .filter((c) => !atendenteFiltro || c.assigned_to === atendenteFiltro);

  const contagemPorDepartamento = new Map<string, number>();
  for (const c of conversas) {
    if (c.status !== "ativo" || !c.department_id) continue;
    contagemPorDepartamento.set(c.department_id, (contagemPorDepartamento.get(c.department_id) ?? 0) + 1);
  }

  const contagemPorTag = new Map<string, number>();
  for (const c of conversasAtivas) {
    for (const tag of c.tags) {
      contagemPorTag.set(tag.id, (contagemPorTag.get(tag.id) ?? 0) + 1);
    }
  }

  const contagemPorAtendente = new Map<string, number>();
  for (const c of conversasAtivas) {
    if (!c.assigned_to) continue;
    contagemPorAtendente.set(c.assigned_to, (contagemPorAtendente.get(c.assigned_to) ?? 0) + 1);
  }

  const selected = conversas.find((conversa) => conversa.id === selectedId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function handleSend() {
    if (!text.trim() || !selectedId || !tenantId || !selected?.supports_outbound) return;

    setSending(true);
    const msg = text.trim();
    setText("");

    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversa_id: selectedId,
          conteudo: msg,
          tenant_id: tenantId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Erro ao enviar mensagem");
        setText(msg);
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleIA(conversa: ConversaWithLead) {
    const supabase = createClient();
    await supabase.from("conversas").update({ ia_ativa: !conversa.ia_ativa }).eq("id", conversa.id);
  }

  const [tags, setTags] = useState<{ id: string; nome: string; cor: string }[]>([]);
  const [showResolverMenu, setShowResolverMenu] = useState(false);
  const [tagEscolhida, setTagEscolhida] = useState("");
  const [resolvendo, setResolvendo] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/tags?tenant_id=${tenantId}`).then((r) => r.json()).then((d) => setTags(d.tags ?? []));
  }, [tenantId]);

  async function marcarComoResolvido(conversa: ConversaWithLead) {
    if (!tagEscolhida || !tenantId) return;
    setResolvendo(true);
    const r = await fetch(`/api/conversas/${conversa.id}/resolver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, tag_nome: tagEscolhida, resolvido_por: "humano" }),
    });
    setResolvendo(false);
    if (!r.ok) {
      const err = await r.json();
      alert(err.error ?? "Erro ao encerrar conversa");
      return;
    }
    setShowResolverMenu(false);
    setTagEscolhida("");
  }

  async function assumirConversa(conversa: ConversaWithLead) {
    if (!myUserId) return;
    const supabase = createClient();
    await supabase.from("conversas").update({
      assigned_to: myUserId,
      dispatch_status: "atribuido",
      ia_ativa: false,
      agente_respondeu: false,
    }).eq("id", conversa.id);
  }

  const [showTransferirMenu, setShowTransferirMenu] = useState(false);
  const [departamentoEscolhido, setDepartamentoEscolhido] = useState("");
  const [transferindo, setTransferindo] = useState(false);

  async function transferirConversa(conversa: ConversaWithLead) {
    if (!departamentoEscolhido || !tenantId) return;
    setTransferindo(true);
    const r = await fetch(`/api/conversas/${conversa.id}/transferir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, departamento_slug: departamentoEscolhido, motivo: "transferencia_manual" }),
    });
    setTransferindo(false);
    if (!r.ok) {
      const err = await r.json();
      alert(err.error ?? "Erro ao transferir conversa");
      return;
    }
    setShowTransferirMenu(false);
    setDepartamentoEscolhido("");
  }

  const [novaTag, setNovaTag] = useState("");
  const [adicionandoTag, setAdicionandoTag] = useState(false);

  async function adicionarTag(conversa: ConversaWithLead) {
    if (!novaTag || !tenantId) return;
    setAdicionandoTag(true);
    await fetch(`/api/conversas/${conversa.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, tag_nome: novaTag }),
    });
    setAdicionandoTag(false);
    setNovaTag("");
  }

  async function removerTag(conversa: ConversaWithLead, tagId: string) {
    if (!tenantId) return;
    await fetch(`/api/conversas/${conversa.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, tag_id: tagId }),
    });
  }

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={inboxPageStyle}>
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 overflow-hidden" style={inboxPageStyle}>
      <aside className="w-[340px] xl:w-[360px] shrink-0 rounded-[28px] overflow-hidden flex flex-col min-h-0" style={inboxPanelStyle}>
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                Inbox
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Conversas do WhatsApp, Instagram e canais conectados
              </p>
            </div>
            <Link href="/inbox/queue" className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full" style={inboxBadgeTone("yellow")}>
              <Clock className="w-3 h-3" />
              Fila
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroInbox)}
              className="h-9 px-2.5 rounded-xl text-xs font-bold outline-none"
              style={{ background: "var(--active-soft-bg)", color: "var(--status-ganho)", border: "1px solid var(--active-soft-border)" }}
            >
              {[
                { id: "todas" as const, label: "Todas", count: conversasAtivas.length },
                { id: "minhas" as const, label: "Minhas", count: contagemMinhas },
                { id: "novas_atribuicoes" as const, label: "Novas atribuições", count: contagemNovasAtribuicoes },
                { id: "nao_respondidas" as const, label: "Não respondidas", count: contagemNaoRespondidas },
                { id: "aguardando_cliente" as const, label: "Aguardando cliente", count: contagemAguardandoCliente },
                { id: "sla_excedido" as const, label: "SLA Excedido", count: contagemSlaExcedido },
                { id: "nao_atribuidas" as const, label: "Não atribuídas", count: contagemNaoAtribuidas },
                { id: "fila_ia" as const, label: "Fila IA", count: contagemFilaIA },
                { id: "fila_humana" as const, label: "Fila Humana", count: contagemFilaHumana },
                { id: "encerradas" as const, label: "Encerradas", count: contagemEncerradas },
              ].map((item) => (
                <option key={item.id} value={item.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>

            {departamentos.length > 0 && (
              <select
                value={departamentoFiltro ?? ""}
                onChange={(e) => setDepartamentoFiltro(e.target.value || null)}
                className="h-9 px-2.5 rounded-xl text-xs font-bold outline-none"
                style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
              >
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                  Todos deptos ({conversasAtivas.length})
                </option>
                {departamentos.map((dep) => (
                  <option key={dep.id} value={dep.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                    {dep.name} ({contagemPorDepartamento.get(dep.id) ?? 0})
                  </option>
                ))}
              </select>
            )}

            {tags.length > 0 && (
              <select
                value={tagFiltro ?? ""}
                onChange={(e) => setTagFiltro(e.target.value || null)}
                className="h-9 px-2.5 rounded-xl text-xs font-bold outline-none"
                style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
              >
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                  Todas as tags ({conversasAtivas.length})
                </option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                    {tag.nome} ({contagemPorTag.get(tag.id) ?? 0})
                  </option>
                ))}
              </select>
            )}

            {equipe.length > 0 && (
              <select
                value={atendenteFiltro ?? ""}
                onChange={(e) => setAtendenteFiltro(e.target.value || null)}
                className="h-9 px-2.5 rounded-xl text-xs font-bold outline-none"
                style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
              >
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                  Todos atendentes
                </option>
                {equipe.map((membro) => (
                  <option key={membro.id} value={membro.user_id ?? ""} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>
                    {membro.email ?? membro.user_id} — {AVAILABILITY_LABEL[membro.availability_status ?? "offline"] ?? membro.availability_status} ({contagemPorAtendente.get(membro.user_id ?? "") ?? 0})
                  </option>
                ))}
              </select>
            )}
          </div>

        </div>

        <div className="flex-1 overflow-y-auto">
          {conversasLoading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
                <MessageSquare className="w-6 h-6" style={{ color: "var(--text-faint)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Nenhuma conversa por aqui
              </p>
              <p className="text-xs mt-1 leading-5" style={{ color: "var(--text-secondary)" }}>
                {filtro === "fila_ia"
                  ? "Nenhuma conversa com a IA no momento."
                  : filtro === "fila_humana"
                    ? "Nenhuma conversa esperando ou atribuída a um humano."
                    : filtro === "encerradas"
                      ? "Nenhuma conversa encerrada ainda."
                      : "As novas conversas vão aparecer aqui assim que entrarem."}
              </p>
            </div>
          ) : (
            conversasFiltradas.map((conversa) => {
              const dispatch = conversa.dispatch_status ?? "ia";
              const badge = DISPATCH_BADGE[dispatch] ?? DISPATCH_BADGE.ia;
              const active = selectedId === conversa.id;
              const hovered = hoveredConversationId === conversa.id;
              const departamentoConversa = departamentos.find((d) => d.id === conversa.department_id);

              return (
                <button
                  key={conversa.id}
                  onClick={() => setSelectedId(conversa.id)}
                  onMouseEnter={() => setHoveredConversationId(conversa.id)}
                  onMouseLeave={() => setHoveredConversationId(null)}
                  className="w-full px-4 py-3.5 text-left"
                  style={{
                    ...inboxConversationItemStyle(active),
                    background: active ? "var(--active-soft-bg)" : hovered ? "var(--surface-hover)" : "transparent",
                    transform: hovered && !active ? "translateX(2px)" : "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "var(--primary-bg)", color: "var(--status-ganho)" }}
                    >
                      {conversa.lead_nome.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {conversa.lead_nome}
                          </p>
                          <p className="text-xs truncate mt-1" style={{ color: "var(--text-secondary)" }}>
                            Protocolo #{String(conversa.protocolo).padStart(4, "0")}
                          </p>
                        </div>

                        <div className="shrink-0 text-[11px] font-semibold" style={{ color: active ? "var(--status-ganho)" : "var(--text-secondary)" }}>
                          {conversationTimeLabel(conversa.updated_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle(safeColor(conversa.canal_color))}>
                          {conversa.canal_label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeTone(conversa.eh_cliente ? "green" : "neutral")}>
                          {conversa.eh_cliente ? "Cliente" : "Não Cliente"}
                        </span>
                        {departamentoConversa && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle(safeColor(departamentoConversa.color))}>
                            {departamentoConversa.name}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeTone(badge.tone)}>
                          {badge.label}
                        </span>
                        {conversa.ia_ativa ? (
                          <Bot className="w-3.5 h-3.5" style={{ color: "var(--status-ganho)" }} />
                        ) : (
                          <User className="w-3.5 h-3.5" style={{ color: "var(--text-faint)" }} />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {!selected ? (
        <div className="flex-1 rounded-[28px] flex flex-col items-center justify-center px-8 text-center min-h-0" style={{ ...inboxPanelStyle, ...inboxCanvasStyle }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
            <MessageSquare className="w-7 h-7" style={{ color: "var(--status-ganho)" }} />
          </div>
          <h3 className="text-xl font-extrabold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
            Selecione uma conversa
          </h3>
          <p className="text-sm mt-2 max-w-md leading-6" style={{ color: "var(--text-secondary)" }}>
            O chat vai abrir aqui com o histórico, status da IA e composer pronto para responder no mesmo fluxo do canal.
          </p>
        </div>
      ) : (
        <section className="flex-1 min-w-0 rounded-[28px] overflow-hidden flex flex-col min-h-0" style={inboxPanelStyle}>
          <div className="px-6 py-4 flex items-center justify-between gap-4 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--primary-bg)", color: "var(--status-ganho)" }}>
                {selected.lead_nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold truncate tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                  {selected.lead_nome}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle(safeColor(selected.canal_color))}>
                    {selected.canal_label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Protocolo #{String(selected.protocolo).padStart(4, "0")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative">
              <button
                onClick={() => toggleIA(selected)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={
                  selected.ia_ativa
                    ? {
                        background: "var(--active-soft-bg)",
                        color: "var(--status-ganho)",
                        border: "1px solid var(--active-soft-border)",
                      }
                    : inboxGhostButtonStyle
                }
              >
                <Bot className="w-3.5 h-3.5" />
                IA {selected.ia_ativa ? "ativada" : "desativada"}
              </button>

              {selected.status !== "resolvido" && selected.assigned_to !== myUserId && (
                <button
                  onClick={() => assumirConversa(selected)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  Assumir
                </button>
              )}

              <button
                onClick={() => setCriarNegocioTick((v) => v + 1)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={inboxGhostButtonStyle}
              >
                Negócio
              </button>

              {selected.status !== "resolvido" && (
                <button
                  onClick={() => setShowTransferirMenu((v) => !v)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  Transferir
                </button>
              )}

              {showTransferirMenu && (
                <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl p-3 space-y-2" style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Transferir para qual departamento?</p>
                  <select
                    value={departamentoEscolhido}
                    onChange={(e) => setDepartamentoEscolhido(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  >
                    <option value="">Selecione um departamento...</option>
                    {departamentos.map((dep) => (
                      <option key={dep.id} value={dep.slug} style={{ background: "var(--surface-solid)" }}>{dep.name}</option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowTransferirMenu(false)} className="px-3 h-8 rounded-lg text-xs" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
                    <button
                      onClick={() => transferirConversa(selected)}
                      disabled={!departamentoEscolhido || transferindo}
                      className="px-3 h-8 rounded-lg text-xs font-bold"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !departamentoEscolhido || transferindo ? 0.6 : 1 }}
                    >
                      {transferindo ? "Transferindo..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}

              {selected.status === "resolvido" ? (
                <span className="px-3 py-2 rounded-xl text-xs font-bold" style={inboxBadgeTone("neutral")}>
                  Resolvido
                </span>
              ) : (
                <button
                  onClick={() => {
                    if (selected.tags.length > 0) setTagEscolhida(selected.tags[0].nome);
                    setShowResolverMenu((v) => !v);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  Marcar como resolvido
                </button>
              )}

              {showResolverMenu && (
                <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl p-3 space-y-2" style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Escolha o motivo (obrigatório)</p>
                  <select
                    value={tagEscolhida}
                    onChange={(e) => setTagEscolhida(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  >
                    <option value="">Selecione uma tag...</option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.nome} style={{ background: "var(--surface-solid)" }}>{t.nome}</option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowResolverMenu(false)} className="px-3 h-8 rounded-lg text-xs" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
                    <button
                      onClick={() => marcarComoResolvido(selected)}
                      disabled={!tagEscolhida || resolvendo}
                      className="px-3 h-8 rounded-lg text-xs font-bold"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !tagEscolhida || resolvendo ? 0.6 : 1 }}
                    >
                      {resolvendo ? "Encerrando..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6 space-y-3" style={inboxCanvasStyle}>
            {msgsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
                  <MessageSquare className="w-6 h-6" style={{ color: "var(--text-faint)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Nenhuma mensagem ainda
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Assim que a conversa receber mensagens, o histórico vai aparecer aqui.
                </p>
              </div>
            ) : (
              mensagens.map((msg: Mensagem) => {
                const isLead = msg.remetente === "lead";
                const tone: "lead" | "humano" | "ia" = isLead ? "lead" : msg.remetente === "ia" ? "ia" : "humano";

                return (
                  <div key={msg.id} className={`flex ${isLead ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-[82%] md:max-w-[74%]">
                      {tone === "ia" && (
                        <div className="flex items-center gap-1.5 mb-1 justify-end">
                          <Bot className="w-3 h-3" style={{ color: "var(--status-ganho)" }} />
                          <span className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>
                            IA
                          </span>
                        </div>
                      )}

                      <div className="rounded-xl overflow-hidden text-sm" style={inboxBubbleStyle(tone)}>
                        <MediaContent msg={msg} tone={tone} />
                      </div>

                      <p className={`text-[10px] mt-1 font-medium ${isLead ? "text-left" : "text-right"}`} style={{ color: "var(--text-secondary)" }}>
                        {timeLabel(msg.created_at)}
                        {!isLead && (msg.enviada ? " · Enviado" : " · Pendente")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
            <div className="rounded-[24px] p-2 flex items-center gap-2" style={inboxComposerStyle}>
              <label
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0"
                style={{
                  background: "var(--ghost-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--chip-border)",
                  cursor: selected.supports_attachments ? "pointer" : "not-allowed",
                  opacity: selected.supports_attachments ? 1 : 0.45,
                }}
              >
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  disabled={!selected.supports_attachments || sending}
                  accept="image/*,audio/*,video/*,application/pdf,.doc,.docx"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !selectedId || !tenantId || !selected.supports_attachments) return;

                    setSending(true);
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("conversa_id", selectedId);
                    formData.append("tenant_id", tenantId);
                    const res = await fetch("/api/inbox/send", { method: "POST", body: formData });
                    if (!res.ok) {
                      const err = await res.json();
                      alert(err.error ?? "Erro ao enviar arquivo");
                    }
                    setSending(false);
                    event.target.value = "";
                  }}
                />
              </label>

              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && handleSend()}
                disabled={!selected.supports_outbound || sending}
                placeholder={
                  !selected.supports_outbound
                    ? `Entrada via ${selected.canal_label}. Resposta manual ativa em breve.`
                    : selected.canal === "email"
                      ? "Escreva o corpo do email..."
                      : "Digite uma mensagem..."
                }
                className="flex-1 h-11 px-3 text-sm outline-none rounded-xl"
                style={{ background: "transparent", border: "none", color: "var(--text-primary)" }}
              />

              <button
                onClick={handleSend}
                disabled={!selected.supports_outbound || !text.trim() || sending}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0"
                style={
                  text.trim() && !sending && selected.supports_outbound
                    ? {
                        background: "var(--status-ganho)",
                        color: "#0a0a0a",
                        boxShadow: "0 10px 18px rgba(21,128,61,0.22)",
                      }
                    : {
                        background: "var(--ghost-bg)",
                        color: "var(--text-faint)",
                        border: "1px solid var(--chip-border)",
                      }
                }
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] mt-2.5 text-center" style={{ color: "var(--text-faint)" }}>
              {selected.supports_outbound
                ? "Enter para enviar · Clipe para anexar imagem, áudio, vídeo ou documento"
                : "Canal em modo inbound-first nesta fase. O histórico segue funcionando normalmente."}
            </p>
          </div>
        </section>
      )}

      {selected && tenantId && (
        <aside className="w-72 shrink-0 rounded-[28px] overflow-hidden hidden xl:flex xl:flex-col min-h-0" style={inboxPanelStyle}>
          <ContactPanel
            conversa={selected}
            tenantId={tenantId}
            allTags={tags}
            novaTag={novaTag}
            setNovaTag={setNovaTag}
            adicionandoTag={adicionandoTag}
            onAdicionarTag={() => adicionarTag(selected)}
            onRemoverTag={(tagId) => removerTag(selected, tagId)}
            criarNegocioSignal={criarNegocioTick}
          />
        </aside>
      )}
    </div>
  );
}

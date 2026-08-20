"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Bot, Check, CheckCheck, ChevronDown, ChevronRight, Clock, Download, FileText, MapPin, MessageSquare, MoreVertical, Paperclip, Reply, Send, User } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/hooks/useTenant";
import { useIsCompact } from "@/hooks/useIsCompact";
import { useConversas, type ConversaWithLead } from "@/hooks/useConversas";
import { useMensagens } from "@/hooks/useMensagens";
import { useConversaPresence } from "@/hooks/useConversaPresence";
import { createClient } from "@/lib/supabase/client";
import { isWindowOpen } from "@/lib/inbox/window";
import { TemplatePickerModal } from "@/components/app/inbox/TemplatePickerModal";
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

const STATUS_LABEL_TICK: Record<string, string> = {
  sending: "Enviando...",
  sent: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  failed: "Falhou",
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

function NavRow({ ativo, cor, label, count, title, onClick }: { ativo: boolean; cor?: string; label: string; count: number; title?: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left"
      style={{
        color: ativo ? (cor ?? "var(--status-ganho)") : "var(--text-secondary)",
        background: ativo ? (cor ? `${cor}14` : "var(--active-soft-bg)") : hovered ? "var(--surface-hover)" : "transparent",
      }}
    >
      <span className="truncate">{label}</span>
      <span className="opacity-70 shrink-0">{count}</span>
    </button>
  );
}

function SecaoAccordion({ titulo, aberta, onToggle, children }: { titulo: string; aberta: boolean; onToggle: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="pt-3 mt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1 mb-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
        style={{
          color: aberta ? "var(--status-ganho)" : hovered ? "var(--text-secondary)" : "var(--text-faint)",
          background: hovered ? "var(--surface-hover)" : "transparent",
        }}
      >
        {titulo}
        {aberta ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {aberta && children}
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxPageInner />
    </Suspense>
  );
}

function InboxPageInner() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const { conversas, loading: conversasLoading } = useConversas(tenantId);
  const safeColor = useContrastSafeColor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { mensagens, loading: msgsLoading } = useMensagens(selectedId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Mensagem | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    function limparRespondendo() {
      setReplyingTo(null);
    }
    limparRespondendo();
  }, [selectedId]);

  useEffect(() => {
    const conversaParam = searchParams.get("conversa");
    if (!conversaParam) return;
    function abrirConversaDoLink() {
      if (conversas.some((c) => c.id === conversaParam)) {
        setSelectedId(conversaParam);
        router.replace("/inbox");
      }
    }
    abrirConversaDoLink();
  }, [searchParams, conversas, router]);
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
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({});

  function toggleSecao(nome: string) {
    setSecoesAbertas((prev) => ({ ...prev, [nome]: !prev[nome] }));
  }

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
  const meuLabel = equipe.find((m) => m.user_id === myUserId)?.email ?? "Você";
  const outrosVendo = useConversaPresence(selectedId, myUserId, meuLabel);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function handleSend() {
    if (!text.trim() || !selectedId || !tenantId || !selected?.supports_outbound) return;

    setSending(true);
    const msg = text.trim();
    const replyToId = replyingTo?.id;
    setText("");
    setReplyingTo(null);

    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversa_id: selectedId,
          conteudo: msg,
          tenant_id: tenantId,
          reply_to_mensagem_id: replyToId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Erro ao enviar mensagem");
        setText(msg);
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleIA(conversa: ConversaWithLead) {
    const supabase = createClient();
    const { error } = await supabase.from("conversas").update({ ia_ativa: !conversa.ia_ativa }).eq("id", conversa.id);
    if (error) toast.error("Erro ao alternar IA: " + error.message);
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
      toast.error(err.error ?? "Erro ao encerrar conversa");
      return;
    }
    setShowResolverMenu(false);
    setTagEscolhida("");
  }

  async function assumirConversa(conversa: ConversaWithLead) {
    if (!myUserId) return;
    const supabase = createClient();
    // UPDATE condicional (CAS): so assume se ninguem pegou primeiro. Se 0
    // linhas forem afetadas, outro atendente ja assumiu entre a renderizacao
    // da tela e o clique - busca quem foi e avisa em vez de sobrescrever.
    const { data, error } = await supabase
      .from("conversas")
      .update({
        assigned_to: myUserId,
        dispatch_status: "atribuido",
        assigned_at: new Date().toISOString(),
        ia_ativa: false,
        agente_respondeu: false,
      })
      .eq("id", conversa.id)
      .is("assigned_to", null)
      .neq("status", "resolvido")
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error("Erro ao assumir conversa. Tente novamente.");
      return;
    }
    if (!data) {
      const { data: atual } = await supabase.from("conversas").select("assigned_to, status").eq("id", conversa.id).maybeSingle();
      const atualRow = atual as { assigned_to: string | null; status: string } | null;
      if (atualRow?.status === "resolvido") {
        toast.error("Essa conversa já foi resolvida.");
      } else {
        const dono = equipe.find((m) => m.user_id === atualRow?.assigned_to);
        toast.error(dono ? `Essa conversa já foi assumida por ${dono.email ?? "outro atendente"}.` : "Essa conversa já foi assumida por outro atendente.");
      }
    }
  }

  const [showTransferirMenu, setShowTransferirMenu] = useState(false);
  const [departamentoEscolhido, setDepartamentoEscolhido] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isCompact = useIsCompact();
  const headerActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (headerActionsRef.current && !headerActionsRef.current.contains(event.target as Node)) {
        setShowTransferirMenu(false);
        setShowResolverMenu(false);
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

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
      toast.error(err.error ?? "Erro ao transferir conversa");
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

  const FILTROS_STATUS: { id: FiltroInbox; label: string; count: number }[] = [
    { id: "todas", label: "Todas", count: conversasAtivas.length },
    { id: "minhas", label: "Minhas", count: contagemMinhas },
    { id: "novas_atribuicoes", label: "Novas atribuições", count: contagemNovasAtribuicoes },
    { id: "nao_respondidas", label: "Não respondidas", count: contagemNaoRespondidas },
    { id: "aguardando_cliente", label: "Aguardando cliente", count: contagemAguardandoCliente },
    { id: "sla_excedido", label: "SLA Excedido", count: contagemSlaExcedido },
    { id: "nao_atribuidas", label: "Não atribuídas", count: contagemNaoAtribuidas },
    { id: "fila_ia", label: "Fila IA", count: contagemFilaIA },
    { id: "fila_humana", label: "Fila Humana", count: contagemFilaHumana },
  ];

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 overflow-hidden" style={inboxPageStyle}>
      <aside className="w-[210px] shrink-0 rounded-[28px] overflow-hidden flex flex-col min-h-0" style={inboxPanelStyle}>
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
          <h2 className="text-base font-extrabold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
            Conversas
          </h2>
          <Link href="/inbox/queue" className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full w-full" style={inboxBadgeTone("yellow")}>
            <Clock className="w-3 h-3" />
            Fila
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {FILTROS_STATUS.map((item) => (
            <NavRow key={item.id} ativo={filtro === item.id} label={item.label} count={item.count} onClick={() => setFiltro(item.id)} />
          ))}

          <div className="pt-1.5 mt-1.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <NavRow ativo={filtro === "encerradas"} cor="var(--text-secondary)" label="Encerradas" count={contagemEncerradas} onClick={() => setFiltro("encerradas")} />
          </div>

          {departamentos.length > 0 && (
            <SecaoAccordion titulo="Departamentos" aberta={!!secoesAbertas.departamentos} onToggle={() => toggleSecao("departamentos")}>
              <NavRow ativo={!departamentoFiltro} label="Todos deptos" count={conversasAtivas.length} onClick={() => setDepartamentoFiltro(null)} />
              <div className="max-h-64 overflow-y-auto pr-1">
                {departamentos.map((dep) => (
                  <NavRow key={dep.id} ativo={departamentoFiltro === dep.id} cor={safeColor(dep.color)} label={dep.name} count={contagemPorDepartamento.get(dep.id) ?? 0} onClick={() => setDepartamentoFiltro(dep.id)} />
                ))}
              </div>
            </SecaoAccordion>
          )}

          {tags.length > 0 && (
            <SecaoAccordion titulo="Tags" aberta={!!secoesAbertas.tags} onToggle={() => toggleSecao("tags")}>
              <NavRow ativo={!tagFiltro} label="Todas as tags" count={conversasAtivas.length} onClick={() => setTagFiltro(null)} />
              <div className="max-h-64 overflow-y-auto pr-1">
                {tags.map((tag) => (
                  <NavRow key={tag.id} ativo={tagFiltro === tag.id} cor={safeColor(tag.cor)} label={tag.nome} count={contagemPorTag.get(tag.id) ?? 0} onClick={() => setTagFiltro(tag.id)} />
                ))}
              </div>
            </SecaoAccordion>
          )}

          {equipe.length > 0 && (
            <SecaoAccordion titulo="Por atendente" aberta={!!secoesAbertas.atendentes} onToggle={() => toggleSecao("atendentes")}>
              <NavRow ativo={!atendenteFiltro} label="Todos atendentes" count={conversasAtivas.length} onClick={() => setAtendenteFiltro(null)} />
              <div className="max-h-64 overflow-y-auto pr-1">
                {equipe.map((membro) => (
                  <NavRow
                    key={membro.id}
                    ativo={atendenteFiltro === membro.user_id}
                    cor={membro.availability_status === "online" ? "var(--badge-green-fg)" : membro.availability_status === "away" ? "var(--badge-yellow-fg)" : undefined}
                    label={membro.email ?? membro.user_id ?? "?"}
                    title={AVAILABILITY_LABEL[membro.availability_status ?? "offline"] ?? membro.availability_status ?? undefined}
                    count={contagemPorAtendente.get(membro.user_id ?? "") ?? 0}
                    onClick={() => setAtendenteFiltro(membro.user_id ?? null)}
                  />
                ))}
              </div>
            </SecaoAccordion>
          )}
        </div>
      </aside>

      <aside className="w-[260px] xl:w-[280px] shrink-0 rounded-[28px] overflow-hidden flex flex-col min-h-0" style={inboxPanelStyle}>
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
          <h2 className="text-lg font-extrabold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
            {FILTROS_STATUS.find((f) => f.id === filtro)?.label ?? (filtro === "encerradas" ? "Encerradas" : "Conversas")}
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Conversas do WhatsApp, Instagram e canais conectados
          </p>
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
                  className="group w-full px-4 py-3.5 text-left"
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
                          <p
                            className="text-[15px] font-bold truncate group-hover:underline"
                            style={{ color: active ? "var(--status-ganho)" : "var(--text-primary)" }}
                          >
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
          <div className="px-6 py-4 flex items-center justify-between gap-4 shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
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
                  {outrosVendo.length > 0 && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(250,204,21,0.12)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)" }}
                      title={outrosVendo.map((v) => v.label).join(", ")}
                    >
                      {outrosVendo.length === 1 ? `${outrosVendo[0].label} também está vendo` : `${outrosVendo.length} atendentes também vendo`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div ref={headerActionsRef} className="flex items-center gap-2 shrink-0 relative">
              <button
                onClick={() => toggleIA(selected)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${selected.ia_ativa ? "" : "inbox-ghost-btn"}`}
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

              {!isCompact && selected.status === "resolvido" && (
                <a
                  href={`/api/conversas/${selected.id}/export?tenant_id=${tenantId}`}
                  download
                  title="Baixar conversa (.txt)"
                  className="inbox-ghost-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
              )}

              {!isCompact && selected.status !== "resolvido" && selected.assigned_to !== myUserId && (
                <button
                  onClick={() => assumirConversa(selected)}
                  className="inbox-ghost-btn px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  Assumir
                </button>
              )}

              {!isCompact && (
                <button
                  onClick={() => setCriarNegocioTick((v) => v + 1)}
                  className="inbox-ghost-btn px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  Negócio
                </button>
              )}

              {!isCompact && selected.status !== "resolvido" && (
                <button
                  onClick={() => setShowTransferirMenu((v) => !v)}
                  className="inbox-ghost-btn px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  Transferir
                </button>
              )}

              {isCompact && (
                <button
                  onClick={() => setShowMoreMenu((v) => !v)}
                  title="Mais ações"
                  className="inbox-ghost-btn w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all"
                  style={inboxGhostButtonStyle}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}

              {isCompact && showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 z-20 w-56 rounded-xl p-1.5 space-y-0.5" style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
                  {selected.status === "resolvido" && (
                    <a
                      href={`/api/conversas/${selected.id}/export?tenant_id=${tenantId}`}
                      download
                      onClick={() => setShowMoreMenu(false)}
                      className="inbox-menu-item flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar conversa
                    </a>
                  )}
                  {selected.status !== "resolvido" && selected.assigned_to !== myUserId && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        assumirConversa(selected);
                      }}
                      className="inbox-menu-item w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Assumir
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setCriarNegocioTick((v) => v + 1);
                    }}
                    className="inbox-menu-item w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Negócio
                  </button>
                  {selected.status !== "resolvido" && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowTransferirMenu((v) => !v);
                      }}
                      className="inbox-menu-item w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Transferir
                    </button>
                  )}
                </div>
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
                    <button onClick={() => setShowTransferirMenu(false)} className="inbox-ghost-btn px-3 h-8 rounded-lg text-xs transition-all" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
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
                  className="inbox-ghost-btn px-3 py-2 rounded-xl text-xs font-bold transition-all"
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
                    <button onClick={() => setShowResolverMenu(false)} className="inbox-ghost-btn px-3 h-8 rounded-lg text-xs transition-all" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
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
                const quoted = msg.reply_to_mensagem_id ? mensagens.find((m) => m.id === msg.reply_to_mensagem_id) : null;

                return (
                  <div
                    key={msg.id}
                    className={`flex group ${isLead ? "justify-start" : "justify-end"}`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId((v) => (v === msg.id ? null : v))}
                  >
                    <div className={`flex items-center gap-1.5 ${isLead ? "order-2" : "order-1"}`}>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        title="Responder"
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-opacity"
                        style={{
                          opacity: hoveredMsgId === msg.id ? 1 : 0,
                          background: "var(--ghost-bg)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                    </div>
                    <div className={`max-w-[82%] md:max-w-[74%] ${isLead ? "order-1" : "order-2"}`}>
                      {tone === "ia" && (
                        <div className="flex items-center gap-1.5 mb-1 justify-end">
                          <Bot className="w-3 h-3" style={{ color: "var(--status-ganho)" }} />
                          <span className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>
                            IA
                          </span>
                        </div>
                      )}

                      {quoted && (
                        <div
                          className="rounded-lg px-2.5 py-1.5 mb-1 text-xs border-l-2"
                          style={{ background: "var(--surface-soft)", borderColor: "var(--status-ganho)", color: "var(--text-secondary)" }}
                        >
                          <p className="font-bold text-[10px]" style={{ color: "var(--status-ganho)" }}>
                            {quoted.remetente === "lead" ? selected.lead_nome : quoted.remetente === "ia" ? "IA" : "Atendente"}
                          </p>
                          <p className="truncate">{quoted.conteudo}</p>
                        </div>
                      )}
                      {msg.reply_to_mensagem_id && !quoted && (
                        <div
                          className="rounded-lg px-2.5 py-1.5 mb-1 text-xs border-l-2 italic"
                          style={{ background: "var(--surface-soft)", borderColor: "var(--border-strong)", color: "var(--text-faint)" }}
                        >
                          Mensagem anterior
                        </div>
                      )}

                      <div className="rounded-xl overflow-hidden text-sm" style={inboxBubbleStyle(tone)}>
                        <MediaContent msg={msg} tone={tone} />
                      </div>

                      <p className={`text-[10px] mt-1 font-medium flex items-center gap-1 ${isLead ? "text-left" : "text-right justify-end"}`} style={{ color: "var(--text-secondary)" }}>
                        {timeLabel(msg.created_at)}
                        {!isLead && (
                          msg.status ? (
                            <span className="flex items-center" title={STATUS_LABEL_TICK[msg.status]}>
                              {msg.status === "read" ? (
                                <CheckCheck className="w-3 h-3" style={{ color: "var(--status-contato)" }} />
                              ) : msg.status === "delivered" ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : msg.status === "failed" ? (
                                <span className="text-[10px]">Falhou</span>
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          ) : (
                            <span>{msg.enviada ? "· Enviado" : "· Pendente"}</span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-panel)" }}>
            {replyingTo && (
              <div
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 mb-2 border-l-2 text-xs"
                style={{ background: "var(--surface-soft)", borderColor: "var(--status-ganho)", color: "var(--text-secondary)" }}
              >
                <div className="min-w-0">
                  <p className="font-bold text-[10px]" style={{ color: "var(--status-ganho)" }}>
                    Respondendo a {replyingTo.remetente === "lead" ? selected.lead_nome : replyingTo.remetente === "ia" ? "IA" : "Atendente"}
                  </p>
                  <p className="truncate">{replyingTo.conteudo}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="shrink-0 text-sm font-bold" style={{ color: "var(--text-faint)" }}>×</button>
              </div>
            )}
            {selected.canal === "whatsapp" && selected.supports_outbound && !isWindowOpen(selected) ? (
              <div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Janela de 24h fechada — envie um template pra reabrir a conversa.
                </p>
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className="shrink-0 h-9 px-4 rounded-lg text-xs font-bold"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  Enviar template
                </button>
              </div>
            ) : (
              <>
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
                          const err = await res.json().catch(() => ({}));
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
              </>
            )}
          </div>
        </section>
      )}

      {showTemplatePicker && selected && tenantId && (
        <TemplatePickerModal
          tenantId={tenantId}
          conversaId={selected.id}
          onClose={() => setShowTemplatePicker(false)}
          onEnviado={() => setShowTemplatePicker(false)}
        />
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

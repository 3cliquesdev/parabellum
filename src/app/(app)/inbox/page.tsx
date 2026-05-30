"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, MessageSquare, Paperclip, FileText, MapPin, Clock, UserCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/hooks/useTenant";
import { useConversas, type ConversaWithLead } from "@/hooks/useConversas";
import { useMensagens } from "@/hooks/useMensagens";
import { createClient } from "@/lib/supabase/client";
import type { Mensagem } from "@/types/database";

const DISPATCH_BADGE: Record<string, { label: string; color: string }> = {
  ia:       { label: "IA",       color: "#9aea62" },
  atribuido:{ label: "Atribuído", color: "#60a5fa" },
  fila:     { label: "Na fila",  color: "#facc15" },
  resolvido:{ label: "Resolvido", color: "#939da4" },
};

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function MediaContent({ msg, isLead, isIA }: { msg: Mensagem; isLead: boolean; isIA: boolean }) {
  const textColor = isLead ? "#f9f6ec" : isIA ? "#9aea62" : "#0a0a0a";
  const pad = "px-4 py-2.5";

  if (msg.media_type === "image" || msg.media_type === "sticker") {
    return (
      <div>
        <img src={msg.media_url!} alt="imagem" className="max-w-full rounded-xl block"
          style={{ maxWidth: 280, maxHeight: 300, objectFit: "cover" }} />
        {msg.media_caption && (
          <p className={`${pad} text-sm`} style={{ color: textColor }}>{msg.media_caption}</p>
        )}
      </div>
    );
  }
  if (msg.media_type === "audio") {
    return (
      <div className={pad}>
        <audio controls src={msg.media_url!} className="w-full" style={{ maxWidth: 260, height: 36 }} />
      </div>
    );
  }
  if (msg.media_type === "video") {
    return (
      <div>
        <video controls src={msg.media_url!} className="max-w-full rounded-xl block"
          style={{ maxWidth: 280, maxHeight: 200 }} />
        {msg.media_caption && (
          <p className={`${pad} text-sm`} style={{ color: textColor }}>{msg.media_caption}</p>
        )}
      </div>
    );
  }
  if (msg.media_type === "document") {
    return (
      <a href={msg.media_url!} target="_blank" rel="noopener noreferrer"
        className={`${pad} flex items-center gap-2.5 no-underline`} style={{ color: textColor }}>
        <FileText className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium truncate">{msg.media_nome || "Documento"}</span>
      </a>
    );
  }
  if (msg.media_type === "location" && msg.latitude && msg.longitude) {
    return (
      <a href={`https://maps.google.com/?q=${msg.latitude},${msg.longitude}`}
        target="_blank" rel="noopener noreferrer"
        className={`${pad} flex items-center gap-2 no-underline`} style={{ color: textColor }}>
        <MapPin className="w-4 h-4 shrink-0" />
        <span className="text-sm">Ver localização</span>
      </a>
    );
  }
  return <p className={`${pad} text-sm`} style={{ color: textColor }}>{msg.conteudo}</p>;
}

export default function InboxPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const { conversas, loading: conversasLoading } = useConversas(tenantId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { mensagens, loading: msgsLoading } = useMensagens(selectedId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [filtro, setFiltro] = useState<"minhas" | "todas">("minhas");
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>("member");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMyUserId(user.id);
      if (tenantId) {
        const { data: tm } = await supabase.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", user.id).single() as { data: any };
        setMyRole(tm?.role ?? "member");
      }
    });
  }, [tenantId]);

  // Filtrar conversas por agente
  const conversasFiltradas = filtro === "minhas" && myUserId
    ? conversas.filter(c => (c as any).assigned_to === myUserId || !(c as any).assigned_to)
    : conversas;

  const selected = conversas.find(c => c.id === selectedId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function handleSend() {
    if (!text.trim() || !selectedId || !tenantId) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversa_id: selectedId, conteudo: msg, tenant_id: tenantId }),
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

  if (tenantLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Lista de conversas */}
      <aside className="w-72 shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Inbox</h2>
            <Link href="/inbox/queue" className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
              <Clock className="w-3 h-3" /> Fila
            </Link>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {[
              { id: "minhas", label: "Minhas" },
              ...((myRole === "owner" || myRole === "admin") ? [{ id: "todas", label: "Todas" }] : []),
            ].map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id as typeof filtro)}
                className="px-3 h-6 rounded-full text-[10px] font-bold transition-all"
                style={filtro === f.id
                  ? { background: "rgba(154,234,98,0.15)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.25)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.07)" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversasLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
              <p className="text-xs" style={{ color: "#939da4" }}>
                {filtro === "minhas" ? "Nenhuma conversa atribuída a você." : "Nenhuma conversa ainda."}
              </p>
            </div>
          ) : (
            conversasFiltradas.map(c => {
              const dispatch = (c as any).dispatch_status ?? "ia";
              const badge = DISPATCH_BADGE[dispatch] ?? DISPATCH_BADGE.ia;
              return (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{
                  background: selectedId === c.id ? "rgba(154,234,98,0.06)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: selectedId === c.id ? "2px solid #9aea62" : "2px solid transparent",
                }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                  {c.lead_nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white truncate">{c.lead_nome}</p>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: badge.color, background: `${badge.color}15` }}>{badge.label}</span>
                      {c.ia_ativa
                        ? <Bot className="w-3 h-3" style={{ color: "#9aea62" }} />
                        : <User className="w-3 h-3" style={{ color: "#939da4" }} />}
                    </div>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "#939da4" }}>
                    {c.lead_whatsapp ?? "Sem número"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <MessageSquare className="w-12 h-12" style={{ color: "rgba(147,157,164,0.2)" }} />
          <p className="text-sm" style={{ color: "#939da4" }}>Selecione uma conversa</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d0d" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                {selected.lead_nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{selected.lead_nome}</p>
                <p className="text-xs" style={{ color: "#939da4" }}>{selected.lead_whatsapp ?? "WhatsApp"}</p>
              </div>
            </div>
            <button onClick={() => toggleIA(selected)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={selected.ia_ativa
                ? { background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }
                : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Bot className="w-3.5 h-3.5" />
              IA {selected.ia_ativa ? "ativa" : "desativada"}
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {msgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "#939da4" }}>Nenhuma mensagem ainda.</p>
              </div>
            ) : (
              mensagens.map((msg: Mensagem) => {
                const isLead = msg.remetente === "lead";
                const isIA = msg.remetente === "ia";
                return (
                  <div key={msg.id} className={`flex ${isLead ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-[70%]">
                      {isIA && (
                        <div className="flex items-center gap-1 mb-1 justify-end">
                          <Bot className="w-3 h-3" style={{ color: "#9aea62" }} />
                          <span className="text-[10px] font-bold" style={{ color: "#9aea62" }}>IA</span>
                        </div>
                      )}
                      <div className="rounded-2xl overflow-hidden text-sm"
                        style={isLead ? {
                          background: "rgba(255,255,255,0.06)",
                          color: "#f9f6ec",
                          borderRadius: "4px 18px 18px 18px",
                        } : {
                          background: isIA ? "rgba(154,234,98,0.12)" : "#9aea62",
                          color: isIA ? "#9aea62" : "#0a0a0a",
                          borderRadius: "18px 4px 18px 18px",
                        }}>
                        <MediaContent msg={msg} isLead={isLead} isIA={isIA} />
                      </div>
                      <p className={`text-[10px] mt-1 ${isLead ? "text-left" : "text-right"}`}
                        style={{ color: "rgba(147,157,164,0.4)" }}>
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

          {/* Input */}
          <div className="px-6 py-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              {/* Botão de anexo */}
              <label className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", color: "#939da4" }}>
                <Paperclip className="w-4 h-4" />
                <input type="file" className="hidden"
                  accept="image/*,audio/*,video/*,application/pdf,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedId || !tenantId) return;
                    setSending(true);
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("conversa_id", selectedId);
                    fd.append("tenant_id", tenantId);
                    const res = await fetch("/api/whatsapp/send", { method: "POST", body: fd });
                    if (!res.ok) { const e = await res.json(); alert(e.error ?? "Erro ao enviar arquivo"); }
                    setSending(false);
                    e.target.value = "";
                  }} />
              </label>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-10 px-4 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
                style={{
                  background: text.trim() && !sending ? "#9aea62" : "rgba(255,255,255,0.06)",
                  color: text.trim() && !sending ? "#0a0a0a" : "#939da4",
                }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(147,157,164,0.3)" }}>
              Enter para enviar · Clipe para anexar imagem, áudio, vídeo ou documento
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

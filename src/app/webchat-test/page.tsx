"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Mensagem {
  id: string;
  remetente: "lead" | "ia" | "humano";
  conteudo: string;
  created_at: string;
}

const DEFAULT_TENANT_ID = "1d47398e-9d3a-46b2-ac76-b0a3ca09afc4";

function getVisitorId() {
  const key = "webchat_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function WebchatTestPage() {
  return (
    <Suspense fallback={null}>
      <WebchatTestInner />
    </Suspense>
  );
}

function WebchatTestInner() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenant_id") ?? DEFAULT_TENANT_ID;
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => setVisitorId(getVisitorId()));
  }, []);

  useEffect(() => {
    if (!conversaId || !visitorId) return;
    const poll = async () => {
      const r = await fetch(`/api/webchat/messages?tenant_id=${tenantId}&conversa_id=${conversaId}&visitor_id=${visitorId}`);
      if (r.ok) {
        const d = await r.json();
        setMensagens(d.mensagens ?? []);
      }
    };
    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [conversaId, visitorId, tenantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function sendMessage() {
    if (!input.trim() || !visitorId || sending) return;
    setSending(true);
    const texto = input;
    setInput("");
    const r = await fetch("/api/webchat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, visitor_id: visitorId, mensagem: texto }),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.conversa_id) setConversaId(d.conversa_id);
      setMensagens((prev) => [...prev, { id: `local-${Date.now()}`, remetente: "lead", conteudo: texto, created_at: new Date().toISOString() }]);
    }
    setSending(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 380, height: 560, background: "#151515", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Chat de teste — Parabellum</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
            {conversaId ? `Conversa ${conversaId.slice(0, 8)}` : "Envie uma mensagem para começar"}
          </p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {mensagens.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              Nenhuma mensagem ainda. Manda um &quot;oi&quot; pra testar o agente.
            </p>
          )}
          {mensagens.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.remetente === "lead" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: m.remetente === "lead" ? "#9aea62" : "#262626",
                color: m.remetente === "lead" ? "#0a0a0a" : "#fff",
                padding: "8px 12px",
                borderRadius: 12,
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.conteudo}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Digite sua mensagem..."
            style={{ flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{ background: "#9aea62", color: "#0a0a0a", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, opacity: sending ? 0.6 : 1, cursor: "pointer" }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

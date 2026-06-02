"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ThumbsUp, ThumbsDown, BookOpen } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import { GoogleAuth } from "google-auth-library";

interface SandboxMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  kbArticles?: { titulo: string; categoria: string; similarity: number }[];
  feedback?: "positivo" | "negativo";
}

export default function SandboxPage() {
  const { tenantId } = useTenant();
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kbEnabled, setKbEnabled] = useState(true);
  const [showKbPanel, setShowKbPanel] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  async function sendMessage() {
    if (!input.trim() || !tenantId || loading) return;
    const userMsg: SandboxMessage = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, message: userMsg.content, history: messages, kb_enabled: kbEnabled }),
      });
      const data = await res.json();
      const assistantMsg: SandboxMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply ?? "Sem resposta.",
        kbArticles: data.kb_articles ?? [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Erro ao gerar resposta." }]);
    } finally {
      setLoading(false);
    }
  }

  async function saveFeedback(msgId: string, tipo: "positivo" | "negativo") {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: tipo } : m));
    // TODO: salvar em ai_feedback via API
  }

  async function saveAsTraining(msg: SandboxMessage) {
    const userMsg = messages[messages.indexOf(msg) - 1];
    if (!userMsg || !tenantId) return;
    const supabase = createClient();
    await supabase.from("training_examples").insert({
      tenant_id: tenantId, input_text: userMsg.content,
      output_text: msg.content, cenario: "normal",
    });
    alert("Salvo como exemplo de treinamento!");
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex-1 flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Sandbox — Testar IA</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {[
                { n: "1", label: "Configure Persona + KB" },
                { n: "2", label: "Teste aqui" },
                { n: "3", label: "Boa resposta? → Salvar como treino" },
                { n: "4", label: "Ruim? Ajuste e repita" },
              ].map(({ n, label }) => (
                <div key={n} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{ background: "rgba(154,234,98,0.15)", color: "var(--status-ganho)" }}>{n}</span>
                  <span className="text-xs" style={{ color: "rgba(147,157,164,0.6)" }}>{label}</span>
                  {n !== "4" && <span className="text-[10px]" style={{ color: "rgba(147,157,164,0.2)" }}>›</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowKbPanel(!showKbPanel)}
              className="flex items-center gap-2 px-3 h-8 rounded-xl text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              <BookOpen className="w-3.5 h-3.5" /> KB
            </button>
            <button onClick={() => setKbEnabled(!kbEnabled)}
              className="flex items-center gap-2 px-3 h-8 rounded-xl text-xs font-bold"
              style={kbEnabled ? { background: "rgba(154,234,98,0.1)", color: "var(--status-ganho)", border: "1px solid rgba(154,234,98,0.2)" }
                : { background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              KB {kbEnabled ? "Ativada" : "Desativada"}
            </button>
            <button onClick={() => setMessages([])}
              className="px-3 h-8 rounded-xl text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
              Limpar
            </button>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Bot className="w-12 h-12" style={{ color: "rgba(154,234,98,0.3)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Envie uma mensagem para testar a IA</p>
              <p className="text-xs max-w-sm" style={{ color: "rgba(147,157,164,0.5)" }}>
                As respostas usam a persona, KB e exemplos de treinamento configurados
              </p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot className="w-3.5 h-3.5" style={{ color: "var(--status-ganho)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>IA</span>
                    {msg.kbArticles && msg.kbArticles.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                        {msg.kbArticles.length} artigo(s) KB
                      </span>
                    )}
                  </div>
                )}
                <div className="px-4 py-2.5 rounded-2xl text-sm"
                  style={msg.role === "user"
                    ? { background: "#9aea62", color: "#0a0a0a", borderRadius: "18px 4px 18px 18px" }
                    : { ...cardStyle, borderRadius: "4px 18px 18px 18px" }}>
                  <p style={{ color: msg.role === "user" ? "#0a0a0a" : "#f9f6ec" }}>{msg.content}</p>
                </div>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-1.5 justify-end">
                    <button onClick={() => saveFeedback(msg.id, "positivo")}
                      style={{ color: msg.feedback === "positivo" ? "#9aea62" : "rgba(147,157,164,0.4)" }}>
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => saveFeedback(msg.id, "negativo")}
                      style={{ color: msg.feedback === "negativo" ? "#f87171" : "rgba(147,157,164,0.4)" }}>
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => saveAsTraining(msg)}
                      className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                      style={{ color: "rgba(147,157,164,0.5)", background: "rgba(255,255,255,0.04)" }}>
                      Salvar como treino
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl" style={{ ...cardStyle, borderRadius: "4px 18px 18px 18px" }}>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#9aea62", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Digite uma mensagem de teste..."
            className="flex-1 h-11 px-4 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{ background: input.trim() && !loading ? "#9aea62" : "rgba(255,255,255,0.06)", color: input.trim() && !loading ? "#0a0a0a" : "#939da4" }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

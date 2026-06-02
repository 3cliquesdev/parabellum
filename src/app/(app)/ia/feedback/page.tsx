"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

export default function FeedbackPage() {
  const { tenantId } = useTenant();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "positivo" | "negativo">("all");

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ai_feedback")
        .select("*, mensagens(conteudo, remetente)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);
      setFeedbacks(data ?? []);
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const filtered = feedbacks.filter(f => filter === "all" || f.tipo === filter);
  const pos = feedbacks.filter(f => f.tipo === "positivo").length;
  const neg = feedbacks.filter(f => f.tipo === "negativo").length;
  const total = feedbacks.length;
  const rate = total > 0 ? Math.round((pos / total) * 100) : 0;

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Feedback da IA</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Avaliações das respostas automáticas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Aprovação", value: `${rate}%`, color: "var(--status-ganho)" },
          { label: "Positivos", value: pos, color: "var(--status-ganho)", icon: ThumbsUp },
          { label: "Negativos", value: neg, color: "#f87171", icon: ThumbsDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
            {Icon && <Icon className="w-4 h-4 mb-3" style={{ color }} />}
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[["all","Todos"], ["positivo","Positivos"], ["negativo","Negativos"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v as typeof filter)}
            className="px-4 h-8 rounded-xl text-xs font-bold"
            style={filter === v
              ? { background: "rgba(154,234,98,0.1)", color: "var(--status-ganho)", border: "1px solid rgba(154,234,98,0.2)" }
              : { background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum feedback ainda.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(147,157,164,0.4)" }}>O feedback aparece quando agentes avaliam respostas no Inbox.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <div key={f.id} className="flex items-start gap-4 p-4 rounded-xl"
              style={{ background: "var(--surface-gradient)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: f.tipo === "positivo" ? "rgba(154,234,98,0.1)" : "rgba(248,113,113,0.1)" }}>
                {f.tipo === "positivo"
                  ? <ThumbsUp className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
                  : <ThumbsDown className="w-4 h-4" style={{ color: "#f87171" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{f.mensagens?.conteudo ?? "Resposta da IA"}</p>
                {f.comentario && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>"{f.comentario}"</p>}
                <p className="text-[10px] mt-1.5" style={{ color: "rgba(147,157,164,0.4)" }}>
                  {new Date(f.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

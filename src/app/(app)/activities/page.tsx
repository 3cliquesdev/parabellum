"use client";

import { useEffect, useState } from "react";
import { Check, Clock, MessageSquare } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Atividade, AtividadeTipo } from "@/types/database";

interface AtividadeRow extends Atividade {
  leads?: {
    nome?: string | null;
  } | null;
}

const TIPO_LABEL: Record<AtividadeTipo, string> = {
  ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", reuniao: "Reunião", outro: "Outro",
};
const TIPO_COLOR: Record<AtividadeTipo, string> = {
  ligacao: "#60a5fa", whatsapp: "#9aea62", email: "#a78bfa", reuniao: "#fb923c", outro: "#939da4",
};

export default function ActivitiesPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [atividades, setAtividades] = useState<(Atividade & { lead_nome?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");

  useEffect(() => {
    queueMicrotask(() => {
      if (!tenantLoading && tenantId) {
        void fetchAtividades();
        return;
      }

      if (!tenantLoading) {
        setLoading(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tenantLoading]);

  async function fetchAtividades() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("atividades")
      .select("*, leads(nome)")
      .eq("tenant_id", tenantId!)
      .order("prazo", { ascending: true, nullsFirst: false });
    const rows = (data ?? []) as unknown as AtividadeRow[];
    setAtividades(rows.map((a) => ({
      ...a, lead_nome: a.leads?.nome ?? undefined,
    })));
    setLoading(false);
  }

  async function toggleDone(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("atividades").update({
      concluida: !current,
      concluida_em: !current ? new Date().toISOString() : null,
    }).eq("id", id);
    fetchAtividades();
  }

  const filtered = atividades.filter(a =>
    filter === "all" ? true : filter === "pending" ? !a.concluida : a.concluida
  );

  if (tenantLoading || loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Atividades</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>
            {atividades.filter(a => !a.concluida).length} pendentes · {atividades.filter(a => a.concluida).length} concluídas
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[["all","Todas"], ["pending","Pendentes"], ["done","Concluídas"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v as typeof filter)}
            className="px-4 h-8 rounded-xl text-xs font-bold transition-all"
            style={filter === v
              ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)", boxShadow: "0 6px 18px rgba(21,128,61,0.08)" }
              : { background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid var(--border-subtle)" }}>
            <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhuma atividade aqui.</p>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl transition-colors"
            style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
            <button onClick={() => toggleDone(a.id, a.concluida)}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
              style={a.concluida
                ? { background: "var(--status-ganho)", borderColor: "var(--status-ganho)" }
                : { background: "transparent", borderColor: "var(--border-strong)" }}>
              {a.concluida && <Check className="w-3 h-3 text-black" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${a.concluida ? "line-through opacity-50" : "text-white"}`}>{a.titulo}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{a.lead_nome ?? "Sem lead"}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: TIPO_COLOR[a.tipo], background: `${TIPO_COLOR[a.tipo]}15` }}>
                {TIPO_LABEL[a.tipo]}
              </span>
              {a.prazo && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {new Date(a.prazo).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

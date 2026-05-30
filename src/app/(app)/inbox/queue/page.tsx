"use client";

import { useEffect, useState } from "react";
import { Clock, Users, Zap } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

function tempoNaFila(queuedAt: string) {
  const diff = Date.now() - new Date(queuedAt).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

const DEPT_COLOR: Record<string, string> = { vendas: "#9aea62", suporte: "#60a5fa" };

export default function InboxQueuePage() {
  const { tenantId } = useTenant();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assuming, setAssuming] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setMyUserId(user?.id ?? null));

    async function load() {
      const { data } = await supabase
        .from("conversation_queue")
        .select("*, conversas(id, lead_id, departamento_alvo, leads(nome, whatsapp))")
        .eq("tenant_id", tenantId!)
        .is("assigned_at", null)
        .order("prioridade", { ascending: false })
        .order("queued_at", { ascending: true });
      setQueue(data ?? []);
      setLoading(false);
    }
    load();

    // Realtime
    const channel = supabase.channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_queue", filter: `tenant_id=eq.${tenantId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  async function assumir(item: any) {
    if (!myUserId || !tenantId) return;
    setAssuming(item.id);
    const supabase = createClient();

    // Atribuir a mim mesmo
    await supabase.from("conversas").update({
      assigned_to: myUserId,
      dispatch_status: "atribuido",
      assigned_at: new Date().toISOString(),
    }).eq("id", item.conversa_id);

    await supabase.from("conversation_queue").update({ assigned_at: new Date().toISOString() }).eq("id", item.id);
    await supabase.from("tenant_members").update({ ultima_atribuicao: new Date().toISOString() }).eq("tenant_id", tenantId).eq("user_id", myUserId);

    setQueue(q => q.filter(x => x.id !== item.id));
    setAssuming(null);
  }

  const vendas = queue.filter(i => i.departamento === "vendas");
  const suporte = queue.filter(i => i.departamento === "suporte");

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-[-0.02em]">Fila de espera</h2>
          <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>Conversas aguardando atendente disponível</p>
        </div>
        <div className="flex gap-2">
          {[{ label: "Vendas", count: vendas.length, color: "#9aea62" }, { label: "Suporte", count: suporte.length, color: "#60a5fa" }].map(d => (
            <div key={d.label} className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: `${d.color}10`, color: d.color, border: `1px solid ${d.color}20` }}>
              {d.count} {d.label}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : queue.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white">Fila vazia</p>
          <p className="text-xs mt-1" style={{ color: "#939da4" }}>Todos os leads estão sendo atendidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map(item => {
            const lead = item.conversas?.leads;
            const dept = item.departamento ?? "vendas";
            return (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl" style={cardStyle}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${DEPT_COLOR[dept]}15`, color: DEPT_COLOR[dept] }}>
                  {(lead?.nome ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{lead?.nome ?? "Lead desconhecido"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                      style={{ color: DEPT_COLOR[dept], background: `${DEPT_COLOR[dept]}15` }}>{dept}</span>
                    {item.motivo && <span className="text-[10px]" style={{ color: "#939da4" }}>{item.motivo.replace("_", " ")}</span>}
                    {item.prioridade > 0 && <span className="text-[10px] font-bold" style={{ color: "#f87171" }}>Alta prioridade</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: "rgba(147,157,164,0.5)" }}>
                  <Clock className="w-3 h-3" />
                  {tempoNaFila(item.queued_at)}
                </div>
                <button onClick={() => assumir(item)} disabled={assuming === item.id}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold shrink-0 transition-all"
                  style={{ background: "#9aea62", color: "#0a0a0a", opacity: assuming === item.id ? 0.6 : 1 }}>
                  <Zap className="w-3 h-3" />
                  {assuming === item.id ? "..." : "Assumir"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

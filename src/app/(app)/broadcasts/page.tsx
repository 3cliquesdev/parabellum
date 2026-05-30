"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Megaphone, Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rascunho:  { label: "Rascunho",  color: "#939da4", icon: Clock },
  agendado:  { label: "Agendado",  color: "#facc15", icon: Clock },
  enviando:  { label: "Enviando",  color: "#60a5fa", icon: Play },
  pausado:   { label: "Pausado",   color: "#fb923c", icon: Pause },
  concluido: { label: "Concluído", color: "#9aea62", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "#f87171", icon: XCircle },
  falhou:    { label: "Falhou",    color: "#f87171", icon: AlertTriangle },
};

export default function BroadcastsPage() {
  const { tenantId } = useTenant();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/broadcast/campaigns?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns ?? []); setLoading(false); });

    // Realtime updates
    const supabase = createClient();
    const channel = supabase.channel("broadcasts-list")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "broadcast_campaigns", filter: `tenant_id=eq.${tenantId}` },
        (payload) => setCampaigns(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Broadcast</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Disparo em massa para seus leads via WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Link href="/broadcasts/templates"
            className="px-4 h-9 rounded-xl text-sm font-medium flex items-center"
            style={{ background: "rgba(255,255,255,0.05)", color: "#939da4", border: "1px solid rgba(255,255,255,0.07)" }}>
            Templates
          </Link>
          <Link href="/broadcasts/new"
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Nova campanha
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="py-20 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <Megaphone className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white mb-1">Nenhuma campanha ainda</p>
          <p className="text-xs mb-4" style={{ color: "#939da4" }}>Crie sua primeira campanha de broadcast</p>
          <Link href="/broadcasts/new" className="px-5 h-9 rounded-xl text-sm font-bold inline-flex items-center gap-2"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Criar campanha
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho;
            const Icon = st.icon;
            const pct = c.total_destinatarios > 0 ? Math.round((c.total_enviados / c.total_destinatarios) * 100) : 0;
            return (
              <Link key={c.id} href={`/broadcasts/${c.id}`}
                className="block rounded-2xl p-5 transition-all"
                style={cardStyle}
                onMouseEnter={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)")}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{c.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>
                      {c.meta_templates?.template_name ?? "Sem template"} · {c.meta_templates?.category ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
                    <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
                  </div>
                </div>

                {c.status === "enviando" && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "#939da4" }}>
                      <span>{c.total_enviados} / {c.total_destinatarios} enviados</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "#60a5fa" }} />
                    </div>
                  </div>
                )}

                {c.status === "concluido" && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Enviados", v: c.total_enviados, color: "#9aea62" },
                      { label: "Entregues", v: c.total_entregues, color: "#60a5fa" },
                      { label: "Lidos", v: c.total_lidos, color: "#a78bfa" },
                      { label: "Opt-outs", v: c.total_optouts, color: "#f87171" },
                    ].map(({ label, v, color }) => (
                      <div key={label} className="text-center p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-sm font-bold" style={{ color }}>{v}</p>
                        <p className="text-[10px]" style={{ color: "#939da4" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] mt-3" style={{ color: "rgba(147,157,164,0.4)" }}>
                  Criada {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  {c.concluido_em && ` · Concluída ${new Date(c.concluido_em).toLocaleDateString("pt-BR")}`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/types/database";
import { LeadTimeline, type TimelineEvent } from "@/components/app/LeadTimeline";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/leads/status";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: leadData }, timelineRes] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      fetch(`/api/leads/${id}/timeline`),
    ]);
    setLead((leadData as unknown as Lead) ?? null);
    if (timelineRes.ok) {
      const d = await timelineRes.json();
      setEvents(d.events ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => { void load(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  if (!lead) return (
    <div className="p-6">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Contato não encontrado.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-3xl" style={{ fontFamily: "var(--font-sans)" }}>
      <button onClick={() => router.push("/contacts")} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar pra contatos
      </button>

      <div className="rounded-xl p-5" style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ background: "var(--accent)", color: "var(--status-ganho)" }}>
            {lead.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>{lead.nome}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {lead.whatsapp ?? "—"} · {lead.email ?? "—"}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ color: STATUS_COLOR[lead.status], background: `${STATUS_COLOR[lead.status]}15` }}>
            {STATUS_LABEL[lead.status]}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)" }}>Cliente desde</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)" }}>Valor estimado</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>{lead.valor_estimado ? `R$ ${lead.valor_estimado}` : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-faint)" }}>Serviço de interesse</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>{lead.servico_interesse ?? "—"}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>Linha do tempo — {events.length} eventos</p>
        <LeadTimeline events={events} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Handshake, ArrowRightLeft, Trophy, XCircle } from "lucide-react";

interface EventoTimeline {
  id: string;
  tipo: "criado" | "mudanca_etapa" | "ganho" | "perdido";
  titulo: string;
  detalhe: string | null;
  data: string;
}

const EVENT_ICON: Record<EventoTimeline["tipo"], React.ElementType> = {
  criado: Handshake,
  mudanca_etapa: ArrowRightLeft,
  ganho: Trophy,
  perdido: XCircle,
};

const EVENT_COLOR: Record<EventoTimeline["tipo"], string> = {
  criado: "#0ea5e9",
  mudanca_etapa: "#a78bfa",
  ganho: "#10B981",
  perdido: "#f87171",
};

export function NegocioTimeline({ negocioId, tenantId }: { negocioId: string; tenantId: string }) {
  const [eventos, setEventos] = useState<EventoTimeline[]>([]);
  const [tempoTotal, setTempoTotal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/negocios/${negocioId}/timeline?tenant_id=${tenantId}`)
      .then((r) => (r.ok ? r.json() : { eventos: [], tempo_total_fechamento: null }))
      .then((d) => {
        setEventos(d.eventos ?? []);
        setTempoTotal(d.tempo_total_fechamento ?? null);
        setLoading(false);
      });
  }, [negocioId, tenantId]);

  if (loading) {
    return <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />;
  }

  if (eventos.length === 0) {
    return <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhum evento registrado ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {tempoTotal && (
        <p className="text-xs font-semibold" style={{ color: "var(--status-ganho)" }}>Tempo total de fechamento: {tempoTotal}</p>
      )}
      {eventos.map((event, i) => {
        const Icon = EVENT_ICON[event.tipo];
        const color = EVENT_COLOR[event.tipo];
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              {i < eventos.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)" }} />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{event.titulo}</p>
                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                  {new Date(event.data).toLocaleString("pt-BR")}
                </span>
              </div>
              {event.detalhe && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{event.detalhe}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

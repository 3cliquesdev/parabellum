import { CheckCircle2, Download, Handshake, MessageSquare, Tag, CheckSquare, Ticket, ShoppingBag, Undo2 } from "lucide-react";

export interface TimelineEvent {
  tipo: "status" | "mensagem" | "atividade" | "ticket" | "venda" | "devolucao" | "conversa_encerrada" | "negocio_criado";
  data: string;
  titulo: string;
  detalhe: string | null;
  conversa_id?: string;
}

const EVENT_ICON: Record<TimelineEvent["tipo"], React.ElementType> = {
  status: Tag, mensagem: MessageSquare, atividade: CheckSquare, ticket: Ticket, venda: ShoppingBag, devolucao: Undo2,
  conversa_encerrada: CheckCircle2, negocio_criado: Handshake,
};
const EVENT_COLOR: Record<TimelineEvent["tipo"], string> = {
  status: "#a78bfa", mensagem: "#60a5fa", atividade: "#facc15", ticket: "#fb923c", venda: "#10B981", devolucao: "#f87171",
  conversa_encerrada: "#15803D", negocio_criado: "#0ea5e9",
};

export function LeadTimeline({ events, tenantId }: { events: TimelineEvent[]; tenantId?: string }) {
  if (events.length === 0) {
    return <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhum evento registrado ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => {
        const Icon = EVENT_ICON[event.tipo];
        const color = EVENT_COLOR[event.tipo];
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)" }} />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{event.titulo}</p>
                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                  {new Date(event.data).toLocaleString("pt-BR")}
                </span>
                {event.tipo === "conversa_encerrada" && event.conversa_id && tenantId && (
                  <a
                    href={`/api/conversas/${event.conversa_id}/export?tenant_id=${tenantId}`}
                    download
                    title="Baixar conversa (.txt)"
                    className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: "var(--status-ganho)", background: "var(--active-soft-bg)" }}
                  >
                    <Download className="w-2.5 h-2.5" />
                    Baixar
                  </a>
                )}
              </div>
              {event.detalhe && (
                <p className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{event.detalhe}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

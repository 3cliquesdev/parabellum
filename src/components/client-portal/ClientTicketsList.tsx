import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket, Clock, MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import MyTicketDetail from "@/components/MyTicketDetail";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "Em Andamento", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  waiting_customer: { label: "Aguardando Cliente", className: "bg-orange-100 text-orange-700 border-orange-200" },
  pending: { label: "Pendente", className: "bg-orange-100 text-orange-700 border-orange-200" },
  resolved: { label: "Resolvido", className: "bg-green-100 text-green-700 border-green-200" },
  closed: { label: "Fechado", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "text-gray-500" },
  medium: { label: "Média", className: "text-gray-700" },
  high: { label: "Alta", className: "text-orange-600" },
  urgent: { label: "Urgente", className: "text-red-600 font-medium" },
};

export function ClientTicketsList() {
  const { user, profile } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // 1) Buscar contact_id pelo email do usuário
  const { data: contactId, isLoading: contactLoading } = useQuery({
    queryKey: ["portal-contact-id", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!user?.email,
  });

  // 2) Buscar tickets via edge function
  const { data: tickets, isLoading: ticketsLoading, refetch } = useQuery({
    queryKey: ["portal-tickets", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase.functions.invoke("get-customer-tickets", {
        body: { contact_id: contactId },
      });
      if (error) throw error;
      return data?.tickets || [];
    },
    enabled: !!contactId,
  });

  const isLoading = contactLoading || ticketsLoading;

  if (selectedTicket && contactId) {
    return (
      <div className="client-portal-card">
        <MyTicketDetail
          ticket={selectedTicket}
          contactId={contactId}
          onBack={() => setSelectedTicket(null)}
          onCommentAdded={() => refetch()}
          customerName={profile?.full_name || user?.email?.split("@")[0] || "Cliente"}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!contactId) {
    return (
      <div className="text-center py-8">
        <Ticket className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Nenhum cadastro encontrado para este email.</p>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-8">
        <Ticket className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Nenhum ticket encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Meus Tickets</h2>
      {tickets.map((ticket: any) => {
        const status = statusConfig[ticket.status] || statusConfig.open;
        const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
        const ticketNumber = ticket.ticket_number || ticket.id.substring(0, 8).toUpperCase();

        return (
          <button
            key={ticket.id}
            onClick={() => setSelectedTicket(ticket)}
            className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-400">#{ticketNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${status.className}`}>
                    {status.label}
                  </span>
                  <span className={`text-xs ${priority.className}`}>{priority.label}</span>
                </div>
                <h3 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">{ticket.subject}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{ticket.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                  {ticket.comment_count > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {ticket.comment_count} {ticket.comment_count === 1 ? "resposta" : "respostas"}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

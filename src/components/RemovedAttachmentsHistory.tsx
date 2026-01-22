import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTicketEvents, TicketEvent } from "@/hooks/useTicketEvents";
import { useRestoreTicketAttachment } from "@/hooks/useRestoreTicketAttachment";
import { useUserRole } from "@/hooks/useUserRole";
import { Trash2, RotateCcw, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RemovedAttachmentsHistoryProps {
  ticketId: string;
}

export function RemovedAttachmentsHistory({ ticketId }: RemovedAttachmentsHistoryProps) {
  const { data: events = [], isLoading } = useTicketEvents(ticketId);
  const restoreAttachment = useRestoreTicketAttachment();
  const { isAdmin } = useUserRole();

  // Filtrar apenas eventos de remoção de anexos
  const removedAttachmentEvents = events.filter(
    (event) => event.event_type === "attachment_removed"
  );

  // Verificar quais arquivos já foram restaurados
  const restoredEvents = events.filter(
    (event) => event.event_type === ("attachment_restored" as any)
  );
  const restoredUrls = new Set(
    restoredEvents.map((e) => e.metadata?.file_url)
  );

  // Filtrar apenas anexos que ainda não foram restaurados
  const pendingRemovals = removedAttachmentEvents.filter(
    (event) => !restoredUrls.has(event.metadata?.file_url)
  );

  const handleRestore = (event: TicketEvent) => {
    restoreAttachment.mutate({
      ticketId,
      attachment: {
        file_name: event.metadata?.file_name || "arquivo",
        file_type: event.metadata?.file_type || "application/octet-stream",
        file_url: event.metadata?.file_url || "",
      },
      eventId: event.id,
    });
  };

  // Não mostrar se não é admin ou não há remoções pendentes
  if (!isAdmin || pendingRemovals.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <History className="h-4 w-4" />
          Evidências Removidas ({pendingRemovals.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-3">
            {pendingRemovals.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 p-2 rounded-md bg-background border"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {event.metadata?.file_name || "Arquivo"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {event.actor && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={event.actor.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {event.actor.full_name?.split(" ").map((n) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{event.actor.full_name}</span>
                        </div>
                      )}
                      <span>•</span>
                      <span>
                        {format(new Date(event.created_at), "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(event)}
                  disabled={restoreAttachment.isPending}
                  className="flex-shrink-0 text-primary hover:text-primary-foreground hover:bg-primary"
                >
                  {restoreAttachment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restaurar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground mt-3">
          💡 Apenas administradores podem restaurar evidências removidas.
        </p>
      </CardContent>
    </Card>
  );
}

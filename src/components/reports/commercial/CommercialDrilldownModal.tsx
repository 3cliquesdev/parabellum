import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCommercialConversationsDrilldown, DrilldownFilters } from "@/hooks/useCommercialConversationsDrilldown";

interface CommercialDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Omit<DrilldownFilters, "limit" | "offset">;
  title: string;
}

const PAGE_SIZE = 20;

export function CommercialDrilldownModal({
  open,
  onOpenChange,
  filters,
  title,
}: CommercialDrilldownModalProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useCommercialConversationsDrilldown(
    {
      ...filters,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    open
  );

  const totalCount = data?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/inbox?conversation=${conversationId}`);
    onOpenChange(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-300">Aberta</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-300">Fechada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conversa encontrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow
                    key={row.conversation_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenConversation(row.conversation_id)}
                  >
                    <TableCell className="font-mono text-xs">{row.short_id}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{row.contact_name}</span>
                        {row.contact_phone && (
                          <span className="text-xs text-muted-foreground block">{row.contact_phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{row.agent_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenConversation(row.conversation_id);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">
              Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ResponsiveDialogSheet } from "@/components/ui/responsive-dialog-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportDrilldown, DrilldownTicket } from "@/hooks/v2/useSupportDrilldown";
import { useExportSupportCSV } from "@/hooks/useExportSupportCSV";
import { useSupportFilters } from "@/context/SupportFiltersContext";
import { cn } from "@/lib/utils";

interface SupportDrilldownDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: string;
  metricLabel: string;
}

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const SLA_COLORS: Record<string, string> = {
  on_time: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "-";
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}min`;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function SupportDrilldownDrawer({
  open,
  onOpenChange,
  metric,
  metricLabel,
}: SupportDrilldownDrawerProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { appliedFilters } = useSupportFilters();

  const { data, isLoading, isFetching } = useSupportDrilldown(
    {
      metric,
      search: debouncedSearch,
      sortBy,
      sortDir,
      page,
      pageSize: PAGE_SIZE,
    },
    open
  );

  const { exportCSV, isExporting } = useExportSupportCSV();

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  // Reset state when drawer opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setSortBy("created_at");
      setSortDir("desc");
    }
    onOpenChange(isOpen);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleExport = async () => {
    await exportCSV({
      metric,
      search: debouncedSearch,
      sortBy,
      sortDir,
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
      channel: appliedFilters.channel,
      departmentId: appliedFilters.departmentId,
      agentId: appliedFilters.agentId,
      status: appliedFilters.status,
    });
  };

  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;
  const tickets = data?.data ?? [];

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );

  return (
    <ResponsiveDialogSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={metricLabel}
      description={`${totalCount.toLocaleString("pt-BR")} tickets encontrados`}
      desktopWidth="900px"
      mobileVariant="fullscreen"
    >
      <div className="flex flex-col gap-4">
        {/* Search and Export */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero, ID ou cliente..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || totalCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "CSV"}
          </Button>
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto rounded-md border">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="ticket_number">Ticket</SortableHeader>
                <TableHead>Cliente</TableHead>
                <TableHead>Agente</TableHead>
                <SortableHeader column="channel">Canal</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <SortableHeader column="created_at">Criado em</SortableHeader>
                <TableHead>FRT</TableHead>
                <TableHead>MTTR</TableHead>
                <TableHead>SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Nenhum ticket encontrado
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket: DrilldownTicket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.ticket_number || ticket.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {ticket.customer_name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {ticket.agent_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {ticket.channel || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", STATUS_COLORS[ticket.status] || "")}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatMinutes(ticket.frt_minutes)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatMinutes(ticket.mttr_minutes)}
                    </TableCell>
                    <TableCell>
                      {ticket.sla_status && (
                        <Badge className={cn("capitalize", SLA_COLORS[ticket.sla_status] || "")}>
                          {ticket.sla_status === "on_time"
                            ? "No prazo"
                            : ticket.sla_status === "overdue"
                            ? "Atrasado"
                            : "Pendente"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || isLoading}
              >
                Proximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialogSheet>
  );
}

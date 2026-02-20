import { useState, useCallback } from "react";
import { toast } from "sonner";
import { fetchAllRpcPages } from "@/lib/fetchAllRpcPages";

interface ExportParams {
  metric: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  startDate: Date;
  endDate: Date;
  channel: string | null;
  departmentId: string | null;
  agentId: string | null;
  status: string | null;
}

export function useExportSupportCSV() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = useCallback(async (params: ExportParams) => {
    setIsExporting(true);

    try {
      const endExclusive = new Date(params.endDate);
      endExclusive.setDate(endExclusive.getDate() + 1);
      endExclusive.setHours(0, 0, 0, 0);

      const data = await fetchAllRpcPages({
        rpcName: "get_support_drilldown_v2",
        params: {
          p_start: params.startDate.toISOString(),
          p_end: endExclusive.toISOString(),
          p_metric: params.metric,
          p_channel: params.channel,
          p_department_id: params.departmentId,
          p_agent_id: params.agentId,
          p_status: params.status,
          p_search: params.search?.trim() || null,
          p_sort_by: params.sortBy || "created_at",
          p_sort_dir: params.sortDir || "desc",
        },
      });

      if (!data || data.length === 0) {
        toast.info("Nenhum dado para exportar");
        return;
      }

      // Build CSV content
      const headers = [
        "Ticket", "Cliente", "Agente", "Departamento", "Canal",
        "Status", "Criado em", "Primeira Resposta", "FRT (min)",
        "Resolvido em", "MTTR (min)", "Prazo SLA", "Status SLA",
      ];

      const rows = data.map((ticket: any) => [
        ticket.ticket_number || ticket.id,
        ticket.customer_name || "",
        ticket.agent_name || "",
        ticket.department_name || "",
        ticket.channel || "",
        ticket.status || "",
        ticket.created_at ? new Date(ticket.created_at).toLocaleString("pt-BR") : "",
        ticket.first_response_at ? new Date(ticket.first_response_at).toLocaleString("pt-BR") : "",
        ticket.frt_minutes !== null ? Math.round(ticket.frt_minutes) : "",
        ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString("pt-BR") : "",
        ticket.mttr_minutes !== null ? Math.round(ticket.mttr_minutes) : "",
        ticket.due_date ? new Date(ticket.due_date).toLocaleString("pt-BR") : "",
        ticket.sla_status === "on_time" ? "No prazo"
          : ticket.sla_status === "overdue" ? "Atrasado"
          : ticket.sla_status === "pending" ? "Pendente" : "",
      ]);

      const escapeCSV = (value: string | number) => {
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row: (string | number)[]) => row.map(escapeCSV).join(",")),
      ].join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tickets_${params.metric}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.length.toLocaleString("pt-BR")} tickets exportados`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportCSV, isExporting };
}

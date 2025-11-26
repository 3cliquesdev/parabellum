import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    full_name: string;
  };
}

interface UseAuditLogsParams {
  table_name?: string;
  user_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
}

export function useAuditLogs(params: UseAuditLogsParams = {}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (params.table_name) {
        query = query.eq("table_name", params.table_name);
      }

      if (params.user_id) {
        query = query.eq("user_id", params.user_id);
      }

      if (params.action) {
        query = query.eq("action", params.action);
      }

      if (params.start_date) {
        query = query.gte("created_at", params.start_date);
      }

      if (params.end_date) {
        query = query.lte("created_at", params.end_date);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      // Buscar informações dos usuários separadamente
      if (!logs || logs.length === 0) return [];

      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];
      
      if (userIds.length === 0) return logs.map(log => ({ ...log, user: undefined }));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return logs.map(log => ({
        ...log,
        user: log.user_id ? profileMap.get(log.user_id) : undefined
      })) as AuditLog[];
    },
  });
}

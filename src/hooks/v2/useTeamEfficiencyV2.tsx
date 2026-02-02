import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportFilters } from "@/context/SupportFiltersContext";

export interface AgentEfficiency {
  agent_id: string;
  agent_name: string;
  tickets_resolved: number;
  avg_frt_minutes: number | null;
  avg_mttr_minutes: number | null;
  sla_compliance_rate: number;
}

export function useTeamEfficiencyV2() {
  const { appliedFilters, getEndExclusive } = useSupportFilters();

  return useQuery({
    queryKey: [
      "team-efficiency-v2",
      appliedFilters.startDate.toISOString(),
      getEndExclusive().toISOString(),
      appliedFilters.channel,
      appliedFilters.departmentId,
      appliedFilters.agentId,
    ],
    queryFn: async () => {
      // Query tickets with agent info
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select(`
          id,
          assigned_to,
          created_at,
          first_response_at,
          resolved_at,
          due_date,
          profiles!tickets_assigned_to_fkey(id, full_name)
        `)
        .gte("created_at", appliedFilters.startDate.toISOString())
        .lt("created_at", getEndExclusive().toISOString())
        .not("assigned_to", "is", null);

      if (error) throw error;

      // Filter by applied filters
      let filteredTickets = tickets ?? [];
      
      if (appliedFilters.channel) {
        // Would need to add channel filter if available
      }
      
      if (appliedFilters.departmentId) {
        // Would need to add department filter if available
      }

      if (appliedFilters.agentId) {
        filteredTickets = filteredTickets.filter(t => t.assigned_to === appliedFilters.agentId);
      }

      // Group by agent
      const agentMap = new Map<string, {
        name: string;
        resolved: number;
        frtSum: number;
        frtCount: number;
        mttrSum: number;
        mttrCount: number;
        slaOnTime: number;
        slaTotal: number;
      }>();

      filteredTickets.forEach(ticket => {
        if (!ticket.assigned_to) return;

        const agentId = ticket.assigned_to;
        const agentName = (ticket.profiles as any)?.full_name || "Desconhecido";

        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            name: agentName,
            resolved: 0,
            frtSum: 0,
            frtCount: 0,
            mttrSum: 0,
            mttrCount: 0,
            slaOnTime: 0,
            slaTotal: 0,
          });
        }

        const agent = agentMap.get(agentId)!;

        // Count resolved
        if (ticket.resolved_at) {
          agent.resolved++;

          // MTTR
          const mttrMs = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
          agent.mttrSum += mttrMs / 1000 / 60;
          agent.mttrCount++;

          // SLA
          if (ticket.due_date) {
            agent.slaTotal++;
            if (new Date(ticket.resolved_at) <= new Date(ticket.due_date)) {
              agent.slaOnTime++;
            }
          }
        }

        // FRT
        if (ticket.first_response_at) {
          const frtMs = new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime();
          agent.frtSum += frtMs / 1000 / 60;
          agent.frtCount++;
        }
      });

      // Convert to array
      const result: AgentEfficiency[] = Array.from(agentMap.entries()).map(([id, data]) => ({
        agent_id: id,
        agent_name: data.name,
        tickets_resolved: data.resolved,
        avg_frt_minutes: data.frtCount > 0 ? data.frtSum / data.frtCount : null,
        avg_mttr_minutes: data.mttrCount > 0 ? data.mttrSum / data.mttrCount : null,
        sla_compliance_rate: data.slaTotal > 0 ? (data.slaOnTime / data.slaTotal) * 100 : 0,
      }));

      // Sort by tickets resolved desc
      result.sort((a, b) => b.tickets_resolved - a.tickets_resolved);

      return result;
    },
    staleTime: 1000 * 60 * 3,
  });
}

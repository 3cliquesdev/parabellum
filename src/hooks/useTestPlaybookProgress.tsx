import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface TestRunProgress {
  id: string;
  execution_id: string;
  status: string;
  total_nodes: number;
  executed_nodes: number;
  current_node_id: string | null;
  last_node_type: string | null;
  next_scheduled_for: string | null;
  last_event_at: string | null;
  error_message: string | null;
  speed_multiplier: number | null;
  tester_email: string | null;
}

export function formatRelativeTime(iso: string | null) {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
}

export function useTestPlaybookProgress(executionId: string | null) {
  const [progress, setProgress] = useState<TestRunProgress | null>(null);

  // Initial fetch
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["test-run-progress", executionId],
    queryFn: async () => {
      if (!executionId) return null;
      
      const { data, error } = await supabase
        .from("playbook_test_runs")
        .select(`
          id,
          execution_id,
          status,
          total_nodes,
          executed_nodes,
          current_node_id,
          last_node_type,
          next_scheduled_for,
          last_event_at,
          error_message,
          speed_multiplier,
          tester_email
        `)
        .eq("execution_id", executionId)
        .maybeSingle();
      
      if (error) {
        console.error("[useTestPlaybookProgress] Query error:", error);
        return null;
      }
      
      return data as TestRunProgress;
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      // Auto-refetch every 5s while running (fallback if realtime fails)
      const data = query.state.data as TestRunProgress | null;
      if (data?.status === "running") return 5000;
      return false;
    },
  });

  // Set initial data
  useEffect(() => {
    if (initialData) setProgress(initialData);
  }, [initialData]);

  // Realtime subscription
  useEffect(() => {
    if (!executionId) return;

    console.log(`[useTestPlaybookProgress] Subscribing to test-run-${executionId}`);
    
    const channel = supabase
      .channel(`test-run-${executionId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERT and UPDATE
          schema: "public",
          table: "playbook_test_runs",
          filter: `execution_id=eq.${executionId}`,
        },
        (payload) => {
          console.log("[useTestPlaybookProgress] Realtime update:", payload.new);
          setProgress(payload.new as TestRunProgress);
        }
      )
      .subscribe((status) => {
        console.log(`[useTestPlaybookProgress] Subscription status: ${status}`);
      });

    return () => {
      console.log(`[useTestPlaybookProgress] Unsubscribing from test-run-${executionId}`);
      supabase.removeChannel(channel);
    };
  }, [executionId]);

  // Calculate percentage with clamp at 100%
  const percentComplete = progress?.total_nodes
    ? Math.min(100, Math.round((progress.executed_nodes / progress.total_nodes) * 100))
    : 0;

  return {
    progress,
    isLoading,
    isRunning: progress?.status === "running",
    isCompleted: progress?.status === "done",
    isFailed: progress?.status === "failed",
    percentComplete,
    nextScheduledFormatted: formatRelativeTime(progress?.next_scheduled_for ?? null),
    lastEventFormatted: formatRelativeTime(progress?.last_event_at ?? null),
  };
}

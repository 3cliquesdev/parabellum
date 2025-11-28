import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CadenceMetric {
  cadence_id: string;
  cadence_name: string;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  paused_enrollments: number;
  reply_rate: number;
  completion_rate: number;
  avg_days_to_complete: number;
  total_tasks: number;
  completed_tasks: number;
  skipped_tasks: number;
}

export function useCadenceMetrics() {
  return useQuery({
    queryKey: ["cadence-metrics"],
    queryFn: async () => {
      // Fetch all cadences with enrollment stats
      const { data: cadences, error: cadencesError } = await supabase
        .from("cadences")
        .select(`
          id,
          name,
          is_active
        `)
        .eq("is_active", true);

      if (cadencesError) throw cadencesError;

      // Fetch enrollment stats for each cadence
      const metrics: CadenceMetric[] = await Promise.all(
        (cadences || []).map(async (cadence) => {
          // Get enrollment stats
          const { data: enrollments } = await supabase
            .from("cadence_enrollments")
            .select("id, status, started_at, completed_at, replied_at")
            .eq("cadence_id", cadence.id);

          const totalEnrollments = enrollments?.length || 0;
          const activeEnrollments = enrollments?.filter(e => e.status === 'active').length || 0;
          const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0;
          const pausedEnrollments = enrollments?.filter(e => e.status === 'paused').length || 0;
          const repliedEnrollments = enrollments?.filter(e => e.replied_at !== null).length || 0;

          // Calculate average days to complete
          const completedWithDates = enrollments?.filter(e => 
            e.status === 'completed' && e.started_at && e.completed_at
          ) || [];
          
          const avgDays = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, e) => {
                const days = Math.floor(
                  (new Date(e.completed_at!).getTime() - new Date(e.started_at).getTime()) 
                  / (1000 * 60 * 60 * 24)
                );
                return sum + days;
              }, 0) / completedWithDates.length
            : 0;

          // Get task stats
          const enrollmentIds = enrollments?.map(e => e.id) || [];
          const { data: tasks } = enrollmentIds.length > 0
            ? await supabase
                .from("cadence_tasks")
                .select("status")
                .in("enrollment_id", enrollmentIds)
            : { data: [] };

          const totalTasks = tasks?.length || 0;
          const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
          const skippedTasks = tasks?.filter(t => t.status === 'skipped').length || 0;

          return {
            cadence_id: cadence.id,
            cadence_name: cadence.name,
            total_enrollments: totalEnrollments,
            active_enrollments: activeEnrollments,
            completed_enrollments: completedEnrollments,
            paused_enrollments: pausedEnrollments,
            reply_rate: totalEnrollments > 0 ? (repliedEnrollments / totalEnrollments) * 100 : 0,
            completion_rate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
            avg_days_to_complete: Math.round(avgDays * 10) / 10,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            skipped_tasks: skippedTasks,
          };
        })
      );

      return metrics.sort((a, b) => b.total_enrollments - a.total_enrollments);
    },
  });
}

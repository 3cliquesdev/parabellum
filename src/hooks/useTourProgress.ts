import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useTourProgress(tourId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: completed, isLoading } = useQuery({
    queryKey: ["tour-progress", tourId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from("tour_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("tour_id", tourId)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking tour progress:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("tour_progress")
        .insert({
          user_id: user.id,
          tour_id: tourId,
        });
      
      if (error && !error.message.includes("duplicate")) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour-progress", tourId] });
    },
  });

  const resetTour = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("tour_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("tour_id", tourId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour-progress", tourId] });
    },
  });

  return {
    completed: completed ?? false,
    isLoading,
    markComplete: markComplete.mutate,
    resetTour: resetTour.mutate,
  };
}

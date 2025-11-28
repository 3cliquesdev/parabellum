import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMemberPerformance {
  id: string;
  name: string;
  avatar_url: string | null;
  chatsAttended: number;
  avgResponseTime: number; // in minutes
  avgCSAT: number;
  totalCSATRatings: number;
  salesClosed: number;
  totalRevenue: number;
}

export function useTeamPerformance(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["team-performance", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.log("📊 useTeamPerformance: Fetching team data", { startDate, endDate });
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");

      if (profilesError) throw profilesError;

      const teamPerformance: TeamMemberPerformance[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Count conversations attended
          const { data: conversations } = await supabase
            .from("conversations")
            .select("id, created_at, first_response_at")
            .eq("assigned_to", profile.id)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString());

          const chatsAttended = conversations?.length || 0;

          // Calculate average response time
          const responseTimes = conversations
            ?.filter(c => c.first_response_at)
            .map(c => {
              const diff = new Date(c.first_response_at!).getTime() - new Date(c.created_at).getTime();
              return diff / (1000 * 60); // Convert to minutes
            }) || [];

          const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
            : 0;

          // Get CSAT ratings for this agent's conversations
          const conversationIds = conversations?.map(c => c.id) || [];
          const { data: ratings } = await supabase
            .from("conversation_ratings")
            .select("rating")
            .in("conversation_id", conversationIds);

          const avgCSAT = ratings?.length
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;

          // Count sales closed
          const { data: deals } = await supabase
            .from("deals")
            .select("value, status")
            .eq("assigned_to", profile.id)
            .eq("status", "won")
            .gte("closed_at", startDate.toISOString())
            .lte("closed_at", endDate.toISOString());

          const salesClosed = deals?.length || 0;
          const totalRevenue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;

          return {
            id: profile.id,
            name: profile.full_name,
            avatar_url: profile.avatar_url,
            chatsAttended,
            avgResponseTime: Math.round(avgResponseTime * 10) / 10, // Round to 1 decimal
            avgCSAT: Math.round(avgCSAT * 10) / 10,
            totalCSATRatings: ratings?.length || 0,
            salesClosed,
            totalRevenue
          };
        })
      );

      // Filter out members with no activity and sort by chats attended
      const activeMembers = teamPerformance
        .filter(m => m.chatsAttended > 0 || m.salesClosed > 0)
        .sort((a, b) => b.chatsAttended - a.chatsAttended);

      console.log("✅ Team performance fetched:", activeMembers.length, "active members");
      return activeMembers;
    },
    staleTime: 1000 * 60 * 5,
  });
}

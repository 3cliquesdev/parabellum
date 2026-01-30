import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CopilotHealthScore, CopilotComparison, MonthlyEvolution, KBGapByCategory } from "./useCopilotHealthScore";

export interface CopilotInsight {
  type: "positive" | "warning" | "opportunity";
  title: string;
  description: string;
  action: string;
}

interface InsightsResponse {
  insights: CopilotInsight[];
  source: "ai" | "fallback";
  generatedAt: string;
}

export function useCopilotInsights(
  healthScore: CopilotHealthScore | null | undefined,
  comparison: CopilotComparison[] | undefined,
  evolution: MonthlyEvolution[] | undefined,
  kbGaps: KBGapByCategory[] | undefined
) {
  return useQuery({
    queryKey: ["copilot-insights", healthScore?.health_score, comparison?.length, evolution?.length],
    queryFn: async (): Promise<InsightsResponse> => {
      if (!healthScore) {
        return { insights: [], source: "fallback", generatedAt: new Date().toISOString() };
      }

      const { data, error } = await supabase.functions.invoke("generate-copilot-insights", {
        body: {
          healthScore,
          comparison: comparison || [],
          evolution: evolution || [],
          kbGaps: kbGaps || [],
        },
      });

      if (error) {
        console.error("[useCopilotInsights] Erro:", error);
        throw error;
      }

      return data as InsightsResponse;
    },
    enabled: !!healthScore,
    staleTime: 1000 * 60 * 15, // 15 minutes - insights don't change often
    retry: 1,
  });
}

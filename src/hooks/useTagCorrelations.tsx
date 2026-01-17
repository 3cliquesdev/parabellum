import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

export interface TagCorrelation {
  tag1: TagInfo;
  tag2: TagInfo;
  coOccurrences: number;
  percentage: number;
}

export interface UseTagCorrelationsResult {
  correlations: TagCorrelation[];
  topInsight: string | null;
}

export function useTagCorrelations(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['tag-correlations', startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<UseTagCorrelationsResult> => {
      // Buscar tickets no período com suas tags
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_tags(
            tags(id, name, color)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Map para contar pares de tags
      const pairMap = new Map<string, { tag1: TagInfo; tag2: TagInfo; count: number }>();
      let totalPairs = 0;

      tickets?.forEach(ticket => {
        const tags = ticket.ticket_tags
          ?.map(tt => tt.tags)
          .filter((tag): tag is TagInfo => tag !== null) || [];

        // Para tickets com múltiplas tags, contar todos os pares
        if (tags.length >= 2) {
          for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
              const tag1 = tags[i];
              const tag2 = tags[j];
              
              // Ordenar por nome para consistência da chave
              const [first, second] = tag1.name < tag2.name 
                ? [tag1, tag2] 
                : [tag2, tag1];
              
              const key = `${first.id}-${second.id}`;
              
              const existing = pairMap.get(key);
              if (existing) {
                existing.count++;
              } else {
                pairMap.set(key, {
                  tag1: first,
                  tag2: second,
                  count: 1
                });
              }
              totalPairs++;
            }
          }
        }
      });

      // Converter para array e ordenar
      const correlations: TagCorrelation[] = Array.from(pairMap.values())
        .map(pair => ({
          tag1: pair.tag1,
          tag2: pair.tag2,
          coOccurrences: pair.count,
          percentage: totalPairs > 0 ? (pair.count / totalPairs) * 100 : 0
        }))
        .sort((a, b) => b.coOccurrences - a.coOccurrences)
        .slice(0, 10);

      // Gerar insight automático
      let topInsight: string | null = null;
      if (correlations.length > 0) {
        const top = correlations[0];
        topInsight = `"${top.tag1.name}" frequentemente aparece junto com "${top.tag2.name}" (${top.coOccurrences}x)`;
      }

      return { correlations, topInsight };
    },
  });
}

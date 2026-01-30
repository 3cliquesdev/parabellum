import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'all';

export interface KnowledgeCandidate {
  id: string;
  problem: string;
  solution: string;
  when_to_use: string | null;
  when_not_to_use: string | null;
  category: string | null;
  tags: string[];
  department_id: string | null;
  source_conversation_id: string | null;
  confidence_score: number | null;
  extracted_by: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  conversations?: {
    id: string;
    contact: {
      first_name: string;
      last_name: string;
    } | null;
    closed_at: string | null;
  } | null;
  departments?: {
    name: string;
  } | null;
}

export function useKnowledgeCandidates(status: CandidateStatus = 'pending') {
  return useQuery({
    queryKey: ['knowledge-candidates', status],
    queryFn: async (): Promise<KnowledgeCandidate[]> => {
      let query = supabase
        .from('knowledge_candidates')
        .select(`
          *,
          conversations:source_conversation_id (
            id,
            contact:contact_id (first_name, last_name),
            closed_at
          ),
          departments:department_id (name)
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching knowledge candidates:', error);
        throw error;
      }
      
      return (data || []) as unknown as KnowledgeCandidate[];
    },
  });
}

export function useKnowledgeCandidateStats() {
  return useQuery({
    queryKey: ['knowledge-candidates-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_candidates')
        .select('status');

      if (error) throw error;

      const counts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: data?.length || 0,
      };

      data?.forEach((item) => {
        if (item.status === 'pending') counts.pending++;
        else if (item.status === 'approved') counts.approved++;
        else if (item.status === 'rejected') counts.rejected++;
      });

      return counts;
    },
  });
}

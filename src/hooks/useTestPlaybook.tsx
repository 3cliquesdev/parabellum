import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Node, Edge } from "reactflow";

interface TestPlaybookData {
  playbook_id?: string;
  flow_definition: { nodes: Node[]; edges: Edge[] };
  tester_email: string;
  tester_name?: string;
  speed_multiplier?: number;
}

interface TestPlaybookResponse {
  success: boolean;
  execution_id: string;
  test_contact_id: string;
  speed_multiplier: number;
  message: string;
}

export function useTestPlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TestPlaybookData): Promise<TestPlaybookResponse> => {
      const { data: result, error } = await supabase.functions.invoke<TestPlaybookResponse>(
        "test-playbook",
        { body: data }
      );

      if (error) {
        throw new Error(error.message || "Erro ao iniciar teste");
      }

      if (!result?.success) {
        throw new Error((result as any)?.error || "Falha ao iniciar teste");
      }

      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["playbook-executions"] });
      queryClient.invalidateQueries({ queryKey: ["playbook-test-runs"] });
      
      toast.success("🧪 Teste Iniciado!", {
        description: `Emails serão enviados para ${variables.tester_email}. Delays acelerados ${variables.speed_multiplier || 10}x.`,
        duration: 6000,
      });
    },
    onError: (error: Error) => {
      toast.error("Erro ao iniciar teste", {
        description: error.message,
      });
    },
  });
}

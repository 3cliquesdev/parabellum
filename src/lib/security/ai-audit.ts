import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";

// Registra uma acao tomada pela IA (via chave interna) em ai_decision_logs.
// Chamado a partir das proprias rotas que servem de ferramenta pro agente,
// nao do n8n diretamente, pra garantir que toda mutacao feita pela IA fique
// rastreada mesmo que o workflow do n8n mude sem a gente saber.
export async function logAiDecision(
  admin: SupabaseClient<LooseDatabase>,
  params: {
    tenantId: string;
    leadId?: string | null;
    conversaId?: string | null;
    acao: string;
    detalhes?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("ai_decision_logs").insert({
    tenant_id: params.tenantId,
    lead_id: params.leadId ?? null,
    conversa_id: params.conversaId ?? null,
    acao: params.acao,
    detalhes: params.detalhes ?? {},
  });
  if (error) console.error("ai_decision_logs insert error:", error.message);
}

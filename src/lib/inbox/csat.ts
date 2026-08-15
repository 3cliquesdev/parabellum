import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";

type AdminClient = SupabaseClient<LooseDatabase>;

interface ConversationForCsat {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  canal: string;
  aguardando_csat?: boolean | null;
}

/**
 * Se a conversa esta aguardando a nota da pesquisa de satisfacao, tenta extrair
 * um numero de 1 a 5 da mensagem do cliente, salva a avaliacao e agradece.
 * Retorna true se tratou a mensagem aqui - quem chamou deve parar o fluxo
 * normal (nao encaminhar pra IA/flow).
 */
export async function checkAndHandleCsatReply(
  admin: AdminClient,
  conversation: ConversationForCsat,
  text: string,
): Promise<boolean> {
  if (!conversation.aguardando_csat) return false;

  const match = text.trim().match(/^[^\d]*([1-5])[^\d]*$/);
  if (!match) return false;

  const rating = Number(match[1]);

  await admin.from("conversation_ratings").insert({
    tenant_id: conversation.tenant_id,
    conversa_id: conversation.id,
    lead_id: conversation.lead_id,
    rating,
    canal: conversation.canal,
  });

  await admin.from("conversas").update({ aguardando_csat: false }).eq("id", conversation.id);

  const agradecimento = rating >= 4
    ? "Muito obrigado pela sua avaliação! Ficamos felizes em ajudar."
    : "Obrigado pela sua avaliação. Vamos usar esse retorno para melhorar nosso atendimento.";

  await admin.from("mensagens").insert({
    conversa_id: conversation.id,
    tenant_id: conversation.tenant_id,
    remetente: "ia",
    conteudo: agradecimento,
    enviada: true,
    metadata: { tipo: "csat_agradecimento" },
  });

  return true;
}

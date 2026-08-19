import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";
import { getInternalApiSecret } from "@/lib/security/internal-auth";

type AdminClient = SupabaseClient<LooseDatabase>;

interface ConversationForCsat {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  canal: string;
  aguardando_csat?: boolean | null;
}

function extractRating(text: string): number | null {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // "Bom dia", "boa tarde" e "boa noite" sao novas mensagens de
  // atendimento, nao notas. Sem esta protecao, o "bom" era lido como nota 4
  // e a conversa era encerrada novamente.
  if (/^(?:bom dia|boa tarde|boa noite)(?:[!.,\s]|$)/.test(normalized)) return null;

  const digit = normalized.match(/(?:^|\D)([1-5])(?:\D|$)/);
  if (digit) return Number(digit[1]);
  const words: Array<[RegExp, number]> = [
    [/\b(cinco|excelente|otimo|otima|perfeito|amei)\b/, 5],
    [/\b(quatro|bom|boa|gostei)\b/, 4],
    [/\b(tres|regular|mais ou menos)\b/, 3],
    [/\b(dois|ruim|fraco)\b/, 2],
    [/\b(um|pessimo|horrivel)\b/, 1],
  ];
  return words.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
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

  const rating = extractRating(text);
  if (!rating) return false;

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

  // Nao basta gravar no banco: a mensagem precisa passar pelo endpoint de
  // envio para a Meta, que tambem salva o wa_message_id e o status real.
  const internalSecret = getInternalApiSecret();
  if (!internalSecret) {
    console.error("CSAT: INTERNAL_API_SECRET ausente; agradecimento nao enviado");
    return true;
  }
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": internalSecret },
    body: JSON.stringify({
      tenant_id: conversation.tenant_id,
      conversa_id: conversation.id,
      remetente: "ia",
      conteudo: agradecimento,
    }),
  });
  if (!response.ok) console.error("CSAT: falha ao enviar agradecimento", await response.text());

  return true;
}

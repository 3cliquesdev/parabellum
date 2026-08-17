const JANELA_24H_MS = 24 * 60 * 60 * 1000;

// A janela de resposta livre da Meta fecha 24h apos a ultima mensagem
// recebida do lead - fora dela (ou numa conversa que o lead nunca
// respondeu), so um template pre-aprovado pode ser enviado. Fica num
// arquivo separado (sem imports de servidor/fetch) pra poder ser usado
// tanto no client (Inbox) quanto no server (rota de envio).
export function isWindowOpen(conversation: { ultima_mensagem_lead_em?: string | null }): boolean {
  if (!conversation.ultima_mensagem_lead_em) return false;
  return Date.now() - new Date(conversation.ultima_mensagem_lead_em).getTime() < JANELA_24H_MS;
}

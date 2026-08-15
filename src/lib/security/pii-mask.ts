// Mascara CPF/CNPJ/numero de cartao antes que o texto do cliente saia do
// nosso banco em direcao ao agente de IA (n8n -> OpenAI). O objetivo e o
// modelo nunca "ver" esses dados brutos, mesmo que o cliente os digite
// espontaneamente na conversa. Telefone/e-mail nao sao mascarados aqui
// porque sao usados como identificadores legitimos ao longo do fluxo.

const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const CPF_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b(?!\d)/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

export function maskPII(text: string): { masked: string; found: string[] } {
  const found = new Set<string>();
  let masked = text;

  masked = masked.replace(CNPJ_RE, () => {
    found.add("cnpj");
    return "[CNPJ OCULTO]";
  });

  masked = masked.replace(CARD_RE, (match) => {
    if (match.replace(/\D/g, "").length < 13) return match;
    found.add("cartao");
    return "[CARTAO OCULTO]";
  });

  masked = masked.replace(CPF_RE, () => {
    found.add("cpf");
    return "[CPF OCULTO]";
  });

  return { masked, found: Array.from(found) };
}

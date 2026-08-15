// Mascara CPF/CNPJ/numero de cartao antes que o texto do cliente saia do
// nosso banco em direcao ao agente de IA (n8n -> OpenAI). O objetivo e o
// modelo nunca "ver" esses dados brutos, mesmo que o cliente os digite
// espontaneamente na conversa. Telefone/e-mail nao sao mascarados aqui
// porque sao usados como identificadores legitimos ao longo do fluxo.

const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const CPF_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b(?!\d)/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

// Numeros de cartao de verdade passam no checksum de Luhn; codigos de
// rastreio/pedido (que tem o mesmo tamanho de digitos) quase nunca passam.
// Sem isso, qualquer codigo de rastreio de 13-19 digitos era mascarado como
// se fosse cartao, impedindo a IA de consultar status de pedido.
function passaLuhn(digits: string): boolean {
  let soma = 0;
  let dobra = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dobra) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobra = !dobra;
  }
  return soma % 10 === 0;
}

export function maskPII(text: string): { masked: string; found: string[] } {
  const found = new Set<string>();
  let masked = text;

  masked = masked.replace(CNPJ_RE, () => {
    found.add("cnpj");
    return "[CNPJ OCULTO]";
  });

  masked = masked.replace(CARD_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return match;
    if (!passaLuhn(digits)) return match;
    found.add("cartao");
    return "[CARTAO OCULTO]";
  });

  masked = masked.replace(CPF_RE, () => {
    found.add("cpf");
    return "[CPF OCULTO]";
  });

  return { masked, found: Array.from(found) };
}

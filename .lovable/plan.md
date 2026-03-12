

# Diagnóstico Conversa #2D7EACE8 — 3 Problemas Identificados

## Problema 1: IA do Autopilot não respeita `forbidFinancial` para saque (OTP interno)

**Causa raiz**: Quando o cliente digita "sacar", o `ai-autopilot-chat` tem um bloco de bypass OTP na **linha 5934** que executa ANTES da verificação de `forbidFinancial` (que só ocorre na linha 8602). O bloco envia o OTP diretamente e retorna early, **sem nunca devolver o controle ao motor de fluxos**.

Resultado: o fluxo NUNCA sai do nó `ia_entrada` para o ramo Financeiro (que tem seu próprio nó OTP). Após enviar o código "983658", o sistema ficou mudo porque o OTP foi gerenciado internamente pelo autopilot, mas a resposta de validação aparentemente falhou ou não foi persistida.

**Fix**: Adicionar verificação de `forbidFinancial` + `flow_context` no bloco de OTP de saque (linha ~5934). Se `forbidFinancial: true` e `flow_context` existe, retornar `flow_advance_needed` com `intent: 'financeiro'` em vez de enviar OTP internamente. Isso delega a responsabilidade ao motor de fluxos que vai rotear para o ramo Financeiro com o nó OTP nativo.

```
// Linha ~5934 - ANTES do bloco de OTP interno
if (contactHasEmail && isWithdrawalRequest && !hasRecentOTPVerification) {
  // 🆕 Se forbidFinancial + flow_context → devolver ao fluxo
  if (forbidFinancial && flow_context) {
    return Response({ 
      flow_advance_needed: true, 
      intent: 'financeiro',
      reason: 'withdrawal_request_flow_routed'
    });
  }
  // ... OTP interno (só executa fora de fluxo)
}
```

## Problema 2: Mensagens do Autopilot aparecem como "Assistente Virtual" (cinza) vs Flow como "Atendente" (azul)

**Causa raiz**: O `MessageBubble.tsx` (linha 131) usa `isAI` (= `is_ai_generated`) para decidir o label. Mensagens do flow (`is_ai_generated: false`, `sender_type: user`) mostram "Atendente" com bubble azul. Mensagens do autopilot (`is_ai_generated: true`) mostram "Assistente Virtual" com bubble cinza.

**O problema real**: As mensagens do flow SÃO da IA mas estão marcadas como `is_ai_generated: false` — elas deveriam ter o MESMO visual. Ambas são bot messages.

**Fix**: No `MessageBubble.tsx`, considerar mensagens `sender_type: user` com metadata de flow como IA também. Ou de forma mais simples: padronizar todas as mensagens não-customer/não-system como o mesmo visual (sem diferenciar IA vs humano quando não há sender real).

Porém, como o atendente humano também envia com `sender_type: user`, a melhor solução é: mensagens do flow (que têm `metadata.flow_id`) devem ser tratadas como IA visual. Isso requer passar `metadata` para o `MessageBubble` e checar `metadata?.flow_id`.

## Problema 3: IA pediu email para consultar pedidos (deveria pedir número do pedido/rastreio)

**Causa raiz**: Alucinação do modelo. A KB tem artigos sobre processamento de pedidos mas a IA inventou que precisa de email para consultar. A ferramenta `fetch_order` no autopilot aceita número de pedido/rastreio, não email.

**Fix**: Adicionar instrução explícita no prompt do nó `ia_entrada` ou na persona: "Para consultar pedidos, peça o NÚMERO DO PEDIDO ou CÓDIGO DE RASTREIO, NUNCA peça email." Isso pode ser feito no `identityWallNote` ou como instrução anti-alucinação adicional no system prompt.

## Arquivos a editar

1. **`supabase/functions/ai-autopilot-chat/index.ts`** (~linha 5934): Adicionar guard `forbidFinancial + flow_context` antes do bypass OTP de saque → retornar `flow_advance_needed`
2. **`supabase/functions/ai-autopilot-chat/index.ts`** (seção de prompt): Adicionar instrução anti-alucinação para consulta de pedidos (pedir número do pedido, não email)
3. **`src/components/inbox/MessageBubble.tsx`**: Unificar visual de mensagens de bot (flow + autopilot) para que ambas apareçam como "Assistente Virtual" com o mesmo estilo

## Prioridade

1. **Fix OTP/flow** (Problema 1) — Crítico: fluxo financeiro quebrado
2. **Fix prompt pedidos** (Problema 3) — Alto: alucinação recorrente
3. **Fix visual mensagens** (Problema 2) — Médio: cosmético


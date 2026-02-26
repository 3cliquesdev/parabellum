

# Plano: Bypass Identity Wall quando IA é chamada via Flow (ai_response node)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico com Evidencia

O fluxo **funcionou perfeitamente**:
1. Manual trigger → welcome message → condition → auto-advance para `ai_response` (ia_entrada) com `status=active`
2. Usuario envia "Quero saber sobre meu pedido" → `process-chat-flow` encontra estado ativo em `ai_response` → retorna `{ useAI: true, aiNodeActive: true }`
3. Webhook chama `ai-autopilot-chat` com `flow_context` correto

**O problema esta no `ai-autopilot-chat` (linhas 5098-5109):**

```text
Identity Wall detecta:
  contactHasEmail: false
  isValidatedCustomer: false
→ Injeta priorityInstruction: "PRIMEIRA coisa: peça email"
→ IA ignora a pergunta do cliente e pede email
```

Essa priorityInstruction **sobrescreve tudo**, inclusive o objetivo do nó `ai_response` do fluxo. Quando a IA é chamada via flow (`flow_context` existe), quem controla a conversa é o **fluxo**, não a Identity Wall.

## Solucao

Adicionar uma verificação simples: se `flow_context` existe, **pular** o bloco de Identity Wall que injeta `priorityInstruction` para pedir email.

### Mudanca: `supabase/functions/ai-autopilot-chat/index.ts` (linha 5098)

Antes:
```typescript
if (!contactHasEmail && !isPhoneVerified && !isCustomerInDatabase && !isKiwifyValidated && responseChannel === 'whatsapp') {
  priorityInstruction = `=== INSTRUÇÃO PRIORITÁRIA ...`;
```

Depois:
```typescript
if (!contactHasEmail && !isPhoneVerified && !isCustomerInDatabase && !isKiwifyValidated && responseChannel === 'whatsapp' && !flow_context) {
  priorityInstruction = `=== INSTRUÇÃO PRIORITÁRIA ...`;
```

Uma unica condicao adicionada: `&& !flow_context`. Quando a IA é chamada pelo fluxo, o fluxo ja tem seu proprio `objective`, `contextPrompt` e restricoes — a Identity Wall nao deve interferir.

## Resumo

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/ai-autopilot-chat/index.ts` | Adicionar `&& !flow_context` na condicao da Identity Wall (linha 5098) |

## Impacto

| Regra | Status |
|---|---|
| Regressao zero | Sim — Identity Wall continua funcionando para conversas sem fluxo ativo |
| Upgrade | Sim — IA dentro do fluxo responde conforme objetivo do no ai_response |
| Kill Switch | Nao afetado |
| Fluxo nunca mudo | Melhora — IA agora responde em vez de pedir email fora de contexto |




# Diagnóstico: IA não responde — 2 bugs críticos no pipeline

## Problema identificado

Investigando as conversas não atribuídas de hoje (D6954192, F0268BFF, 8BDC2780, 787571B4, e outras), identifiquei um padrão claro:

1. O contato envia a primeira mensagem → flow greeting é enviado
2. O contato responde → mensagem é corretamente bufferizada (batching de 8s)
3. O buffer é processado → `ai-autopilot-chat` é chamado → **429 (rate limit)** → retorna HTTP 503
4. A safety net do `process-buffered-messages` vê `!autopilotResponse.ok` → dispara `forceAIExit` → mata o flow → conversa vai para `waiting_human` **sem a IA jamais ter respondido**
5. Mensagens subsequentes do contato chegam mas o flow já foi morto — a IA nunca tenta resolver

**Evidências concretas:**
- D6954192: 5 mensagens, 0 respostas da IA, flow morto
- F0268BFF: 4 mensagens, 0 respostas da IA, flow morto
- 8BDC2780: 4 mensagens, 0 respostas da IA, flow morto
- `analyze-ticket` logs confirmam 429 rate limit constante no AI Gateway
- Apenas 1 `ai_failure_log` de hoje (erro técnico, não quota)

## Causa raiz

### BUG 1: Safety net trata 429 como falha fatal (process-buffered-messages)

**Linha 383-391** de `process-buffered-messages/index.ts`:
```javascript
if (!autopilotResponse.ok) {
  // Safety net: IA falhou → forceAIExit
  await handleFlowReInvoke(..., { forceAIExit: true }); // MATA O FLOW!
}
```

O `ai-autopilot-chat` retorna HTTP 503 com `{ status: 'quota_error', retry_suggested: true, handoff_triggered: false }` — indicando que é um erro temporário e NÃO deve transferir. Mas o `process-buffered-messages` ignora o corpo da resposta e dispara `forceAIExit`, matando o flow e transferindo para humano.

### BUG 2: `updated_at` do flow state não é refreshed pelo buffer processing

Quando `process-buffered-messages` processa um buffer com sucesso (AI respondeu), ele NÃO atualiza o `updated_at` do `chat_flow_states`. O único ponto que atualiza é dentro do `process-chat-flow`. Isso faz com que o cron de 15 minutos mate flows que estão ativos mas cujo último `process-chat-flow` foi há mais de 15 minutos.

## Correções

### FIX 1: Não disparar forceAIExit em erros de quota/429

Em `process-buffered-messages/index.ts`, alterar a safety net para distinguir entre:
- **Erro de quota (503 com quota_error)**: NÃO disparar forceAIExit, marcar buffer como `processed=false` para retry no próximo ciclo do cron
- **Erro técnico real (500)**: manter comportamento atual (forceAIExit)

```javascript
if (!autopilotResponse.ok) {
  const errorText = await autopilotResponse.text();
  
  // Parse para verificar se é quota error (temporário)
  let isQuotaError = autopilotResponse.status === 503;
  try {
    const errorData = JSON.parse(errorText);
    isQuotaError = isQuotaError || errorData.status === 'quota_error' || errorData.code === 'QUOTA_EXCEEDED';
  } catch {}
  
  if (isQuotaError) {
    console.warn("[process-buffered-messages] ⚠️ QUOTA ERROR - NÃO disparar forceAIExit, retry no próximo ciclo");
    return false; // Não marcar como processed → retry no próximo cron
  }
  
  // Erro técnico real → safety net (forceAIExit)
  if (flowContext || flowData?.aiNodeActive) {
    await handleFlowReInvoke(...);
  }
  return false;
}
```

### FIX 2: Refreshar `updated_at` após buffer processing com sucesso

Após `ai-autopilot-chat` retornar sucesso, atualizar o `updated_at` do flow state ativo para evitar que o cron o mate.

```javascript
// Após ai-autopilot-chat retornar OK:
await supabase
  .from('chat_flow_states')
  .update({ updated_at: new Date().toISOString() })
  .eq('conversation_id', conversationId)
  .in('status', ['active', 'in_progress', 'waiting_input']);
```

### FIX 3: Proteção anti-retry infinito no buffer

Adicionar um limite de retries para buffers que ficam falhando por quota. Se um buffer falhou 3+ vezes, marcar como processed e enviar a mensagem de "alta demanda" para não deixar o contato sem resposta indefinidamente.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-buffered-messages/index.ts` | FIX 1 (quota check), FIX 2 (updated_at refresh), FIX 3 (retry limit) |

## Resultado esperado

- Erros 429 temporários NÃO matam o flow — a mensagem fica no buffer e é retentada no próximo ciclo (1 min)
- Flows com interação via buffer têm o `updated_at` refreshed, evitando morte prematura pelo cron
- Após 3 retries falhados, o contato recebe a mensagem de "alta demanda" em vez de silêncio total
- A IA volta a tentar ajudar nas conversas em vez de transferir silenciosamente para humano


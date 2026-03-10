

# Garantir que `aiExitForced` siga o próximo nó do chat flow

## Problema

Quando a IA no nó `ia_entrada` faz handoff (`forceAIExit`), o `path` é setado para `'ai_exit'` (linha 2219). O `findNextNode` busca uma edge com `sourceHandle='ai_exit'`, mas no Master Flow essa edge não existe. Resultado: `nextNode = null`. O código só tem guard para `financialIntentMatch || commercialIntentMatch` sem próximo nó (linha 2277), mas NÃO tem guard para `aiExitForced && !nextNode`. A conversa fica presa.

## Solução

Duas mudanças cirúrgicas no `supabase/functions/process-chat-flow/index.ts`:

### Mudança 1 — Fallback para edge default quando `ai_exit` não encontra nó (linha 2273-2274)

Após o `findNextNode` com `path`, se `aiExitForced && !nextNode`, tentar novamente com `path=undefined` (edge default):

```typescript
nextNode = findNextNode(flowDef, currentNode, path);
// 🆕 FIX: Se aiExitForced e não achou edge 'ai_exit', tentar edge default
if (!nextNode && aiExitForced && path === 'ai_exit') {
  console.log('[process-chat-flow] ⚠️ aiExitForced: sem edge ai_exit, tentando edge default');
  nextNode = findNextNode(flowDef, currentNode, undefined);
}
console.log(`[process-chat-flow] ➡️ Transition: ...`);
```

### Mudança 2 — Guard final: se AINDA não tem nextNode após fallback (após linha 2334)

Se mesmo com edge default não encontrou próximo nó (fluxo sem saída alguma), forçar handoff genérico usando o `department_id` do nó ou fallback Suporte:

```typescript
// Após o bloco financial/commercial (linha 2334):
if (!nextNode && aiExitForced) {
  console.log('[process-chat-flow] ⚠️ aiExitForced: sem NENHUM próximo nó → forçando handoff');
  const aiExitDeptId = currentNode.data?.department_id || null;
  // ... marcar transferred, atualizar conversations, retornar transfer: true
}
```

### Mudança 3 — Safety net no `process-buffered-messages` (linha 383-386)

Quando `ai-autopilot-chat` FALHA (HTTP error), e o fluxo está ativo (`flowContext` presente), re-invocar `process-chat-flow` com `forceAIExit: true` em vez de apenas retornar `false`:

```typescript
if (!autopilotResponse.ok) {
  console.error("[process-buffered-messages] ❌ ai-autopilot-chat error:", ...);
  // 🆕 Safety net: IA falhou com flow ativo → forçar avanço
  if (flowContext || flowData?.aiNodeActive) {
    await handleFlowReInvoke(supabase, conversationId, concatenatedMessage, 
      instanceId, fromNumber, { forceAIExit: true });
  }
  return false;
}
```

E o mesmo no `handle-whatsapp-event/index.ts` (linha 1272-1273), quando `aiError` com fluxo ativo.

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `process-chat-flow/index.ts` | Fallback edge default + guard aiExitForced sem nó |
| `process-buffered-messages/index.ts` | Safety net quando IA falha com flow ativo |
| `handle-whatsapp-event/index.ts` | Safety net quando IA falha com flow ativo |

## Resultado esperado

1. Se `ai_exit` edge existe → segue ela (comportamento atual)
2. Se não existe → segue edge default (próximo nó do canvas)
3. Se nenhuma edge existe → handoff com departamento do nó ou genérico
4. Se a IA falha completamente → re-invoca o fluxo para avançar em vez de deixar presa


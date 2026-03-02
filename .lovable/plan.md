

# Fix: Handoff da IA não avança o fluxo para o próximo nó

## Problema

Quando a IA executa um handoff (transferência para humano) dentro do `ai-autopilot-chat`, ela muda `ai_mode` para `waiting_human` e envia a mensagem de transferência, mas **não finaliza o `chat_flow_states`**. O fluxo fica "preso" no nó atual, mesmo após o handoff.

Na screenshot: a IA disse "vou te conectar com um de nossos especialistas" mas o fluxo continua mostrando como "Ativo" no banner.

## Causa Raiz

Existem **3 caminhos de handoff** no `ai-autopilot-chat/index.ts`:

| Caminho | Linha | Finaliza flow state? |
|---|---|---|
| Financial tool-call block | ~6736 | ✅ Sim |
| Strict RAG handoff | ~4100 | ❌ **Não** |
| Confidence handoff | ~4740 | ❌ **Não** |

Os dois caminhos sem finalização deixam o `chat_flow_states` com status `waiting_input` ou `active`, o que faz o banner do fluxo continuar aparecendo como ativo.

## Correção

Adicionar bloco de finalização do `chat_flow_states` nos 2 caminhos que estão faltando, usando o mesmo padrão já existente no financial tool-call block:

```typescript
// Finalizar flow state ativo (se existir)
try {
  const { data: activeFS } = await supabaseClient
    .from('chat_flow_states')
    .select('id')
    .eq('conversation_id', conversationId)
    .in('status', ['active', 'waiting_input', 'in_progress'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeFS) {
    await supabaseClient
      .from('chat_flow_states')
      .update({ status: 'transferred', completed_at: new Date().toISOString() })
      .eq('id', activeFS.id);
  }
} catch {}
```

### Arquivos editados
- `supabase/functions/ai-autopilot-chat/index.ts` — 2 inserções do bloco acima:
  1. No **Strict RAG handoff** (após `route-conversation`, antes de salvar mensagem ~linha 4114)
  2. No **Confidence handoff** (após `route-conversation`, antes de salvar mensagem ~linha 4768)

### Sem impacto em features existentes
- O bloco usa `maybeSingle()` e `try/catch` — se não houver flow state ativo, não faz nada
- Padrão idêntico ao já usado no financial guard (linha 6736)
- Não altera lógica de fluxo, apenas marca como `transferred` o que já deveria estar finalizado


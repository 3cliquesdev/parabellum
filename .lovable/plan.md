
# Fix: Prioridade do Fluxo de Teste (Draft) sobre Master Flow

## Problema

Quando um draft e iniciado manualmente via TestModeDropdown, tres falhas impedem o funcionamento correto:

1. **State criado no `start` node**: O manual trigger cria o estado com `current_node_id = start` (no sem conteudo), retorna `response: ""`, e o webhook nao envia nada
2. **Cancelamento incompleto**: So cancela estados com `status = 'active'`, mas master flow pode estar em `waiting_input` ou `in_progress`
3. **Protecao do master flow usa `maybeSingle()`**: Pode falhar silenciosamente com multiplos estados

## Mudancas

### 1. Manual Trigger: Travessia automatica apos detectar startNode

**Arquivo:** `supabase/functions/process-chat-flow/index.ts` (linhas 526-577)

Apos encontrar o `startNode` (linha 537), aplicar a mesma logica de travessia que ja existe no Master Flow (linhas 1125-1245):

```text
Antes (linhas 535-562):
  startNode = primeiro no (sem edges apontando)
  cria state com startNode.id
  retorna startNode.data.message (vazio para start/input)

Depois:
  startNode = primeiro no
  TRAVERSE: loop ate 12 passos
    - start/input: seguir edge simples
    - condition: avaliar e seguir handle correto
    - parar no primeiro content node (message, ask_options, ai_response, transfer, etc.)
  cria state com contentNode.id
  retorna contentNode.data.message (mensagem real)
```

Reutilizar as mesmas funcoes auxiliares (`findNextNode`, `evaluateConditionPath`, `evalCond`) e carregar dados de contato/conversa para avaliacao de condicoes.

Para o `ai_response` node, retornar `useAI: true` com `personaId` e `kbCategories` para que o webhook acione a IA corretamente.

### 2. Manual Trigger: Cancelar TODOS os estados existentes

**Arquivo:** `supabase/functions/process-chat-flow/index.ts` (linhas 519-524)

Mudar de:
```typescript
.eq('status', 'active')
```

Para:
```typescript
.in('status', ['active', 'waiting_input', 'in_progress'])
```

Isso garante que o master flow seja cancelado independentemente do status em que esteja.

### 3. Protecao do Master Flow: Substituir maybeSingle por order+limit

**Arquivo:** `supabase/functions/process-chat-flow/index.ts` (linhas 1059-1064)

Mudar de:
```typescript
const { data: existingActiveFlowState } = await supabaseClient
  .from('chat_flow_states')
  .select('id, flow_id, current_node_id')
  .eq('conversation_id', conversationId)
  .eq('status', 'active')
  .maybeSingle();
```

Para:
```typescript
const { data: existingActiveFlowStates } = await supabaseClient
  .from('chat_flow_states')
  .select('id, flow_id, current_node_id')
  .eq('conversation_id', conversationId)
  .in('status', ['active', 'waiting_input', 'in_progress'])
  .order('started_at', { ascending: false })
  .limit(1);

const existingActiveFlowState = existingActiveFlowStates?.[0] || null;
```

Inclui `waiting_input` e `in_progress` na busca para cobrir todos os cenarios.

### 4. Query principal (linha 584-590): Incluir waiting_input e in_progress

Mudar o filtro de `.eq('status', 'active')` para `.in('status', ['active', 'waiting_input', 'in_progress'])` na query principal que busca estado ativo da conversa. Isso garante que o draft em qualquer status seja encontrado.

## Resumo

| Local | Antes | Depois |
|---|---|---|
| Manual trigger (start) | State no `start` node, response vazia | Traversa ate content node, response real |
| Manual trigger (cancel) | Cancela so `active` | Cancela `active` + `waiting_input` + `in_progress` |
| Master flow protection | `maybeSingle()` so `active` | `order+limit` com 3 status |
| Query principal | `eq('status', 'active')` | `in('status', [...])` |

## Impacto

- Zero regressao: fluxos ativos continuam identicos (mesma logica de travessia reutilizada)
- Draft responde desde o primeiro trigger com mensagem real
- Master flow nao interfere quando draft esta ativo em qualquer status

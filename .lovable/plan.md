

# Diagnóstico: Indicador de Fluxo Ativo Não Aparece

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Problema Identificado

O banco de dados **não tem nenhum estado ativo** para esta conversa — o único registro existente tem status `cancelled`. Isso explica por que o `ActiveFlowIndicator` não aparece: ele consulta estados com status `active`, `waiting_input` ou `in_progress`, e não encontra nenhum.

A causa raiz são **dois problemas combinados**:

### Problema 1: Dupla limpeza redundante no manual trigger

O código de `process-chat-flow` faz **duas operações de cleanup** antes de criar o estado:
- **Linha 537**: `UPDATE ... SET status = 'cancelled'` (muda todos para cancelled)
- **Linha 668**: `DELETE ... WHERE status IN ('active', 'waiting_input', 'in_progress')` (mas já não há nenhum com esses status, pois foram cancelados)

Embora redundante, isso não deveria causar perda de estado. Porém, o INSERT subsequente pode colidir com a constraint `unique_active_flow` se existir um registro cancelado com a mesma combinação `(conversation_id, flow_id, status)` — ou seja, se já existir um registro `(conv, flow_draft, active)` de uma tentativa anterior que foi re-ativado.

### Problema 2: Estado criado em nó `message` sem auto-avanço

Quando o fluxo para no nó `welcome_ia` (type: `message`), o estado é criado como `active`. Porém, nós do tipo `message` são **display-only** — não coletam input. O fluxo deveria **auto-avançar** para o próximo nó (a Condição) imediatamente após enviar a mensagem, deixando o estado pronto para receber a resposta do usuário no nó correto.

Atualmente, o estado fica preso no nó `message`, e quando o usuário envia uma mensagem, o processamento tenta avaliar o input contra um nó que não espera input.

## Alterações Propostas

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-chat-flow/index.ts` | 1. Consolidar dupla limpeza em apenas DELETE (remover o UPDATE redundante) |
| `supabase/functions/process-chat-flow/index.ts` | 2. Após criar estado em nó `message`, auto-avançar para o próximo nó (condition/ask_options/etc.) |
| SQL (migration) | Limpar estados órfãos: DELETE de estados travados |

## Detalhamento Técnico

### Fix 1: Consolidar cleanup (remover UPDATE, manter DELETE)

```text
ANTES:
  Linha 537: UPDATE → status = cancelled (todos os ativos)
  Linha 668: DELETE → WHERE status IN active/waiting/in_progress (redundante)

DEPOIS:
  Apenas DELETE → WHERE status IN active/waiting/in_progress/cancelled
  (limpa tudo de uma vez, incluindo cancelados antigos que poderiam colidir)
```

### Fix 2: Auto-avanço em nós `message` após delivery

Após entregar a mensagem do nó `message` via `deliverManualMessage`, o sistema deve:
1. Encontrar o próximo nó via `findNextNode`
2. Se o próximo for um nó de conteúdo (ask_options, condition, ai_response), atualizar o `current_node_id` do estado
3. Se o próximo for condition, fazer a travessia automática até o próximo nó executável
4. Atualizar o status para `waiting_input` se parar em ask_options

Isso garante que:
- O estado sempre aponta para o nó que de fato espera input do usuário
- O indicador mostra o fluxo ativo corretamente
- A próxima mensagem do usuário é processada no nó correto

### Fix 3: Limpeza de estados órfãos

```sql
DELETE FROM chat_flow_states 
WHERE conversation_id = '4ed80263-02fc-4085-9b29-5290a4174dc5';
```

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — apenas melhora lógica de estados no manual trigger |
| Kill Switch | Preservado |
| Indicador | Volta a funcionar porque o estado fica persistido corretamente |
| Rollback | Reverter consolidação de cleanup e remover auto-avanço |


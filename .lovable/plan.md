

# Condição de Tempo de Inatividade no Chat Flow

## Como funciona

Novo tipo de condição: **"Tempo de inatividade"**. Configura X minutos. Se o cliente não responder em X minutos, o fluxo segue pelo caminho **Sim** (inativo). Se responder antes, segue pelo **Não** (ativo).

## Mecânica

1. Fluxo chega no nó de condição `inactivity` → salva estado como `waiting_input` com metadata `{ inactivity_timeout_minutes: X, inactivity_started_at: now() }`
2. Se cliente responder antes do timeout → avalia como **false** (não inativo) → segue caminho "Não"
3. Cron `auto-close-conversations` (já roda a cada 10 min) → nova etapa: verifica flow states parados em nós de inatividade que excederam o timeout → chama `process-chat-flow` com flag especial para avançar pelo caminho "true"

## Alterações (4 arquivos)

### 1. `src/components/chat-flows/ChatFlowEditor.tsx`
- Adicionar `inactivity` no dropdown de tipo de condição: "⏱ Tempo de inatividade"
- Quando `condition_type === "inactivity"`: mostrar input numérico "Minutos sem resposta" ao invés do campo "Valor esperado"
- Esconder "Campo a verificar" para este tipo

### 2. `src/components/chat-flows/nodes/ConditionNode.tsx`
- Adicionar label `inactivity: "Inatividade"` no `conditionLabels`
- Subtitle: `⏱ Inativo há ${value} min` quando tipo é inactivity

### 3. `supabase/functions/process-chat-flow/index.ts`
- Na `evaluateCondition`: adicionar case `inactivity` que verifica flag `inactivityTimeout: true` no payload (quando chamado pelo cron = true, quando chamado por mensagem do cliente = false)
- Quando fluxo chega num nó `inactivity` e não tem flag de timeout: salvar estado `waiting_input` com metadata contendo `inactivity_timeout_minutes` e `inactivity_started_at`
- Quando mensagem do cliente chega e estado está em nó de inatividade: avaliar como `false` (cliente respondeu) e seguir caminho "Não"

### 4. `supabase/functions/auto-close-conversations/index.ts`
- Nova etapa (após 3b): buscar `chat_flow_states` com `status = 'waiting_input'` onde metadata contém `inactivity_timeout_minutes`
- Calcular se `now() - inactivity_started_at > timeout_minutes`
- Se expirou: chamar `process-chat-flow` com `{ conversationId, userMessage: '', inactivityTimeout: true }` para avançar pelo caminho "true"

## Impacto
- Zero regressão: tipos de condição existentes inalterados
- Aditivo: novo tipo `inactivity` opcional
- Usa infraestrutura existente (cron + flow states)


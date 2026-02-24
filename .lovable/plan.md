
# Indicador de Fluxo Ativo na Conversa

## Resumo

Criar um sistema visual que mostra qual fluxo esta rodando na conversa atual, com nome, tipo (ativo/rascunho), e opcao de cancelar. Tambem bloquear inicio de novo fluxo se ja houver um em andamento.

## Alteracoes

### 1. Criar hook `useActiveFlowState` (novo arquivo)

**Arquivo:** `src/hooks/useActiveFlowState.ts`

- Query em `chat_flow_states` filtrando `conversation_id` e `status = 'in_progress'`
- JOIN com `chat_flows` para trazer `name` e `is_active`
- Realtime subscribe em `chat_flow_states` com filtro `conversation_id=eq.<id>` para INSERT/UPDATE
- Funcao `cancelFlow(stateId)` que faz update `status='cancelled', completed_at=now()`
- Retorna: `{ activeFlow, isLoading, cancelFlow, isCancelling }`
  - `activeFlow`: `{ stateId, flowId, flowName, flowIsActive, currentNodeId, startedAt }` ou `null`

### 2. Criar componente `ActiveFlowIndicator` (novo arquivo)

**Arquivo:** `src/components/inbox/ActiveFlowIndicator.tsx`

- Recebe `conversationId` como prop
- Usa `useActiveFlowState(conversationId)`
- Se nao ha fluxo `in_progress`: retorna `null` (nao renderiza nada)
- Se ha fluxo ativo, renderiza um banner compacto:
  - Icone `Workflow`
  - Texto: `Fluxo: "Nome do Fluxo"`
  - Badge: "Rascunho" (amarelo) se `flowIsActive === false`, ou "Ativo" (verde) se `flowIsActive === true`
  - Botao "Cancelar" que chama `cancelFlow(stateId)` com confirmacao
- Estilo: banner amber sutil para rascunho, azul/verde para ativo, dentro de um `Alert` compacto

### 3. Integrar `ActiveFlowIndicator` no `ChatWindow.tsx`

- Importar o componente
- Posicionar logo apos o alert de "Assumir/IA" (linha ~670) e antes da area de mensagens (linha 672)
- Passa `conversationId={conversation.id}`

### 4. Bloquear novo fluxo no `FlowPickerButton.tsx`

- Receber nova prop `hasActiveFlow: boolean` (vinda do hook no ChatWindow ou SuperComposer)
- Antes de chamar `handleStartFlow`, verificar `hasActiveFlow`
- Se `true`: exibir toast "Ja existe um fluxo em execucao nesta conversa. Cancele-o antes de iniciar outro." e nao executar
- O dropdown continua visivel mas os itens ficam bloqueados

### 5. Propagar `hasActiveFlow` via SuperComposer

- No `SuperComposer`, importar `useActiveFlowState` e passar `hasActiveFlow={!!activeFlow}` para o `FlowPickerButton`

### 6. Habilitar Realtime na tabela `chat_flow_states`

- Criar migracao SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_flow_states;`
- Isso permite que o hook receba updates em tempo real quando o fluxo avanca, completa ou e cancelado

## Fluxo Visual

```text
Header da conversa
  |
  v
[Alert de IA/Assumir] (existente)
  |
  v
[ActiveFlowIndicator] <-- NOVO
  | Se in_progress: banner com nome + badge + cancelar
  | Se nao: invisivel
  v
[Area de mensagens]
  |
  v
[SuperComposer com FlowPickerButton]
  | Se hasActiveFlow: bloqueia inicio de novo fluxo
```

## Impacto

- Zero regressao: nenhuma logica existente e alterada
- Upgrade puro de UX: o usuario sempre sabe qual fluxo esta rodando
- Previne conflito entre fluxos simultaneos no frontend
- Realtime garante que o banner desaparece automaticamente quando o fluxo termina
- Backend ja cancela fluxos anteriores ao iniciar novo (linha 519-523 do process-chat-flow), entao a protecao frontend e complementar

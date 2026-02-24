

# Atualizar Status do Atendente em Tempo Real

## Problema

Quando o status de um atendente e alterado (por ele mesmo ou por um admin), a atualizacao nao aparece imediatamente na sidebar do Inbox e em outros componentes. O delay ocorre por dois motivos:

1. O hook `useAgentConversations` tem `staleTime: 30000` (30 segundos), o que faz com que invalidacoes nao disparem refetch imediato se os dados ainda estiverem "frescos"
2. O hook `useManageAvailabilityStatus` (usado por admins para mudar status de outros agentes) nao invalida `agent-conversations-stats`, que e a query usada na sidebar do Inbox

## Alteracoes

### 1. Corrigir `useManageAvailabilityStatus.tsx`

Adicionar invalidacoes que faltam no `onSuccess`:
- `agent-conversations-stats` (lista de agentes na sidebar)
- `agent-conversations-list` (lista de conversas por agente)
- `team-online-count` (contador de online)
- `profiles` (dados gerais)
- `support-agents` (lista de agentes de suporte)

### 2. Ajustar `useAgentConversations.tsx`

Reduzir o `staleTime` de 30s para 5s para que invalidacoes vindas do Realtime disparem refetch quase imediato. Manter `refetchInterval` de 60s como fallback.

### 3. Ajustar `useAvailabilityStatus.tsx`

No `onSuccess` da mutation, adicionar invalidacoes cruzadas para que quando o proprio agente mude seu status, as queries de outros componentes tambem sejam atualizadas:
- `agent-conversations-stats`
- `team-online-status`
- `team-online-count`
- `profiles`

## Impacto

- Zero regressao: nenhuma logica existente e alterada, apenas adicionadas invalidacoes e reduzido cache
- Upgrade puro: status muda instantaneamente em todas as telas (sidebar, widget, header)
- A infraestrutura de Realtime ja esta no lugar (`profiles` ja esta na publicacao `supabase_realtime` e `useProfilesRealtime` ja escuta globalmente), o ajuste e apenas garantir que as queries corretas sejam invalidadas e refetched sem delay


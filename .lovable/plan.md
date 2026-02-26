

# Diagnóstico: Mensagens do fluxo de teste nao aparecem + fluxo anterior permanece ativo

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Causa Raiz (2 problemas)

### Problema 1: Mensagens nao aparecem no chat
Quando o `FlowPickerButton.handleStartFlow` chama `process-chat-flow` com sucesso, ele mostra um toast mas **nao invalida a query de mensagens**. As mensagens geradas pelo fluxo (inseridas server-side pela edge function) so aparecerao quando o realtime entregar o evento — que pode demorar ou falhar silenciosamente.

### Problema 2: Fluxo anterior permanece ativo
Quando um novo fluxo e iniciado, o fluxo anterior nao e cancelado automaticamente. O `hasActiveFlow` guard bloqueia novos fluxos, mas se o usuario conseguiu iniciar (ex: via race condition ou fluxo completado parcialmente), o `useActiveFlowState` pode continuar mostrando o fluxo antigo por causa do `staleTime: 10_000`.

## Solucao

### Mudanca 1: `FlowPickerButton.tsx` — Invalidar queries apos iniciar fluxo

Apos o sucesso de `handleStartFlow`, invalidar tanto a query de mensagens quanto a de flow state:

```typescript
// Dentro do handleStartFlow, após toast.success:
const queryClient = useQueryClient();
// ...
queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
queryClient.invalidateQueries({ queryKey: ["active-flow-state", conversationId] });
```

Isso forca o refetch imediato das mensagens geradas pelo fluxo e atualiza o indicador de fluxo ativo.

### Mudanca 2: `FlowPickerButton.tsx` — Adicionar import do `useQueryClient`

Importar `useQueryClient` do tanstack e instanciar dentro do componente.

| Arquivo | Mudanca | Descricao |
|---|---|---|
| `FlowPickerButton.tsx` | Adicionar `useQueryClient` + invalidar queries | Forca refetch de mensagens e flow state apos iniciar fluxo |

### Impacto

| Regra | Status |
|---|---|
| Regressao zero | Sim — apenas adiciona invalidacoes, sem remover logica |
| Upgrade | Sim — garante que mensagens e estado do fluxo sao atualizados imediatamente |
| Kill Switch | Nao afetado |
| Fluxo nunca mudo | Nao afetado — so melhora a exibicao no frontend |


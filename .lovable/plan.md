

# Adicionar opção "waiting_human" e filtro agrupado "Conversas da IA" no Modo IA

## Problema
O filtro "Modo IA" nos Filtros Avançados do Inbox só tem 3 opções (autopilot, copilot, disabled), mas falta:
1. A opção `waiting_human` (IA aguardando humano assumir)
2. Um filtro agrupado para ver **todas as conversas da IA** (autopilot + copilot + waiting_human)

## Alterações

### 1. `src/components/inbox/InboxFilterPopover.tsx`
Adicionar novas opções ao `AI_MODE_OPTIONS`:
```typescript
const AI_MODE_OPTIONS = [
  { value: "ai_all", label: "🤖 Todas da IA" },        // NOVO: agrupa autopilot + copilot + waiting_human
  { value: "autopilot", label: "🤖 Autopilot" },
  { value: "copilot", label: "🧑‍✈️ Copilot" },
  { value: "waiting_human", label: "⏳ Aguardando Humano" },  // NOVO
  { value: "disabled", label: "❌ Desabilitado" },
];
```

### 2. `src/hooks/useInboxView.tsx`
Atualizar o tipo `InboxFilters.aiMode` para incluir os novos valores e ajustar a lógica de filtragem:
- Tipo: `'autopilot' | 'copilot' | 'disabled' | 'waiting_human' | 'ai_all'`
- Quando `aiMode === 'ai_all'`, filtrar por `item.ai_mode in ['autopilot', 'copilot', 'waiting_human']`
- Quando for um valor específico, manter filtro direto (`item.ai_mode === filters.aiMode`)

### 3. `src/pages/Inbox.tsx`
Atualizar o cast do `aiMode` no mapeamento de filtros para aceitar os novos valores.

## Resultado
O usuário poderá filtrar por "Todas da IA" para ver todas as conversas em atendimento automático, ou por modo específico incluindo "Aguardando Humano".


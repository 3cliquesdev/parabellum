

# Fix: Badge "Filtros 2" conta filtro invisível

## Problema

O badge "Filtros 2" mostra contagem errada porque o **waitingTime = "oldest"** (valor padrão) é contado como filtro ativo no `InboxFilterPopover`, mas NÃO gera chip visível no `ActiveFilterChips`. O usuário vê "2 filtros" mas só encontra 1 chip (a tag).

## Causa

- **InboxFilterPopover.tsx (linha ~97):** conta `waitingTime !== 'all'` → "oldest" conta como 1
- **ActiveFilterChips.tsx:** pula "oldest" corretamente (é o default, não é filtro)
- **Resultado:** contagem e chips desalinhados

## Solução

Alinhar a contagem no `InboxFilterPopover.tsx` com a mesma lógica dos chips:

### Arquivo: `src/components/inbox/InboxFilterPopover.tsx`

Alterar linha ~97 de:
```typescript
filters.waitingTime && filters.waitingTime !== 'all' ? 1 : 0,
```
Para:
```typescript
filters.waitingTime && filters.waitingTime !== 'all' && filters.waitingTime !== 'oldest' && filters.waitingTime !== 'newest' ? 1 : 0,
```

Isso exclui "oldest" e "newest" da contagem, já que são opções de **ordenação** e não filtros reais — consistente com os chips.

### Impacto
- 1 linha alterada
- Badge passa a mostrar contagem correta alinhada com chips visíveis


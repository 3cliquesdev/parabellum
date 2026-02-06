
# Plano: Corrigir Filtro "Tickets que Criei"

## Diagnóstico

### Problema Identificado
O usuário **Ronildo Oliveira** ao clicar em "Tickets que criei" vê **0 tickets**, mas ele criou 1 ticket (`TK-2026-00213`).

### Causa Raiz
O único ticket criado pelo Ronildo está com status `resolved` (arquivado). O filtro "Tickets que criei" exclui tickets arquivados, tanto:

1. **No contador** (`useTicketCounts.tsx` linha 123): 
   ```typescript
   if (ticket.created_by === user.id && !isArchived) {
     counts.created_by_me++;
   }
   ```

2. **Na query** (`Support.tsx` linha 199-203):
   ```typescript
   case 'created_by_me':
     return { 
       advancedFilters: { 
         status: baseFilters.status.length > 0 ? baseFilters.status : activeStatusNames // ← Exclui arquivados
       }
     };
   ```

### Expectativa do Usuário
Ver **todos** os tickets que criou para acompanhar seu status (abertos, em andamento, resolvidos, etc.).

---

## Solução Proposta

### 1. Alterar o contador para incluir tickets arquivados

**Arquivo:** `src/hooks/useTicketCounts.tsx`

Remover a condição `!isArchived` do contador `created_by_me`:

```typescript
// ANTES
if (ticket.created_by === user.id && !isArchived) {
  counts.created_by_me++;
}

// DEPOIS
if (ticket.created_by === user.id) {
  counts.created_by_me++; // Inclui arquivados
}
```

### 2. Alterar o filtro para incluir todos os status

**Arquivo:** `src/pages/Support.tsx`

Não filtrar por status quando `created_by_me` está selecionado:

```typescript
// ANTES
case 'created_by_me':
  return { 
    assignedFilter: 'created_by_me' as const,
    advancedFilters: { ...baseFilters, status: baseFilters.status.length > 0 ? baseFilters.status : activeStatusNames }
  };

// DEPOIS
case 'created_by_me':
  return { 
    assignedFilter: 'created_by_me' as const,
    advancedFilters: { ...baseFilters } // Não forçar filtro de status - mostra todos
  };
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useTicketCounts.tsx` | Remover `!isArchived` do contador `created_by_me` |
| `src/pages/Support.tsx` | Remover filtro de `activeStatusNames` do case `created_by_me` |

---

## Impacto

| Antes | Depois |
|-------|--------|
| Contador mostra 0 (só ativos) | Contador mostra todos os tickets criados |
| Lista vazia (exclui arquivados) | Lista mostra todos (abertos + resolvidos) |
| Usuário não vê tickets que criou | Pode acompanhar todos os tickets que criou |

---

## Considerações de UX

O usuário que cria um ticket quer **acompanhar** o progresso dele. Faz sentido mostrar todos os tickets que criou (incluindo resolvidos) para:
- Ver o histórico completo
- Acompanhar tickets em análise
- Verificar tickets já resolvidos

Se desejar, podemos adicionar uma indicação visual (badge) para diferenciar tickets arquivados dos ativos na lista.

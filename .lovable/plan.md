

## Correcao: Tickets de Aprovacao Nao Aparecem para Admin

### Problema Raiz (3 falhas encadeadas)

1. **Sidebar envia `financial_pending`** como filtro, mas o `getHookParams()` em `Support.tsx` nao tem um `case` para ele -- cai no `default` que nao aplica filtro nenhum relevante
2. **`useTickets`** tem logica para `financial_pending` via o parametro `statusFilter` (1o argumento), mas `Support.tsx` **sempre passa `undefined`** nesse parametro -- nunca ativa essa logica
3. **`useTicketCounts`** nao calcula a contagem de `financial_pending`, entao o badge na sidebar sempre mostra 0

Alem disso, o status `pending_approval` ja existe como status dinamico na tabela `ticket_statuses`, entao clicar em "Aguard. Aprovacao" na secao "Por Status" funciona. Mas o filtro da secao "Financeiro" (que deveria mostrar tickets financeiros pendentes de aprovacao) esta completamente desconectado.

### Solucao

**1. `src/pages/Support.tsx` -- Adicionar case para `financial_pending`**

No `getHookParams()`, adicionar tratamento para o filtro `financial_pending` que filtra por status `pending_approval`:

```text
case 'financial_pending':
  return { 
    advancedFilters: { 
      ...baseFilters, 
      status: ['pending_approval'] 
    } 
  };
```

Isso e mais simples e correto do que a logica antiga no `useTickets` que tentava inferir tickets financeiros por keywords no subject.

**2. `src/hooks/useTicketCounts.tsx` -- Adicionar contagem de `financial_pending`**

No loop de contagem, adicionar logica para contar tickets com `status === 'pending_approval'`:

```text
// Financial pending = tickets aguardando aprovacao
if (ticket.status === 'pending_approval') {
  counts.financial_pending++;
}
```

E inicializar `financial_pending: 0` no objeto `counts`.

**3. `src/hooks/useTickets.tsx` -- Remover logica morta de `financial_pending`**

A logica especial de `statusFilter === 'financial_pending'` (linhas 79-91) nunca e ativada porque `Support.tsx` sempre passa `undefined` no primeiro parametro. Remover esse codigo morto para evitar confusao futura. A filtragem agora sera feita via `advancedFilters.status`.

### Impactos
- Sem downgrade: status dinamicos e outros filtros continuam funcionando
- Upgrade: admin/financial_manager agora veem tickets `pending_approval` na secao Financeiro com contagem correta
- O badge na sidebar reflete a quantidade real de tickets aguardando aprovacao

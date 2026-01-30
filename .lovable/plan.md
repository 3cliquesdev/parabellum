
# Plano: Corrigir Filtro "Minhas" que Não Mostra Conversa Ativa

## Diagnóstico Completo

### Evidência no Banco
A conversa existe e está correta:
- **ID**: `eaa94b00-34d0-4c16-a09f-e9271a6937c7`
- **Contato**: Ronildo Oliveira / fabiosou1542@gmail.com  
- **Status**: `open`
- **assigned_to**: `697a5d4e-9637-4b85-b7a0-bd880151648b` (você)
- **last_sender_type**: `user` (por isso não aparece em "Não respondidas" - correto)

### Causa Raiz: Cache Dessincronizado

O código atual usa **duas instâncias** do hook `useInboxView`:

```typescript
// Linha 106 - Com filtros (atualizado pelo realtime)
const { data: inboxItems } = useInboxView(inboxViewFilters);

// Linha 110 - Sem filtros (NÃO atualizado pelo realtime!)
const { data: rawInboxItems } = useInboxView();
```

O problema está na **linha 247**:
```typescript
const sourceInboxItems = rawInboxItems ?? inboxItems;
```

Quando `rawInboxItems` existe (mesmo stale), ele é usado em vez de `inboxItems`.

O realtime atualiza APENAS o cache que inclui os filtros atuais (linha 308-309):
```typescript
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, currentRole, currentDeptIds, currentFilters],
  // ↑ Inclui filtros - só atualiza o cache com filtros!
)
```

O `rawInboxItems` (filters = undefined) **NUNCA é atualizado pelo realtime**, ficando stale.

### Fluxo do Bug

```
1. Conversa é atribuída ao usuário
         ↓
2. Realtime recebe o evento
         ↓
3. Atualiza cache de inboxItems (com filtros) ✅
         ↓
4. NÃO atualiza cache de rawInboxItems (sem filtros) ❌
         ↓
5. Filtro "mine" usa: rawInboxItems ?? inboxItems
         ↓
6. rawInboxItems existe (stale) → usa ele
         ↓
7. Conversa nova não está no rawInboxItems stale
         ↓
8. Lista "Minhas" não mostra a conversa!
```

---

## Solução

### Opção 1: Criar Hook Dedicado para "Minhas" (Recomendado)
Similar ao que fizemos para "Não respondidas", criar um hook que consulta diretamente o banco:

**Novo arquivo**: `src/hooks/useMyInboxItems.tsx`

```typescript
export function useMyInboxItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-inbox-items", user?.id],
    queryFn: async (): Promise<InboxViewItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("inbox_view")
        .select("*")
        .eq("assigned_to", user.id)
        .neq("status", "closed")
        .order("updated_at", { ascending: true })
        .limit(5000);

      if (error) throw error;
      return data as InboxViewItem[];
    },
    staleTime: 2000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
  });
}
```

**Inbox.tsx**: Usar esse hook no filtro "mine":
```typescript
if (filter === "mine") {
  if (!myInboxItems || myInboxItems.length === 0) return [];
  return myInboxItems.map(item => {
    const fullConv = fullConversations.find(c => c.id === item.conversation_id);
    return fullConv || inboxItemToConversation(item);
  });
}
```

### Opção 2: Invalidar Todos os Caches no Realtime (Alternativa)
Modificar o realtime para usar `setQueriesData` em vez de `setQueryData`:

```typescript
// Antes (linha 308)
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, currentRole, currentDeptIds, currentFilters],
  ...
)

// Depois - atualiza TODOS os caches do inbox-view
queryClient.setQueriesData<InboxViewItem[]>(
  { queryKey: ["inbox-view"], exact: false },
  (prev = []) => mergeInboxItems(prev, [row])
);
```

---

## Plano de Implementação

### Mudança 1: Criar hook `useMyInboxItems`
**Novo arquivo**: `src/hooks/useMyInboxItems.tsx`
- Consulta direta ao banco para conversas do usuário atual
- Status != closed
- Ordenação por updated_at ASC

### Mudança 2: Usar hook no Inbox.tsx
**Arquivo**: `src/pages/Inbox.tsx`
- Importar `useMyInboxItems`
- Substituir lógica do filtro "mine" (linhas 280-289)
- Remover dependência de `rawInboxItems` para este filtro

### Mudança 3: (Opcional) Remover `rawInboxItems`
Se não for mais necessário após as mudanças, podemos remover a linha 110 para simplificar.

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useMyInboxItems.tsx` | **CRIAR** - Hook dedicado |
| `src/pages/Inbox.tsx` | Usar novo hook no filtro "mine" |

---

## Validação Pós-Implementação

1. Atribuir conversa ao usuário
2. Ir para "Minhas" (`/inbox?filter=mine`)
3. **Esperado**: Conversa aparece imediatamente
4. **Antes do fix**: Conversa não aparecia (cache stale)

Testes adicionais:
- Badge de "Minhas" bate com a lista
- Realtime funciona (nova conversa aparece sem refresh)
- "Não respondidas" continua funcionando
- Busca global continua funcionando

---

## Conformidade com Regras

- **Upgrade, não downgrade**: Melhora consistência sem quebrar outros filtros
- **Zero regressão**: Outros filtros usam lógica separada
- **Read-only**: Hook apenas faz SELECT, nunca UPDATE
- **Fonte de verdade**: Consulta direta ao banco, não depende de cache stale

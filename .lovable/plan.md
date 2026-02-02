
# Plano Final: Correção Completa do Handler Realtime do Inbox (4 Fixes + 2 Ajustes)

## Objetivo
Corrigir o "sumiço" de conversas no Inbox com 4 mudanças pontuais + 2 ajustes de segurança críticos no arquivo `src/hooks/useInboxView.tsx`.

---

## Alterações a Implementar

### Fix 4: QueryKey Estável (linhas 232-246)

Adicionar após as refs existentes (linha 245):

```typescript
// ✅ FIX 4: QueryKey estável - serializar departmentIds e filters para evitar mismatch
const deptKey = useMemo(() => 
  departmentIds ? [...departmentIds].sort().join(',') : 'all',
  [departmentIds]
);
const filtersKey = useMemo(() => 
  filters ? JSON.stringify(filters) : 'default',
  [filters]
);

// Refs para uso no realtime (sem resubscrição)
const deptKeyRef = useRef(deptKey);
deptKeyRef.current = deptKey;
const filtersKeyRef = useRef(filtersKey);
filtersKeyRef.current = filtersKey;
```

### Fix 4 (continuação): Alterar queryKey na query (linha 259)

```typescript
// ANTES:
queryKey: [...QUERY_KEY, user?.id, role, departmentIds, filters],

// DEPOIS:
queryKey: [...QUERY_KEY, user?.id, role, deptKey, filtersKey],
```

---

### Fix 1 + Ajuste A + Fix 2 + Fix 3: Handler Realtime (linhas 309-345)

Substituir o handler completo do inbox_view:

```typescript
(payload) => {
  // ✅ FIX 3: Logs com feature flag localStorage.inboxDebug
  const DEBUG = typeof window !== 'undefined' && 
    (window.localStorage?.getItem('inboxDebug') === '1' || import.meta.env.DEV);
  
  const row = (payload.new || payload.old) as InboxViewItem;
  if (!row?.conversation_id) return;

  const userId = user?.id;
  if (!userId) return;

  // Usar refs para valores atuais (sem recriar canal)
  const currentRole = roleRef.current;
  const currentDeptIds = departmentIdsRef.current || [];
  const hasFullAccess = hasFullInboxAccess(currentRole);

  // ✅ AJUSTE A: dept=null NÃO conta como "meu departamento" para colega
  const isInAllowedDepartment = 
    row.department !== null && currentDeptIds.includes(row.department);

  const isAssignedToMe = row.assigned_to === userId;

  // ✅ AJUSTE A: dept=null só aparece se unassigned (pool)
  const isUnassignedAllowed = 
    row.assigned_to === null && 
    (row.department === null || isInAllowedDepartment);

  // ✅ FIX 1: Colega do MESMO dept - só quando dept !== null
  const isAssignedToColleagueInMyDept = 
    row.assigned_to !== null && 
    row.assigned_to !== userId && 
    row.department !== null && 
    isInAllowedDepartment;

  const shouldShow = hasFullAccess || 
    isAssignedToMe || 
    isUnassignedAllowed ||
    isAssignedToColleagueInMyDept;

  if (DEBUG) {
    console.log(`[Inbox-Debug] ${new Date().toISOString()} | EVENT=${payload.eventType} | conv=${row.conversation_id.slice(0, 8)}`);
    console.log(`[Inbox-Debug] shouldShow=${shouldShow} | me=${isAssignedToMe} | unassignedAllowed=${isUnassignedAllowed} | colleagueSameDept=${isAssignedToColleagueInMyDept} | dept=${row.department ?? 'null'}`);
  }

  // ✅ FIX 4: Merge incremental no cache - queryKey estável
  queryClient.setQueryData<InboxViewItem[]>(
    [...QUERY_KEY, userId, currentRole, deptKeyRef.current, filtersKeyRef.current],
    (prev = []) => {
      // ✅ FIX 2: Só remove em DELETE explícito
      if (payload.eventType === "DELETE") {
        if (DEBUG) console.warn(`[Inbox-Debug] ⚠️ REMOVED (DELETE): ${row.conversation_id.slice(0, 8)}`);
        return prev.filter(item => item.conversation_id !== row.conversation_id);
      }

      // ✅ FIX 2: UPDATE com shouldShow=false -> ignora, NÃO destrói cache
      if (!shouldShow) {
        if (DEBUG) console.log(`[Inbox-Debug] ⏭️ IGNORED (shouldShow=false): ${row.conversation_id.slice(0, 8)}`);
        return prev;
      }

      if (DEBUG) console.log(`[Inbox-Debug] ✅ MERGED: ${row.conversation_id.slice(0, 8)}`);
      return mergeInboxItems(prev, [row as InboxViewItem]);
    }
  );

  // Invalidar counts para atualizar badges do sidebar
  queryClient.invalidateQueries({ queryKey: ["inbox-counts"], exact: false });

  // Atualizar cursor
  if (row.updated_at && (!lastSeenRef.current || row.updated_at > lastSeenRef.current)) {
    lastSeenRef.current = row.updated_at;
  }
}
```

---

### Fix 4 (continuação): Atualizar setQueryData no catch-up (linhas 361-362)

```typescript
// ANTES:
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, roleRef.current, departmentIdsRef.current, currentFilters],

// DEPOIS:
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, roleRef.current, deptKeyRef.current, filtersKeyRef.current],
```

---

### Fix 4 (continuação): Atualizar setQueryData no visibility change (linhas 507-508)

```typescript
// ANTES:
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, roleRef.current, departmentIdsRef.current, filtersRef.current],

// DEPOIS:
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, roleRef.current, deptKeyRef.current, filtersKeyRef.current],
```

---

### Fix 4 (continuação): Atualizar setQueryData no resetUnreadCount (linhas 529-530)

```typescript
// ANTES:
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, roleRef.current, departmentIdsRef.current, filtersRef.current],

// DEPOIS:
queryClient.setQueryData<InboxViewItem[]>(
  [...QUERY_KEY, user?.id, roleRef.current, deptKeyRef.current, filtersKeyRef.current],
```

---

## Resumo das Alterações

| Fix | Linhas | Descrição |
|-----|--------|-----------|
| **Ajuste A** | 320-325 | `dept=null` não conta como "meu dept" para colega |
| **Fix 1** | 320-325 | Adicionar `isAssignedToColleagueInMyDept` no `shouldShow` |
| **Fix 2** | 331-334 | Só remover em DELETE, ignorar UPDATE com shouldShow=false |
| **Fix 3** | 309 | Feature flag DEBUG via localStorage |
| **Fix 4** | 246+259+362+508+530 | Serializar deptKey/filtersKey para queryKey estável |

---

## Critérios de Aceite

1. Vendedor A vê conversa -> Vendedor B assume (mesmo dept) -> Conversa continua visível para A
2. Conversa com `department=null` atribuída a outro agente NAO aparece para vendedores
3. UPDATE não remove do cache (só DELETE remove)
4. Logs só aparecem com `localStorage.setItem('inboxDebug', '1')` ou em DEV
5. Cache é atualizado na key correta (sem entries duplicadas)

---

## Como Testar

1. **Sem debug:** Verificar que conversas não "somem" quando colega do mesmo dept assume
2. **Com debug:** `localStorage.setItem('inboxDebug', '1')` e verificar logs no console
3. **QueryKey:** Verificar no React Query DevTools que só existe 1 entry de inbox-view

---

## Impacto

- **Zero regressão**: Apenas ajusta lógica de cache, não altera queries de banco
- **Performance**: QueryKey estável evita cache miss/recriações
- **Diagnóstico**: Logs podem ser ativados sob demanda em produção

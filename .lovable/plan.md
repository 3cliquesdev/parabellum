

# Plano: Reverter para Distribuição Apenas no Departamento Exato

## Objetivo

Remover a lógica de fallback para departamentos pai/irmãos. Cada conversa será atribuída **apenas** a agentes do departamento exato onde ela está. Se não houver ninguém online nesse departamento, o job permanece pendente até:
- Um agente desse departamento ficar online, OU
- O gerente transferir manualmente para outro departamento

## Alteração no Código

**Arquivo**: `supabase/functions/dispatch-conversations/index.ts`

### Antes (atual - com fallback)
```typescript
// Build department hierarchy:
// 1. Primary: the exact department
// 2. Siblings: other children of same parent (for fallback)
// 3. Parent: if exists (for fallback)
const deptIds = [departmentId];

if (department?.parent_id) {
  deptIds.push(department.parent_id);
  
  const { data: siblings } = await supabase
    .from('departments')
    .select('id')
    .eq('parent_id', department.parent_id)
    .neq('id', departmentId);
  
  if (siblings?.length) {
    deptIds.push(...siblings.map((s: { id: string }) => s.id));
  }
}
```

### Depois (simples - apenas departamento exato)
```typescript
// SIMPLES: Buscar apenas no departamento exato da conversa
// Sem fallback para parent/siblings - gerente decide transferências
console.log(`[findEligibleAgent] Searching only in dept: ${departmentId}`);

const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, full_name, last_status_change')
  .eq('availability_status', 'online')
  .eq('is_blocked', false)
  .eq('department', departmentId)  // EXATO, sem .in()
  .in('id', eligibleUserIds);
```

## Remoções

1. Remover busca de `department.parent_id`
2. Remover busca de `siblings`
3. Remover array `deptIds` - usar `departmentId` direto
4. Remover lógica de `sort` por prioridade de departamento

## Comportamento Final

| Situação | Resultado |
|----------|-----------|
| Conversa em "Suporte Pedidos" + Oliveira online em "Suporte Pedidos" | Oliveira recebe |
| Conversa em "Suporte Sistema" + Oliveira online em "Suporte Pedidos" | Job fica pendente (departamentos diferentes) |
| Conversa em "Comercial" + Thaynara busy | Job fica pendente até Thaynara ficar online |
| Gerente transfere conversa para outro dept | Trigger cria novo job para o novo departamento |

## Vantagem

O gerente mantém controle total sobre qual departamento atende qual conversa. Não há "roubo" automático de conversas entre departamentos.


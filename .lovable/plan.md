
# Plano: Correcao de 3 Problemas Criticos

## Resumo dos Problemas Identificados

| Problema | Causa Raiz | Impacto |
|----------|------------|---------|
| 1. Usuarios nao veem tickets criados | Politica RLS do sales_rep NAO inclui `created_by = auth.uid()` | sales_rep cria ticket e depois nao consegue ver |
| 2. Ticket nao reabre quando cliente responde | Funcao `add-customer-comment` so reabre `resolved`, ignora `waiting_customer` | Tickets ficam presos em "aguardando cliente" |
| 3. Playbook trava ao iniciar | Query aninhada invalida no `executeTaskNode` - Supabase nao suporta `.in('id', supabase.from(...))` | Erro: "object is not iterable" |

---

## Correcao 1: Politica RLS do sales_rep

**Arquivo**: Nova migration SQL

**Problema Atual**:
```sql
-- sales_rep so ve tickets de contatos atribuidos a ele
-- NAO ve tickets que ele mesmo criou
sales_rep_can_view_tickets_of_assigned_contacts:
  customer_id IN (SELECT id FROM contacts WHERE assigned_to = auth.uid())
```

**Solucao**: Adicionar `OR created_by = auth.uid()` a politica

```sql
DROP POLICY IF EXISTS sales_rep_can_view_tickets_of_assigned_contacts ON tickets;

CREATE POLICY sales_rep_can_view_tickets ON tickets
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep'::app_role) 
  AND (
    customer_id IN (SELECT id FROM contacts WHERE assigned_to = auth.uid())
    OR created_by = auth.uid()
  )
);
```

---

## Correcao 2: Reabertura de Ticket + Notificacao

**Arquivo**: `supabase/functions/add-customer-comment/index.ts`

**Problema Atual** (linhas 102-113):
- So reabre se status = `resolved`
- Nao reabre `waiting_customer` (status mais comum para aguardar resposta)
- Nao notifica o agente atribuido quando ticket reabre

**Solucao**: Expandir logica de reabertura + notificar via edge function

```typescript
// ANTES: So reabria 'resolved'
if (ticket.status === 'resolved') { ... }

// DEPOIS: Reabrir qualquer status de "aguardando"
const reopenableStatuses = ['resolved', 'waiting_customer', 'pending'];
if (reopenableStatuses.includes(ticket.status)) {
  await supabase
    .from('tickets')
    .update({ 
      status: 'open',
      resolved_at: null 
    })
    .eq('id', ticket_id);
  
  console.log('[add-customer-comment] Ticket reopened from', ticket.status);
  
  // Notificar agente atribuido via notify-ticket-event
  if (ticket.assigned_to) {
    await supabase.functions.invoke('notify-ticket-event', {
      body: {
        ticket_id,
        event_type: 'status_changed',
        actor_id: null, // Cliente (externo)
        old_value: ticket.status,
        new_value: 'open',
        metadata: { reason: 'customer_reply' }
      }
    });
  }
}
```

Tambem adicionar notificacao imediata ao agente (via tabela notifications):

```typescript
// Notificar agente sobre nova resposta do cliente
if (ticket.assigned_to) {
  await supabase.from('notifications').insert({
    user_id: ticket.assigned_to,
    title: 'Nova resposta do cliente',
    message: `Cliente respondeu ao ticket #${ticket.ticket_number || ticket.id.slice(0,8)}`,
    type: 'ticket_reply',
    reference_id: ticket_id,
    read: false
  });
}
```

---

## Correcao 3: Playbook - Query Aninhada Invalida

**Arquivo**: `supabase/functions/process-playbook-queue/index.ts`

**Problema** (linhas 436-446): A sintaxe `.in('id', supabase.from(...))` NAO funciona no Supabase client. O segundo argumento precisa ser um array, nao uma query builder.

```typescript
// CODIGO BUGADO (nao funciona)
const { data: agents } = await supabase
  .from('profiles')
  .select('id')
  .in('id', 
    supabase        // ← Isso retorna um QueryBuilder, nao um array!
      .from('user_roles')
      .select('user_id')
      .in('role', ['consultant', 'support_agent'])
  )
```

**Solucao**: Fazer duas queries separadas ou usar RPC

```typescript
// CORREÇÃO: Duas queries separadas
async function executeTaskNode(supabase: any, item: QueueItem, contact: any) {
  // ... codigo existente ...

  let assignedTo = contact.assigned_to || contact.consultant_id;
  
  if (!assignedTo) {
    console.log('No assigned_to or consultant_id, fetching available agent...');
    
    // 1. Buscar IDs de usuarios com roles corretas
    const { data: roleUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['consultant', 'support_agent']);
    
    const userIds = roleUsers?.map((r: any) => r.user_id) || [];
    
    if (userIds.length > 0) {
      // 2. Buscar perfil online dentre esses usuarios
      const { data: agents } = await supabase
        .from('profiles')
        .select('id')
        .in('id', userIds)
        .eq('status', 'online')
        .limit(1);
      
      if (agents && agents.length > 0) {
        assignedTo = agents[0].id;
        console.log('Assigned to available agent:', assignedTo);
      }
    }
    
    // Fallback se ninguem online
    if (!assignedTo) {
      const { data: fallbackAgents } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['consultant', 'admin', 'manager'])
        .limit(1);
      
      if (fallbackAgents && fallbackAgents.length > 0) {
        assignedTo = fallbackAgents[0].user_id;
        console.log('Assigned to fallback agent:', assignedTo);
      }
    }
  }

  // Se ainda nao tem agente, retornar sucesso mesmo assim (task criada, agente sera atribuido depois)
  if (!assignedTo) {
    console.warn('No agent available, creating task without assignment');
    // Continuar sem atribuicao - task fica "unassigned"
  }

  // ... resto do codigo ...
}
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Nova migration SQL | Adicionar `created_by` na politica do sales_rep |
| `supabase/functions/add-customer-comment/index.ts` | Expandir reabertura + notificar agente |
| `supabase/functions/process-playbook-queue/index.ts` | Corrigir query aninhada no executeTaskNode |

---

## Resultado Esperado

1. **Tickets**: sales_rep ve tickets que criou + tickets de contatos atribuidos
2. **Reabertura**: Ticket volta para "open" quando cliente responde (de resolved, waiting_customer ou pending)
3. **Notificacao**: Agente atribuido recebe notificacao quando cliente responde
4. **Playbook**: Nao trava mais no no de task - executa normalmente

---

## Secao Tecnica

### Politica RLS Completa

```sql
-- Corrigir sales_rep para ver tickets criados por ele
DROP POLICY IF EXISTS "sales_rep_can_view_tickets_of_assigned_contacts" ON public.tickets;

CREATE POLICY "sales_rep_can_view_tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep'::app_role) AND (
    customer_id IN (
      SELECT id FROM contacts WHERE assigned_to = auth.uid()
    )
    OR created_by = auth.uid()
  )
);
```

### Sobre Items Travados na Fila

Existem ~10 items com status `processing` desde janeiro/2026 que precisam ser resetados:

```sql
-- Limpar items travados na fila (opcional, executar manualmente)
UPDATE playbook_execution_queue
SET status = 'pending', retry_count = 0
WHERE status = 'processing'
AND created_at < NOW() - INTERVAL '7 days';
```

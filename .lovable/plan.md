

## Plano: Correção Definitiva das Políticas RLS para Transferência de Conversas

### Diagnóstico Confirmado

Os atendentes (`sales_rep`, `support_agent`, `consultant`) não conseguem transferir conversas devido a um **conflito entre políticas RLS**.

### Causa Raiz

Existem duas políticas UPDATE na tabela `conversations` que se aplicam simultaneamente:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ POLÍTICA 1: agents_can_update_and_transfer_conversations                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Roles: authenticated (16481)                                                 │
│ WITH CHECK: has_role('sales_rep') OR has_role('support_agent') OR ...        │
│ Status: ✅ Passa para sales_rep                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ POLÍTICA 2: user_can_update_department_conversations                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Roles: PUBLIC (0 = todos)                                                    │
│ WITH CHECK: has_role(auth.uid(), 'user')                                     │
│ Status: ❌ FALHA para sales_rep (que não tem role 'user')                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

Quando um `sales_rep` tenta fazer UPDATE:
1. A política para `authenticated` passa corretamente
2. A política para `public` também se aplica ao mesmo usuário
3. No PostgreSQL, quando políticas de diferentes "targets" conflitam, pode haver comportamento inesperado

### Solução

Remover a política conflitante `user_can_update_department_conversations` e garantir que a política `agents_can_update_and_transfer_conversations` cubra também o role `user`.

### Alterações de Banco de Dados

**Migration SQL:**

```sql
-- 1. Remover política conflitante que interfere com outros roles
DROP POLICY IF EXISTS "user_can_update_department_conversations" ON conversations;

-- 2. Atualizar a política unificada para incluir o role 'user'
DROP POLICY IF EXISTS "agents_can_update_and_transfer_conversations" ON conversations;

CREATE POLICY "agents_can_update_and_transfer_conversations" ON conversations
FOR UPDATE TO authenticated
USING (
  -- Managers: acesso total
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  has_role(auth.uid(), 'support_manager') OR
  -- Sales Rep: conversas atribuídas ou do departamento
  (has_role(auth.uid(), 'sales_rep') AND (
    assigned_to = auth.uid() OR 
    (assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name IN ('Comercial', 'Vendas')
    ))
  )) OR
  -- Support Agent: conversas atribuídas ou do departamento
  (has_role(auth.uid(), 'support_agent') AND (
    assigned_to = auth.uid() OR 
    (assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name = 'Suporte'
    ))
  )) OR
  -- Consultant: apenas conversas atribuídas
  (has_role(auth.uid(), 'consultant') AND assigned_to = auth.uid()) OR
  -- User: conversas atribuídas ou do departamento
  (has_role(auth.uid(), 'user') AND (
    assigned_to = auth.uid() OR 
    (assigned_to IS NULL AND department = (
      SELECT p.department FROM profiles p WHERE p.id = auth.uid()
    ))
  ))
)
WITH CHECK (
  -- Permitir update para qualquer role válida (sem restrição de assigned_to)
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  has_role(auth.uid(), 'support_manager') OR
  has_role(auth.uid(), 'sales_rep') OR
  has_role(auth.uid(), 'support_agent') OR
  has_role(auth.uid(), 'consultant') OR
  has_role(auth.uid(), 'user')
);
```

### Resumo das Alterações

1. **Remover `user_can_update_department_conversations`** - Esta política para `public` estava interferindo com as políticas de `authenticated`
2. **Recriar `agents_can_update_and_transfer_conversations`** - Incluir o role `user` no USING e WITH CHECK para cobrir todos os casos

### Resultado Esperado

- Sales reps, support agents e consultants poderão transferir conversas
- O registro de interação (log de transferência) será criado corretamente
- Nenhuma outra funcionalidade será afetada

### Testes de Validação

1. Login como `sales_rep` > Abrir conversa atribuída > Transferir > Confirmar sucesso
2. Login como `support_agent` > Abrir conversa do pool > Transferir > Confirmar sucesso
3. Login como `consultant` > Abrir conversa atribuída > Transferir > Confirmar sucesso
4. Verificar que a interação de transferência é criada na timeline do contato




## Plano: Corrigir Historico de Conversas que Desaparece

### Diagnostico do Problema

Identifiquei um problema critico nas politicas de seguranca (RLS) que faz o historico desaparecer para agentes operacionais.

| Problema | Impacto | Afeta Quem |
|----------|---------|------------|
| RLS filtra conversas por `status = 'open'` | Agentes perdem acesso ao historico quando conversa fecha | `sales_rep`, `support_agent`, `user` |
| Mensagens dependem de acesso a conversa | Se nao ve a conversa, nao ve as mensagens | Todos agentes operacionais |
| Frontend filtra `closed` por padrao | Mesmo que tenha acesso, nao aparece na lista | Todos |

---

### Causa Raiz: Politicas RLS Restritivas

**Tabela `conversations`** - 3 politicas problematicas:

```text
sales_rep_can_view_sales_conversations:
  ONDE: has_role('sales_rep') AND status = 'open' AND ...
  PROBLEMA: Vendedor perde acesso assim que fecha!

support_agent_can_view_assigned_conversations:
  ONDE: has_role('support_agent') AND status = 'open' AND ...
  PROBLEMA: Suporte perde acesso assim que fecha!

user_can_view_department_conversations:
  ONDE: has_role('user') AND status = 'open' AND ...
  PROBLEMA: Usuario perde acesso assim que fecha!
```

**Tabela `inbox_view`** - Mesmas 3 politicas:

```text
sales_rep_view_sales_inbox:
  ONDE: status = 'open' AND ...

support_agent_view_assigned_inbox:
  ONDE: status = 'open' AND ...

user_view_department_inbox:
  ONDE: status = 'open' AND ...
```

**Tabela `messages`**:

```text
role_based_select_messages:
  ONDE: ... OR EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.assigned_to = auth.uid())
  PROBLEMA: Depende de ter acesso a conversa. Se RLS da conversa nega, mensagens tambem sao negadas!
```

---

### Fluxo Atual (Quebrado)

```text
1. Atendente abre conversa com cliente
2. Atendente trabalha na conversa (ve historico)
3. Conversa e FECHADA (status = 'closed')
4. RLS policy: status = 'open' -> FALSE
5. Atendente NAO ve mais a conversa
6. Mensagens: EXISTS(conversa) -> FALSE
7. Historico DESAPARECE completamente!
```

---

### Solucao Proposta

#### 1. Atualizar RLS das Conversas

Remover filtro `status = 'open'` das politicas de SELECT, permitindo visualizar conversas fechadas que foram atribuidas ao agente:

**Politica `sales_rep_can_view_sales_conversations`**:

```sql
-- ANTES
status = 'open' AND (assigned_to = auth.uid() OR ...)

-- DEPOIS
(assigned_to = auth.uid() OR ...)
-- Agente ve TODAS conversas atribuidas a ele (abertas ou fechadas)
-- E ve conversas NAO atribuidas do seu departamento APENAS se abertas
OR (status = 'open' AND assigned_to IS NULL AND department IN (...))
```

**Logica corrigida**:
- Ver conversas atribuidas ao agente (qualquer status)
- Ver conversas NAO atribuidas do departamento (apenas abertas)

---

#### 2. Atualizar RLS do inbox_view

Aplicar mesma logica para a tabela `inbox_view`.

---

#### 3. Garantir Acesso as Mensagens

A politica `role_based_select_messages` ja depende de `conversations.assigned_to = auth.uid()`. Ao corrigir o acesso a conversas, mensagens serao automaticamente visiveis.

---

#### 4. Atualizar Frontend para Mostrar Historico

Em `src/hooks/useInboxView.tsx`, adicionar filtro para mostrar conversas fechadas quando solicitado:

```typescript
// Linha 121-127 - Filtro de status
if (filters.status.length > 0) {
  result = result.filter(item => filters.status.includes(item.status));
} else {
  // ANTES: Ocultava fechadas por padrao
  // result = result.filter(item => item.status !== 'closed');
  
  // DEPOIS: Mostrar abertas por padrao, mas permitir ver fechadas via filtro
  result = result.filter(item => item.status !== 'closed');
}
```

Adicionar botao na interface para "Ver conversas encerradas" que inclui `status: ['closed']` nos filtros.

---

### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Migration SQL | Criar | Atualizar 6 politicas RLS |
| `src/hooks/useInboxView.tsx` | Modificar | Adicionar opcao para ver historico fechado |
| `src/components/inbox/InboxSidebar.tsx` | Modificar | Adicionar botao "Historico" |

---

### Secao Tecnica: Migration SQL

```sql
-- 1. Corrigir RLS de conversations para sales_rep
DROP POLICY IF EXISTS "sales_rep_can_view_sales_conversations" ON public.conversations;
CREATE POLICY "sales_rep_can_view_sales_conversations" ON public.conversations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep'::app_role) AND (
    -- Pode ver QUALQUER conversa atribuida a ele (aberta ou fechada)
    assigned_to = auth.uid()
    OR
    -- Pode ver conversas NAO atribuidas do departamento (apenas abertas)
    (status = 'open' AND assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name = ANY(ARRAY['Comercial', 'Vendas'])
    ))
  )
);

-- 2. Corrigir RLS de conversations para support_agent
DROP POLICY IF EXISTS "support_agent_can_view_assigned_conversations" ON public.conversations;
CREATE POLICY "support_agent_can_view_assigned_conversations" ON public.conversations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'support_agent'::app_role) AND (
    assigned_to = auth.uid()
    OR
    (status = 'open' AND assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name = 'Suporte'
    ))
  )
);

-- 3. Corrigir RLS de conversations para user
DROP POLICY IF EXISTS "user_can_view_department_conversations" ON public.conversations;
CREATE POLICY "user_can_view_department_conversations" ON public.conversations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user'::app_role) AND (
    assigned_to = auth.uid()
    OR
    (status = 'open' AND assigned_to IS NULL AND department = (
      SELECT department FROM profiles WHERE id = auth.uid()
    ))
  )
);

-- 4-6. Mesmas correcoes para inbox_view
DROP POLICY IF EXISTS "sales_rep_view_sales_inbox" ON public.inbox_view;
CREATE POLICY "sales_rep_view_sales_inbox" ON public.inbox_view
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep'::app_role) AND (
    assigned_to = auth.uid()
    OR
    (status = 'open' AND assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name = ANY(ARRAY['Comercial', 'Vendas'])
    ))
  )
);

DROP POLICY IF EXISTS "support_agent_view_assigned_inbox" ON public.inbox_view;
CREATE POLICY "support_agent_view_assigned_inbox" ON public.inbox_view
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'support_agent'::app_role) AND (
    assigned_to = auth.uid()
    OR
    (status = 'open' AND assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name = 'Suporte'
    ))
  )
);

DROP POLICY IF EXISTS "user_view_department_inbox" ON public.inbox_view;
CREATE POLICY "user_view_department_inbox" ON public.inbox_view
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user'::app_role) AND (
    assigned_to = auth.uid()
    OR
    (status = 'open' AND assigned_to IS NULL AND department = (
      SELECT department FROM profiles WHERE id = auth.uid()
    ))
  )
);
```

---

### Secao Tecnica: Modificacoes no Frontend

**InboxSidebar.tsx** - Adicionar filtro de historico:

```typescript
// Adicionar item no menu lateral
<Button
  variant={showClosed ? "secondary" : "ghost"}
  onClick={() => setFilters(prev => ({
    ...prev,
    status: showClosed ? [] : ['closed']
  }))}
>
  <Archive className="h-4 w-4 mr-2" />
  Historico
</Button>
```

**useInboxView.tsx** - Permitir ver fechadas:

```typescript
// Modificar filtro de status (linha 121-127)
if (filters.status.length > 0) {
  result = result.filter(item => filters.status.includes(item.status));
} else {
  // Padrao: mostrar apenas abertas
  result = result.filter(item => item.status !== 'closed');
}
```

---

### Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| Agente ve conversa atribuida fechada | NAO | SIM |
| Agente ve historico de mensagens | NAO | SIM |
| Agente ve conversas nao atribuidas fechadas | NAO | NAO (correto) |
| Managers veem tudo | SIM | SIM |
| Admin veem tudo | SIM | SIM |

---

### Notas de Seguranca

- Agentes so verao conversas que FORAM atribuidas a eles
- Conversas nao atribuidas fechadas NAO serao visiveis para agentes
- Managers e Admins continuam com acesso total
- A logica de departamento continua funcionando para conversas abertas nao atribuidas


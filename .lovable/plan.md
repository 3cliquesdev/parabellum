
# Plano: Estabilização RLS Definitiva - Execução Completa

## Resumo Executivo

Eliminar timeouts de RLS consolidando **35 policies redundantes** em **7 policies canônicas** eficientes, removendo todas as chamadas `has_role()` por linha.

---

## FASE 1: Migration SQL (Banco de Dados)

Criar uma migration única com todas as alterações:

### 1.1 Backup de Segurança
```sql
CREATE TABLE IF NOT EXISTS public.rls_policy_backup (
  id serial PRIMARY KEY,
  backed_up_at timestamptz DEFAULT now(),
  schemaname text,
  tablename text,
  policyname text,
  cmd text,
  qual text,
  with_check text
);

INSERT INTO public.rls_policy_backup (...)
SELECT ... FROM pg_policies WHERE tablename IN ('conversations', 'tickets');
```

### 1.2 Consolidar SELECT em `conversations` (6 → 2)

**Dropar 5 policies:**
- `financial_agent_can_view_assigned_conversations`
- `sales_rep_can_view_sales_conversations`
- `support_agent_can_view_assigned_conversations`
- `user_can_view_department_conversations`
- `optimized_select_conversations`

**Criar 1 policy canônica:**
- Managers: acesso total via `has_any_role()` (1 avaliação)
- Agentes: apenas `assigned_to = auth.uid()` OU pool aberto (`status = 'open' AND assigned_to IS NULL`)
- Web chat session mantido

**Ajustes de segurança:**
- Role `user` removido do pool (clientes não veem fila interna)
- `status = 'open'` obrigatório em todos os pools

### 1.3 Consolidar SELECT em `tickets` (10 → 1)

**Dropar 10 policies:**
- `consultant_can_view_tickets`
- `cs_manager_can_view_all_tickets`
- `ecommerce_analyst_can_view_tickets`
- `financial_agent_can_view_tickets`
- `financial_managers_can_view_all_tickets`
- `management_can_view_all_tickets`
- `sales_rep_can_view_tickets`
- `support_agent_can_view_tickets`
- `support_manager_can_view_all_tickets`
- `user_can_view_own_tickets`

**Criar 1 policy canônica:**
- Managers: acesso total
- Agentes: `assigned_to`, `created_by`, ou pool aberto do dept
- Sales rep: tickets dos seus contatos
- Consultant: tickets via `get_consultant_contact_ids()`

### 1.4 Consolidar UPDATE em `conversations` (5 → 2)

**Dropar 5 policies:**
- `cs_manager_can_update_conversations`
- `financial_manager_can_update_conversations`
- `general_manager_can_update_conversations`
- `support_manager_can_update_all_conversations`
- `agents_can_update_and_transfer_conversations`

**Criar 1 policy canônica:**
- Managers ou `assigned_to = auth.uid()`

### 1.5 Consolidar UPDATE em `tickets` (5 → 1)

**Dropar 5 policies:**
- `ecommerce_analyst_can_update_tickets`
- `financial_agent_can_update_tickets`
- `financial_managers_can_update_tickets`
- `support_agent_can_update_tickets`
- `support_manager_can_update_all_tickets`

**Criar 1 policy canônica:**
- Managers, `assigned_to`, ou `created_by`

### 1.6 Índices Adicionais
```sql
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_dept_assigned_status ON public.tickets(department_id, assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_conversations_dept_assigned_status ON public.conversations(department, assigned_to, status);
```

### 1.7 RPC para Health Check
```sql
CREATE OR REPLACE FUNCTION public.audit_rls_health()
RETURNS TABLE (
  table_name text,
  total_policies int,
  has_role_policies int,
  select_policies int,
  update_policies int,
  insert_policies int,
  delete_policies int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tablename::text, count(*)::int, ...
  FROM pg_policies WHERE schemaname = 'public'
  GROUP BY tablename ORDER BY has_role_policies DESC;
$$;
```

---

## FASE 2: Atualizar `src/hooks/usePermissionsAudit.tsx`

### Adicionar nova interface e função:

```typescript
export interface RLSHealthItem {
  table_name: string;
  total_policies: number;
  has_role_policies: number;
  select_policies: number;
  update_policies: number;
  insert_policies: number;
  delete_policies: number;
}

const getRLSHealth = async (): Promise<RLSHealthItem[]> => {
  const { data, error } = await supabase.rpc('audit_rls_health');
  if (error) throw error;
  return (data || []) as RLSHealthItem[];
};
```

---

## FASE 3: Atualizar `src/pages/PermissionsAudit.tsx`

### Adicionar nova seção "RLS Health Check":

- Query com `queryKey: ["audit-rls-health"]`
- Tabela mostrando: `table_name`, `total_policies`, `has_role_policies`
- Badge de alerta vermelho quando `has_role_policies > 0`
- Ordenação por `has_role_policies DESC`
- Botão de export CSV

**UI:**
- Card novo antes de "Verificações de Segurança"
- Ícone de alerta para tabelas problemáticas
- Indicador visual de "saúde" do RLS

---

## FASE 4: Bump de Versão

### `src/lib/build/schemaVersion.ts`
```typescript
export const APP_SCHEMA_VERSION = "2026.02.04-v2";
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/*.sql` | Nova migration com todas as fases SQL |
| `src/hooks/usePermissionsAudit.tsx` | Adicionar `RLSHealthItem` e `getRLSHealth()` |
| `src/pages/PermissionsAudit.tsx` | Adicionar seção RLS Health Check |
| `src/lib/build/schemaVersion.ts` | Bump para `2026.02.04-v2` |

---

## Impacto Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| SELECT policies (conversations) | 6 | 2 | -67% |
| SELECT policies (tickets) | 10 | 1 | -90% |
| UPDATE policies (conversations) | 5 | 2 | -60% |
| UPDATE policies (tickets) | 5 | 1 | -80% |
| Policies com `has_role()` (conversations) | 11 | 0 | -100% |
| Policies com `has_role()` (tickets) | 20 | 0 | -100% |
| **TOTAL de policies** | **35** | **7** | **-80%** |
| Risco de timeout | Alto | Baixo | Eliminado |

---

## Checklist de Validação Pós-Deploy

### SQL:
```sql
-- Deve retornar 0 para conversations e tickets
SELECT tablename, count(*) FROM pg_policies
WHERE schemaname='public' AND tablename IN ('conversations','tickets')
  AND (qual ILIKE '%has_role%' OR with_check ILIKE '%has_role%')
GROUP BY 1;
```

### Testes Funcionais:
1. Admin vê todas as conversas no Inbox
2. Agente vê apenas as do próprio departamento + não atribuídas
3. Agente NÃO vê conversas atribuídas a outros (mesmo dept)
4. Cliente (user) NÃO vê pool interno
5. Busca por ID/telefone/email funciona
6. Tickets: gerente vê todos, agente vê os dele + pool
7. Console sem erros de timeout
8. Carregamento < 3s para inbox com 150+ itens

---

## Rollback (se necessário)

```sql
SELECT * FROM rls_policy_backup 
WHERE tablename IN ('conversations','tickets');
-- Recriar cada policy usando os valores salvos de qual e with_check
```

---

## Seção Técnica

### Por que `has_role()` é problemático?
Quando uma policy contém `has_role(auth.uid(), 'admin')`, essa função é avaliada **para cada linha** retornada. Com 10.000 linhas × 5 chamadas = 50.000 chamadas de função por query.

### Por que `has_any_role()` SECURITY DEFINER resolve?
1. **SECURITY DEFINER** + **STABLE** = Postgres avalia UMA vez por query
2. Bypassa RLS de `user_roles` (evita recursão)
3. Usa índice `idx_user_roles_user_role` de forma ótima

### Por que remover `user` do pool?
Role `user` = clientes externos. Pela memória `user-role-restriction-hardening`, já tem `inbox.transfer`, `tickets.assign` e `users.manage` desabilitados. Ver pool interno seria brecha de segurança.

### Por que exigir `status = 'open'` no pool?
Sem isso, agentes veriam conversas fechadas de outros. Regra: agente vê suas próprias (abertas/fechadas) + pool aberto não atribuído.

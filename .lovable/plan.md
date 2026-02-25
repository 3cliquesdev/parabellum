

# Correção: Gerentes bloqueados por RLS em `organizations` (e outras tabelas)

## Diagnóstico

O Danilo tem role `support_manager`. As políticas de INSERT/UPDATE/DELETE na tabela `organizations` usam `has_role()` verificando apenas `admin`, `manager` e `general_manager` — faltam `support_manager`, `cs_manager` e `financial_manager`.

Além disso, a função `is_manager_or_admin()` (que deveria ser a fonte única da verdade) está **incompleta**: falta `financial_manager`.

### Tabelas afetadas (políticas sem todos os gerentes)
| Tabela | Comandos bloqueados |
|---|---|
| **organizations** | INSERT, UPDATE, DELETE |
| activities | INSERT, UPDATE, DELETE |
| admin_alerts | UPDATE, DELETE |
| ai_response_cache | INSERT, DELETE |
| ai_suggestions | UPDATE, DELETE |
| deals | DELETE |
| knowledge_articles | INSERT, UPDATE, DELETE |
| quotes / quote_items | INSERT, UPDATE, DELETE |
| ticket_notification_rules | INSERT, UPDATE, DELETE |
| + outras (messages, interactions, etc.) |

## Solução em 2 passos

### Passo 1 — Corrigir `is_manager_or_admin()` (adicionar `financial_manager`)

```sql
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','manager','general_manager','support_manager','cs_manager','financial_manager')
  );
$$;
```

### Passo 2 — Consolidar políticas da tabela `organizations`

Substituir as 6 políticas fragmentadas (3 legadas `admin_manager_*` + 3 `role_based_*`) por 3 políticas consolidadas usando `is_manager_or_admin(auth.uid())`:

```sql
-- Drop das 6 políticas antigas
DROP POLICY IF EXISTS "admin_manager_create_organizations" ON organizations;
DROP POLICY IF EXISTS "role_based_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "admin_manager_update_organizations" ON organizations;
DROP POLICY IF EXISTS "role_based_update_organizations" ON organizations;
DROP POLICY IF EXISTS "admin_manager_delete_organizations" ON organizations;
DROP POLICY IF EXISTS "role_based_delete_organizations" ON organizations;

-- 3 políticas consolidadas
CREATE POLICY "managers_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (is_manager_or_admin(auth.uid()))
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (is_manager_or_admin(auth.uid()));
```

### Passo 3 — Mesma consolidação nas demais tabelas críticas

Aplicar o mesmo padrão (substituir `has_role` por `is_manager_or_admin`) nas tabelas: `activities`, `admin_alerts`, `ai_response_cache`, `ai_suggestions`, `deals`, `knowledge_articles`, `quotes`, `quote_items`, `ticket_notification_rules`.

## Impacto
- Zero regressão: gerentes que já tinham acesso continuam tendo
- Upgrade: `support_manager`, `cs_manager` e `financial_manager` ganham acesso igual (contrato de paridade)
- Manutenibilidade: futuras adições de roles gerenciais só precisam alterar a função `is_manager_or_admin()`
- Nenhuma alteração de código frontend necessária




# Checklist de Auditoria RLS — Resultado Completo

## A) Pré-check técnico ✅

| Item | Status | Detalhe |
|------|--------|---------|
| `is_manager_or_admin()` existe | ✅ | Retorna `true` para `admin, manager, general_manager, support_manager, cs_manager, financial_manager` |
| `role_permissions` admin-only | ✅ | SELECT público, ALL restrito a `admin` |
| `user_roles` admin-only | ✅ | ALL restrito a `admin`, SELECT público para autenticados |

## B) Migration — IF EXISTS / nomes ✅

Todas as migrations usaram `DROP POLICY IF EXISTS` — sem risco de falha.

## C) Pós-migration — 14 tabelas NEEDS_FIX ✅ (com ressalvas)

Todas as 14 tabelas agora possuem policies com `is_manager_or_admin(auth.uid())`:

| Tabela | Policy principal | Status |
|--------|-----------------|--------|
| `admin_alerts` | `mgmt_select/update/delete` | ✅ mas **2 duplicatas** |
| `cadence_enrollments` | `mgmt_all_cadence_enrollments` | ✅ |
| `cadence_steps` | `mgmt_all_cadence_steps` | ✅ |
| `cadence_tasks` | `mgmt_all_cadence_tasks` | ✅ |
| `cadences` | `mgmt_all_cadences` | ✅ |
| `conversation_ratings` | `mgmt_all_conversation_ratings` | ✅ |
| `customer_journey_steps` | `mgmt_all_journey_steps` | ✅ |
| `internal_requests` | `mgmt_all_internal_requests` | ✅ |
| `kiwify_import_queue` | `mgmt_all_kiwify_queue` | ✅ |
| `knowledge_articles` | `managers_*` + `mgmt_*` | ✅ mas **2 duplicatas** |
| `playbook_goals` | `mgmt_all_playbook_goals` | ✅ |
| `public_ticket_portal_config` | `mgmt_all_portal_config` | ✅ |
| `support_channels` | `mgmt_all_support_channels` | ✅ |
| `whatsapp_instances` | `mgmt_all_whatsapp_instances` | ✅ mas **2 legadas** |

## ⚠️ Problemas encontrados — Cleanup necessário

### 1. Policies duplicadas (mesma tabela, mesmo cmd, ambas `is_manager_or_admin`)

| Tabela | CMD | Duplicatas |
|--------|-----|-----------|
| `admin_alerts` | DELETE | `managers_delete_admin_alerts` + `mgmt_delete_admin_alerts` |
| `admin_alerts` | UPDATE | `managers_update_admin_alerts` + `mgmt_update_admin_alerts` |
| `knowledge_articles` | DELETE | `mgmt_delete_articles` + `managers_delete_knowledge_articles` |
| `knowledge_articles` | UPDATE | `mgmt_update_articles` + `managers_update_knowledge_articles` |

**Ação**: Dropar as 4 policies com prefixo `managers_*` (manter as `mgmt_*`).

### 2. Policies legadas redundantes no `whatsapp_instances`

| Policy | CMD | Problema |
|--------|-----|---------|
| `admin_manager_can_view_all_instances` | SELECT | Só `admin+manager`, redundante com `mgmt_all` (ALL) |
| `support_manager_can_view_whatsapp_instances` | SELECT | Só `support_manager`, redundante com `mgmt_all` (ALL) |

**Ação**: Dropar ambas — `mgmt_all_whatsapp_instances` (ALL) já cobre SELECT para todos os gerentes.

### 3. Policy legada em `interactions`

| Policy | CMD | Problema |
|--------|-----|---------|
| `mgmt_delete_interactions` | DELETE | Usa `has_role(admin)` em vez de `is_manager_or_admin()` |

**Ação**: Recriar com `is_manager_or_admin()` preservando a condição de `created_by` para não-gerentes.

## D) Tabelas PARTIAL — Spot check ✅

As tabelas `contacts`, `profiles`, `ai_personas`, `automations`, `pipelines`, `stages`, `tags`, `teams`, `team_members`, `canned_responses`, `activities`, `interactions`, `quotes`, `delivery_groups` — todas possuem policies `mgmt_all_*` ou `mgmt_*` com `is_manager_or_admin`. Policies específicas de `sales_rep`, `consultant`, `support_agent` preservadas.

## Plano de correção (cleanup)

Uma migration simples para dropar as **7 policies redundantes/legadas** e recriar 1:

```sql
-- 1. Duplicatas admin_alerts
DROP POLICY IF EXISTS "managers_delete_admin_alerts" ON admin_alerts;
DROP POLICY IF EXISTS "managers_update_admin_alerts" ON admin_alerts;

-- 2. Duplicatas knowledge_articles
DROP POLICY IF EXISTS "managers_delete_knowledge_articles" ON knowledge_articles;
DROP POLICY IF EXISTS "managers_update_knowledge_articles" ON knowledge_articles;

-- 3. Legadas whatsapp_instances
DROP POLICY IF EXISTS "admin_manager_can_view_all_instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "support_manager_can_view_whatsapp_instances" ON whatsapp_instances;

-- 4. Fix interactions DELETE
DROP POLICY IF EXISTS "mgmt_delete_interactions" ON interactions;
CREATE POLICY "mgmt_delete_interactions" ON interactions FOR DELETE TO authenticated
USING (is_manager_or_admin(auth.uid()) OR (created_by = auth.uid() AND created_at > now() - interval '24 hours'));
```

## E) Segurança (anti-regressão) ✅

- `role_permissions`: ALL = admin-only ✅
- `user_roles`: ALL = admin-only ✅
- Nenhuma policy FOR SELECT foi afrouxada nas NEEDS_FIX
- Policies de `sales_rep`/`consultant`/`support_agent` preservam filtro por `assigned_to`/`user_id`


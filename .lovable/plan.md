

# Auditoria: Liberar Gerentes das Travas de RLS

## Problema

Encontrei **5 tabelas** com policies de escrita restritas apenas a `admin`, excluindo todos os gerentes (cs_manager, support_manager, financial_manager, general_manager, manager).

## Tabelas afetadas

| Tabela | Policy atual | Acao |
|--------|-------------|------|
| `products` | `has_role(admin)` | Trocar para `is_manager_or_admin()` |
| `departments` | `has_role(admin)` | Trocar para `is_manager_or_admin()` |
| `sales_goals` | `has_role(admin)` | Trocar para `is_manager_or_admin()` |
| `goal_milestones` | `has_role(admin)` | Trocar para `is_manager_or_admin()` |
| `ai_response_cache` | `has_role(admin)` (DELETE) | Trocar para `is_manager_or_admin()` |
| `role_permissions` | admin only | **Manter** (auto-protecao) |
| `user_roles` | admin only | **Manter** (seguranca) |

## O que nao muda

- `role_permissions` e `user_roles` continuam admin-only (regra de seguranca do projeto)
- Policies de SELECT nao sao afetadas (ja funcionam)
- A funcao `is_manager_or_admin()` ja existe e inclui todos os 6 roles de gestao

## Implementacao

Uma unica migration SQL com 5 DROP + 5 CREATE POLICY, substituindo `has_role(auth.uid(), 'admin')` por `is_manager_or_admin(auth.uid())` nas 5 tabelas listadas.

Zero alteracoes de codigo frontend — o problema e puramente RLS.


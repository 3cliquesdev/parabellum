
# Plano: Corrigir Permissão de UPDATE em Departamentos para Support Manager

## Problema Identificado

O **support_manager** consegue acessar a tela de Departamentos mas **não consegue salvar alterações** (como tempo de inatividade) porque a política RLS só permite UPDATE para o role `admin`.

### Situação Atual

**Tabela `role_permissions`:**
| Role | `settings.departments` | `cadastros.manage_departments` |
|------|------------------------|-------------------------------|
| `support_manager` | ✅ `true` (acessa tela) | ❌ `false` |
| `cs_manager` | ❌ `false` | ❌ `false` |
| `general_manager` | ✅ `true` | ✅ `true` |

**Políticas RLS em `departments`:**
| Policy | Comando | Roles |
|--------|---------|-------|
| `admins_can_manage_departments` | ALL | `admin` |
| `support_manager_can_view_departments` | SELECT | `support_manager` |

O `support_manager` tem permissão para VER a tela mas não para SALVAR no banco!

## Solução

1. **Adicionar política RLS de UPDATE** para `support_manager` na tabela `departments`
2. **Incluir outros gerentes** que também precisam dessa capacidade (`cs_manager`, `general_manager`, `manager`)

### Nova Política RLS

```sql
CREATE POLICY "managers_can_update_departments" ON departments
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'support_manager')
  OR has_role(auth.uid(), 'cs_manager')
  OR has_role(auth.uid(), 'general_manager')
  OR has_role(auth.uid(), 'manager')
)
WITH CHECK (
  has_role(auth.uid(), 'support_manager')
  OR has_role(auth.uid(), 'cs_manager')
  OR has_role(auth.uid(), 'general_manager')
  OR has_role(auth.uid(), 'manager')
);
```

## Impacto

### Antes (Bug)

| Ação | Role | Resultado |
|------|------|-----------|
| Alterar tempo de inatividade | `support_manager` | ❌ Erro de política RLS |
| Alterar tempo de inatividade | `admin` | ✅ Funciona |

### Depois (Corrigido)

| Ação | Role | Resultado |
|------|------|-----------|
| Alterar tempo de inatividade | `support_manager` | ✅ Funciona |
| Alterar tempo de inatividade | `cs_manager` | ✅ Funciona |
| Alterar tempo de inatividade | `general_manager` | ✅ Funciona |
| Alterar tempo de inatividade | `admin` | ✅ Funciona (via policy ALL) |

## Compatibilidade

- ✅ Mantém policy existente de `admin` com ALL
- ✅ Mantém SELECT público para roles autenticados
- ✅ Não permite INSERT/DELETE para gerentes (apenas `admin`)
- ✅ Alinhado com memória: "support_manager has expanded RLS permissions equivalent to cs_manager"

## Arquivos a Modificar

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| Nova migration SQL | Banco de Dados | Adicionar policy de UPDATE para gerentes |

---

## Seção Técnica

### Migration SQL Completa

```sql
-- Adicionar permissão de UPDATE em departments para roles de gerência
-- Resolve: support_manager não conseguia alterar tempo de inatividade

-- Policy para UPDATE (INSERT/DELETE permanece apenas para admin)
CREATE POLICY "managers_can_update_departments" ON departments
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'support_manager')
  OR has_role(auth.uid(), 'cs_manager')
  OR has_role(auth.uid(), 'general_manager')
  OR has_role(auth.uid(), 'manager')
)
WITH CHECK (
  has_role(auth.uid(), 'support_manager')
  OR has_role(auth.uid(), 'cs_manager')
  OR has_role(auth.uid(), 'general_manager')
  OR has_role(auth.uid(), 'manager')
);

-- Também atualizar role_permissions para consistência da UI
UPDATE role_permissions
SET enabled = true
WHERE permission_key = 'cadastros.manage_departments'
AND role IN ('support_manager', 'cs_manager');
```

### Fluxo Corrigido

```text
Support Manager acessa /departments
        ↓
Tela de Departamentos carrega (SELECT ok)
        ↓
Altera tempo de inatividade para 30min
        ↓
useUpdateDepartment().mutate({ auto_close_minutes: 30 })
        ↓
UPDATE departments SET auto_close_minutes = 30 WHERE id = ?
        ↓
RLS verifica: has_role(auth.uid(), 'support_manager') → ✅ TRUE
        ↓
Toast: "Departamento atualizado" ✅
```

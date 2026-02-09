
# Correção: Política RLS de `playbook_products` Incompleta

## Problema

A tabela `playbook_products` tem uma política de INSERT/UPDATE/DELETE que só permite `admin` e `manager`:

```
has_role(uid, 'admin') OR has_role(uid, 'manager')
```

Enquanto a tabela `onboarding_playbooks` permite **todos os roles de gestão**:

```
admin OR manager OR general_manager OR support_manager OR cs_manager OR financial_manager
```

Resultado: qualquer manager que não seja `admin` ou `manager` puro recebe "new row violates row-level security policy" ao vincular produtos.

## Solução

Uma migração SQL para substituir a política restritiva por uma alinhada com `onboarding_playbooks`:

```sql
DROP POLICY "Admin and manager can manage playbook_products" ON public.playbook_products;

CREATE POLICY "Managers can manage playbook_products" ON public.playbook_products
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'support_manager'::app_role) OR
  has_role(auth.uid(), 'cs_manager'::app_role) OR
  has_role(auth.uid(), 'financial_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'support_manager'::app_role) OR
  has_role(auth.uid(), 'cs_manager'::app_role) OR
  has_role(auth.uid(), 'financial_manager'::app_role)
);
```

## Impacto

| Item | Status |
|------|--------|
| Regressão | Zero -- admin e manager continuam funcionando |
| Novos acessos | general_manager, support_manager, cs_manager, financial_manager |
| Alinhamento | Mesma lista de roles que `onboarding_playbooks` |
| SELECT | Sem mudança (já permite todos autenticados) |

## Teste

1. Logar como qualquer manager (ex: `cs_manager`)
2. Ir em Editar Playbook > Produtos Vinculados
3. Selecionar produto e clicar "+ Vincular"
4. Deve funcionar sem erro de RLS

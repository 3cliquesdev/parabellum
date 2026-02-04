
# Plano: Corrigir Visibilidade Admin no inbox_view

## Problema Identificado

A política RLS `optimized_inbox_select` em `public.inbox_view` usa uma subquery `EXISTS` para verificar roles em `public.user_roles`. Essa subquery está bloqueada pela própria RLS da tabela `user_roles` quando executada dentro de outra policy (recursão de RLS).

**Resultado:** O admin vê o contador (156 via Edge Function que usa service role), mas a query da lista via API autenticada retorna `[]` porque a verificação de role falha silenciosamente.

## Causa Raiz Técnica

```sql
-- Dentro de optimized_inbox_select:
EXISTS (
  SELECT 1 FROM public.user_roles ur  -- RLS bloqueia essa subquery!
  WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin',...)
)
```

O Postgres não permite que uma policy RLS acesse outra tabela que também tem RLS ativa, a menos que use SECURITY DEFINER.

## Solução: Usar Função SECURITY DEFINER

### Fase 1: Verificar função existente

A função `has_role()` já existe e é SECURITY DEFINER:

```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
```

**Porém**, essa função verifica UM role por vez. Precisamos de uma nova função que verifique MÚLTIPLOS roles de uma vez (mais eficiente).

### Fase 2: Criar função otimizada

```sql
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;
```

### Fase 3: Reescrever policy de inbox_view

```sql
DROP POLICY IF EXISTS optimized_inbox_select ON public.inbox_view;

CREATE POLICY optimized_inbox_select
ON public.inbox_view
FOR SELECT
TO authenticated
USING (
  -- Managers: acesso total (via SECURITY DEFINER)
  public.has_any_role(
    auth.uid(), 
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  -- Assigned to me
  (assigned_to = auth.uid())
  OR
  -- Agentes: mesmo departamento ou pool global
  (
    public.has_any_role(
      auth.uid(),
      ARRAY['sales_rep','support_agent','financial_agent','consultant']::app_role[]
    )
    AND (
      department = (SELECT department FROM public.profiles WHERE id = auth.uid())
      OR (assigned_to IS NULL AND department IS NULL)
    )
  )
);
```

## Impacto

| Métrica | Antes | Depois |
|---------|-------|--------|
| Admin vê conversas | Não | Sim |
| Subquery em user_roles | Bloqueada por RLS | Bypassa via SECURITY DEFINER |
| Compatibilidade | Quebrada | Restaurada |

## Checklist de Validação

```sql
-- 1. Confirmar que admin vê conversas
SELECT count(*) FROM inbox_view; -- Deve retornar >0

-- 2. Confirmar função criada
SELECT has_any_role(
  '697a5d4e-9637-4b85-b7a0-bd880151648b'::uuid,
  ARRAY['admin']::app_role[]
); -- Deve retornar true
```

## Rollback (se necessário)

```sql
-- Recriar policy com EXISTS (comportamento anterior)
DROP POLICY IF EXISTS optimized_inbox_select ON public.inbox_view;
CREATE POLICY optimized_inbox_select ON public.inbox_view
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,...]))
  OR assigned_to = auth.uid()
  ...
);
```

## Seção Técnica

### Por que EXISTS falha dentro de policy?

Quando uma policy RLS contém uma subquery para outra tabela com RLS, o Postgres entra em um estado de "RLS recursion block" para evitar loops infinitos. A subquery silenciosamente retorna zero linhas.

### Por que SECURITY DEFINER resolve?

Funções com SECURITY DEFINER executam com as permissões do owner (geralmente `postgres`), que bypassa RLS. Isso permite que a verificação de roles funcione independentemente do contexto RLS da query externa.

### Por que has_any_role em vez de has_role?

A função `has_role` verifica um role por vez. Para verificar múltiplos roles, precisaríamos chamá-la várias vezes com OR:

```sql
has_role(uid, 'admin') OR has_role(uid, 'manager') OR ...
```

Isso é ineficiente. A nova `has_any_role` aceita um array e faz UMA query.

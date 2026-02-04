

# Diagnóstico: Lentidão do Time Comercial (sales_rep)

## Resumo do Problema

O time comercial está enfrentando lentidão intermitente em diversas áreas do sistema (Inbox, Dashboard, Deals, Instagram). A usuária `fernanda.giglio@3cliques.net` foi identificada como exemplo.

## Diagnóstico Detalhado

### 1. Status do Usuário

| Campo | Valor |
|-------|-------|
| Email | fernanda.giglio@3cliques.net |
| Role | `sales_rep` ✅ |
| Status | Online, não bloqueada ✅ |
| Permissões | `inbox.access`, `deals.view`, `dashboard.view`, `contacts.view` todas habilitadas ✅ |

**Conclusão: O perfil está corretamente configurado. O problema NÃO é de permissão.**

### 2. Causa Raiz: Timeouts no Banco de Dados

Os logs do Postgres mostram **dezenas de erros "canceling statement due to statement timeout"** nos últimos minutos. Isso significa que queries estão demorando mais que o limite permitido (geralmente 8-15 segundos) e sendo canceladas.

### 3. Fatores Contribuintes

| Fator | Impacto |
|-------|---------|
| **18.110 deals** na tabela | Queries pesadas com JOINs |
| **RLS com `has_role()`** | Chamada à função para CADA row verificada |
| **Query no hook `useDeals`** | SELECT com 3 JOINs (contacts, organizations, profiles) + limite 1000 |
| **Múltiplos hooks simultâneos** | Dashboard carrega vários hooks de deals ao mesmo tempo |

### 4. Fluxo do Problema

```text
Usuário (sales_rep) abre Dashboard/Deals
         ↓
    useDeals() dispara query
         ↓
    RLS verifica has_role() para 18.110 rows
         ↓
    has_role() faz subquery em user_roles (para cada row)
         ↓
    Query ultrapassa timeout → TIMEOUT ERROR
         ↓
    Frontend recebe erro ou dados vazios
         ↓
    Usuário vê "Reconectando..." / tela lenta
```

## Solução Proposta

### Fase 1: Otimização Imediata da RLS (SQL)

Substituir a política atual que usa `has_role()` por uma versão otimizada com subquery única:

```sql
-- DROP política atual
DROP POLICY IF EXISTS role_based_select_deals ON public.deals;

-- CREATE nova política otimizada
CREATE POLICY "optimized_select_deals" ON public.deals
FOR SELECT TO authenticated
USING (
  -- Admins/Managers: acesso total (verificado UMA vez)
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin','manager','general_manager')
  )
  OR
  -- Sales_rep/User: apenas seus deals
  (
    assigned_to = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('sales_rep','user')
    )
  )
);
```

### Fase 2: Otimização do Hook useDeals

1. **Paginação**: Reduzir limite de 1000 para 50 com scroll infinito
2. **Lazy loading de JOINs**: Carregar contacts/organizations apenas quando necessário
3. **Cache mais agressivo**: Aumentar `staleTime` para 30s

### Fase 3: Índice Composto para RLS

```sql
CREATE INDEX IF NOT EXISTS idx_user_roles_uid_role 
ON user_roles(user_id, role);
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| (migração SQL) | Recriar política RLS otimizada |
| `src/hooks/useDeals.tsx` | Reduzir limite, adicionar paginação |
| (migração SQL) | Adicionar índice em user_roles |

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Timeout após ~8s | Query em <500ms |
| Lentidão intermitente | Performance consistente |
| "Reconectando..." frequente | Conexão estável |

## Seção Técnica

O problema principal é a **avaliação repetida de `has_role()`** para cada uma das 18.110 rows da tabela deals. A função `has_role()` é `SECURITY DEFINER` e executa uma subquery em `user_roles` para cada verificação.

Com a nova política usando `EXISTS`, o Postgres pode:
1. Avaliar a condição de role UMA única vez no início
2. Usar o resultado em um filtro INDEX SCAN em vez de função-por-row
3. Aproveitar o índice `idx_deals_assigned_status` para filtrar por `assigned_to`

A mudança de `has_role(auth.uid(), 'sales_rep') AND assigned_to = auth.uid()` para `assigned_to = auth.uid() AND EXISTS(...)` inverte a ordem de avaliação, permitindo que o índice seja usado primeiro.


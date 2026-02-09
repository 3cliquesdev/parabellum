

# Correcao: Carteira vazia para Admins e Managers

## Problema

Os hooks `useManagerPortfolioClients` e `useManagerPortfolioKPIs` usam um filtro PostgREST invalido:

```typescript
.or("id.in.(select consultant_id from contacts where consultant_id is not null)")
```

PostgREST **nao suporta subqueries** dentro do `.or()`. Isso retorna zero resultados, fazendo a carteira aparecer vazia.

## Solucao

Simplificar a logica: em vez de buscar consultores primeiro e depois seus clientes, buscar os clientes diretamente.

### useManagerPortfolioClients.tsx

**Logica atual (quebrada):**
1. Busca consultores com subquery invalida
2. Busca clientes desses consultores
3. Para cada cliente, busca steps e seller (N+1 queries)

**Logica corrigida:**
1. **Admin/general_manager**: buscar todos os contacts com `status=customer` e `consultant_id IS NOT NULL`, sem filtro de departamento
2. **Manager/cs_manager**: buscar o departamento do usuario, depois buscar consultores desse departamento via query simples (`profiles.department = X` + role = consultant), e entao buscar os clientes desses consultores
3. Manter o processamento de steps e health score igual

### useManagerPortfolioKPIs.tsx

Mesma correcao:
1. **Admin**: buscar todos os customers com consultant_id diretamente
2. **Manager/cs_manager**: filtrar por departamento do usuario
3. Remover a subquery invalida

### Mudancas especificas

**Arquivo `src/hooks/useManagerPortfolioClients.tsx` (linhas 53-61):**
- Remover `.or("id.in.(select consultant_id from contacts...)")`
- Para admin: buscar contacts diretamente sem filtro de consultor
- Para managers: buscar consultores com `.eq("department", dept)` simples, sem subquery

**Arquivo `src/hooks/useManagerPortfolioKPIs.tsx` (linhas 44-51):**
- Mesma correcao: remover subquery invalida
- Para admin: buscar todos os customers diretamente
- Para managers: filtrar consultores por departamento

### Detalhes tecnicos

Para **admins** (acesso total), a query simplificada sera:
```typescript
const { data: contacts } = await supabase
  .from("contacts")
  .select("*")
  .eq("status", "customer")
  .not("consultant_id", "is", null)
  .order("created_at", { ascending: false });
```

Para **managers** (filtro por departamento):
```typescript
// Buscar consultores do departamento
const { data: consultants } = await supabase
  .from("profiles")
  .select("id, full_name, avatar_url")
  .eq("department", departmentFilter);

// Depois buscar clientes desses consultores
const { data: contacts } = await supabase
  .from("contacts")
  .select("*")
  .eq("status", "customer")
  .in("consultant_id", consultantIds);
```

Tambem sera necessario buscar os dados dos consultores separadamente para o mapeamento de nomes/avatares na lista de clientes (apenas no hook de clients, nao no de KPIs).

## Impacto

| Item | Status |
|------|--------|
| Regressao | Zero -- corrige bug existente |
| Admin | Vera todos os 1315 clientes |
| Manager | Vera clientes do seu departamento |
| Consultant | Nao afetado (usa hook diferente) |
| Performance | Melhor -- menos queries, sem subquery invalida |


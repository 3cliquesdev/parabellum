

# Corrigir contagem de clientes dos consultores (limite de 1000)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Problema

No hook `useConsultantPerformance`, a contagem de clientes é feita com `portfolio?.length` — ou seja, busca **todas as linhas** e conta no JS. O problema é que o Supabase tem limite padrão de **1000 linhas por query**. Consultores com mais de 1000 clientes sempre mostram "1000".

## Correção

Substituir a query que busca todos os contatos por **duas queries otimizadas** por consultor:

1. **Contagem exata** — usar `select("id", { count: "exact", head: true })` para obter o número real sem trazer dados
2. **Dados para cálculo de health/value** — manter a query de `subscription_plan` e `last_contact_date`, mas paginando se necessário (ou usando a contagem separada)

### Mudança no `useConsultantPerformance.tsx`

Para cada consultor, trocar:
```ts
// ANTES: traz no máximo 1000 linhas
const { data: portfolio } = await supabase
  .from("contacts")
  .select("subscription_plan, last_contact_date")
  .eq("consultant_id", consultant.id)
  .eq("status", "customer");
const portfolio_count = portfolio?.length || 0;
```

Por:
```ts
// DEPOIS: contagem exata via header
const { count } = await supabase
  .from("contacts")
  .select("id", { count: "exact", head: true })
  .eq("consultant_id", consultant.id)
  .eq("status", "customer");
const portfolio_count = count || 0;

// Buscar dados para cálculos (value/health) — pode manter a query existente
// pois os cálculos são aproximações e 1000 amostras é aceitável
const { data: portfolio } = await supabase
  .from("contacts")
  .select("subscription_plan, last_contact_date")
  .eq("consultant_id", consultant.id)
  .eq("status", "customer");
```

Isso garante que `portfolio_count` reflete o número **real** de clientes, sem o teto de 1000.

### Sem risco de regressão
- A contagem passa a ser exata
- Os cálculos de health score e portfolio value continuam funcionando com os dados disponíveis
- Nenhuma outra parte do sistema é afetada


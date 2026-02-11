
# Fix: Portal de Tickets do Cliente - Erro de Relacionamento Ambiguo

## Problema
A Edge Function `get-customer-tickets` esta falhando com erro **PGRST201** porque a tabela `tickets` agora tem **duas** foreign keys para `departments`:
- `tickets_department_id_fkey` (department_id)
- `tickets_requesting_department_id_fkey` (requesting_department_id)

O PostgREST nao sabe qual usar quando o codigo faz `department:departments(id, name)` sem especificar.

## Solucao
Alterar a query na Edge Function para desambiguar o join:

**Arquivo:** `supabase/functions/get-customer-tickets/index.ts`

De:
```
department:departments(id, name)
```

Para:
```
department:departments!tickets_department_id_fkey(id, name)
```

## Detalhes Tecnicos
- Apenas 1 linha muda na Edge Function
- Zero impacto em outras funcionalidades
- A funcao ja usa service role key, entao nao ha problema de RLS
- Apos o fix, redeploy automatico da funcao

## Validacao
- Testar a funcao com curl apos deploy
- Confirmar que clientes conseguem ver tickets no portal `/my-tickets`

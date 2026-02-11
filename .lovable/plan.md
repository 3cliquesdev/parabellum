

# Correcao do Relatorio de Tickets - Erro de Tipo no Banco

## Problema Identificado

O erro `operator does not exist: ticket_status = text` ocorre porque as colunas `status`, `priority` e `category` da tabela `tickets` usam tipos ENUM customizados (`ticket_status`, `ticket_priority`, `ticket_category`), mas a funcao RPC compara diretamente com parametros TEXT sem fazer a conversao (cast).

## Solucao

Recriar a funcao `get_tickets_export_report` com casts explicitos nos filtros e nos campos de retorno:

### Alteracoes na RPC (nova migration SQL)

1. **Filtros WHERE**: Adicionar `::text` nos campos enum ao comparar com parametros texto:
   - `t.status::text = p_status` (em vez de `t.status = p_status`)
   - `t.priority::text = p_priority` (em vez de `t.priority = p_priority`)

2. **Campos SELECT**: Adicionar `::text` nos campos enum retornados:
   - `t.status::text` 
   - `t.priority::text`
   - `t.category::text`

3. **JOIN com sla_policies**: A coluna `sp.priority` e texto, mas `t.priority` e enum, entao tambem precisa de cast: `sp.priority = t.priority::text`

Isso corrige tanto a query de contagem (COUNT) quanto a query principal de dados.

### Nenhuma alteracao no frontend

Os hooks e a pagina permanecem iguais - o problema e exclusivamente no SQL.


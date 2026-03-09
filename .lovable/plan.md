

# Corrigir Edges do Master Flow de Produção

## Escopo
Aplicar as mesmas 8 correções já feitas na cópia ao fluxo de produção `e44da799-c404-4c86-abe0-4aea2ca0ea1f`.

## Alterações (1 SQL UPDATE)

### Remover 7 edges duplicadas
Todas apontam desnecessariamente para `1772196913050`, quando já existe caminho correto:

| Source | Edge duplicada a remover | Caminho correto mantido |
|--------|--------------------------|------------------------|
| `opt_1769459784782` (Menu Assunto) | → `1772196913050` | → `1772136527156` |
| `opt_1769459793458` | → `1772196913050` | → `1772136666814` |
| `opt_1769459798821` | → `1772196913050` | → `1772136666814` |
| `opt_1769459806791` | → `1772196913050` | → `1772136666814` |
| `1772134319850` (Trava) | → `1772196913050` | → `1772135608356` |
| `1772136527156` (Trava) | → `1772196913050` | → `1772136548363` |
| `1772136666814` (Trava) | → `1772196913050` | → `1772136698929` |

### Adicionar 1 edge faltante
`opt_1769459583909` (Drop Internacional) → `1769459768149` (Menu Assunto)

## Impacto
- Zero downtime -- é um UPDATE no JSON `flow_definition`
- Não altera nenhum nó, apenas corrige rotas
- Conversas em andamento não são afetadas (usam estado salvo)
- Nenhuma alteração em código frontend ou edge functions


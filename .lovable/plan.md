

## Plano: Renomear "Tecnologia e Integrações" → "Marketplaces e Integrações"

### Locais afetados

| Local | Itens | Ação |
|---|---|---|
| `knowledge_articles` (banco) | 6 artigos | UPDATE category |
| `chat_flows` flow_definition (banco) | Fluxo V4 — nós 10 e 14 | Substituir no JSON de kb_categories |

### O que será feito

1. **Artigos**: `UPDATE knowledge_articles SET category = 'Marketplaces e Integrações' WHERE category = 'Tecnologia e Integrações'`

2. **Fluxo V4**: Atualizar o JSON do `flow_definition` substituindo todas as ocorrências de `"Tecnologia e Integrações"` por `"Marketplaces e Integrações"` nos nós `node_10_ia_sistema` e `node_14_ia_suporte`

Nenhuma alteração de código necessária — não há referências hardcoded no frontend.


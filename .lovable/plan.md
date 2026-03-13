

## Plano: Adicionar nós de Criação de Ticket no FLUXO MASTER V4

### Problema

Os 4 caminhos críticos (Saque, Financeiro, Cancelamento, Devolução) vão direto da IA especialista para o Transfer sem criar ticket. O plano original pedia ticket nesses caminhos.

### O que será feito

Inserir 4 nós `create_ticket` entre cada IA especialista e seu respectivo Transfer, via update SQL no `flow_definition` (JSONB).

### Mapeamento

| Caminho | IA Especialista | Novo Nó Ticket | Transfer Destino | Categoria |
|---------|----------------|----------------|-----------------|-----------|
| Saque | `node_5_ia_saque` | `node_ticket_saque` | `node_20_transfer_financeiro` | `saque` |
| Financeiro | `node_6_ia_financeiro` | `node_ticket_financeiro` | `node_20_transfer_financeiro` | `financeiro` |
| Cancelamento | `node_7_ia_cancelamento` | `node_ticket_cancelamento` | `node_21_transfer_suporte_cancel` | `cancelamento` |
| Devolução | `node_8_ia_devolucoes` | `node_ticket_devolucao` | `node_22_transfer_pedidos` | `devolucao` |

### Configuração de cada nó ticket

- `use_collected_data: true` — snapshot do contexto da conversa
- `ticket_priority: "high"`
- Templates com variáveis: `{{contact_name}}`
- Posição: x=1200 (entre coluna 3 e 4), y alinhado com a IA correspondente

### Rerouting de edges

Para cada caminho, as edges `default` e `suporte` que iam da IA direto ao Transfer passam a apontar para o nó ticket. Uma nova edge liga o nó ticket ao Transfer original.

Exemplo (Saque):
- `e_5_default_20`: target muda de `node_20` → `node_ticket_saque`
- `e_5_suporte_20`: target muda de `node_20` → `node_ticket_saque`
- Nova edge: `node_ticket_saque` → `node_20_transfer_financeiro`

Cross-links (ex: `e_6_saque_5`, `e_7_financeiro_6`) permanecem inalterados.

### Implementação

Um único update SQL no campo `flow_definition` adicionando os 4 nós e ajustando as 8 edges existentes + criando 4 novas edges.


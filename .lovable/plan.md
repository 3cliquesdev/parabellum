

# Plano: Criar Fluxo "MASTER V3"

## Resumo

Criar um novo chat flow via inserção direta no banco de dados com 16 nós organizados em 5 colunas, e depois remover o fluxo master atual (V2).

## Dados mapeados

### Departamentos (IDs reais)
| Nome | ID |
|------|-----|
| Suporte Pedidos | `2dd0ee5c-fd20-44be-94ad-f83f1be1c4e9` |
| Suporte Sistema | `fd4fcc90-22e4-4127-ae23-9c9ecb6654b4` |
| Comercial - Nacional | `f446e202-bdc3-4bb3-aeda-8c0aa04ee53c` |
| Comercial - Internacional | `68195a0f-1f9e-406b-b714-c889b4145f60` |
| Customer Success | `b7149bf4-1356-4ca5-bc9a-8caacf7b6e80` |
| Financeiro | `af3c75a9-2e3f-49f1-8e0b-7fb3f4b5ee45` |
| Suporte | `36ce66cd-7414-4fc8-bd4a-268fecc3f01a` |

### Personas (IDs reais)
| Nome | ID |
|------|-----|
| Helper (Triagem) | `0d2f4c7c-a07e-48f3-bf1e-540d70f35a7a` |
| Helper Financeiro | `2001b4a1-7bc9-422b-8d5f-f5caddf31e8a` |
| Helper Cancelamento | `f97f23e6-99d3-4635-bb9e-ba145263e41e` |

## Estrutura do flow_definition

### Nós (16 + start)

**COLUNA 1 (x=100) — Entrada:**
- `start` (input, x=100, y=200)
- `node_1_welcome` (message, x=100, y=400) — Boas-vindas
- `node_2_condition` (condition_v2, x=100, y=600) — Cliente já conhecido? (field: `is_customer`, check_type: `has_data`)
- `node_3_email` (ask_email, x=100, y=800) — Coleta Email

**COLUNA 2 (x=550) — IA Triagem:**
- `node_4_ia_triagem` (ai_response, x=550, y=600) — Persona "Helper", 11 intents ON, max_interactions=4

**COLUNA 3 (x=1000) — IAs + Transfers diretos:**
- `node_5_ia_financeiro` (ai_response, x=1000, y=200) — Persona "Helper Financeiro"
- `node_6_ia_cancelamento` (ai_response, x=1000, y=450) — Persona "Helper Cancelamento"
- `node_7_transfer_devolucao` (transfer, x=1000, y=700)
- `node_8_transfer_pedidos` (transfer, x=1000, y=900)
- `node_9_transfer_sistema` (transfer, x=1000, y=1100)
- `node_10_transfer_comercial` (transfer, x=1000, y=1300)
- `node_11_transfer_internacional` (transfer, x=1000, y=1500)
- `node_12_transfer_consultor` (transfer, x=1000, y=1700)
- `node_13_transfer_suporte` (transfer, x=1000, y=1900)

**COLUNA 4 (x=1450) — Transfers pós-ticket:**
- `node_14_transfer_financeiro` (transfer, x=1450, y=200)
- `node_15_transfer_suporte_pos` (transfer, x=1450, y=450)

**COLUNA 5 (x=1900) — Encerramento:**
- `node_16_encerramento` (message, x=1900, y=1000)

### Edges (conexões)
- start → node_1
- node_1 → node_2
- node_2 (rule_0_true) → node_4
- node_2 (rule_0_false) → node_3
- node_3 → node_4
- node_4 (saque) → node_5
- node_4 (financeiro) → node_5
- node_4 (cancelamento) → node_6
- node_4 (devolucao) → node_7
- node_4 (pedidos) → node_8
- node_4 (suporte_sistema) → node_9
- node_4 (comercial) → node_10
- node_4 (comercial_internacional) → node_11
- node_4 (consultor) → node_12
- node_4 (suporte) → node_13
- node_4 (default) → node_13
- node_5 (default) → node_14
- node_5 (suporte) → node_14
- node_6 (financeiro) → node_5
- node_6 (default) → node_15
- node_6 (suporte) → node_15
- node_7 → node_16
- node_8 → node_16
- node_9 → node_16
- node_10 → node_16
- node_11 → node_16
- node_12 → node_16
- node_13 → node_16
- node_14 → node_16
- node_15 → node_16

## Execução

1. **Criar** um novo registro em `chat_flows` com nome "MASTER V3", `is_active=false`, `is_master_flow=false`, contendo o `flow_definition` completo com todos os 17 nós e ~30 edges descritos acima
2. **Não deletar** o fluxo V2 automaticamente — o usuário pode fazê-lo manualmente quando quiser (o V2 já está inativo)

### Arquivo alterado
Nenhum arquivo de código precisa ser alterado. A operação é 100% via inserção no banco de dados (`chat_flows`).




## Plano: Criar 2 Chat Flows via SQL Insert

Analisei o projeto atual e sigo as regras da base de conhecimento.

### O que será feito

Inserir 2 novos registros na tabela `chat_flows` com `flow_definition` contendo todos os nós e arestas no formato ReactFlow (idêntico ao Master Flow existente).

### Estrutura dos dados (formato confirmado via análise do Master Flow)

Cada nó segue o formato:
```json
{
  "id": "unique_id",
  "type": "message|ask_text|ask_options|condition|validate_customer|verify_customer_otp|create_ticket|ai_response|end",
  "data": { /* campos específicos do tipo */ },
  "position": { "x": N, "y": N },
  "positionAbsolute": { "x": N, "y": N }
}
```

Cada aresta:
```json
{
  "id": "reactflow__edge-SOURCE_HANDLE-TARGET",
  "type": "buttonEdge",
  "source": "SOURCE_ID",
  "target": "TARGET_ID",
  "sourceHandle": "HANDLE_OR_NULL",
  "animated": false,
  "markerEnd": { "type": "arrowclosed" },
  "style": { "strokeWidth": 2 }
}
```

### Flow 1: "💰 Solicitação Financeira (Saque/Reembolso)"

**17 nós** dispostos verticalmente:

| # | Tipo | ID | Dados principais |
|---|---|---|---|
| 1 | `input` (start) | `fin_start` | label: "▶ Início" |
| 2 | `message` | `fin_msg_1` | "Para processar sua solicitação financeira..." |
| 3 | `ask_email` | `fin_ask_email` | save_as: `email_assinatura`, validate: true |
| 4 | `validate_customer` | `fin_validate` | validate_email: true, validate_phone: true |
| 5 | `condition` | `fin_cond_valid` | condition_type: `equals`, field: `customer_validated`, value: `true` |
| 6 | `message` | `fin_msg_notfound` | "E-mail não encontrado..." |
| 7 | `end` | `fin_end_notfound` | end_action: none |
| 8 | `verify_customer_otp` | `fin_otp` | max_attempts: 3 |
| 9 | `condition` | `fin_cond_otp` | field: `customer_verified`, value: `true` |
| 10 | `message` | `fin_msg_otp_fail` | "Código inválido..." |
| 11 | `end` | `fin_end_otp_fail` | end_action: none |
| 12 | `message` | `fin_msg_verified` | "Identidade verificada com sucesso! ✅..." |
| 13 | `ask_text` | `fin_ask_nome` | save_as: `nome_completo` |
| 14 | `ask_text` | `fin_ask_pix` | save_as: `chave_pix` |
| 15 | `ask_text` | `fin_ask_banco` | save_as: `banco` |
| 16 | `ask_options` | `fin_ask_motivo` | 4 opções (Saque/Reembolso/Estorno/Outro), save_as: `motivo` |
| 17 | `ask_text` | `fin_ask_valor` | save_as: `valor` |
| 18 | `create_ticket` | `fin_ticket` | categoria: financeiro, prioridade: high, dept: af3c75a9-... |
| 19 | `message` | `fin_msg_success` | "✅ Chamado aberto com sucesso!..." |
| 20 | `end` | `fin_end_ok` | end_action: none |

**Edges:** Linear com bifurcações nas conditions (true→continua, false→mensagem erro→end).

### Flow 2: "🔴 Cancelamento — Retenção CS"

**7 nós:**

| # | Tipo | ID | Dados principais |
|---|---|---|---|
| 1 | `input` (start) | `canc_start` | label: "▶ Início" |
| 2 | `ai_response` | `canc_ai_retention` | System prompt de retenção, exit_keywords: ["[CONFIRMA_CANCELAMENTO]"], ai_persistent: true, max_ai_interactions: 10, forbid_financial: false |
| 3 | `ask_options` | `canc_ask_motivo` | 6 opções, save_as: `motivo_cancelamento` |
| 4 | `ask_text` | `canc_ask_obs` | save_as: `observacao` |
| 5 | `create_ticket` | `canc_ticket` | categoria: outro, prioridade: high, dept: b7149bf4-... |
| 6 | `message` | `canc_msg_done` | "Registrado! 🤝..." |
| 7 | `end` | `canc_end` | end_action: none |

**Edges:** ai_response → (ai_exit handle) → ask_options → linear até end.

### Execução

1. **SQL Insert** (via insert tool) — 2 INSERTs na tabela `chat_flows` com `is_active = false` (para revisão visual antes de ativar)
2. Ambos os fluxos ficarão disponíveis no editor de fluxos para ajuste visual de posições se necessário
3. Não é master flow — serão acionados via trigger_keywords ou linkados no Master Flow via transfer node

### Observações importantes

- Os fluxos serão criados como **inativos** (`is_active = false`) para que você revise no editor visual antes de ativar
- O `verify_customer_otp` é um nó composto (máquina de estados interna) — não precisa de nós separados para pedir OTP e validar
- O `create_ticket` no Flow 1 usa `use_collected_data: true` para salvar snapshot completo
- Nenhum arquivo de código será alterado — são apenas inserts no banco


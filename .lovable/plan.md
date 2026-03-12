

# Auditoria Final: Fluxo Financeiro de Saque — Status

## Verificação Nó-a-Nó

### 1. Regex de Ação (`financialActionPattern`) — OK
Captura corretamente: "quero sacar", "cadê meu dinheiro", "não recebi meu reembolso", "me devolvam", "preciso do meu saque". Regex sincronizada entre `ai-autopilot-chat` e `process-chat-flow`.

### 2. Regex de Info (`financialInfoPattern`) — PROBLEMA ENCONTRADO
O padrão `d[úu]vida` (sem contexto financeiro) casa com QUALQUER mensagem contendo "dúvida", mesmo não-financeira. Ex: "dúvida sobre meu pedido" seria classificada como info financeira, o que impede a detecção como ambígua e evita a desambiguação.

**Impacto**: Baixo risco de alucinação (a IA responderia via KB normalmente), mas impede que a desambiguação aja em frases como "dúvida sobre saque" — que seria melhor perguntar do que assumir.

**Correção**: Alterar `d[úu]vida` para `d[úu]vida\s+(sobre|com|de|do|da)\s+(saque|reembolso|estorno|devolu|financ)` — limitando ao contexto financeiro.

### 3. Regex Ambígua (`financialAmbiguousPattern`) — OK
Detecta termos isolados ("saque", "saldo", "reembolso") corretamente. A lógica `!isAction && !isInfo && ambiguousMatch` funciona.

### 4. Injeção no Prompt Real (`financialGuardInstruction`) — OK
Verificado: o bloco é injetado em `contextualizedSystemPrompt` (linha 6036). Variáveis `flowForbidFinancial` e `ambiguousFinancialDetected` estão no mesmo escopo (declaradas ~1366/1393, usadas ~6020).

### 5. Desambiguação Condicional — OK
Quando `ambiguousFinancialDetected=true`, o prompt inclui instrução obrigatória para a IA perguntar. Quando false, inclui apenas as travas anti-alucinação.

### 6. Bloqueio de Ação com Fluxo Ativo — OK
Quando `hasFlowContext=true` e ação financeira detectada, retorna `financialBlocked: true` SEM mensagem fixa (delega ao `process-chat-flow`). Elimina a mensagem duplicada.

### 7. Bloqueio de Ação SEM Fluxo — OK
Busca departamento financeiro dinamicamente, faz handoff com mensagem fixa "setor financeiro".

### 8. `process-chat-flow` — Ambíguo NÃO Dispara Exit — OK
Linha 2120-2122: quando ambíguo + `forbidFinancial`, apenas loga e NÃO seta `financialIntentMatch`. A IA recebe a instrução de desambiguação via prompt (no `ai-autopilot-chat`).

### 9. Condição de Bloqueio (`ragConfig.blockFinancial`) — OK
Default `true`, configurável via `system_configurations`. Não interfere com `flowForbidFinancial` (ambos precisam ser true para bloquear na entrada).

## Problema Único a Corrigir

| Problema | Onde | Impacto | Correção |
|---|---|---|---|
| `d[úu]vida` sem contexto financeiro na `financialInfoPattern` | `ai-autopilot-chat` L1384 + `process-chat-flow` L2111 | "Dúvida sobre entrega" casa como info financeira, impedindo desambiguação | Restringir para `d[úu]vida\s+(sobre\|com\|de\|do\|da)\s+(saque\|reembolso\|estorno\|devolu\|financ\|saldo\|cobran)` |

## Testes de Validação (Regex)

| Mensagem | Action | Info | Ambígua | Resultado |
|---|---|---|---|---|
| "Quero sacar meu saldo" | true | false | - | Bloqueia → fluxo financeiro |
| "Qual o prazo de saque?" | false | true | - | IA responde via KB |
| "Saque" (isolado) | false | false | true | IA pergunta desambiguação |
| "Meu saldo" | false | false | true | IA pergunta desambiguação |
| "Cadê meu dinheiro" | true | false | - | Bloqueia → fluxo financeiro |
| "Não recebi meu reembolso" | true | false | - | Bloqueia → fluxo financeiro |
| "Dúvida sobre entrega" | false | true (BUG) | - | Antes: info. Depois da fix: passa normalmente |
| "Dúvida sobre saque" | false | true | - | IA responde via KB (correto após fix) |

## Implementação

Corrigir `financialInfoPattern` em ambos os arquivos (substituir `d[úu]vida` standalone por versão com contexto financeiro).


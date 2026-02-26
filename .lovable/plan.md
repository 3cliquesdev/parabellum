

# Diagnóstico: Mensagem "Concluí o onboarding" indo para IA em vez de transferir

## Causa Raiz

O nó de **Condição** no Master Flow ("Fluxo Principal") foi configurado com **multi-regras** (Onboarding + Carnaval), mas as **conexões (edges)** ainda usam os handles antigos `true`/`false` do modo clássico.

```text
COMO ESTÁ (QUEBRADO):
┌──────────────┐    sourceHandle="false"    ┌──────────────────┐
│  Condição    │ ──────────────────────────> │  Múltipla Escolha │
│ (multi-rule) │    sourceHandle="true"      │  "Seja bem-vindo" │
│              │ ──────────────────────────> │  (outro nó)       │
└──────────────┘                            └──────────────────┘

COMO DEVERIA SER:
┌──────────────┐    sourceHandle="rule_1771439085235"   ┌──────────────┐
│  Condição    │ ──────────────────────────────────────> │  Transfer CS │
│ (multi-rule) │    sourceHandle="rule_1771439103779"   │              │
│              │ ──────────────────────────────────────> │  (Carnaval)  │
│              │    sourceHandle="else"                  │              │
│              │ ──────────────────────────────────────> │  IA / Menu   │
└──────────────┘                                        └──────────────┘
```

Quando a mensagem "Concluí o onboarding" chega:
1. `evaluateConditionPath` retorna `rule_1771439085235` (match correto ✅)
2. `findNextNode` busca edge com `sourceHandle === "rule_1771439085235"` → **não encontra** ❌
3. Cai no fallback "any edge" → pega o `false` → vai para "Seja bem-vindo" (errado)
4. Como não tem estado ativo, o Master Flow redireciona para IA

## Solução: Duas correções

### 1. Fix imediato — Reconectar edges no banco de dados

Atualizar as edges do Master Flow para usar os rule IDs corretos. Isso corrige o fluxo SEM mudar código:

- Edge `sourceHandle: "true"` → mudar para `sourceHandle: "rule_1771439085235"` (Onboarding → Transfer CS)
- Edge `sourceHandle: "false"` → mudar para `sourceHandle: "else"` (Outros → Múltipla Escolha)
- Adicionar nova edge: `sourceHandle: "rule_1771439103779"` (Carnaval → destino apropriado)

### 2. Fix preventivo — Auto-migrar edges no editor

No `ChatFlowEditor`, quando o usuário muda um nó de condição de modo clássico para multi-regra (ou vice-versa), **deletar automaticamente as edges órfãs** que usam handles inválidos. Isso previne o mesmo problema no futuro.

Implementação no `onNodesChange` ou `onNodeDataChange`: detectar mudança de `condition_rules` e limpar edges com handles `true`/`false` que não existem mais.

## Impacto

- **Zero regressão**: apenas corrige edges do Master Flow e adiciona proteção no editor
- A lógica do `evaluateConditionPath` e `findNextNode` está correta — o problema são os dados (edges desconectadas)


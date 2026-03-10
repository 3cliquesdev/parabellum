

# Correções Cirúrgicas no AI Autopilot Chat

## Status dos Bugs

| Bug | Status | Ação |
|-----|--------|------|
| BUG 1: Trigger AFTER→BEFORE | ✅ Já migrado | Nenhuma |
| BUG 2: ESCAPE_PATTERNS markdown | ✅ Já corrigido | Nenhuma |
| BUG 4: Dispatch copilot | ✅ Já migrado | Nenhuma |
| BUG 5: generateRestrictedPrompt markdown | 🔴 Pendente | FIX 1 |
| BUG 6: forbidQuestions falso positivo | 🔴 Pendente | FIX 2 |
| BUG 7: Mensagens ticket com markdown | 🔴 Pendente | FIX 3 |
| MELHORIA 1: SCORE_MINIMUM baixo | 🟡 Pendente | FIX 4 |

## 4 Alterações em `supabase/functions/ai-autopilot-chat/index.ts`

### FIX 1 — generateRestrictedPrompt: proibir markdown (linha ~1196)

Antes da linha "A resposta deve ser curta, clara e objetiva", adicionar:

```
NÃO use markdown: sem negrito (**), sem # títulos, sem listas com - ou *.
Use apenas texto simples, sem formatação.
```

Também remover o markdown no bloco "Contexto do Cliente" (linhas 1198-1200) que usa `**`.

### FIX 2 — validateResponseRestrictions: corrigir detecção de ? (linhas 1212-1214)

Substituir `response.includes('?')` por lógica que só bloqueia frases que terminam em `?`, ignorando `?` dentro de parênteses ou meio de frase.

### FIX 3 — Mensagens de ticket sem markdown (linhas 1109-1119, 1133)

Remover todos os `**texto**` do fallback de saque e do `orderInfo`, convertendo para texto simples.

### FIX 4 — SCORE_MINIMUM de 0.10 para 0.25 (linha 759)

Aumentar o limiar mínimo para evitar respostas com confiança muito baixa.

## Arquivos alterados

- `supabase/functions/ai-autopilot-chat/index.ts` (4 blocos de alteração, deploy automático)


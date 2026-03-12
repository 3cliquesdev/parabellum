

# Auditoria Final: Fluxo Financeiro de Saque — BUG CRÍTICO ENCONTRADO

## BUG CRÍTICO: `generateRestrictedPrompt` é CÓDIGO MORTO

A função `generateRestrictedPrompt` (linha 1160) contém TODAS as instruções de blindagem financeira:
- Desambiguação ("Posso te ajudar com informações ou fazer uma solicitação?")
- Anti-alucinação ("NÃO cite valores/prazos sem KB")
- Tom empático
- Trava de ações vs info

**Porém, essa função NUNCA é chamada.** O sistema monta o prompt real na linha ~6020 usando `contextualizedSystemPrompt`, que NÃO inclui nenhuma dessas instruções financeiras.

**Resultado**: A LLM nunca recebe as regras de desambiguação nem anti-alucinação financeira. Todo o trabalho das últimas iterações no prompt restritivo está inativo.

```text
FLUXO ESPERADO:
  useRestrictedPrompt=true → generateRestrictedPrompt() → prompt enviado à LLM
  
FLUXO REAL:
  useRestrictedPrompt=true → log no console ✅ → NADA MAIS ❌
  contextualizedSystemPrompt → montado SEM instruções financeiras → enviado à LLM
```

## Problema Secundário: `ambiguousFinancialDetected` é calculado mas ignorado

A flag `ambiguousFinancialDetected` (linha 1393) é logada mas nunca usada para modificar comportamento. A instrução de desambiguação está dentro de `generateRestrictedPrompt` (código morto), então mesmo que a flag fosse usada, não faria diferença.

## Plano de Correção (2 alterações cirúrgicas)

### Correção 1: Integrar instruções financeiras no prompt REAL (`ai-autopilot-chat`)

Na montagem do `contextualizedSystemPrompt` (~linha 6020), injetar um bloco financeiro condicional quando `flowForbidFinancial=true`:

```
const financialGuardInstruction = flowForbidFinancial ? `

🔒 TRAVA FINANCEIRA ATIVA:
- Responda perguntas INFORMATIVAS sobre finanças usando APENAS dados da base de conhecimento
- Se o cliente pedir uma AÇÃO financeira (saque, reembolso, estorno), responda: "Entendi sua solicitação. Vou te encaminhar para o setor responsável." e retorne [[FLOW_EXIT]]
- NUNCA cite valores monetários, prazos em dias ou percentuais sobre saques/reembolsos A MENOS que existam EXATAMENTE na base de conhecimento
- Se não encontrar a informação na KB, responda: "Não tenho essa informação no momento. O setor financeiro poderá te orientar com detalhes."
- Se o cliente mencionar termos financeiros sem deixar claro se quer info ou ação, pergunte: "Posso te ajudar com informações sobre [tema] ou você gostaria de fazer uma solicitação?"
- NUNCA invente, deduza ou estime valores financeiros
` : '';
```

E concatenar no `contextualizedSystemPrompt`.

### Correção 2: Propagar `flowForbidFinancial` até o ponto de montagem do prompt

As variáveis `flowForbidFinancial` e `ambiguousFinancialDetected` são definidas na linha ~1366 mas precisam estar acessíveis na linha ~6020 onde o prompt é montado. Verificar se o escopo permite (ambas estão no mesmo bloco `try`).

### Arquivo Alterado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/ai-autopilot-chat/index.ts` | Injetar `financialGuardInstruction` no `contextualizedSystemPrompt` quando `flowForbidFinancial=true` |

Nenhuma mudança necessária no `process-chat-flow` — as regex e a lógica de exit estão corretas lá.

## Resultado Esperado

| Cenário | Antes (bug) | Depois |
|---|---|---|
| "Saque" (ambíguo) | IA responde livremente, pode alucinar | IA pergunta: "informações ou solicitação?" |
| "Qual prazo de saque?" | IA pode inventar prazo | IA só responde se KB tiver dado exato |
| "Quero sacar" | ✅ Bloqueia (regex funciona) | ✅ Mantém |


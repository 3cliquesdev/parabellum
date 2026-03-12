

# Auditoria e Resolução: Tratamento Financeiro pela IA

## Situação Atual (Duplicação Identificada)

Existem **3 pontos** onde a intenção financeira é interceptada, causando conflito:

```text
┌─────────────────────────────────────┐
│ 1. ai-autopilot-chat (ENTRADA)      │  ← Intercepta ANTES da LLM
│    forbidFinancial + regex           │     Retorna mensagem fixa genérica
│    "Vou te encaminhar para humano"   │     ❌ NÃO deixa IA tentar resolver
├─────────────────────────────────────┤
│ 2. process-chat-flow (NÓ AI)        │  ← Intercepta na avaliação do nó
│    forbidFinancial + regex           │     Seta ai_exit_intent=financeiro
│    Avança para próximo nó no fluxo   │     ✅ Segue o fluxo financeiro
├─────────────────────────────────────┤
│ 3. ai-autopilot-chat (SAÍDA)        │  ← Não existe explicitamente
│    blockFinancial no ragConfig       │     Mas ponto 1 já bloqueia tudo
└─────────────────────────────────────┘
```

**Problema central**: O ponto 1 (`ai-autopilot-chat` linha 1372) intercepta a mensagem **antes** de a IA sequer tentar responder. Isso significa que mesmo perguntas informativas como "qual o prazo de saque?" são bloqueadas com a mensagem genérica de transferência, em vez de a IA tentar responder usando a KB.

## Estratégia Escolhida: "IA tenta resolver, se não conseguir roteia"

A IA deve:
- **Responder** perguntas informativas sobre finanças (ex: "qual prazo de saque?", "como funciona reembolso?")
- **Rotear para o fluxo financeiro** quando for uma AÇÃO (ex: "quero sacar", "faz meu reembolso", "quero meu dinheiro de volta")

## Plano de Implementação

### 1. Separar regex em duas categorias

Criar duas regex distintas:
- **`financialActionPattern`** — ações que DEVEM rotear para o fluxo (verbos imperativos): `quero sacar`, `faz meu reembolso`, `quero meu dinheiro`, `cancelar assinatura`, `fazer pagamento`
- **`financialInfoPattern`** — perguntas informativas que a IA pode responder: `qual prazo`, `como funciona`, `quanto tempo demora`, `onde vejo meu saldo`

### 2. Alterar `ai-autopilot-chat` (linha ~1370)

Atualmente intercepta TUDO com `financialIntentPattern`. Mudar para:
- Se `financialActionPattern` detectar → bloquear e retornar `financialBlocked: true` (comportamento atual, roteia para fluxo)
- Se `financialInfoPattern` detectar → **deixar passar** para a LLM responder normalmente usando KB
- Adicionar instrução no system prompt: "Você pode responder perguntas informativas sobre finanças, mas se o cliente solicitar uma AÇÃO financeira, retorne [[FLOW_EXIT]]"

### 3. Alterar `process-chat-flow` (linha ~2091)

Mesma separação: `financialPositive` vira `financialActionPattern`. Perguntas informativas não disparam exit do nó.

### 4. Ativar `forbid_financial: true` no nó `ia_entrada` do Master Flow

Atualizar o `flow_definition` do fluxo `912b366e` via SQL para incluir `forbid_financial: true` no nó `ia_entrada`. Sem essa flag, nenhuma detecção funciona.

### 5. Inferência automática (prevenção futura)

No `process-chat-flow`, ao processar um nó `ai_response`: verificar se alguma edge downstream contém regra `ai_exit_intent == "financeiro"`. Se sim, forçar `forbidFinancial = true` automaticamente, mesmo sem a flag no nó.

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/ai-autopilot-chat/index.ts` | Separar regex em action vs info, só bloquear ações |
| `supabase/functions/process-chat-flow/index.ts` | Mesma separação de regex + inferência automática de `forbid_financial` |
| SQL migration | Ativar `forbid_financial: true` no nó `ia_entrada` do fluxo Master |

## Resultado Esperado

- "Qual o prazo de saque?" → IA responde usando KB
- "Quero sacar meu saldo" → IA sai do nó → fluxo financeiro (OTP → coleta PIX → ticket)
- Sem duplicação: apenas UMA decisão (action vs info) em cada ponto do pipeline


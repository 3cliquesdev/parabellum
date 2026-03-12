

# Bug: `gpt-5-mini` crasha com `max_tokens` → fallback `gpt-4o-mini` alucina pedido de email

## Diagnóstico

Nos logs da conversa #2D7EACE8:

1. **`gpt-5-mini` falha** com erro 400: `"'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."`
2. Fallback para `gpt-4o-mini` (modelo mais fraco)
3. `gpt-4o-mini` **ignora** a instrução "NÃO peça email ou validação" e alucina: "Para sua segurança, vou verificar sua identidade... informe um email válido"
4. Cliente já identificado (Kiwify validated, email presente, OTP verificado anteriormente)
5. `isWithdrawalRequest: false` → barreira financeira nem ativou → `identityWallNote` correto ("NÃO peça email")

O problema NÃO é de lógica — é que o modelo principal crasha e o fallback é fraco demais para seguir instruções.

## Causa Raiz

`REASONING_MODELS` (L129) só tem `['o3', 'o3-mini', 'o4-mini']`. O `gpt-5-mini` também exige `max_completion_tokens` mas não está na lista. Resultado: **100% das chamadas ao modelo principal falham**, caindo sempre no `gpt-4o-mini`.

## Plano de Correção

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `ai-autopilot-chat/index.ts` L129 | Renomear `REASONING_MODELS` → `MAX_COMPLETION_TOKEN_MODELS` e adicionar `'gpt-5-mini'`, `'gpt-5'`, `'gpt-5-nano'` |

```typescript
// Antes:
const REASONING_MODELS = new Set(['o3', 'o3-mini', 'o4-mini']);

// Depois:
const MAX_COMPLETION_TOKEN_MODELS = new Set([
  'o3', 'o3-mini', 'o4-mini',
  'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.2'
]);
```

E atualizar todas as referências de `REASONING_MODELS` para `MAX_COMPLETION_TOKEN_MODELS` (L3962, L3973, etc.).

**Resultado:** `gpt-5-mini` funciona na primeira tentativa → instruções seguidas corretamente → sem alucinação de email.


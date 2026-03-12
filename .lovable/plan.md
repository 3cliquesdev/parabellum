

# Auditoria Final — OTP/Flow Sovereignty + Encerramento

## Resultado: 5/6 OK, 1 limpeza pendente

| # | Item | Status |
|---|---|---|
| 1 | Guard `!flow_context` no bloco OTP (L6027) | OK |
| 2 | `OTP_REQUIRED_KEYWORDS` sem `'saque'`/`'sacar'` isolados (L787-802) | OK |
| 3 | Limpeza metadata OTP no `TestModeDropdown` (L57-58) | OK |
| 4 | Limpeza metadata OTP no `FlowTestDialog` (L70-71) | OK |
| 5 | `awaiting_close_confirmation` bypass nos 2 webhooks (Meta L759-761, Evolution L1198-1237) | OK |
| 6 | Inner guard redundante `if (!flow_context?.forbidFinancial ...)` (L6032) | **Limpeza necessária** |

---

## Problema encontrado: Guard redundante L6032

```text
L6027: if (contactHasEmail && isWithdrawalRequest && !hasRecentOTPVerification && !flow_context) {
L6032:   if (!flow_context?.forbidFinancial || WITHDRAWAL_ACTION_PATTERNS.some(...)) {
```

A L6027 já garante `!flow_context` (null/undefined). Dentro desse bloco, `flow_context?.forbidFinancial` é **sempre** `undefined`, então `!flow_context?.forbidFinancial` é **sempre** `true`. O inner guard nunca bloqueia nada — é dead logic.

**Fix:** Remover o `if` da L6032 e seu `}` de fechamento na L6140, mantendo o conteúdo interno (que sempre executa). Isso elimina confusão sem mudar comportamento.

---

## Validação completa dos cenários

```text
"sacar" sem fluxo → isWithdrawalRequest=false (não está em OTP_REQUIRED_KEYWORDS) → IA desambigua ✅
"quero sacar" sem fluxo → OTP dispara normalmente ✅
"sacar" COM fluxo → !flow_context=false → bloco OTP inteiro pulado ✅
Test mode ativado → limpa awaiting_otp/otp_reason/etc ✅
awaiting_close_confirmation + copilot → bypass redireciona para autopilot ✅
Auto-close Stage 3.5 (5min sem resposta) → encerra + limpa flags ✅
close_conversation tool → yesKeywords exclui "obrigado"/"valeu" ✅
```

## Plano

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `ai-autopilot-chat/index.ts` L6032 + L6140 | Remover inner guard redundante `if (!flow_context?.forbidFinancial ...)` e seu `}` de fechamento |

Uma limpeza cirúrgica. Zero impacto funcional, elimina confusão em auditorias futuras.


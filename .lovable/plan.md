

# Auditoria: Correções OTP/Flow Sovereignty — Resultado

## 3 Fixes Verificados

| # | Fix | Arquivo | Status |
|---|---|---|---|
| 1 | Guard `!flow_context` no bloco OTP | `ai-autopilot-chat` L6027 | OK |
| 2 | Limpeza metadata OTP no test mode | `TestModeDropdown` L58 + `FlowTestDialog` L71 | OK |
| 3 | Remoção de `'saque'`/`'sacar'` isolados de `OTP_REQUIRED_KEYWORDS` | `ai-autopilot-chat` L787-802 | OK |
| 4 | Evolution API bypass `awaiting_close_confirmation` | `handle-whatsapp-event` L1198-1237 | OK |
| 5 | Tool description sem `"cliente_agradeceu"` | `ai-autopilot-chat` L6872 | OK |

## 1 Problema Encontrado: Dead Code (`if (false)`)

**Arquivo:** `ai-autopilot-chat/index.ts` L6031-6074

O bloco `if (false) { ... }` entre L6031-6074 é **código morto**. Foi o antigo guard de `forbidFinancial` que ficou obsoleto quando adicionamos `!flow_context` na L6027. Ele:
- Nunca executa (literalmente `if (false)`)
- Contém ~40 linhas de lógica inativa que confunde futuras auditorias
- Logs e returns dentro dele nunca disparam

**Fix:** Remover o bloco `if (false) { ... }` inteiro (L6031-6074). A lógica já está coberta pela condição `!flow_context` na L6027 — se há fluxo, o bloco OTP inteiro é pulado.

## Validação de Fluxo Completa

```text
CENÁRIO 1: "sacar" sem fluxo ativo, cliente com email
  → isWithdrawalRequest = false (removido de OTP_REQUIRED_KEYWORDS) ✅
  → IA desambigua normalmente ✅

CENÁRIO 2: "quero sacar meu saldo" sem fluxo ativo, cliente com email
  → isWithdrawalRequest = true (match "quero sacar" em OTP_REQUIRED_KEYWORDS) ✅
  → !flow_context = true → entra no bloco OTP ✅
  → Envia OTP normalmente ✅

CENÁRIO 3: "sacar" COM fluxo ativo (test mode ou manual)
  → !flow_context = false → bloco OTP INTEIRO pulado ✅
  → IA do nó processa normalmente ✅

CENÁRIO 4: "quero sacar meu saldo" COM fluxo ativo
  → !flow_context = false → bloco OTP INTEIRO pulado ✅
  → Fluxo financeiro nativo processa ✅

CENÁRIO 5: Test mode ativado em conversa com OTP residual
  → TestModeDropdown limpa awaiting_otp/otp_reason/etc ✅
  → FlowTestDialog também limpa ✅

CENÁRIO 6: Encerramento via Evolution API (awaiting_close_confirmation)
  → Bypass L1198-1237 redireciona para ai-autopilot-chat ✅
```

## Plano de Correção

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `ai-autopilot-chat/index.ts` L6031-6074 | Remover bloco `if (false) { ... }` (dead code) |

Uma correção menor de limpeza. Sem impacto funcional, mas elimina confusão em auditorias futuras.


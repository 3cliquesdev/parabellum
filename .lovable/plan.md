

# Auditoria Completa: Intercepção Fora do Horário + Métricas Humanas

## 1. RPC `get_inbox_time_report` (Tempo Humano) — ✅ OK

A migração foi aplicada corretamente. Linha 83 da RPC agora exige:
```sql
c.handoff_executed_at IS NOT NULL AND m.created_at > c.handoff_executed_at
```
Conversas sem handoff retornam `NULL` para `human_pickup_sec` e `human_resolution_sec`. KPIs de média já filtram NULLs automaticamente.

---

## 2. Intercepção After-Hours no `process-chat-flow` — ⚠️ INCOMPLETO

### Pontos COM verificação (6 de 14): ✅
| # | Linha | Razão |
|---|-------|-------|
| ahCheck1 | ~985 | contract_violation_transfer |
| ahCheck2 | ~3003 | flow_transfer_generic_ask |
| ahCheck3 | ~5056 | flow_transfer_node (saída principal) |
| ahCheck4 | ~5401 | flow_transfer_node_msg_chain |
| ahCheck5 | ~4490 | handoff exitType sem próximo nó |
| ahCheck6 | ~4547 | aiExitForced sem próximo nó |

### Pontos SEM verificação (8 de 14): ❌
| # | Linha | Razão | Risco |
|---|-------|-------|-------|
| 1 | ~2081 | flow_transfer_otp_not_customer | Médio |
| 2 | ~2311 | flow_transfer_otp_verified | Médio |
| 3 | ~2489 | flow_transfer_otp_max_attempts | Médio |
| 4 | ~3308 | inline_otp_not_customer | Médio |
| 5 | ~3432 | inline_otp_verified | Médio |
| 6 | ~3535 | inline_otp_verified_no_next_node | Alto (hardcoded handoff_to_human) |
| 7 | ~3592 | inline_otp_failed | Médio |
| 8 | ~3628 | inline_otp_max_attempts | Alto (hardcoded handoff_to_human) |

Todos esses pontos são transferências via nós OTP (verificação por código) que chamam `transition-conversation-state` sem antes verificar o horário comercial.

---

## Plano de Correção

### Arquivo: `supabase/functions/process-chat-flow/index.ts`

Adicionar `checkAfterHoursAndIntercept()` **antes** de cada `fetch(transition-conversation-state)` nos 8 pontos faltantes, seguindo o mesmo padrão dos 6 já implementados:

```typescript
// Antes de cada fetch para transition-conversation-state:
const ahCheckN = await checkAfterHoursAndIntercept(supabaseClient, conversationId, transType);
if (ahCheckN.intercepted) {
  return new Response(JSON.stringify({
    useAI: false, response: ahCheckN.afterHoursMessage, 
    afterHours: true, flowCompleted: true, collectedData,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

Os 8 pontos a corrigir:
1. **L2081** — OTP not_customer: inserir antes do `await fetch(...)` com `otpNcTransType`
2. **L2311** — OTP verified: inserir antes do `await fetch(...)` com `otpOkTransType`
3. **L2489** — OTP max_attempts: inserir antes do `await fetch(...)` com `otpMaxTransType`
4. **L3308** — inline OTP not_customer: inserir antes do `await fetch(...)` com `transType`
5. **L3432** — inline OTP verified: inserir antes do `await fetch(...)` com `transType`
6. **L3535** — inline OTP verified no next: inserir antes do `await fetch(...)` com `'handoff_to_human'`
7. **L3592** — inline OTP failed: inserir antes do `await fetch(...)` com `transType`
8. **L3628** — inline OTP max_attempts fallback: inserir antes do `await fetch(...)` com `'handoff_to_human'`

### Resultado esperado

Cobertura de 14/14 pontos de transferência (100%). Qualquer handoff fora do horário — seja via fluxo principal, contract violation, ou OTP — será interceptado, a mensagem de horário será enviada e a conversa será fechada.


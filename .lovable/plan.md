

# Auditoria Completa — Fix "Vazamento + Nó Errado no forceAIExit"

## Resultado: ✅ Todos os 5 itens do checklist estão implementados corretamente

---

### 1) ai-autopilot-chat: Escape check ANTES de salvar/enviar — ✅ CORRETO

**Ordem verificada (linhas 7847-7933 → 7936):**

```text
gerar assistantMessage
  → linha 7851: validar ESCAPE_PATTERNS (se flow_context + text_only)
    → escape detectado? → return flowExit/contractViolation SEM salvar, SEM enviar
    → restriction violation? → substituir assistantMessage por fallback ANTES
    → trava financeira? → substituir mensagem + transferir
  → linha 7936: SÓ ENTÃO salvar no DB (insert messages)
  → linha ~8020+: SÓ ENTÃO enviar WhatsApp (send-meta-whatsapp)
```

**Payloads limpos confirmados:**
- `flowExit` (linha 7859): retorna apenas `{ flowExit, reason, hasFlowContext, flow_context }` — zero campos de mensagem
- `contractViolation` (linha 7874): retorna apenas `{ contractViolation, flowExit, reason, violationType, hasFlowContext, flow_context }` — zero campos de mensagem

**Cache (linha 8224):** continua DEPOIS do envio e NÃO cacheia mensagens bloqueadas (retorna antes de chegar lá)

### 2) process-chat-flow: forceAIExit → path='ai_exit' — ✅ CORRETO

- Linha 2082: `if (aiExitForced) { path = 'ai_exit'; }` — setado ANTES de findNextNode
- Linha 2085: log de diagnóstico incluído

### 3) findNextNode: priorizar handle 'ai_exit' — ✅ CORRETO

- Linhas 241-250: bloco dedicado para `ai_response` com `path`
- Prioriza edge com `sourceHandle === path` (ex: `ai_exit`)
- Se não achar, cai no fallback genérico (qualquer edge) — resiliência garantida

### 4) Webhook: anti-loop + continue — ✅ CORRETO

- Linha 295: `flowExitHandledByConversation = new Set<string>()` no nível do batch
- Linha 1528: check com `!flowExitHandledByConversation.has(conversation.id)`
- Linha 1631: `continue` após sucesso — não cai no fluxo normal
- Linha 1641: `continue` mesmo no fallback de erro — não vaza

### 5) ESCAPE_PATTERNS — ✅ CORRETO

- Linha 1218: `/\b1[\)\.\-][\s\S]*?\b2[\)\.\-]/i` — non-greedy, sem flag `s`
- Emojis: exige 2+ (`/[1-9]️⃣.*[1-9]️⃣/s`) — isolado não bloqueia
- `[[FLOW_EXIT]]` (linha 1201): detectado como saída limpa

---

## Gap encontrado: Auditoria/rastreabilidade (item 1.2 do checklist)

Quando escape/contractViolation é detectado e a mensagem é bloqueada, **não existe registro em `ai_events`** do texto bloqueado. A telemetria (linha 8182) só roda DEPOIS do save/send, e os retornos de escape saem antes disso.

**Recomendação:** Adicionar um insert em `ai_events` dentro dos blocos de escape (linhas 7854-7887) para rastreabilidade:

```typescript
// Dentro do bloco escapeAttempt (antes do return), adicionar:
await supabaseClient.from('ai_events').insert({
  entity_type: 'conversation',
  entity_id: conversationId,
  event_type: isCleanExit ? 'flow_exit_clean' : 'contract_violation_blocked',
  model: configuredAIModel || 'openai/gpt-5-mini',
  output_json: {
    blocked_preview: assistantMessage.substring(0, 150),
    flow_id: flow_context.flow_id,
    node_id: flow_context.node_id,
    reason: isCleanExit ? 'ai_requested_exit' : 'ai_contract_violation',
  },
  input_summary: customerMessage?.substring(0, 200) || '',
}).catch(err => console.error('[ai-autopilot-chat] ⚠️ Failed to log escape event:', err));
```

Isso é o único ajuste pendente. Sem ele, escapes bloqueados "desaparecem" dos diagnósticos.

## Arquivos a alterar

1. `supabase/functions/ai-autopilot-chat/index.ts` — adicionar 2 inserts em `ai_events` (um no bloco `isCleanExit`, outro no bloco `contractViolation`), ambos non-blocking com `.catch()`

## Resumo

| Checklist | Status |
|---|---|
| 1) Escape check antes de salvar/enviar | ✅ Implementado |
| 1.2) Logs/auditoria de bloqueios | ⚠️ Falta insert em ai_events |
| 2) path='ai_exit' no forceAIExit | ✅ Implementado |
| 2.2) findNextNode prioriza handle | ✅ Implementado |
| 3) Webhook intercepta + anti-loop | ✅ Implementado |
| 4.1) Conversas sem flow_context | ✅ Não afetadas (if flow_context guard) |
| 4.2) Números comuns | ✅ Não bloqueados (patterns exigem contexto) |
| 4.3) Menus textuais/emoji | ✅ Detectados corretamente |


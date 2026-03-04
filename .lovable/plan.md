

# Plano: Ajustes Finais — [[FLOW_EXIT]] Robusto + Anti-Loop

## Estado atual vs. ajustes necessários

| Componente | Status | Gap |
|---|---|---|
| ESCAPE_PATTERNS + [[FLOW_EXIT]] | ✅ Implementado | Falta pattern `1) ... 2) ...` (menus textuais sem emoji) |
| System prompt flow_context | ✅ Implementado | OK |
| flowExit/contractViolation retorno | ✅ Retorna flag | ⚠️ Ainda retorna `original_response` no contractViolation — webhook pode vazar |
| Webhook intercepta e re-invoca | ✅ Implementado | ⚠️ Falta anti-loop guard |
| Webhook trata retorno como CASO 2 | ✅ Já faz (formatOptions + send-meta + transfer) | OK |
| process-chat-flow forceAIExit | ✅ Avança pelo findNextNode normal | ⚠️ Não tem handle `ai_exit` específico, mas `findNextNode` pega qualquer edge — funcional |

## Alterações (2 arquivos)

### 1. `ai-autopilot-chat/index.ts`

**A) Adicionar pattern de menu textual sem emoji** (~linha 1216):
```typescript
// Menus textuais com numeração (1) ... 2) ...)
/\b1[\)\.\-].*\b2[\)\.\-]/s,
```

**B) contractViolation: NÃO retornar `original_response`** (~linha 8161):
Remover `original_response` do payload para garantir que nenhum texto de transferência falsa vaze para o webhook. O payload fica:
```typescript
return { contractViolation: true, flowExit: true, reason: 'ai_contract_violation', hasFlowContext: true, flow_context: { flow_id, node_id } }
```

**C) flowExit: confirmar que NÃO retorna `message`** — já está OK, retorna só flags.

### 2. `meta-whatsapp-webhook/index.ts`

**Anti-loop guard** (~linha 1525): Antes do bloco `if (flowExit || contractViolation)`, adicionar uma flag para evitar re-invocação duplicada na mesma execução do webhook. Simples:
```typescript
let flowExitHandled = false; // declarar no início do loop de mensagens
// ...
if ((autopilotData?.flowExit || autopilotData?.contractViolation) && autopilotData?.hasFlowContext && !flowExitHandled) {
  flowExitHandled = true;
  // ... lógica existente ...
}
```

Isso previne loop se o próximo nó chamar autopilot de novo na mesma mensagem.

## Arquivos impactados (2)

1. `supabase/functions/ai-autopilot-chat/index.ts` — +1 pattern textual, remover `original_response` do contractViolation
2. `supabase/functions/meta-whatsapp-webhook/index.ts` — anti-loop guard

## Resultado esperado

- `[[FLOW_EXIT]]` nunca aparece no WhatsApp (já garantido, confirmado)
- `contractViolation` não vaza texto original (ajuste B)
- Menus textuais `1) ... 2) ...` agora detectados (ajuste A)
- Sem loop de re-invocação (ajuste anti-loop)
- Tudo que já funciona continua funcionando (zero regressão)


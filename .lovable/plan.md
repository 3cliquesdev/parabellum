

# Diagnóstico: Fluxo principal chamado junto com o teste + mensagens não aparecem

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Causa Raiz Identificada (com evidência dos logs e banco)

### Problema Principal: Mensagens do manual trigger NÃO são salvas no banco

A função `deliverManualMessage` no `process-chat-flow/index.ts` (linha 747-755) insere mensagens com `status: 'pending'`. Porém, o enum `message_status` do banco aceita apenas: `{sending, sent, delivered, failed, read}`.

**`pending` não existe no enum.** O insert falha silenciosamente porque não há tratamento de erro.

Resultado:
- As mensagens do fluxo de teste SÃO enviadas ao WhatsApp (logs confirmam: "✅ Manual message sent via Meta WhatsApp")
- Mas NÃO aparecem no chat da UI (não foram salvas no banco)
- O usuário vê apenas as mensagens antigas do Fluxo Principal (que foram salvas corretamente pelo webhook)
- Isso cria a ilusão de que "o fluxo principal está rodando junto com o teste"

### Evidência

```
-- Enum válidos:
{sending, sent, delivered, failed, read}

-- Valor usado no deliverManualMessage:
status: 'pending'  ← INVÁLIDO, insert falha silenciosamente
```

```
-- Mensagens do manual trigger no banco (01:20:28 a 01:20:40):
SELECT ... WHERE created_at BETWEEN '01:20:28' AND '01:20:40'
→ ZERO resultados
```

```
-- Logs confirmam envio ao WhatsApp:
01:20:32 ✅ Manual message sent via Meta WhatsApp
01:20:34 ✅ Manual message sent via Meta WhatsApp
```

### Estado real no banco

- Apenas 1 flow state ativo: draft flow `20a05c59` em `waiting_input` ✅
- O Fluxo Principal NÃO tem estado ativo — foi corretamente limpo pelo manual trigger ✅
- O fluxo de teste ESTÁ respondendo corretamente (invalidOption para "Boa noite") ✅

## Mudanças Necessárias

### 1. `process-chat-flow/index.ts` — Corrigir status do insert de mensagem

**Linha 754:** Alterar `status: 'pending'` para `status: 'sent'`

### 2. `process-chat-flow/index.ts` — Adicionar tratamento de erro no insert

Na função `deliverManualMessage`, capturar e logar erros do insert para evitar falhas silenciosas futuras:

```typescript
const { error: insertError } = await supabaseClient.from('messages').insert({
  conversation_id: conversationId,
  content: finalText,
  sender_type: 'user',
  sender_id: null,
  is_ai_generated: true,
  channel: convForDelivery?.channel || 'web_chat',
  status: 'sent'  // FIX: 'pending' não existe no enum message_status
});

if (insertError) {
  console.error('[process-chat-flow] ❌ Error saving manual trigger message:', insertError);
}
```

| Arquivo | Linha | Mudança |
|---|---|---|
| `process-chat-flow/index.ts` | 747-755 | `status: 'pending'` → `status: 'sent'` + error handling |

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — apenas corrige bug, não altera lógica |
| Upgrade | Sim — mensagens do manual trigger passam a aparecer no chat |
| Kill Switch | Não afetado |
| Fluxo nunca mudo | Corrigido — a mensagem de boas-vindas do fluxo agora aparece no chat |

## Resultado esperado

1. Iniciar fluxo de teste → mensagem de boas-vindas aparece no chat imediatamente ✅
2. Indicador mostra o fluxo correto (já funciona) ✅
3. Fluxo Principal NÃO interfere (já funciona, era ilusão visual) ✅




# Fix: Confirmação de encerramento ignorada quando conversa está em `waiting_human`

## Problema

A IA (dentro do nó `ai_response` do fluxo) perguntou "Posso encerrar seu atendimento?" e setou `awaiting_close_confirmation: true` no metadata. O cliente respondeu "Sim".

Porém, a conversa está com `ai_mode: waiting_human`, e nesse modo:
1. `process-chat-flow` retorna `skipAutoResponse: true` (linha 434)
2. O webhook envia "💬 Sua conversa já está na fila de atendimento" 
3. `ai-autopilot-chat` **nunca é chamado**
4. O handler de `awaiting_close_confirmation` (linha 1755) nunca processa o "Sim"

## Solução

### Adicionar check de `awaiting_close_confirmation` no webhook

No `meta-whatsapp-webhook/index.ts`, **antes** de processar o `skipAutoResponse`, verificar se a conversa tem `awaiting_close_confirmation: true` no `customer_metadata`. Se sim, chamar `ai-autopilot-chat` diretamente para processar a confirmação — ignorando o skip.

```text
Fluxo atual:
  message → process-chat-flow → skipAutoResponse → "fila de atendimento"

Fluxo corrigido:
  message → check awaiting_close_confirmation → se sim → ai-autopilot-chat → processa "Sim"/"Não"
          → se não → process-chat-flow → skipAutoResponse → "fila de atendimento"
```

### Arquivo editado
- `supabase/functions/meta-whatsapp-webhook/index.ts` — inserir guard de `awaiting_close_confirmation` no bloco de `skipAutoResponse` (antes da linha 698), que chama `ai-autopilot-chat` para processar a resposta de confirmação

### Sem risco de regressão
- Só ativa quando `awaiting_close_confirmation === true` no metadata
- O handler existente em `ai-autopilot-chat` (linha 1755) já trata "sim"/"não" com toda a governança (kill switch, shadow mode, tags obrigatórias)
- Conversas normais em `waiting_human` sem essa flag continuam com o comportamento atual


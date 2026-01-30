
# Plano: Corrigir Fluxo que Para de Funcionar após Envio de Opções

## Diagnóstico Completo

### O que está acontecendo
1. O cliente envia uma mensagem (ex: "Olá, vim pelo site")
2. O fluxo processa e retorna opções (ex: "Você já é nosso cliente? 1️⃣ Sim 2️⃣ Não")
3. O webhook chama `send-meta-whatsapp` para enviar essa resposta
4. O `send-meta-whatsapp` **erroneamente** detecta essa mensagem como "de humano" porque:
   - É uma mensagem de texto simples (`body.message`)
   - Não é template (`!body.template`)
   - Não é interativo (`!body.interactive`)
5. O `send-meta-whatsapp` muda `ai_mode` de `autopilot` para `copilot`
6. Cliente responde "1"
7. O `process-chat-flow` verifica o `ai_mode`, vê que é `copilot` e retorna `skipAutoResponse: true`
8. O fluxo não avança - fica mudo

### Evidência nos logs
```
18:49:50Z [process-chat-flow] 📍 Content node: ask_options
18:49:52Z [send-meta-whatsapp] 🛡️ Human sent message - updating ai_mode from 'autopilot' to 'copilot' ← BUG!
18:50:05Z [process-chat-flow] ai_mode_copilot - fluxo/IA bloqueados ← Consequência
```

### Causa raiz
A lógica no `send-meta-whatsapp` (linhas 385-407) assume que toda mensagem de texto simples é de humano:
```typescript
const isHumanMessage = body.message && !body.template && !body.interactive;
```

Mas o fluxo também envia mensagens de texto simples - são mensagens do BOT, não de humano!

---

## Solução Proposta

### Mudança 1: Adicionar flag `is_bot_message` no payload

**Arquivo: `supabase/functions/meta-whatsapp-webhook/index.ts`**

Quando o webhook envia mensagens do fluxo, adicionar uma flag indicando que é mensagem de bot:

```typescript
// Linha ~641
const sendResponse = await supabase.functions.invoke("send-meta-whatsapp", {
  body: {
    instance_id: instance.id,
    phone_number: fromNumber,
    message: formattedMessage,
    conversation_id: conversation.id,
    skip_db_save: false,
    is_bot_message: true,  // 🆕 Indica que é mensagem do bot/fluxo
  },
});
```

Aplicar em TODOS os lugares onde o webhook envia mensagens automaticas:
- Resposta do fluxo (linha ~641)
- Mensagem de "aguarde na fila" (linha ~596-605)
- Qualquer outro envio automático

### Mudança 2: Respeitar flag `is_bot_message` no send-meta-whatsapp

**Arquivo: `supabase/functions/send-meta-whatsapp/index.ts`**

Ajustar a lógica de detecção de "mensagem humana":

```typescript
// Linha ~385
// ANTES:
const isHumanMessage = body.message && !body.template && !body.interactive;

// DEPOIS:
// 🛡️ Mensagem de humano = texto simples que NÃO é do bot/fluxo
const isHumanMessage = body.message && 
                       !body.template && 
                       !body.interactive && 
                       !body.is_bot_message;  // 🆕 Respeitar flag do fluxo

if (isHumanMessage) {
  // ... lógica de proteção humana (mantém)
}
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Adicionar `is_bot_message: true` em 2-3 lugares |
| `supabase/functions/send-meta-whatsapp/index.ts` | Adicionar `&& !body.is_bot_message` na condição |

---

## Fluxo Corrigido

```
Cliente envia "Olá"
         |
         v
   process-chat-flow → ask_options
         |
         v
   meta-whatsapp-webhook
   envia com is_bot_message: true
         |
         v
   send-meta-whatsapp
   isHumanMessage = false (é bot!)
   NÃO muda ai_mode
         |
         v
   ai_mode continua "autopilot"
         |
         v
   Cliente responde "1"
         |
         v
   process-chat-flow verifica:
   ai_mode = "autopilot" ✓
         |
         v
   Fluxo avança normalmente ✓
```

---

## Validação Pós-Implementação

1. Iniciar nova conversa no WhatsApp
2. Receber opções do fluxo ("1 Sim, 2 Não")
3. Responder "1"
4. **Esperado**: Fluxo avança para o próximo nó
5. **Antes do fix**: Fluxo ficava mudo

Testes adicionais:
- Humano enviar mensagem pelo Inbox → `ai_mode` deve mudar para `copilot` (proteção mantida)
- Bot enviar mensagem do fluxo → `ai_mode` NÃO muda (bug corrigido)
- Verificar logs: "Human sent message" só aparece quando é realmente humano

---

## Conformidade com Regras

- **Upgrade, não downgrade**: Corrige bug sem quebrar proteção humana
- **Zero regressão**: Mensagens de humano continuam mudando para copilot
- **Soberania do fluxo**: Fluxo agora pode enviar mensagens sem auto-desligar
- **Read-only no frontend**: Mudanças apenas em edge functions



# Fix: Mensagem de fluxo enviada SEM opções no exit comercial

## Diagnóstico

Analisei a conversa #B7ED7589 e os `ai_events` confirmam a sequência:

1. **13:06:04** — `ai-autopilot-chat` detectou intenção comercial ("plano" em "Quero fazer parte do plano nacional")
2. **13:06:05** — webhook re-invocou `process-chat-flow` com `forceCommercialExit: true`
3. Flow engine avançou do nó IA para o nó `ask_options` (Sim/Não) e retornou a resposta COM options

**Porém**, o handler de `commercialBlocked` no webhook (linhas 1437-1461) tem 3 bugs:

### Bug 1: Options NÃO formatadas
```typescript
// ATUAL (linha 1447):
message: flowMessage,  // SEM formatOptionsAsText!

// O que deveria ser:
message: flowMessage + formatOptionsAsText(flowData.options),
```
Resultado: "Seja bem-vindo... Você já é nosso cliente?" foi enviada **sem** "1️⃣ Sim / 2️⃣ Não"

### Bug 2: Mensagem salva como `sender_type: "system"` sem metadata
```typescript
// ATUAL (linhas 1453-1458):
await supabase.from("messages").insert({
  content: flowMessage,
  sender_type: "system",  // Deveria ser "user" (padrão bot)
  // SEM metadata com flow_id/flow_name
});
```

### Bug 3: Mesmo problema no handler `financialBlocked` (linhas 1229-1258)
Mesma lógica duplicada com os mesmos bugs.

## Solução

### Arquivo: `supabase/functions/meta-whatsapp-webhook/index.ts`

**4 pontos de correção** (commercial + financial, tentativa 1 + retry):

1. **Linhas ~1438-1458** (commercial exit, tentativa 1): Adicionar `formatOptionsAsText`, corrigir `sender_type` e metadata
2. **Linhas ~1501-1512** (commercial exit, retry): Idem
3. **Linhas ~1230-1252** (financial exit, tentativa 1): Idem
4. **Linhas correspondentes** (financial exit, retry): Idem

Padrão correto (alinhado com CASO 2):
```typescript
const flowMessage = (flowData.response || flowData.message)
  ? (flowData.response || flowData.message) + formatOptionsAsText(flowData.options)
  : null;

if (flowMessage) {
  await supabase.functions.invoke("send-meta-whatsapp", {
    body: {
      instance_id: instance.id,
      phone_number: fromNumber,
      message: flowMessage,
      conversation_id: conversation.id,
      skip_db_save: false,
      is_bot_message: true,
      metadata: flowData.flowName ? { flow_id: flowData.flowId, flow_name: flowData.flowName } : undefined,
    },
  });
  // Remover insert manual — send-meta-whatsapp já salva com skip_db_save: false
}
```

### Arquivo: `supabase/functions/process-chat-flow/index.ts`

**matchAskOption** — adicionar matching parcial (starts-with + contains):
```typescript
function matchAskOption(userInput, options) {
  const normalized = userInput.trim().toLowerCase();
  // 1️⃣ Número
  // 2️⃣ Texto exato
  // 3️⃣ NEW: Começa com label ("Não sou cliente" → "Não")
  // 4️⃣ NEW: Label contido como palavra (unambíguo)
}
```

### Impacto
- Corrige a mensagem sem opções no exit comercial/financeiro
- Corrige metadata e sender_type para renderização correta
- matchAskOption fuzzy previne rejeições desnecessárias
- Deploy automático de ambas edge functions


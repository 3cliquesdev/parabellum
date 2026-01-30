
# Plano: Executar Transferência Real no Nó Transfer

## Problema Identificado

O fluxo envia a mensagem "Já estou transferindo seu contato..." mas **não executa a transferência real**:
- A conversa permanece na "Fila IA" / "Pool"
- `ai_mode` continua como `autopilot`
- `department_id` não é atualizado para o departamento Comercial

### Evidência
- Mensagem de transferência foi enviada ✅
- Conversa ainda mostra "Pool" e "Fila IA" ❌
- `department_id` = null (não foi atribuído ao Comercial)

---

## Causa Raiz

### Arquivo: `supabase/functions/meta-whatsapp-webhook/index.ts`

**Linha 519-526 - Interface `flowData` incompleta:**
```typescript
let flowData: {
  useAI?: boolean;
  aiNodeActive?: boolean;
  response?: string;
  options?: Array<{label: string; value?: string; id?: string}>;
  skipAutoResponse?: boolean;
  flow_context?: Record<string, unknown>;
  // ❌ FALTANDO: transfer, transferType, departmentId
} = {};
```

**Linha 569-596 - CASO 2 ignora transferência:**
```typescript
// CASO 2: Fluxo retornou resposta estática
if (!flowData.useAI && flowData.response) {
  // Envia mensagem ✅
  await supabase.functions.invoke("send-meta-whatsapp", {...});
  continue;  // ❌ Para aqui - não verifica flowData.transfer
}
```

---

## Solução

### 1. Atualizar Interface `flowData`

Adicionar campos de transferência:

```typescript
let flowData: {
  useAI?: boolean;
  aiNodeActive?: boolean;
  response?: string;
  options?: Array<{label: string; value?: string; id?: string}>;
  skipAutoResponse?: boolean;
  flow_context?: Record<string, unknown>;
  transfer?: boolean;           // 🆕
  transferType?: string;        // 🆕
  departmentId?: string;        // 🆕
} = {};
```

### 2. Adicionar Verificação de Transferência após CASO 2

Após enviar a mensagem, verificar se é transferência:

```typescript
// CASO 2: Fluxo retornou resposta estática (Message/AskOptions/etc)
if (!flowData.useAI && flowData.response) {
  const formattedMessage = flowData.response + formatOptionsAsText(flowData.options);
  
  // Enviar mensagem
  await supabase.functions.invoke("send-meta-whatsapp", {
    body: {...}
  });
  
  // 🆕 EXECUTAR TRANSFERÊNCIA SE NECESSÁRIO
  if (flowData.transfer) {
    console.log("[meta-whatsapp-webhook] 🔄 Executing transfer to department:", flowData.departmentId);
    
    // Atualizar conversa: ai_mode + department_id
    const updateData: Record<string, unknown> = {
      ai_mode: 'waiting_human',
    };
    
    if (flowData.departmentId) {
      updateData.department_id = flowData.departmentId;
    }
    
    const { error: updateError } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversation.id);
    
    if (updateError) {
      console.error("[meta-whatsapp-webhook] ❌ Error executing transfer:", updateError);
    } else {
      console.log("[meta-whatsapp-webhook] ✅ Transfer executed → department:", flowData.departmentId);
    }
  }
  
  continue;
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Linha 519-526: Adicionar campos `transfer`, `transferType`, `departmentId` à interface |
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Linha 569-596: Adicionar lógica de transferência após envio da mensagem |

---

## Fluxo Corrigido

```text
Cliente responde "1" (Drop Nacional)
         │
         ▼
process-chat-flow:
  response: "Já estou transferindo..."
  transfer: true
  departmentId: "f446e202-bdc3-4bb3-aeda-8c0aa04ee53c"
         │
         ▼
meta-whatsapp-webhook (CASO 2):
  1. Envia mensagem via WhatsApp ✅
  2. Verifica flowData.transfer === true
  3. Atualiza conversa:
     - ai_mode: 'waiting_human'
     - department_id: 'f446e202-...' (Comercial)
         │
         ▼
Conversa aparece na Fila do Comercial ✅
Agentes podem atender ✅
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Mensagem enviada, conversa no Pool | Mensagem enviada + conversa no Comercial |
| `ai_mode: autopilot` | `ai_mode: waiting_human` |
| `department_id: null` | `department_id: f446e202-...` (Comercial) |
| Aparece em "Fila IA" | Aparece em "Comercial" |

---

## Testes Obrigatórios

| Cenário | Resultado Esperado |
|---------|-------------------|
| Fluxo com nó transfer + departmentId | Conversa movida para departamento correto |
| Fluxo com nó transfer sem departmentId | `ai_mode: waiting_human`, departamento inalterado |
| Fluxo ask_options sem transfer | Apenas envia mensagem, não muda ai_mode |
| Fluxo message sem transfer | Apenas envia mensagem, não muda ai_mode |

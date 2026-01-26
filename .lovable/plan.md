
## Plano: Corrigir Nó "Transferir" do Chat Flow

### Problemas Identificados

**Problema 1 - Trigger muito restritivo:**
O fluxo "Fluxo de Carnaval" tem a keyword:
```
"Olá vim pelo email e gostaria de saber da promoção de pré carnaval"
```
A lógica usa `includes()` - a mensagem do usuário precisa conter essa frase **inteira**. Se você enviar só "oi" ou "promoção carnaval", não dispara.

**Problema 2 - Transferência NÃO É EXECUTADA (principal):**
Quando o `process-chat-flow` retorna:
```json
{
  "useAI": false,
  "response": "Transferindo para um atendente...",
  "transfer": true,
  "departmentId": "f446e202-bdc3-4bb3-aeda-8c0aa04ee53c"
}
```
O `ai-autopilot-chat` apenas salva a mensagem, mas **NUNCA chama `route-conversation`** para realmente fazer a transferência!

---

### Solução

#### 1. Adicionar Lógica de Transferência no ai-autopilot-chat

Modificar `supabase/functions/ai-autopilot-chat/index.ts` para tratar `flowResult.transfer === true`:

```typescript
// Após linha ~1388 no bloco que trata flowResult.useAI === false
if (flowResult.useAI === false && flowResult.response) {
  console.log('[ai-autopilot-chat] ✅ Fluxo determinístico - usando resposta do flow');
  
  // 🆕 NOVO: Se é uma transferência, executar handoff real
  if (flowResult.transfer === true && flowResult.departmentId) {
    console.log('[ai-autopilot-chat] 🔀 TRANSFER NODE - Executando handoff real para:', flowResult.departmentId);
    
    // 1. Marcar handoff com timestamp para anti-race-condition
    const handoffTimestamp = new Date().toISOString();
    
    await supabaseClient
      .from('conversations')
      .update({ 
        ai_mode: 'waiting_human',
        handoff_executed_at: handoffTimestamp,
        needs_human_review: true,
        department: flowResult.departmentId, // 🆕 Definir departamento direto
      })
      .eq('id', conversationId);
    
    console.log('[ai-autopilot-chat] ✅ Conversa marcada como waiting_human');
    
    // 2. Chamar route-conversation para distribuir
    await supabaseClient.functions.invoke('route-conversation', {
      body: { 
        conversationId,
        targetDepartmentId: flowResult.departmentId // 🆕 Enviar departamento destino
      }
    });
    
    console.log('[ai-autopilot-chat] ✅ Conversa roteada para departamento:', flowResult.departmentId);
  }
  
  // Resto do código existente (salvar mensagem, enviar WhatsApp, etc.)
  // ...
}
```

#### 2. Atualizar route-conversation para Aceitar Departamento

Verificar se `route-conversation` aceita o parâmetro `targetDepartmentId` e o usa para definir o departamento correto antes de distribuir.

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Adicionar lógica para executar `route-conversation` quando `flowResult.transfer === true` |
| `supabase/functions/route-conversation/index.ts` | Verificar se aceita `targetDepartmentId` (provavelmente já aceita) |

---

### Fluxo Após Correção

```text
[Usuário envia mensagem que dispara fluxo]
        |
        v
[ai-autopilot-chat chama process-chat-flow]
        |
        v
[process-chat-flow encontra nó Transfer]
        |
        v
[Retorna: { transfer: true, departmentId: "Comercial" }]
        |
        v
[ai-autopilot-chat DETECTA transfer === true] 🆕
        |
        v
[Atualiza conversa: ai_mode = 'waiting_human', department = departmentId]
        |
        v
[Chama route-conversation para distribuir]
        |
        v
[Envia mensagem "Transferindo para atendimento humano..."]
        |
        v
[Conversa aparece no departamento correto para agentes]
```

---

### Sobre as Keywords do Fluxo

O fluxo "Fluxo de Carnaval" só será disparado se a mensagem do usuário **contiver** a frase:
```
"Olá vim pelo email e gostaria de saber da promoção de pré carnaval"
```

Para testar, você pode:
1. Editar o fluxo e adicionar keywords mais simples (ex: "carnaval", "promoção")
2. Ou enviar a mensagem exata que está configurada

---

### Seção Técnica

**Linhas a modificar:**
- `supabase/functions/ai-autopilot-chat/index.ts` linhas ~1388-1440 (bloco de resposta determinística)

**Lógica de match atual (process-chat-flow.ts:508-512):**
```typescript
for (const trigger of allTriggers) {
  if (messageLower.includes(trigger.toLowerCase())) {
    matchedFlow = flow;
    break;
  }
}
```
Isso significa que "oi vim pelo email" **não** dispararia o fluxo, mas "vim pelo email e gostaria de saber da promoção de pré carnaval" **sim**.

**Departamento do nó Transfer:**
- Comercial: `f446e202-bdc3-4bb3-aeda-8c0aa04ee53c`

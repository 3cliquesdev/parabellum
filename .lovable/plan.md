

## Plano de Correção: IA Deve Pedir Email ANTES de Fazer Handoff

### Problema Identificado

O fluxo atual está fazendo handoff imediato quando a confiança é baixa, **SEM pedir o email primeiro**. A verificação `isLeadWithoutEmail` só decide o departamento destino (Comercial/Suporte), mas não bloqueia o handoff para pedir email.

**Fluxo Atual (ERRADO):**
```text
Lead sem email envia "Olá boa tarde"
        |
        v
  Identity Wall: hasEmail=false ✅
        |
        v
  Confidence Score: 22% → action=handoff
        |
        v
  isLeadWithoutEmail? SIM → department=Comercial ✅
        |
        v
  FAZ HANDOFF IMEDIATO ❌ (sem pedir email!)
        |
        v
  [Lead na fila do Comercial SEM email verificado]
```

**Fluxo Correto (ESPERADO):**
```text
Lead sem email envia "Olá boa tarde"
        |
        v
  Identity Wall: hasEmail=false ✅
        |
        v
  Confidence Score: 22% → action=handoff
        |
        v
  isLeadWithoutEmail? SIM
        |
        v
  BLOQUEAR HANDOFF → Responder pedindo email ✅
        |
        v
  [Lead responde com email]
        |
        v
  verify_customer_email → Não encontrado
        |
        v
  confirm_email_not_found → Transferir para Comercial ✅
```

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Bloquear handoff para leads sem email e responder pedindo email |

---

### Implementação Detalhada

#### Modificar a Lógica de Handoff por Baixa Confiança (Linhas 2118-2247)

**Localização:** Após `if (confidenceResult.action === 'handoff' && !shouldSkipHandoff)`

**Antes:**
```typescript
if (confidenceResult.action === 'handoff' && !shouldSkipHandoff) {
  console.log('[ai-autopilot-chat] LOW CONFIDENCE HANDOFF');
  
  const isLeadWithoutEmail = !contactHasEmail && !isCustomerInDatabase && !isKiwifyValidated;
  const handoffDepartment = isLeadWithoutEmail ? DEPT_COMERCIAL_ID : DEPT_SUPORTE_ID;
  
  // FAZ HANDOFF IMEDIATO (mesmo sem email) ← PROBLEMA
  await supabaseClient.from('conversations').update({ ai_mode: 'waiting_human' })...
  await supabaseClient.functions.invoke('route-conversation')...
  
  return new Response(...); // RETORNA SEM PEDIR EMAIL
}
```

**Depois:**
```typescript
if (confidenceResult.action === 'handoff' && !shouldSkipHandoff) {
  console.log('[ai-autopilot-chat] LOW CONFIDENCE HANDOFF');
  
  const isLeadWithoutEmail = !contactHasEmail && !isCustomerInDatabase && !isKiwifyValidated && !isPhoneVerified;
  
  // 🆕 NOVA LÓGICA: Lead sem email → NÃO fazer handoff, pedir email primeiro
  if (isLeadWithoutEmail) {
    console.log('[ai-autopilot-chat] 🔐 LEAD SEM EMAIL - Bloqueando handoff, pedindo email primeiro');
    
    // Usar template do banco ou fallback
    let askEmailMessage = await getMessageTemplate(
      supabaseClient,
      'identity_wall_ask_email',
      { contact_name: contactName || '' }
    );
    
    if (!askEmailMessage) {
      const firstName = contactName ? contactName.split(' ')[0] : '';
      askEmailMessage = `Olá${firstName ? `, ${firstName}` : ''}! 👋\n\nPara garantir um atendimento personalizado e seguro, preciso que você me informe seu email.`;
    }
    
    // Salvar mensagem pedindo email
    await supabaseClient.from('messages').insert({
      conversation_id: conversationId,
      content: askEmailMessage,
      sender_type: 'user',
      is_ai_generated: true,
      channel: responseChannel
    });
    
    // Enviar via WhatsApp se for o canal
    if (responseChannel === 'whatsapp' && contact?.phone) {
      const whatsappInstance = await getWhatsAppInstanceForConversation(
        supabaseClient, 
        conversationId, 
        conversation.whatsapp_instance_id
      );
      
      if (whatsappInstance) {
        await supabaseClient.functions.invoke('send-whatsapp-message', {
          body: {
            instance_id: whatsappInstance.id,
            phone_number: contact.phone,
            whatsapp_id: contact.whatsapp_id,
            message: askEmailMessage,
            conversation_id: conversationId,
            use_queue: true
          }
        });
      }
    }
    
    // Atualizar metadata para rastrear que estamos aguardando email
    await supabaseClient.from('conversations')
      .update({
        customer_metadata: {
          ...(conversation.customer_metadata || {}),
          awaiting_email_for_handoff: true,
          handoff_blocked_at: new Date().toISOString(),
          handoff_blocked_reason: 'low_confidence_lead_without_email'
        }
      })
      .eq('id', conversationId);
    
    // RETORNAR SEM FAZER HANDOFF - Aguardar email
    return new Response(JSON.stringify({
      status: 'awaiting_email',
      message: askEmailMessage,
      reason: 'Lead sem email - solicitando identificacao antes do handoff',
      confidence_score: confidenceResult.score
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Cliente identificado → Continuar com handoff normal para Suporte
  const handoffDepartment = confidenceResult.department || DEPT_SUPORTE_ID;
  // ... resto da lógica de handoff existente
}
```

---

### Fluxo Corrigido

```text
[Lead sem email envia mensagem]
         |
         v
  Identity Wall Check:
    - hasEmail: false
    - isCustomerInDatabase: false
         |
         v
  Confidence Score: 22%
  action: handoff
         |
         v
  🆕 NOVA VERIFICAÇÃO:
    isLeadWithoutEmail? SIM
         |
         v
  🆕 BLOQUEAR HANDOFF!
  Responder: "Para garantir um atendimento
  personalizado, preciso do seu email."
         |
         v
  status: 'awaiting_email'
  (conversa continua em autopilot)
         |
         v
  [Lead responde com email]
         |
         v
  IA usa verify_customer_email
         |
         v
  Email não encontrado → IA confirma
         |
         v
  confirm_email_not_found(confirmed=true)
         |
         v
  [AGORA SIM: Handoff para Comercial]
```

---

### Benefícios

- IA sempre pede email antes de fazer handoff para leads
- Leads são verificados na base antes de ir para o Comercial
- Se o email existir na base, cliente é identificado e vai para Suporte
- Clientes já identificados continuam com handoff normal
- Metadata rastreia o estado da conversa (awaiting_email)

---

### Seção Tecnica

**Constantes:**
```typescript
const DEPT_COMERCIAL_ID = 'f446e202-bdc3-4bb3-aeda-8c0aa04ee53c';
const DEPT_SUPORTE_ID = '36ce66cd-7414-4fc8-bd4a-268fecc3f01a';
```

**Verificacao de Lead:**
```typescript
const isLeadWithoutEmail = !contactHasEmail && !isCustomerInDatabase && !isKiwifyValidated && !isPhoneVerified;
```

**Template Sugerido (ai_message_templates):**
```json
{
  "key": "identity_wall_ask_email",
  "content": "Olá{{contact_name ? `, ${contact_name}` : ''}}! 👋\n\nPara garantir um atendimento personalizado e seguro, preciso que você me informe seu email.",
  "is_active": true
}
```

**Linhas a Modificar:**
- `supabase/functions/ai-autopilot-chat/index.ts` linhas 2118-2247

**Deploy Necessario:**
- Edge Function `ai-autopilot-chat`



## Plano de Correção: IA Deve Pedir Email e Direcionar Lead para Comercial

### Problema Identificado

O fluxo atual da IA tem um bug crítico no **handoff automático por baixa confiança**:

1. Quando a IA não encontra resposta adequada na KB, ela executa handoff para `suporte_n1` por padrão
2. Isso acontece **MESMO** quando o contato é um **lead sem email verificado**
3. O correto seria: **Lead não identificado → Comercial** (não Suporte)

### Evidências nos Logs

```text
[ai-autopilot-chat] 🔐 Identity Wall Check: {
  hasEmail: false,
  isCustomerInDatabase: false,
  contactStatus: "lead"
}

[ai-autopilot-chat] 🎯 CONFIDENCE SCORE: {
  score: "22%",
  action: "handoff",
  department: "suporte_n1"  ← ERRO: Deveria ser "comercial" para leads
}

[route-conversation] 🔄 Mapped slug "suporte_n1" -> "Suporte"
[route-conversation] ✅ Assigning to: Caroline (support_agent)  ← ERRO
```

### Solução Proposta

Modificar a lógica de handoff para verificar se o contato é um lead não identificado e, nesse caso, direcionar para o departamento Comercial.

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Adicionar verificação de lead no handoff automático |
| `src/lib/ai/confidence-score.ts` | Aceitar parâmetro de contexto do cliente para definir departamento |

---

### Implementação Detalhada

#### 1. Modificar o Fallback Detector (ai-autopilot-chat)

**Localização:** Linhas ~4420-4445

**Antes:**
```typescript
if (isFallbackResponse) {
  console.log('[ai-autopilot-chat] 🚨 FALLBACK DETECTADO - Executando handoff REAL');
  
  // 1. MUDAR O MODO para waiting_human
  await supabaseClient.from('conversations')
    .update({ ai_mode: 'waiting_human', ... })
    .eq('id', conversationId);
  
  // 2. CHAMAR O ROTEADOR (sem departamento específico)
  const { data: routeResult } = await supabaseClient.functions.invoke('route-conversation', {
    body: { conversationId }  // ← BUG: Não passa departamento
  });
}
```

**Depois:**
```typescript
if (isFallbackResponse) {
  console.log('[ai-autopilot-chat] 🚨 FALLBACK DETECTADO - Executando handoff REAL');
  
  // 🆕 VERIFICAÇÃO DE LEAD: Se não tem email verificado → Comercial
  const isLeadWithoutEmail = !contactHasEmail && !isCustomerInDatabase && contact.status === 'lead';
  const handoffDepartment = isLeadWithoutEmail ? 'comercial' : confidenceResult.recommended_dept || 'suporte_n1';
  
  console.log('[ai-autopilot-chat] 🎯 Handoff department decision:', {
    isLeadWithoutEmail,
    contactHasEmail,
    contactStatus: contact.status,
    handoffDepartment
  });
  
  // 1. MUDAR O MODO para waiting_human + definir departamento
  const DEPT_COMERCIAL_ID = 'f446e202-bdc3-4bb3-aeda-8c0aa04ee53c';
  
  await supabaseClient.from('conversations')
    .update({ 
      ai_mode: 'waiting_human',
      handoff_executed_at: handoffTimestamp,
      needs_human_review: true,
      // 🆕 Se for lead, já definir departamento Comercial
      ...(isLeadWithoutEmail && { department: DEPT_COMERCIAL_ID })
    })
    .eq('id', conversationId);
  
  // 2. CHAMAR O ROTEADOR COM DEPARTAMENTO CORRETO
  const { data: routeResult } = await supabaseClient.functions.invoke('route-conversation', {
    body: { 
      conversationId,
      // 🆕 Passar departamento explícito para leads
      ...(isLeadWithoutEmail && { department_id: DEPT_COMERCIAL_ID })
    }
  });
  
  // 🆕 Mensagem diferenciada para leads
  if (isLeadWithoutEmail && routeResult?.assigned) {
    assistantMessage = 'Obrigado pelo seu interesse! Vou te direcionar para nosso time Comercial que poderá te apresentar nossas soluções. 🤝\n\nAguarde um momento que logo um de nossos consultores irá te atender!';
  }
}
```

#### 2. Modificar o Handoff por LOW CONFIDENCE

**Localização:** Linhas ~3180-3250 (onde usa `confidenceResult.action === 'handoff'`)

Adicionar a mesma lógica de verificação de lead antes de executar o handoff:

```typescript
// 🆕 ANTES do handoff por baixa confiança
if (confidenceResult.action === 'handoff') {
  const isLeadWithoutEmail = !contactHasEmail && !isCustomerInDatabase;
  
  // Se for lead → rotear para comercial, NÃO para suporte_n1
  if (isLeadWithoutEmail) {
    console.log('[ai-autopilot-chat] 🎯 LOW CONFIDENCE + LEAD = Roteando para COMERCIAL');
    
    const DEPT_COMERCIAL_ID = 'f446e202-bdc3-4bb3-aeda-8c0aa04ee53c';
    
    // Atualizar conversa para Comercial + waiting_human
    await supabaseClient.from('conversations')
      .update({ 
        department: DEPT_COMERCIAL_ID,
        ai_mode: 'waiting_human',
        customer_metadata: {
          ...conversation.customer_metadata,
          lead_routed_to_comercial_reason: 'low_confidence_handoff',
          lead_routed_at: new Date().toISOString()
        }
      })
      .eq('id', conversationId);
    
    // Rotear para agente comercial
    await supabaseClient.functions.invoke('route-conversation', {
      body: { conversationId, department_id: DEPT_COMERCIAL_ID }
    });
    
    // Mensagem para o lead
    assistantMessage = 'Obrigado pelo contato! Para melhor te atender, vou te direcionar para nosso time Comercial. 🤝\n\nAguarde um momento!';
    
    // RETURN EARLY - não continuar processamento normal
    // ... salvar mensagem e retornar
  }
}
```

#### 3. Atualizar o `confidence-score.ts` para Aceitar Contexto

Modificar a função para aceitar informações do cliente e retornar o departamento apropriado:

```typescript
export interface ConfidenceContext {
  isLead?: boolean;
  hasEmail?: boolean;
  isFinancialRequest?: boolean;
}

export function calculateConfidenceScore(
  query: string,
  documents: RetrievedDocument[],
  context?: ConfidenceContext  // 🆕 Parâmetro opcional
): ConfidenceResult {
  // ... lógica existente ...
  
  // 🆕 Definir departamento baseado no contexto
  let recommended_dept = 'suporte_n1';
  
  if (context?.isLead && !context?.hasEmail) {
    recommended_dept = 'comercial';
  } else if (context?.isFinancialRequest) {
    recommended_dept = 'financeiro';
  }
  
  return {
    score,
    action,
    reason,
    recommended_dept,  // 🆕 Agora considera contexto
    // ...
  };
}
```

---

### Fluxo Corrigido

```text
[Cliente envia mensagem]
         |
         v
  Identity Wall Check:
    - hasEmail: false
    - isCustomerInDatabase: false
    - contactStatus: "lead"
         |
         v
  IA processa e calcula confiança:
    - score: 22%
    - action: "handoff"
         |
         v
  🆕 NOVA VERIFICAÇÃO:
    - isLeadWithoutEmail? SIM
         |
         v
  🆕 Handoff para COMERCIAL (não Suporte):
    - department: 'f446e202-bdc3-4bb3-aeda-8c0aa04ee53c'
    - ai_mode: 'waiting_human'
         |
         v
  route-conversation:
    - department_id: Comercial
    - Assigned to: Agente Comercial (sales_rep)
         |
         v
  [Lead na fila do Comercial!]
```

---

### Benefícios da Correção

- Leads sem email são direcionados automaticamente para o Comercial
- Clientes identificados continuam sendo roteados para Suporte adequado
- Handoff manual via tool (`request_human_agent`) já tem a trava de identidade
- Mensagem diferenciada para leads (tom mais comercial)
- Logs detalhados para debug

---

### Seção Técnica

**Constante do Departamento Comercial:**
```typescript
const DEPT_COMERCIAL_ID = 'f446e202-bdc3-4bb3-aeda-8c0aa04ee53c';
```

**Verificação de Lead:**
```typescript
const isLeadWithoutEmail = !contactHasEmail && !isCustomerInDatabase && (contact.status === 'lead' || !contact.status);
```

**Pontos de Modificação:**
1. `supabase/functions/ai-autopilot-chat/index.ts` linhas ~4420-4475 (Fallback Detector)
2. `supabase/functions/ai-autopilot-chat/index.ts` linhas ~3180-3250 (Low Confidence Handoff)
3. `src/lib/ai/confidence-score.ts` linhas ~140-200 (Adicionar contexto opcional)

**Deploy necessário:**
- Edge Function `ai-autopilot-chat`

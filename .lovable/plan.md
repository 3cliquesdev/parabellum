
# Plano: Implementar Travessia Automática de Nós Sem Conteúdo

## Diagnóstico Confirmado

### Problema Identificado
O Master Flow tem a seguinte estrutura:
```
start (input) → condition → ask_options/transfer
```

Quando o `process-chat-flow` inicia o Master Flow:
1. Encontra o primeiro nó: `startNode.type = "input"`
2. Vai para linha 951-970: retorna `response: startNode.data?.message || ""`
3. Como nó `input` **não tem** propriedade `message`, retorna `response: ""`
4. No `meta-whatsapp-webhook`, a condição `!flowData.useAI && flowData.response` falha porque `""` é falsy
5. Cai no **CASO 4**: "No active flow → waiting_human (fallback)"

### Log que comprova:
```
[process-chat-flow] 🚀 Iniciando Master Flow - primeiro nó: input start
[meta-whatsapp-webhook] 📋 Flow response: {"useAI":false,"response":"","options":null,...}
[AUTO-DECISION] [WhatsApp Meta] No active flow → waiting_human (fallback)
```

---

## Solução: Travessia Automática de Nós Sem Conteúdo

### Conceito
Após identificar o `startNode`, verificar se ele é um nó "vazio" (sem conteúdo para o usuário):
- Tipos vazios: `input`, `start`
- Tipos que precisam avaliação: `condition`
- Se for vazio: **atravessar** automaticamente para o próximo nó com conteúdo

### Nós que Produzem Conteúdo
| Tipo | Conteúdo |
|------|----------|
| `message` | Texto estático |
| `ask_options` | Texto + opções |
| `ask_name`, `ask_email`, `ask_phone`, `ask_cpf`, `ask_text` | Pergunta |
| `ai_response` | Ativa IA |
| `transfer` | Mensagem + transferência |
| `end` | Fim do fluxo |

### Nós Sem Conteúdo (Atravessar)
| Tipo | Ação |
|------|------|
| `input` / `start` | Encontrar próximo via edges |
| `condition` | Avaliar condição e seguir caminho true/false |

---

## Fluxo Corrigido

```text
Cliente envia "Bom dia" via WhatsApp
         │
         ▼
meta-whatsapp-webhook → process-chat-flow
         │
         ▼
Encontra startNode: "input"
         │
         ▼ [NOVO: Travessia automática]
Atravessa: input → condition
         │
         ▼
Avalia condition (ex: isValidatedCustomer?)
         │
    ┌────┴────┐
    │         │
  true      false
    │         │
    ▼         ▼
ask_options transfer
    │
    ▼
Retorna response: "Olá! Como posso ajudar?\n1-Pedidos\n2-Sistema"
         │
         ▼
meta-whatsapp-webhook recebe response não-vazio
         │
         ▼
Envia via send-meta-whatsapp ✅
```

---

## Alterações Técnicas

### Arquivo: `supabase/functions/process-chat-flow/index.ts`

**Local**: Linhas 879-971 (bloco do Master Flow)

**Substituir** o bloco atual por:

```typescript
// Encontrar primeiro nó (sem edges apontando para ele)
const targetIds = new Set((flowDef.edges || []).map((e: any) => e.target));
const startNode = flowDef.nodes.find((n: any) => !targetIds.has(n.id)) || flowDef.nodes[0];

console.log('[process-chat-flow] 🚀 Iniciando Master Flow - primeiro nó:', startNode.type, startNode.id);

// ============================================================
// 🆕 TRAVESSIA AUTOMÁTICA: Atravessar nós sem conteúdo
// Nós como 'input', 'start' e 'condition' não têm mensagem direta
// Precisamos navegar até encontrar um nó com conteúdo
// ============================================================
const noContentTypes = ['input', 'start'];
let contentNode = startNode;
let traversalCount = 0;
const MAX_TRAVERSAL = 10; // Evitar loop infinito
let collectedData: Record<string, any> = {};

// Buscar dados do contato para avaliar condições
const { data: convData } = await supabaseClient
  .from('conversations')
  .select('contact_id')
  .eq('id', conversationId)
  .maybeSingle();

let contactData: Record<string, any> | null = null;
if (convData?.contact_id) {
  const { data: contact } = await supabaseClient
    .from('contacts')
    .select('*')
    .eq('id', convData.contact_id)
    .maybeSingle();
  contactData = contact;
}

// Função auxiliar para avaliar condição no contexto do fluxo
function evaluateNodeCondition(conditionData: any): boolean {
  if (!conditionData) return true;
  
  const { condition_type, condition_field, condition_value } = conditionData;
  
  // Determinar de onde vem o valor
  let fieldValue: any = null;
  
  // Primeiro tentar dados coletados
  if (collectedData[condition_field]) {
    fieldValue = collectedData[condition_field];
  } 
  // Depois tentar dados do contato
  else if (contactData && condition_field in contactData) {
    fieldValue = contactData[condition_field];
  }
  // Checagem especial para campos comuns
  else if (condition_field === 'is_validated_customer' || condition_field === 'isValidatedCustomer') {
    fieldValue = contactData?.is_validated_customer ?? false;
  }
  else if (condition_field === 'email' && contactData?.email) {
    fieldValue = contactData.email;
  }
  else if (condition_field === 'cpf' && contactData?.cpf) {
    fieldValue = contactData.cpf;
  }
  
  console.log('[process-chat-flow] 🔍 Evaluating condition:', {
    condition_type,
    condition_field,
    condition_value,
    fieldValue: typeof fieldValue === 'string' ? fieldValue?.slice(0, 20) : fieldValue
  });
  
  switch (condition_type) {
    case 'has_data':
    case 'not_empty':
      return !!fieldValue && String(fieldValue).trim().length > 0;
    case 'is_empty':
    case 'no_data':
      return !fieldValue || String(fieldValue).trim().length === 0;
    case 'equals':
      return String(fieldValue).toLowerCase() === String(condition_value || '').toLowerCase();
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(condition_value || '').toLowerCase();
    case 'is_true':
      return fieldValue === true || fieldValue === 'true';
    case 'is_false':
      return fieldValue === false || fieldValue === 'false' || !fieldValue;
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(condition_value || '').toLowerCase());
    default:
      console.log('[process-chat-flow] ⚠️ Unknown condition_type:', condition_type);
      return false;
  }
}

// Loop de travessia: atravessar nós sem conteúdo
while ((noContentTypes.includes(contentNode.type) || contentNode.type === 'condition') && traversalCount < MAX_TRAVERSAL) {
  traversalCount++;
  console.log(`[process-chat-flow] ⏩ Traversing[${traversalCount}]: ${contentNode.type} (${contentNode.id})`);
  
  let path: string | undefined;
  
  // Se é um nó de condição, avaliar para determinar o caminho
  if (contentNode.type === 'condition') {
    const conditionResult = evaluateNodeCondition(contentNode.data);
    path = conditionResult ? 'true' : 'false';
    console.log(`[process-chat-flow] 🔀 Condition evaluated: ${path}`);
  }
  
  const nextNode = findNextNode(flowDef, contentNode, path);
  
  if (!nextNode) {
    console.log('[process-chat-flow] ⚠️ No next node found during traversal');
    break;
  }
  
  contentNode = nextNode;
}

console.log('[process-chat-flow] 📍 Content node reached:', contentNode.type, contentNode.id, `(after ${traversalCount} traversals)`);

// Criar estado do fluxo apontando para o nó com conteúdo
const { data: newState, error: createError } = await supabaseClient
  .from('chat_flow_states')
  .insert({
    conversation_id: conversationId,
    flow_id: masterFlow.id,
    current_node_id: contentNode.id, // 🆕 Salvar o nó com conteúdo, não o input
    collected_data: collectedData,
    status: 'active',
  })
  .select()
  .single();

if (createError) {
  console.error('[process-chat-flow] Error creating master flow state:', createError);
  const aiNode = flowDef?.nodes?.find((n: any) => n.type === 'ai_response');
  return new Response(
    JSON.stringify({
      useAI: true,
      reason: "Error creating master flow state - fallback to AI config",
      masterFlowId: masterFlow.id,
      personaId: aiNode?.data?.persona_id || null,
      kbCategories: aiNode?.data?.kb_categories || null,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log('[process-chat-flow] ✅ Master Flow started:', newState.id, '- content node:', contentNode.type);

// Processar o nó com conteúdo encontrado

// Se é nó de transferência
if (contentNode.type === 'transfer') {
  await supabaseClient
    .from('chat_flow_states')
    .update({ status: 'transferred' })
    .eq('id', newState.id);
  
  return new Response(
    JSON.stringify({
      useAI: false,
      response: replaceVariables(contentNode.data?.message || "Transferindo para um atendente...", collectedData),
      transfer: true,
      transferType: contentNode.data?.transfer_type,
      departmentId: contentNode.data?.department_id,
      flowId: masterFlow.id,
      flowStarted: true,
      isMasterFlow: true,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Se é nó de AI, retornar useAI true com configs
if (contentNode.type === 'ai_response') {
  return new Response(
    JSON.stringify({
      useAI: true,
      aiNodeActive: true,
      nodeId: contentNode.id,
      reason: "Master Flow started with AI node",
      masterFlowId: masterFlow.id,
      masterFlowName: masterFlow.name,
      flowId: masterFlow.id,
      flowStarted: true,
      allowedSources: contentNode.data?.allowed_sources || ['kb', 'crm', 'tracking'],
      responseFormat: 'text_only',
      personaId: contentNode.data?.persona_id || null,
      kbCategories: contentNode.data?.kb_categories || null,
      contextPrompt: contentNode.data?.context_prompt || null,
      fallbackMessage: contentNode.data?.fallback_message || null,
      objective: contentNode.data?.objective || null,
      maxSentences: contentNode.data?.max_sentences ?? 3,
      forbidQuestions: contentNode.data?.forbid_questions ?? true,
      forbidOptions: contentNode.data?.forbid_options ?? true,
      debug: {
        source: 'master_flow',
        startNodeType: startNode.type,
        contentNodeType: contentNode.type,
        traversalCount,
        hasAiNode: true
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Se é nó de fim
if (contentNode.type === 'end') {
  await supabaseClient
    .from('chat_flow_states')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', newState.id);
  
  const endMessage = contentNode.data?.message 
    ? replaceVariables(contentNode.data.message, collectedData)
    : "";
  
  return new Response(
    JSON.stringify({
      useAI: false,
      response: endMessage,
      flowCompleted: true,
      flowId: masterFlow.id,
      isMasterFlow: true,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Se é nó com mensagem (message, ask_options, ask_name, etc)
const contentMessage = replaceVariables(contentNode.data?.message || "", collectedData);
const options = contentNode.type === 'ask_options' 
  ? (contentNode.data?.options || []).map((opt: any) => ({ label: opt.label, value: opt.value, id: opt.id }))
  : null;

return new Response(
  JSON.stringify({
    useAI: false,
    response: contentMessage,
    options,
    flowId: masterFlow.id,
    flowStarted: true,
    isMasterFlow: true,
    debug: {
      source: 'master_flow',
      startNodeType: startNode.type,
      contentNodeType: contentNode.type,
      traversalCount
    }
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

## Resumo das Mudanças

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Nó inicial `input` | Retornava `response: ""` | Atravessa até nó com conteúdo |
| Nó `condition` | Não processado na inicialização | Avaliado e seguido automaticamente |
| Estado do fluxo | Salvava `current_node_id: input` | Salva `current_node_id: contentNode` |
| Dados do contato | Não buscados | Buscados para avaliar condições |
| Proteção loop | Não existia | `MAX_TRAVERSAL = 10` |

---

## Testes Obrigatórios

| Cenário | Resultado Esperado |
|---------|-------------------|
| Master Flow com `input → condition → ask_options` | Retorna mensagem do ask_options |
| Master Flow com `input → ai_response` | Retorna `aiNodeActive: true` |
| Condition `is_validated_customer = true` | Segue caminho `true` |
| Condition `is_validated_customer = false` | Segue caminho `false` (transfer) |
| Loop infinito (proteção) | Para após MAX_TRAVERSAL |
| Cliente novo (sem email) | Segue caminho do fluxo para novos |

---

## Critérios de Aceitação

| Teste | Esperado |
|-------|----------|
| Enviar "Bom dia" no WhatsApp | Receber mensagem do fluxo (não ficar mudo) |
| Logs mostram `⏩ Traversing` | Confirma travessia automática |
| Logs mostram `📍 Content node reached: ask_options` | Confirma nó correto |
| Não vai para `waiting_human` automaticamente | Segue o fluxo normalmente |

---

## Arquivos a Modificar

| Arquivo | Linhas | Ação |
|---------|--------|------|
| `supabase/functions/process-chat-flow/index.ts` | 879-971 | Substituir bloco do Master Flow |


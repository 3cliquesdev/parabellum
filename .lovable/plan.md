
# Plano de Implementação: Fase 1 — IA Útil e Controlada (Anti-Alucinação)

## Resumo Executivo

Esta fase evolui o AIResponseNode para aceitar parâmetros de controle granular, garantindo que a IA responda **apenas** ao que foi autorizado pelo fluxo visual, eliminando alucinações e fugas de comportamento.

---

## Diagnóstico do Estado Atual

| Componente | Status | Observação |
|------------|--------|------------|
| `process-chat-flow` | ✅ Já retorna `aiNodeActive: true` | Regra anti-alucinação básica já existe |
| `FlowContext` interface | ✅ Existe | Falta campos `objective`, `max_sentences`, `forbid_questions`, `forbid_options` |
| `AIResponseNode` | ⚠️ Parcial | Tem `context_prompt`, `allowed_sources`, mas falta controles de comportamento |
| `ai-autopilot-chat` | ⚠️ Prompt extenso | Não usa `flow_context` para restringir comportamento |
| Prompt base | ❌ Não existe | Precisa criar prompt obrigatório anti-alucinação |

---

## Arquitetura da Solução

```text
┌──────────────────────┐          ┌─────────────────────────┐
│  Chat Flow Editor    │          │  AIResponseNode Props   │
│  (React Flow)        │          │  - objective            │
│                      │◄────────►│  - allowed_sources      │
│  AIResponseNode      │          │  - max_sentences        │
│                      │          │  - forbid_questions     │
└──────────────────────┘          │  - forbid_options       │
           │                      │  - context_prompt       │
           │ flow_context         │  - fallback_message     │
           ▼                      └─────────────────────────┘
┌──────────────────────┐
│  process-chat-flow   │
│  (Edge Function)     │
│                      │
│  Retorna:            │
│  - aiNodeActive      │
│  - objective         │
│  - allowedSources    │
│  - maxSentences      │
│  - forbidQuestions   │
│  - forbidOptions     │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐          ┌─────────────────────────┐
│  ai-autopilot-chat   │◄────────►│  PROMPT BASE            │
│  (Edge Function)     │          │  (ANTI-ALUCINAÇÃO)      │
│                      │          │  - Objetivo definido    │
│  Usa flow_context    │          │  - Fontes permitidas    │
│  para restringir     │          │  - Sem perguntas        │
│  comportamento       │          │  - Sem opções           │
└──────────────────────┘          │  - Resposta curta       │
                                  │  - Fallback padrão      │
                                  └─────────────────────────┘
```

---

## Alterações Detalhadas

### 1. Atualizar Interface do AIResponseNode (Frontend)

**Arquivo:** `src/components/chat-flows/nodes/AIResponseNode.tsx`

Adicionar interface com novos campos:

```typescript
interface AIResponseNodeData {
  // ... campos existentes
  objective?: string;              // "Responda dúvidas sobre rastreio"
  allowed_sources: ('kb' | 'conversation_history' | 'crm')[];
  max_sentences?: number;          // 1-5 frases máximo
  forbid_questions?: boolean;      // IA não pode fazer perguntas
  forbid_options?: boolean;        // IA não pode oferecer opções
}
```

### 2. Atualizar Painel de Propriedades (Frontend)

**Arquivo:** `src/components/chat-flows/AIResponsePropertiesPanel.tsx`

Adicionar nova seção "Controles de Comportamento":

- **Objetivo do Nó** (Textarea): "Qual o objetivo da IA neste ponto?"
- **Máximo de Frases** (Slider 1-5): Limitar verbosidade
- **Proibir Perguntas** (Switch): IA não pergunta nada
- **Proibir Opções** (Switch): IA não oferece múltipla escolha

### 3. Atualizar FlowContext Interface (Backend)

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

Expandir interface:

```typescript
interface FlowContext {
  flow_id: string;
  node_id: string;
  node_type: 'ai_response';
  // Campos existentes
  allowed_sources: ('kb' | 'crm' | 'tracking' | 'conversation_history')[];
  response_format: 'text_only';
  personaId?: string;
  kbCategories?: string[];
  contextPrompt?: string;
  fallbackMessage?: string;
  // NOVOS CAMPOS (Fase 1)
  objective?: string;
  maxSentences?: number;
  forbidQuestions?: boolean;
  forbidOptions?: boolean;
}
```

### 4. Atualizar process-chat-flow (Backend)

**Arquivo:** `supabase/functions/process-chat-flow/index.ts`

Passar novos campos quando AIResponseNode é ativado:

```typescript
// Quando nextNode.type === 'ai_response'
return new Response(JSON.stringify({
  useAI: true,
  aiNodeActive: true,
  // ... campos existentes
  // NOVOS CAMPOS
  objective: nextNode.data?.objective || null,
  maxSentences: nextNode.data?.max_sentences || 3,
  forbidQuestions: nextNode.data?.forbid_questions ?? true,
  forbidOptions: nextNode.data?.forbid_options ?? true,
}));
```

### 5. Criar Prompt Base Anti-Alucinação (Backend)

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

Criar função que gera prompt restritivo baseado no `flow_context`:

```typescript
function generateRestrictedPrompt(flowContext: FlowContext): string {
  const maxSentences = flowContext.maxSentences || 3;
  const objective = flowContext.objective || 'Responder a dúvida do cliente';
  
  let restrictions = `
Você é um assistente corporativo.
Responda SOMENTE ao seguinte objetivo: "${objective}"
Use APENAS as fontes permitidas: ${flowContext.allowed_sources.join(', ')}.
Sua resposta deve ter NO MÁXIMO ${maxSentences} frases.
`;

  if (flowContext.forbidQuestions) {
    restrictions += '\nNÃO faça perguntas ao cliente.';
  }
  
  if (flowContext.forbidOptions) {
    restrictions += '\nNÃO ofereça opções ou múltipla escolha.';
  }
  
  restrictions += `
NÃO sugira transferência para humano.
NÃO invente informações.
Se não houver dados suficientes, responda exatamente:
"No momento não tenho essa informação."

A resposta deve ser curta, clara e objetiva.`;

  return restrictions;
}
```

### 6. Injetar Prompt Restritivo na Chamada da IA

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

Modificar a construção do system prompt quando `flow_context` existe:

```typescript
// Se tem flow_context válido, usar prompt restritivo
if (flow_context && flow_context.aiNodeActive) {
  const restrictedPrompt = generateRestrictedPrompt(flow_context);
  
  // Substituir o prompt extenso pelo prompt restritivo
  contextualizedSystemPrompt = `${restrictedPrompt}

${knowledgeContext}

**Contexto do Cliente:**
- Nome: ${contactName}
- Status: ${contactStatus}`;
}
```

### 7. Validação Pós-Resposta (Anti-Escape)

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

Após receber resposta da IA, validar se ela violou o contrato:

```typescript
// Validar resposta quando flow_context ativo
if (flow_context && flow_context.forbidQuestions) {
  const hasQuestion = assistantMessage.includes('?');
  if (hasQuestion) {
    console.log('[ai-autopilot-chat] ⚠️ IA violou contrato: fez pergunta');
    // Usar fallback
    assistantMessage = flow_context.fallbackMessage || 
      'No momento não tenho essa informação.';
  }
}

if (flow_context && flow_context.forbidOptions) {
  const hasOptions = ESCAPE_PATTERNS.some(p => p.test(assistantMessage));
  if (hasOptions) {
    console.log('[ai-autopilot-chat] ⚠️ IA violou contrato: ofereceu opções');
    assistantMessage = flow_context.fallbackMessage || 
      'No momento não tenho essa informação.';
  }
}
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/chat-flows/nodes/AIResponseNode.tsx` | Adicionar novos campos na interface + badges |
| `src/components/chat-flows/AIResponsePropertiesPanel.tsx` | Adicionar seção "Controles de Comportamento" |
| `supabase/functions/process-chat-flow/index.ts` | Passar novos campos no retorno |
| `supabase/functions/ai-autopilot-chat/index.ts` | Criar `generateRestrictedPrompt`, injetar no prompt, validar resposta |
| `supabase/functions/message-listener/index.ts` | Passar novos campos no `flow_context` |

---

## Valores Padrão (Default)

Quando o usuário não configurar explicitamente:

| Campo | Valor Padrão | Justificativa |
|-------|--------------|---------------|
| `objective` | `null` | Usa `context_prompt` existente |
| `allowed_sources` | `['kb', 'crm', 'conversation_history']` | Acesso a todas as fontes |
| `max_sentences` | `3` | Respostas concisas |
| `forbid_questions` | `true` | IA não pergunta por padrão |
| `forbid_options` | `true` | IA não oferece menus por padrão |

---

## Critérios de Aceitação (Fase 1 Concluída)

| Teste | Resultado Esperado |
|-------|-------------------|
| IA responde em AIResponseNode | ✅ Somente quando `aiNodeActive: true` |
| Resposta curta | ✅ Máximo N frases conforme configurado |
| Sem perguntas | ✅ IA não faz perguntas quando `forbid_questions: true` |
| Sem opções | ✅ IA não oferece menus quando `forbid_options: true` |
| Fallback seguro | ✅ "No momento não tenho essa informação." |
| Foco no objetivo | ✅ IA responde apenas sobre o objetivo definido |
| Zero escape | ✅ IA não transfere, não cria ticket, não decide |

---

## Ordem de Implementação

1. **Frontend**: Atualizar `AIResponseNode` e `AIResponsePropertiesPanel`
2. **Backend**: Atualizar `process-chat-flow` para passar novos campos
3. **Backend**: Criar `generateRestrictedPrompt` no `ai-autopilot-chat`
4. **Backend**: Injetar prompt restritivo quando `flow_context` existe
5. **Backend**: Adicionar validação pós-resposta (anti-escape)
6. **Backend**: Atualizar `message-listener` para passar novos campos
7. **Testes**: Verificar comportamento em fluxos reais

---

## Garantias de Segurança

- ✅ IA só roda em `AIResponseNode` ativo
- ✅ IA não decide próximos nós
- ✅ IA não faz perguntas (quando configurado)
- ✅ IA não oferece opções (quando configurado)
- ✅ IA não transfere conversa
- ✅ IA não altera estado
- ✅ Comportamento 100% determinístico


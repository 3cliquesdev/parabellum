
# Plano: Regra de Execução Anti-Alucinação — IA só roda via AIResponseNode

## Resumo Executivo

Este plano implementa uma regra crítica de segurança: **a IA nunca roda diretamente**. Todo processamento deve passar pelo motor de fluxos (`process-chat-flow`), e a IA só responde quando um nó `AIResponseNode` está ativo no fluxo. Isso elimina alucinações causadas por execução livre da IA.

---

## Problema Atual

```text
ATUAL (INCORRETO):
message-listener → ai-autopilot-chat (direto!)
useAutopilotTrigger → ai-autopilot-chat (direto!)

CORRETO:
message-listener → process-chat-flow → (se AIResponseNode) → ai-autopilot-chat
useAutopilotTrigger → process-chat-flow → (se AIResponseNode) → ai-autopilot-chat
```

### Pontos de Chamada Direta a Remover

| Arquivo | Linha | Problema |
|---------|-------|----------|
| `message-listener/index.ts` | 84-105 | Chama `ai-autopilot-chat` direto |
| `useAutopilotTrigger.tsx` | 30-49 | Chama `ai-autopilot-chat` direto |
| `useAutopilotTrigger.tsx` | 147 | Streaming chama `ai-chat-stream` direto |

---

## O Que Será Implementado

### 1. Refatorar message-listener

**Antes:**
```typescript
// Chamar ai-autopilot-chat diretamente
const autopilotResponse = await fetch('ai-autopilot-chat', { ... });
```

**Depois:**
```typescript
// Chamar process-chat-flow SEMPRE
const flowResponse = await fetch('process-chat-flow', { ... });
const flowData = await flowResponse.json();

// Só chamar IA se process-chat-flow retornar useAI: true
if (flowData.useAI && flowData.aiNodeActive) {
  const autopilotResponse = await fetch('ai-autopilot-chat', { 
    body: { 
      ...params,
      flow_context: flowData // Passar contexto do fluxo
    } 
  });
}
```

### 2. Refatorar useAutopilotTrigger (Frontend)

**Antes:**
```typescript
const { data, error } = await supabase.functions.invoke('ai-autopilot-chat', { ... });
```

**Depois:**
```typescript
// Sempre chamar process-chat-flow primeiro
const { data: flowData } = await supabase.functions.invoke('process-chat-flow', { ... });

// Se não há AIResponseNode ativo, NÃO chamar IA
if (!flowData?.useAI) {
  console.log('[useAutopilotTrigger] ⛔ No AIResponseNode active - AI will not run');
  return;
}

// Só então chamar IA (com contexto do fluxo)
const { data, error } = await supabase.functions.invoke('ai-autopilot-chat', {
  body: { ...params, ...flowData }
});
```

### 3. Atualizar process-chat-flow para Flag Explícita

Adicionar campo `aiNodeActive: boolean` na resposta para indicar que a IA está autorizada a rodar.

**Nova resposta quando AIResponseNode está ativo:**
```json
{
  "useAI": true,
  "aiNodeActive": true,
  "flow_id": "uuid",
  "node_id": "uuid",
  "node_type": "ai_response",
  "allowed_sources": ["kb", "crm", "tracking"],
  "response_format": "text_only",
  "personaId": "uuid",
  "kbCategories": ["faq", "produtos"]
}
```

**Nova resposta quando NÃO há AIResponseNode:**
```json
{
  "useAI": false,
  "aiNodeActive": false,
  "reason": "Waiting for user input on AskOptionsNode"
}
```

### 4. Contrato Estrito Fluxo ↔ IA

**INPUT para ai-autopilot-chat (obrigatório quando chamado via fluxo):**
```typescript
interface FlowAIRequest {
  conversationId: string;
  customerMessage: string;
  // 🆕 Campos do contrato
  flow_context?: {
    flow_id: string;
    node_id: string;
    node_type: 'ai_response';
    allowed_sources: ('kb' | 'crm' | 'tracking')[];
    response_format: 'text_only';
    personaId?: string;
    kbCategories?: string[];
  };
}
```

**OUTPUT permitido da IA (restrito):**
```typescript
interface FlowAIResponse {
  text: string; // Apenas texto
  // ❌ NÃO pode: escolher caminho, transferir, perguntar algo novo
}
```

### 5. Validação Anti-Escape no ai-autopilot-chat

Se a IA tentar "escapar" do contrato (transferir quando não deveria, sugerir caminho, etc.), ignorar e chamar `TransferNode`:

```typescript
// Detectar escape attempts
const ESCAPE_PATTERNS = [
  /vou te transferir/i,
  /escolha uma das opções/i,
  /1️⃣|2️⃣|3️⃣/,
  /qual.*prefere/i
];

if (flowContext && ESCAPE_PATTERNS.some(p => p.test(aiResponse))) {
  console.warn('[ai-autopilot-chat] ⚠️ IA tentou escapar do contrato - forçando TransferNode');
  return { forceTransfer: true, reason: 'ai_contract_violation' };
}
```

---

## Detalhes Técnicos

### Arquivos a Modificar

```text
supabase/functions/message-listener/index.ts
├── Remover chamada direta a ai-autopilot-chat (linhas 84-105)
├── Adicionar chamada a process-chat-flow primeiro
└── Só chamar IA se flowData.aiNodeActive === true

supabase/functions/process-chat-flow/index.ts
├── Adicionar campo aiNodeActive nas respostas
├── Documentar contrato de resposta
└── Garantir que useAI: true só retorna com AIResponseNode

src/hooks/useAutopilotTrigger.tsx
├── Trocar chamada direta a ai-autopilot-chat
├── Chamar process-chat-flow primeiro
└── Respeitar flag aiNodeActive

src/hooks/useAIStreamResponse.tsx
├── Mesmo tratamento: process-chat-flow primeiro
└── Só iniciar stream se AIResponseNode ativo

supabase/functions/ai-autopilot-chat/index.ts
├── Validar flow_context quando presente
├── Restringir output para response_format
└── Detectar e bloquear escape patterns
```

### Fluxo de Dados Atualizado

```text
┌──────────────────┐
│ Mensagem Cliente │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ message-listener │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ process-chat-flow  │
│   (OBRIGATÓRIO)    │
└────────┬───────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────────┐
│useAI: │  │useAI: true   │
│false  │  │aiNodeActive: │
└───────┘  │true          │
           └──────┬───────┘
                  │
                  ▼
         ┌─────────────────┐
         │ ai-autopilot-   │
         │ chat (com       │
         │ flow_context)   │
         └─────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Resposta        │
         │ APENAS texto    │
         └─────────────────┘
```

---

## Regras para ConditionNode e AskOptionsNode

### ConditionNode — SEM IA

```typescript
// ✅ CORRETO: Avalia campo salvo
if (collectedData.option_id === "frete") { ... }

// ❌ INCORRETO: IA interpreta
if (IA_entendeu_que === "frete") { ... }
```

### AskOptionsNode — SEM TEXTO LIVRE

```typescript
// ✅ CORRETO: Salva option_id selecionado
collectedData.choice = selectedOption.id; // "opt_123"

// ❌ INCORRETO: Salva texto livre
collectedData.choice = userMessage; // "quero saber do frete"
```

---

## Testes de Validação (Obrigatórios)

### Teste 1 — Pergunta Fora do Fluxo

**Cenário:** Usuário pergunta "Vocês fazem entrega para Marte?"

**Esperado:**
- `process-chat-flow` retorna `{ useAI: false, reason: "No AIResponseNode active" }`
- IA NÃO roda
- Mensagem de fallback: "No momento não tenho essa informação. Vou te encaminhar para um atendente humano."

### Teste 2 — Fluxo sem AIResponseNode

**Cenário:** Fluxo só tem AskOptionsNode → MessageNode → EndNode

**Esperado:**
- `aiNodeActive: false` em todas as etapas
- IA nunca é chamada
- Fluxo espera input válido do usuário

### Teste 3 — Fluxo com AIResponseNode

**Cenário:** Fluxo tem StartNode → AIResponseNode → EndNode

**Esperado:**
- `aiNodeActive: true` quando no AIResponseNode
- IA é chamada COM flow_context
- Resposta é APENAS texto (sem opções, sem transferência)

---

## Rollout Seguro

1. **CRIAR**: Duplicar fluxo existente → `TESTE_ANTI_ALUCINACAO`
2. **IMPLEMENTAR**: Aplicar todas as mudanças acima
3. **TESTAR**: Executar 10 conversas de teste
4. **VALIDAR**: Confirmar que IA só roda com AIResponseNode
5. **DEPLOY**: Mover para produção

---

## Mudanças de Comportamento

| Antes | Depois |
|-------|--------|
| IA roda sempre que ai_mode = autopilot | IA só roda se AIResponseNode ativo |
| message-listener chama IA direta | message-listener chama fluxo primeiro |
| IA pode sugerir opções/transferir | IA só retorna texto |
| Condições usam interpretação da IA | Condições usam dados salvos |

---

## Impacto

- ✅ **Zero alucinação** por IA rodando fora de contexto
- ✅ **Controle total** via editor visual de fluxos
- ✅ **Previsibilidade** — comportamento definido pelo fluxo
- ✅ **Auditabilidade** — cada resposta da IA tem flow_id/node_id

---

## Próximos Passos (Após Aprovação)

1. Refatorar `message-listener` para chamar `process-chat-flow` primeiro
2. Atualizar `process-chat-flow` para retornar `aiNodeActive`
3. Refatorar `useAutopilotTrigger` para respeitar o novo fluxo
4. Implementar validação anti-escape no `ai-autopilot-chat`
5. Adicionar testes de validação
6. Deploy escalonado com fluxo de teste

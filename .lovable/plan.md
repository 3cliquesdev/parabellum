
# Plano: Ajustes de Segurança Anti-Duplicação (A, B, C)

## Resumo Executivo

Este plano implementa 3 camadas de segurança para garantir que quando o Kill Switch está ativo (`ai_global_enabled = false`), não haja mensagens automáticas em nenhuma hipótese:

| Ajuste | Camada | Objetivo |
|--------|--------|----------|
| A | Frontend | Desabilitar auto-send na UI quando `waiting_human` |
| B | Backend | Log único de observabilidade para auditoria |
| C | Testes | Teste canário para prevenção de regressão |

---

## Diagnóstico do Estado Atual

| Componente | Situação | Observação |
|------------|----------|------------|
| ChatWindow | ⚠️ Parcial | Bloqueia composer quando `canShowTakeControl`, mas não verifica `waiting_human` diretamente |
| SuperComposer | ⚠️ Parcial | Aceita `isDisabled`, mas não sabe do ai_mode |
| message-listener | ✅ Bom | Já loga Kill Switch, mas pode melhorar estrutura |
| Testes | ❌ Ausente | Projeto não tem testes configurados |

---

## Ajuste A — Frontend: Bloquear Auto-Send em `waiting_human`

### Problema Identificado
No `ChatWindow.tsx`, a lógica `canShowTakeControl` já bloqueia o composer quando a conversa está em `autopilot` ou `waiting_human`. No entanto, o `SuperComposer` não recebe o estado `ai_mode` diretamente, apenas um `isDisabled` genérico.

Se houver qualquer tentativa de auto-send (por re-render, retry visual, ou hook mal comportado), o frontend não bloqueia explicitamente baseado em `waiting_human`.

### Solução Proposta
Adicionar verificação explícita no `SuperComposer` para bloquear envio quando `aiMode === 'waiting_human'`:

**Arquivo**: `src/components/inbox/SuperComposer.tsx`

**Alterações**:
1. Adicionar prop `aiMode` ao `SuperComposer`
2. Verificar no `handleSend` se `aiMode === 'waiting_human'` e bloquear
3. Adicionar comentário de segurança para documentação

```typescript
// Adicionar à interface
export interface SuperComposerProps {
  conversationId: string;
  isDisabled?: boolean;
  aiMode?: 'autopilot' | 'copilot' | 'disabled' | 'waiting_human' | null;
  // ... outros props existentes
}

// No handleSend, adicionar guard no início
const handleSend = async () => {
  // 🛡️ REGRA DE SEGURANÇA: Bloquear envio automático em waiting_human
  // Isso evita duplicação por re-render ou retry visual
  if (aiMode === 'waiting_human') {
    console.warn('[SuperComposer] ⛔ Bloqueado: aiMode é waiting_human');
    toast({
      title: "Aguardando atendente",
      description: "Você precisa assumir a conversa antes de enviar mensagens.",
      variant: "default",
    });
    return;
  }
  
  // ... resto da função existente
};
```

**Arquivo**: `src/components/ChatWindow.tsx`

**Alteração**: Passar `aiMode` para o `SuperComposer`:

```typescript
<SuperComposer
  conversationId={conversation.id}
  isDisabled={conversation.status === "closed"}
  aiMode={effectiveAIMode}  // 🆕 Adicionar esta prop
  whatsappInstanceId={conversation.whatsapp_instance_id}
  // ... resto dos props
/>
```

### Impacto
- Zero envios automáticos quando conversa está em `waiting_human`
- Mensagem clara para o usuário se tentar enviar
- Não afeta o fluxo normal quando humano já assumiu (copilot)

---

## Ajuste B — Backend: Log Estruturado de Decisão

### Problema Identificado
Atualmente o `message-listener` loga informações espalhadas em múltiplas linhas. Para debugging de incidentes ("o bot respondeu quando não devia"), precisamos de um log único e estruturado que capture toda a decisão.

### Solução Proposta
Adicionar log estruturado único no ponto de decisão principal:

**Arquivo**: `supabase/functions/message-listener/index.ts`

**Local**: Logo após a verificação do Kill Switch (linha ~52)

```typescript
// ============================================================
// 📊 LOG DE DECISÃO UNIFICADO (Observabilidade)
// Este log é a "caixa-preta" para auditoria de incidentes
// ============================================================
console.log('[AUTO-DECISION]', JSON.stringify({
  timestamp: new Date().toISOString(),
  conversation_id: record.conversation_id,
  message_id: record.id,
  ai_global_enabled: aiConfig.ai_global_enabled,
  is_test_mode: isTestMode,
  ai_mode: conversation?.ai_mode,
  assigned_to: conversation?.assigned_to || null,
  decision: !aiConfig.ai_global_enabled && !isTestMode 
    ? 'HUMAN_ONLY' 
    : isTestMode 
      ? 'TEST_MODE_ACTIVE' 
      : 'AI_PROCESSING',
  reason: !aiConfig.ai_global_enabled && !isTestMode
    ? 'kill_switch_active'
    : isTestMode
      ? 'test_mode_bypass'
      : 'normal_flow',
}));
```

### Benefício
Quando alguém reclamar "o bot respondeu quando não devia", basta buscar nos logs:
```
grep "AUTO-DECISION" logs.txt | jq
```

---

## Ajuste C — Teste Canário (Configuração de Testes + Teste)

### Problema Identificado
O projeto não tem testes configurados. Sem teste canário, bugs de duplicação podem reaparecer silenciosamente.

### Solução Proposta

#### Parte 1: Configurar Vitest

**Arquivo**: `vitest.config.ts` (criar)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Arquivo**: `src/test/setup.ts` (criar)

```typescript
import "@testing-library/jest-dom";

// Mock de matchMedia para componentes que usam media queries
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

**Arquivo**: `tsconfig.app.json` (modificar)

Adicionar `"vitest/globals"` ao `compilerOptions.types`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"],
    // ... resto existente
  }
}
```

#### Parte 2: Teste Canário do Kill Switch

**Arquivo**: `src/test/kill-switch-canary.test.ts` (criar)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 🐤 TESTE CANÁRIO: Kill Switch bloqueia todos os envios automáticos
 * 
 * Este teste garante que quando ai_global_enabled = false:
 * 1. Nenhuma mensagem com source 'bot' ou 'ai' é criada
 * 2. ai_mode é alterado para 'waiting_human'
 * 
 * Se este teste falhar, há risco de duplicação de mensagens!
 */
describe("Kill Switch Canary", () => {
  let mockSupabase: any;
  let insertedMessages: any[] = [];

  beforeEach(() => {
    insertedMessages = [];
    
    // Mock do Supabase com tracking de inserts
    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn((data: any) => {
          if (table === 'messages') {
            insertedMessages.push(...(Array.isArray(data) ? data : [data]));
          }
          return { data: null, error: null };
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { 
            ai_mode: 'autopilot', 
            is_test_mode: false,
            assigned_to: null,
          }, 
          error: null 
        }),
        in: vi.fn().mockResolvedValue({
          data: [{ key: 'ai_global_enabled', value: 'false' }],
          error: null,
        }),
      })),
    };
  });

  it("deve bloquear envio de mensagem bot/ai quando kill switch ativo", async () => {
    // Simular processamento do message-listener com Kill Switch ativo
    const record = {
      id: "msg-123",
      conversation_id: "conv-456",
      content: "Olá, preciso de ajuda",
      sender_type: "contact",
    };

    // Verificar que ai_global_enabled = false no mock
    const { data: configs } = await mockSupabase
      .from('system_configurations')
      .select()
      .in('key', ['ai_global_enabled']);
    
    const aiGlobalEnabled = configs?.find(
      (c: any) => c.key === 'ai_global_enabled'
    )?.value !== 'false';

    // ASSERT: Kill Switch está ativo
    expect(aiGlobalEnabled).toBe(false);

    // ASSERT: Nenhuma mensagem automática foi inserida
    const autoMessages = insertedMessages.filter(
      (m) => m.sender_type === 'bot' || m.sender_type === 'ai' || m.is_ai_generated
    );
    expect(autoMessages).toHaveLength(0);
  });

  it("deve permitir envio quando kill switch desativado", async () => {
    // Modificar mock para Kill Switch OFF
    mockSupabase.from = vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn((data: any) => {
        if (table === 'messages') {
          insertedMessages.push(...(Array.isArray(data) ? data : [data]));
        }
        return { data: null, error: null };
      }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { ai_mode: 'autopilot', is_test_mode: false }, 
        error: null 
      }),
      in: vi.fn().mockResolvedValue({
        data: [{ key: 'ai_global_enabled', value: 'true' }], // 🆕 Ativado
        error: null,
      }),
    }));

    // Verificar que ai_global_enabled = true
    const { data: configs } = await mockSupabase
      .from('system_configurations')
      .select()
      .in('key', ['ai_global_enabled']);
    
    const aiGlobalEnabled = configs?.find(
      (c: any) => c.key === 'ai_global_enabled'
    )?.value !== 'false';

    // ASSERT: Kill Switch está desativado
    expect(aiGlobalEnabled).toBe(true);
  });
});
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/inbox/SuperComposer.tsx` | Modificar | Adicionar prop `aiMode` e guard no `handleSend` |
| `src/components/ChatWindow.tsx` | Modificar | Passar `aiMode` para `SuperComposer` |
| `supabase/functions/message-listener/index.ts` | Modificar | Adicionar log estruturado `[AUTO-DECISION]` |
| `vitest.config.ts` | Criar | Configuração do Vitest |
| `src/test/setup.ts` | Criar | Setup de testes com mocks globais |
| `tsconfig.app.json` | Modificar | Adicionar `vitest/globals` aos types |
| `src/test/kill-switch-canary.test.ts` | Criar | Teste canário para Kill Switch |

---

## Dependências a Instalar

O projeto precisa das seguintes devDependencies para testes:

```json
{
  "@testing-library/jest-dom": "^6.6.0",
  "@testing-library/react": "^16.0.0",
  "jsdom": "^20.0.3",
  "vitest": "^3.2.4"
}
```

---

## Ordem de Implementação

1. **Instalar dependências de teste** (devDependencies)
2. **Configurar Vitest** (vitest.config.ts + src/test/setup.ts)
3. **Atualizar tsconfig.app.json** (adicionar vitest/globals)
4. **Ajuste A**: Modificar SuperComposer + ChatWindow
5. **Ajuste B**: Adicionar log estruturado no message-listener
6. **Ajuste C**: Criar teste canário
7. **Deploy**: Publicar edge functions atualizadas
8. **Validação**: Rodar testes + teste manual

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| SuperComposer com `aiMode='waiting_human'` | ✅ Toast "Aguardando atendente" + não envia |
| SuperComposer com `aiMode='copilot'` | ✅ Envia normalmente |
| Log `[AUTO-DECISION]` no message-listener | ✅ JSON estruturado com todos os campos |
| `npm run test` | ✅ Teste canário passa |
| Kill Switch OFF + mensagem cliente | ✅ Zero mensagens bot/ai |

---

## Seção Técnica

### Interface Atualizada do SuperComposer

```typescript
export interface SuperComposerProps {
  conversationId: string;
  isDisabled?: boolean;
  aiMode?: 'autopilot' | 'copilot' | 'disabled' | 'waiting_human' | null;
  whatsappInstanceId?: string | null;
  whatsappMetaInstanceId?: string | null;
  whatsappProvider?: string | null;
  contactPhone?: string | null;
}
```

### Estrutura do Log AUTO-DECISION

```typescript
interface AutoDecisionLog {
  timestamp: string;
  conversation_id: string;
  message_id: string;
  ai_global_enabled: boolean;
  is_test_mode: boolean;
  ai_mode: string | null;
  assigned_to: string | null;
  decision: 'HUMAN_ONLY' | 'TEST_MODE_ACTIVE' | 'AI_PROCESSING';
  reason: string;
}
```

### Script de Teste

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Impacto e Prioridade

| Ajuste | Esforço | Impacto | Prioridade |
|--------|---------|---------|------------|
| A (Frontend guard) | Baixo | Alta (previne duplicação) | P1 |
| B (Log estruturado) | Baixo | Média (observabilidade) | P2 |
| C (Teste canário) | Médio | Alta (prevenção de regressão) | P1 |

---

## Nota Importante

Estes ajustes são **camadas de defesa complementares**:

1. **Backend já bloqueia** (message-listener, process-chat-flow)
2. **Frontend agora também bloqueia** (SuperComposer guard)
3. **Log permite auditoria** (AUTO-DECISION)
4. **Teste previne regressão** (canary test)

O sistema ficará com **defesa em profundidade** contra duplicação de mensagens.

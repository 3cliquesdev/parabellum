

## Plano de Correção: Robô Reassumindo Conversas Indevidamente

### Diagnóstico Completo

Após análise detalhada do código, identifiquei **4 cenários** onde a IA pode reassumir conversas que já foram assumidas por atendentes:

---

### Cenário 1: Trigger SQL `redistribute_on_agent_offline`

**Localização:** `supabase/migrations/20260126144220_5b9ce005-a3ac-4162-a5bc-18b91482a057.sql`

**Problema:** O trigger devolve conversas para `ai_mode = 'autopilot'` quando agente fica offline, mas não verifica se conversa está em modo `copilot` (assumida manualmente).

**Evidência no código (linhas 14-26):**
```sql
IF OLD.availability_status = 'online' 
   AND NEW.availability_status != 'online' 
   AND NEW.manual_offline = true
THEN
  UPDATE conversations
  SET 
    assigned_to = NULL,
    previous_agent_id = OLD.id,
    ai_mode = 'autopilot'  -- ❌ SOBRESCREVE MESMO COPILOT!
  WHERE 
    assigned_to = OLD.id 
    AND status = 'open';
```

**Impacto:** ALTO - Quando atendente fica offline (mesmo brevemente por reconexão), todas as suas conversas voltam para a IA.

---

### Cenário 2: `redistribute-after-hours` Edge Function

**Localização:** `supabase/functions/redistribute-after-hours/index.ts` linhas 104-113

**Problema:** Função executada por cron job fora do horário comercial que força todas as conversas atribuídas para `ai_mode = 'autopilot'`, sem verificar o modo atual.

**Evidência no código:**
```typescript
// Linha 111: Força autopilot sem verificar ai_mode atual
.update({
  previous_agent_id: conv.assigned_to,
  assigned_to: null,
  ai_mode: 'autopilot' // ❌ SOBRESCREVE MESMO SE ATENDENTE ASSUMIU
})
```

**Impacto:** MÉDIO - Afeta apenas fora do horário comercial, mas pode causar confusão.

---

### Cenário 3: `go-offline-manual` Edge Function

**Localização:** `supabase/functions/go-offline-manual/index.ts` linhas 160-172

**Problema:** Quando nenhum agente online está disponível para transferência, a função força conversas para `ai_mode = 'autopilot'`.

**Evidência no código:**
```typescript
// Linha 168: Força autopilot quando não há agentes
.update({ 
  status: "pending",
  assigned_to: null,
  previous_agent_id: agentId,
  ai_mode: "autopilot", // ❌ SOBRESCREVE MESMO COPILOT
})
```

**Impacto:** ALTO - Acontece sempre que agente vai offline manualmente sem outros online.

---

### Cenário 4: Hook `useAutopilotTrigger` com Cache Desatualizado

**Localização:** `src/hooks/useAutopilotTrigger.tsx` linhas 79-103

**Problema:** O cache do `ai_mode` tem TTL de 1 minuto. Se atendente assumir durante esse período, o hook ainda pode disparar `ai-autopilot-chat` com o valor antigo do cache.

**Evidência no código:**
```typescript
// Linha 17: Cache de 1 minuto pode estar desatualizado
const AI_MODE_CACHE_TTL = 60000; // 1 minuto de cache

// Linha 82-84: Usa cache mesmo que atendente tenha assumido
if (aiModeCache.current && (now - aiModeCache.current.fetchedAt) < AI_MODE_CACHE_TTL) {
  aiMode = aiModeCache.current.mode; // ❌ PODE SER VALOR ANTIGO
}
```

**Impacto:** BAIXO - O `ai-autopilot-chat` tem verificação própria (linha 599), mas gera logs confusos.

---

### Solução Proposta

#### 1. Corrigir Trigger SQL `redistribute_on_agent_offline`

Adicionar verificação para NÃO redistribuir conversas em modo `copilot` (assumidas manualmente):

```sql
CREATE OR REPLACE FUNCTION redistribute_on_agent_offline()
RETURNS TRIGGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  IF OLD.availability_status = 'online' 
     AND NEW.availability_status != 'online' 
     AND NEW.manual_offline = true
  THEN
    -- 🔧 CORREÇÃO: Só redistribuir conversas em autopilot ou waiting_human
    -- Conversas em 'copilot' foram assumidas MANUALMENTE pelo atendente
    -- e devem ser mantidas para transferência explícita
    UPDATE conversations
    SET 
      assigned_to = NULL,
      previous_agent_id = OLD.id,
      ai_mode = 'autopilot'
    WHERE 
      assigned_to = OLD.id 
      AND status = 'open'
      AND ai_mode NOT IN ('copilot', 'disabled'); -- 🆕 PROTEÇÃO
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    IF affected_count > 0 THEN
      RAISE NOTICE 'Redistributed % conversations from agent % (preserved copilot)', affected_count, OLD.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

#### 2. Corrigir `redistribute-after-hours`

Adicionar verificação para preservar conversas em modo `copilot`:

```typescript
// Linha 78-82: Adicionar filtro de ai_mode
const { data: activeConversations } = await supabaseClient
  .from('conversations')
  .select('id, assigned_to, ai_mode, contact_id')
  .in('status', ['open', 'pending'])
  .not('assigned_to', 'is', null)
  .neq('ai_mode', 'copilot')      // 🆕 NÃO REDISTRIBUIR COPILOT
  .neq('ai_mode', 'disabled');    // 🆕 NÃO REDISTRIBUIR DISABLED
```

#### 3. Corrigir `go-offline-manual`

Preservar conversas em modo `copilot` para transferência manual:

```typescript
// Antes de linha 160: Verificar ai_mode da conversa
const { data: convDetails } = await supabaseAdmin
  .from("conversations")
  .select("id, ai_mode")
  .eq("id", conv.id)
  .single();

// Se está em copilot, não devolver para IA - forçar transfer para outro agente
if (convDetails?.ai_mode === 'copilot') {
  // Manter na fila humana ao invés de devolver para IA
  await supabaseAdmin
    .from("conversations")
    .update({ 
      status: "pending",
      assigned_to: null,
      previous_agent_id: agentId,
      ai_mode: "waiting_human", // 🆕 MANTER NA FILA HUMANA
    })
    .eq("id", conv.id);
} else {
  // Fluxo normal para conversas autopilot/waiting_human
  // ... código existente
}
```

#### 4. Reduzir Cache TTL do `useAutopilotTrigger`

Reduzir o tempo de cache para evitar valores desatualizados:

```typescript
// Linha 17: Reduzir de 60s para 10s
const AI_MODE_CACHE_TTL = 10000; // 10 segundos de cache (era 60s)
```

Ou invalidar cache quando realtime detectar mudança de `ai_mode`:

```typescript
// Adicionar listener para mudanças na conversa
const convChannel = supabase
  .channel(`conv-mode-${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'conversations',
      filter: `id=eq.${conversationId}`
    },
    (payload) => {
      // Invalidar cache quando ai_mode mudar
      if (payload.new.ai_mode !== aiModeCache.current?.mode) {
        aiModeCache.current = { mode: payload.new.ai_mode, fetchedAt: Date.now() };
      }
    }
  )
  .subscribe();
```

---

### Arquivos a Modificar

| Arquivo | Alteracao | Prioridade |
|---------|-----------|------------|
| Nova migration SQL | Corrigir trigger `redistribute_on_agent_offline` | Alta |
| `supabase/functions/redistribute-after-hours/index.ts` | Filtrar conversas em `copilot` | Alta |
| `supabase/functions/go-offline-manual/index.ts` | Preservar `copilot` para fila humana | Alta |
| `src/hooks/useAutopilotTrigger.tsx` | Reduzir cache TTL ou adicionar invalidação | Baixa |

---

### Beneficios da Correção

- Atendente assume conversa e ela PERMANECE com ele
- Robô só reassume conversas que estavam em `autopilot` ou `waiting_human`
- Conversas em `copilot` exigem transferência manual explícita
- Menos confusão para atendentes e clientes

---

### Secao Tecnica

**Codigo principal da correção - Migration SQL:**

```sql
-- Nova migration: Corrigir redistribuição para preservar conversas em copilot

CREATE OR REPLACE FUNCTION redistribute_on_agent_offline()
RETURNS TRIGGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  IF OLD.availability_status = 'online' 
     AND NEW.availability_status != 'online' 
     AND NEW.manual_offline = true
  THEN
    -- Só redistribuir conversas NÃO assumidas manualmente
    UPDATE conversations
    SET 
      assigned_to = NULL,
      previous_agent_id = OLD.id,
      ai_mode = 'autopilot'
    WHERE 
      assigned_to = OLD.id 
      AND status = 'open'
      AND ai_mode NOT IN ('copilot', 'disabled');
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    -- Conversas em copilot: mover para waiting_human (fila humana)
    UPDATE conversations
    SET 
      assigned_to = NULL,
      previous_agent_id = OLD.id,
      ai_mode = 'waiting_human'
    WHERE 
      assigned_to = OLD.id 
      AND status = 'open'
      AND ai_mode = 'copilot';
    
    IF affected_count > 0 THEN
      RAISE NOTICE 'Redistributed conversations from agent %, preserved copilot for human queue', OLD.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Codigo para edge functions:**

```typescript
// redistribute-after-hours - Adicionar filtro
.neq('ai_mode', 'copilot')
.neq('ai_mode', 'disabled')

// go-offline-manual - Condicional para copilot
if (convDetails?.ai_mode === 'copilot') {
  ai_mode = "waiting_human"; // Manter na fila humana
} else {
  ai_mode = "autopilot"; // Devolver para IA
}
```



# Plano: Upgrade Enterprise no Sistema de Distribuição (D1 → D4)

## Visão Geral

Vamos implementar um sistema de distribuição **robusto e à prova de falhas** com trigger no banco, logs de auditoria, e gestão de capacidade por agente.

---

## D1) Padronizar Estado de Fila Humana

### Estado Atual
- `ai_mode` enum: `autopilot`, `copilot`, `disabled`, `waiting_human` ✅
- `assigned_to`: UUID do agente (NULL = não atribuído) ✅
- `department`: UUID do departamento ✅
- `status`: `open`, `pending`, `closed` ✅

### Nova Regra de Ouro (Contrato)
```text
SE ai_mode = 'waiting_human' 
   AND assigned_to IS NULL 
   AND department IS NOT NULL 
   AND status = 'open'
→ DISPARAR DISTRIBUIÇÃO
```

### Alterações no Schema
Adicionar coluna para controle de tentativas:

```sql
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS dispatch_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dispatch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'pending'
    CHECK (dispatch_status IN ('pending', 'in_progress', 'assigned', 'escalated', 'manual_only'));
```

---

## D2) Trigger de Distribuição no Banco (Opção A - Recomendada)

### Criar Tabela de Jobs
```sql
CREATE TABLE IF NOT EXISTS conversation_dispatch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'escalated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id)
);

CREATE INDEX idx_dispatch_jobs_pending ON conversation_dispatch_jobs(status, next_attempt_at) 
  WHERE status IN ('pending', 'processing');
```

### Trigger AFTER UPDATE
```sql
CREATE OR REPLACE FUNCTION trigger_dispatch_on_waiting_human()
RETURNS TRIGGER AS $$
BEGIN
  -- Só dispara quando transiciona para waiting_human E não tem agente
  IF NEW.ai_mode = 'waiting_human' 
     AND NEW.assigned_to IS NULL 
     AND NEW.department IS NOT NULL
     AND NEW.status = 'open'
     AND (OLD.ai_mode IS DISTINCT FROM 'waiting_human' OR OLD.assigned_to IS NOT NULL)
  THEN
    INSERT INTO conversation_dispatch_jobs (conversation_id, department_id, priority)
    VALUES (NEW.id, NEW.department, 1)
    ON CONFLICT (conversation_id) 
    DO UPDATE SET 
      status = 'pending',
      attempts = 0,
      next_attempt_at = now(),
      updated_at = now()
    WHERE conversation_dispatch_jobs.status != 'completed';
    
    RAISE LOG '[dispatch-trigger] Job created for conversation %', NEW.id;
  END IF;
  
  -- Se foi atribuído, marcar job como completo
  IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL THEN
    UPDATE conversation_dispatch_jobs 
    SET status = 'completed', updated_at = now()
    WHERE conversation_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversation_dispatch ON conversations;
CREATE TRIGGER trigger_conversation_dispatch
  AFTER UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dispatch_on_waiting_human();
```

---

## D3) Motor de Distribuição Enterprise

### Nova Edge Function: `dispatch-conversations`

```typescript
// Critérios de elegibilidade do agente:
// 1. availability_status = 'online'
// 2. Pertence ao department_id da conversa
// 3. active_chats < max_concurrent_chats (via team_settings)
// 4. Não está em vacation/blocked

// Algoritmo: Round-Robin com Least-Loaded
// 1. Buscar todos agentes elegíveis
// 2. Ordenar por: active_chats ASC, last_assigned_at ASC
// 3. Tentar atribuir com lock condicional
```

### Validação de Lock (Anti-Duplicação)
```sql
-- Atribuição atômica com verificação
UPDATE conversations 
SET assigned_to = :agent_id, 
    ai_mode = 'copilot',
    last_message_at = now()
WHERE id = :conversation_id 
  AND assigned_to IS NULL
RETURNING id;

-- Se 0 rows = já foi atribuído por outro processo
```

### Capacidade por Agente
Usar `team_settings.max_concurrent_chats` (já existe na tabela):
```sql
SELECT p.id, p.full_name, 
       COALESCE(ts.max_concurrent_chats, 10) as max_chats,
       COUNT(c.id) as active_chats
FROM profiles p
LEFT JOIN team_members tm ON tm.user_id = p.id
LEFT JOIN team_settings ts ON ts.team_id = tm.team_id
LEFT JOIN conversations c ON c.assigned_to = p.id AND c.status = 'open'
WHERE p.availability_status = 'online'
  AND p.department = :department_id
  AND p.is_blocked = false
GROUP BY p.id, p.full_name, ts.max_concurrent_chats
HAVING COUNT(c.id) < COALESCE(ts.max_concurrent_chats, 10)
ORDER BY COUNT(c.id) ASC, p.last_status_change ASC
LIMIT 1;
```

---

## D4) Fallbacks + Monitoramento

### Tabela de Logs de Distribuição
```sql
CREATE TABLE IF NOT EXISTS conversation_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  department_id UUID REFERENCES departments(id),
  assigned_to UUID REFERENCES profiles(id),
  algorithm TEXT NOT NULL,
  reason TEXT NOT NULL,
  candidates_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assignment_logs_conv ON conversation_assignment_logs(conversation_id);
CREATE INDEX idx_assignment_logs_created ON conversation_assignment_logs(created_at DESC);
```

### Escalonamento Automático (TTL)
```sql
-- Cron job a cada 1 minuto
UPDATE conversation_dispatch_jobs
SET 
  attempts = attempts + 1,
  next_attempt_at = CASE 
    WHEN attempts = 1 THEN now() + interval '30 seconds'
    WHEN attempts = 2 THEN now() + interval '1 minute'
    WHEN attempts = 3 THEN now() + interval '2 minutes'
    ELSE now() + interval '5 minutes'
  END,
  status = CASE 
    WHEN attempts >= max_attempts THEN 'escalated'
    ELSE 'pending'
  END,
  updated_at = now()
WHERE status = 'pending'
  AND next_attempt_at <= now();
```

### Alerta para Supervisão
Quando `status = 'escalated'`, inserir alerta:
```sql
INSERT INTO admin_alerts (type, title, description, severity, metadata)
SELECT 
  'conversation_stuck',
  'Conversa não atribuída há mais de 5 minutos',
  'Departamento: ' || d.name,
  'high',
  jsonb_build_object(
    'conversation_id', cdj.conversation_id,
    'department_id', cdj.department_id,
    'attempts', cdj.attempts
  )
FROM conversation_dispatch_jobs cdj
JOIN departments d ON d.id = cdj.department_id
WHERE cdj.status = 'escalated'
  AND NOT EXISTS (
    SELECT 1 FROM admin_alerts aa 
    WHERE aa.metadata->>'conversation_id' = cdj.conversation_id::text
      AND aa.created_at > now() - interval '30 minutes'
  );
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| **Migration SQL** | Criar `conversation_dispatch_jobs`, `conversation_assignment_logs`, trigger |
| `supabase/functions/dispatch-conversations/index.ts` | **NOVA** - Motor de distribuição enterprise |
| `supabase/functions/route-conversation/index.ts` | Simplificar - delegar para dispatcher |
| `supabase/functions/cron-process-queue/index.ts` | Adicionar processamento de dispatch jobs |
| `src/hooks/useAdminAlerts.tsx` | **NOVA** - Hook para alertas de escalação |

---

## Fluxo Corrigido

```text
1. Fluxo/IA define: ai_mode='waiting_human' + department_id
                    │
                    ▼
2. Trigger AFTER UPDATE detecta transição
   → Cria job em conversation_dispatch_jobs
                    │
                    ▼
3. CRON (cada 30s) processa jobs pendentes
   → Busca agentes elegíveis (online + capacity)
   → Round-robin least-loaded
   → UPDATE atômico com lock
                    │
           ┌───────┴───────┐
           │               │
      Sucesso          Falha
           │               │
           ▼               ▼
    Marca completed    Incrementa attempts
    Log em audit       Reagenda próxima tentativa
                           │
                           ▼ (após 5 tentativas)
                      Status = 'escalated'
                      Alerta para supervisão
```

---

## Critérios de Aceitação

| Cenário | Resultado Esperado |
|---------|-------------------|
| IA desativada + cliente manda mensagem | Conversa vai para `waiting_human` → job criado → atribuída em < 5s |
| Dept correto, agente online com capacity | Atribuição imediata via least-loaded |
| Nenhum agente disponível | Job permanece pending, retenta em 30s/1m/2m, escala após 5min |
| Dois processos tentam atribuir | Apenas 1 sucede (UPDATE com WHERE assigned_to IS NULL) |
| Kill switch desligado | Distribuição humana funciona independente da IA |

---

## Detalhes Técnicos

### Estrutura da Edge Function `dispatch-conversations`

```typescript
// 1. Buscar jobs pendentes (LIMIT 50)
// 2. Para cada job:
//    a. Verificar se conversa ainda precisa (ai_mode, assigned_to)
//    b. Buscar agentes elegíveis com capacity
//    c. Aplicar round-robin least-loaded
//    d. UPDATE atômico com lock
//    e. Registrar log de auditoria
//    f. Marcar job como completed/failed
// 3. Retornar estatísticas
```

### Integração com CRON Existente

Adicionar chamada no `cron-process-queue` para processar dispatch jobs a cada execução.


# Plano: Upgrade Enterprise D2-D4 - Correções Críticas

## Problemas Identificados

### 1. Trigger NÃO dispara em todos os cenários
**Problema**: O trigger atual exige "transição" para `waiting_human`, mas conversas podem:
- Nascer já em `waiting_human` (via webhook) → INSERT trigger atual não dispara se OLD não existe
- Ser atualizadas múltiplas vezes sem mudar `ai_mode`

**Solução**: Mudar a lógica para verificar o **estado atual** em vez de transição

### 2. Conversas Existentes Sem Job
**Problema**: Existem 5+ conversas em `waiting_human` sem `assigned_to` mas sem jobs criados
```
947e77f6-fd7c-42d3-abe4-6b010ff7a246 → Comercial, waiting_human, sem agente
2921ce0a-bd8a-4cdf-90b2-8101ee561393 → Comercial, waiting_human, sem agente
```

**Solução**: Criar job de "recuperação" que detecta conversas órfãs

### 3. Elegibilidade de Agente - Departamento Comercial Vazio
**Problema**: Nenhum agente elegível no Comercial porque:
- Thaynara está `busy` (não `online`)
- Outros estão `offline` ou com role `user` (não elegível)

**Solução**: 
- O sistema está correto em não atribuir (nenhum elegível)
- O job ficará em retry até um agente ficar online
- Após 5 tentativas → `escalated` → alerta para admin

### 4. Lock de Processamento
**Problema**: Sem lock atômico ao pegar job, dois workers podem processar o mesmo

**Solução**: UPDATE com RETURNING para garantir lock exclusivo

### 5. Contagem de Capacidade
**Problema**: Conta `status='open'` mas deveria contar apenas conversas em "carga humana"

**Solução**: Ajustar para `ai_mode IN ('copilot', 'disabled')` E `status IN ('open', 'pending')`

### 6. ai_mode = 'copilot' na Atribuição
**Problema**: Mudar para `copilot` automaticamente pode interferir em filtros da UI

**Solução**: Manter `waiting_human` ou fazer configurável via setting

---

## Alterações Propostas

### D2.1 - Trigger Enterprise (INSERT + UPDATE)

```sql
-- Função única para INSERT e UPDATE
CREATE OR REPLACE FUNCTION trigger_dispatch_on_waiting_human()
RETURNS TRIGGER AS $$
BEGIN
  -- Regra: "Se ESTÁ em waiting_human, sem agente, com dept, open → garante job"
  IF NEW.ai_mode = 'waiting_human' 
     AND NEW.assigned_to IS NULL 
     AND NEW.department IS NOT NULL
     AND NEW.status = 'open'
  THEN
    INSERT INTO conversation_dispatch_jobs (conversation_id, department_id, priority)
    VALUES (NEW.id, NEW.department, 1)
    ON CONFLICT (conversation_id) 
    DO UPDATE SET 
      status = CASE 
        WHEN conversation_dispatch_jobs.status = 'completed' THEN conversation_dispatch_jobs.status
        ELSE 'pending'
      END,
      next_attempt_at = CASE 
        WHEN conversation_dispatch_jobs.status != 'completed' THEN now()
        ELSE conversation_dispatch_jobs.next_attempt_at
      END,
      updated_at = now();
    
    NEW.dispatch_status := 'pending';
  END IF;
  
  -- Marcar como completo quando atribuído
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    UPDATE conversation_dispatch_jobs 
    SET status = 'completed', updated_at = now()
    WHERE conversation_id = NEW.id AND status != 'completed';
    
    NEW.dispatch_status := 'assigned';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER ÚNICO para INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_conversation_dispatch ON conversations;
DROP TRIGGER IF EXISTS trigger_conversation_dispatch_insert ON conversations;

CREATE TRIGGER trigger_conversation_dispatch
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dispatch_on_waiting_human();
```

### D2.2 - Job de Recuperação (Conversas Órfãs)

```sql
-- Query para criar jobs para conversas esquecidas
INSERT INTO conversation_dispatch_jobs (conversation_id, department_id, priority)
SELECT c.id, c.department, 0
FROM conversations c
WHERE c.ai_mode = 'waiting_human'
  AND c.assigned_to IS NULL
  AND c.department IS NOT NULL
  AND c.status = 'open'
  AND NOT EXISTS (
    SELECT 1 FROM conversation_dispatch_jobs cdj 
    WHERE cdj.conversation_id = c.id 
      AND cdj.status IN ('pending', 'processing')
  )
ON CONFLICT (conversation_id) DO NOTHING;
```

### D3.1 - Lock Atômico no Dispatcher

```typescript
// Pegar job com lock exclusivo
const { data: lockedJob, error: lockError } = await supabase
  .from('conversation_dispatch_jobs')
  .update({ 
    status: 'processing', 
    updated_at: new Date().toISOString() 
  })
  .eq('id', job.id)
  .eq('status', 'pending')  // Só se ainda for pending
  .select('*')
  .maybeSingle();

if (!lockedJob) {
  // Outro worker já pegou - pular
  continue;
}
```

### D3.2 - Contagem de Capacidade Correta

```typescript
// Contar apenas conversas em "carga humana"
const { data: activeConvs } = await supabase
  .from('conversations')
  .select('assigned_to')
  .in('ai_mode', ['copilot', 'disabled'])  // Carga humana
  .in('status', ['open', 'pending'])        // Não fechadas
  .in('assigned_to', profiles.map(p => p.id));
```

### D3.3 - Não Mudar ai_mode Automaticamente

```typescript
// Na atribuição, manter waiting_human ou usar config
const { data: updateResult } = await supabase
  .from('conversations')
  .update({
    assigned_to: eligibleAgent.id,
    // ai_mode: Não muda - deixa o agente decidir via UI
    dispatch_status: 'assigned',
    last_dispatch_at: new Date().toISOString(),
  })
  .eq('id', job.conversation_id)
  .is('assigned_to', null);
```

### D4.1 - Status `manual_only` para Departamentos Sem Agentes

```typescript
// Se não há agentes elegíveis E departamento não tem nenhum agente configurado
if (!eligibleAgent) {
  // Verificar se o departamento tem ALGUM agente (offline ou online)
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('department', departmentId)
    .in('id', eligibleUserIds);  // Com roles elegíveis
  
  if (count === 0) {
    // Departamento não tem agentes configurados → manual_only
    await supabase.from('conversations').update({
      dispatch_status: 'manual_only'
    }).eq('id', job.conversation_id);
    
    await markJobComplete(supabase, job.id, 'no_agents_configured');
    continue;
  }
  
  // Tem agentes mas nenhum disponível → retry
  await handleJobFailure(supabase, job, 'no_agents_available');
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Nova Migration SQL** | Trigger unificado + query de recuperação |
| `supabase/functions/dispatch-conversations/index.ts` | Lock atômico, contagem correta, não mudar ai_mode |
| `supabase/migrations/...dispatch...sql` | Atualizar check constraint para incluir `manual_only` |

---

## Fluxo Corrigido

```
Conversa entra/atualiza com:
  ai_mode = 'waiting_human'
  assigned_to = NULL
  department = UUID
  status = 'open'
         │
         ▼
TRIGGER (INSERT OU UPDATE):
  Estado atual exige distribuição?
  → SIM: UPSERT job com status='pending'
         │
         ▼
CRON (cada 30-60s):
  1. Buscar jobs pending com next_attempt_at <= now()
  2. Para cada job:
     a. UPDATE SET status='processing' WHERE status='pending' RETURNING *
        → Se 0 rows: outro worker pegou, skip
     b. Verificar conversa ainda precisa
     c. Buscar agentes elegíveis:
        - online (não busy, não offline)
        - no departamento (ou parent)
        - com capacity (copilot+disabled conversas < max)
        - com role elegível
     d. Se encontrou → UPDATE atômico com lock
     e. Se não encontrou → retry ou manual_only
         │
         ▼
Conversa atribuída → dispatch_status = 'assigned'
Conversa sem agentes → dispatch_status = 'manual_only' ou retry
```

---

## Validação Imediata

Após implementar, executar a query de recuperação para criar jobs para as conversas que estão travadas:

```sql
-- Criar jobs para conversas órfãs
INSERT INTO conversation_dispatch_jobs (conversation_id, department_id, priority)
SELECT c.id, c.department, 0
FROM conversations c
WHERE c.ai_mode = 'waiting_human'
  AND c.assigned_to IS NULL
  AND c.department IS NOT NULL
  AND c.status = 'open'
  AND NOT EXISTS (
    SELECT 1 FROM conversation_dispatch_jobs cdj 
    WHERE cdj.conversation_id = c.id 
      AND cdj.status IN ('pending', 'processing')
  )
ON CONFLICT (conversation_id) DO NOTHING;
```

---

## Resumo das Correções

| Problema | Correção |
|----------|----------|
| Trigger só UPDATE | Trigger único INSERT OR UPDATE |
| Verifica transição | Verifica estado atual |
| Sem lock | Lock atômico com UPDATE+SELECT |
| Conta todas open | Conta apenas copilot+disabled |
| Muda ai_mode | Mantém waiting_human |
| Retenta infinito | manual_only se dept vazio |
| Conversas órfãs | Query de recuperação |

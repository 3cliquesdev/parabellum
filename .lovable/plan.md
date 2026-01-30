

# Plano: Corrigir Conversas Não Chegando para o Oliveira

## Diagnóstico Confirmado

O Oliveira está **online** no departamento **Suporte de Pedidos**, mas não recebe conversas porque:

| Conversa | ai_mode | assigned_to | dispatch_status | handoff_executed_at |
|----------|---------|-------------|-----------------|---------------------|
| faebc30d | **autopilot** | NULL | assigned | NULL |
| b4126696 | **autopilot** | NULL | assigned | NULL |
| 07769a75 | **autopilot** | NULL | assigned | NULL |
| c641d41b | **autopilot** | NULL | assigned | 2026-01-29 |

O dispatcher (linha 121) **só processa** conversas em `ai_mode = 'waiting_human'`. Todas estão em `autopilot`, então são ignoradas.

## Causa Raiz (Bug no meta-whatsapp-webhook)

Quando o fluxo retorna uma transferência, o webhook:

1. **Atualiza** `ai_mode = 'waiting_human'` e `department`
2. **Mas continua** no loop e pode cair no "CASO 4" (fallback) que reverte para `waiting_human` OU a mensagem não termina com `continue` corretamente

Analisando o código do webhook (linhas 600-672):

```text
// CASO 2: Fluxo retornou resposta estática
if (!flowData.useAI && flowData.response) {
  ... enviar mensagem ...
  
  // EXECUTAR TRANSFERÊNCIA
  if (flowData.transfer) {
    await supabase.update({ ai_mode: 'waiting_human', handoff_executed_at: ... })
  }
  continue; // Deveria sair aqui
}

// CASO 4: Fallback
await supabase.update({ ai_mode: 'waiting_human' })
```

O problema é que a conversa é criada inicialmente com `ai_mode: 'autopilot'` e se o fluxo falhar em algum ponto ou a transferência não for processada corretamente, ela permanece em autopilot.

## Solução em 2 Partes

### Parte 1: Correção Imediata de Dados

Mover as 4 conversas para `waiting_human` para o Oliveira receber agora:

```sql
UPDATE conversations
SET 
  ai_mode = 'waiting_human',
  dispatch_status = 'pending'
WHERE 
  id IN (
    'faebc30d-7e61-4fd8-905f-bc2952553145',
    'b4126696-6b50-4b8c-93f5-acf85b05f8f7',
    '07769a75-e921-4d31-bc73-22409bd56697',
    'c641d41b-3742-4e79-b513-7675c9c3a16e'
  )
  AND status = 'open'
  AND assigned_to IS NULL;
```

### Parte 2: Correção Preventiva (Trigger SQL)

Criar um trigger que corrige automaticamente conversas com `handoff_executed_at` preenchido mas `ai_mode` ainda em `autopilot`:

```sql
CREATE OR REPLACE FUNCTION fix_handoff_not_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Se handoff_executed_at foi preenchido mas ai_mode ainda é autopilot, corrigir
  IF NEW.handoff_executed_at IS NOT NULL 
     AND OLD.handoff_executed_at IS NULL
     AND NEW.ai_mode = 'autopilot' THEN
    NEW.ai_mode := 'waiting_human';
    NEW.dispatch_status := 'pending';
    RAISE NOTICE 'Fixed orphan handoff: % → waiting_human', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fix_handoff_not_completed
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION fix_handoff_not_completed();
```

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 4 conversas em `autopilot` ignoradas | 4 conversas em `waiting_human` |
| Oliveira recebe 0 chats | Oliveira recebe até 3 chats (capacidade) |
| Handoff não completado = perdido | Trigger garante completude |

## Fluxo Corrigido

```text
Cliente responde no fluxo
         │
         ▼
┌────────────────────────────────┐
│ process-chat-flow retorna      │
│ transfer: true, departmentId   │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ meta-whatsapp-webhook atualiza │
│ → ai_mode = 'waiting_human'    │
│ → handoff_executed_at = NOW()  │
│ → department = departmentId    │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Trigger: ensure_dispatch_job   │
│ → Cria job de distribuição     │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ CRON: dispatch-conversations   │
│ → Atribui ao Oliveira (online) │
└────────────────────────────────┘
```

## Seção Técnica

### Arquivos/Recursos Modificados

1. **SQL Insert** - Correção imediata das 4 conversas
2. **Migração SQL** - Trigger preventivo para futuros handoffs

### Impacto

- **Zero breaking changes** - Apenas corrige estado inconsistente
- **Backward compatible** - Trigger só age quando há inconsistência
- **Auditável** - RAISE NOTICE registra correções

### Teste Após Deploy

1. Verificar se as 4 conversas foram para `waiting_human`:
```sql
SELECT id, ai_mode, dispatch_status 
FROM conversations 
WHERE department = '2dd0ee5c-fd20-44be-94ad-f83f1be1c4e9'
AND status = 'open';
```

2. Aguardar 1 minuto (CRON)

3. Verificar se Oliveira recebeu atribuição:
```sql
SELECT id, assigned_to, p.full_name 
FROM conversations c
JOIN profiles p ON p.id = c.assigned_to
WHERE c.department = '2dd0ee5c-fd20-44be-94ad-f83f1be1c4e9'
AND c.status = 'open';
```


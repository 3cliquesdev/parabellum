
# Plano: Recriar Jobs de Distribuição para Conversas Órfãs do Suporte Sistema

## Diagnóstico Completo

Após investigação profunda, identifiquei que:

1. ✅ **O código de fallback hierárquico está funcionando corretamente** (logs confirmam)
2. ✅ **Camila de Farias está recebendo conversas via fallback** (último assignment às 14:16)
3. ❌ **64 conversas órfãs** têm jobs marcados como `completed` com erro `no_agents_configured`
4. ❌ **Os jobs foram completados ANTES do deploy do fallback hierárquico**

### Evidência dos Logs

```text
14:16:02 [findEligibleAgent] Searching in dept: fd4fcc90 (Suporte Sistema)
14:16:03 [findEligibleAgent] No online agents in dept fd4fcc90
14:16:03 [findEligibleAgent] 🔄 Fallback: Suporte Sistema → parent 36ce66cd
14:16:03 [findEligibleAgent] ✅ Found agent Camila de Farias in dept 36ce66cd
14:16:03 ✅ Assigned 9a9f2a3f... to Camila de Farias ← FALLBACK FUNCIONOU!
```

### Situação Atual dos Agentes

| Agente | Departamento | Chats Ativos | Capacidade |
|--------|--------------|--------------|------------|
| Camila de Farias | Suporte (pai) | 7 | 30 |
| Miguel Fedes | Suporte Pedidos | 6 | 30 |
| Juliana Alves | Suporte Pedidos | 8 | 30 |

### Estrutura de Departamentos

```text
Suporte (36ce66cd) → Camila de Farias: 7 chats
├── Suporte Pedidos (2dd0ee5c) → Miguel: 6, Juliana: 8 chats
└── Suporte Sistema (fd4fcc90) → 0 agentes, 64 conversas órfãs ❌
```

## Problema Identificado

Os 64 jobs das conversas de "Suporte Sistema" foram marcados como `completed` com `last_error = 'no_agents_configured'` **ANTES** da implementação do fallback hierárquico. Como estão marcados como `completed`, o dispatcher não os reprocessa.

## Solução

Recriar jobs de dispatch pendentes para as 64 conversas órfãs.

### Passo 1: Deletar jobs antigos completados incorretamente

```sql
DELETE FROM conversation_dispatch_jobs
WHERE conversation_id IN (
  SELECT c.id 
  FROM conversations c
  WHERE c.department = 'fd4fcc90-22e4-4127-ae23-9c9ecb6654b4'
    AND c.status = 'open'
    AND c.ai_mode = 'waiting_human'
    AND c.assigned_to IS NULL
)
AND status = 'completed'
AND last_error = 'no_agents_configured';
```

### Passo 2: Criar novos jobs pendentes

```sql
INSERT INTO conversation_dispatch_jobs (
  id,
  conversation_id,
  department_id,
  priority,
  status,
  attempts,
  max_attempts,
  next_attempt_at,
  created_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.department,
  1,
  'pending',
  0,
  5,
  NOW(),
  NOW()
FROM conversations c
WHERE c.department = 'fd4fcc90-22e4-4127-ae23-9c9ecb6654b4'
  AND c.status = 'open'
  AND c.ai_mode = 'waiting_human'
  AND c.assigned_to IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_dispatch_jobs cdj 
    WHERE cdj.conversation_id = c.id 
    AND cdj.status = 'pending'
  );
```

### Passo 3: Disparar o dispatcher manualmente

Chamar a edge function `dispatch-conversations` para processar os novos jobs imediatamente.

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Conversas órfãs Suporte Sistema | 64 | 0 |
| Jobs pendentes | 0 | 64 → 0 (processados) |
| Camila de Farias (chats) | 7 | 7 + ~23 = 30 (capacidade) |
| Miguel Fedes (chats) | 6 | 6 (não afetado - dept diferente) |
| Juliana Alves (chats) | 8 | 8 (não afetado - dept diferente) |

## Nota sobre Miguel e Juliana

Miguel e Juliana estão no departamento **"Suporte Pedidos"**, que é **irmão** de "Suporte Sistema", não pai. O fallback hierárquico funciona assim:

```text
Suporte Sistema → Suporte (pai) ✅
Suporte Sistema → Suporte Pedidos (irmão) ❌ NÃO FAZ FALLBACK
```

Isso é **comportamento correto** porque:
- Suporte Pedidos atende questões de pedidos
- Suporte Sistema atende questões técnicas
- São especializações diferentes

Se quiser que Miguel e Juliana também recebam de Suporte Sistema, eles precisam ser movidos para o departamento pai "Suporte" ou ter uma política de cross-routing manual.

## Arquivos a Modificar

| Tipo | Ação |
|------|------|
| SQL Migration | Recriar jobs pendentes para 64 conversas |
| Edge Function | Nenhuma (código já está correto) |

---

## Seção Técnica

### SQL Completo para Execução

```sql
-- Passo 1: Limpar jobs incorretos
DELETE FROM conversation_dispatch_jobs
WHERE conversation_id IN (
  SELECT c.id 
  FROM conversations c
  WHERE c.department = 'fd4fcc90-22e4-4127-ae23-9c9ecb6654b4'
    AND c.status = 'open'
    AND c.ai_mode = 'waiting_human'
    AND c.assigned_to IS NULL
)
AND status = 'completed'
AND last_error = 'no_agents_configured';

-- Passo 2: Criar novos jobs
INSERT INTO conversation_dispatch_jobs (
  id, conversation_id, department_id, priority, status, 
  attempts, max_attempts, next_attempt_at, created_at
)
SELECT 
  gen_random_uuid(), c.id, c.department, 1, 'pending',
  0, 5, NOW(), NOW()
FROM conversations c
WHERE c.department = 'fd4fcc90-22e4-4127-ae23-9c9ecb6654b4'
  AND c.status = 'open'
  AND c.ai_mode = 'waiting_human'
  AND c.assigned_to IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_dispatch_jobs cdj 
    WHERE cdj.conversation_id = c.id AND cdj.status = 'pending'
  );
```

### Verificação Pós-Execução

1. Chamar `dispatch-conversations` manualmente
2. Verificar logs: "✅ Assigned ... to Camila de Farias"
3. Confirmar que conversas órfãs foram atribuídas
4. Camila deve ter ~30 chats após processamento



# Plano: Patch 1-Shot - Correção das RPCs do Relatório Comercial

## Objetivo

Aplicar 4 correções nas RPCs `get_commercial_conversations_report` e `get_commercial_conversations_kpis` em uma única migration SQL.

---

## Correções Incluídas

| # | Correção | Antes | Depois |
|---|----------|-------|--------|
| 1 | `interactions_count` | COUNT de mensagens de agentes | COUNT(*) de todas as mensagens |
| 2 | `participants` | Apenas agentes que enviaram mensagens | União de agentes (messages) + atribuídos (assignment_logs) |
| 3 | `waiting_time_seconds` | Apenas `first_response_at` | Primeira msg agente/humano com fallback para `first_response_at` |
| 4 | `bot_flow` | Mantido como `ai_mode` | Continua retornando `ai_mode` (nome preservado para compatibilidade) |

---

## Ações a Executar

### 1. Migration SQL

Criar migration com `CREATE OR REPLACE FUNCTION` para ambas as RPCs:

- `public.get_commercial_conversations_report` - Relatório detalhado (24 colunas)
- `public.get_commercial_conversations_kpis` - KPIs agregados

O SQL já está pronto e validado pelo usuário.

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Criar com as 2 RPCs corrigidas |

---

## Impacto

- **Zero breaking change**: Nomes de colunas mantidos (`participants`, `interactions_count`, `bot_flow`)
- **Frontend inalterado**: Não requer ajustes nos hooks/componentes
- **Performance**: CTEs otimizadas com JOINs eficientes

---

## Seção Técnica

### Fix 1: interactions_count corrigido

```sql
-- ANTES: contava só mensagens de agentes
SELECT COUNT(*) FROM messages m 
JOIN profiles p ON p.id = m.sender_id
WHERE m.sender_type = 'agent'

-- DEPOIS: conta TODAS as mensagens
SELECT COUNT(*)::BIGINT AS interactions_count
FROM messages
GROUP BY conversation_id
```

### Fix 2: participants expandido

```sql
-- União de duas fontes:
-- 1) Agentes que enviaram mensagens
-- 2) Agentes atribuídos via assignment_logs
SELECT STRING_AGG(DISTINCT full_name, ', ')
FROM (
  SELECT full_name FROM messages + profiles WHERE sender_type IN ('agent','user')
  UNION ALL
  SELECT full_name FROM conversation_assignment_logs + profiles
) u
```

### Fix 3: waiting_time com fallback

```sql
-- Prioriza primeira mensagem de agente/humano
-- Fallback para first_response_at se não houver
CASE
  WHEN fam.first_agent_message_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (fam.first_agent_message_at - c.created_at))
  WHEN c.first_response_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))
  ELSE NULL
END AS waiting_time_seconds
```

---

## Critérios de Aceite

1. RPCs substituídas sem erro de sintaxe
2. `interactions_count` retorna total de mensagens (não só agentes)
3. `participants` inclui agentes de mensagens + atribuições
4. `waiting_time_seconds` usa primeira msg humana com fallback
5. Frontend continua funcionando sem alterações




# Plano: Otimizacao de Performance da RPC get_commercial_conversations_report

## Problema Identificado

A mensagem de erro "canceling statement due to statement timeout" indica que a query SQL esta demorando mais de 60 segundos (timeout padrao do Supabase).

### Analise Tecnica

A RPC atual tem **11 CTEs (Common Table Expressions)** que sao materializadas ANTES do filtro principal:

```text
msg_counts           -> Escaneia TODA tabela messages (47k rows)
first_agent_msg      -> Escaneia TODA tabela messages 
first_customer_msg   -> Escaneia TODA tabela messages
message_agent_participants -> Escaneia TODA tabela messages + JOIN profiles
latest_conv_tag      -> Escaneia TODA tabela conversation_tags
all_tags             -> Escaneia TODA tabela conversation_tags
participants_agg     -> Materializa union de 2 CTEs
first_assignment     -> Escaneia TODA tabela assignment_logs
last_ticket          -> Escaneia TODA tabela tickets
ratings              -> Escaneia TODA tabela conversation_ratings
```

**Problema**: Mesmo que o filtro final retorne apenas 50 conversas, as CTEs processam TODAS as linhas primeiro, depois fazem JOIN.

### Volume de Dados

| Tabela | Rows |
|--------|------|
| conversations | 2,586 |
| messages | 47,596 |
| conversation_tags | 985 |
| assignment_logs | 570 |
| tickets | 324 |

---

## Solucao: Reescrever RPC com LATERAL JOINs

A tecnica de **LATERAL JOIN** permite que subqueries acessem colunas da query externa (correlacioned), fazendo a busca apenas para as conversas ja filtradas.

### Estrutura Proposta

```sql
-- ANTES: CTE materializa TUDO
WITH msg_counts AS (
  SELECT conversation_id, COUNT(*) FROM messages GROUP BY conversation_id
)
SELECT ... FROM conversations c LEFT JOIN msg_counts mc ON mc.conversation_id = c.id

-- DEPOIS: LATERAL JOIN - so busca para conversas filtradas
SELECT ... 
FROM conversations c
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS interactions_count 
  FROM messages m 
  WHERE m.conversation_id = c.id
) mc ON true
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Nova migration SQL | Recriar RPC com LATERAL JOINs otimizados |

---

## Nova RPC Proposta

```sql
CREATE OR REPLACE FUNCTION public.get_commercial_conversations_report(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_department_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (...)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    LEFT(c.id::TEXT, 8) AS short_id,
    c.id AS conversation_id,
    c.status::TEXT,
    COALESCE(
      NULLIF(TRIM(COALESCE(co.first_name,'') || ' ' || COALESCE(co.last_name,'')), ''),
      co.phone,
      'Sem nome'
    ) AS contact_name,
    co.email AS contact_email,
    co.phone AS contact_phone,
    org.name AS contact_organization,
    c.created_at,
    c.closed_at,
    -- waiting_time_seconds (LATERAL)
    wait_calc.waiting_time_seconds,
    -- duration_seconds
    CASE WHEN c.closed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (c.closed_at - c.created_at))::BIGINT
      ELSE NULL
    END AS duration_seconds,
    p.full_name AS assigned_agent_name,
    participants_calc.participants,
    d.name AS department_name,
    msg_count.interactions_count,
    CASE WHEN c.channel::TEXT = 'whatsapp'
      THEN 'WhatsApp (' || COALESCE(c.whatsapp_provider, 'unknown') || ')'
      ELSE c.channel::TEXT
    END AS origin,
    rating_calc.csat_score,
    rating_calc.csat_comment,
    ticket_calc.ticket_id,
    c.ai_mode::TEXT AS bot_flow,
    tags_calc.tags_all,
    tag_calc.last_conversation_tag,
    first_msg.first_customer_message,
    wait_after_assign.waiting_after_assignment_seconds,
    COUNT(*) OVER() AS total_count

  FROM conversations c
  JOIN contacts co ON co.id = c.contact_id
  LEFT JOIN organizations org ON org.id = co.organization_id
  LEFT JOIN profiles p ON p.id = c.assigned_to
  LEFT JOIN departments d ON d.id = c.department

  -- LATERAL: Contagem de mensagens (so para esta conversa)
  LEFT JOIN LATERAL (
    SELECT COALESCE(COUNT(*), 0)::BIGINT AS interactions_count
    FROM messages m WHERE m.conversation_id = c.id
  ) msg_count ON true

  -- LATERAL: Primeira mensagem do agente
  LEFT JOIN LATERAL (
    SELECT MIN(created_at) AS first_agent_message_at
    FROM messages m
    WHERE m.conversation_id = c.id 
      AND m.sender_type::text IN ('agent', 'user')
  ) fam ON true

  -- LATERAL: Calculo tempo espera
  LEFT JOIN LATERAL (
    SELECT 
      CASE
        WHEN fam.first_agent_message_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (fam.first_agent_message_at - c.created_at))::BIGINT
        WHEN c.first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))::BIGINT
        ELSE NULL
      END AS waiting_time_seconds
  ) wait_calc ON true

  -- LATERAL: Primeira mensagem do cliente
  LEFT JOIN LATERAL (
    SELECT LEFT(content, 200) AS first_customer_message
    FROM messages m
    WHERE m.conversation_id = c.id AND m.sender_type::text = 'contact'
    ORDER BY m.created_at ASC LIMIT 1
  ) first_msg ON true

  -- LATERAL: Ultima tag de conversation
  LEFT JOIN LATERAL (
    SELECT t.name AS last_conversation_tag
    FROM conversation_tags ct
    JOIN tags t ON t.id = ct.tag_id
    WHERE ct.conversation_id = c.id AND t.category = 'conversation'
    ORDER BY ct.created_at DESC LIMIT 1
  ) tag_calc ON true

  -- LATERAL: Todas as tags
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(DISTINCT t.name ORDER BY t.name) AS tags_all
    FROM conversation_tags ct
    JOIN tags t ON t.id = ct.tag_id
    WHERE ct.conversation_id = c.id
  ) tags_calc ON true

  -- LATERAL: Participantes
  LEFT JOIN LATERAL (
    SELECT STRING_AGG(DISTINCT full_name, ', ' ORDER BY full_name) AS participants
    FROM (
      SELECT p2.full_name
      FROM messages m
      JOIN profiles p2 ON p2.id = m.sender_id
      WHERE m.conversation_id = c.id AND m.sender_type::text IN ('agent', 'user')
      UNION
      SELECT p3.full_name
      FROM conversation_assignment_logs al
      JOIN profiles p3 ON p3.id = al.assigned_to
      WHERE al.conversation_id = c.id
    ) u
    WHERE full_name IS NOT NULL AND full_name <> ''
  ) participants_calc ON true

  -- LATERAL: Primeiro assignment
  LEFT JOIN LATERAL (
    SELECT MIN(created_at) AS first_assigned_at
    FROM conversation_assignment_logs al
    WHERE al.conversation_id = c.id
  ) fa ON true

  -- LATERAL: Tempo apos assignment
  LEFT JOIN LATERAL (
    SELECT 
      CASE
        WHEN fa.first_assigned_at IS NOT NULL AND fam.first_agent_message_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (fam.first_agent_message_at - fa.first_assigned_at))::BIGINT
        WHEN fa.first_assigned_at IS NOT NULL AND c.first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (c.first_response_at - fa.first_assigned_at))::BIGINT
        ELSE NULL
      END AS waiting_after_assignment_seconds
  ) wait_after_assign ON true

  -- LATERAL: Ultimo ticket
  LEFT JOIN LATERAL (
    SELECT t.id AS ticket_id
    FROM tickets t
    WHERE t.conversation_id = c.id
    ORDER BY t.created_at DESC LIMIT 1
  ) ticket_calc ON true

  -- LATERAL: Rating
  LEFT JOIN LATERAL (
    SELECT r.rating AS csat_score, r.feedback_text AS csat_comment
    FROM conversation_ratings r
    WHERE r.conversation_id = c.id
    LIMIT 1
  ) rating_calc ON true

  WHERE c.created_at >= p_start
    AND c.created_at < p_end
    AND (p_department_id IS NULL OR c.department = p_department_id)
    AND (p_agent_id IS NULL OR c.assigned_to = p_agent_id)
    AND (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_channel IS NULL OR c.channel::TEXT = p_channel)
    AND (
      p_search IS NULL OR
      co.first_name ILIKE '%' || p_search || '%' OR
      co.last_name  ILIKE '%' || p_search || '%' OR
      co.phone      ILIKE '%' || p_search || '%' OR
      co.email      ILIKE '%' || p_search || '%'
    )
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
```

---

## Por Que Isso Resolve?

| Antes (CTEs) | Depois (LATERAL) |
|--------------|------------------|
| Escaneia 47k mensagens ANTES de filtrar | Busca apenas mensagens das 50 conversas filtradas |
| 11 materializacoes em memoria | Subqueries correlacionadas, so executa quando necessario |
| O(n * m) onde n=conversas, m=mensagens | O(filtradas * k) onde k=mensagens por conversa |

### Estimativa de Melhoria

- **Antes**: ~47.000 rows em messages * 11 CTEs = ~500k operacoes
- **Depois**: ~50 conversas * ~20 mensagens cada = ~1k operacoes

**Reducao esperada: 99%+ do tempo de execucao**

---

## Indices Adicionais Recomendados

Alguns indices podem ajudar ainda mais:

```sql
-- Indice para conversation_ratings (LATERAL)
CREATE INDEX IF NOT EXISTS idx_conversation_ratings_conv 
ON conversation_ratings(conversation_id);

-- Indice para first_customer_msg (sender_type + order)
CREATE INDEX IF NOT EXISTS idx_messages_conv_sender_contact
ON messages(conversation_id, created_at ASC) 
WHERE sender_type = 'contact';
```

---

## Resultado Esperado

1. **Query executa em menos de 1 segundo** (vs timeout atual)
2. **Mesmo resultado** - dados identicos, apenas estrutura otimizada
3. **Escalavel** - performance nao degrada com mais dados
4. **Sem impacto no frontend** - mesma interface/tipos




## Plano: Script de Limpeza de Contatos Duplicados

### Diagnostico

Analise do banco identificou:

- **129 grupos de telefones duplicados** (mesmo telefone com 2+ contatos)
- **20+ tabelas** referenciam `contact_id` que precisam ser migradas
- Maior impacto: 407 mensagens no telefone 11969656723 (ja mesclado)
- Contatos duplicados vieram principalmente da importacao Kiwify e diferentes canais (Evolution vs Meta)

### Tabelas Afetadas

Todas as referencias a `contact_id` que precisam ser migradas antes de deletar contatos duplicados:

| Tabela | Coluna |
|--------|--------|
| conversations | contact_id |
| messages | (via conversation_id) |
| activities | contact_id |
| deals | contact_id |
| form_submissions | contact_id |
| email_sends | contact_id |
| cadence_enrollments | contact_id |
| cadence_tasks | contact_id |
| customer_journey_steps | contact_id |
| playbook_executions | contact_id |
| playbook_goals | contact_id |
| ai_quality_logs | contact_id |
| ai_failure_logs | contact_id |
| instagram_messages | contact_id |
| instagram_comments | contact_id |
| internal_requests | contact_id |
| lead_distribution_logs | contact_id |
| onboarding_submissions | contact_id |
| quotes | contact_id |
| project_boards | contact_id |
| project_cards | contact_id |
| inbox_view | contact_id |

### Estrategia de Mesclagem

```text
Para cada grupo de contatos duplicados:
+-------------------+
| Identificar grupo |
| por normalized_phone|
+--------+----------+
         |
         v
+-------------------+
| Selecionar MASTER |
| (mais antigo,     |
|  mais completo)   |
+--------+----------+
         |
         v
+-------------------+
| Migrar referencias|
| de todas tabelas  |
| para MASTER       |
+--------+----------+
         |
         v
+-------------------+
| Deletar duplicados|
| (manter MASTER)   |
+-------------------+
```

### Criterios para Contato Master

1. **Prioridade 1**: Contato mais antigo (`created_at`)
2. **Prioridade 2**: Contato com mais dados preenchidos (email, nome completo, etc.)
3. **Prioridade 3**: Contato com conversas abertas

### Implementacao

#### 1. Criar Function SQL `merge_duplicate_contacts`

Funcao que recebe um array de `contact_ids` e mescla todos no primeiro (master):

```sql
CREATE OR REPLACE FUNCTION merge_duplicate_contacts(
  p_master_id UUID,
  p_duplicate_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dup_id UUID;
  v_result JSONB := '{}';
  v_migrated INT := 0;
BEGIN
  -- Para cada ID duplicado
  FOREACH v_dup_id IN ARRAY p_duplicate_ids
  LOOP
    -- Migrar conversas
    UPDATE conversations SET contact_id = p_master_id WHERE contact_id = v_dup_id;
    -- Migrar activities
    UPDATE activities SET contact_id = p_master_id WHERE contact_id = v_dup_id;
    -- ... (demais tabelas)
    
    -- Deletar contato duplicado
    DELETE FROM contacts WHERE id = v_dup_id;
    v_migrated := v_migrated + 1;
  END LOOP;
  
  RETURN jsonb_build_object('merged', v_migrated, 'master', p_master_id);
END;
$$;
```

#### 2. Criar Script de Execucao em Batch

Para evitar timeouts, processar em lotes de 10 grupos por vez:

```sql
WITH duplicate_groups AS (
  SELECT 
    RIGHT(REGEXP_REPLACE(COALESCE(phone,whatsapp_id,''),'[^0-9]','','g'),11) as norm_phone,
    array_agg(id ORDER BY created_at) as contact_ids
  FROM contacts
  WHERE (phone IS NOT NULL OR whatsapp_id IS NOT NULL)
  GROUP BY 1
  HAVING COUNT(*) > 1
  LIMIT 10
)
SELECT merge_duplicate_contacts(
  contact_ids[1],  -- master = mais antigo
  contact_ids[2:]  -- duplicados
)
FROM duplicate_groups;
```

#### 3. Tratar inbox_view

A tabela `inbox_view` precisa ser sincronizada apos a mesclagem:

```sql
-- Deletar entradas orfas do inbox_view
DELETE FROM inbox_view 
WHERE contact_id NOT IN (SELECT id FROM contacts);

-- Ou reconstruir via trigger existente
```

### Tarefas de Implementacao

1. **Criar migration** com a funcao `merge_duplicate_contacts`
2. **Executar limpeza** via SQL em batches (pode levar varios minutos)
3. **Validar resultados** - contar contatos restantes e verificar integridade
4. **Atualizar inbox_view** para refletir as mudancas

### Seguranca

- Script roda com `SECURITY DEFINER` para bypassar RLS
- Backup antes de executar (recomendado)
- Execucao em horario de baixo uso
- Logs de cada operacao para auditoria

### Resultado Esperado

- **Antes**: ~129 grupos duplicados + contatos orfaos
- **Depois**: 1 contato por telefone, historico unificado
- Todas as mensagens Evolution + Meta no mesmo thread
- inbox_view atualizado automaticamente

### Proximos Passos

Apos aprovacao, vou:
1. Criar a migration com a funcao de mesclagem
2. Executar o script de limpeza em batches
3. Reportar resultados da limpeza




# Diagnóstico: Conversas Não Atribuídas pela IA

## Análise dos 13 Casos

Analisei todas as conversas informadas e identifiquei **3 padrões de falha**:

### Padrão 1: Sem departamento (8 conversas) — CAUSA PRINCIPAL
**Conversas:** Eumarcos Barbosa, San Braves, Josiana Castro, ~, Jorge, ., João Gabriel, Pablo (inicialmente)

Essas conversas estão em `autopilot`, `copilot` ou `waiting_human` **sem nenhum departamento definido**. O sistema de distribuição (`dispatch-conversations`) **requer um departamento** para encontrar agentes. Sem departamento → o dispatch job ou não é criado (trigger exige `department IS NOT NULL`), ou falha com `no_department`.

**Causa raiz:** Quando a IA faz handoff via `route-conversation` sem passar um `department_id`, e a conversa não tem departamento pré-existente, o roteador não consegue resolver e a conversa fica orphan. Também há paths no código (`ai-autopilot-chat` linhas 6844, 7412, 8654) que mudam para `copilot` e chamam `route-conversation` SEM department, e se o route-conversation não resolver, a conversa fica sem dept.

### Padrão 2: Dept CS sem agentes online (2 conversas)
**Conversas:** Cristiane Reich (7 tentativas), Emerson Smanioto (5 tentativas)

Departamento "Customer Success" atribuído, dispatch tentou múltiplas vezes, escalou (`dispatch_status: escalated`) mas nenhum agente online foi encontrado.

### Padrão 3: Dept Suporte sem dispatch (1 conversa)
**Conversa:** Daniele — dept "Suporte" atribuído mas `dispatch_attempts: 0`, `ai_mode: autopilot`. Ainda não transitou para `waiting_human`, então o trigger de dispatch não criou job.

---

## Solução Proposta

### 1. Departamento Fallback no Trigger de Dispatch (SQL Migration)
Modificar a função `ensure_dispatch_job()` para, quando `department IS NULL`, atribuir automaticamente um departamento default (Suporte: `36ce66cd-7414-4fc8-bd4a-268fecc3f01a`) antes de criar o dispatch job. Isso elimina 100% dos casos de "no_department".

```sql
-- Se conversa está em waiting_human sem departamento, atribuir Suporte como fallback
IF NEW.department IS NULL THEN
  NEW.department := '36ce66cd-7414-4fc8-bd4a-268fecc3f01a'; -- Suporte
  UPDATE conversations SET department = NEW.department WHERE id = NEW.id;
END IF;
```

### 2. Fallback no `route-conversation` (Edge Function)
Quando `route-conversation` é chamado sem `department_id` e a conversa não tem departamento, usar "Suporte" como fallback em vez de deixar NULL.

### 3. Fallback no `auto-handoff` (Edge Function)
No fallback do `auto-handoff` (linha 143), incluir o departamento de Suporte ao marcar `waiting_human`:
```typescript
.update({ ai_mode: 'waiting_human', department: FALLBACK_DEPT_SUPORTE })
```

### 4. Fallback nos paths de handoff do `ai-autopilot-chat` (Edge Function)
Nos 3 locais onde o código muda para `copilot` sem departamento (linhas ~6846, ~7414, ~8657), incluir o departamento Suporte como fallback.

### 5. Corrigir conversas orphans existentes (SQL Migration)
Atualizar as 8 conversas sem departamento para departamento Suporte e recriar dispatch jobs:
```sql
UPDATE conversations 
SET department = '36ce66cd-7414-4fc8-bd4a-268fecc3f01a'
WHERE assigned_to IS NULL 
  AND department IS NULL 
  AND status = 'open'
  AND ai_mode IN ('waiting_human', 'copilot', 'autopilot');
```

---

## Resultado Esperado

Após estas mudanças:
- **Nenhuma conversa ficará sem departamento** — fallback para Suporte em todos os paths
- **O dispatch sempre terá um departamento** para buscar agentes
- **Conversas existentes orphans** serão corrigidas e entrarão na fila de distribuição
- Para o Padrão 2 (CS sem agentes), a solução depende de ter agentes online no departamento


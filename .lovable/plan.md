
# Plano de Upgrade: Auto-Encerramento + Avaliação Configurável por Departamento

## 📋 Resumo Executivo

Este upgrade transforma o sistema de encerramento automático de **hardcoded** para **configurável por departamento**, permitindo regras específicas como:
- **Suporte**: Fecha após 30 minutos de inatividade, envia CSAT
- **Comercial**: Nunca fecha automaticamente (vendas precisam de dias)

---

## 🔍 Diagnóstico do Estado Atual

| Componente | Status | Observação |
|------------|--------|------------|
| `departments` | ⚠️ Falta campos | Sem `auto_close_enabled`, `auto_close_minutes`, `send_rating_on_close` |
| `conversations` | ⚠️ Falta campo | Sem `closed_reason` |
| `conversation_ratings` | ⚠️ Falta campo | Sem `department_id` |
| `auto-close-conversations` | ✅ Existe | Hardcoded 30 min, exclui "Comercial" por nome |
| `extractRating` | ✅ Existe | Só aceita números 1-5 (já alinhado com requisito) |
| Cron job | ✅ Existe | Roda a cada 10 minutos |

---

## 📐 Alterações de Banco de Dados

### 1. Adicionar campos na tabela `departments`

```sql
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS auto_close_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_close_minutes integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS send_rating_on_close boolean DEFAULT true;

COMMENT ON COLUMN departments.auto_close_enabled IS 'Habilita auto-encerramento por inatividade';
COMMENT ON COLUMN departments.auto_close_minutes IS 'Minutos de inatividade para fechar (NULL = nunca)';
COMMENT ON COLUMN departments.send_rating_on_close IS 'Enviar pesquisa CSAT ao fechar';
```

### 2. Adicionar campo `closed_reason` na tabela `conversations`

```sql
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS closed_reason text DEFAULT NULL;

COMMENT ON COLUMN conversations.closed_reason IS 'Motivo: inactivity | manual | system';
```

### 3. Adicionar `department_id` na tabela `conversation_ratings`

```sql
ALTER TABLE conversation_ratings 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);

CREATE INDEX IF NOT EXISTS idx_conversation_ratings_department 
ON conversation_ratings(department_id);
```

### 4. Configurar departamentos iniciais

```sql
-- Suporte: auto-close após 30 min
UPDATE departments 
SET auto_close_enabled = true, 
    auto_close_minutes = 30, 
    send_rating_on_close = true 
WHERE name ILIKE '%suporte%';

-- Comercial: NUNCA auto-close
UPDATE departments 
SET auto_close_enabled = false, 
    auto_close_minutes = NULL, 
    send_rating_on_close = true 
WHERE name ILIKE '%comercial%';
```

---

## 🔧 Alterações na Edge Function `auto-close-conversations`

### Lógica Atual (Problemática)
- Hardcoded: 30 minutos para todos
- Exclui Comercial por **nome** (frágil)
- Não usa configuração do departamento

### Nova Lógica (Dinâmica)

```text
PARA CADA departamento com auto_close_enabled = true:
  1. Buscar conversas abertas desse departamento
  2. Calcular inatividade = now() - last_message_at
  3. SE inatividade >= auto_close_minutes:
     - Verificar se última mensagem foi do sistema/agente (cliente não respondeu)
     - Fechar conversa com closed_reason = 'inactivity'
     - SE send_rating_on_close = true:
       - Enviar mensagem de CSAT (sem emoji excessivo)
       - Marcar awaiting_rating = true
```

### Mensagem de CSAT (Simplificada)

```
📝 Antes de encerrar, pode avaliar nosso atendimento?

⭐ 1 - Muito ruim
⭐ 2 - Ruim
⭐ 3 - Regular
⭐ 4 - Bom
⭐ 5 - Excelente

Responda apenas com o número.
```

---

## 🔧 Ajuste na Captura de Rating (`handle-whatsapp-event`)

### Atual
- Já funciona com números 1-5 ✅
- Também aceita texto ("excelente", "ruim") - **remover para ficar determinístico**

### Modificação
- Remover interpretação de texto
- Manter apenas: número direto (`^[1-5]$`)
- Adicionar `department_id` ao salvar rating

```typescript
// ANTES
function extractRating(message: string): number | null {
  // Detecta número, estrelas, OU texto...
}

// DEPOIS  
function extractRating(message: string): number | null {
  const numMatch = message.trim().match(/^[1-5]$/);
  return numMatch ? parseInt(numMatch[0]) : null;
}
```

---

## 🖥️ Alterações no Frontend

### 1. Atualizar `DepartmentDialog.tsx`

Adicionar campos:
- **Encerramento automático**: Switch on/off
- **Tempo de inatividade**: Input numérico (minutos)
- **Enviar avaliação ao fechar**: Switch on/off

### 2. Atualizar `useDepartments.tsx`

Incluir novos campos na tipagem:

```typescript
interface Department {
  // ... campos existentes
  auto_close_enabled: boolean;
  auto_close_minutes: number | null;
  send_rating_on_close: boolean;
}
```

### 3. Atualizar `useCreateDepartment.tsx` e `useUpdateDepartment.tsx`

Incluir os novos campos nas mutations.

---

## 📊 Relatórios Futuros

Com `department_id` na tabela `conversation_ratings`, será possível:

| Relatório | Query Base |
|-----------|-----------|
| Média por departamento | `SELECT department_id, AVG(rating) FROM conversation_ratings GROUP BY department_id` |
| Histórico por período | `WHERE created_at BETWEEN $start AND $end` |
| Avaliação por agente | Join com `conversations.assigned_to` |

---

## 📁 Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/` | Nova migration com ALTER TABLE |
| `supabase/functions/auto-close-conversations/index.ts` | Refatorar lógica dinâmica |
| `supabase/functions/handle-whatsapp-event/index.ts` | Simplificar extractRating, adicionar department_id |
| `src/components/DepartmentDialog.tsx` | Adicionar campos de configuração |
| `src/hooks/useDepartments.tsx` | Atualizar tipagem |
| `src/hooks/useCreateDepartment.tsx` | Adicionar novos campos |
| `src/hooks/useUpdateDepartment.tsx` | Adicionar novos campos |
| `src/pages/Departments.tsx` | Exibir status de auto-close |

---

## ✅ Testes Obrigatórios

| Teste | Cenário | Resultado Esperado |
|-------|---------|-------------------|
| Suporte | 30+ min inativo | Conversa fecha, CSAT enviado |
| Comercial | Horas/dias inativo | Conversa **NÃO** fecha |
| Rating | Cliente responde "4" | Salvo em conversation_ratings com department_id |
| Rating | Cliente responde "oi" | **Ignorado** (não é número 1-5) |
| UI | Criar departamento | Campos de auto-close visíveis |

---

## 🛡️ Garantias de Segurança

- ✅ Sem IA na decisão de fechamento
- ✅ Sem lógica no frontend (tudo via backend)
- ✅ Comportamento determinístico
- ✅ Auditável (closed_reason + closed_at)
- ✅ Não reabre conversa após rating

---

## 📋 Ordem de Implementação

1. **Migração de banco** - Adicionar colunas
2. **Configurar departamentos** - Valores iniciais
3. **Refatorar `auto-close-conversations`** - Lógica dinâmica
4. **Ajustar `handle-whatsapp-event`** - Rating com department_id
5. **Atualizar frontend** - Campos de configuração
6. **Testes end-to-end**
